import { index, integer, pgEnum, pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core';
import { idRef, primaryId } from '../../shared/db/ids';
import { timestamps } from '../../shared/db/columns';
import { users } from '../users/users.table';

export const JOB_STATUSES = ['new', 'reviewed', 'interview', 'accepted', 'rejected'] as const;
export const EXPERIENCE_LEVELS = ['none', 'beginner', 'intermediate', 'professional'] as const;
export const AVAILABILITY = ['full_time', 'part_time', 'flexible'] as const;

export const jobStatus = pgEnum('job_application_status', JOB_STATUSES);
export const experienceLevel = pgEnum('experience_level', EXPERIENCE_LEVELS);
export const availability = pgEnum('availability', AVAILABILITY);
export const applicantGender = pgEnum('applicant_gender', ['male', 'female']);

/** Applications submitted through the public careers form. */
export const jobApplications = pgTable(
  'job_applications',
  {
    id: primaryId(),
    position: varchar('position', { length: 200 }).notNull(),
    fullName: varchar('full_name', { length: 200 }).notNull(),
    phone: varchar('phone', { length: 50 }).notNull(),
    email: varchar('email', { length: 320 }).notNull().default(''),
    age: integer('age'),
    location: varchar('location', { length: 200 }).notNull().default(''),
    gender: applicantGender('gender'),
    experienceLevel: experienceLevel('experience_level'),
    experienceDetails: text('experience_details').notNull().default(''),
    skills: text('skills').array().notNull().default([]),
    portfolioLink: text('portfolio_link').notNull().default(''),
    availability: availability('availability'),
    whyUs: text('why_us').notNull().default(''),
    additionalInfo: text('additional_info').notNull().default(''),
    /** Storage path of the uploaded CV (private bucket), or '' if none. */
    cvUrl: text('cv_url').notNull().default(''),
    cvBucket: varchar('cv_bucket', { length: 100 }).notNull().default(''),
    status: jobStatus('status').notNull().default('new'),
    notes: text('notes').notNull().default(''),
    reviewedById: idRef('reviewed_by_id').references(() => users.id, { onDelete: 'set null' }),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    ...timestamps(),
  },
  (t) => [
    index('job_applications_status_idx').on(t.status),
    index('job_applications_position_idx').on(t.position),
    index('job_applications_created_at_idx').on(t.createdAt),
    index('job_applications_phone_idx').on(t.phone),
  ],
);

export type JobApplicationRow = typeof jobApplications.$inferSelect;
export type NewJobApplicationRow = typeof jobApplications.$inferInsert;
