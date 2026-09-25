import { pgEnum, pgTable, text, uniqueIndex, varchar } from 'drizzle-orm/pg-core';
import { idRef, primaryId } from '../../shared/db/ids';
import { timestamps } from '../../shared/db/columns';
import { users } from '../users/users.table';

export const interestStatus = pgEnum('interest_status', ['active', 'archived']);

export const interests = pgTable(
  'interests',
  {
    id: primaryId(),
    name: varchar('name', { length: 200 }).notNull(),
    description: text('description'),
    status: interestStatus('status').notNull().default('active'),
    createdById: idRef('created_by_id').references(() => users.id, { onDelete: 'set null' }),
    ...timestamps(),
  },
  (t) => [uniqueIndex('interests_name_unique').on(t.name)],
);

export type InterestRow = typeof interests.$inferSelect;
export type NewInterestRow = typeof interests.$inferInsert;
