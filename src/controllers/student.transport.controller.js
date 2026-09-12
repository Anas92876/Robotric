const DriverStudent  = require('../models/DriverStudent');
const DriverProfile  = require('../models/DriverProfile');
const TransportTrip  = require('../models/TransportTrip');
const TransportTripFeedback = require('../models/TransportTripFeedback');
const User           = require('../models/User');
const { getAcademyLocation, calculateDistance, calculateStudentMonthlyFee } = require('../services/transport.service');
const TransportPricing = require('../models/TransportPricing');
const { asyncRoute, fail, ok } = require('../utils/http');

// ─── Status (today's trip + driver info + live location) ─────────────────────

exports.getTransportStatus = async (req, res) => {
  try {
    // Find this student's active DriverStudent record
    const ds = await DriverStudent.findOne({ studentId: req.user._id, isActive: true })
      .populate('driverId', 'name')
      .lean();

    if (!ds) {
      return res.json({ success: true, data: null, message: 'Not enrolled in transportation' });
    }

    // Driver profile (car info + photo)
    const driverProfile = await DriverProfile.findOne({ userId: ds.driverId?._id || ds.driverId }).lean();

    // Today's trip that includes this student
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay   = new Date(startOfDay); endOfDay.setDate(endOfDay.getDate() + 1);

    // Fetch both morning (to_academy) and afternoon (from_academy) trips for today
    const allTodayTrips = await TransportTrip.find({
      driverId: ds.driverId?._id || ds.driverId,
      date: { $gte: startOfDay, $lt: endOfDay },
      'studentsSnapshot.studentId': req.user._id,
      status: { $in: ['scheduled', 'in_travel', 'completed', 'cancelled'] },
    }).sort({ date: 1 }).lean();

    const academyLocation = await getAcademyLocation();

    const formatTrip = (trip) => {
      if (!trip) return null;
      const me = trip.studentStatuses?.find(s => String(s.studentId) === String(req.user._id));
      return {
        _id: trip._id,
        status: trip.status,
        direction: trip.direction,
        startedAt: trip.startedAt,
        completedAt: trip.completedAt,
        cancelledAt: trip.cancelledAt,
        cancellationReason: trip.cancellationReason,
        currentLocation: trip.currentLocation,
        myPickupOrder: trip.studentsSnapshot?.find(s => String(s.studentId) === String(req.user._id))?.pickupOrder || null,
        myStatus: me?.status || 'pending',
      };
    };

    const morningTrip   = allTodayTrips.find(t => t.direction === 'to_academy')   || null;
    const afternoonTrip = allTodayTrips.find(t => t.direction === 'from_academy') || null;
    // Legacy: keep top-level `trip` pointing to whichever is currently active (or most recent)
    const activeTrip = allTodayTrips.find(t => t.status === 'in_travel')
      || allTodayTrips.find(t => t.status === 'scheduled')
      || allTodayTrips[allTodayTrips.length - 1]
      || null;

    res.json({
      success: true,
      data: {
        trip: formatTrip(activeTrip),           // legacy field — active/next trip
        morningTrip: formatTrip(morningTrip),   // to_academy
        afternoonTrip: formatTrip(afternoonTrip), // from_academy
        academyLocation,
        driver: ds.driverId ? {
          _id: ds.driverId?._id || ds.driverId,
          name: ds.driverId?.name || '',
          vehiclePlate:  driverProfile?.vehiclePlate  || '',
          vehicleModel:  driverProfile?.vehicleModel  || '',
          vehicleColor:  driverProfile?.vehicleColor  || '',
          phoneNumber:   driverProfile?.phoneNumber   || '',
          photoUrl:      driverProfile?.photoUrl      || null,
        } : null,
        myTransport: {
          homeLocation:   ds.homeLocation,
          homeAddress:    ds.homeAddress,
          distanceKm:     ds.distanceKm,
          monthlyFee:     ds.monthlyFee,
          pickupOrder:    ds.pickupOrder,
          sessionsPerMonth: ds.sessionsPerMonth,
          feeBreakdown:   ds.feeBreakdown,
        },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

// ─── Driver info card ─────────────────────────────────────────────────────────

exports.getDriverInfo = async (req, res) => {
  try {
    const ds = await DriverStudent.findOne({ studentId: req.user._id, isActive: true })
      .populate('driverId', 'name email')
      .lean();

    if (!ds) return res.json({ success: true, data: null });

    const profile = await DriverProfile.findOne({ userId: ds.driverId?._id || ds.driverId }).lean();

    res.json({
      success: true,
      data: {
        name:         ds.driverId?.name || '',
        phoneNumber:  profile?.phoneNumber  || '',
        vehiclePlate: profile?.vehiclePlate || '',
        vehicleModel: profile?.vehicleModel || '',
        vehicleColor: profile?.vehicleColor || '',
        photoUrl:     profile?.photoUrl     || null,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

// ─── Trip history ─────────────────────────────────────────────────────────────

// ─── Update home location ─────────────────────────────────────────────────────

exports.updateLocation = async (req, res) => {
  try {
    const { lat, lng, homeAddress } = req.body;
    if (lat == null || lng == null) {
      return res.status(400).json({ success: false, error: { message: 'lat and lng are required' } });
    }

    const ds = await DriverStudent.findOne({ studentId: req.user._id, isActive: true });
    if (!ds) return res.status(404).json({ success: false, error: { message: 'Not enrolled in transportation' } });

    const { distanceKm, rawDistanceKm } = await calculateDistance(lat, lng);
    const pricing = await TransportPricing.findOne({ isActive: true });
    const monthlyFee = pricing
      ? calculateStudentMonthlyFee(distanceKm, ds.sessionsPerMonth, pricing)
      : ds.monthlyFee;

    ds.homeLocation = { lat, lng };
    if (homeAddress !== undefined) ds.homeAddress = homeAddress;
    ds.distanceKm = distanceKm;
    ds.monthlyFee = monthlyFee;
    ds.feeBreakdown = {
      ...ds.feeBreakdown,
      distanceKm,
      calculatedAt: new Date(),
      ...(pricing ? {
        studentRatePerKm: pricing.studentRatePerKm,
        legMultiplier: pricing.legMultiplier || 3,
        pricingId: pricing._id,
      } : {}),
    };
    ds.locationUpdatedAt = new Date();
    ds.locationUpdatedBy = req.user._id;
    await ds.save();

    res.json({
      success: true,
      data: {
        homeLocation: ds.homeLocation,
        homeAddress: ds.homeAddress,
        distanceKm,
        rawDistanceKm,
        monthlyFee,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

// ─── Trip history ─────────────────────────────────────────────────────────────

exports.getTripHistory = async (req, res) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 20;

    const trips = await TransportTrip.find({
      'studentsSnapshot.studentId': req.user._id,
      status: { $in: ['completed', 'cancelled'] },
    })
      .select('date direction status startedAt completedAt cancelledAt cancellationReason studentsSnapshot studentStatuses')
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // Bulk-load this student's existing feedback for these trips so the UI
    // can show "Edit feedback" instead of "Leave feedback" without a second
    // round trip per row.
    const myFeedbackByTrip = trips.length === 0 ? {} : await TransportTripFeedback
      .find({ studentId: req.user._id, tripId: { $in: trips.map(t => t._id) } })
      .lean()
      .then(rows => Object.fromEntries(rows.map(r => [String(r.tripId), r])));

    const result = trips.map(t => {
      const me = t.studentStatuses?.find(s => String(s.studentId) === String(req.user._id));
      const fb = myFeedbackByTrip[String(t._id)] || null;
      return {
        _id: t._id,
        date: t.date,
        direction: t.direction,
        status: t.status,
        startedAt: t.startedAt,
        completedAt: t.completedAt,
        cancelledAt: t.cancelledAt,
        cancellationReason: t.cancellationReason,
        myStatus: me?.status || null,
        studentCount: t.studentsSnapshot?.length || 0,
        myFeedback: fb ? {
          rating: fb.rating,
          comment: fb.comment,
          categories: fb.categories,
          createdAt: fb.createdAt,
          updatedAt: fb.updatedAt,
        } : null,
      };
    });

    res.json({ success: true, data: result, page, limit });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

// ─── Trip feedback ────────────────────────────────────────────────────────────
//
// Visibility model:
//   - The student who was on the trip writes & reads their own feedback here.
//   - Management reads aggregated/listed feedback via the management routes.
//   - The driver and reception have NO endpoints to see feedback. That's the
//     whole point — drivers would self-censor otherwise.

/**
 * Look up a trip and ensure the caller is allowed to leave feedback on it.
 *
 * Rules:
 *   - Trip must exist
 *   - Trip must be `completed` (no feedback for cancelled or in-progress)
 *   - Caller must be in the trip's studentsSnapshot
 *
 * Returns the trip on success; sends the error response and returns null on failure.
 */
async function findFeedbackEligibleTrip(req, res) {
  const trip = await TransportTrip.findById(req.params.tripId).lean();
  if (!trip) { fail(res, 404, 'Trip not found'); return null; }

  if (trip.status !== 'completed') {
    fail(res, 400, 'Feedback can only be left on completed trips');
    return null;
  }

  const wasOnTrip = trip.studentsSnapshot?.some(
    s => String(s.studentId) === String(req.user._id)
  );
  if (!wasOnTrip) {
    fail(res, 403, 'You were not on this trip');
    return null;
  }

  return trip;
}

/**
 * GET /api/student/transport/trips/:tripId/feedback
 * Returns the calling student's existing feedback for this trip, or null.
 */
exports.getMyTripFeedback = asyncRoute(async (req, res) => {
  const trip = await findFeedbackEligibleTrip(req, res);
  if (!trip) return;

  const fb = await TransportTripFeedback
    .findOne({ tripId: trip._id, studentId: req.user._id })
    .lean();

  ok(res, fb ? {
    _id: fb._id,
    rating: fb.rating,
    comment: fb.comment,
    categories: fb.categories,
    createdAt: fb.createdAt,
    updatedAt: fb.updatedAt,
  } : null);
});

/**
 * POST /api/student/transport/trips/:tripId/feedback
 * Body: { rating: 1-5, comment?: string, categories?: string[] }
 *
 * Upsert semantics — calling this a second time updates the existing feedback
 * (and bumps `updatedAt`). The unique index on (tripId, studentId) makes this
 * race-safe even under concurrent submissions from the same student.
 */
exports.submitTripFeedback = asyncRoute(async (req, res) => {
  const trip = await findFeedbackEligibleTrip(req, res);
  if (!trip) return;

  const { rating, comment, categories } = req.body;

  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    return fail(res, 400, 'rating is required and must be between 1 and 5');
  }
  if (comment != null && typeof comment !== 'string') {
    return fail(res, 400, 'comment must be a string');
  }
  if (categories != null && (!Array.isArray(categories) || !categories.every(c => typeof c === 'string'))) {
    return fail(res, 400, 'categories must be an array of strings');
  }

  // Reject unknown category values up-front for a clearer error than the
  // mongoose validator's default message.
  const allowed = new Set(TransportTripFeedback.CATEGORIES);
  if (categories?.some(c => !allowed.has(c))) {
    return fail(res, 400, `Each category must be one of: ${TransportTripFeedback.CATEGORIES.join(', ')}`);
  }

  const fb = await TransportTripFeedback.findOneAndUpdate(
    { tripId: trip._id, studentId: req.user._id },
    {
      $set: {
        rating,
        comment: comment || '',
        categories: categories || [],
      },
      $setOnInsert: {
        tripId: trip._id,
        studentId: req.user._id,
        driverId: trip.driverId,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
  ).lean();

  ok(res, {
    _id: fb._id,
    rating: fb.rating,
    comment: fb.comment,
    categories: fb.categories,
    createdAt: fb.createdAt,
    updatedAt: fb.updatedAt,
  });
});

// ─── Cost estimate (marketing / pre-enrollment) ───────────────────────────────
//
// Lets a not-yet-enrolled student see what monthly transport would cost them
// before visiting reception. This is intentionally a STUDENT-side mirror of the
// reception cost-estimate endpoint:
//
//   - Same calculation engine (calculateDistance + calculateStudentMonthlyFee)
//   - Same response shape so the mobile UI can match what reception sees
//   - DIFFERENT: sessionsPerMonth is auto-detected from the caller's own active
//     enrollment's group schedule when not supplied. Reception has to know the
//     student's enrollment, but the student already IS the caller — no extra
//     plumbing needed.
//
// POST /api/student/transport/cost-estimate
// Body: { lat, lng, sessionsPerMonth? }

exports.estimateCost = asyncRoute(async (req, res) => {
  const { lat, lng } = req.body || {};
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return fail(res, 400, 'lat and lng are required');
  }

  const pricing = await TransportPricing.findOne({ isActive: true }).lean();
  if (!pricing) return fail(res, 503, 'Transport pricing is not configured yet');

  // Auto-detect sessions/month from the student's own active enrollment when
  // they didn't supply a value. Falls through to a sane default of 12 (≈ thrice
  // a week × 4 weeks) if no enrollment schedule is usable — keeps the calculator
  // working for students who haven't enrolled in any course yet.
  let sessions = Number.isFinite(req.body.sessionsPerMonth) ? req.body.sessionsPerMonth : null;
  let sessionsSource = sessions ? 'provided' : 'unknown';

  if (!sessions) {
    try {
      const Enrollment = require('../models/Enrollment');
      const { estimateSessionsPerMonth } = require('../services/transport.service');
      const enr = await Enrollment.findOne({
        student: req.user._id,
        status: { $in: ['active', 'pending'] },
      })
        .sort({ createdAt: -1 })
        .populate('groupId', 'schedule')
        .lean();

      if (enr?.groupId?.schedule?.length) {
        const estimated = estimateSessionsPerMonth(enr.groupId.schedule);
        if (estimated > 0) {
          sessions = estimated;
          sessionsSource = 'auto_from_group_schedule';
        }
      }
    } catch {
      // Non-critical — falls through to default below
    }
  }

  if (!sessions) {
    sessions = 12;
    sessionsSource = 'default';
  }

  const academy = await getAcademyLocation();
  const { distanceKm, rawDistanceKm } = await calculateDistance(lat, lng);
  const monthlyFee = calculateStudentMonthlyFee(distanceKm, sessions, pricing);

  ok(res, {
    distanceKm,
    rawDistanceKm,
    sessionsPerMonth: sessions,
    sessionsSource, // 'provided' | 'auto_from_group_schedule' | 'default'
    monthlyFee,
    breakdown: {
      currency: pricing.currency,
      studentRatePerKm: pricing.studentRatePerKm,
      legMultiplier: pricing.legMultiplier || 3,
      formula: `${distanceKm} km × ${pricing.legMultiplier || 3} legs × ${sessions} sessions × ${pricing.studentRatePerKm} ${pricing.currency}/km`,
    },
    academyLocation: academy,
  });
});
