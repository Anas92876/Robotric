// Pure function tests — no DB, no HTTP
jest.mock('../models/Notification', () => ({ insertMany: jest.fn() }));
jest.mock('./notification.service', () => ({ sendNotificationToUsers: jest.fn() }), { virtual: true });
jest.mock('../services/notification.service', () => ({ sendNotificationToUsers: jest.fn() }));
// Mock Google routing so tests run without a real API key
jest.mock('../utils/googleRouting', () => ({
  getRoadDistance: jest.fn().mockResolvedValue({ roadDistanceKm: 12.5, durationMin: 18 }),
}));

const {
  calculateRoadDistance,
  calculateMonthlyFee,
  buildPricingSnapshot,
  buildTripSnapshot,
  buildInitialStudentStatuses,
} = require('../services/transport.service');

// ─── calculateRoadDistance ────────────────────────────────────────────────────

describe('calculateRoadDistance', () => {
  const ACADEMY = { lat: 36.2021, lng: 37.1343 };

  test('returns rawDistanceKm and roadDistanceKm', async () => {
    const result = await calculateRoadDistance(36.22, 37.15, ACADEMY.lat, ACADEMY.lng);
    expect(result).toHaveProperty('rawDistanceKm');
    expect(result).toHaveProperty('roadDistanceKm');
  });

  test('roadDistanceKm comes from routing API (mocked to 12.5)', async () => {
    const { roadDistanceKm } = await calculateRoadDistance(36.22, 37.15, ACADEMY.lat, ACADEMY.lng);
    expect(roadDistanceKm).toBe(12.5);
  });

  test('rawDistanceKm is Haversine straight-line (always <= road distance)', async () => {
    const { rawDistanceKm, roadDistanceKm } = await calculateRoadDistance(36.22, 37.15, ACADEMY.lat, ACADEMY.lng);
    expect(rawDistanceKm).toBeGreaterThan(0);
    expect(roadDistanceKm).toBeGreaterThanOrEqual(rawDistanceKm);
  });

  test('rawDistanceKm is rounded to 2 decimal places', async () => {
    const { rawDistanceKm } = await calculateRoadDistance(36.22, 37.15, ACADEMY.lat, ACADEMY.lng);
    expect(rawDistanceKm).toBe(parseFloat(rawDistanceKm.toFixed(2)));
  });
});

// ─── calculateMonthlyFee ──────────────────────────────────────────────────────

describe('calculateMonthlyFee', () => {
  const basePricing = { ratePerKm: 1000, tripsPerMonth: 44, minimumFee: 0 };

  test('fee = roadDistanceKm * ratePerKm * tripsPerMonth', () => {
    const fee = calculateMonthlyFee(10, basePricing);
    expect(fee).toBe(10 * 1000 * 44); // 440000
  });

  test('minimumFee floor is applied when fee is too low', () => {
    const fee = calculateMonthlyFee(0.1, { ...basePricing, minimumFee: 50000 });
    expect(fee).toBe(50000);
  });

  test('minimumFee is NOT applied when calculated fee is higher', () => {
    const fee = calculateMonthlyFee(10, { ...basePricing, minimumFee: 50000 });
    expect(fee).toBe(440000);
  });

  test('minimumFee 0 has no effect', () => {
    const fee = calculateMonthlyFee(5, { ratePerKm: 500, tripsPerMonth: 44, minimumFee: 0 });
    expect(fee).toBe(5 * 500 * 44); // 110000
  });

  test('returns a number rounded to 2 decimal places', () => {
    const fee = calculateMonthlyFee(3.333, { ratePerKm: 1000, tripsPerMonth: 44, minimumFee: 0 });
    expect(fee).toBe(parseFloat(fee.toFixed(2)));
  });

  test('zero distance returns 0 (or minimumFee if set)', () => {
    expect(calculateMonthlyFee(0, basePricing)).toBe(0);
    expect(calculateMonthlyFee(0, { ...basePricing, minimumFee: 30000 })).toBe(30000);
  });
});

// ─── buildPricingSnapshot ─────────────────────────────────────────────────────

describe('buildPricingSnapshot', () => {
  const pricing = {
    _id: 'p1',
    ratePerKm: 1000,
    tripsPerMonth: 44,
    currency: 'SYP',
  };

  test('snapshot contains all required fields', () => {
    const snap = buildPricingSnapshot(pricing);
    expect(snap.pricingId).toBe('p1');
    expect(snap.ratePerKm).toBe(1000);
    expect(snap.tripsPerMonth).toBe(44);
    expect(snap.currency).toBe('SYP');
    expect(snap.routingProvider).toBe('google');
    expect(snap.calculatedAt).toBeInstanceOf(Date);
  });

  test('snapshot does not contain roadFactor', () => {
    const snap = buildPricingSnapshot(pricing);
    expect(snap).not.toHaveProperty('roadFactor');
  });

  test('snapshot is a plain object copy — mutating pricing does not affect it', () => {
    const snap = buildPricingSnapshot(pricing);
    pricing.ratePerKm = 9999;
    expect(snap.ratePerKm).toBe(1000);
    pricing.ratePerKm = 1000; // restore
  });
});

// ─── buildTripSnapshot ────────────────────────────────────────────────────────

describe('buildTripSnapshot', () => {
  const routeStudents = [
    { isActive: true, studentId: 's1', _studentName: 'Omar',    pickupOrderToAcademy: 2, pickupOrderFromAcademy: 1, homeAddress: 'Addr A' },
    { isActive: true, studentId: 's2', _studentName: 'Sara',    pickupOrderToAcademy: 1, pickupOrderFromAcademy: 3, homeAddress: 'Addr B' },
    { isActive: true, studentId: 's3', _studentName: 'Khaled',  pickupOrderToAcademy: 3, pickupOrderFromAcademy: 2, homeAddress: 'Addr C' },
    { isActive: false, studentId: 's4', _studentName: 'Inactive', pickupOrderToAcademy: 1, pickupOrderFromAcademy: 1, homeAddress: '' },
  ];

  test('to_academy: sorted by pickupOrderToAcademy', () => {
    const snap = buildTripSnapshot(routeStudents, 'to_academy');
    expect(snap.map(s => s.studentId)).toEqual(['s2', 's1', 's3']);
    expect(snap.map(s => s.pickupOrder)).toEqual([1, 2, 3]);
  });

  test('from_academy: sorted by pickupOrderFromAcademy', () => {
    const snap = buildTripSnapshot(routeStudents, 'from_academy');
    expect(snap.map(s => s.studentId)).toEqual(['s1', 's3', 's2']);
    expect(snap.map(s => s.pickupOrder)).toEqual([1, 2, 3]);
  });

  test('inactive students are excluded', () => {
    const snap = buildTripSnapshot(routeStudents, 'to_academy');
    expect(snap.find(s => s.studentId === 's4')).toBeUndefined();
    expect(snap).toHaveLength(3);
  });

  test('homeAddress is included in snapshot', () => {
    const snap = buildTripSnapshot(routeStudents, 'to_academy');
    expect(snap[0].homeAddress).toBe('Addr B');
  });
});

// ─── buildInitialStudentStatuses ─────────────────────────────────────────────

describe('buildInitialStudentStatuses', () => {
  const routeStudents = [
    { isActive: true,  studentId: 's1' },
    { isActive: true,  studentId: 's2' },
    { isActive: false, studentId: 's3' },
  ];

  test('all active students get status pending', () => {
    const statuses = buildInitialStudentStatuses(routeStudents);
    expect(statuses).toHaveLength(2);
    statuses.forEach(s => expect(s.status).toBe('pending'));
  });

  test('inactive students are excluded', () => {
    const statuses = buildInitialStudentStatuses(routeStudents);
    expect(statuses.find(s => s.studentId === 's3')).toBeUndefined();
  });

  test('studentId is preserved', () => {
    const statuses = buildInitialStudentStatuses(routeStudents);
    expect(statuses.map(s => s.studentId)).toEqual(['s1', 's2']);
  });
});
