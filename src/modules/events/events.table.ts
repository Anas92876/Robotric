import { index, integer, pgEnum, pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core';
import { idRef, primaryId } from '../../shared/db/ids';
import { leads } from '../leads/leads.table';
import { users } from '../users/users.table';

export const EVENT_COLORS = ['blue', 'green', 'red', 'yellow', 'purple', 'gray'] as const;
export type EventColor = (typeof EVENT_COLORS)[number];
export const PARTICIPANT_TYPES = ['lead', 'custom', 'company'] as const;
export const COMPANY_ROLES = ['CEO', 'CLO', 'CTO'] as const;

export const eventColor = pgEnum('event_color', EVENT_COLORS);
export const participantType = pgEnum('event_participant_type', PARTICIPANT_TYPES);
export const companyRole = pgEnum('company_role', COMPANY_ROLES);

/** Reception calendar entries. */
export const events = pgTable(
  'events',
  {
    id: primaryId(),
    title: varchar('title', { length: 300 }).notNull(),
    description: text('description'),
    startTime: timestamp('start_time', { withTimezone: true }).notNull(),
    endTime: timestamp('end_time', { withTimezone: true }).notNull(),
    color: eventColor('color').notNull().default('blue'),
    createdById: idRef('created_by_id').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('events_start_time_idx').on(t.startTime)],
);

/** Who an event is with: a lead, a free-text person, or a company role. */
export const eventParticipants = pgTable(
  'event_participants',
  {
    id: primaryId(),
    eventId: idRef('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    type: participantType('type').notNull(),
    leadId: idRef('lead_id').references(() => leads.id, { onDelete: 'set null' }),
    customName: varchar('custom_name', { length: 200 }),
    customPhone: varchar('custom_phone', { length: 50 }),
    companyRole: companyRole('company_role'),
  },
  (t) => [index('event_participants_event_idx').on(t.eventId, t.position), index('event_participants_lead_idx').on(t.leadId)],
);

export type EventRow = typeof events.$inferSelect;
export type NewEventRow = typeof events.$inferInsert;
export type ParticipantInput = Omit<typeof eventParticipants.$inferInsert, 'id' | 'eventId' | 'position'>;
