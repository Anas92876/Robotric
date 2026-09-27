import { sql } from 'drizzle-orm';
import { boolean, doublePrecision, index, integer, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex, varchar } from 'drizzle-orm/pg-core';
import { idRef, primaryId } from '../../shared/db/ids';
import { timestamps } from '../../shared/db/columns';
import { enrollments } from '../enrollments/enrollments.table';
import { users } from '../users/users.table';

/** A driver's vehicle and contact details (one per driver account). */
export const driverProfiles = pgTable('driver_profiles', {
  id: primaryId(),
  userId: idRef('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  vehiclePlate: varchar('vehicle_plate', { length: 50 }),
  vehicleModel: varchar('vehicle_model', { length: 100 }),
  vehicleColor: varchar('vehicle_color', { length: 50 }),
  vehicleCapacity: integer('vehicle_capacity').notNull().default(5),
  phoneNumber: varchar('phone_number', { length: 50 }),
  photoUrl: text('photo_url'),
  isAvailable: boolean('is_available').notNull().default(true),
  homeLat: doublePrecision('home_lat'),
  homeLng: doublePrecision('home_lng'),
  notes: text('notes'),
  createdById: idRef('created_by_id').references(() => users.id, { onDelete: 'set null' }),
  updatedById: idRef('updated_by_id').references(() => users.id, { onDelete: 'set null' }),
  ...timestamps(),
});

export interface FeeBreakdown {
  distanceKm: number | null;
  studentRatePerKm: number | null;
  sessionsPerMonth: number | null;
  legMultiplier: number;
  pricingId: string | null;
  calculatedAt: string | null;
}

/** A student's seat with a driver: home location, pickup order and monthly fee. */
export const driverStudents = pgTable(
  'driver_students',
  {
    id: primaryId(),
    driverId: idRef('driver_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    studentId: idRef('student_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    enrollmentId: idRef('enrollment_id').references(() => enrollments.id, { onDelete: 'set null' }),
    homeLat: doublePrecision('home_lat'),
    homeLng: doublePrecision('home_lng'),
    homeAddress: text('home_address'),
    phoneNumber: varchar('phone_number', { length: 50 }),
    pickupOrder: integer('pickup_order').notNull().default(0),
    pickupOrderToAcademy: integer('pickup_order_to_academy'),
    pickupOrderFromAcademy: integer('pickup_order_from_academy'),
    distanceKm: doublePrecision('distance_km'),
    sessionsPerMonth: doublePrecision('sessions_per_month').notNull().default(0),
    monthlyFee: doublePrecision('monthly_fee'),
    feeBreakdown: jsonb('fee_breakdown').$type<FeeBreakdown | null>(),
    isActive: boolean('is_active').notNull().default(true),
    notes: text('notes'),
    locationUpdatedAt: timestamp('location_updated_at', { withTimezone: true }),
    locationUpdatedById: idRef('location_updated_by_id').references(() => users.id, { onDelete: 'set null' }),
    createdById: idRef('created_by_id').references(() => users.id, { onDelete: 'set null' }),
    updatedById: idRef('updated_by_id').references(() => users.id, { onDelete: 'set null' }),
    ...timestamps(),
  },
  (t) => [
    index('driver_students_driver_idx').on(t.driverId, t.isActive),
    // A student rides with one driver at a time.
    uniqueIndex('driver_students_one_active_seat').on(t.studentId).where(sql`${t.isActive}`),
  ],
);

export interface RateTier {
  minStudents: number;
  maxStudents: number | null;
  ratePerKm: number;
}

export const transportCurrency = pgEnum('transport_currency', ['SYP', 'USD']);

/** Fare settings; exactly one is active at a time. */
export const transportPricing = pgTable(
  'transport_pricing',
  {
    id: primaryId(),
    name: varchar('name', { length: 200 }).notNull(),
    studentRatePerKm: doublePrecision('student_rate_per_km').notNull(),
    driverRatePerKm: doublePrecision('driver_rate_per_km').notNull(),
    driverRateTiers: jsonb('driver_rate_tiers').$type<RateTier[]>().notNull().default([]),
    legMultiplier: doublePrecision('leg_multiplier').notNull().default(3),
    currency: transportCurrency('currency').notNull().default('SYP'),
    isActive: boolean('is_active').notNull().default(false),
    effectiveFrom: timestamp('effective_from', { withTimezone: true }).notNull().defaultNow(),
    notes: text('notes'),
    createdById: idRef('created_by_id').references(() => users.id, { onDelete: 'set null' }),
    updatedById: idRef('updated_by_id').references(() => users.id, { onDelete: 'set null' }),
    ...timestamps(),
  },
  (t) => [uniqueIndex('transport_pricing_one_active').on(t.isActive).where(sql`${t.isActive}`)],
);

export const TRIP_STATUSES = ['scheduled', 'in_travel', 'completed', 'cancelled'] as const;
export type TripStatus = (typeof TRIP_STATUSES)[number];
export const tripStatus = pgEnum('transport_trip_status', TRIP_STATUSES);
export const tripDirection = pgEnum('transport_trip_direction', ['to_academy', 'from_academy']);
export type TripDirection = 'to_academy' | 'from_academy';

export interface StudentSnapshot {
  studentId: string;
  studentName: string;
  phoneNumber: string;
  pickupOrder: number;
  homeAddress: string;
  homeLocation: { lat: number | null; lng: number | null } | null;
  distanceKm: number | null;
}
export interface StudentStatus {
  _id: string;
  studentId: string;
  status: 'pending' | 'picked' | 'dropped' | 'absent';
  arrivedAt: string | null;
}

/** One drive (to or from the academy) with the students on board at the time. */
export const transportTrips = pgTable(
  'transport_trips',
  {
    id: primaryId(),
    driverId: idRef('driver_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    date: timestamp('date', { withTimezone: true }).notNull(),
    direction: tripDirection('direction').notNull(),
    status: tripStatus('status').notNull().default('scheduled'),
    isExtra: boolean('is_extra').notNull().default(false),
    extraCharge: doublePrecision('extra_charge').notNull().default(0),
    studentsSnapshot: jsonb('students_snapshot').$type<StudentSnapshot[]>().notNull().default([]),
    studentStatuses: jsonb('student_statuses').$type<StudentStatus[]>().notNull().default([]),
    optimizedWaypointOrder: jsonb('optimized_waypoint_order').$type<number[]>().notNull().default([]),
    currentLat: doublePrecision('current_lat'),
    currentLng: doublePrecision('current_lng'),
    currentLocationAt: timestamp('current_location_at', { withTimezone: true }),
    driverEarnings: doublePrecision('driver_earnings'),
    totalRouteKm: doublePrecision('total_route_km'),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    cancellationReason: text('cancellation_reason'),
    cancelledById: idRef('cancelled_by_id').references(() => users.id, { onDelete: 'set null' }),
    notes: text('notes'),
    createdById: idRef('created_by_id').references(() => users.id, { onDelete: 'set null' }),
    updatedById: idRef('updated_by_id').references(() => users.id, { onDelete: 'set null' }),
    driverChangedById: idRef('driver_changed_by_id').references(() => users.id, { onDelete: 'set null' }),
    driverChangedAt: timestamp('driver_changed_at', { withTimezone: true }),
    ...timestamps(),
  },
  (t) => [
    index('transport_trips_driver_date_idx').on(t.driverId, t.date),
    index('transport_trips_status_date_idx').on(t.status, t.date),
    // A driver drives one trip at a time.
    uniqueIndex('transport_trips_one_in_travel').on(t.driverId).where(sql`${t.status} = 'in_travel'`),
  ],
);

export const FEEDBACK_CATEGORIES = [
  'late',
  'rude_driver',
  'rough_driving',
  'unsafe',
  'dirty_vehicle',
  'on_time',
  'friendly_driver',
  'smooth_driving',
  'clean_vehicle',
  'great_service',
] as const;

export const tripFeedback = pgTable(
  'transport_trip_feedback',
  {
    id: primaryId(),
    tripId: idRef('trip_id')
      .notNull()
      .references(() => transportTrips.id, { onDelete: 'cascade' }),
    studentId: idRef('student_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    driverId: idRef('driver_id').references(() => users.id, { onDelete: 'set null' }),
    rating: integer('rating').notNull(),
    comment: varchar('comment', { length: 2000 }).notNull().default(''),
    categories: jsonb('categories').$type<string[]>().notNull().default([]),
    ...timestamps(),
  },
  (t) => [uniqueIndex('transport_trip_feedback_trip_student_unique').on(t.tripId, t.studentId), index('transport_trip_feedback_driver_idx').on(t.driverId, t.createdAt)],
);

export type DriverProfileRow = typeof driverProfiles.$inferSelect;
export type DriverStudentRow = typeof driverStudents.$inferSelect;
export type PricingRow = typeof transportPricing.$inferSelect;
export type TripRow = typeof transportTrips.$inferSelect;
export type FeedbackRow = typeof tripFeedback.$inferSelect;
