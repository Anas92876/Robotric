import {
  type AnyPgColumn,
  boolean,
  doublePrecision,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';
import { idRef, primaryId } from '../../shared/db/ids';
import { timestamps } from '../../shared/db/columns';
import { courses } from '../courses/courses.table';
import { users } from '../users/users.table';

export const ENROLLMENT_STATUSES = ['active', 'inactive'] as const;
export const HISTORY_STATUSES = ['active', 'inactive', 'completed', 'dropped', 'suspended'] as const;
export const INSTALLMENT_STATUSES = ['pending', 'paid', 'overdue'] as const;
export const PAYMENT_METHODS = ['cash', 'card', 'bank_transfer', 'online', 'sham_cash_app', 'check', 'other'] as const;
export type EnrollmentStatus = (typeof ENROLLMENT_STATUSES)[number];
export type InstallmentKind = 'course' | 'transportation';
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const enrollmentStatus = pgEnum('enrollment_status', ENROLLMENT_STATUSES);
export const enrollmentHistoryStatus = pgEnum('enrollment_history_status', HISTORY_STATUSES);
export const enrollmentSource = pgEnum('enrollment_source', ['direct', 'bundle']);
export const installmentKind = pgEnum('installment_kind', ['course', 'transportation']);
export const installmentStatus = pgEnum('installment_status', INSTALLMENT_STATUSES);
export const paymentMethod = pgEnum('payment_method', PAYMENT_METHODS);
export const paymentStatus = pgEnum('payment_status', ['pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled']);

/**
 * A student's place in a course, with what they owe. One per student per course.
 * Remaining amounts are not stored: they are always `total - paid`, so they can
 * never drift out of sync the way the old separately-stored field could.
 */
export const enrollments = pgTable(
  'enrollments',
  {
    id: primaryId(),
    studentId: idRef('student_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    courseId: idRef('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'restrict' }),
    enrolledAt: timestamp('enrolled_at', { withTimezone: true }).notNull().defaultNow(),
    status: enrollmentStatus('status').notNull().default('active'),

    // Learning progress (maintained by the modules feature, phase 5)
    completedModuleIds: text('completed_module_ids').array().notNull().default([]),
    currentModuleId: idRef('current_module_id'),
    percentageComplete: integer('percentage_complete').notNull().default(0),
    lastAccessedAt: timestamp('last_accessed_at', { withTimezone: true }),

    // Course fees
    paymentTotal: doublePrecision('payment_total').notNull(),
    paymentPaid: doublePrecision('payment_paid').notNull().default(0),
    /** Percentage discount applied to the course price, 0–100. */
    discount: doublePrecision('discount').notNull().default(0),
    lastPaymentDate: timestamp('last_payment_date', { withTimezone: true }),

    // Attendance and grades (maintained by teaching features, phase 5)
    attendanceTotalSessions: integer('attendance_total_sessions').notNull().default(0),
    attendanceAttendedSessions: integer('attendance_attended_sessions').notNull().default(0),
    attendancePercentage: integer('attendance_percentage').notNull().default(0),
    quizAverage: doublePrecision('quiz_average'),
    assignmentAverage: doublePrecision('assignment_average'),
    overallGrade: doublePrecision('overall_grade'),
    completedAt: timestamp('completed_at', { withTimezone: true }),

    // Certificate (phase 5)
    certificateIssued: boolean('certificate_issued').notNull().default(false),
    certificateIssuedAt: timestamp('certificate_issued_at', { withTimezone: true }),
    certificateUrl: text('certificate_url'),
    certificateNumber: varchar('certificate_number', { length: 100 }),

    notes: varchar('notes', { length: 1000 }),
    source: enrollmentSource('source').notNull().default('direct'),
    /** For a sub-course enrollment created by a bundle enrollment: the bundle enrollment. */
    bundleEnrollmentId: idRef('bundle_enrollment_id').references((): AnyPgColumn => enrollments.id, { onDelete: 'cascade' }),

    // Transportation fees
    transportEnabled: boolean('transport_enabled').notNull().default(false),
    transportTotal: doublePrecision('transport_total').notNull().default(0),
    transportPaid: doublePrecision('transport_paid').notNull().default(0),
    // Display cache of the student's bus assignment — written only by the
    // transport feature (phase 8); never used for decisions.
    transportRouteId: idRef('transport_route_id'),
    homeLat: doublePrecision('home_lat'),
    homeLng: doublePrecision('home_lng'),
    homeAddress: text('home_address'),
    rawDistanceKm: doublePrecision('raw_distance_km'),
    roadDistanceKm: doublePrecision('road_distance_km'),
    monthlyFeeEstimate: doublePrecision('monthly_fee_estimate'),
    locationUpdatedAt: timestamp('location_updated_at', { withTimezone: true }),
    locationUpdatedById: idRef('location_updated_by_id').references(() => users.id, { onDelete: 'set null' }),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex('enrollments_student_course_unique').on(t.studentId, t.courseId),
    index('enrollments_student_status_idx').on(t.studentId, t.status),
    index('enrollments_course_status_idx').on(t.courseId, t.status),
    index('enrollments_bundle_idx').on(t.bundleEnrollmentId),
    index('enrollments_enrolled_at_idx').on(t.enrolledAt),
  ],
);

/** Planned payments for course fees or transportation, in order. */
export const enrollmentInstallments = pgTable(
  'enrollment_installments',
  {
    id: primaryId(),
    enrollmentId: idRef('enrollment_id')
      .notNull()
      .references(() => enrollments.id, { onDelete: 'cascade' }),
    kind: installmentKind('kind').notNull(),
    position: integer('position').notNull(),
    amount: doublePrecision('amount').notNull(),
    dueDate: timestamp('due_date', { withTimezone: true }).notNull(),
    paidDate: timestamp('paid_date', { withTimezone: true }),
    status: installmentStatus('status').notNull().default('pending'),
    paymentId: idRef('payment_id'),
  },
  (t) => [index('enrollment_installments_enrollment_idx').on(t.enrollmentId, t.kind, t.position)],
);

export const enrollmentStatusChanges = pgTable(
  'enrollment_status_changes',
  {
    id: primaryId(),
    enrollmentId: idRef('enrollment_id')
      .notNull()
      .references(() => enrollments.id, { onDelete: 'cascade' }),
    status: enrollmentHistoryStatus('status').notNull(),
    reason: varchar('reason', { length: 500 }),
    changedAt: timestamp('changed_at', { withTimezone: true }).notNull().defaultNow(),
    changedBy: varchar('changed_by', { length: 100 }),
  },
  (t) => [index('enrollment_status_changes_enrollment_idx').on(t.enrollmentId, t.changedAt)],
);

/** Money received outside the receipt flow (today: waiting-list deposits), kept for auditing. */
export const payments = pgTable(
  'payments',
  {
    id: primaryId(),
    studentId: idRef('student_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    enrollmentId: idRef('enrollment_id')
      .notNull()
      .references(() => enrollments.id, { onDelete: 'cascade' }),
    courseId: idRef('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'restrict' }),
    amount: doublePrecision('amount').notNull(),
    paymentMethod: paymentMethod('payment_method').notNull(),
    status: paymentStatus('status').notNull().default('pending'),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    notes: varchar('notes', { length: 1000 }),
    processedById: idRef('processed_by_id').references(() => users.id, { onDelete: 'set null' }),
    ...timestamps(),
  },
  (t) => [index('payments_enrollment_idx').on(t.enrollmentId, t.status), index('payments_student_course_idx').on(t.studentId, t.courseId)],
);

export type EnrollmentRow = typeof enrollments.$inferSelect;
export type NewEnrollmentRow = typeof enrollments.$inferInsert;
export type InstallmentRow = typeof enrollmentInstallments.$inferSelect;
export type StatusChangeRow = typeof enrollmentStatusChanges.$inferSelect;
