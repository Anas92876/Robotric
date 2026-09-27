import { boolean, doublePrecision, index, integer, jsonb, pgEnum, pgTable, timestamp, uniqueIndex, varchar } from 'drizzle-orm/pg-core';
import { idRef, primaryId } from '../../shared/db/ids';
import { timestamps } from '../../shared/db/columns';
import { courseModules } from '../course-modules/course-modules.table';
import { courses } from '../courses/courses.table';
import { groups } from '../groups/groups.table';
import { sessions } from '../sessions/sessions.table';
import { users } from '../users/users.table';

export interface QuizOption {
  _id: string;
  text: string;
  isCorrect: boolean;
}
export interface QuizQuestion {
  _id: string;
  question: string;
  type: 'single' | 'multiple';
  options: QuizOption[];
  points: number;
  explanation?: string;
}
export interface AttemptAnswer {
  questionId: string;
  questionText: string;
  selectedOptions: number[];
  isCorrect: boolean;
  pointsEarned: number;
}

export const attemptStatus = pgEnum('quiz_attempt_status', ['in_progress', 'submitted', 'expired']);

/** A quiz; its questions are always edited as a whole, so they are stored as JSON. */
export const quizzes = pgTable(
  'quizzes',
  {
    id: primaryId(),
    sessionId: idRef('session_id').references(() => sessions.id, { onDelete: 'set null' }),
    moduleId: idRef('module_id').references(() => courseModules.id, { onDelete: 'set null' }),
    courseId: idRef('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    groupId: idRef('group_id').references(() => groups.id, { onDelete: 'set null' }),
    title: varchar('title', { length: 200 }).notNull(),
    description: varchar('description', { length: 1000 }),
    instructions: varchar('instructions', { length: 2000 }),
    passingScore: doublePrecision('passing_score').notNull().default(70),
    /** Minutes. */
    timeLimit: integer('time_limit'),
    maxAttempts: integer('max_attempts').notNull().default(3),
    shuffleQuestions: boolean('shuffle_questions').notNull().default(false),
    shuffleOptions: boolean('shuffle_options').notNull().default(false),
    showFeedback: boolean('show_feedback').notNull().default(true),
    questions: jsonb('questions').$type<QuizQuestion[]>().notNull().default([]),
    isActive: boolean('is_active').notNull().default(true),
    createdById: idRef('created_by_id').references(() => users.id, { onDelete: 'set null' }),
    ...timestamps(),
  },
  (t) => [index('quizzes_course_idx').on(t.courseId), index('quizzes_module_idx').on(t.moduleId), index('quizzes_session_idx').on(t.sessionId), index('quizzes_group_idx').on(t.groupId)],
);

export const quizAttempts = pgTable(
  'quiz_attempts',
  {
    id: primaryId(),
    studentId: idRef('student_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    quizId: idRef('quiz_id')
      .notNull()
      .references(() => quizzes.id, { onDelete: 'cascade' }),
    courseId: idRef('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    attemptNumber: integer('attempt_number').notNull(),
    answers: jsonb('answers').$type<AttemptAnswer[]>().notNull().default([]),
    /** Percentage. */
    score: doublePrecision('score'),
    totalPoints: doublePrecision('total_points').notNull().default(0),
    earnedPoints: doublePrecision('earned_points').notNull().default(0),
    passed: boolean('passed').notNull().default(false),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    submittedAt: timestamp('submitted_at', { withTimezone: true }),
    /** Seconds. */
    timeSpent: integer('time_spent').notNull().default(0),
    status: attemptStatus('status').notNull().default('in_progress'),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex('quiz_attempts_student_quiz_number_unique').on(t.studentId, t.quizId, t.attemptNumber),
    index('quiz_attempts_student_course_idx').on(t.studentId, t.courseId),
    index('quiz_attempts_quiz_status_idx').on(t.quizId, t.status),
  ],
);

export type QuizRow = typeof quizzes.$inferSelect;
export type NewQuizRow = typeof quizzes.$inferInsert;
export type QuizAttemptRow = typeof quizAttempts.$inferSelect;
