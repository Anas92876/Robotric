import { and, asc, count, desc, eq, gte, inArray, lt, lte, ne, notInArray, sql, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { DbExecutor } from '../../shared/db/client';
import { enrollments } from '../enrollments/enrollments.table';
import { groups, groupStudents } from '../groups/groups.table';
import { type NewUserRow, users } from '../users/users.table';
import {
  type DriverProfileRow,
  driverProfiles,
  type DriverStudentRow,
  driverStudents,
  type FeedbackRow,
  type PricingRow,
  tripFeedback,
  transportPricing,
  transportTrips,
  type TripRow,
  type TripStatus,
} from './transport.table';

type Named = { id: string; name: string; email: string } | null;

export interface Seat extends DriverStudentRow {
  student: Named;
  driver: Named;
}

export interface Pricing extends PricingRow {
  createdByName: string | null;
  updatedByName: string | null;
}

export interface Trip extends TripRow {
  driver: { id: string; name: string; profile: unknown } | null;
}

export interface Feedback extends FeedbackRow {
  student: Named;
  driver: Named;
  trip: { id: string; date: Date; direction: string; status: string; totalRouteKm: number | null } | null;
}

export interface FeedbackFilter {
  driverId?: string;
  tripId?: string;
  minRating?: number;
  maxRating?: number;
  from?: Date;
  to?: Date;
}

const student = alias(users, 'tr_student');
const driver = alias(users, 'tr_driver');
const creator = alias(users, 'tr_creator');
const updater = alias(users, 'tr_updater');

const named = (p: { id: string | null; name: string | null; email: string | null } | null): Named => (p?.id ? { id: p.id, name: p.name ?? '', email: p.email ?? '' } : null);

function feedbackWhere(f: FeedbackFilter): SQL | undefined {
  return and(
    f.driverId ? eq(tripFeedback.driverId, f.driverId) : undefined,
    f.tripId ? eq(tripFeedback.tripId, f.tripId) : undefined,
    f.minRating !== undefined ? gte(tripFeedback.rating, f.minRating) : undefined,
    f.maxRating !== undefined ? lte(tripFeedback.rating, f.maxRating) : undefined,
    f.from ? gte(tripFeedback.createdAt, f.from) : undefined,
    f.to ? lte(tripFeedback.createdAt, f.to) : undefined,
  );
}

export class DrizzleTransportRepository {
  constructor(private readonly db: DbExecutor) {}

  // ════════════════ Seats ════════════════

  private seatQuery() {
    return this.db
      .select({
        s: driverStudents,
        student: { id: student.id, name: student.name, email: student.email },
        driver: { id: driver.id, name: driver.name, email: driver.email },
      })
      .from(driverStudents)
      .leftJoin(student, eq(student.id, driverStudents.studentId))
      .leftJoin(driver, eq(driver.id, driverStudents.driverId));
  }

  private static seat(r: Awaited<ReturnType<DrizzleTransportRepository['seatQuery']>>[number]): Seat {
    return { ...r.s, student: named(r.student), driver: named(r.driver) };
  }

  async seats(f: { driverId?: string; studentIds?: string[] }) {
    if (f.studentIds && f.studentIds.length === 0) return [];
    const rows = await this.seatQuery()
      .where(and(eq(driverStudents.isActive, true), f.driverId ? eq(driverStudents.driverId, f.driverId) : undefined, f.studentIds ? inArray(driverStudents.studentId, f.studentIds) : undefined))
      .orderBy(asc(driverStudents.pickupOrder), desc(driverStudents.createdAt));
    return rows.map(DrizzleTransportRepository.seat);
  }

  async findSeat(id: string) {
    const [r] = await this.seatQuery().where(eq(driverStudents.id, id)).limit(1);
    return r ? DrizzleTransportRepository.seat(r) : null;
  }

  async activeSeatOf(studentId: string) {
    const [r] = await this.seatQuery()
      .where(and(eq(driverStudents.studentId, studentId), eq(driverStudents.isActive, true)))
      .limit(1);
    return r ? DrizzleTransportRepository.seat(r) : null;
  }

  async createSeat(row: typeof driverStudents.$inferInsert) {
    const [created] = await this.db.insert(driverStudents).values(row).returning({ id: driverStudents.id });
    return (await this.findSeat(created!.id))!;
  }

  async updateSeat(id: string, patch: Partial<typeof driverStudents.$inferInsert>) {
    await this.db.update(driverStudents).set(patch).where(eq(driverStudents.id, id));
    return (await this.findSeat(id))!;
  }

  async maxPickupOrder(driverId: string) {
    const [row] = await this.db
      .select({ max: sql<number | null>`max(${driverStudents.pickupOrder})` })
      .from(driverStudents)
      .where(and(eq(driverStudents.driverId, driverId), eq(driverStudents.isActive, true)));
    return row?.max ?? 0;
  }

  async activeSeatCounts() {
    const rows = await this.db
      .select({ driverId: driverStudents.driverId, n: count() })
      .from(driverStudents)
      .where(eq(driverStudents.isActive, true))
      .groupBy(driverStudents.driverId);
    return new Map(rows.map((r) => [r.driverId, r.n]));
  }

  async driversWithSeats() {
    const rows = await this.db.selectDistinct({ id: driverStudents.driverId }).from(driverStudents).where(eq(driverStudents.isActive, true));
    return rows.map((r) => r.id);
  }

  /** Students with transport on an enrollment but no seat yet. */
  async pendingAssignments() {
    const seated = this.db.select({ id: driverStudents.studentId }).from(driverStudents).where(eq(driverStudents.isActive, true));
    const [row] = await this.db
      .select({ n: count() })
      .from(enrollments)
      .where(and(eq(enrollments.transportEnabled, true), notInArray(enrollments.studentId, seated)));
    return row?.n ?? 0;
  }

  /** Copies the seat's location and fee onto the student's transport enrollments (a display cache). */
  async syncEnrollmentCache(studentId: string, seat: DriverStudentRow | null, updatedById: string | null) {
    await this.db
      .update(enrollments)
      .set({
        homeLat: seat?.homeLat ?? null,
        homeLng: seat?.homeLng ?? null,
        homeAddress: seat?.homeAddress ?? null,
        rawDistanceKm: seat?.distanceKm ?? null,
        roadDistanceKm: seat?.distanceKm ?? null,
        monthlyFeeEstimate: seat?.monthlyFee ?? null,
        locationUpdatedAt: seat ? new Date() : null,
        locationUpdatedById: seat ? updatedById : null,
      })
      .where(and(eq(enrollments.studentId, studentId), eq(enrollments.transportEnabled, true)));
  }

  /** Class days (lower-case) per student, from their groups' weekly schedules. */
  async scheduleDays(studentIds: string[]) {
    const out = new Map<string, Set<string>>(studentIds.map((id) => [id, new Set<string>()]));
    if (studentIds.length === 0) return out;
    const rows = await this.db
      .select({ studentId: groupStudents.studentId, schedule: groups.schedule })
      .from(groupStudents)
      .innerJoin(groups, eq(groups.id, groupStudents.groupId))
      .where(inArray(groupStudents.studentId, studentIds));
    for (const r of rows) for (const slot of r.schedule) out.get(r.studentId)?.add(slot.day.toLowerCase());
    return out;
  }

  /** The weekly schedule of the student's newest active enrollment's group. */
  async latestGroupSchedule(studentId: string, enrollmentId?: string) {
    const [row] = await this.db
      .select({ schedule: groups.schedule })
      .from(enrollments)
      .innerJoin(groupStudents, eq(groupStudents.studentId, enrollments.studentId))
      .innerJoin(groups, and(eq(groups.id, groupStudents.groupId), eq(groups.courseId, enrollments.courseId)))
      .where(and(eq(enrollments.studentId, studentId), enrollmentId ? eq(enrollments.id, enrollmentId) : eq(enrollments.status, 'active')))
      .orderBy(desc(enrollments.createdAt))
      .limit(1);
    return row?.schedule ?? [];
  }

  // ════════════════ Drivers ════════════════

  async drivers() {
    return this.db
      .select({ user: users, profile: driverProfiles })
      .from(users)
      .leftJoin(driverProfiles, eq(driverProfiles.userId, users.id))
      .where(eq(users.role, 'driver'))
      .orderBy(asc(users.name));
  }

  async user(id: string) {
    const [row] = await this.db.select({ id: users.id, name: users.name, role: sql<string>`${users.role}::text` }).from(users).where(eq(users.id, id)).limit(1);
    return row ?? null;
  }

  async profileOf(userId: string) {
    const [row] = await this.db.select().from(driverProfiles).where(eq(driverProfiles.userId, userId)).limit(1);
    return row ?? null;
  }

  async createDriver(user: NewUserRow, profile: Omit<typeof driverProfiles.$inferInsert, 'userId'>) {
    return this.db.transaction(async (tx) => {
      const [u] = await tx.insert(users).values(user).returning();
      const [p] = await tx.insert(driverProfiles).values({ ...profile, userId: u!.id }).returning();
      return { user: u!, profile: p! };
    });
  }

  async updateProfile(userId: string, patch: Partial<typeof driverProfiles.$inferInsert>) {
    const [row] = await this.db.update(driverProfiles).set(patch).where(eq(driverProfiles.userId, userId)).returning();
    return row ?? null;
  }

  async renameDriver(userId: string, name: string) {
    await this.db
      .update(users)
      .set({ name })
      .where(and(eq(users.id, userId), eq(users.role, 'driver')));
  }

  async deleteDriver(userId: string) {
    await this.db.delete(users).where(eq(users.id, userId));
  }

  // ════════════════ Pricing ════════════════

  async pricingList(): Promise<Pricing[]> {
    const rows = await this.db
      .select({ p: transportPricing, createdByName: creator.name, updatedByName: updater.name })
      .from(transportPricing)
      .leftJoin(creator, eq(creator.id, transportPricing.createdById))
      .leftJoin(updater, eq(updater.id, transportPricing.updatedById))
      .orderBy(desc(transportPricing.createdAt));
    return rows.map((r) => ({ ...r.p, createdByName: r.createdByName, updatedByName: r.updatedByName }));
  }

  async activePricing() {
    const [row] = await this.db.select().from(transportPricing).where(eq(transportPricing.isActive, true)).limit(1);
    return row ?? null;
  }

  async findPricing(id: string) {
    const [row] = await this.db.select().from(transportPricing).where(eq(transportPricing.id, id)).limit(1);
    return row ?? null;
  }

  /** Creates the pricing as the active one. */
  async createPricing(row: typeof transportPricing.$inferInsert) {
    return this.db.transaction(async (tx) => {
      await tx.update(transportPricing).set({ isActive: false }).where(eq(transportPricing.isActive, true));
      const [created] = await tx
        .insert(transportPricing)
        .values({ ...row, isActive: true })
        .returning();
      return created!;
    });
  }

  async updatePricing(id: string, patch: Partial<typeof transportPricing.$inferInsert>) {
    const [row] = await this.db.update(transportPricing).set(patch).where(eq(transportPricing.id, id)).returning();
    return row!;
  }

  async activatePricing(id: string, updatedById: string) {
    return this.db.transaction(async (tx) => {
      await tx
        .update(transportPricing)
        .set({ isActive: false })
        .where(and(eq(transportPricing.isActive, true), ne(transportPricing.id, id)));
      const [row] = await tx.update(transportPricing).set({ isActive: true, updatedById }).where(eq(transportPricing.id, id)).returning();
      return row!;
    });
  }

  // ════════════════ Trips ════════════════

  private tripQuery() {
    return this.db
      .select({ t: transportTrips, driver: { id: driver.id, name: driver.name, profile: driver.profile } })
      .from(transportTrips)
      .leftJoin(driver, eq(driver.id, transportTrips.driverId));
  }

  async trips(f: { status?: string; driverId?: string; from?: Date; to?: Date; statuses?: TripStatus[]; limit?: number; order?: 'asc' | 'desc' }): Promise<Trip[]> {
    let q = this.tripQuery()
      .where(
        and(
          f.status ? sql`${transportTrips.status}::text = ${f.status}` : undefined,
          f.statuses ? inArray(transportTrips.status, f.statuses) : undefined,
          f.driverId ? eq(transportTrips.driverId, f.driverId) : undefined,
          f.from ? gte(transportTrips.date, f.from) : undefined,
          f.to ? lt(transportTrips.date, f.to) : undefined,
        ),
      )
      .orderBy(f.order === 'asc' ? asc(transportTrips.date) : desc(transportTrips.date))
      .$dynamic();
    if (f.limit) q = q.limit(f.limit);
    return (await q).map((r) => ({ ...r.t, driver: r.driver?.id ? r.driver : null }));
  }

  async findTrip(id: string): Promise<Trip | null> {
    const [r] = await this.tripQuery().where(eq(transportTrips.id, id)).limit(1);
    return r ? { ...r.t, driver: r.driver?.id ? r.driver : null } : null;
  }

  async createTrip(row: typeof transportTrips.$inferInsert) {
    const [created] = await this.db.insert(transportTrips).values(row).returning({ id: transportTrips.id });
    return (await this.findTrip(created!.id))!;
  }

  /** Updates the trip only if it is still in one of `from` statuses; null otherwise. */
  async updateTrip(id: string, patch: Partial<typeof transportTrips.$inferInsert>, from?: TripStatus[]) {
    const rows = await this.db
      .update(transportTrips)
      .set(patch)
      .where(and(eq(transportTrips.id, id), from ? inArray(transportTrips.status, from) : undefined))
      .returning({ id: transportTrips.id });
    return rows.length ? (await this.findTrip(id))! : null;
  }

  async deleteTrip(id: string) {
    await this.db.delete(transportTrips).where(eq(transportTrips.id, id));
  }

  async hasTrip(driverId: string, direction: 'to_academy' | 'from_academy', from: Date, to: Date) {
    const [row] = await this.db
      .select({ id: transportTrips.id })
      .from(transportTrips)
      .where(and(eq(transportTrips.driverId, driverId), eq(transportTrips.direction, direction), gte(transportTrips.date, from), lt(transportTrips.date, to), ne(transportTrips.status, 'cancelled')))
      .limit(1);
    return Boolean(row);
  }

  async openTripOf(driverId: string, statuses: TripStatus[]) {
    const [row] = await this.db
      .select()
      .from(transportTrips)
      .where(and(eq(transportTrips.driverId, driverId), inArray(transportTrips.status, statuses)))
      .limit(1);
    return row ?? null;
  }

  /** Trips the student is (or was) on. */
  async tripsOfStudent(studentId: string, f: { statuses: TripStatus[]; driverId?: string; from?: Date; to?: Date; order: 'asc' | 'desc'; limit?: number; offset?: number }) {
    let q = this.db
      .select()
      .from(transportTrips)
      .where(
        and(
          sql`${transportTrips.studentsSnapshot} @> ${JSON.stringify([{ studentId }])}::jsonb`,
          inArray(transportTrips.status, f.statuses),
          f.driverId ? eq(transportTrips.driverId, f.driverId) : undefined,
          f.from ? gte(transportTrips.date, f.from) : undefined,
          f.to ? lt(transportTrips.date, f.to) : undefined,
        ),
      )
      .orderBy(f.order === 'asc' ? asc(transportTrips.date) : desc(transportTrips.date))
      .$dynamic();
    if (f.limit) q = q.limit(f.limit).offset(f.offset ?? 0);
    return q;
  }

  // ════════════════ Feedback ════════════════

  async myFeedback(studentId: string, tripIds: string[]) {
    if (tripIds.length === 0) return new Map<string, FeedbackRow>();
    const rows = await this.db
      .select()
      .from(tripFeedback)
      .where(and(eq(tripFeedback.studentId, studentId), inArray(tripFeedback.tripId, tripIds)));
    return new Map(rows.map((r) => [r.tripId, r]));
  }

  async saveFeedback(row: { tripId: string; studentId: string; driverId: string; rating: number; comment: string; categories: string[] }) {
    const [saved] = await this.db
      .insert(tripFeedback)
      .values(row)
      .onConflictDoUpdate({ target: [tripFeedback.tripId, tripFeedback.studentId], set: { rating: row.rating, comment: row.comment, categories: row.categories, updatedAt: new Date() } })
      .returning();
    return saved!;
  }

  private feedbackQuery() {
    return this.db
      .select({
        f: tripFeedback,
        student: { id: student.id, name: student.name, email: student.email },
        driver: { id: driver.id, name: driver.name, email: driver.email },
        trip: { id: transportTrips.id, date: transportTrips.date, direction: sql<string>`${transportTrips.direction}::text`, status: sql<string>`${transportTrips.status}::text`, totalRouteKm: transportTrips.totalRouteKm },
      })
      .from(tripFeedback)
      .leftJoin(student, eq(student.id, tripFeedback.studentId))
      .leftJoin(driver, eq(driver.id, tripFeedback.driverId))
      .leftJoin(transportTrips, eq(transportTrips.id, tripFeedback.tripId));
  }

  private static feedback(r: Awaited<ReturnType<DrizzleTransportRepository['feedbackQuery']>>[number]): Feedback {
    return { ...r.f, student: named(r.student), driver: named(r.driver), trip: r.trip?.id ? r.trip : null };
  }

  async feedbackPage(f: FeedbackFilter, page: { limit: number; offset: number }) {
    const [rows, [total]] = await Promise.all([
      this.feedbackQuery().where(feedbackWhere(f)).orderBy(desc(tripFeedback.createdAt)).limit(page.limit).offset(page.offset),
      this.db.select({ n: count() }).from(tripFeedback).where(feedbackWhere(f)),
    ]);
    return { rows: rows.map(DrizzleTransportRepository.feedback), total: total?.n ?? 0 };
  }

  async findFeedback(id: string) {
    const [r] = await this.feedbackQuery().where(eq(tripFeedback.id, id)).limit(1);
    return r ? DrizzleTransportRepository.feedback(r) : null;
  }

  async feedbackStats(f: FeedbackFilter) {
    const where = feedbackWhere(f);
    const avg = sql<number | null>`avg(${tripFeedback.rating})::float8`;
    const [byDriver, byCategory, overall] = await Promise.all([
      this.db
        .select({
          driverId: tripFeedback.driverId,
          driverName: driver.name,
          avgRating: avg,
          count: sql<number>`count(*)::int`,
          lowCount: sql<number>`count(*) filter (where ${tripFeedback.rating} <= 2)::int`,
          highCount: sql<number>`count(*) filter (where ${tripFeedback.rating} >= 4)::int`,
        })
        .from(tripFeedback)
        .leftJoin(driver, eq(driver.id, tripFeedback.driverId))
        .where(where)
        .groupBy(tripFeedback.driverId, driver.name)
        .orderBy(asc(avg)),
      this.db.select({ categories: tripFeedback.categories }).from(tripFeedback).where(where),
      this.db.select({ avgRating: avg, count: sql<number>`count(*)::int` }).from(tripFeedback).where(where),
    ]);
    const tally = new Map<string, number>();
    for (const r of byCategory) for (const c of r.categories) tally.set(c, (tally.get(c) ?? 0) + 1);
    const categories = [...tally].map(([category, n]) => ({ category, count: n })).sort((x, y) => y.count - x.count);
    return { byDriver, byCategory: categories, overall: overall[0] ?? { avgRating: null, count: 0 } };
  }

  // ════════════════ Management figures ════════════════

  async activeSeatTotals() {
    const [row] = await this.db
      .select({ students: sql<number>`count(*)::int`, revenue: sql<number>`coalesce(sum(${driverStudents.monthlyFee}), 0)::float8` })
      .from(driverStudents)
      .where(eq(driverStudents.isActive, true));
    return row ?? { students: 0, revenue: 0 };
  }
}

export type TransportRepository = DrizzleTransportRepository;
export type { DriverProfileRow };
