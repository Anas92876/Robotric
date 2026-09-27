import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildSnapshot, driverRatePerKm, estimateSessionsPerMonth, haversineKm, studentMonthlyFee } from '../src/modules/transport/transport-math';
import { signIn } from './helpers/auth';
import { createTestApp, type TestContext } from './helpers/test-app';

let t: TestContext;
type Session = { headers: Record<string, string>; user: { id: string } };
let rec: Record<string, string>;
let cto: Record<string, string>;
let clo: Record<string, string>;
let student: Session;
let driverId: string;
let driverHeaders: Record<string, string>;
let groupId: string;
const api = () => request(t.app);
// A home ~5 km from the default academy location (36.2021, 37.1343).
const home = { lat: 36.2471, lng: 37.1343 };
const todayName = () => ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()]!;

beforeAll(async () => {
  t = await createTestApp();
  rec = (await signIn(t, 'reception')).headers;
  cto = (await signIn(t, 'cto')).headers;
  clo = (await signIn(t, 'clo')).headers;
  const trainer = await signIn(t, 'trainer');
  student = await signIn(t, 'student');
  const courseId = (await api().post('/api/clo/courses').set(clo).send({ title: 'Bots', category: 'x', description: 'd', price: 10 })).body.data._id;
  groupId = (
    await api()
      .post('/api/clo/groups')
      .set(clo)
      .send({ name: 'G', courseId, trainerId: trainer.user.id, startDate: '2020-01-01', endDate: '2040-01-01', schedule: [{ day: todayName(), startTime: '10:00', endTime: '12:00' }] })
  ).body.data._id;
  await api().post('/api/reception/enrollments').set(rec).send({ studentId: student.user.id, courseId, groupId });
});
afterAll(async () => {
  await t.close();
});

describe('fare rules', () => {
  it('prices seats and pays drivers by tier', () => {
    expect(haversineKm({ lat: 36.2021, lng: 37.1343 }, home)).toBeCloseTo(5.0, 1);
    // 6.75 km × 3 legs × 12 sessions × 1000 = 243,000 → rounded up to 250,000.
    expect(studentMonthlyFee(6.75, 12, { studentRatePerKm: 1000, legMultiplier: 3 })).toBe(250000);
    const pricing = { driverRatePerKm: 500, driverRateTiers: [{ minStudents: 1, maxStudents: 2, ratePerKm: 700 }] };
    expect(driverRatePerKm(2, pricing)).toBe(700);
    expect(driverRatePerKm(5, pricing)).toBe(500);
    expect(estimateSessionsPerMonth([{ day: 'Monday' }, { day: 'monday' }, { day: 'Friday' }])).toBe(8.7);
    const snap = buildSnapshot(
      [
        { studentId: 'a', studentName: 'A', isActive: true, pickupOrder: 5, pickupOrderToAcademy: 2, pickupOrderFromAcademy: 1 },
        { studentId: 'b', studentName: 'B', isActive: true, pickupOrder: 1, pickupOrderToAcademy: 1, pickupOrderFromAcademy: 2 },
      ] as never,
      'to_academy',
    );
    expect(snap.map((s) => [s.studentId, s.pickupOrder])).toEqual([
      ['b', 1],
      ['a', 2],
    ]);
  });
});

describe('transport end to end', () => {
  it('seats a student, runs the day, pays the driver and collects feedback', async () => {
    // Management sets fares; a new pricing becomes the active one.
    const first = (await api().post('/api/management/transport/pricing').set(cto).send({ name: 'Old', studentRatePerKm: 500, driverRatePerKm: 300 })).body.data;
    const pricing = (await api().post('/api/management/transport/pricing').set(cto).send({ name: '2030', studentRatePerKm: 1000, driverRatePerKm: 500, driverRateTiers: [{ minStudents: 1, maxStudents: 3, ratePerKm: 800 }] })).body.data;
    expect(pricing.isActive).toBe(true);
    expect((await api().get('/api/management/transport/pricing').set(cto)).body.data.find((p: { _id: string }) => p._id === first._id).isActive).toBe(false);
    expect((await api().post('/api/management/transport/pricing').set(cto).send({ name: 'Bad', studentRatePerKm: 1, driverRatePerKm: 1, driverRateTiers: [{ minStudents: 0, ratePerKm: 1 }] })).body.message).toBe(
      'Tier 1: minStudents must be ≥ 1',
    );

    // Reception creates a driver and seats the student.
    const created = (await api().post('/api/reception/transport/drivers').set(rec).send({ email: 'drv@x.com', name: 'Samir', password: 'secret1', vehiclePlate: 'ALP-1', vehicleCapacity: 7 })).body.data;
    driverId = created.user._id;
    expect(created).toMatchObject({ user: { role: 'driver' }, profile: { vehiclePlate: 'ALP-1', vehicleCapacity: 7 } });
    const login = await api().post('/api/auth/login').send({ email: 'drv@x.com', password: 'secret1' });
    const token = login.body.token ?? login.body.data?.token;
    driverHeaders = { Authorization: `Bearer ${token}` };

    const seatRes = await api().post('/api/reception/transport/students').set(rec).send({ studentId: student.user.id, driverId, homeLocation: home, homeAddress: 'Street 1', sessionsPerMonthOverride: 12 });
    expect(seatRes.status).toBe(201);
    const seat = seatRes.body.data;
    // No Google key in tests: road ≈ straight line × 1.35 ≈ 6.75 km.
    expect(seat).toMatchObject({ studentId: { _id: student.user.id }, pickupOrder: 1, sessionsPerMonth: 12, monthlyFee: 250000 });
    expect(seat.distanceKm).toBeCloseTo(6.75, 1);
    expect((await api().post('/api/reception/transport/students').set(rec).send({ studentId: student.user.id, driverId, homeLocation: home })).status).toBe(409);
    expect((await api().post('/api/reception/transport/students/status-by-students').set(rec).send({ studentIds: [student.user.id] })).body.data.byStudent[student.user.id]).toMatchObject({ assigned: true, driverName: 'Samir', hasLocation: true });
    expect((await api().get('/api/reception/transport/drivers').set(rec)).body.data[0]).toMatchObject({ studentCount: 1, capacity: 7 });

    // Trips for today: the student has class today, so both directions are created, once.
    const gen = await api().post('/api/reception/transport/trips/generate').set(rec);
    expect(gen.body.data).toMatchObject({ created: 2, skipped: 0 });
    expect((await api().post('/api/reception/transport/trips/generate').set(rec)).body.data).toMatchObject({ created: 0, skipped: 2 });

    const today = (await api().get('/api/driver/transport/trips/today').set(driverHeaders)).body.data;
    expect(today).toHaveLength(2);
    const morning = today.find((x: { direction: string }) => x.direction === 'to_academy');
    expect(morning.studentsSnapshot[0]).toMatchObject({ studentId: student.user.id, homeLocation: home });

    // Driving: one trip at a time; statuses; completion pays the driver.
    expect((await api().patch(`/api/driver/transport/trips/${morning._id}/complete`).set(driverHeaders)).body.message).toBe('Cannot complete a scheduled trip');
    expect((await api().patch(`/api/driver/transport/trips/${morning._id}/start`).set(driverHeaders)).body.data.status).toBe('in_travel');
    const evening = today.find((x: { direction: string }) => x.direction === 'from_academy');
    expect((await api().patch(`/api/driver/transport/trips/${evening._id}/start`).set(driverHeaders)).body.error.code).toBe('TRIP_IN_PROGRESS');
    await api().patch(`/api/driver/transport/trips/${morning._id}/location`).set(driverHeaders).send({ lat: 36.22, lng: 37.13 });

    const status = await api().get('/api/student/transport/status').set(student.headers);
    expect(status.body.data).toMatchObject({ trip: { status: 'in_travel', myPickupOrder: 1, myStatus: 'pending', currentLocation: { lat: 36.22 } }, driver: { name: 'Samir', vehiclePlate: 'ALP-1' } });

    expect((await api().patch(`/api/driver/transport/trips/${morning._id}/students/${student.user.id}/status`).set(driverHeaders).send({ status: 'dropped' })).body.data[0]).toMatchObject({ status: 'dropped', arrivedAt: expect.any(String) });
    const done = (await api().patch(`/api/driver/transport/trips/${morning._id}/complete`).set(driverHeaders)).body.data;
    expect(done.status).toBe('completed');

    // Without Google the route length is unknown, so reception/management see no pay for it.
    const earnings = (await api().get('/api/driver/transport/earnings/monthly').set(driverHeaders)).body.data;
    expect(earnings).toMatchObject({ totalTrips: 1, totalStudentsServed: 1, trips: [{ appliedRatePerKm: 800 }] });

    // Feedback on the finished trip.
    expect((await api().post(`/api/student/transport/trips/${evening._id}/feedback`).set(student.headers).send({ rating: 5 })).body.message).toBe('Feedback can only be left on completed trips');
    expect((await api().post(`/api/student/transport/trips/${morning._id}/feedback`).set(student.headers).send({ rating: 4, categories: ['on_time', 'bogus'] })).body.message).toMatch(/^Each category must be one of/);
    await api().post(`/api/student/transport/trips/${morning._id}/feedback`).set(student.headers).send({ rating: 2, categories: ['late'] });
    const fb = await api().post(`/api/student/transport/trips/${morning._id}/feedback`).set(student.headers).send({ rating: 4, comment: 'Better', categories: ['on_time'] });
    expect(fb.body.data).toMatchObject({ rating: 4, comment: 'Better', categories: ['on_time'] });
    const history = (await api().get('/api/student/transport/trips/history').set(student.headers)).body.data;
    expect(history[0]).toMatchObject({ _id: morning._id, myStatus: 'dropped', myFeedback: { rating: 4 } });

    const stats = (await api().get('/api/management/transport/feedback/stats').set(cto)).body.data;
    expect(stats).toMatchObject({ overall: { avgRating: 4, count: 1 }, byDriver: [{ driverId, driverName: 'Samir', highCount: 1 }], byCategory: [{ category: 'on_time', count: 1 }] });
    expect((await api().get('/api/management/transport/overview').set(cto)).body.data).toMatchObject({ totalTrips: 1, activeStudents: 1, totalStudentRevenue: 250000 });

    // Moving house re-prices the seat.
    const moved = await api().patch('/api/student/transport/location').set(student.headers).send({ lat: 36.2021, lng: 37.1343, homeAddress: 'Next door' });
    expect(moved.body.data).toMatchObject({ homeAddress: 'Next door', distanceKm: 0, monthlyFee: 0 });

    // A driver with students can't be removed.
    expect((await api().delete(`/api/reception/transport/drivers/${driverId}`).set(rec)).body.error.code).toBe('DRIVER_HAS_STUDENTS');
    expect((await api().delete(`/api/reception/transport/students/${seat._id}`).set(rec)).body.message).toBe('Student removed from transport');
    expect((await api().get('/api/student/transport/status').set(student.headers)).body).toMatchObject({ data: null, message: 'Not enrolled in transportation' });
  });

  it('keeps the academy location in settings and quotes fares', async () => {
    expect((await api().get('/api/reception/transport/academy-location').set(rec)).body.data).toEqual({ lat: 36.2021, lng: 37.1343 });
    await api().patch('/api/reception/transport/academy-location').set(rec).send({ lat: 36.3, lng: 37.2 });
    expect((await api().get('/api/reception/transport/academy-location').set(rec)).body.data).toEqual({ lat: 36.3, lng: 37.2 });
    const quote = await api().post('/api/student/transport/cost-estimate').set(student.headers).send({ lat: 36.3, lng: 37.2 });
    expect(quote.body.data).toMatchObject({ distanceKm: 0, monthlyFee: 0, sessionsSource: 'auto_from_group_schedule', sessionsPerMonth: 4.3 });
    expect((await api().get('/api/driver/transport/profile').set(student.headers)).body.message).toBe('Access denied. Driver privileges required.');
  });
});
