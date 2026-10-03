import type { Request, Response } from 'express';
import { z } from 'zod';
import { paginationMeta, parsePagination } from '../../shared/http/pagination';
import { currentUser } from '../../shared/http/request-user';
import { BadRequestError } from '../../shared/http/errors';
import { booleanish, numeric, parse } from '../../shared/http/validate';
import type { Task, TaskSubmission } from './tasks.repository';
import type { TaskService } from './tasks.service';
import type { TaskQuestion, TaskSubmissionRow } from './tasks.table';

const question = z
  .object({
    _id: z.string().optional(),
    questionText: z.string().trim().max(2000, 'Question text cannot exceed 2000 characters').optional(),
    questionTextAr: z.string().trim().max(2000).optional(),
    answerType: z.string().optional(),
    type: z.enum(['single_choice', 'multiple_choice']).optional(),
    options: z.array(z.string().trim().max(500, 'Option text cannot exceed 500 characters')).optional(),
    correctAnswers: z.array(z.number().int()).optional(),
    points: numeric('Points must be a number').optional(),
    order: numeric('Order must be a number').optional(),
    required: booleanish.optional(),
    maxLength: numeric('Max length must be a number').optional(),
    maxImages: numeric('Max images must be a number').optional(),
    allowedImageTypes: z.array(z.enum(['image/jpeg', 'image/jpg', 'image/png', 'image/webp'])).optional(),
    maxImageSize: numeric('Max image size must be a number').optional(),
  })
  .transform((q) => q as unknown as Partial<TaskQuestion> & { _id?: string });

const taskBody = z.object({
  groupId: z.string().optional(),
  courseId: z.string().nullish().transform((v) => v ?? undefined),
  sessionIds: z.array(z.string()).optional(),
  title: z.string().trim().max(200, 'Title cannot exceed 200 characters').optional(),
  titleAr: z.string().trim().max(200).optional(),
  description: z.string().trim().max(5000, 'Description cannot exceed 5000 characters').optional(),
  descriptionAr: z.string().trim().max(5000).optional(),
  deadline: z.string().optional(),
  maxScore: numeric('Max score must be a number').refine((v) => v >= 0, 'Max score cannot be negative').optional(),
  questions: z.array(question).optional(),
  allowLateSubmission: booleanish.optional(),
  status: z.string().optional(),
});

/** The task document; `full` populates every reference, as the read endpoints did. */
function taskDoc(t: Task, full: boolean) {
  const session = (s: Task['sessions'][number]) => ({ _id: s.id, title: s.title, sessionNumber: s.sessionNumber, scheduledDate: s.scheduledDate });
  const groupIds = t.groups.length ? t.groups : t.group ? [{ id: t.group.id, name: t.group.name, courseId: t.courseId ?? '' }] : [];
  return {
    _id: t.id,
    groupId: full && t.group ? { _id: t.group.id, name: t.group.name } : t.groupId,
    courseId: full && t.course ? { _id: t.course.id, title: t.course.title } : t.courseId,
    sessionId: full && t.session ? session(t.session) : t.sessionId,
    groupIds: groupIds.map((g) => (full ? { _id: g.id, name: g.name } : g.id)),
    courseIds: t.courses.map((c) => (full ? { _id: c.id, title: c.title } : c.id)),
    sessionIds: t.sessions.map((s) => (full ? session(s) : s.id)),
    createdBy: full && t.createdBy ? { _id: t.createdBy.id, name: t.createdBy.name, email: t.createdBy.email } : t.createdById,
    title: t.title,
    titleAr: t.titleAr,
    description: t.description,
    descriptionAr: t.descriptionAr,
    deadline: t.deadline,
    maxScore: t.maxScore,
    hasQuestions: t.hasQuestions,
    questions: t.questions,
    allowLateSubmission: t.allowLateSubmission,
    status: t.status,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

/** Questions as a student sees them: correct answers only once the work is graded. */
const studentQuestions = (qs: TaskQuestion[], reveal: boolean) => qs.map(({ correctAnswers, ...q }) => (reveal ? { ...q, correctAnswers } : q));

export class TaskController {
  constructor(private readonly tasks: TaskService) {}

  /** Submission document; image answers get signed links under the old Cloudinary field names. */
  private async submissionDoc(s: TaskSubmissionRow | TaskSubmission) {
    const withRefs = 'student' in s ? s : null;
    const answers = await Promise.all(
      s.answers.map(async (a) => ({
        questionId: a.questionId,
        answerType: a.answerType,
        ...(a.selectedAnswers ? { selectedAnswers: a.selectedAnswers } : {}),
        ...(a.textAnswer !== undefined ? { textAnswer: a.textAnswer } : {}),
        ...(a.imageAnswers
          ? {
              imageAnswers: await Promise.all(
                a.imageAnswers.map(async (i) => ({ cloudinaryUrl: await this.tasks.signedUrl(i.storagePath), cloudinaryPublicId: i.storagePath, filename: i.filename, size: i.size, mimeType: i.mimeType })),
              ),
            }
          : {}),
      })),
    );
    return {
      _id: s.id,
      taskId: s.taskId,
      studentId: withRefs?.student ? { _id: withRefs.student.id, name: withRefs.student.name, email: withRefs.student.email } : s.studentId,
      answers,
      attachedFiles: s.attachedFiles,
      submittedAt: s.submittedAt,
      isLate: s.isLate,
      status: s.status,
      score: s.score,
      feedback: s.feedback,
      gradedAt: s.gradedAt,
      gradedBy: withRefs?.gradedBy ? { _id: withRefs.gradedBy.id, name: withRefs.gradedBy.name, email: withRefs.gradedBy.email } : s.gradedById,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    };
  }

  // ─── Trainer — /api/trainer/tasks ────────────────────────────────────────

  trainerCreate = async (req: Request, res: Response) => {
    const t = await this.tasks.trainerCreate(parse(taskBody, req.body), currentUser(req).id);
    res.status(201).json({ success: true, message: t.status === 'draft' ? 'Task saved as draft' : 'Task created successfully', data: taskDoc(t, false) });
  };

  groupTasks = async (req: Request<{ groupId: string }>, res: Response) => {
    const list = await this.tasks.groupTasks(req.params.groupId, currentUser(req).id);
    res.json({ success: true, count: list.length, data: list.map((t) => taskDoc(t, true)) });
  };

  trainerDetails = async (req: Request<{ taskId: string }>, res: Response) => {
    const { task, submissions } = await this.tasks.trainerDetails(req.params.taskId, currentUser(req).id);
    res.json({
      success: true,
      count: submissions.length,
      task: taskDoc(task, true),
      data: { questions: task.questions, submissions: await Promise.all(submissions.map((s) => this.submissionDoc(s))) },
    });
  };

  trainerSubmissions = async (req: Request<{ taskId: string }>, res: Response) => {
    const { task, submissions } = await this.tasks.trainerDetails(req.params.taskId, currentUser(req).id);
    res.json({ success: true, count: submissions.length, data: { questions: task.questions, submissions: await Promise.all(submissions.map((s) => this.submissionDoc(s))) } });
  };

  grade = async (req: Request<{ taskId: string; submissionId: string }>, res: Response) => {
    const body = parse(z.object({ score: numeric('Score must be a number').optional(), feedback: z.string().max(5000).optional(), status: z.string().optional() }), req.body);
    const s = await this.tasks.grade(req.params.taskId, req.params.submissionId, body, currentUser(req).id);
    res.json({ success: true, message: 'Submission graded successfully', data: await this.submissionDoc(s) });
  };

  fileLink = async (req: Request<{ taskId: string; submissionId: string; fileId: string }>, res: Response) => {
    const { taskId, submissionId, fileId } = req.params;
    res.json({ success: true, data: await this.tasks.fileLink(taskId, submissionId, fileId, currentUser(req).id) });
  };

  // ─── Shared ──────────────────────────────────────────────────────────────

  private actor(req: Request, role: 'trainer' | 'clo') {
    return { role, userId: currentUser(req).id };
  }

  update = (role: 'trainer' | 'clo') => async (req: Request<{ taskId: string }>, res: Response) => {
    const { task, published } = await this.tasks.update(req.params.taskId, parse(taskBody, req.body), this.actor(req, role));
    res.json({ success: true, message: published ? 'Task published successfully' : 'Task updated successfully', data: taskDoc(task, false) });
  };

  publish = (role: 'trainer' | 'clo') => async (req: Request<{ taskId: string }>, res: Response) => {
    const task = await this.tasks.publish(req.params.taskId, this.actor(req, role));
    res.json({ success: true, message: 'Task published successfully', data: taskDoc(task, false) });
  };

  delete = (role: 'trainer' | 'clo') => async (req: Request<{ taskId: string }>, res: Response) => {
    const deletedSubmissions = await this.tasks.delete(req.params.taskId, this.actor(req, role));
    res.json({ success: true, message: 'Task deleted successfully', deletedSubmissions });
  };

  // ─── CLO — /api/clo/tasks ────────────────────────────────────────────────

  cloCreate = async (req: Request, res: Response) => {
    const t = await this.tasks.cloCreate(parse(taskBody, req.body), currentUser(req).id);
    res.status(201).json({ success: true, message: t.status === 'draft' ? 'Task saved as draft' : 'Task created successfully', data: taskDoc(t, false) });
  };

  cloList = async (req: Request, res: Response) => {
    const q = req.query as Record<string, string | undefined>;
    const page = parsePagination(req.query);
    const { items, total } = await this.tasks.list({ courseId: q.courseId, groupIds: q.groupId ? [q.groupId] : undefined, sessionId: q.sessionId, status: q.status }, page);
    const meta = paginationMeta(total, page);
    res.json({ success: true, count: items.length, data: items.map((t) => taskDoc(t, true)), pagination: { page: meta.page, limit: meta.limit, totalPages: meta.pages, total } });
  };

  cloDetails = async (req: Request<{ taskId: string }>, res: Response) => {
    const { task, submissions } = await this.tasks.cloDetails(req.params.taskId);
    res.json({ success: true, data: { task: taskDoc(task, true), questions: task.questions, submissions: await Promise.all(submissions.map((s) => this.submissionDoc(s))) } });
  };

  duplicate = async (req: Request<{ taskId: string }>, res: Response) => {
    const t = await this.tasks.duplicate(req.params.taskId, currentUser(req).id);
    res.status(201).json({ success: true, message: 'Task duplicated as draft', data: taskDoc(t, false) });
  };

  results = async (req: Request<{ taskId: string }>, res: Response) => {
    const { task, submissions, statistics } = await this.tasks.results(req.params.taskId);
    res.json({
      success: true,
      data: {
        taskId: task.id,
        taskTitle: task.title,
        questions: task.questions,
        statistics,
        submissions: submissions.map((s) => ({
          studentId: s.studentId,
          studentName: s.student?.name ?? null,
          studentEmail: s.student?.email ?? null,
          status: s.status,
          score: s.score,
          isLate: s.isLate,
          submittedAt: s.submittedAt,
        })),
      },
    });
  };

  // ─── Student — /api/student/tasks ────────────────────────────────────────

  myTasks = async (req: Request, res: Response) => {
    const q = req.query as Record<string, string | undefined>;
    const page = parsePagination(req.query);
    const { items, total, submissions } = await this.tasks.myTasks(currentUser(req).id, { status: q.status, courseId: q.courseId }, page);
    const meta = paginationMeta(total, page);
    res.json({
      success: true,
      count: items.length,
      data: items.map((t) => {
        const s = submissions.get(t.id);
        return {
          ...taskDoc(t, true),
          questions: studentQuestions(t.questions, false),
          submission: s ? { _id: s.id, status: s.status, score: s.score, submittedAt: s.submittedAt, isLate: s.isLate } : null,
        };
      }),
      pagination: { page: meta.page, limit: meta.limit, totalPages: meta.pages, total },
    });
  };

  studentDetails = async (req: Request<{ taskId: string }>, res: Response) => {
    const r = await this.tasks.studentDetails(req.params.taskId, currentUser(req).id);
    if (r.locked) {
      res.status(403).json({ success: false, locked: true, message: 'This task is not yet available', error: { message: 'This task is not yet available' } });
      return;
    }
    const graded = r.submission?.status === 'graded' || r.submission?.status === 'returned';
    res.json({
      success: true,
      data: { task: { ...taskDoc(r.task, true), questions: studentQuestions(r.task.questions, graded) }, submission: r.submission ? await this.submissionDoc(r.submission) : null },
    });
  };

  submit = async (req: Request<{ taskId: string }>, res: Response) => {
    let answers: unknown = (req.body as { answers?: unknown } | undefined)?.answers ?? [];
    if (typeof answers === 'string') {
      try {
        answers = JSON.parse(answers);
      } catch {
        throw new BadRequestError('Invalid answers format. Must be valid JSON', 'INVALID_ANSWERS_FORMAT');
      }
    }
    const list = Array.isArray(answers) ? answers : [];
    const files = Array.isArray(req.files) ? req.files : [];
    const s = await this.tasks.submit(req.params.taskId, currentUser(req).id, list, files);
    res.status(201).json({ success: true, message: 'Task submitted successfully', data: await this.submissionDoc(s) });
  };
}
