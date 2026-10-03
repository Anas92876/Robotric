import { doublePrecision, index, integer, pgEnum, pgTable, timestamp, uniqueIndex, varchar } from 'drizzle-orm/pg-core';
import { idRef, primaryId } from '../../shared/db/ids';
import { timestamps } from '../../shared/db/columns';
import { courses } from '../courses/courses.table';
import { groups } from '../groups/groups.table';
import { users } from '../users/users.table';

export const certificateGender = pgEnum('certificate_gender', ['male', 'female']);

/**
 * A course-completion certificate. The printed details are a snapshot taken at
 * issue time, so a certificate stays valid even if the course or group change
 * or are deleted.
 */
export const certificates = pgTable(
  'certificates',
  {
    id: primaryId(),
    /** CERT-YYYY-NNNNNN */
    certificateNumber: varchar('certificate_number', { length: 30 }).notNull().unique(),
    studentId: idRef('student_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    courseId: idRef('course_id').references(() => courses.id, { onDelete: 'set null' }),
    groupId: idRef('group_id').references(() => groups.id, { onDelete: 'set null' }),
    issuedById: idRef('issued_by_id').references(() => users.id, { onDelete: 'set null' }),
    issuedAt: timestamp('issued_at', { withTimezone: true }).notNull().defaultNow(),
    studentName: varchar('student_name', { length: 200 }).notNull(),
    courseName: varchar('course_name', { length: 200 }).notNull(),
    courseLevel: varchar('course_level', { length: 50 }).notNull().default(''),
    trainingHours: doublePrecision('training_hours').notNull().default(0),
    gender: certificateGender('gender').notNull().default('male'),
    ...timestamps(),
  },
  (t) => [uniqueIndex('certificates_student_group_unique').on(t.studentId, t.groupId), index('certificates_student_idx').on(t.studentId, t.issuedAt)],
);

/** Per-year sequence, bumped atomically (the old "highest number + 1" could hand out duplicates). */
export const certificateCounters = pgTable('certificate_counters', {
  year: integer('year').primaryKey(),
  last: integer('last').notNull(),
});

export type CertificateRow = typeof certificates.$inferSelect;
export type NewCertificateRow = typeof certificates.$inferInsert;
