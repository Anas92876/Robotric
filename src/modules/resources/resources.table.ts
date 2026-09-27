import { boolean, index, integer, pgEnum, pgTable, text, timestamp, uniqueIndex, varchar } from 'drizzle-orm/pg-core';
import { idRef, primaryId } from '../../shared/db/ids';
import { timestamps } from '../../shared/db/columns';
import { courses } from '../courses/courses.table';
import { groups } from '../groups/groups.table';
import { sessions } from '../sessions/sessions.table';
import { users } from '../users/users.table';

export const resourceStatus = pgEnum('resource_status', ['active', 'archived', 'deleted']);

/** A course-level PDF uploaded by the CLO; the file lives in private storage. */
export const resources = pgTable(
  'resources',
  {
    id: primaryId(),
    title: varchar('title', { length: 200 }).notNull(),
    description: varchar('description', { length: 2000 }).notNull().default(''),
    originalName: text('original_name').notNull(),
    fileSize: integer('file_size').notNull(),
    mimeType: varchar('mime_type', { length: 100 }).notNull().default('application/pdf'),
    /** Storage path (the old `fileUrl`), not a URL. */
    storagePath: text('storage_path').notNull(),
    storageBucket: varchar('storage_bucket', { length: 100 }).notNull(),
    courseId: idRef('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    version: integer('version').notNull().default(1),
    uploadedById: idRef('uploaded_by_id').references(() => users.id, { onDelete: 'set null' }),
    status: resourceStatus('status').notNull().default('active'),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    ...timestamps(),
  },
  (t) => [index('resources_course_status_idx').on(t.courseId, t.status), index('resources_uploader_idx').on(t.uploadedById, t.createdAt)],
);

/** Which group sessions a resource is shown in. */
export const resourceAssignments = pgTable(
  'resource_assignments',
  {
    id: primaryId(),
    resourceId: idRef('resource_id')
      .notNull()
      .references(() => resources.id, { onDelete: 'cascade' }),
    groupId: idRef('group_id')
      .notNull()
      .references(() => groups.id, { onDelete: 'cascade' }),
    sessionId: idRef('session_id')
      .notNull()
      .references(() => sessions.id, { onDelete: 'cascade' }),
    assignedById: idRef('assigned_by_id').references(() => users.id, { onDelete: 'set null' }),
    assignedAt: timestamp('assigned_at', { withTimezone: true }).notNull().defaultNow(),
    isVisible: boolean('is_visible').notNull().default(true),
    availableFrom: timestamp('available_from', { withTimezone: true }),
    availableUntil: timestamp('available_until', { withTimezone: true }),
    notes: varchar('notes', { length: 500 }),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex('resource_assignments_unique').on(t.resourceId, t.groupId, t.sessionId),
    index('resource_assignments_group_session_idx').on(t.groupId, t.sessionId),
    index('resource_assignments_session_idx').on(t.sessionId, t.isVisible),
  ],
);

/**
 * One-time, IP-locked tokens for the web PDF viewer. The old backend kept them
 * in process memory, which breaks on serverless (the download request can land
 * on another instance), so they live here. Only the token's hash is stored.
 */
export const resourceViewTokens = pgTable(
  'resource_view_tokens',
  {
    tokenHash: varchar('token_hash', { length: 64 }).primaryKey(),
    userId: idRef('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    resourceId: idRef('resource_id')
      .notNull()
      .references(() => resources.id, { onDelete: 'cascade' }),
    ipAddress: varchar('ip_address', { length: 100 }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (t) => [index('resource_view_tokens_expires_idx').on(t.expiresAt)],
);

export type ResourceRow = typeof resources.$inferSelect;
export type ViewTokenRow = typeof resourceViewTokens.$inferSelect;
export type ResourceAssignmentRow = typeof resourceAssignments.$inferSelect;
