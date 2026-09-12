// Driver-facing transport endpoints.
//
// Every handler is wrapped in `asyncRoute` so we don't repeat try/catch+500
// boilerplate. Trip lookups go through `findOwnedTrip` which enforces the
// ownership + state-transition rules in one place.

const TransportTrip    = require('../models/TransportTrip');
const DriverProfile    = require('../models/DriverProfile');
const DriverStudent    = require('../models/DriverStudent');
const TransportPricing = require('../models/TransportPricing');
const { asyncRoute, fail, ok, findOwnedTrip } = require('../utils/http');
const {
  notifyTripStudents,
  notifySingleStudent,
  optimizeTripOrder,
  computeActualRouteKm,
  calculateTripDriverEarnings,
  resolveDriverRatePerKm,
  getAcademyLocation,
} = require('../services/transport.service');

const VALID_STUDENT_STATUSES = ['pending', 'picked', 'dropped', 'absent'];

// ── Profile ────────────────────────────────────────────────────────────────

exports.getProfile = asyncRoute(async (req, res) => {
  const profile = await DriverProfile.findOne({ userId: req.user._id });
  if (!profile) return fail(res, 404, 'Driver profile not found');
  ok(res, profile);
});

exports.updateProfile = asyncRoute(async (req, res) => {
  const profile = await DriverProfile.findOne({ userId: req.user._id });
  if (!profile) return fail(res, 404, 'Driver profile not found');

  const ALLOWED = [
    'vehiclePlate', 'vehicleModel', 'vehicleColor', 'vehicleCapacity',
    'phoneNumber', 'photoUrl', 'isAvailable', 'homeLocation', 'notes',
  ];
  ALLOWED.forEach(f => { if (req.body[f] !== undefined) profile[f] = req.body[f]; });
  profile.updatedBy = req.user._id;
  await profile.save();

  ok(res, profile);
});

// ── My students ────────────────────────────────────────────────────────────

exports.getMyStudents = asyncRoute(async (req, res) => {
  const students = await DriverStudent.find({ driverId: req.user._id, isActive: true })
    .populate('studentId', 'name email')
    .sort({ pickupOrder: 1 })
    .lean();

  const result = students.map(ds => ({
    _id:          ds._id,
    studentId:    ds.studentId?._id || ds.studentId,
    studentName:  ds.studentId?.name || '',
    studentEmail: ds.studentId?.email || '',
    phoneNumber:  ds.phoneNumber,
    homeAddress:  ds.homeAddress,
    homeLocation: ds.homeLocation,
    pickupOrder:  ds.pickupOrder,
    distanceKm:   ds.distanceKm,
    monthlyFee:   ds.monthlyFee,
  }));

  res.json({ success: true, data: result, total: result.length });
});

// ── Trip lookup ────────────────────────────────────────────────────────────

// Date window helpers — local-time start of day.
function todayWindow(daysAhead = 1) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end   = new Date(start);
  end.setDate(end.getDate() + daysAhead);
  return { start, end };
}

exports.getSchedule = asyncRoute(async (req, res) => {
  const { start, end } = todayWindow(7);
  const trips = await TransportTrip.find({
    driverId: req.user._id,
    date: { $gte: start, $lt: end },
    status: { $in: ['scheduled', 'in_travel'] },
  }).sort({ date: 1 }).lean();
  ok(res, trips);
});

exports.getTodayTrips = asyncRoute(async (req, res) => {
  const { start, end } = todayWindow(1);
  const trips = await TransportTrip.find({
    driverId: req.user._id,
    date: { $gte: start, $lt: end },
  }).sort({ date: 1 });
  ok(res, trips);
});

exports.getTrip = asyncRoute(async (req, res) => {
  const trip = await findOwnedTrip(req, res);
  if (!trip) return;
  ok(res, trip);
});

// ── Trip lifecycle ─────────────────────────────────────────────────────────

/**
 * Apply optimizer output to a trip: reorder studentsSnapshot, renumber, set the
 * waypoint-order array, and persist totalRouteKm if Google returned one.
 *
 * Returns true on success, false on failure (caller logs but doesn't error —
 * a trip can still proceed without optimisation).
 */
async function applyOptimizationToTrip(trip) {
  try {
    const snapshotPlain = trip.toObject().studentsSnapshot;
    const { order, totalRouteKm } = await optimizeTripOrder(snapshotPlain, trip.direction);

    // Rebuild the snapshot in optimised order. Any student that didn't get a
    // position (e.g. missing location) is appended at the end so we never lose
    // them silently.
    const positioned = new Set(order.map(String));
    const reordered = order
      .map(id => snapshotPlain.find(s => String(s.studentId) === String(id)))
      .filter(Boolean);
    const leftover = snapshotPlain.filter(s => !positioned.has(String(s.studentId)));
    const finalSnapshot = [...reordered, ...leftover];
    finalSnapshot.forEach((s, i) => { s.pickupOrder = i + 1; });

    trip.studentsSnapshot.splice(0, trip.studentsSnapshot.length, ...finalSnapshot);
    trip.optimizedWaypointOrder = finalSnapshot.map((_, i) => i);
    if (totalRouteKm != null) trip.totalRouteKm = totalRouteKm;
    return true;
  } catch (err) {
    console.error('[transport.driver] optimisation failed (non-critical):', err.message);
    return false;
  }
}

exports.startTrip = asyncRoute(async (req, res) => {
  const trip = await findOwnedTrip(req, res, { transitionTo: 'in_travel' });
  if (!trip) return;

  // One driver, one active trip.
  const active = await TransportTrip.findOne({ driverId: req.user._id, status: 'in_travel' });
  if (active) {
    return fail(res, 409, 'You already have an active trip in progress', { activeTripId: active._id });
  }

  await applyOptimizationToTrip(trip);

  trip.status = 'in_travel';
  trip.startedAt = new Date();
  await trip.save();

  notifyTripStudents(trip, 'started').catch(() => {});
  ok(res, trip);
});

/**
 * Ensure totalRouteKm is set before computing earnings. If startTrip failed to
 * capture it (no API key, Google outage, legacy trip), make one more attempt
 * via the locked-in visit order. Never falls back to summed per-student km —
 * that's the overcounted number we explicitly do not want.
 */
async function ensureRouteKm(trip) {
  if (trip.totalRouteKm != null && trip.totalRouteKm > 0) return;
  try {
    const km = await computeActualRouteKm(trip.studentsSnapshot, trip.direction);
    if (km != null && km > 0) trip.totalRouteKm = km;
  } catch (err) {
    console.error('[transport.driver] route km recompute failed:', err.message);
  }
}

exports.completeTrip = asyncRoute(async (req, res) => {
  const trip = await findOwnedTrip(req, res, { transitionTo: 'completed' });
  if (!trip) return;

  await ensureRouteKm(trip);

  // Earnings stay null if Google never gave us a real km — better to show "—"
  // than fabricate a number from summed home→academy distances.
  const pricing = await TransportPricing.findOne({ isActive: true });
  if (pricing && trip.totalRouteKm != null && trip.totalRouteKm > 0) {
    trip.driverEarnings = calculateTripDriverEarnings(trip.studentsSnapshot, pricing, trip.totalRouteKm);
  }

  trip.status = 'completed';
  trip.completedAt = new Date();
  await trip.save();

  notifyTripStudents(trip, 'completed').catch(() => {});
  ok(res, trip);
});

exports.cancelTrip = asyncRoute(async (req, res) => {
  const trip = await findOwnedTrip(req, res, { transitionTo: 'cancelled' });
  if (!trip) return;

  trip.status = 'cancelled';
  trip.cancelledAt = new Date();
  trip.cancelledBy = req.user._id;
  trip.cancellationReason = req.body.reason || '';
  await trip.save();

  notifyTripStudents(trip, 'cancelled').catch(() => {});
  ok(res, trip);
});

// ── Live location ──────────────────────────────────────────────────────────

exports.updateLocation = asyncRoute(async (req, res) => {
  const { lat, lng } = req.body;
  if (lat == null || lng == null) return fail(res, 400, 'lat and lng are required');

  const trip = await findOwnedTrip(req, res);
  if (!trip) return;
  if (trip.status !== 'in_travel') {
    return fail(res, 400, 'Can only update location during an active trip');
  }

  trip.currentLocation = { lat, lng, updatedAt: new Date() };
  await trip.save();
  ok(res, { currentLocation: trip.currentLocation });
});

// ── Per-student status during a trip ───────────────────────────────────────

exports.updateStudentStatus = asyncRoute(async (req, res) => {
  const { studentId } = req.params;
  const { status } = req.body;

  if (!VALID_STUDENT_STATUSES.includes(status)) {
    return fail(res, 400, `status must be one of: ${VALID_STUDENT_STATUSES.join(', ')}`);
  }

  const trip = await findOwnedTrip(req, res);
  if (!trip) return;
  if (trip.status !== 'in_travel') {
    return fail(res, 400, 'Can only update student status during an active trip');
  }

  const studentStatus = trip.studentStatuses.find(s => String(s.studentId) === String(studentId));
  if (!studentStatus) return fail(res, 404, 'Student not found in this trip');

  studentStatus.status = status;
  if (status === 'dropped') {
    studentStatus.arrivedAt = new Date();
    notifySingleStudent(studentStatus.studentId, 'arrived', trip._id).catch(() => {});
  }
  await trip.save();
  ok(res, trip.studentStatuses);
});

// ── Monthly earnings ───────────────────────────────────────────────────────

// totalKm: ONLY the actual Google-reported route distance. Trips without a
// captured totalRouteKm count as 0 km, so we never display the overcounted
// "sum of home→academy distances" number that earlier versions used.
const tripKmOf = (t) => (t.totalRouteKm != null && t.totalRouteKm > 0) ? t.totalRouteKm : 0;

exports.getMonthlyEarnings = asyncRoute(async (req, res) => {
  const now = new Date();
  const y = parseInt(req.query.year)  || now.getFullYear();
  const m = parseInt(req.query.month) || now.getMonth() + 1;

  const start = new Date(y, m - 1, 1);
  const end   = new Date(y, m, 1);

  const [trips, pricing] = await Promise.all([
    TransportTrip.find({
      driverId: req.user._id,
      status: 'completed',
      date: { $gte: start, $lt: end },
    }).lean(),
    TransportPricing.findOne({ isActive: true }).lean(),
  ]);

  const totalEarnings = trips.reduce((s, t) => s + (t.driverEarnings || 0), 0);
  const totalStudents = trips.reduce((s, t) => s + (t.studentsSnapshot?.length || 0), 0);
  const totalKm       = trips.reduce((s, t) => s + tripKmOf(t), 0);

  ok(res, {
    year: y,
    month: m,
    totalTrips: trips.length,
    totalStudentsServed: totalStudents,
    totalEarnings: parseFloat(totalEarnings.toFixed(2)),
    totalKm: parseFloat(totalKm.toFixed(1)),
    trips: trips.map(t => {
      const studentCount = t.studentsSnapshot?.length || 0;
      return {
        _id: t._id,
        date: t.date,
        direction: t.direction,
        studentCount,
        earnings: t.driverEarnings || 0,
        totalKm: parseFloat(tripKmOf(t).toFixed(1)),
        appliedRatePerKm: pricing ? resolveDriverRatePerKm(studentCount, pricing) : null,
        completedAt: t.completedAt,
      };
    }),
  });
});

// ── Map data ───────────────────────────────────────────────────────────────

exports.getMapData = asyncRoute(async (req, res) => {
  const academyLocation = await getAcademyLocation();

  const driverStudents = await DriverStudent.find({ driverId: req.user._id, isActive: true })
    .populate('studentId', 'name')
    .lean();

  const students = driverStudents
    .filter(ds => ds.homeLocation?.lat && ds.homeLocation?.lng)
    .map(ds => ({
      studentId:    ds.studentId?._id || ds.studentId,
      studentName:  ds.studentId?.name || '',
      homeLocation: ds.homeLocation,
      homeAddress:  ds.homeAddress || '',
      phoneNumber:  ds.phoneNumber || '',
      pickupOrder:  ds.pickupOrder,
    }));

  ok(res, { academyLocation, students, total: driverStudents.length });
});
