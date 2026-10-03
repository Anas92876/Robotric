import { sql } from 'drizzle-orm';
import { boolean, index, integer, jsonb, pgEnum, pgTable, primaryKey, timestamp, uniqueIndex, varchar, type AnyPgColumn } from 'drizzle-orm/pg-core';
import { idRef, primaryId } from '../../shared/db/ids';
import { timestamps } from '../../shared/db/columns';
import { users } from '../users/users.table';

// ---- Projects (one level of sub-projects) ----

export const internalProjects = pgTable(
  'internal_projects',
  {
    id: primaryId(),
    name: varchar('name', { length: 200 }).notNull(),
    description: varchar('description', { length: 2000 }),
    /** 1 = high … 3 = low. */
    priority: integer('priority').notNull().default(3),
    createdById: idRef('created_by_id').references(() => users.id, { onDelete: 'set null' }),
    parentProjectId: idRef('parent_project_id').references((): AnyPgColumn => internalProjects.id, { onDelete: 'restrict' }),
    ...timestamps(),
  },
  (t) => [index('internal_projects_parent_idx').on(t.parentProjectId), index('internal_projects_priority_idx').on(t.priority, t.createdAt)],
);

export const projectMemberRole = pgEnum('internal_project_member_role', ['engineer', 'client']);

/** Engineers assigned to a project and client accounts linked to it. */
export const internalProjectMembers = pgTable(
  'internal_project_members',
  {
    projectId: idRef('project_id')
      .notNull()
      .references(() => internalProjects.id, { onDelete: 'cascade' }),
    userId: idRef('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: projectMemberRole('role').notNull(),
    position: integer('position').notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.projectId, t.userId, t.role] }), index('internal_project_members_user_idx').on(t.userId, t.role)],
);

// ---- Tasks ----

export const TASK_STATUSES = ['pending_review', 'todo', 'in_progress', 'done', 'declined'] as const;
export type InternalTaskStatus = (typeof TASK_STATUSES)[number];
export const internalTaskStatus = pgEnum('internal_task_status', TASK_STATUSES);
export const taskSource = pgEnum('internal_task_source', ['internal', 'client']);
export const clientUrgency = pgEnum('client_urgency', ['whenever', 'soon', 'urgent']);

/** A picture in the public images bucket; `publicId` is its storage path (it was a Cloudinary id). */
export interface TaskImage {
  publicId: string;
  name?: string;
  uploadedBy?: string;
  uploadedAt?: string;
}

/** A file a client attached to a request (private bucket). */
export interface ClientMedia {
  _id: string;
  kind: 'image' | 'video' | 'audio';
  storageBucket: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  durationSeconds?: number;
  name: string;
  uploadedAt: string;
}

export const internalTasks = pgTable(
  'internal_tasks',
  {
    id: primaryId(),
    projectId: idRef('project_id')
      .notNull()
      .references(() => internalProjects.id, { onDelete: 'restrict' }),
    subProjectId: idRef('sub_project_id').references(() => internalProjects.id, { onDelete: 'restrict' }),
    title: varchar('title', { length: 300 }).notNull(),
    description: varchar('description', { length: 5000 }),
    priority: integer('priority').notNull().default(3),
    status: internalTaskStatus('status').notNull().default('todo'),
    createdById: idRef('created_by_id').references(() => users.id, { onDelete: 'set null' }),
    dueDate: timestamp('due_date', { withTimezone: true }),
    hardDeadline: timestamp('hard_deadline', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    attachments: jsonb('attachments').$type<TaskImage[]>().notNull().default([]),
    submissionImages: jsonb('submission_images').$type<TaskImage[]>().notNull().default([]),
    submissionLinks: jsonb('submission_links').$type<string[]>().notNull().default([]),
    submissionNote: varchar('submission_note', { length: 1000 }).notNull().default(''),
    source: taskSource('source').notNull().default('internal'),
    clientId: idRef('client_id').references(() => users.id, { onDelete: 'set null' }),
    clientUrgency: clientUrgency('client_urgency'),
    rejectedReason: varchar('rejected_reason', { length: 1000 }).notNull().default(''),
    clientMedia: jsonb('client_media').$type<ClientMedia[]>().notNull().default([]),
    ...timestamps(),
  },
  (t) => [
    index('internal_tasks_project_idx').on(t.projectId, t.priority, t.status),
    index('internal_tasks_subproject_idx').on(t.subProjectId, t.priority, t.status),
    index('internal_tasks_status_idx').on(t.status),
  ],
);

export const internalTaskAssignees = pgTable(
  'internal_task_assignees',
  {
    taskId: idRef('task_id')
      .notNull()
      .references(() => internalTasks.id, { onDelete: 'cascade' }),
    userId: idRef('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    position: integer('position').notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.taskId, t.userId] }), index('internal_task_assignees_user_idx').on(t.userId)],
);

export const subTasks = pgTable(
  'sub_tasks',
  {
    id: primaryId(),
    taskId: idRef('task_id')
      .notNull()
      .references(() => internalTasks.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 500 }).notNull(),
    note: varchar('note', { length: 2000 }),
    isDone: boolean('is_done').notNull().default(false),
    createdById: idRef('created_by_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    ...timestamps(),
  },
  (t) => [index('sub_tasks_task_idx').on(t.taskId, t.createdAt)],
);

export const extensionStatus = pgEnum('time_extension_status', ['pending', 'approved', 'rejected']);

/** An engineer asking for a later due date. */
export const timeExtensionRequests = pgTable(
  'time_extension_requests',
  {
    id: primaryId(),
    taskId: idRef('task_id')
      .notNull()
      .references(() => internalTasks.id, { onDelete: 'cascade' }),
    requestedById: idRef('requested_by_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    reason: varchar('reason', { length: 1000 }).notNull(),
    proposedDate: timestamp('proposed_date', { withTimezone: true }).notNull(),
    status: extensionStatus('status').notNull().default('pending'),
    reviewedById: idRef('reviewed_by_id').references(() => users.id, { onDelete: 'set null' }),
    reviewNote: varchar('review_note', { length: 500 }).notNull().default(''),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    ...timestamps(),
  },
  (t) => [index('time_extension_requests_task_idx').on(t.taskId, t.status)],
);

// ---- Hours worked ----

export const workSessions = pgTable(
  'work_sessions',
  {
    id: primaryId(),
    userId: idRef('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    clockIn: timestamp('clock_in', { withTimezone: true }).notNull(),
    clockOut: timestamp('clock_out', { withTimezone: true }),
    durationMinutes: integer('duration_minutes').notNull().default(0),
    autoClosed: boolean('auto_closed').notNull().default(false),
    editedById: idRef('edited_by_id').references(() => users.id, { onDelete: 'set null' }),
    ...timestamps(),
  },
  (t) => [
    index('work_sessions_user_idx').on(t.userId, t.clockIn),
    // Someone can only be clocked in once at a time.
    uniqueIndex('work_sessions_one_open_per_user').on(t.userId).where(sql`${t.clockOut} is null`),
  ],
);

/** A CTO's manual pick for employee of the month. */
export const employeeOfMonth = pgTable(
  'employee_of_month',
  {
    year: integer('year').notNull(),
    month: integer('month').notNull(),
    userId: idRef('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.year, t.month] })],
);

export type InternalProjectRow = typeof internalProjects.$inferSelect;
export type InternalTaskRow = typeof internalTasks.$inferSelect;
export type SubTaskRow = typeof subTasks.$inferSelect;
export type ExtensionRow = typeof timeExtensionRequests.$inferSelect;
export type WorkSessionRow = typeof workSessions.$inferSelect;
