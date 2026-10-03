import { newId } from '../../shared/db/ids';
import { AppError, BadRequestError, ForbiddenError } from '../../shared/http/errors';
import type { Logger } from '../../shared/logger';
import type { FileStorage } from '../../shared/storage/file-storage';
import { sanitizeFilename } from '../../shared/storage/file-storage';
import type { GroupRepository } from '../groups/groups.repository';
import type { SessionRepository } from '../sessions/sessions.repository';
import type { Task, TaskFilter, TaskRepository } from './tasks.repository';
import type { AttachedFile, TaskAnswer, TaskQuestion, TaskStatus, TaskSubmissionRow } from './tasks.table';

export interface QuestionInput extends Partial<Omit<TaskQuestion, '_id'>> {
  _id?: string;
}
export interface TaskInput {
  groupId?: string;
  courseId?: string;
  sessionIds?: string[];
  title?: string;
  titleAr?: string;
  description?: string;
  descriptionAr?: string;
  deadline?: string;
  maxScore?: number;
  questions?: QuestionInput[];
  allowLateSubmission?: boolean;
  status?: string;
}
export interface UploadedFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}
export interface AnswerInput {
  questionId?: string;
  answerType?: string;
  selectedAnswers?: number[];
  textAnswer?: string;
  imageFileIndices?: number[];
}

export interface TaskNotifier {
  taskAssigned(studentIds: string[], task: Task): Promise<void>;
}
export const silentTaskNotifier: TaskNotifier = { taskAssigned: async () => {} };

const taskNotFound = () => new AppError('Task not found', 404, 'TASK_NOT_FOUND');
const groupNotFound = () => new AppError('Group not found', 404, 'GROUP_NOT_FOUND');
const ARCHIVE = /\.(zip|rar)$/i;

/** Question checks, identical rules and messages for trainers and the CLO. */
export function checkQuestions(input: QuestionInput[]): TaskQuestion[] {
  const orders = new Set<number>();
  return input.map((q) => {
    if (!q.answerType || !['mcq', 'image', 'text'].includes(q.answerType)) {
      throw new BadRequestError('Each question must have answerType: mcq, image, or text', 'INVALID_ANSWER_TYPE');
    }
    const order = q.order ?? 0;
    const options = q.options ?? [];
    const correct = q.correctAnswers ?? [];
    if (q.answerType === 'mcq') {
      if (!q.type || !['single_choice', 'multiple_choice'].includes(q.type)) {
        throw new BadRequestError('MCQ questions must have type: single_choice or multiple_choice', 'INVALID_MCQ_TYPE');
      }
      if (options.length < 2) throw new BadRequestError('MCQ questions must have at least 2 options', 'INSUFFICIENT_OPTIONS');
      if (correct.length === 0) throw new BadRequestError(`MCQ question ${order + 1} must have at least one correct answer marked`, 'MISSING_CORRECT_ANSWER');
      if (correct.some((i) => i < 0 || i >= options.length)) {
        throw new BadRequestError(`Correct answer index out of range for question ${order + 1}`, 'INVALID_CORRECT_ANSWER_INDEX');
      }
      if (q.type === 'single_choice' && correct.length > 1) {
        throw new BadRequestError(`Single choice question ${order + 1} can only have one correct answer`, 'SINGLE_CHOICE_MULTIPLE_CORRECT');
      }
    }
    if (orders.has(order)) throw new BadRequestError('Question order must be unique', 'DUPLICATE_QUESTION_ORDER');
    orders.add(order);
    // Client-side temporary ids ("temp-...") are replaced with real ones.
    const keepId = q._id && /^[0-9a-f]{24}$/i.test(q._id);
    return {
      _id: keepId ? q._id! : newId(),
      questionText: q.questionText ?? '',
      ...(q.questionTextAr ? { questionTextAr: q.questionTextAr } : {}),
      answerType: q.answerType,
      ...(q.type ? { type: q.type } : {}),
      options,
      correctAnswers: correct,
      points: q.points ?? 0,
      order,
      required: q.required ?? false,
      ...(q.maxLength ? { maxLength: q.maxLength } : {}),
      maxImages: q.maxImages ?? 1,
      allowedImageTypes: q.allowedImageTypes ?? [],
      ...(q.maxImageSize ? { maxImageSize: q.maxImageSize } : {}),
    };
  });
}

/** A task linked to sessions is visible once any of those sessions' day has come. */
export function isUnlocked(task: Pick<Task, 'sessions'>, now: Date): boolean {
  if (task.sessions.length === 0) return true;
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  return task.sessions.some((s) => {
    if (!s.scheduledDate) return true;
    const day = new Date(s.scheduledDate);
    day.setHours(0, 0, 0, 0);
    return day <= today;
  });
}

export class TaskService {
  constructor(
    private readonly tasks: TaskRepository,
    private readonly groups: Pick<GroupRepository, 'findById' | 'membersOf' | 'groupIdsOfStudent'>,
    private readonly sessions: Pick<SessionRepository, 'findById'>,
    private readonly storage: FileStorage,
    private readonly bucket: string,
    private readonly notifier: TaskNotifier,
    private readonly logger: Logger,
    private readonly now: () => Date = () => new Date(),
  ) {}

  private async require(id: string): Promise<Task> {
    const t = await this.tasks.findById(id);
    if (!t) throw taskNotFound();
    return t;
  }

  private async targetIds(task: Pick<Task, 'groups' | 'groupId'>) {
    return task.groups.length ? task.groups.map((g) => g.id) : [task.groupId];
  }

  private async studentsOf(groupIds: string[]): Promise<string[]> {
    const members = await this.groups.membersOf(groupIds);
    return [...new Set([...members.values()].flat().map((m) => m.id))];
  }

  private notify(task: Task): void {
    this.targetIds(task)
      .then((ids) => this.studentsOf(ids))
      .then((students) => (students.length ? this.notifier.taskAssigned(students, task) : undefined))
      .catch((err: unknown) => this.logger.warn({ err }, 'Task notification failed'));
  }

  /** Files stored for a submission (image answers and attachments). */
  private storedPaths(s: TaskSubmissionRow): string[] {
    return [...s.answers.flatMap((a) => (a.imageAnswers ?? []).map((i) => i.storagePath)), ...s.attachedFiles.map((f) => f.storagePath)];
  }

  async signedUrl(path: string, seconds = 3600): Promise<string | null> {
    return this.storage.signedUrl({ bucket: this.bucket, path }, seconds).catch(() => null);
  }

  private fields(input: TaskInput) {
    const out: Record<string, unknown> = {};
    if (input.title !== undefined) out.title = input.title;
    if (input.titleAr !== undefined) out.titleAr = input.titleAr;
    if (input.description !== undefined) out.description = input.description;
    if (input.descriptionAr !== undefined) out.descriptionAr = input.descriptionAr;
    if (input.deadline !== undefined) out.deadline = new Date(input.deadline);
    if (input.maxScore !== undefined) out.maxScore = input.maxScore;
    if (input.allowLateSubmission !== undefined) out.allowLateSubmission = input.allowLateSubmission;
    if (input.questions !== undefined) {
      const questions = checkQuestions(input.questions);
      out.questions = questions;
      out.hasQuestions = questions.length > 0;
    }
    return out;
  }

  private checkNew(input: TaskInput): void {
    if (!input.title) throw new BadRequestError('Title is required');
    if (!input.description) throw new BadRequestError('Description is required');
    if (!input.deadline || Number.isNaN(new Date(input.deadline).getTime())) throw new BadRequestError('Deadline is required');
  }

  // ─── Trainer (tasks of the trainer's own groups) ─────────────────────────

  private async ownedTask(taskId: string, trainerId: string): Promise<Task> {
    const task = await this.require(taskId);
    const group = await this.groups.findById(task.groupId);
    if (!group) throw groupNotFound();
    if (group.trainerId !== trainerId) throw new ForbiddenError('You do not own this group', 'GROUP_OWNERSHIP_REQUIRED');
    return task;
  }

  async trainerCreate(input: TaskInput, trainerId: string): Promise<Task> {
    const group = input.groupId ? await this.groups.findById(input.groupId) : null;
    if (!group) throw groupNotFound();
    if (group.trainerId !== trainerId) throw new ForbiddenError('You do not own this group', 'GROUP_OWNERSHIP_REQUIRED');
    this.checkNew(input);
    const status: TaskStatus = input.status === 'draft' ? 'draft' : 'open';
    const id = await this.tasks.create(
      {
        ...(this.fields(input) as object),
        groupId: group.id,
        courseId: input.courseId ?? group.courseId,
        createdById: trainerId,
        title: input.title!,
        description: input.description!,
        deadline: new Date(input.deadline!),
        maxScore: input.maxScore || 100,
        status,
      },
      [group.id],
      [],
    );
    const task = await this.require(id);
    if (status === 'open') this.notify(task);
    return task;
  }

  async groupTasks(groupId: string, trainerId: string): Promise<Task[]> {
    const group = await this.groups.findById(groupId);
    if (!group) throw groupNotFound();
    if (group.trainerId !== trainerId) throw new ForbiddenError('You do not own this group', 'GROUP_OWNERSHIP_REQUIRED');
    return this.tasks.list({ groupIds: [groupId] });
  }

  async trainerDetails(taskId: string, trainerId: string) {
    const task = await this.ownedTask(taskId, trainerId);
    return { task, submissions: await this.tasks.submissions(taskId) };
  }

  async grade(taskId: string, submissionId: string, input: { score?: number; feedback?: string; status?: string }, trainerId: string): Promise<TaskSubmissionRow> {
    const task = await this.ownedTask(taskId, trainerId);
    const s = await this.tasks.findSubmission(submissionId);
    if (!s) throw new AppError('Submission not found', 404, 'SUBMISSION_NOT_FOUND');
    if (s.taskId !== taskId) throw new BadRequestError('Submission does not belong to this task', 'SUBMISSION_MISMATCH');
    const changes: Parameters<TaskRepository['updateSubmission']>[1] = { gradedAt: this.now(), gradedById: trainerId };
    if (input.score !== undefined) {
      if (input.score < 0 || input.score > task.maxScore) throw new BadRequestError(`Score must be between 0 and ${task.maxScore}`, 'INVALID_SCORE');
      changes.score = input.score;
    }
    if (input.feedback !== undefined) changes.feedback = input.feedback;
    if (input.status !== undefined) {
      if (!['pending_review', 'graded', 'returned'].includes(input.status)) throw new BadRequestError('Invalid status', 'INVALID_STATUS');
      changes.status = input.status as TaskSubmissionRow['status'];
    }
    return this.tasks.updateSubmission(s.id, changes);
  }

  async fileLink(taskId: string, submissionId: string, fileId: string, trainerId: string): Promise<{ downloadUrl: string; filename: string }> {
    await this.ownedTask(taskId, trainerId);
    const s = await this.tasks.findSubmission(submissionId);
    if (!s) throw new AppError('Submission not found', 404, 'SUBMISSION_NOT_FOUND');
    if (s.taskId !== taskId) throw new BadRequestError('Submission does not belong to this task', 'SUBMISSION_MISMATCH');
    const file = s.attachedFiles.find((f) => f._id === fileId);
    if (!file) throw new AppError('File not found', 404, 'FILE_NOT_FOUND');
    const url = await this.storage.signedUrl({ bucket: file.storageBucket, path: file.storagePath }, 300);
    return { downloadUrl: url, filename: file.originalName || file.filename };
  }

  // ─── Shared by trainer and CLO ───────────────────────────────────────────

  /** Edits a task; once students have submitted, only drafts can still change. */
  async update(taskId: string, input: TaskInput, actor: { role: 'trainer' | 'clo'; userId: string }): Promise<{ task: Task; published: boolean }> {
    const task = actor.role === 'trainer' ? await this.ownedTask(taskId, actor.userId) : await this.require(taskId);
    if (task.status !== 'draft' && (await this.tasks.submissionCount(taskId)) > 0) {
      throw new BadRequestError('Cannot update task with existing submissions', 'SUBMISSIONS_EXIST');
    }
    const changes = this.fields(input);
    let targets: { groupIds: string[]; sessionIds: string[] } | undefined;
    if (actor.role === 'clo' && input.sessionIds !== undefined) {
      const resolved = await this.resolveSessions(input.sessionIds);
      Object.assign(changes, { groupId: resolved.groupIds[0], courseId: resolved.courseIds[0] ?? null, sessionId: resolved.sessionIds[0] });
      targets = { groupIds: resolved.groupIds, sessionIds: resolved.sessionIds };
    }
    const published = input.status === 'open' && task.status === 'draft';
    if (input.status !== undefined) {
      if (!['draft', 'open', 'closed'].includes(input.status)) throw new BadRequestError('Invalid status', 'INVALID_STATUS');
      changes.status = input.status;
    }
    await this.tasks.update(taskId, changes, targets);
    const updated = await this.require(taskId);
    if (published) this.notify(updated);
    return { task: updated, published };
  }

  async publish(taskId: string, actor: { role: 'trainer' | 'clo'; userId: string }): Promise<Task> {
    const task = actor.role === 'trainer' ? await this.ownedTask(taskId, actor.userId) : await this.require(taskId);
    if (task.status !== 'draft') throw new BadRequestError('Only draft tasks can be published', 'NOT_A_DRAFT');
    await this.tasks.update(taskId, { status: 'open' });
    const updated = await this.require(taskId);
    this.notify(updated);
    return updated;
  }

  /** Deletes the task with its submissions and their stored files. */
  async delete(taskId: string, actor: { role: 'trainer' | 'clo'; userId: string }): Promise<number> {
    if (actor.role === 'trainer') await this.ownedTask(taskId, actor.userId);
    else await this.require(taskId);
    const submissions = await this.tasks.submissions(taskId);
    await this.tasks.delete(taskId);
    for (const path of submissions.flatMap((s) => this.storedPaths(s))) await this.storage.remove({ bucket: this.bucket, path });
    return submissions.length;
  }

  // ─── CLO (tasks attached to sessions, possibly across groups) ────────────

  private async resolveSessions(sessionIds: string[] | undefined) {
    if (!Array.isArray(sessionIds) || sessionIds.length === 0) {
      throw new BadRequestError('At least one session is required — select the sessions this task belongs to', 'SESSION_REQUIRED');
    }
    const unique = [...new Set(sessionIds)];
    const found = await Promise.all(unique.map((id) => this.sessions.findById(id)));
    if (found.some((s) => !s)) throw new AppError('One or more sessions were not found', 404, 'SESSION_NOT_FOUND');
    const groupIds = [...new Set(found.map((s) => s!.groupId))];
    const groupRows = await Promise.all(groupIds.map((id) => this.groups.findById(id)));
    if (groupRows.some((g) => !g)) throw new AppError('One or more groups for the selected sessions were not found', 404, 'GROUP_NOT_FOUND');
    const courseIds = [...new Set(found.flatMap((s) => (s!.courseId ? [s!.courseId] : [])))];
    return { sessionIds: unique, groupIds, courseIds };
  }

  async cloCreate(input: TaskInput, cloId: string): Promise<Task> {
    const resolved = await this.resolveSessions(input.sessionIds);
    this.checkNew(input);
    const status: TaskStatus = input.status === 'draft' ? 'draft' : 'open';
    const id = await this.tasks.create(
      {
        ...(this.fields(input) as object),
        groupId: resolved.groupIds[0]!,
        courseId: resolved.courseIds[0] ?? null,
        sessionId: resolved.sessionIds[0],
        createdById: cloId,
        title: input.title!,
        description: input.description!,
        deadline: new Date(input.deadline!),
        maxScore: input.maxScore || 100,
        status,
      },
      resolved.groupIds,
      resolved.sessionIds,
    );
    const task = await this.require(id);
    if (status === 'open') this.notify(task);
    return task;
  }

  async list(filter: TaskFilter, page: { limit: number; offset: number }) {
    const [items, total] = await Promise.all([this.tasks.list(filter, page), this.tasks.count(filter)]);
    return { items, total };
  }

  async cloDetails(taskId: string) {
    const task = await this.require(taskId);
    return { task, submissions: await this.tasks.submissions(taskId) };
  }

  async duplicate(taskId: string, cloId: string): Promise<Task> {
    const t = await this.require(taskId);
    const id = await this.tasks.create(
      {
        groupId: t.groupId,
        courseId: t.courseId,
        sessionId: t.sessionId,
        createdById: cloId,
        title: `${t.title} (Copy)`,
        titleAr: t.titleAr ? `${t.titleAr} (نسخة)` : null,
        description: t.description,
        descriptionAr: t.descriptionAr,
        deadline: t.deadline,
        maxScore: t.maxScore,
        hasQuestions: t.hasQuestions,
        questions: t.questions,
        allowLateSubmission: t.allowLateSubmission,
        status: 'draft',
      },
      t.groups.map((g) => g.id),
      t.sessions.map((s) => s.id),
    );
    return this.require(id);
  }

  async results(taskId: string) {
    const task = await this.require(taskId);
    const submissions = await this.tasks.submissions(taskId);
    const scored = submissions.filter((s) => s.score !== null);
    const totalStudents = (await this.studentsOf(await this.targetIds(task))).length;
    return {
      task,
      submissions,
      statistics: {
        totalSubmissions: submissions.length,
        gradedSubmissions: submissions.filter((s) => s.status === 'graded').length,
        pendingSubmissions: submissions.filter((s) => s.status === 'pending_review').length,
        averageScore: scored.length ? Math.round((scored.reduce((sum, s) => sum + (s.score ?? 0), 0) / scored.length) * 100) / 100 : 0,
        completionRate: totalStudents > 0 ? Math.round((submissions.length / totalStudents) * 10000) / 100 : 0,
        lateSubmissions: submissions.filter((s) => s.isLate).length,
        totalStudents,
      },
    };
  }

  // ─── Student ─────────────────────────────────────────────────────────────

  async myTasks(studentId: string, q: { status?: string; courseId?: string }, page: { limit: number; offset: number }) {
    const groupIds = await this.groups.groupIdsOfStudent(studentId);
    if (groupIds.length === 0) return { items: [], total: 0, submissions: new Map<string, TaskSubmissionRow>() };
    const filter: TaskFilter = { groupIds, excludeDraft: true, courseId: q.courseId, status: q.status && q.status !== 'draft' ? q.status : undefined };
    const [items, total] = await Promise.all([this.tasks.list(filter, page), this.tasks.count(filter)]);
    const now = this.now();
    const visible = items.filter((t) => isUnlocked(t, now));
    return { items: visible, total, submissions: await this.tasks.studentSubmissions(visible.map((t) => t.id), studentId) };
  }

  private async requireMember(task: Task, userId: string, allowTrainer: boolean): Promise<void> {
    const ids = await this.targetIds(task);
    const groupRows = (await Promise.all(ids.map((id) => this.groups.findById(id)))).filter(Boolean);
    if (groupRows.length === 0) throw groupNotFound();
    const members = await this.groups.membersOf(ids);
    const isStudent = [...members.values()].some((m) => m.some((x) => x.id === userId));
    const isTrainer = allowTrainer && groupRows.some((g) => g!.trainerId === userId);
    if (!isStudent && !isTrainer) throw new ForbiddenError('You are not a member of this group', 'NOT_GROUP_MEMBER');
  }

  async studentDetails(taskId: string, studentId: string) {
    const task = await this.require(taskId);
    await this.requireMember(task, studentId, true);
    if (!isUnlocked(task, this.now())) return { locked: true as const };
    return { locked: false as const, task, submission: await this.tasks.studentSubmission(taskId, studentId) };
  }

  /**
   * Submits (or resubmits while the task is open) answers: MCQ answers are
   * auto-scored; a task with text or image questions waits for review.
   */
  async submit(taskId: string, studentId: string, answers: AnswerInput[], files: UploadedFile[]): Promise<TaskSubmissionRow> {
    const task = await this.require(taskId);
    if (!isUnlocked(task, this.now())) throw new ForbiddenError('This task is not yet available', 'TASK_LOCKED');
    await this.requireMember(task, studentId, false);
    if (task.status === 'draft') throw taskNotFound();
    if (task.status !== 'open') throw new BadRequestError('Task is closed', 'TASK_CLOSED');
    const now = this.now();
    const isLate = now > task.deadline;
    if (isLate && !task.allowLateSubmission) throw new BadRequestError('Task deadline has passed', 'DEADLINE_PASSED');
    if (!task.hasQuestions || task.questions.length === 0) throw new BadRequestError('Task has no questions', 'NO_QUESTIONS');

    const answered = new Set(answers.map((a) => a.questionId));
    for (const q of task.questions.filter((x) => x.required)) {
      if (!answered.has(q._id)) throw new BadRequestError(`Required question ${q.order + 1} is not answered`, 'MISSING_REQUIRED_ANSWER');
    }

    const images = files.filter((f) => !ARCHIVE.test(f.originalname));
    const archives = files.filter((f) => ARCHIVE.test(f.originalname));
    const byId = new Map(task.questions.map((q) => [q._id, q]));
    const uploaded: string[] = [];
    const store = async (file: UploadedFile, dir: string): Promise<string> => {
      const { path } = await this.storage.upload({
        bucket: this.bucket,
        path: `task-submissions/${taskId}/${studentId}/${dir}${now.getTime()}-${sanitizeFilename(file.originalname)}`,
        body: file.buffer,
        contentType: file.mimetype,
      });
      uploaded.push(path);
      return path;
    };

    try {
      const processed: TaskAnswer[] = [];
      for (const a of answers) {
        const q = a.questionId ? byId.get(a.questionId) : undefined;
        if (!q) throw new BadRequestError(`Question ${a.questionId} not found in task`, 'QUESTION_NOT_FOUND');
        if (a.answerType !== q.answerType) throw new BadRequestError(`Answer type mismatch for question ${q.order + 1}`, 'ANSWER_TYPE_MISMATCH');
        const n = q.order + 1;
        if (q.answerType === 'mcq') {
          const sel = a.selectedAnswers;
          if (!Array.isArray(sel)) throw new BadRequestError(`Invalid MCQ answer for question ${n}`, 'INVALID_MCQ_ANSWER');
          if (sel.some((i) => i < 0 || i >= q.options.length)) throw new BadRequestError(`Invalid option index for question ${n}`, 'INVALID_OPTION_INDEX');
          if (q.type === 'single_choice' && sel.length > 1) throw new BadRequestError(`Single choice question ${n} can only have one answer`, 'SINGLE_CHOICE_MULTIPLE_ANSWERS');
          processed.push({ questionId: q._id, answerType: 'mcq', selectedAnswers: sel });
        } else if (q.answerType === 'text') {
          if (typeof a.textAnswer !== 'string' || !a.textAnswer) throw new BadRequestError(`Invalid text answer for question ${n}`, 'INVALID_TEXT_ANSWER');
          if (q.maxLength && a.textAnswer.length > q.maxLength) {
            throw new BadRequestError(`Text answer for question ${n} exceeds maximum length of ${q.maxLength}`, 'TEXT_ANSWER_TOO_LONG');
          }
          processed.push({ questionId: q._id, answerType: 'text', textAnswer: a.textAnswer.trim() });
        } else {
          const idx = a.imageFileIndices;
          if (!Array.isArray(idx)) throw new BadRequestError(`Invalid image answer for question ${n}`, 'INVALID_IMAGE_ANSWER');
          if (idx.length > q.maxImages) throw new BadRequestError(`Question ${n} allows maximum ${q.maxImages} image(s)`, 'TOO_MANY_IMAGES');
          const imageAnswers = [];
          for (const i of idx) {
            const file = images[i];
            if (!file) throw new BadRequestError(`Invalid file index ${i} for question ${n}`, 'INVALID_FILE_INDEX');
            if (!file.mimetype.startsWith('image/')) throw new BadRequestError(`File ${i} is not an image`, 'INVALID_FILE_TYPE');
            if (q.allowedImageTypes.length && !q.allowedImageTypes.includes(file.mimetype)) {
              throw new BadRequestError(`Image type ${file.mimetype} is not allowed for question ${n}`, 'IMAGE_TYPE_NOT_ALLOWED');
            }
            if (q.maxImageSize && file.size / (1024 * 1024) > q.maxImageSize) {
              throw new BadRequestError(`Image ${i} exceeds maximum size of ${q.maxImageSize}MB`, 'IMAGE_TOO_LARGE');
            }
            imageAnswers.push({ storagePath: await store(file, `q-${q._id}/`), filename: file.originalname, size: file.size, mimeType: file.mimetype });
          }
          processed.push({ questionId: q._id, answerType: 'image', imageAnswers });
        }
      }

      let score = 0;
      for (const a of processed) {
        const q = byId.get(a.questionId);
        if (a.answerType !== 'mcq' || !q?.correctAnswers.length) continue;
        const sel = a.selectedAnswers ?? [];
        if (sel.length === q.correctAnswers.length && q.correctAnswers.every((i) => sel.includes(i))) score += q.points;
      }
      const needsReview = task.questions.some((q) => q.answerType !== 'mcq');

      const attached: AttachedFile[] = [];
      for (const f of archives) {
        attached.push({ _id: newId(), filename: f.originalname, originalName: f.originalname, size: f.size, mimeType: f.mimetype, storagePath: await store(f, ''), storageBucket: this.bucket });
      }

      const previous = await this.tasks.studentSubmission(taskId, studentId);
      const saved = await this.tasks.saveSubmission(taskId, studentId, {
        answers: processed,
        attachedFiles: attached,
        submittedAt: now,
        isLate,
        status: needsReview ? 'pending_review' : 'graded',
        score,
        gradedAt: needsReview ? (previous?.gradedAt ?? null) : now,
      });
      // The new files replace the previous submission's.
      if (previous) for (const path of this.storedPaths(previous)) await this.storage.remove({ bucket: this.bucket, path });
      return saved;
    } catch (err) {
      for (const path of uploaded) await this.storage.remove({ bucket: this.bucket, path });
      throw err;
    }
  }
}

