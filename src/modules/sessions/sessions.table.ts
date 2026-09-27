import { type AnyPgColumn, boolean, index, integer, jsonb, pgEnum, pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core';
import { idRef, primaryId } from '../../shared/db/ids';
import { timestamps } from '../../shared/db/columns';
import { courses } from '../courses/courses.table';
import { groups } from '../groups/groups.table';
import { users } from '../users/users.table';

export const SESSION_STATUSES = ['scheduled', 'in_progress', 'completed', 'cancelled', 'rescheduled'] as const;
export type SessionStatus = (typeof SESSION_STATUSES)[number];
export const sessionStatus = pgEnum('session_status', SESSION_STATUSES);

/** The trainer's plan for one session. Always read and written as a whole, so it is stored as JSON. */
export interface LessonPlan {
  objectives: string[];
  outline: { _id: string; startTime: string; endTime: string; duration: number; title: string; description?: string; activities: string[] }[];
  materialsNeeded: string[];
  attachments: { _id: string; filename: string; originalName: string; url: string; fileType: string; fileSize: number; uploadedAt: string }[];
  notes?: string;
}

export interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'none';
  interval: number;
  endDate: string | null;
  occurrences: number | null;
}

export const EMPTY_LESSON_PLAN: LessonPlan = { objectives: [], outline: [], materialsNeeded: [], attachments: [] };

export const sessions = pgTable(
  'sessions',
  {
    id: primaryId(),
    groupId: idRef('group_id')
      .notNull()
      .references(() => groups.id, { onDelete: 'cascade' }),
    courseId: idRef('course_id').references(() => courses.id, { onDelete: 'set null' }),
    trainerId: idRef('trainer_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    title: varchar('title', { length: 200 }).notNull(),
    description: text('description'),
    sessionNumber: integer('session_number'),
    overrideSchedule: boolean('override_schedule').notNull().default(false),
    /** Calendar day (midnight, local time); the times of day are in startTime / endTime. */
    scheduledDate: timestamp('scheduled_date', { withTimezone: true }),
    startTime: varchar('start_time', { length: 5 }),
    endTime: varchar('end_time', { length: 5 }),
    /** Minutes. */
    duration: integer('duration').notNull(),
    isOnline: boolean('is_online').notNull().default(false),
    meetingLink: text('meeting_link'),
    status: sessionStatus('status').notNull().default('scheduled'),
    cancellationReason: varchar('cancellation_reason', { length: 500 }),
    lessonPlan: jsonb('lesson_plan').$type<LessonPlan>().notNull().default(EMPTY_LESSON_PLAN),
    videoHas: boolean('video_has').notNull().default(false),
    videoYoutubeId: varchar('video_youtube_id', { length: 50 }).notNull().default(''),
    /** Set by the session-evaluation feature (phase 5d). */
    evaluationId: idRef('evaluation_id'),
    actualStartTime: timestamp('actual_start_time', { withTimezone: true }),
    actualEndTime: timestamp('actual_end_time', { withTimezone: true }),
    isRecurring: boolean('is_recurring').notNull().default(false),
    recurrenceRule: jsonb('recurrence_rule').$type<RecurrenceRule>().notNull().default({ frequency: 'none', interval: 1, endDate: null, occurrences: null }),
    parentSessionId: idRef('parent_session_id').references((): AnyPgColumn => sessions.id, { onDelete: 'set null' }),
    ...timestamps(),
  },
  (t) => [
    index('sessions_trainer_date_idx').on(t.trainerId, t.scheduledDate),
    index('sessions_group_date_idx').on(t.groupId, t.scheduledDate),
    index('sessions_course_idx').on(t.courseId),
    index('sessions_status_date_idx').on(t.status, t.scheduledDate),
  ],
);

export type SessionRow = typeof sessions.$inferSelect;
export type NewSessionRow = typeof sessions.$inferInsert;
