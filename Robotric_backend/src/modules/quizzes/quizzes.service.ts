import { newId } from '../../shared/db/ids';
import { AppError, BadRequestError, ForbiddenError, NotFoundError } from '../../shared/http/errors';
import type { Logger } from '../../shared/logger';
import type { CourseModuleRepository } from '../course-modules/course-modules.repository';
import type { EnrollmentRepository } from '../enrollments/enrollments.repository';
import type { GroupRepository } from '../groups/groups.repository';
import type { Quiz, QuizRepository } from './quizzes.repository';
import type { AttemptAnswer, NewQuizRow, QuizAttemptRow, QuizQuestion } from './quizzes.table';

export interface QuestionInput {
  _id?: string;
  question?: string;
  type?: 'single' | 'multiple';
  options?: { _id?: string; text: string; isCorrect?: boolean }[];
  points?: number;
  explanation?: string;
}

export interface QuizInput {
  courseId?: string;
  moduleId?: string;
  sessionId?: string;
  groupId?: string;
  title?: string;
  description?: string;
  instructions?: string;
  passingScore?: number;
  timeLimit?: number | null;
  maxAttempts?: number;
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
  showFeedback?: boolean;
  isActive?: boolean;
  questions?: QuestionInput[];
}

export interface CourseAccessLookup {
  findById(id: string): Promise<{ id: string; instructorId: string | null } | null>;
  /** Courses the trainer is the named instructor of. */
  idsWithInstructor(trainerId: string): Promise<string[]>;
}

export interface QuizNotifier {
  quizAvailable(target: { groupId?: string; courseId: string }, quiz: Quiz): Promise<void>;
}
export const silentQuizNotifier: QuizNotifier = { quizAvailable: async () => {} };

/** Same checks and messages as before; also rejects several correct answers on a single-choice question. */
function checkQuestions(questions: QuestionInput[]): QuizQuestion[] {
  return questions.map((q, i) => {
    if (!q.question || !q.options || q.options.length < 2) {
      throw new BadRequestError(`Question ${i + 1} must have text and at least 2 options`);
    }
    const correct = q.options.filter((o) => o.isCorrect).length;
    if (correct === 0) throw new BadRequestError(`Question ${i + 1} must have at least one correct answer`);
    const type = q.type ?? 'single';
    if (type === 'single' && correct > 1) throw new BadRequestError(`Question ${i + 1} is single choice but has multiple correct answers`);
    return {
      _id: q._id ?? newId(),
      question: q.question,
      type,
      options: q.options.map((o) => ({ _id: o._id ?? newId(), text: o.text, isCorrect: Boolean(o.isCorrect) })),
      points: q.points ?? 1,
      ...(q.explanation ? { explanation: q.explanation } : {}),
    };
  });
}

const correctIndices = (q: QuizQuestion) => q.options.flatMap((o, i) => (o.isCorrect ? [i] : []));

/**
 * Grades answers. Every question counts toward the total (the old code only
 * counted answered ones, so skipping hard questions raised the score) and a
 * question answered twice counts once.
 */
export function grade(questions: QuizQuestion[], answers: { questionId: string; selectedOptions: number[] }[]) {
  const byId = new Map(questions.map((q) => [q._id, q]));
  const seen = new Set<string>();
  const graded: AttemptAnswer[] = [];
  for (const a of answers) {
    const q = byId.get(a.questionId);
    if (!q || seen.has(q._id)) continue;
    seen.add(q._id);
    const selected = new Set(a.selectedOptions);
    const correct = new Set(correctIndices(q));
    const isCorrect =
      q.type === 'single' ? selected.size === 1 && correct.has([...selected][0]!) : selected.size === correct.size && [...selected].every((i) => correct.has(i));
    graded.push({ questionId: q._id, questionText: q.question, selectedOptions: a.selectedOptions, isCorrect, pointsEarned: isCorrect ? q.points : 0 });
  }
  const totalPoints = questions.reduce((s, q) => s + (q.points || 0), 0);
  const earnedPoints = graded.reduce((s, a) => s + a.pointsEarned, 0);
  return { answers: graded, totalPoints, earnedPoints, score: totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0 };
}

export function feedback(quiz: { questions: QuizQuestion[] }, attempt: QuizAttemptRow, withOptions: boolean) {
  const byId = new Map(quiz.questions.map((q) => [q._id, q]));
  return attempt.answers.map((a) => {
    const q = byId.get(a.questionId);
    return {
      question: a.questionText,
      selectedOptions: a.selectedOptions,
      correctOptions: q ? correctIndices(q) : [],
      isCorrect: a.isCorrect,
      pointsEarned: a.pointsEarned,
      explanation: q?.explanation,
      ...(withOptions && q ? { allOptions: q.options.map((o, index) => ({ index, text: o.text, isCorrect: o.isCorrect })) } : {}),
    };
  });
}

export class QuizService {
  constructor(
    private readonly quizzes: QuizRepository,
    private readonly courses: CourseAccessLookup,
    private readonly groups: Pick<GroupRepository, 'list'>,
    private readonly modules: Pick<CourseModuleRepository, 'findRow' | 'create' | 'deleteUnusedQuizModule'>,
    private readonly enrollments: Pick<EnrollmentRepository, 'findForStudentCourse'>,
    private readonly notifier: QuizNotifier,
    private readonly logger: Logger,
    private readonly now: () => Date = () => new Date(),
  ) {}

  // ─── Trainer ─────────────────────────────────────────────────────────────

  /** A trainer may manage quizzes of courses they instruct or have a group in. */
  private async hasAccess(courseId: string, trainerId: string): Promise<boolean> {
    const course = await this.courses.findById(courseId);
    if (!course) return false;
    if (course.instructorId === trainerId) return true;
    return (await this.groups.list({ courseId, trainerId })).length > 0;
  }

  private async requireOwned(id: string, trainerId: string): Promise<Quiz> {
    const quiz = await this.quizzes.findById(id);
    if (!quiz) throw new NotFoundError('Quiz');
    if (!(await this.hasAccess(quiz.courseId, trainerId))) throw new ForbiddenError('You do not have access to this quiz');
    return quiz;
  }

  async forTrainer(trainerId: string): Promise<Quiz[]> {
    const [instructed, groupCourses] = await Promise.all([this.courses.idsWithInstructor(trainerId), this.groups.list({ trainerId })]);
    return this.quizzes.listForCourses([...new Set([...instructed, ...groupCourses.map((g) => g.courseId)])]);
  }

  async forCourse(courseId: string, trainerId: string): Promise<Quiz[]> {
    if (!(await this.hasAccess(courseId, trainerId))) throw new ForbiddenError('You do not have access to this course');
    return this.quizzes.listForCourses([courseId]);
  }

  get(id: string, trainerId: string): Promise<Quiz> {
    return this.requireOwned(id, trainerId);
  }

  /** Creates a quiz; without a module, a "Quiz Module" is added at the end of the course for it. */
  async create(input: QuizInput, trainerId: string): Promise<Quiz> {
    if (!input.courseId || !input.title || !input.questions?.length) {
      throw new BadRequestError('Course ID, title, and at least one question are required');
    }
    const course = await this.courses.findById(input.courseId);
    if (!course) throw new NotFoundError('Course');
    if (!(await this.hasAccess(input.courseId, trainerId))) throw new ForbiddenError('You do not have access to this course');
    const questions = checkQuestions(input.questions);

    let moduleId = input.moduleId;
    if (moduleId) {
      const m = await this.modules.findRow(moduleId);
      if (!m || m.courseId !== input.courseId) throw new AppError('Module not found', 404, 'NOT_FOUND');
    } else {
      moduleId = await this.modules.create({
        courseId: input.courseId,
        title: `Quiz Module: ${input.title}`,
        description: `Module for quiz: ${input.title}`,
        order: 999,
        type: 'quiz',
        content: { videoUrl: null, videoDuration: null, pdfUrl: null, textContent: null, duration: input.timeLimit ?? null },
      });
    }

    const id = await this.quizzes.create({
      sessionId: input.sessionId ?? null,
      moduleId,
      courseId: input.courseId,
      groupId: input.groupId ?? null,
      title: input.title,
      description: input.description ?? null,
      instructions: input.instructions ?? null,
      passingScore: input.passingScore || 70,
      timeLimit: input.timeLimit ?? null,
      maxAttempts: input.maxAttempts || 3,
      shuffleQuestions: input.shuffleQuestions ?? false,
      shuffleOptions: input.shuffleOptions ?? false,
      showFeedback: input.showFeedback ?? true,
      questions,
      createdById: trainerId,
    });
    const quiz = (await this.quizzes.findById(id))!;
    this.notifier.quizAvailable({ groupId: input.groupId, courseId: input.courseId }, quiz).catch((err: unknown) => this.logger.warn({ err }, 'Quiz notification failed'));
    return quiz;
  }

  async update(id: string, input: QuizInput, trainerId: string): Promise<Quiz> {
    await this.requireOwned(id, trainerId);
    const { questions, courseId: _c, moduleId, sessionId, groupId, ...rest } = input;
    const changes: Partial<NewQuizRow> = Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined));
    if (questions) changes.questions = checkQuestions(questions);
    if (moduleId !== undefined) changes.moduleId = moduleId || null;
    if (sessionId !== undefined) changes.sessionId = sessionId || null;
    if (groupId !== undefined) changes.groupId = groupId || null;
    if (Object.keys(changes).length) await this.quizzes.update(id, changes);
    return (await this.quizzes.findById(id))!;
  }

  async delete(id: string, trainerId: string): Promise<void> {
    const quiz = await this.requireOwned(id, trainerId);
    await this.quizzes.delete(id);
    // The module made for the quiz would otherwise stay behind with nothing in it
    if (quiz.moduleId) await this.modules.deleteUnusedQuizModule(quiz.moduleId);
  }

  async duplicate(id: string, trainerId: string): Promise<Quiz> {
    const q = await this.requireOwned(id, trainerId);
    const copy = await this.quizzes.create({
      sessionId: q.sessionId,
      moduleId: q.moduleId,
      courseId: q.courseId,
      groupId: q.groupId,
      title: `${q.title} (Copy)`,
      description: q.description,
      instructions: q.instructions,
      passingScore: q.passingScore,
      timeLimit: q.timeLimit,
      maxAttempts: q.maxAttempts,
      shuffleQuestions: q.shuffleQuestions,
      shuffleOptions: q.shuffleOptions,
      showFeedback: q.showFeedback,
      questions: q.questions.map((qq) => ({ ...qq, _id: newId(), options: qq.options.map((o) => ({ ...o, _id: newId() })) })),
      isActive: q.isActive,
      createdById: trainerId,
    });
    return (await this.quizzes.findById(copy))!;
  }

  // ─── Student ─────────────────────────────────────────────────────────────

  private async enrolledQuiz(quizId: string, studentId: string, requireActiveQuiz = true): Promise<Quiz> {
    const quiz = await this.quizzes.findById(quizId);
    if (!quiz || (requireActiveQuiz && !quiz.isActive)) throw new AppError('Quiz not found', 404, 'NOT_FOUND');
    const e = await this.enrollments.findForStudentCourse(studentId, quiz.courseId);
    if (!e || e.status !== 'active') throw new ForbiddenError('You are not enrolled in this course');
    return quiz;
  }

  studentQuiz(quizId: string, studentId: string): Promise<Quiz> {
    return this.enrolledQuiz(quizId, studentId);
  }

  async start(quizId: string, studentId: string): Promise<{ attempt: QuizAttemptRow; resumed: boolean }> {
    const quiz = await this.enrolledQuiz(quizId, studentId);
    const used = await this.quizzes.submittedCount(studentId, quizId);
    if (used >= quiz.maxAttempts) throw new BadRequestError('Maximum attempts reached for this quiz');
    const open = await this.quizzes.inProgress(studentId, quizId);
    if (open) return { attempt: open, resumed: true };
    const attempt = await this.quizzes.createAttempt({
      studentId,
      quizId,
      courseId: quiz.courseId,
      attemptNumber: used + 1,
      status: 'in_progress',
      startedAt: this.now(),
    });
    return { attempt, resumed: false };
  }

  async submit(quizId: string, studentId: string, attemptId: string | undefined, answers: { questionId: string; selectedOptions: number[] }[] | undefined) {
    if (!attemptId || !answers) throw new BadRequestError('Attempt ID and answers are required');
    const quiz = await this.quizzes.findById(quizId);
    if (!quiz) throw new AppError('Quiz not found', 404, 'NOT_FOUND');
    const attempt = await this.quizzes.findAttempt(attemptId, studentId, quizId);
    if (!attempt || attempt.status !== 'in_progress') throw new AppError('Quiz attempt not found or already submitted', 404, 'NOT_FOUND');

    const result = grade(quiz.questions, answers);
    const submittedAt = this.now();
    const saved = await this.quizzes.updateAttempt(attempt.id, {
      ...result,
      passed: result.score >= quiz.passingScore,
      status: 'submitted',
      submittedAt,
      timeSpent: Math.floor((submittedAt.getTime() - attempt.startedAt.getTime()) / 1000),
    });
    return { quiz, attempt: saved };
  }

  async attempts(quizId: string, studentId: string) {
    const [list, best] = await Promise.all([this.quizzes.submittedAttempts(studentId, quizId), this.quizzes.bestScore(studentId, quizId)]);
    return { list, best };
  }

  async result(quizId: string, attemptId: string, studentId: string) {
    const attempt = await this.quizzes.findAttempt(attemptId, studentId, quizId);
    if (!attempt || attempt.status !== 'submitted') throw new AppError('Quiz attempt not found', 404, 'NOT_FOUND');
    const quiz = await this.quizzes.findById(quizId);
    if (!quiz) throw new AppError('Quiz not found', 404, 'NOT_FOUND');
    return { quiz, attempt };
  }
}
