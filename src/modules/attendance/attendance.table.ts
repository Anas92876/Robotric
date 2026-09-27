import { index, pgEnum, pgTable, text, timestamp, uniqueIndex, varchar } from 'drizzle-orm/pg-core';
import { idRef, primaryId } from '../../shared/db/ids';
import { timestamps } from '../../shared/db/columns';
import { groups } from '../groups/groups.table';
import { sessions } from '../sessions/sessions.table';
import { users } from '../users/users.table';

export const ATTENDANCE_STATUSES = ['present', 'absent', 'late'] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];
export const SESSION_TYPES = ['lecture', 'lab', 'workshop', 'exam', 'project', 'other'] as const;

export const attendanceStatus = pgEnum('attendance_status', ATTENDANCE_STATUSES);
export const attendanceSessionType = pgEnum('attendance_session_type', SESSION_TYPES);

/**
 * The attendance sheet of one session: one per session. The session's title,
 * date and times are copied in when the sheet is taken, as before.
 */
export const attendanceSheets = pgTable(
  'attendance_sheets',
  {
    id: primaryId(),
    sessionId: idRef('session_id')
      .notNull()
      .references(() => sessions.id, { onDelete: 'cascade' }),
    groupId: idRef('group_id')
      .notNull()
      .references(() => groups.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 200 }).notNull(),
    date: timestamp('date', { withTimezone: true }).notNull(),
    startTime: varchar('start_time', { length: 5 }),
    endTime: varchar('end_time', { length: 5 }),
    type: attendanceSessionType('type').notNull().default('lecture'),
    location: text('location'),
    notes: varchar('notes', { length: 1000 }),
    ...timestamps(),
  },
  (t) => [uniqueIndex('attendance_sheets_session_unique').on(t.sessionId), index('attendance_sheets_group_date_idx').on(t.groupId, t.date)],
);

/** One student's mark on a sheet. */
export const attendanceRecords = pgTable(
  'attendance_records',
  {
    id: primaryId(),
    sheetId: idRef('sheet_id')
      .notNull()
      .references(() => attendanceSheets.id, { onDelete: 'cascade' }),
    studentId: idRef('student_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: attendanceStatus('status').notNull().default('absent'),
    markedById: idRef('marked_by_id').references(() => users.id, { onDelete: 'set null' }),
    markedAt: timestamp('marked_at', { withTimezone: true }).notNull().defaultNow(),
    notes: varchar('notes', { length: 500 }),
    checkInTime: timestamp('check_in_time', { withTimezone: true }),
  },
  (t) => [uniqueIndex('attendance_records_sheet_student_unique').on(t.sheetId, t.studentId), index('attendance_records_student_idx').on(t.studentId)],
);

export type AttendanceSheetRow = typeof attendanceSheets.$inferSelect;
export type AttendanceRecordRow = typeof attendanceRecords.$inferSelect;
