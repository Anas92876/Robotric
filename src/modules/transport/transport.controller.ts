import type { Request, Response } from 'express';
import { currentUser } from '../../shared/http/request-user';
import type { UserRow } from '../users/users.table';
import type { Feedback, Pricing, Seat, Trip } from './transport.repository';
import { driverRatePerKm } from './transport-math';
import type { DriverService, StudentTransportService } from './transport-riders.service';
import type { TransportService } from './transport.service';
import type { DriverProfileRow, FeedbackRow, PricingRow, TripRow } from './transport.table';

const ref = (p: { id: string; name: string; email: string } | null, id: string) => (p ? { _id: p.id, name: p.name, email: p.email } : id);

export function seatDoc(s: Seat) {
  return {
    _id: s.id,
    driverId: ref(s.driver, s.driverId),
    studentId: ref(s.student, s.studentId),
    enrollmentId: s.enrollmentId,
    homeLocation: { lat: s.homeLat, lng: s.homeLng },
    homeAddress: s.homeAddress,
    phoneNumber: s.phoneNumber,
    pickupOrder: s.pickupOrder,
    pickupOrderToAcademy: s.pickupOrderToAcademy,
    pickupOrderFromAcademy: s.pickupOrderFromAcademy,
    distanceKm: s.distanceKm,
    sessionsPerMonth: s.sessionsPerMonth,
    monthlyFee: s.monthlyFee,
    feeBreakdown: s.feeBreakdown,
    isActive: s.isActive,
    notes: s.notes,
    locationUpdatedAt: s.locationUpdatedAt,
    locationUpdatedBy: s.locationUpdatedById,
    createdBy: s.createdById,
    updatedBy: s.updatedById,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  };
}

export function profileDoc(p: DriverProfileRow) {
  return {
    _id: p.id,
    userId: p.userId,
    vehiclePlate: p.vehiclePlate,
    vehicleModel: p.vehicleModel,
    vehicleColor: p.vehicleColor,
    vehicleCapacity: p.vehicleCapacity,
    phoneNumber: p.phoneNumber,
    photoUrl: p.photoUrl,
    isAvailable: p.isAvailable,
    homeLocation: { lat: p.homeLat, lng: p.homeLng },
    notes: p.notes,
    createdBy: p.createdById,
    updatedBy: p.updatedById,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

export function tripDoc(t: TripRow | Trip, populateDriver = false) {
  const driver = 'driver' in t && t.driver && populateDriver ? { _id: t.driver.id, name: t.driver.name, profile: t.driver.profile } : t.driverId;
  return {
    _id: t.id,
    driverId: driver,
    date: t.date,
    direction: t.direction,
    status: t.status,
    isExtra: t.isExtra,
    extraCharge: t.extraCharge,
    studentsSnapshot: t.studentsSnapshot,
    studentStatuses: t.studentStatuses,
    optimizedWaypointOrder: t.optimizedWaypointOrder,
    currentLocation: { lat: t.currentLat, lng: t.currentLng, updatedAt: t.currentLocationAt },
    driverEarnings: t.driverEarnings,
    totalRouteKm: t.totalRouteKm,
    startedAt: t.startedAt,
    completedAt: t.completedAt,
    cancelledAt: t.cancelledAt,
    cancellationReason: t.cancellationReason,
    cancelledBy: t.cancelledById,
    notes: t.notes,
    createdBy: t.createdById,
    updatedBy: t.updatedById,
    driverChangedBy: t.driverChangedById,
    driverChangedAt: t.driverChangedAt,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

function pricingDoc(p: PricingRow | Pricing) {
  const named = (name: string | null | undefined, id: string | null) => (name != null && id ? { _id: id, name } : id);
  return {
    _id: p.id,
    name: p.name,
    studentRatePerKm: p.studentRatePerKm,
    driverRatePerKm: p.driverRatePerKm,
    driverRateTiers: p.driverRateTiers,
    legMultiplier: p.legMultiplier,
    currency: p.currency,
    isActive: p.isActive,
    effectiveFrom: p.effectiveFrom,
    notes: p.notes,
    createdBy: 'createdByName' in p ? named(p.createdByName, p.createdById) : p.createdById,
    updatedBy: 'updatedByName' in p ? named(p.updatedByName, p.updatedById) : p.updatedById,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

const feedbackShort = (f: FeedbackRow) => ({ _id: f.id, rating: f.rating, comment: f.comment, categories: f.categories, createdAt: f.createdAt, updatedAt: f.updatedAt });

function userOut(u: UserRow) {
  const { passwordHash: _p, tokenVersion: _t, id, ...rest } = u;
  return { _id: id, ...rest };
}

const actorId = (req: Request) => currentUser(req).id;
const body = (req: Request) => (req.body ?? {}) as Record<string, unknown>;
const query = (req: Request) => req.query as Record<string, string | undefined>;
type IdReq = Request<{ id: string }>;

/** /api/reception/transport */
export class ReceptionTransportController {
  constructor(private readonly transport: TransportService) {}

  students = async (req: Request, res: Response) => {
    const list = await this.transport.seats(query(req));
    res.json({ success: true, data: list.map(seatDoc), total: list.length });
  };

  assign = async (req: Request, res: Response) => {
    const { seat, warning } = await this.transport.assign(actorId(req), body(req));
    res.status(201).json({ success: true, data: seatDoc(seat), ...(warning ? { warning } : {}) });
  };

  lookup = async (req: Request, res: Response) => {
    res.json({ success: true, data: { byStudent: await this.transport.assignmentsByStudents(body(req).studentIds) } });
  };

  pendingCount = async (_req: Request, res: Response) => {
    res.json({ success: true, data: { pendingCount: await this.transport.pendingAssignments() } });
  };

  updateStudent = async (req: IdReq, res: Response) => {
    res.json({ success: true, data: seatDoc(await this.transport.updateSeat(actorId(req), req.params.id, body(req))) });
  };

  removeStudent = async (req: IdReq, res: Response) => {
    await this.transport.removeSeat(actorId(req), req.params.id);
    res.json({ success: true, message: 'Student removed from transport' });
  };

  estimate = async (req: Request, res: Response) => {
    res.json({ success: true, data: await this.transport.receptionEstimate(body(req)) });
  };

  academy = async (_req: Request, res: Response) => {
    res.json({ success: true, data: await this.transport.academy() });
  };

  setAcademy = async (req: Request, res: Response) => {
    res.json({ success: true, data: await this.transport.setAcademy(body(req)) });
  };

  drivers = async (_req: Request, res: Response) => {
    const list = await this.transport.drivers();
    res.json({
      success: true,
      data: list.map((d) => ({ ...userOut(d.user), profile_data: d.profile ? profileDoc(d.profile) : null, studentCount: d.studentCount, capacity: d.profile?.vehicleCapacity ?? 5 })),
    });
  };

  createDriver = async (req: Request, res: Response) => {
    const { user, profile } = await this.transport.createDriver(actorId(req), body(req));
    res.status(201).json({ success: true, data: { user: userOut(user), profile: profileDoc(profile) } });
  };

  updateDriver = async (req: IdReq, res: Response) => {
    res.json({ success: true, data: profileDoc(await this.transport.updateDriver(actorId(req), req.params.id, body(req))) });
  };

  removeDriver = async (req: IdReq, res: Response) => {
    await this.transport.removeDriver(req.params.id);
    res.json({ success: true, message: 'Driver removed' });
  };

  trips = async (req: Request, res: Response) => {
    res.json({ success: true, data: (await this.transport.trips(query(req))).map((t) => tripDoc(t, true)) });
  };

  createTrip = async (req: Request, res: Response) => {
    res.status(201).json({ success: true, data: tripDoc(await this.transport.createTrip(actorId(req), body(req))) });
  };

  updateTrip = async (req: IdReq, res: Response) => {
    res.json({ success: true, data: tripDoc(await this.transport.updateTrip(actorId(req), req.params.id, body(req))) });
  };

  removeTrip = async (req: IdReq, res: Response) => {
    await this.transport.removeTrip(req.params.id);
    res.json({ success: true, message: 'Trip deleted' });
  };

  generate = async (req: Request, res: Response) => {
    const q = query(req);
    const date = q.date ? new Date(q.date) : new Date();
    if (Number.isNaN(date.getTime())) {
      res.status(400).json({ success: false, message: 'Invalid date format. Use YYYY-MM-DD.', error: { message: 'Invalid date format. Use YYYY-MM-DD.' } });
      return;
    }
    res.json({ success: true, data: await this.transport.generateDay(date) });
  };
}

const round2 = (n: number | null) => (n == null ? null : Number.parseFloat(n.toFixed(2)));
const feedbackItem = (f: Feedback, full = false) => ({
  ...feedbackShort(f),
  student: f.student ? { _id: f.student.id, name: f.student.name, ...(full ? { email: f.student.email } : {}) } : null,
  driver: f.driver ? { _id: f.driver.id, name: f.driver.name } : null,
  trip: f.trip ? { _id: f.trip.id, date: f.trip.date, direction: f.trip.direction, status: f.trip.status, ...(full ? { totalRouteKm: f.trip.totalRouteKm } : {}) } : null,
});

/** /api/management/transport */
export class ManagementTransportController {
  constructor(private readonly transport: TransportService) {}

  pricing = async (_req: Request, res: Response) => {
    res.json({ success: true, data: (await this.transport.pricingList()).map(pricingDoc) });
  };

  createPricing = async (req: Request, res: Response) => {
    res.status(201).json({ success: true, data: pricingDoc(await this.transport.createPricing(actorId(req), body(req))) });
  };

  updatePricing = async (req: IdReq, res: Response) => {
    res.json({ success: true, data: pricingDoc(await this.transport.updatePricing(actorId(req), req.params.id, body(req))) });
  };

  activatePricing = async (req: IdReq, res: Response) => {
    res.json({ success: true, data: pricingDoc(await this.transport.activatePricing(actorId(req), req.params.id)) });
  };

  earnings = async (req: Request, res: Response) => {
    res.json({ success: true, data: await this.transport.monthlyEarnings(query(req)) });
  };

  overview = async (req: Request, res: Response) => {
    res.json({ success: true, data: await this.transport.overview(query(req)) });
  };

  feedback = async (req: Request, res: Response) => {
    const r = await this.transport.feedback(query(req));
    res.json({ success: true, data: { data: r.rows.map((f) => feedbackItem(f)), page: r.page, limit: r.limit, total: r.total } });
  };

  feedbackStats = async (req: Request, res: Response) => {
    const s = await this.transport.feedbackStats(query(req));
    res.json({
      success: true,
      data: {
        overall: s.overall.count ? { avgRating: round2(s.overall.avgRating), count: s.overall.count } : { avgRating: null, count: 0 },
        byDriver: s.byDriver.map((d) => ({ driverId: d.driverId, driverName: d.driverName, avgRating: round2(d.avgRating), count: d.count, lowCount: d.lowCount, highCount: d.highCount })),
        byCategory: s.byCategory,
      },
    });
  };

  feedbackById = async (req: IdReq, res: Response) => {
    res.json({ success: true, data: feedbackItem(await this.transport.feedbackItem(req.params.id), true) });
  };
}

/** /api/driver/transport */
export class DriverController {
  constructor(private readonly driver: DriverService) {}

  profile = async (req: Request, res: Response) => {
    res.json({ success: true, data: profileDoc(await this.driver.profile(actorId(req))) });
  };

  updateProfile = async (req: Request, res: Response) => {
    res.json({ success: true, data: profileDoc(await this.driver.updateProfile(actorId(req), body(req))) });
  };

  students = async (req: Request, res: Response) => {
    const list = await this.driver.students(actorId(req));
    const data = list.map((s) => ({
      _id: s.id,
      studentId: s.studentId,
      studentName: s.student?.name ?? '',
      studentEmail: s.student?.email ?? '',
      phoneNumber: s.phoneNumber,
      homeAddress: s.homeAddress,
      homeLocation: { lat: s.homeLat, lng: s.homeLng },
      pickupOrder: s.pickupOrder,
      distanceKm: s.distanceKm,
      monthlyFee: s.monthlyFee,
    }));
    res.json({ success: true, data, total: data.length });
  };

  schedule = async (req: Request, res: Response) => {
    res.json({ success: true, data: (await this.driver.schedule(actorId(req))).map((t) => tripDoc(t)) });
  };

  today = async (req: Request, res: Response) => {
    res.json({ success: true, data: (await this.driver.today(actorId(req))).map((t) => tripDoc(t)) });
  };

  trip = async (req: IdReq, res: Response) => {
    res.json({ success: true, data: tripDoc(await this.driver.trip(actorId(req), req.params.id)) });
  };

  start = async (req: IdReq, res: Response) => {
    res.json({ success: true, data: tripDoc(await this.driver.start(actorId(req), req.params.id)) });
  };

  complete = async (req: IdReq, res: Response) => {
    res.json({ success: true, data: tripDoc(await this.driver.complete(actorId(req), req.params.id)) });
  };

  cancel = async (req: IdReq, res: Response) => {
    res.json({ success: true, data: tripDoc(await this.driver.cancel(actorId(req), req.params.id, body(req).reason)) });
  };

  location = async (req: IdReq, res: Response) => {
    res.json({ success: true, data: { currentLocation: await this.driver.location(actorId(req), req.params.id, body(req)) } });
  };

  studentStatus = async (req: Request<{ id: string; studentId: string }>, res: Response) => {
    res.json({ success: true, data: await this.driver.studentStatus(actorId(req), req.params.id, req.params.studentId, body(req).status) });
  };

  earnings = async (req: Request, res: Response) => {
    const { y, m, trips, pricing } = await this.driver.earnings(actorId(req), query(req));
    const kmOf = (t: TripRow) => (t.totalRouteKm && t.totalRouteKm > 0 ? t.totalRouteKm : 0);
    res.json({
      success: true,
      data: {
        year: y,
        month: m,
        totalTrips: trips.length,
        totalStudentsServed: trips.reduce((s, t) => s + t.studentsSnapshot.length, 0),
        totalEarnings: Number.parseFloat(trips.reduce((s, t) => s + (t.driverEarnings ?? 0), 0).toFixed(2)),
        totalKm: Number.parseFloat(trips.reduce((s, t) => s + kmOf(t), 0).toFixed(1)),
        trips: trips.map((t) => ({
          _id: t.id,
          date: t.date,
          direction: t.direction,
          studentCount: t.studentsSnapshot.length,
          earnings: t.driverEarnings ?? 0,
          totalKm: Number.parseFloat(kmOf(t).toFixed(1)),
          appliedRatePerKm: pricing ? driverRatePerKm(t.studentsSnapshot.length, pricing) : null,
          completedAt: t.completedAt,
        })),
      },
    });
  };

  mapData = async (req: Request, res: Response) => {
    const { academyLocation, seats } = await this.driver.mapData(actorId(req));
    const students = seats
      .filter((s) => s.homeLat != null && s.homeLng != null)
      .map((s) => ({ studentId: s.studentId, studentName: s.student?.name ?? '', homeLocation: { lat: s.homeLat, lng: s.homeLng }, homeAddress: s.homeAddress ?? '', phoneNumber: s.phoneNumber ?? '', pickupOrder: s.pickupOrder }));
    res.json({ success: true, data: { academyLocation, students, total: seats.length } });
  };
}

/** /api/student/transport */
export class StudentTransportController {
  constructor(private readonly transport: StudentTransportService) {}

  status = async (req: Request, res: Response) => {
    const me = actorId(req);
    const r = await this.transport.status(me);
    if (!r) {
      res.json({ success: true, data: null, message: 'Not enrolled in transportation' });
      return;
    }
    const format = (t: TripRow | undefined) =>
      t
        ? {
            _id: t.id,
            status: t.status,
            direction: t.direction,
            startedAt: t.startedAt,
            completedAt: t.completedAt,
            cancelledAt: t.cancelledAt,
            cancellationReason: t.cancellationReason,
            currentLocation: { lat: t.currentLat, lng: t.currentLng, updatedAt: t.currentLocationAt },
            myPickupOrder: t.studentsSnapshot.find((s) => s.studentId === me)?.pickupOrder ?? null,
            myStatus: t.studentStatuses.find((s) => s.studentId === me)?.status ?? 'pending',
          }
        : null;
    const active = r.trips.find((t) => t.status === 'in_travel') ?? r.trips.find((t) => t.status === 'scheduled') ?? r.trips[r.trips.length - 1];
    const s = r.seat;
    res.json({
      success: true,
      data: {
        trip: format(active),
        morningTrip: format(r.trips.find((t) => t.direction === 'to_academy')),
        afternoonTrip: format(r.trips.find((t) => t.direction === 'from_academy')),
        academyLocation: r.academyLocation,
        driver: {
          _id: s.driverId,
          name: s.driver?.name ?? '',
          vehiclePlate: r.profile?.vehiclePlate ?? '',
          vehicleModel: r.profile?.vehicleModel ?? '',
          vehicleColor: r.profile?.vehicleColor ?? '',
          phoneNumber: r.profile?.phoneNumber ?? '',
          photoUrl: r.profile?.photoUrl ?? null,
        },
        myTransport: {
          homeLocation: { lat: s.homeLat, lng: s.homeLng },
          homeAddress: s.homeAddress,
          distanceKm: s.distanceKm,
          monthlyFee: s.monthlyFee,
          pickupOrder: s.pickupOrder,
          sessionsPerMonth: s.sessionsPerMonth,
          feeBreakdown: s.feeBreakdown,
        },
      },
    });
  };

  driverInfo = async (req: Request, res: Response) => {
    const r = await this.transport.driver(actorId(req));
    res.json({
      success: true,
      data: r
        ? {
            name: r.seat.driver?.name ?? '',
            phoneNumber: r.profile?.phoneNumber ?? '',
            vehiclePlate: r.profile?.vehiclePlate ?? '',
            vehicleModel: r.profile?.vehicleModel ?? '',
            vehicleColor: r.profile?.vehicleColor ?? '',
            photoUrl: r.profile?.photoUrl ?? null,
          }
        : null,
    });
  };

  history = async (req: Request, res: Response) => {
    const me = actorId(req);
    const { trips, feedback, page, limit } = await this.transport.history(me, query(req));
    const data = trips.map((t) => {
      const fb = feedback.get(t.id);
      return {
        _id: t.id,
        date: t.date,
        direction: t.direction,
        status: t.status,
        startedAt: t.startedAt,
        completedAt: t.completedAt,
        cancelledAt: t.cancelledAt,
        cancellationReason: t.cancellationReason,
        myStatus: t.studentStatuses.find((s) => s.studentId === me)?.status ?? null,
        studentCount: t.studentsSnapshot.length,
        myFeedback: fb ? { rating: fb.rating, comment: fb.comment, categories: fb.categories, createdAt: fb.createdAt, updatedAt: fb.updatedAt } : null,
      };
    });
    res.json({ success: true, data, page, limit });
  };

  moveHome = async (req: Request, res: Response) => {
    res.json({ success: true, data: await this.transport.moveHome(actorId(req), body(req)) });
  };

  feedback = async (req: Request<{ tripId: string }>, res: Response) => {
    const fb = await this.transport.feedback(actorId(req), req.params.tripId);
    res.json({ success: true, data: fb ? feedbackShort(fb) : null });
  };

  rate = async (req: Request<{ tripId: string }>, res: Response) => {
    res.json({ success: true, data: feedbackShort(await this.transport.rate(actorId(req), req.params.tripId, body(req))) });
  };

  estimate = async (req: Request, res: Response) => {
    res.json({ success: true, data: await this.transport.estimate(actorId(req), body(req)) });
  };
}
