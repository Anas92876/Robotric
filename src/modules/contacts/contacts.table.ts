import { index, pgEnum, pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core';
import { idRef, primaryId } from '../../shared/db/ids';
import { leads } from '../leads/leads.table';

export const CONTACT_STATUSES = ['new', 'read', 'replied', 'archived'] as const;
export const CONTACT_WHO = ['student', 'parent', 'business-owner', 'other'] as const;

export const contactStatus = pgEnum('contact_status', CONTACT_STATUSES);
export const contactWho = pgEnum('contact_who', CONTACT_WHO);

/** Messages sent through the public website's contact form. */
export const contacts = pgTable(
  'contacts',
  {
    id: primaryId(),
    name: varchar('name', { length: 100 }).notNull(),
    phone: varchar('phone', { length: 50 }).notNull(),
    email: varchar('email', { length: 320 }).notNull().default(''),
    location: varchar('location', { length: 200 }).notNull().default(''),
    who: contactWho('who'),
    otherType: varchar('other_type', { length: 100 }).notNull().default(''),
    subject: varchar('subject', { length: 200 }).notNull(),
    message: text('message').notNull().default(''),
    status: contactStatus('status').notNull().default('new'),
    convertedToLeadId: idRef('converted_to_lead_id').references(() => leads.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index('contacts_status_idx').on(t.status), index('contacts_created_at_idx').on(t.createdAt), index('contacts_phone_idx').on(t.phone)],
);

export type ContactRow = typeof contacts.$inferSelect;
export type NewContactRow = typeof contacts.$inferInsert;
