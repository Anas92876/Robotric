import { index, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex, varchar } from 'drizzle-orm/pg-core';
import { idRef, primaryId } from '../../shared/db/ids';
import { timestamps } from '../../shared/db/columns';
import { users } from '../users/users.table';

export const postStatus = pgEnum('post_status', ['draft', 'published']);

/** A news / blog post for the public website. */
export const posts = pgTable(
  'posts',
  {
    id: primaryId(),
    slug: varchar('slug', { length: 300 }).notNull(),
    title: varchar('title', { length: 300 }).notNull(),
    body: text('body').notNull(),
    tags: jsonb('tags').$type<string[]>().notNull().default([]),
    authorId: idRef('author_id').references(() => users.id, { onDelete: 'set null' }),
    status: postStatus('status').notNull().default('draft'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    ...timestamps(),
  },
  (t) => [uniqueIndex('posts_slug_unique').on(t.slug), index('posts_status_published_idx').on(t.status, t.publishedAt)],
);

export type PostRow = typeof posts.$inferSelect;
