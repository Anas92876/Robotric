import type { PasswordHasher } from '../../shared/auth/password-hasher';
import { isValidId, newId } from '../../shared/db/ids';
import { AppError, BadRequestError, ConflictError } from '../../shared/http/errors';
import type { SettingsRepository } from '../settings/settings.repository';
import type { Seat, TransportRepository, Trip } from './transport.repository';
import {
  buildSnapshot,
  DEFAULT_ACADEMY,
  dayName,
  estimateSessionsPerMonth,
  haversineKm,
  type LatLng,
  type RoadRouter,
  studentMonthlyFee,
  tripEarnings,
} from './transport-math';
import { type FeeBreakdown, type PricingRow, type RateTier, type StudentSnapshot, type StudentStatus, TRIP_STATUSES, type TripDirection, type TripStatus } from './transport.table';

/** Trip notifications to students (they arrive with phase 9). */
export interface TransportNotifier {
  trip(studentIds: string[], event: 'started' | 'arrived' | 'completed' | 'cancelled', tripId: string): Promise<void>;
}
export const silentTransportNotifier: TransportNotifier = { trip: async () => {} };

const DAY = 86400000;
const DEFAULT_SESSIONS = 12;
const isUniqueViolation = (err: unknown) => {
  const e = err as { code?: string; cause?: { code?: string } };
  return (e?.cause?.code ?? e?.code) === '23505';
};
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const num = (v: unknown) => (v === undefined || v === null || v === '' ? undefined : Number(v));
const tripNotFound = () => new AppError('Trip not found', 404, 'NOT_FOUND');

export const TRANSITIONS: Record<TripStatus, TripStatus[]> = { scheduled: ['in_travel', 'cancelled'], in_travel: ['completed', 'cancelled'], completed: [], cancelled: [] };

export function feeBreakdown(distanceKm: number | null, sessions: number, pricing: PricingRow, now: Date): FeeBreakdown {
  return { distanceKm, studentRatePerKm: pricing.studentRatePerKm, sessionsPerMonth: sessions, legMultiplier: pricing.legMultiplier || 3, pricingId: pricing.id, calculatedAt: now.toISOString() };
}

/**
 * Student transport: drivers, the students they carry (with home location and
 * monthly fee), fare settings and daily trips.
 */
export class TransportService {
  constructor(
    readonly store: TransportRepository,
    private readonly settings: Pick<SettingsRepository, 'get' | 'save'>,
    readonly router: RoadRouter,
    private readonly hasher: PasswordHasher,
    readonly notifier: TransportNotifier,
    readonly now: () => Date = () => new Date(),
  ) {}

  // ════════════════ Academy & fares ════════════════

  async academy(): Promise<LatLng> {
    const s = await this.settings.get();
    return s?.academyLat != null && s.academyLng != null ? { lat: s.academyLat, lng: s.academyLng } : DEFAULT_ACADEMY;
  }

  async setAcademy(body: { lat?: unknown; lng?: unknown }) {
    const lat = num(body.lat);
    const lng = num(body.lng);
    if (lat === undefined || lng === undefined || !Number.isFinite(lat) || !Number.isFinite(lng)) throw new BadRequestError('lat and lng are required');
    await this.settings.save({ academyLat: lat, academyLng: lng });
    return { lat, lng };
  }

  /** Road distance from home to the academy (straight line kept as metadata). */
  async distance(home: LatLng) {
    const academy = await this.academy();
    const rawDistanceKm = Number.parseFloat(haversineKm(home, academy).toFixed(2));
    const road = await this.router.roadDistanceKm(home, academy);
    return { distanceKm: road || rawDistanceKm, rawDistanceKm, academy };
  }

  async activePricing() {
    return this.store.activePricing();
  }

  /** A fare quote for a home location. */
  async estimate(home: LatLng, sessions: number, pricing: PricingRow) {
    const { distanceKm, rawDistanceKm, academy } = await this.distance(home);
    const multiplier = pricing.legMultiplier || 3;
    return {
      distanceKm,
      rawDistanceKm,
      sessionsPerMonth: sessions,
      monthlyFee: studentMonthlyFee(distanceKm, sessions, pricing),
      breakdown: {
        currency: pricing.currency,
        studentRatePerKm: pricing.studentRatePerKm,
        legMultiplier: multiplier,
        formula: `${distanceKm} km × ${multiplier} legs × ${sessions} sessions × ${pricing.studentRatePerKm} ${pricing.currency}/km`,
      },
      academyLocation: academy,
    };
  }

  async receptionEstimate(body: { lat?: unknown; lng?: unknown; sessionsPerMonth?: unknown }) {
    const lat = num(body.lat);
    const lng = num(body.lng);
    if (lat === undefined || lng === undefined) throw new BadRequestError('lat and lng are required');
    const pricing = await this.store.activePricing();
    if (!pricing) throw new BadRequestError('No active pricing config found');
    return this.estimate({ lat, lng }, num(body.sessionsPerMonth) || DEFAULT_SESSIONS, pricing);
  }

  // ════════════════ Seats (reception) ════════════════

  async seats(q: Record<string, string | undefined>) {
    const list = await this.store.seats({ driverId: isValidId(q.driverId) ? q.driverId : undefined });
    const s = q.search?.toLowerCase();
    return s ? list.filter((r) => (r.student?.name ?? '').toLowerCase().includes(s) || (r.homeAddress ?? '').toLowerCase().includes(s)) : list;
  }

  async assignmentsByStudents(ids: unknown) {
    const list = Array.isArray(ids) ? ids.map(String) : [];
    const byStudent: Record<string, unknown> = Object.fromEntries(list.map((id) => [id, { assigned: false }]));
    for (const seat of await this.store.seats({ studentIds: list.filter(isValidId) })) {
      byStudent[seat.studentId] = {
        assigned: true,
        driverStudentId: seat.id,
        driverId: seat.driverId,
        driverName: seat.driver?.name ?? null,
        hasLocation: seat.homeLat != null && seat.homeLng != null,
      };
    }
    return byStudent;
  }

  pendingAssignments() {
    return this.store.pendingAssignments();
  }

  private async checkDriver(driverId: unknown) {
    const user = isValidId(driverId) ? await this.store.user(driverId) : null;
    if (!user || user.role !== 'driver') throw new BadRequestError('Invalid driver');
    return user;
  }

  /** Seats a student with a driver and prices the seat. */
  async assign(actorId: string, body: Record<string, unknown>) {
    const home = body.homeLocation as { lat?: unknown; lng?: unknown } | undefined;
    const lat = num(home?.lat);
    const lng = num(home?.lng);
    if (!isValidId(body.studentId) || !body.driverId || !lat || !lng) throw new BadRequestError('studentId, driverId, and homeLocation (lat/lng) are required');
    const studentId = body.studentId;
    if (await this.store.activeSeatOf(studentId)) throw new ConflictError('Student is already assigned to a driver');
    const driver = await this.checkDriver(body.driverId);
    const pricing = await this.store.activePricing();
    if (!pricing) throw new BadRequestError('No active pricing config found. Create and activate a pricing first.');
    const { distanceKm } = await this.distance({ lat, lng });

    let sessions = num(body.sessionsPerMonthOverride) || 0;
    const enrollmentId = isValidId(body.enrollmentId) ? body.enrollmentId : null;
    if (!sessions && enrollmentId) sessions = estimateSessionsPerMonth(await this.store.latestGroupSchedule(studentId, enrollmentId));
    const defaulted = !sessions;
    if (!sessions) sessions = DEFAULT_SESSIONS;
    const order = (await this.store.maxPickupOrder(driver.id)) + 1;
    let seat: Seat;
    try {
      seat = await this.store.createSeat({
        driverId: driver.id,
        studentId,
        enrollmentId,
        homeLat: lat,
        homeLng: lng,
        homeAddress: typeof body.homeAddress === 'string' ? body.homeAddress : null,
        phoneNumber: typeof body.phoneNumber === 'string' ? body.phoneNumber : null,
        pickupOrder: order,
        pickupOrderToAcademy: order,
        pickupOrderFromAcademy: order,
        distanceKm,
        sessionsPerMonth: sessions,
        monthlyFee: studentMonthlyFee(distanceKm, sessions, pricing),
        feeBreakdown: feeBreakdown(distanceKm, sessions, pricing, this.now()),
        createdById: actorId,
      });
    } catch (err) {
      if (isUniqueViolation(err)) throw new ConflictError('Student is already assigned to a driver');
      throw err;
    }
    await this.store.syncEnrollmentCache(studentId, seat, actorId);
    return {
      seat,
      warning: defaulted ? 'sessionsPerMonth was not provided and could not be estimated from enrollment schedule. Defaulted to 12. Update the record with the correct value.' : undefined,
    };
  }

  private async seat(id: string) {
    const seat = isValidId(id) ? await this.store.findSeat(id) : null;
    if (!seat || !seat.isActive) throw new AppError('Student transport record not found', 404, 'NOT_FOUND');
    return seat;
  }

  /** A new home location or class count re-prices the seat with the active pricing. */
  async updateSeat(actorId: string, id: string, body: Record<string, unknown>) {
    const seat = await this.seat(id);
    const patch: Record<string, unknown> = { updatedById: actorId };
    const home = body.homeLocation as { lat?: unknown; lng?: unknown } | undefined;
    const lat = num(home?.lat);
    const lng = num(home?.lng);
    const sessions = num(body.sessionsPerMonth);
    if ((lat && lng) || sessions !== undefined) {
      const pricing = await this.store.activePricing();
      let distanceKm = seat.distanceKm;
      if (lat && lng) {
        distanceKm = (await this.distance({ lat, lng })).distanceKm;
        Object.assign(patch, { homeLat: lat, homeLng: lng, distanceKm });
      }
      const s = sessions ?? seat.sessionsPerMonth;
      if (sessions !== undefined) patch.sessionsPerMonth = sessions;
      if (pricing) Object.assign(patch, { monthlyFee: studentMonthlyFee(distanceKm, s, pricing), feeBreakdown: feeBreakdown(distanceKm, s, pricing, this.now()) });
    }
    for (const key of ['homeAddress', 'phoneNumber', 'notes'] as const) if (body[key] !== undefined) patch[key] = body[key];
    for (const key of ['pickupOrder', 'pickupOrderToAcademy', 'pickupOrderFromAcademy'] as const) if (body[key] !== undefined) patch[key] = num(body[key]) ?? null;
    if (body.driverId !== undefined && body.driverId !== seat.driverId) patch.driverId = (await this.checkDriver(body.driverId)).id;
    const updated = await this.store.updateSeat(seat.id, patch);
    await this.store.syncEnrollmentCache(updated.studentId, updated, actorId);
    return updated;
  }

  async removeSeat(actorId: string, id: string) {
    const seat = await this.seat(id);
    await this.store.updateSeat(seat.id, { isActive: false, updatedById: actorId });
    await this.store.syncEnrollmentCache(seat.studentId, null, actorId);
  }

  // ════════════════ Drivers (reception) ════════════════

  async drivers() {
    const [rows, counts] = await Promise.all([this.store.drivers(), this.store.activeSeatCounts()]);
    return rows.map((r) => ({ ...r, studentCount: counts.get(r.user.id) ?? 0 }));
  }

  async createDriver(actorId: string, body: Record<string, unknown>) {
    const { email, name, password } = body;
    if (typeof email !== 'string' || !email || typeof name !== 'string' || !name || typeof password !== 'string' || !password) {
      throw new BadRequestError('email, name, and password are required');
    }
    if (password.length < 6) throw new BadRequestError('Password must be at least 6 characters');
    const str = (v: unknown) => (typeof v === 'string' ? v : null);
    try {
      return await this.store.createDriver(
        { email: email.trim().toLowerCase(), name, passwordHash: await this.hasher.hash(password), role: 'driver' },
        {
          vehiclePlate: str(body.vehiclePlate),
          vehicleModel: str(body.vehicleModel),
          vehicleColor: str(body.vehicleColor),
          vehicleCapacity: num(body.vehicleCapacity) || 5,
          phoneNumber: str(body.phoneNumber),
          photoUrl: str(body.photoUrl),
          notes: str(body.notes),
          createdById: actorId,
        },
      );
    } catch (err) {
      if (isUniqueViolation(err)) throw new ConflictError('Email already in use');
      throw err;
    }
  }

  async updateDriver(actorId: string, userId: string, body: Record<string, unknown>) {
    const profile = isValidId(userId) ? await this.store.profileOf(userId) : null;
    if (!profile) throw new AppError('Driver profile not found', 404, 'NOT_FOUND');
    const patch = this.profilePatch(body, ['vehiclePlate', 'vehicleModel', 'vehicleColor', 'vehicleCapacity', 'phoneNumber', 'photoUrl', 'isAvailable', 'notes']);
    const updated = await this.store.updateProfile(userId, { ...patch, updatedById: actorId });
    if (typeof body.name === 'string' && body.name.trim()) await this.store.renameDriver(userId, body.name.trim());
    return updated!;
  }

  profilePatch(body: Record<string, unknown>, allowed: string[]) {
    const patch: Record<string, unknown> = {};
    for (const key of allowed) {
      if (body[key] === undefined) continue;
      if (key === 'vehicleCapacity') {
        const n = num(body[key]);
        if (n === undefined || !Number.isInteger(n) || n < 1) throw new BadRequestError('vehicleCapacity must be at least 1');
        patch.vehicleCapacity = n;
      } else if (key === 'isAvailable') patch.isAvailable = Boolean(body[key]);
      else if (key === 'homeLocation') {
        const h = body[key] as { lat?: unknown; lng?: unknown } | null;
        patch.homeLat = num(h?.lat) ?? null;
        patch.homeLng = num(h?.lng) ?? null;
      } else patch[key] = body[key];
    }
    return patch;
  }

  /** Only a driver without students or open trips can be removed. */
  async removeDriver(userId: string) {
    const user = isValidId(userId) ? await this.store.user(userId) : null;
    if (!user || user.role !== 'driver') throw new AppError('Driver not found', 404, 'NOT_FOUND');
    const seats = (await this.store.activeSeatCounts()).get(user.id) ?? 0;
    if (seats > 0) {
      throw new AppError(`Cannot delete: this driver has ${seats} active student(s) assigned. Please reassign them first.`, 409, 'DRIVER_HAS_STUDENTS', { activeStudentCount: seats });
    }
    const open = await this.store.openTripOf(user.id, ['scheduled', 'in_travel']);
    if (open) throw new AppError(`Cannot delete: this driver has a ${open.status} trip. Cancel or complete it first.`, 409, 'DRIVER_HAS_ACTIVE_TRIP', { tripId: open.id });
    try {
      await this.store.deleteDriver(user.id);
    } catch (err) {
      const e = err as { code?: string; cause?: { code?: string } };
      if (['23503', '23001'].includes(e?.cause?.code ?? e?.code ?? '')) {
        throw new ConflictError('This driver has past trips or seats on record and cannot be deleted', 'DRIVER_HAS_HISTORY');
      }
      throw err;
    }
  }

  // ════════════════ Trips (reception) ════════════════

  trips(q: Record<string, string | undefined>) {
    let from: Date | undefined;
    if (q.date) {
      from = new Date(q.date);
      if (Number.isNaN(from.getTime())) throw new BadRequestError('Invalid date');
    }
    return this.store.trips({ status: q.status || undefined, driverId: isValidId(q.driverId) ? q.driverId : undefined, from, to: from ? new Date(from.getTime() + DAY) : undefined, limit: 200 });
  }

  private static statuses(seats: { studentId: string }[]): StudentStatus[] {
    return seats.map((s) => ({ _id: newId(), studentId: s.studentId, status: 'pending', arrivedAt: null }));
  }

  private withNames(seats: Seat[]) {
    return seats.map((s) => ({ ...s, studentName: s.student?.name ?? '' }));
  }

  async createTrip(actorId: string, body: Record<string, unknown>) {
    const { date, direction } = body;
    if (!body.driverId || !date || !direction) throw new BadRequestError('driverId, date, and direction are required');
    if (direction !== 'to_academy' && direction !== 'from_academy') throw new BadRequestError('direction must be to_academy or from_academy');
    const driver = await this.checkDriver(body.driverId);
    const day = new Date(String(date));
    if (Number.isNaN(day.getTime())) throw new BadRequestError('Invalid date');
    let seats = await this.store.seats({ driverId: driver.id });
    if (Array.isArray(body.studentIds) && body.studentIds.length) {
      const wanted = new Set(body.studentIds.map(String));
      seats = seats.filter((s) => wanted.has(s.id));
    }
    return this.store.createTrip({
      driverId: driver.id,
      date: day,
      direction,
      isExtra: Boolean(body.isExtra),
      extraCharge: num(body.extraCharge) ?? 0,
      studentsSnapshot: buildSnapshot(this.withNames(seats), direction),
      studentStatuses: TransportService.statuses(seats),
      notes: typeof body.notes === 'string' ? body.notes : null,
      createdById: actorId,
    });
  }

  /** Route length (asking the router if the trip has none yet) and the driver's pay for it. */
  async closeOut(trip: Trip) {
    let km = trip.totalRouteKm;
    if (!km || km <= 0) km = (await this.routeKm(trip.studentsSnapshot, trip.direction)) ?? null;
    const pricing = await this.store.activePricing();
    const earnings = pricing ? tripEarnings(trip.studentsSnapshot.length, pricing, km) : null;
    return { totalRouteKm: km, ...(earnings != null ? { driverEarnings: earnings } : {}) };
  }

  private async routeKm(snapshot: StudentSnapshot[], direction: TripDirection) {
    const academy = await this.academy();
    const stops = snapshot
      .filter((s) => s.homeLocation?.lat != null && s.homeLocation.lng != null)
      .sort((a, b) => a.pickupOrder - b.pickupOrder)
      .map((s) => ({ lat: s.homeLocation!.lat!, lng: s.homeLocation!.lng! }));
    if (stops.length === 0) return null;
    return direction === 'to_academy' ? this.router.routeKm(academy, stops, academy) : this.router.routeKm(academy, stops.slice(0, -1), stops[stops.length - 1]!);
  }

  /** Reception can reassign the driver and force a status change. */
  async updateTrip(actorId: string, id: string, body: Record<string, unknown>) {
    const trip = isValidId(id) ? await this.store.findTrip(id) : null;
    if (!trip) throw tripNotFound();
    const patch: Record<string, unknown> = { updatedById: actorId };
    if (body.driverId && body.driverId !== trip.driverId) {
      Object.assign(patch, { driverId: (await this.checkDriver(body.driverId)).id, driverChangedById: actorId, driverChangedAt: this.now() });
    }
    let from: TripStatus[] | undefined;
    if (body.status === 'in_travel') {
      if (trip.status !== 'scheduled') throw new BadRequestError(`Cannot force-start a ${trip.status} trip`);
      Object.assign(patch, { status: 'in_travel', startedAt: this.now() });
      from = ['scheduled'];
    } else if (body.status === 'completed') {
      if (trip.status !== 'in_travel') throw new BadRequestError(`Cannot force-complete a ${trip.status} trip`);
      Object.assign(patch, await this.closeOut(trip), { status: 'completed', completedAt: this.now() });
      from = ['in_travel'];
    } else if (body.status === 'cancelled') {
      if (!TRANSITIONS[trip.status].includes('cancelled')) throw new BadRequestError(`Cannot cancel a ${trip.status} trip`);
      Object.assign(patch, { status: 'cancelled', cancelledAt: this.now(), cancelledById: actorId, cancellationReason: typeof body.cancellationReason === 'string' ? body.cancellationReason : '' });
      from = ['scheduled', 'in_travel'];
    } else if (body.status !== undefined && !TRIP_STATUSES.includes(body.status as TripStatus)) {
      throw new BadRequestError('Invalid status');
    }
    if (body.notes !== undefined) patch.notes = body.notes;
    try {
      const updated = await this.store.updateTrip(trip.id, patch, from);
      if (!updated) throw new BadRequestError('The trip changed in the meantime; reload and try again', 'TRIP_CHANGED');
      return updated;
    } catch (err) {
      if (isUniqueViolation(err)) throw new ConflictError('This driver already has an active trip in progress', 'DRIVER_BUSY');
      throw err;
    }
  }

  async removeTrip(id: string) {
    const trip = isValidId(id) ? await this.store.findTrip(id) : null;
    if (!trip) throw tripNotFound();
    if (trip.status === 'in_travel') throw new AppError('Cannot delete a trip that is currently in progress. Cancel it first.', 409, 'TRIP_IN_TRAVEL');
    await this.store.deleteTrip(trip.id);
  }

  /**
   * Creates the day's two trips (to and from the academy) for every driver,
   * with only the students who have a class that weekday. Existing trips are
   * left alone, so it can run more than once.
   */
  async generateDay(target: Date) {
    const day = startOfDay(target);
    const next = new Date(day.getTime() + DAY);
    const weekday = dayName(day);
    const summary = { created: 0, skipped: 0, driversWithoutSessions: 0, errors: [] as { driverId: string; direction?: string; error: string }[] };
    for (const driverId of await this.store.driversWithSeats()) {
      try {
        const seats = await this.store.seats({ driverId });
        const days = await this.store.scheduleDays(seats.map((s) => s.studentId));
        const riding = seats.filter((s) => days.get(s.studentId)?.has(weekday));
        if (riding.length === 0) {
          summary.driversWithoutSessions++;
          continue;
        }
        for (const direction of ['to_academy', 'from_academy'] as const) {
          if (await this.store.hasTrip(driverId, direction, day, next)) {
            summary.skipped++;
            continue;
          }
          await this.store.createTrip({
            driverId,
            date: day,
            direction,
            studentsSnapshot: buildSnapshot(this.withNames(riding), direction),
            studentStatuses: TransportService.statuses(riding),
          });
          summary.created++;
        }
      } catch (err) {
        summary.errors.push({ driverId, error: (err as Error).message });
      }
    }
    return summary;
  }

  // ════════════════ Management ════════════════

  pricingList() {
    return this.store.pricingList();
  }

  private static tiers(v: unknown): RateTier[] {
    if (!Array.isArray(v)) throw new BadRequestError('driverRateTiers must be an array');
    return v.map((raw, i) => {
      const t = raw as Record<string, unknown>;
      const min = num(t.minStudents);
      const rate = num(t.ratePerKm);
      const max = t.maxStudents == null ? null : num(t.maxStudents)!;
      if (min == null || min < 1) throw new BadRequestError(`Tier ${i + 1}: minStudents must be ≥ 1`);
      if (rate == null || rate < 0) throw new BadRequestError(`Tier ${i + 1}: ratePerKm must be ≥ 0`);
      if (max != null && max < min) throw new BadRequestError(`Tier ${i + 1}: maxStudents must be ≥ minStudents`);
      return { minStudents: min, maxStudents: max, ratePerKm: rate };
    });
  }

  private static currency(v: unknown) {
    if (v === undefined) return undefined;
    if (v !== 'SYP' && v !== 'USD') throw new BadRequestError('currency must be SYP or USD');
    return v;
  }

  /** A new pricing becomes the active one. */
  createPricing(actorId: string, body: Record<string, unknown>) {
    const student = num(body.studentRatePerKm);
    const driver = num(body.driverRatePerKm);
    if (typeof body.name !== 'string' || !body.name.trim() || student == null || driver == null) throw new BadRequestError('name, studentRatePerKm and driverRatePerKm are required');
    return this.store.createPricing({
      name: body.name.trim(),
      studentRatePerKm: student,
      driverRatePerKm: driver,
      driverRateTiers: body.driverRateTiers != null ? TransportService.tiers(body.driverRateTiers) : [],
      ...(num(body.legMultiplier) ? { legMultiplier: num(body.legMultiplier)! } : {}),
      currency: TransportService.currency(body.currency) ?? 'SYP',
      effectiveFrom: body.effectiveFrom ? new Date(String(body.effectiveFrom)) : this.now(),
      notes: typeof body.notes === 'string' ? body.notes : null,
      createdById: actorId,
    });
  }

  async updatePricing(actorId: string, id: string, body: Record<string, unknown>) {
    const pricing = isValidId(id) ? await this.store.findPricing(id) : null;
    if (!pricing) throw new AppError('Pricing not found', 404, 'NOT_FOUND');
    const patch: Record<string, unknown> = { updatedById: actorId };
    if (typeof body.name === 'string') patch.name = body.name;
    for (const key of ['studentRatePerKm', 'driverRatePerKm', 'legMultiplier'] as const) if (body[key] !== undefined) patch[key] = num(body[key]);
    if (body.driverRateTiers != null) patch.driverRateTiers = TransportService.tiers(body.driverRateTiers);
    if (body.currency !== undefined) patch.currency = TransportService.currency(body.currency);
    if (body.effectiveFrom !== undefined) patch.effectiveFrom = new Date(String(body.effectiveFrom));
    if (body.notes !== undefined) patch.notes = body.notes;
    return this.store.updatePricing(pricing.id, patch);
  }

  async activatePricing(actorId: string, id: string) {
    const pricing = isValidId(id) ? await this.store.findPricing(id) : null;
    if (!pricing) throw new AppError('Pricing not found', 404, 'NOT_FOUND');
    return this.store.activatePricing(pricing.id, actorId);
  }

  private static month(q: Record<string, string | undefined>, now: Date) {
    const y = Number.parseInt(q.year ?? '', 10) || now.getFullYear();
    const m = Number.parseInt(q.month ?? '', 10) || now.getMonth() + 1;
    return { y, m, from: new Date(y, m - 1, 1), to: new Date(y, m, 1) };
  }

  async monthlyEarnings(q: Record<string, string | undefined>) {
    const { y, m, from, to } = TransportService.month(q, this.now());
    const [trips, drivers] = await Promise.all([this.store.trips({ status: 'completed', from, to }), this.store.drivers()]);
    const byDriver = new Map<string, { driverId: string; trips: number; students: number; earnings: number }>();
    for (const t of trips) {
      const e = byDriver.get(t.driverId) ?? { driverId: t.driverId, trips: 0, students: 0, earnings: 0 };
      e.trips += 1;
      e.students += t.studentsSnapshot.length;
      e.earnings += t.driverEarnings ?? 0;
      byDriver.set(t.driverId, e);
    }
    const info = new Map(drivers.map((d) => [d.user.id, d]));
    return {
      year: y,
      month: m,
      drivers: [...byDriver.values()].map((e) => ({
        ...e,
        earnings: Number.parseFloat(e.earnings.toFixed(2)),
        driverName: info.get(e.driverId)?.user.name ?? 'Unknown',
        vehiclePlate: info.get(e.driverId)?.profile?.vehiclePlate ?? '',
      })),
    };
  }

  async overview(q: Record<string, string | undefined>) {
    const { y, m, from, to } = TransportService.month(q, this.now());
    const [trips, seats] = await Promise.all([this.store.trips({ status: 'completed', from, to }), this.store.activeSeatTotals()]);
    const cost = trips.reduce((s, t) => s + (t.driverEarnings ?? 0), 0);
    return {
      year: y,
      month: m,
      totalTrips: trips.length,
      activeStudents: seats.students,
      totalStudentRevenue: Number.parseFloat(seats.revenue.toFixed(2)),
      totalDriverCost: Number.parseFloat(cost.toFixed(2)),
      netProfit: Number.parseFloat((seats.revenue - cost).toFixed(2)),
    };
  }

  private static feedbackFilter(q: Record<string, string | undefined>) {
    const d = (v?: string) => (v ? new Date(v) : undefined);
    return {
      driverId: isValidId(q.driverId) ? q.driverId : undefined,
      tripId: isValidId(q.tripId) ? q.tripId : undefined,
      minRating: q.minRating ? Number.parseInt(q.minRating, 10) : undefined,
      maxRating: q.maxRating ? Number.parseInt(q.maxRating, 10) : undefined,
      from: d(q.from),
      to: d(q.to),
    };
  }

  async feedback(q: Record<string, string | undefined>) {
    const page = Math.max(1, Number.parseInt(q.page ?? '', 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(q.limit ?? '', 10) || 20));
    const r = await this.store.feedbackPage(TransportService.feedbackFilter(q), { limit, offset: (page - 1) * limit });
    return { ...r, page, limit };
  }

  feedbackStats(q: Record<string, string | undefined>) {
    return this.store.feedbackStats({ from: q.from ? new Date(q.from) : undefined, to: q.to ? new Date(q.to) : undefined });
  }

  async feedbackItem(id: string) {
    const f = isValidId(id) ? await this.store.findFeedback(id) : null;
    if (!f) throw new AppError('Feedback not found', 404, 'NOT_FOUND');
    return f;
  }

}
