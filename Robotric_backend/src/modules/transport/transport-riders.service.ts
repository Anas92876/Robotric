import { isValidId } from '../../shared/db/ids';
import { AppError, BadRequestError, ForbiddenError } from '../../shared/http/errors';
import type { Trip } from './transport.repository';
import { estimateSessionsPerMonth, haversineKm, studentMonthlyFee } from './transport-math';
import { feeBreakdown, TRANSITIONS, type TransportService } from './transport.service';
import { FEEDBACK_CATEGORIES, type StudentStatus, type TripStatus } from './transport.table';

const DAY = 86400000;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const STUDENT_STATUSES = ['pending', 'picked', 'dropped', 'absent'] as const;
const VERB: Partial<Record<TripStatus, string>> = { in_travel: 'start', completed: 'complete', cancelled: 'cancel' };
const isUniqueViolation = (err: unknown) => {
  const e = err as { code?: string; cause?: { code?: string } };
  return (e?.cause?.code ?? e?.code) === '23505';
};

/** The driver's app: profile, students, today's trips and running a trip. */
export class DriverService {
  constructor(private readonly transport: TransportService) {}

  private get store() {
    return this.transport.store;
  }

  async profile(driverId: string) {
    const p = await this.store.profileOf(driverId);
    if (!p) throw new AppError('Driver profile not found', 404, 'NOT_FOUND');
    return p;
  }

  async updateProfile(driverId: string, body: Record<string, unknown>) {
    await this.profile(driverId);
    const patch = this.transport.profilePatch(body, ['vehiclePlate', 'vehicleModel', 'vehicleColor', 'vehicleCapacity', 'phoneNumber', 'photoUrl', 'isAvailable', 'homeLocation', 'notes']);
    return (await this.store.updateProfile(driverId, { ...patch, updatedById: driverId }))!;
  }

  students(driverId: string) {
    return this.store.seats({ driverId });
  }

  /** The next 7 days of open trips. */
  schedule(driverId: string) {
    const from = startOfDay(this.transport.now());
    return this.store.trips({ driverId, from, to: new Date(from.getTime() + 7 * DAY), statuses: ['scheduled', 'in_travel'], order: 'asc' });
  }

  today(driverId: string) {
    const from = startOfDay(this.transport.now());
    return this.store.trips({ driverId, from, to: new Date(from.getTime() + DAY), order: 'asc' });
  }

  async trip(driverId: string, id: string, to?: TripStatus): Promise<Trip> {
    const trip = isValidId(id) ? await this.store.findTrip(id) : null;
    if (!trip) throw new AppError('Trip not found', 404, 'NOT_FOUND');
    if (trip.driverId !== driverId) throw new ForbiddenError('Not your trip');
    if (to && !TRANSITIONS[trip.status].includes(to)) throw new BadRequestError(`Cannot ${VERB[to] ?? 'transition'} a ${trip.status} trip`);
    return trip;
  }

  /** Starting a trip orders the pickups (best route when Google is available). One trip at a time. */
  async start(driverId: string, id: string) {
    const trip = await this.trip(driverId, id, 'in_travel');
    const active = await this.store.openTripOf(driverId, ['in_travel']);
    if (active) throw new AppError('You already have an active trip in progress', 409, 'TRIP_IN_PROGRESS', { activeTripId: active.id });

    const academy = await this.transport.academy();
    const located = trip.studentsSnapshot.filter((s) => s.homeLocation?.lat != null && s.homeLocation.lng != null);
    const stops = located.map((s) => ({ lat: s.homeLocation!.lat!, lng: s.homeLocation!.lng! }));
    let order: number[] = [];
    let km: number | null = null;
    if (stops.length) {
      if (trip.direction === 'to_academy') {
        // Optimise academy → homes → academy, then drive it backwards from the farthest pickup.
        const r = await this.transport.router.optimize(academy, stops, academy);
        order = r.order.length > 1 ? [...r.order].reverse() : r.order;
        km = r.totalRouteKm;
      } else if (stops.length === 1) {
        order = [0];
      } else {
        // Drop-offs end at the farthest home.
        let far = 0;
        stops.forEach((s, i) => {
          if (haversineKm(s, academy) > haversineKm(stops[far]!, academy)) far = i;
        });
        const middle = stops.map((_, i) => i).filter((i) => i !== far);
        const r = await this.transport.router.optimize(
          academy,
          middle.map((i) => stops[i]!),
          stops[far]!,
        );
        order = [...r.order.map((i) => middle[i]!), far];
        km = r.totalRouteKm;
      }
    }
    const ordered = order.map((i) => located[i]!);
    const rest = trip.studentsSnapshot.filter((s) => !ordered.includes(s));
    const snapshot = [...ordered, ...rest].map((s, i) => ({ ...s, pickupOrder: i + 1 }));
    try {
      const updated = await this.store.updateTrip(
        trip.id,
        {
          status: 'in_travel',
          startedAt: this.transport.now(),
          studentsSnapshot: snapshot,
          optimizedWaypointOrder: snapshot.map((_, i) => i),
          ...(km != null ? { totalRouteKm: km } : {}),
        },
        ['scheduled'],
      );
      if (!updated) throw new BadRequestError('Cannot start this trip');
      await this.transport.notifier.trip(snapshot.map((s) => s.studentId), 'started', trip.id).catch(() => undefined);
      return updated;
    } catch (err) {
      if (isUniqueViolation(err)) throw new AppError('You already have an active trip in progress', 409, 'TRIP_IN_PROGRESS');
      throw err;
    }
  }

  async complete(driverId: string, id: string) {
    const trip = await this.trip(driverId, id, 'completed');
    const updated = await this.store.updateTrip(trip.id, { ...(await this.transport.closeOut(trip)), status: 'completed', completedAt: this.transport.now() }, ['in_travel']);
    if (!updated) throw new BadRequestError('Cannot complete this trip');
    await this.transport.notifier.trip(trip.studentsSnapshot.map((s) => s.studentId), 'completed', trip.id).catch(() => undefined);
    return updated;
  }

  async cancel(driverId: string, id: string, reason: unknown) {
    const trip = await this.trip(driverId, id, 'cancelled');
    const updated = await this.store.updateTrip(
      trip.id,
      { status: 'cancelled', cancelledAt: this.transport.now(), cancelledById: driverId, cancellationReason: typeof reason === 'string' ? reason : '' },
      ['scheduled', 'in_travel'],
    );
    if (!updated) throw new BadRequestError('Cannot cancel this trip');
    await this.transport.notifier.trip(trip.studentsSnapshot.map((s) => s.studentId), 'cancelled', trip.id).catch(() => undefined);
    return updated;
  }

  async location(driverId: string, id: string, body: { lat?: unknown; lng?: unknown }) {
    if (body.lat == null || body.lng == null) throw new BadRequestError('lat and lng are required');
    const lat = Number(body.lat);
    const lng = Number(body.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw new BadRequestError('lat and lng are required');
    const trip = await this.trip(driverId, id);
    if (trip.status !== 'in_travel') throw new BadRequestError('Can only update location during an active trip');
    const at = this.transport.now();
    await this.store.updateTrip(trip.id, { currentLat: lat, currentLng: lng, currentLocationAt: at });
    return { lat, lng, updatedAt: at };
  }

  async studentStatus(driverId: string, id: string, studentId: string, status: unknown): Promise<StudentStatus[]> {
    if (!STUDENT_STATUSES.includes(status as (typeof STUDENT_STATUSES)[number])) throw new BadRequestError(`status must be one of: ${STUDENT_STATUSES.join(', ')}`);
    const trip = await this.trip(driverId, id);
    if (trip.status !== 'in_travel') throw new BadRequestError('Can only update student status during an active trip');
    if (!trip.studentStatuses.some((s) => s.studentId === studentId)) throw new AppError('Student not found in this trip', 404, 'NOT_FOUND');
    const arrived = status === 'dropped' ? this.transport.now().toISOString() : null;
    const statuses = trip.studentStatuses.map((s) =>
      s.studentId === studentId ? { ...s, status: status as StudentStatus['status'], ...(arrived ? { arrivedAt: arrived } : {}) } : s,
    );
    await this.store.updateTrip(trip.id, { studentStatuses: statuses });
    if (arrived) await this.transport.notifier.trip([studentId], 'arrived', trip.id).catch(() => undefined);
    return statuses;
  }

  async earnings(driverId: string, q: Record<string, string | undefined>) {
    const now = this.transport.now();
    const y = Number.parseInt(q.year ?? '', 10) || now.getFullYear();
    const m = Number.parseInt(q.month ?? '', 10) || now.getMonth() + 1;
    const [trips, pricing] = await Promise.all([this.store.trips({ driverId, status: 'completed', from: new Date(y, m - 1, 1), to: new Date(y, m, 1), order: 'asc' }), this.store.activePricing()]);
    return { y, m, trips, pricing };
  }

  async mapData(driverId: string) {
    const [academyLocation, seats] = await Promise.all([this.transport.academy(), this.store.seats({ driverId })]);
    return { academyLocation, seats };
  }
}

/** The student's transport page: their seat, today's trips, history and feedback. */
export class StudentTransportService {
  constructor(private readonly transport: TransportService) {}

  private get store() {
    return this.transport.store;
  }

  async status(studentId: string) {
    const seat = await this.store.activeSeatOf(studentId);
    if (!seat) return null;
    const from = startOfDay(this.transport.now());
    const [profile, trips, academyLocation] = await Promise.all([
      this.store.profileOf(seat.driverId),
      this.store.tripsOfStudent(studentId, { driverId: seat.driverId, statuses: ['scheduled', 'in_travel', 'completed', 'cancelled'], from, to: new Date(from.getTime() + DAY), order: 'asc' }),
      this.transport.academy(),
    ]);
    return { seat, profile, trips, academyLocation };
  }

  async driver(studentId: string) {
    const seat = await this.store.activeSeatOf(studentId);
    if (!seat) return null;
    return { seat, profile: await this.store.profileOf(seat.driverId) };
  }

  /** Moving home re-prices the seat. */
  async moveHome(studentId: string, body: { lat?: unknown; lng?: unknown; homeAddress?: unknown }) {
    if (body.lat == null || body.lng == null) throw new BadRequestError('lat and lng are required');
    const lat = Number(body.lat);
    const lng = Number(body.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw new BadRequestError('lat and lng are required');
    const seat = await this.store.activeSeatOf(studentId);
    if (!seat) throw new AppError('Not enrolled in transportation', 404, 'NOT_FOUND');
    const { distanceKm, rawDistanceKm } = await this.transport.distance({ lat, lng });
    const pricing = await this.store.activePricing();
    const monthlyFee = pricing ? studentMonthlyFee(distanceKm, seat.sessionsPerMonth, pricing) : seat.monthlyFee;
    const now = this.transport.now();
    const updated = await this.store.updateSeat(seat.id, {
      homeLat: lat,
      homeLng: lng,
      ...(body.homeAddress !== undefined ? { homeAddress: typeof body.homeAddress === 'string' ? body.homeAddress : null } : {}),
      distanceKm,
      monthlyFee,
      feeBreakdown: pricing ? feeBreakdown(distanceKm, seat.sessionsPerMonth, pricing, now) : { ...(seat.feeBreakdown ?? { studentRatePerKm: null, sessionsPerMonth: null, legMultiplier: 3, pricingId: null }), distanceKm, calculatedAt: now.toISOString() },
      locationUpdatedAt: now,
      locationUpdatedById: studentId,
    });
    await this.store.syncEnrollmentCache(studentId, updated, studentId);
    return { homeLocation: { lat, lng }, homeAddress: updated.homeAddress, distanceKm, rawDistanceKm, monthlyFee };
  }

  async history(studentId: string, q: Record<string, string | undefined>) {
    const page = Number.parseInt(q.page ?? '', 10) || 1;
    const limit = Math.min(100, Number.parseInt(q.limit ?? '', 10) || 20);
    const trips = await this.store.tripsOfStudent(studentId, { statuses: ['completed', 'cancelled'], order: 'desc', limit, offset: (page - 1) * limit });
    const feedback = await this.store.myFeedback(
      studentId,
      trips.map((t) => t.id),
    );
    return { trips, feedback, page, limit };
  }

  private async rideable(studentId: string, tripId: string) {
    const trip = isValidId(tripId) ? await this.store.findTrip(tripId) : null;
    if (!trip) throw new AppError('Trip not found', 404, 'NOT_FOUND');
    if (trip.status !== 'completed') throw new BadRequestError('Feedback can only be left on completed trips');
    if (!trip.studentsSnapshot.some((s) => s.studentId === studentId)) throw new ForbiddenError('You were not on this trip');
    return trip;
  }

  async feedback(studentId: string, tripId: string) {
    const trip = await this.rideable(studentId, tripId);
    return (await this.store.myFeedback(studentId, [trip.id])).get(trip.id) ?? null;
  }

  async rate(studentId: string, tripId: string, body: { rating?: unknown; comment?: unknown; categories?: unknown }) {
    const trip = await this.rideable(studentId, tripId);
    const rating = body.rating;
    if (typeof rating !== 'number' || !Number.isFinite(rating) || rating < 1 || rating > 5) throw new BadRequestError('rating is required and must be between 1 and 5');
    if (body.comment != null && typeof body.comment !== 'string') throw new BadRequestError('comment must be a string');
    const categories = body.categories;
    if (categories != null && (!Array.isArray(categories) || !categories.every((c) => typeof c === 'string'))) throw new BadRequestError('categories must be an array of strings');
    if ((categories as string[] | undefined)?.some((c) => !(FEEDBACK_CATEGORIES as readonly string[]).includes(c))) {
      throw new BadRequestError(`Each category must be one of: ${FEEDBACK_CATEGORIES.join(', ')}`);
    }
    return this.store.saveFeedback({
      tripId: trip.id,
      studentId,
      driverId: trip.driverId,
      rating: Math.round(rating),
      comment: typeof body.comment === 'string' ? body.comment.slice(0, 2000) : '',
      categories: [...new Set((categories as string[] | undefined) ?? [])],
    });
  }

  async estimate(studentId: string, body: { lat?: unknown; lng?: unknown; sessionsPerMonth?: unknown }) {
    if (typeof body.lat !== 'number' || typeof body.lng !== 'number') throw new BadRequestError('lat and lng are required');
    const pricing = await this.store.activePricing();
    if (!pricing) throw new AppError('Transport pricing is not configured yet', 503, 'SERVICE_UNAVAILABLE');
    let sessions = typeof body.sessionsPerMonth === 'number' && Number.isFinite(body.sessionsPerMonth) ? body.sessionsPerMonth : 0;
    let source = sessions ? 'provided' : 'unknown';
    if (!sessions) {
      sessions = estimateSessionsPerMonth(await this.store.latestGroupSchedule(studentId));
      if (sessions) source = 'auto_from_group_schedule';
    }
    if (!sessions) {
      sessions = 12;
      source = 'default';
    }
    const quote = await this.transport.estimate({ lat: body.lat, lng: body.lng }, sessions, pricing);
    return { ...quote, sessionsSource: source };
  }
}
