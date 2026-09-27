import type { Request, Response } from 'express';
import { z } from 'zod';
import { currentUser } from '../../shared/http/request-user';
import { booleanish, numeric, parse } from '../../shared/http/validate';
import type { Quiz } from './quizzes.repository';
import { feedback, type QuizService } from './quizzes.service';
import type { QuizAttemptRow } from './quizzes.table';

const ref = z.union([z.string(), z.object({ _id: z.string() }).transform((x) => x._id)]);
const quizBody = z.object({
  courseId: ref.optional(),
  moduleId: ref.nullish().transform((v) => v ?? undefined),
  sessionId: ref.nullish().transform((v) => v ?? undefined),
  groupId: ref.nullish().transform((v) => v ?? undefined),
  title: z.string().trim().max(200, 'Title cannot exceed 200 characters').optional(),
  description: z.string().max(1000, 'Description cannot exceed 1000 characters').optional(),
  instructions: z.string().max(2000, 'Instructions cannot exceed 2000 characters').optional(),
  passingScore: numeric('Passing score must be a number').refine((v) => v >= 0 && v <= 100, 'Passing score must be between 0 and 100').optional(),
  timeLimit: numeric('Time limit must be a number').refine((v) => v >= 1, 'Time limit must be at least 1 minute').nullish(),
  maxAttempts: numeric('Max attempts must be a number').refine((v) => v >= 1, 'Max attempts must be at least 1').optional(),
  shuffleQuestions: booleanish.optional(),
  shuffleOptions: booleanish.optional(),
  showFeedback: booleanish.optional(),
  isActive: booleanish.optional(),
  questions: z
    .array(
      z.object({
        _id: z.string().optional(),
        question: z.string().max(1000, 'Question cannot exceed 1000 characters').optional(),
        type: z.enum(['single', 'multiple']).optional(),
        options: z.array(z.object({ _id: z.string().optional(), text: z.string().max(500, 'Option text cannot exceed 500 characters'), isCorrect: booleanish.optional() })).optional(),
        points: numeric('Points must be a number').refine((v) => v >= 0, 'Points cannot be negative').optional(),
        explanation: z.string().max(1000, 'Explanation cannot exceed 1000 characters').optional(),
      }),
    )
    .optional(),
});

type Shape = { course: boolean; module: boolean; session: boolean; group: boolean };

/** The quiz document; references are populated where the old endpoint populated them. */
export function quizDoc(q: Quiz, shape: Shape) {
  return {
    _id: q.id,
    session: shape.session && q.session ? { _id: q.session.id, title: q.session.title, scheduledDate: q.session.scheduledDate } : q.sessionId,
    module: shape.module && q.module ? { _id: q.module.id, title: q.module.title, order: q.module.order } : q.moduleId,
    course: shape.course && q.course ? { _id: q.course.id, title: q.course.title, category: q.course.category } : q.courseId,
    group: shape.group && q.group ? { _id: q.group.id, name: q.group.name } : q.groupId,
    title: q.title,
    description: q.description,
    instructions: q.instructions,
    passingScore: q.passingScore,
    timeLimit: q.timeLimit,
    maxAttempts: q.maxAttempts,
    shuffleQuestions: q.shuffleQuestions,
    shuffleOptions: q.shuffleOptions,
    showFeedback: q.showFeedback,
    questions: q.questions,
    isActive: q.isActive,
    createdAt: q.createdAt,
    updatedAt: q.updatedAt,
  };
}

const attemptDoc = (a: QuizAttemptRow) => ({
  _id: a.id,
  student: a.studentId,
  quiz: a.quizId,
  course: a.courseId,
  attemptNumber: a.attemptNumber,
  answers: a.answers,
  score: a.score,
  totalPoints: a.totalPoints,
  earnedPoints: a.earnedPoints,
  passed: a.passed,
  startedAt: a.startedAt,
  submittedAt: a.submittedAt,
  timeSpent: a.timeSpent,
  status: a.status,
  createdAt: a.createdAt,
  updatedAt: a.updatedAt,
});

const COURSE_AND_MODULE: Shape = { course: true, module: true, session: false, group: false };

/** /api/trainer/quizzes */
export class TrainerQuizController {
  constructor(private readonly quizzes: QuizService) {}

  list = async (req: Request, res: Response) => {
    const list = await this.quizzes.forTrainer(currentUser(req).id);
    res.json({ success: true, count: list.length, data: list.map((q) => quizDoc(q, COURSE_AND_MODULE)) });
  };

  forCourse = async (req: Request<{ courseId: string }>, res: Response) => {
    const list = await this.quizzes.forCourse(req.params.courseId, currentUser(req).id);
    res.json({ success: true, count: list.length, data: list.map((q) => quizDoc(q, { course: false, module: true, session: false, group: false })) });
  };

  get = async (req: Request<{ id: string }>, res: Response) => {
    res.json({ success: true, data: quizDoc(await this.quizzes.get(req.params.id, currentUser(req).id), COURSE_AND_MODULE) });
  };

  create = async (req: Request, res: Response) => {
    const q = await this.quizzes.create(parse(quizBody, req.body), currentUser(req).id);
    res.status(201).json({ success: true, message: 'Quiz created successfully', data: quizDoc(q, { course: true, module: true, session: true, group: true }) });
  };

  update = async (req: Request<{ id: string }>, res: Response) => {
    const q = await this.quizzes.update(req.params.id, parse(quizBody, req.body), currentUser(req).id);
    res.json({ success: true, message: 'Quiz updated successfully', data: quizDoc(q, COURSE_AND_MODULE) });
  };

  delete = async (req: Request<{ id: string }>, res: Response) => {
    await this.quizzes.delete(req.params.id, currentUser(req).id);
    res.json({ success: true, message: 'Quiz deleted successfully' });
  };

  duplicate = async (req: Request<{ id: string }>, res: Response) => {
    const q = await this.quizzes.duplicate(req.params.id, currentUser(req).id);
    res.status(201).json({ success: true, message: 'Quiz duplicated successfully', data: quizDoc(q, COURSE_AND_MODULE) });
  };
}

const submitBody = z.object({
  attemptId: z.string().optional(),
  answers: z.array(z.object({ questionId: z.string(), selectedOptions: z.array(z.number().int().min(0)).default([]) })).optional(),
});

/** /api/student/quizzes */
export class StudentQuizController {
  constructor(private readonly quizzes: QuizService) {}

  /** The quiz without the answers: options carry only their index and text. */
  get = async (req: Request<{ quizId: string }>, res: Response) => {
    const q = await this.quizzes.studentQuiz(req.params.quizId, currentUser(req).id);
    const doc = quizDoc(q, { course: false, module: true, session: false, group: false });
    res.json({
      success: true,
      data: {
        ...doc,
        questions: q.questions.map((qq) => ({ _id: qq._id, question: qq.question, type: qq.type, points: qq.points, options: qq.options.map((o, index) => ({ index, text: o.text })) })),
      },
    });
  };

  start = async (req: Request<{ quizId: string }>, res: Response) => {
    const { attempt, resumed } = await this.quizzes.start(req.params.quizId, currentUser(req).id);
    const body = { success: true, message: resumed ? 'Quiz attempt already in progress' : 'Quiz attempt started', data: { attemptId: attempt.id, attempt: attemptDoc(attempt) } };
    res.status(resumed ? 200 : 201).json(body);
  };

  submit = async (req: Request<{ quizId: string }>, res: Response) => {
    const { attemptId, answers } = parse(submitBody, req.body);
    const { quiz, attempt } = await this.quizzes.submit(req.params.quizId, currentUser(req).id, attemptId, answers);
    res.json({
      success: true,
      message: attempt.passed ? 'Congratulations! You passed the quiz!' : 'Quiz completed. Keep trying!',
      data: {
        score: attempt.score,
        earnedPoints: attempt.earnedPoints,
        totalPoints: attempt.totalPoints,
        passed: attempt.passed,
        timeSpent: attempt.timeSpent,
        attemptId: attempt.id,
        attemptNumber: attempt.attemptNumber,
        detailedResults: quiz.showFeedback ? feedback(quiz, attempt, false) : null,
      },
    });
  };

  attempts = async (req: Request<{ quizId: string }>, res: Response) => {
    const { list, best } = await this.quizzes.attempts(req.params.quizId, currentUser(req).id);
    res.json({
      success: true,
      count: list.length,
      bestScore: best,
      data: list.map((a) => ({
        _id: a.id,
        attemptNumber: a.attemptNumber,
        score: a.score,
        earnedPoints: a.earnedPoints,
        totalPoints: a.totalPoints,
        passed: a.passed,
        submittedAt: a.submittedAt,
        timeSpent: a.timeSpent,
      })),
    });
  };

  result = async (req: Request<{ quizId: string; attemptId: string }>, res: Response) => {
    const { quiz, attempt } = await this.quizzes.result(req.params.quizId, req.params.attemptId, currentUser(req).id);
    res.json({
      success: true,
      data: {
        attempt: {
          _id: attempt.id,
          attemptNumber: attempt.attemptNumber,
          score: attempt.score,
          earnedPoints: attempt.earnedPoints,
          totalPoints: attempt.totalPoints,
          passed: attempt.passed,
          timeSpent: attempt.timeSpent,
          submittedAt: attempt.submittedAt,
        },
        quiz: { title: quiz.title, passingScore: quiz.passingScore, totalQuestions: quiz.questions.length },
        detailedResults: quiz.showFeedback ? feedback(quiz, attempt, true) : null,
      },
    });
  };
}
