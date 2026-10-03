import { boolean, doublePrecision, index, jsonb, pgEnum, pgTable, primaryKey, text, timestamp, uniqueIndex, varchar } from 'drizzle-orm/pg-core';
import { idRef, primaryId } from '../../shared/db/ids';
import { timestamps } from '../../shared/db/columns';
import { courses } from '../courses/courses.table';
import { groups } from '../groups/groups.table';
import { sessions } from '../sessions/sessions.table';
import { users } from '../users/users.table';

export const taskStatus = pgEnum('task_status', ['draft', 'open', 'closed']);
export const taskSubmissionStatus = pgEnum('task_submission_status', ['not_submitted', 'pending_review', 'graded', 'returned']);
export type TaskStatus = 'draft' | 'open' | 'closed';

export interface TaskQuestion {
  _id: string;
  questionText: string;
  questionTextAr?: string;
  answerType: 'mcq' | 'image' | 'text';
  type?: 'single_choice' | 'multiple_choice';
  options: string[];
  correctAnswers: number[];
  points: number;
  order: number;
  required: boolean;
  maxLength?: number;
  maxImages: number;
  allowedImageTypes: string[];
  maxImageSize?: number;
}

/** A student's answer. Image answers keep the old field names; the "cloudinary" ones now hold private storage details. */
export interface TaskAnswer {
  questionId: string;
  answerType: 'mcq' | 'image' | 'text';
  selectedAnswers?: number[];
  textAnswer?: string;
  imageAnswers?: { storagePath: string; filename: string; size: number; mimeType: string }[];
}
export interface AttachedFile {
  _id: string;
  filename: string;
  originalName: string;
  size: number;
  mimeType: string;
  storagePath: string;
  storageBucket: string;
}

/**
 * Homework for one or more groups. `groupId`/`courseId`/`sessionId` are the
 * primary target (what trainer tasks always had); all targets are in the
 * task_groups / task_sessions link tables.
 */
export const tasks = pgTable(
  'tasks',
  {
    id: primaryId(),
    groupId: idRef('group_id')
      .notNull()
      .references(() => groups.id, { onDelete: 'cascade' }),
    courseId: idRef('course_id').references(() => courses.id, { onDelete: 'set null' }),
    sessionId: idRef('session_id').references(() => sessions.id, { onDelete: 'set null' }),
    createdById: idRef('created_by_id').references(() => users.id, { onDelete: 'set null' }),
    title: varchar('title', { length: 200 }).notNull(),
    titleAr: varchar('title_ar', { length: 200 }),
    description: varchar('description', { length: 5000 }).notNull(),
    descriptionAr: varchar('description_ar', { length: 5000 }),
    deadline: timestamp('deadline', { withTimezone: true }).notNull(),
    maxScore: doublePrecision('max_score').notNull().default(100),
    hasQuestions: boolean('has_questions').notNull().default(false),
    questions: jsonb('questions').$type<TaskQuestion[]>().notNull().default([]),
    allowLateSubmission: boolean('allow_late_submission').notNull().default(false),
    status: taskStatus('status').notNull().default('open'),
    ...timestamps(),
  },
  (t) => [index('tasks_group_status_idx').on(t.groupId, t.status), index('tasks_deadline_idx').on(t.deadline), index('tasks_creator_idx').on(t.createdById)],
);

export const taskGroups = pgTable(
  'task_groups',
  {
    taskId: idRef('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    groupId: idRef('group_id')
      .notNull()
      .references(() => groups.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.taskId, t.groupId] }), index('task_groups_group_idx').on(t.groupId)],
);

export const taskSessions = pgTable(
  'task_sessions',
  {
    taskId: idRef('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    sessionId: idRef('session_id')
      .notNull()
      .references(() => sessions.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.taskId, t.sessionId] }), index('task_sessions_session_idx').on(t.sessionId)],
);

export const taskSubmissions = pgTable(
  'task_submissions',
  {
    id: primaryId(),
    taskId: idRef('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    studentId: idRef('student_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    answers: jsonb('answers').$type<TaskAnswer[]>().notNull().default([]),
    attachedFiles: jsonb('attached_files').$type<AttachedFile[]>().notNull().default([]),
    submittedAt: timestamp('submitted_at', { withTimezone: true }).notNull().defaultNow(),
    isLate: boolean('is_late').notNull().default(false),
    status: taskSubmissionStatus('status').notNull().default('not_submitted'),
    score: doublePrecision('score'),
    feedback: text('feedback'),
    gradedAt: timestamp('graded_at', { withTimezone: true }),
    gradedById: idRef('graded_by_id').references(() => users.id, { onDelete: 'set null' }),
    ...timestamps(),
  },
  (t) => [uniqueIndex('task_submissions_task_student_unique').on(t.taskId, t.studentId), index('task_submissions_student_status_idx').on(t.studentId, t.status)],
);

export type TaskRow = typeof tasks.$inferSelect;
export type NewTaskRow = typeof tasks.$inferInsert;
export type TaskSubmissionRow = typeof taskSubmissions.$inferSelect;
