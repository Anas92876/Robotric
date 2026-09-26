import { doublePrecision, index, integer, pgEnum, pgTable, text, timestamp, uniqueIndex, varchar } from 'drizzle-orm/pg-core';
import { idRef, primaryId } from '../../shared/db/ids';
import { timestamps } from '../../shared/db/columns';
import { courses } from '../courses/courses.table';
import { enrollments, paymentMethod } from '../enrollments/enrollments.table';
import { users } from '../users/users.table';

export const receiptType = pgEnum('receipt_type', ['course', 'transportation']);
export const paymentCurrency = pgEnum('payment_currency', ['usd', 'sp']);

/**
 * A record of money received. The PDF is not stored: it is rendered from
 * these fields each time it is downloaded (the old API regenerated it on
 * every download anyway), so receipts need no file storage.
 */
export const receipts = pgTable(
  'receipts',
  {
    id: primaryId(),
    /** REC-YYYY-NNNN */
    receiptNumber: varchar('receipt_number', { length: 30 }).notNull(),
    enrollmentId: idRef('enrollment_id')
      .notNull()
      .references(() => enrollments.id, { onDelete: 'cascade' }),
    studentId: idRef('student_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    courseId: idRef('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'restrict' }),
    type: receiptType('type').notNull().default('course'),
    amount: doublePrecision('amount').notNull(),
    method: paymentMethod('method').notNull().default('cash'),
    paymentDate: timestamp('payment_date', { withTimezone: true }).notNull().defaultNow(),
    notes: text('notes').notNull().default(''),
    paymentCurrency: paymentCurrency('payment_currency').notNull().default('usd'),
    paidInSP: doublePrecision('paid_in_sp'),
    billingTotal: doublePrecision('billing_total').notNull(),
    billingPaidBefore: doublePrecision('billing_paid_before').notNull(),
    billingPaidNow: doublePrecision('billing_paid_now').notNull(),
    billingRemaining: doublePrecision('billing_remaining').notNull(),
    issuedById: idRef('issued_by_id').references(() => users.id, { onDelete: 'set null' }),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex('receipts_number_unique').on(t.receiptNumber),
    index('receipts_enrollment_idx').on(t.enrollmentId, t.createdAt),
    index('receipts_student_idx').on(t.studentId, t.createdAt),
  ],
);

/** Per-year receipt sequence; incremented atomically so two receipts never share a number. */
export const receiptCounters = pgTable('receipt_counters', {
  year: integer('year').primaryKey(),
  last: integer('last').notNull(),
});

export type ReceiptRow = typeof receipts.$inferSelect;
export type NewReceiptRow = typeof receipts.$inferInsert;
