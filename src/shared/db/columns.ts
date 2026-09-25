import { timestamp } from 'drizzle-orm/pg-core';

/** `created_at` / `updated_at`, matching Mongoose's `timestamps: true`. */
export const timestamps = () => ({
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});
