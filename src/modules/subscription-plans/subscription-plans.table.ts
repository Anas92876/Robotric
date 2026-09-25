import { boolean, doublePrecision, index, integer, pgTable, uniqueIndex, varchar } from 'drizzle-orm/pg-core';
import { primaryId } from '../../shared/db/ids';
import { timestamps } from '../../shared/db/columns';

export const subscriptionPlans = pgTable(
  'subscription_plans',
  {
    id: primaryId(),
    name: varchar('name', { length: 100 }).notNull(),
    monthlyHours: integer('monthly_hours').notNull().default(20),
    price: doublePrecision('price').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    description: varchar('description', { length: 500 }),
    ...timestamps(),
  },
  (t) => [uniqueIndex('subscription_plans_name_unique').on(t.name), index('subscription_plans_active_idx').on(t.isActive, t.createdAt)],
);

export type SubscriptionPlanRow = typeof subscriptionPlans.$inferSelect;
export type NewSubscriptionPlanRow = typeof subscriptionPlans.$inferInsert;
