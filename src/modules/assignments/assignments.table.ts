import { boolean, doublePrecision, index, integer, jsonb, pgEnum, pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core';
import { idRef, primaryId } from '../../shared/db/ids';
import { timestamps } from '../../shared/db/columns';
import { courseModules } from '../course-modules/course-modules.table';
import { courses } from '../courses/courses.table';
import { users } from '../users/users.table';

export const ASSIGNMENT_FILE_TYPES = ['pdf', 'doc', 'docx', 'txt', 'jpg', 'jpeg', 'png', 'zip', 'rar'] as const;
export const submissionStatus = pgEnum('assignment_submission_status', ['submitted', 'grading', 'graded', 'returned', 'resubmit_required']);

export interface SubmittedFile {
  _id: string;
  filename: string;
  originalName: string;
  /** Storage path (private bucket); served as a signed link. */
  storagePath: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
}
export interface SubmissionComment {
  _id: string;
  author: string;
  text: string;
  createdAt: string;
}
export interface SubmissionGrade {
  score: number | null;
  feedback?: string;
  rubricScores: { _id: string; criteriaId: string; pointsEarned: number }[];
  gradedBy?: string;
  gradedAt?: string;
}

export const assignments = pgTable(
  'assignments',
  {
    id: primaryId(),
    moduleId: idRef('module_id')
      .notNull()
      .references(() => courseModules.id, { onDelete: 'cascade' }),
    courseId: idRef('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 200 }).notNull(),
    description: varchar('description', { length: 2000 }).notNull(),
    instructions: varchar('instructions', { length: 5000 }),
    dueDate: timestamp('due_date', { withTimezone: true }).notNull(),
    maxScore: doublePrecision('max_score').notNull().default(100),
    allowedFileTypes: text('allowed_file_types').array().notNull().default([]),
    /** MB. */
    maxFileSize: integer('max_file_size').notNull().default(5),
    maxFiles: integer('max_files').notNull().default(5),
    allowLateSubmission: boolean('allow_late_submission').notNull().default(false),
    lateSubmissionDeadline: timestamp('late_submission_deadline', { withTimezone: true }),
    latePenalty: doublePrecision('late_penalty').notNull().default(0),
    resources: jsonb('resources').$type<{ _id: string; title?: string; url?: string }[]>().notNull().default([]),
    rubric: jsonb('rubric').$type<{ _id: string; criteria: string; points: number }[]>().notNull().default([]),
    isActive: boolean('is_active').notNull().default(true),
    ...timestamps(),
  },
  (t) => [index('assignments_module_idx').on(t.moduleId), index('assignments_course_idx').on(t.courseId), index('assignments_due_idx').on(t.dueDate)],
);

export const assignmentSubmissions = pgTable(
  'assignment_submissions',
  {
    id: primaryId(),
    studentId: idRef('student_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    assignmentId: idRef('assignment_id')
      .notNull()
      .references(() => assignments.id, { onDelete: 'cascade' }),
    courseId: idRef('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    files: jsonb('files').$type<SubmittedFile[]>().notNull().default([]),
    submittedAt: timestamp('submitted_at', { withTimezone: true }).notNull().defaultNow(),
    isLate: boolean('is_late').notNull().default(false),
    status: submissionStatus('status').notNull().default('submitted'),
    grade: jsonb('grade').$type<SubmissionGrade>().notNull().default({ score: null, rubricScores: [] }),
    resubmissionAllowed: boolean('resubmission_allowed').notNull().default(false),
    resubmissionCount: integer('resubmission_count').notNull().default(0),
    resubmissionDeadline: timestamp('resubmission_deadline', { withTimezone: true }),
    comments: jsonb('comments').$type<SubmissionComment[]>().notNull().default([]),
    version: integer('version').notNull().default(1),
    ...timestamps(),
  },
  (t) => [
    index('assignment_submissions_student_assignment_idx').on(t.studentId, t.assignmentId, t.version),
    index('assignment_submissions_assignment_status_idx').on(t.assignmentId, t.status),
  ],
);

export type AssignmentRow = typeof assignments.$inferSelect;
export type SubmissionRow = typeof assignmentSubmissions.$inferSelect;
