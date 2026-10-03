import { boolean, index, integer, pgEnum, pgTable, primaryKey, timestamp, varchar } from 'drizzle-orm/pg-core';
import { idRef, primaryId } from '../../shared/db/ids';
import { timestamps } from '../../shared/db/columns';
import { groups } from '../groups/groups.table';
import { users } from '../users/users.table';

/** A note on a group's board (trainer or student). */
export const boardNotes = pgTable(
  'board_notes',
  {
    id: primaryId(),
    groupId: idRef('group_id')
      .notNull()
      .references(() => groups.id, { onDelete: 'cascade' }),
    authorId: idRef('author_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    content: varchar('content', { length: 2000 }).notNull(),
    isPinned: boolean('is_pinned').notNull().default(false),
    ...timestamps(),
  },
  (t) => [index('board_notes_group_idx').on(t.groupId, t.createdAt)],
);

export const BOARD_TASK_STATUSES = ['todo', 'in_progress', 'done'] as const;
export const boardTaskStatus = pgEnum('board_task_status', BOARD_TASK_STATUSES);

/** A to-do on a group's board, created by the trainer and moved along by assignees. */
export const boardTasks = pgTable(
  'board_tasks',
  {
    id: primaryId(),
    groupId: idRef('group_id')
      .notNull()
      .references(() => groups.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 300 }).notNull(),
    description: varchar('description', { length: 2000 }),
    /** 1 = high … 3 = low. */
    priority: integer('priority').notNull().default(3),
    status: boardTaskStatus('status').notNull().default('todo'),
    createdById: idRef('created_by_id').references(() => users.id, { onDelete: 'set null' }),
    dueDate: timestamp('due_date', { withTimezone: true }),
    ...timestamps(),
  },
  (t) => [index('board_tasks_group_idx').on(t.groupId, t.priority, t.status)],
);

export const boardTaskAssignees = pgTable(
  'board_task_assignees',
  {
    taskId: idRef('task_id')
      .notNull()
      .references(() => boardTasks.id, { onDelete: 'cascade' }),
    userId: idRef('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    position: integer('position').notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.taskId, t.userId] }), index('board_task_assignees_user_idx').on(t.userId)],
);

export type BoardNoteRow = typeof boardNotes.$inferSelect;
export type BoardTaskRow = typeof boardTasks.$inferSelect;
