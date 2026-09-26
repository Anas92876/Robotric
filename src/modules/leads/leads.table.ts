import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';
import { idRef, primaryId } from '../../shared/db/ids';
import { courses } from '../courses/courses.table';
import { users } from '../users/users.table';

export const LEAD_STATUSES = ['interest', 'waiting', 'student', 'blacklist'] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];
export const DEPOSIT_METHODS = ['cash', 'sham_cash_app', 'other'] as const;

export const leadStatus = pgEnum('lead_status', LEAD_STATUSES);
export const genderEnum = pgEnum('gender', ['male', 'female', 'other']);
export const depositMethod = pgEnum('deposit_method', DEPOSIT_METHODS);

/** Small contact lists shown with the lead; never queried on their own. `_id` kept for the clients. */
export interface PhoneEntry {
  _id: string;
  number: string;
  label: string;
}
export interface SocialEntry {
  _id: string;
  platform: string;
  handle: string;
}

export const leads = pgTable(
  'leads',
  {
    id: primaryId(),
    fullName: varchar('full_name', { length: 200 }).notNull(),
    englishName: varchar('english_name', { length: 200 }),
    firstName: varchar('first_name', { length: 100 }),
    lastName: varchar('last_name', { length: 100 }),
    gender: genderEnum('gender'),
    fatherName: varchar('father_name', { length: 100 }),
    motherName: varchar('mother_name', { length: 100 }),
    dateOfBirth: timestamp('date_of_birth', { withTimezone: true }),
    age: integer('age'),
    residence: varchar('residence', { length: 200 }),
    schoolName: varchar('school_name', { length: 200 }),
    mobileNumber: varchar('mobile_number', { length: 50 }).notNull(),
    mobileNumberLabel: varchar('mobile_number_label', { length: 50 }).notNull().default('Main'),
    additionalNumbers: jsonb('additional_numbers').$type<PhoneEntry[]>().notNull().default([]),
    socialMedia: jsonb('social_media').$type<SocialEntry[]>().notNull().default([]),
    assignedToId: idRef('assigned_to_id').references(() => users.id, { onDelete: 'set null' }),
    interestField: varchar('interest_field', { length: 200 }),
    referralSource: varchar('referral_source', { length: 200 }),
    notes: text('notes'),
    /** When the lead was acquired; editable by reception. */
    leadDate: timestamp('lead_date', { withTimezone: true }).defaultNow(),
    status: leadStatus('status').notNull().default('interest'),

    // Waiting list (set when status becomes 'waiting')
    waitingCourseId: idRef('waiting_course_id').references(() => courses.id, { onDelete: 'set null' }),
    depositAmount: doublePrecision('deposit_amount').notNull().default(0),
    depositPaidAt: timestamp('deposit_paid_at', { withTimezone: true }),
    depositMethod: depositMethod('deposit_method').notNull().default('cash'),
    depositNotes: text('deposit_notes').notNull().default(''),

    isBannedFromPlatform: boolean('is_banned_from_platform').notNull().default(false),
    blacklistReason: text('blacklist_reason'),
    nextFollowUpDate: timestamp('next_follow_up_date', { withTimezone: true }),
    convertedToStudentId: idRef('converted_to_student_id').references(() => users.id, { onDelete: 'set null' }),
    convertedAt: timestamp('converted_at', { withTimezone: true }),
    createdById: idRef('created_by_id').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index('leads_mobile_idx').on(t.mobileNumber),
    index('leads_status_idx').on(t.status),
    index('leads_created_at_idx').on(t.createdAt),
    index('leads_assigned_to_idx').on(t.assignedToId),
    index('leads_next_follow_up_idx').on(t.nextFollowUpDate),
    index('leads_waiting_course_idx').on(t.waitingCourseId),
  ],
);

/** Follow-up notes: an append-only log per lead. */
export const leadFollowUps = pgTable(
  'lead_follow_ups',
  {
    id: primaryId(),
    leadId: idRef('lead_id')
      .notNull()
      .references(() => leads.id, { onDelete: 'cascade' }),
    note: text('note').notNull(),
    date: timestamp('date', { withTimezone: true }).notNull().defaultNow(),
    byId: idRef('by_id').references(() => users.id, { onDelete: 'set null' }),
  },
  (t) => [index('lead_follow_ups_lead_idx').on(t.leadId, t.date)],
);

/** Every status change with its reason: an append-only log per lead. */
export const leadStatusChanges = pgTable(
  'lead_status_changes',
  {
    id: primaryId(),
    leadId: idRef('lead_id')
      .notNull()
      .references(() => leads.id, { onDelete: 'cascade' }),
    fromStatus: leadStatus('from_status'),
    toStatus: leadStatus('to_status').notNull(),
    reason: text('reason').notNull(),
    changedById: idRef('changed_by_id').references(() => users.id, { onDelete: 'set null' }),
    changedAt: timestamp('changed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('lead_status_changes_lead_idx').on(t.leadId, t.changedAt)],
);

export type LeadRow = typeof leads.$inferSelect;
export type NewLeadRow = typeof leads.$inferInsert;
export type LeadFollowUpRow = typeof leadFollowUps.$inferSelect;
export type LeadStatusChangeRow = typeof leadStatusChanges.$inferSelect;
