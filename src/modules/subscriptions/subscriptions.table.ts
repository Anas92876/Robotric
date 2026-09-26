import { boolean, doublePrecision, index, pgEnum, pgTable, text, timestamp, uniqueIndex, varchar } from 'drizzle-orm/pg-core';
import { idRef, primaryId } from '../../shared/db/ids';
import { timestamps } from '../../shared/db/columns';
import { subscriptionPlans } from '../subscription-plans/subscription-plans.table';
import { users } from '../users/users.table';

export const SESSION_REQUEST_STATUSES = ['pending', 'approved', 'declined', 'canceled', 'completed', 'no_show'] as const;
export type SessionRequestStatus = (typeof SESSION_REQUEST_STATUSES)[number];

export const userSubscriptionStatus = pgEnum('user_subscription_status', ['active', 'expired', 'canceled']);
export const sessionRequestStatus = pgEnum('session_request_status', SESSION_REQUEST_STATUSES);

/** A student's hour package: which plan, for which dates, and how many hours are left. */
export const userSubscriptions = pgTable(
  'user_subscriptions',
  {
    id: primaryId(),
    userId: idRef('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    planId: idRef('plan_id')
      .notNull()
      .references(() => subscriptionPlans.id, { onDelete: 'restrict' }),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull().defaultNow(),
    endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
    remainingHours: doublePrecision('remaining_hours').notNull().default(0),
    status: userSubscriptionStatus('status').notNull().default('active'),
    canceledAt: timestamp('canceled_at', { withTimezone: true }),
    canceledById: idRef('canceled_by_id').references(() => users.id, { onDelete: 'set null' }),
    ...timestamps(),
  },
  (t) => [index('user_subscriptions_user_status_idx').on(t.userId, t.status, t.endsAt), index('user_subscriptions_plan_idx').on(t.planId, t.status)],
);

/** A student's request for a private 1-to-1 session, paid for from their hours. */
export const sessionRequests = pgTable(
  'session_requests',
  {
    id: primaryId(),
    userId: idRef('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    subscriptionId: idRef('subscription_id')
      .notNull()
      .references(() => userSubscriptions.id, { onDelete: 'cascade' }),
    date: timestamp('date', { withTimezone: true }).notNull(),
    /** HH:mm */
    startTime: varchar('start_time', { length: 5 }).notNull(),
    durationHours: doublePrecision('duration_hours').notNull(),
    description: varchar('description', { length: 1000 }),
    status: sessionRequestStatus('status').notNull().default('pending'),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    approvedById: idRef('approved_by_id').references(() => users.id, { onDelete: 'set null' }),
    declinedAt: timestamp('declined_at', { withTimezone: true }),
    declinedById: idRef('declined_by_id').references(() => users.id, { onDelete: 'set null' }),
    declineReason: varchar('decline_reason', { length: 500 }),
    canceledAt: timestamp('canceled_at', { withTimezone: true }),
    canceledById: idRef('canceled_by_id').references(() => users.id, { onDelete: 'set null' }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    ...timestamps(),
  },
  (t) => [
    index('session_requests_user_status_idx').on(t.userId, t.status, t.createdAt),
    index('session_requests_user_date_idx').on(t.userId, t.date, t.status),
    index('session_requests_date_status_idx').on(t.date, t.status),
  ],
);

/** Reception's report after a private session; exactly one per request. */
export const sessionReports = pgTable(
  'session_reports',
  {
    id: primaryId(),
    sessionRequestId: idRef('session_request_id')
      .notNull()
      .references(() => sessionRequests.id, { onDelete: 'cascade' }),
    createdById: idRef('created_by_id').references(() => users.id, { onDelete: 'set null' }),
    notes: text('notes').notNull(),
    /** Storage path of the optional PDF (private bucket); served as a signed link. */
    pdfPath: text('pdf_path'),
    attendance: boolean('attendance').notNull(),
    ...timestamps(),
  },
  (t) => [uniqueIndex('session_reports_request_unique').on(t.sessionRequestId), index('session_reports_creator_idx').on(t.createdById, t.createdAt)],
);

export type UserSubscriptionRow = typeof userSubscriptions.$inferSelect;
export type SessionRequestRow = typeof sessionRequests.$inferSelect;
export type SessionReportRow = typeof sessionReports.$inferSelect;
