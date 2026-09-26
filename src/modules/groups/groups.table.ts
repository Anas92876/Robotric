import { boolean, doublePrecision, index, integer, jsonb, pgEnum, pgTable, primaryKey, text, timestamp, varchar } from 'drizzle-orm/pg-core';
import { idRef, primaryId } from '../../shared/db/ids';
import { timestamps } from '../../shared/db/columns';
import { courses } from '../courses/courses.table';
import { users } from '../users/users.table';

export const GROUP_STATUSES = ['active', 'completed', 'archived', 'cancelled'] as const;
export const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;
export type GroupStatus = (typeof GROUP_STATUSES)[number];

export const groupStatus = pgEnum('group_status', GROUP_STATUSES);

/** A weekly time slot. Kept with the group (always read and written together); `_id` kept for clients. */
export interface ScheduleSlot {
  _id: string;
  day: (typeof WEEK_DAYS)[number];
  startTime: string;
  endTime: string;
  location?: string | null;
}

export const groups = pgTable(
  'groups',
  {
    id: primaryId(),
    name: varchar('name', { length: 100 }).notNull(),
    description: text('description'),
    courseId: idRef('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'restrict' }),
    trainerId: idRef('trainer_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    maxStudents: integer('max_students').notNull().default(30),
    schedule: jsonb('schedule').$type<ScheduleSlot[]>().notNull().default([]),
    startDate: timestamp('start_date', { withTimezone: true }).notNull(),
    endDate: timestamp('end_date', { withTimezone: true }).notNull(),
    status: groupStatus('status').notNull().default('active'),
    boardEnabled: boolean('board_enabled').notNull().default(false),
    thumbnail: text('thumbnail'),
    color: varchar('color', { length: 7 }).notNull().default('#30c59b'),
    startingSessionNumber: integer('starting_session_number').notNull().default(1),
    // Progress and statistics are maintained by the sessions/attendance features (phase 5).
    completedSessions: integer('completed_sessions').notNull().default(0),
    totalSessions: integer('total_sessions').notNull().default(0),
    percentageComplete: integer('percentage_complete').notNull().default(0),
    averageAttendance: doublePrecision('average_attendance').notNull().default(0),
    averagePerformance: doublePrecision('average_performance').notNull().default(0),
    totalAssignments: integer('total_assignments').notNull().default(0),
    totalQuizzes: integer('total_quizzes').notNull().default(0),
    ...timestamps(),
  },
  (t) => [
    index('groups_trainer_status_idx').on(t.trainerId, t.status),
    index('groups_course_idx').on(t.courseId),
    index('groups_dates_idx').on(t.startDate, t.endDate),
  ],
);

/** Which students are in which group. Replaces the old `students: [ObjectId]` array. */
export const groupStudents = pgTable(
  'group_students',
  {
    groupId: idRef('group_id')
      .notNull()
      .references(() => groups.id, { onDelete: 'cascade' }),
    studentId: idRef('student_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    addedAt: timestamp('added_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.groupId, t.studentId] }), index('group_students_student_idx').on(t.studentId)],
);

export type GroupRow = typeof groups.$inferSelect;
export type NewGroupRow = typeof groups.$inferInsert;
