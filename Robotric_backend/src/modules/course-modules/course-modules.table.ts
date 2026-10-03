import { type AnyPgColumn, boolean, index, integer, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex, varchar } from 'drizzle-orm/pg-core';
import { idRef, primaryId } from '../../shared/db/ids';
import { timestamps } from '../../shared/db/columns';
import { courses } from '../courses/courses.table';
import { users } from '../users/users.table';

export const MODULE_TYPES = ['video', 'pdf', 'text', 'quiz', 'assignment', 'live_session'] as const;
export const moduleType = pgEnum('module_type', MODULE_TYPES);
export const moduleProgressStatus = pgEnum('module_progress_status', ['not_started', 'in_progress', 'completed']);

export interface ModuleContent {
  videoUrl: string | null;
  videoDuration: number | null;
  pdfUrl: string | null;
  textContent: string | null;
  duration: number | null;
}
export interface ModuleResource {
  _id: string;
  title?: string;
  url?: string;
  type?: 'link' | 'file' | 'document';
}
/** Details of a face-to-face (live_session) module. */
export interface ModuleLiveSession {
  date: string | null;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  instructorNotes: string | null;
  attendanceRecord: string | null;
}

export const EMPTY_CONTENT: ModuleContent = { videoUrl: null, videoDuration: null, pdfUrl: null, textContent: null, duration: null };
export const EMPTY_LIVE_SESSION: ModuleLiveSession = { date: null, startTime: null, endTime: null, location: null, instructorNotes: null, attendanceRecord: null };

/** A step of a course's learning path (video, reading, quiz, ...), in `order`. */
export const courseModules = pgTable(
  'course_modules',
  {
    id: primaryId(),
    courseId: idRef('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 200 }).notNull(),
    description: varchar('description', { length: 1000 }),
    order: integer('order').notNull(),
    type: moduleType('type').notNull(),
    content: jsonb('content').$type<ModuleContent>().notNull().default(EMPTY_CONTENT),
    resources: jsonb('resources').$type<ModuleResource[]>().notNull().default([]),
    isLocked: boolean('is_locked').notNull().default(false),
    unlockAfterId: idRef('unlock_after_id').references((): AnyPgColumn => courseModules.id, { onDelete: 'set null' }),
    quizId: idRef('quiz_id'),
    assignmentId: idRef('assignment_id'),
    isActive: boolean('is_active').notNull().default(true),
    liveSession: jsonb('live_session').$type<ModuleLiveSession>().notNull().default(EMPTY_LIVE_SESSION),
    ...timestamps(),
  },
  (t) => [index('course_modules_course_order_idx').on(t.courseId, t.order), index('course_modules_course_type_idx').on(t.courseId, t.type)],
);

/** A student's progress through one module. */
export const moduleProgress = pgTable(
  'module_progress',
  {
    id: primaryId(),
    studentId: idRef('student_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    moduleId: idRef('module_id')
      .notNull()
      .references(() => courseModules.id, { onDelete: 'cascade' }),
    courseId: idRef('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    status: moduleProgressStatus('status').notNull().default('not_started'),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    /** Seconds. */
    timeSpent: integer('time_spent').notNull().default(0),
    lastAccessedAt: timestamp('last_accessed_at', { withTimezone: true }).notNull().defaultNow(),
    videoProgress: jsonb('video_progress').$type<{ currentTime: number; duration: number; completed: boolean }>().notNull().default({ currentTime: 0, duration: 0, completed: false }),
    notes: text('notes'),
    ...timestamps(),
  },
  (t) => [uniqueIndex('module_progress_student_module_unique').on(t.studentId, t.moduleId), index('module_progress_student_course_idx').on(t.studentId, t.courseId, t.status)],
);

export type CourseModuleRow = typeof courseModules.$inferSelect;
export type NewCourseModuleRow = typeof courseModules.$inferInsert;
export type ModuleProgressRow = typeof moduleProgress.$inferSelect;
