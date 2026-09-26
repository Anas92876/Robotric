import { index, integer, pgEnum, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { idRef, primaryId } from '../../shared/db/ids';
import { events } from '../events/events.table';
import { leads } from '../leads/leads.table';
import { users } from '../users/users.table';

export const CONTACT_TYPES = ['call', 'meeting', 'email', 'other'] as const;
export const CONTACT_OUTCOMES = ['successful', 'no_answer', 'callback_requested', 'not_interested', 'converted', 'other'] as const;
export type ContactType = (typeof CONTACT_TYPES)[number];
export type ContactOutcome = (typeof CONTACT_OUTCOMES)[number];

export const contactType = pgEnum('contact_type', CONTACT_TYPES);
export const contactOutcome = pgEnum('contact_outcome', CONTACT_OUTCOMES);

/** Every interaction with a lead. Each one owns the calendar event created for it. */
export const contactHistory = pgTable(
  'contact_history',
  {
    id: primaryId(),
    leadId: idRef('lead_id')
      .notNull()
      .references(() => leads.id, { onDelete: 'cascade' }),
    contactType: contactType('contact_type').notNull(),
    callReason: text('call_reason').notNull(),
    outcome: contactOutcome('outcome').notNull(),
    notes: text('notes'),
    contactDate: timestamp('contact_date', { withTimezone: true }).notNull(),
    duration: integer('duration').notNull().default(30),
    scheduledEventId: idRef('scheduled_event_id').references(() => events.id, { onDelete: 'set null' }),
    nextFollowUpDate: timestamp('next_follow_up_date', { withTimezone: true }),
    createdById: idRef('created_by_id').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index('contact_history_lead_date_idx').on(t.leadId, t.contactDate),
    index('contact_history_creator_date_idx').on(t.createdById, t.contactDate),
    index('contact_history_outcome_idx').on(t.outcome),
    index('contact_history_type_idx').on(t.contactType),
  ],
);

export type ContactHistoryRow = typeof contactHistory.$inferSelect;
export type NewContactHistoryRow = typeof contactHistory.$inferInsert;
