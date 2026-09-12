const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const DriverStudent = require('../models/DriverStudent');
const TransportPricing = require('../models/TransportPricing');
const TransportTrip = require('../models/TransportTrip');
const DriverProfile = require('../models/DriverProfile');
const AcademySettings = require('../models/AcademySettings');
const {
  calculateDistance,
  calculateStudentMonthlyFee,
  calculateTripDriverEarnings,
  computeActualRouteKm,
  buildTripSnapshot,
  buildInitialStudentStatuses,
  getAcademyLocation,
  invalidateAcademyCache,
} = require('../services/transport.service');
const { scheduleDailyTrips } = require('../services/transport.scheduler');
const { syncEnrollmentTransportCache } = require('../services/transport.cache');

// ─── Students ────────────────────────────────────────────────────────────────

exports.listStudents = async (req, res) => {
  try {
    const filter = { isActive: true };
    if (req.query.driverId) filter.driverId = req.query.driverId;

    let query = DriverStudent.find(filter)
      .populate('studentId', 'name email')
      .populate('driverId', 'name email')
      .sort({ pickupOrder: 1, createdAt: -1 });

    let results = await query;

    // Search by name
    if (req.query.search) {
      const s = req.query.search.toLowerCase();
      results = results.filter(r =>
        (r.studentId?.name || '').toLowerCase().includes(s) ||
        (r.homeAddress || '').toLowerCase().includes(s)
      );
    }

    res.json({ success: true, data: results, total: results.length });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

/**
 * POST /api/reception/transport/students/status-by-students
 * Body: { studentIds: string[] }
 *
 * Bulk-check whether each student already has an active DriverStudent record.
 * Used by the Enrollment list page to render the "Transport pending assignment"
 * banner without issuing one request per row.
 *
 * Returns:
 *   { byStudent: {
 *       [studentId]: { assigned: true, driverStudentId, driverId, driverName }
 *                  | { assigned: false }
 *   }}
 *
 * Note: a student has at most ONE active DriverStudent (their bus seat), shared
 * across all of their transport-enabled enrollments. So we lookup by studentId,
 * not enrollmentId.
 */
exports.lookupAssignmentByStudents = async (req, res) => {
  try {
    const ids = Array.isArray(req.body?.studentIds) ? req.body.studentIds : [];
    if (ids.length === 0) {
      return res.json({ success: true, data: { byStudent: {} } });
    }

    const records = await DriverStudent.find({
      studentId: { $in: ids },
      isActive: true,
    })
      .populate('driverId', 'name')
      .select('_id studentId driverId homeLocation homeAddress')
      .lean();

    const byStudent = {};
    // Default every requested student to unassigned, then mark those we found.
    ids.forEach(id => { byStudent[String(id)] = { assigned: false }; });
    records.forEach(r => {
      byStudent[String(r.studentId)] = {
        assigned: true,
        driverStudentId: r._id,
        driverId: r.driverId?._id || r.driverId,
        driverName: r.driverId?.name || null,
        hasLocation: !!(r.homeLocation?.lat && r.homeLocation?.lng),
      };
    });

    res.json({ success: true, data: { byStudent } });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

/**
 * GET /api/reception/transport/pending-assignment-count
 *
 * Count enrollments that have transportation.enabled = true but whose student
 * does NOT have an active DriverStudent record. Used by the reception dashboard
 * to surface "X transport enrollments waiting for driver assignment".
 *
 * Implementation: two cheap queries (no per-row lookups) — distinct active
 * student-ids on the DriverStudent side, then count Enrollments whose
 * student isn't in that set.
 */
exports.countPendingTransportAssignments = async (req, res) => {
  try {
    const Enrollment = require('../models/Enrollment');

    // All students who already have a DriverStudent (any driver). Set lookup
    // is O(1) per row when we count enrollments below.
    const assignedStudentIds = await DriverStudent
      .find({ isActive: true })
      .distinct('studentId');

    // Count enrollments where transport is enabled AND the student isn't in
    // the assigned set. Pending = paid contract but no bus seat.
    const pendingCount = await Enrollment.countDocuments({
      'transportation.enabled': true,
      student: { $nin: assignedStudentIds },
    });

    res.json({ success: true, data: { pendingCount } });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

exports.enrollStudent = async (req, res) => {
  try {
    const {
      studentId, driverId, enrollmentId,
      homeLocation, homeAddress, phoneNumber,
      sessionsPerMonthOverride,
    } = req.body;

    if (!studentId || !driverId || !homeLocation?.lat || !homeLocation?.lng) {
      return res.status(400).json({ success: false, error: { message: 'studentId, driverId, and homeLocation (lat/lng) are required' } });
    }

    // Prevent duplicate active enrollment
    const existing = await DriverStudent.findOne({ studentId, isActive: true });
    if (existing) {
      return res.status(409).json({ success: false, error: { message: 'Student is already assigned to a driver' } });
    }

    // Validate driver
    const driverUser = await User.findById(driverId);
    if (!driverUser || driverUser.role !== 'driver') {
      return res.status(400).json({ success: false, error: { message: 'Invalid driver' } });
    }

    // Get active pricing
    const pricing = await TransportPricing.findOne({ isActive: true });
    if (!pricing) return res.status(400).json({ success: false, error: { message: 'No active pricing config found. Create and activate a pricing first.' } });

    // Calculate distance
    const academy = await getAcademyLocation();
    const { distanceKm, rawDistanceKm } = await calculateDistance(homeLocation.lat, homeLocation.lng);

    // Sessions per month: use override, or estimate from enrollment course schedule
    let sessionsPerMonth = sessionsPerMonthOverride || 0;
    if (!sessionsPerMonth && enrollmentId) {
      try {
        const Enrollment = require('../models/Enrollment');
        const enr = await Enrollment.findById(enrollmentId).populate('groupId', 'schedule');
        if (enr?.groupId?.schedule?.length) {
          const { estimateSessionsPerMonth } = require('../services/transport.service');
          sessionsPerMonth = estimateSessionsPerMonth(enr.groupId.schedule);
        }
      } catch { /* non-critical */ }
    }
    const sessionsWasDefaulted = !sessionsPerMonth;
    if (!sessionsPerMonth) sessionsPerMonth = 12;

    // Monthly fee
    const monthlyFee = calculateStudentMonthlyFee(distanceKm, sessionsPerMonth, pricing);

    // Assign next pickup order for this driver (used as fallback for both directions)
    const maxOrder = await DriverStudent.findOne({ driverId, isActive: true }).sort({ pickupOrder: -1 }).select('pickupOrder');
    const pickupOrder = (maxOrder?.pickupOrder || 0) + 1;

    const ds = await DriverStudent.create({
      driverId, studentId, enrollmentId: enrollmentId || null,
      homeLocation, homeAddress, phoneNumber,
      pickupOrder,
      pickupOrderToAcademy: pickupOrder,
      pickupOrderFromAcademy: pickupOrder,
      distanceKm, sessionsPerMonth, monthlyFee,
      feeBreakdown: {
        distanceKm,
        studentRatePerKm: pricing.studentRatePerKm,
        sessionsPerMonth,
        legMultiplier: pricing.legMultiplier || 3,
        pricingId: pricing._id,
        calculatedAt: new Date(),
      },
      createdBy: req.user._id,
    });

    // Refresh the Enrollment.transportation cache for ALL of this student's
    // transport-enabled enrollments (cache is keyed by student, not enrollment).
    // Failures are non-fatal — DriverStudent is the source of truth and the
    // cache can be rebuilt on the next mutation if this call drops.
    try {
      await syncEnrollmentTransportCache(studentId, { updatedBy: req.user._id });
    } catch (err) {
      console.error('[enrollStudent] cache sync failed:', err.message);
    }

    await ds.populate('studentId', 'name email');
    await ds.populate('driverId', 'name email');

    res.status(201).json({
      success: true,
      data: ds,
      ...(sessionsWasDefaulted ? { warning: 'sessionsPerMonth was not provided and could not be estimated from enrollment schedule. Defaulted to 12. Update the record with the correct value.' } : {}),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

exports.updateStudent = async (req, res) => {
  try {
    const ds = await DriverStudent.findById(req.params.id);
    if (!ds || !ds.isActive) {
      return res.status(404).json({ success: false, error: { message: 'Student transport record not found' } });
    }

    const { homeLocation, homeAddress, phoneNumber, pickupOrder, pickupOrderToAcademy, pickupOrderFromAcademy, sessionsPerMonth, driverId, notes } = req.body;

    // If location changed → recalculate distance + fee
    if (homeLocation?.lat && homeLocation?.lng) {
      const pricing = await TransportPricing.findOne({ isActive: true });
      const { distanceKm } = await calculateDistance(homeLocation.lat, homeLocation.lng);
      ds.homeLocation = homeLocation;
      ds.distanceKm = distanceKm;

      if (pricing) {
        const sessions = sessionsPerMonth ?? ds.sessionsPerMonth;
        ds.monthlyFee = calculateStudentMonthlyFee(distanceKm, sessions, pricing);
        ds.feeBreakdown = {
          distanceKm,
          studentRatePerKm: pricing.studentRatePerKm,
          sessionsPerMonth: sessions,
          legMultiplier: pricing.legMultiplier || 3,
          pricingId: pricing._id,
          calculatedAt: new Date(),
        };
      }
    }

    // If sessionsPerMonth changed independently (no location change)
    if (sessionsPerMonth !== undefined && !homeLocation?.lat) {
      const pricing = await TransportPricing.findOne({ isActive: true });
      ds.sessionsPerMonth = sessionsPerMonth;
      if (pricing) {
        ds.monthlyFee = calculateStudentMonthlyFee(ds.distanceKm, sessionsPerMonth, pricing);
        ds.feeBreakdown = {
          ...ds.feeBreakdown,
          sessionsPerMonth,
          studentRatePerKm: pricing.studentRatePerKm,
          pricingId: pricing._id,
          calculatedAt: new Date(),
        };
      }
    }

    if (homeAddress !== undefined) ds.homeAddress = homeAddress;
    if (phoneNumber !== undefined) ds.phoneNumber = phoneNumber;
    if (pickupOrder !== undefined) ds.pickupOrder = pickupOrder;
    if (pickupOrderToAcademy !== undefined) ds.pickupOrderToAcademy = pickupOrderToAcademy;
    if (pickupOrderFromAcademy !== undefined) ds.pickupOrderFromAcademy = pickupOrderFromAcademy;
    if (driverId !== undefined) ds.driverId = driverId;
    if (notes !== undefined) ds.notes = notes;
    ds.updatedBy = req.user._id;

    await ds.save();

    // Keep Enrollment.transportation cache aligned with the new DriverStudent state.
    try {
      await syncEnrollmentTransportCache(ds.studentId, { updatedBy: req.user._id });
    } catch (err) {
      console.error('[updateStudent] cache sync failed:', err.message);
    }

    await ds.populate('studentId', 'name email');
    await ds.populate('driverId', 'name email');

    res.json({ success: true, data: ds });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

exports.removeStudent = async (req, res) => {
  try {
    const ds = await DriverStudent.findById(req.params.id);
    if (!ds || !ds.isActive) {
      return res.status(404).json({ success: false, error: { message: 'Student transport record not found' } });
    }
    ds.isActive = false;
    ds.updatedBy = req.user._id;
    await ds.save();

    // Clear the Enrollment.transportation cache for this student — no active
    // bus seat means no driver, no home location, no fee estimate.
    try {
      await syncEnrollmentTransportCache(ds.studentId, { updatedBy: req.user._id });
    } catch (err) {
      console.error('[removeStudent] cache sync failed:', err.message);
    }

    res.json({ success: true, message: 'Student removed from transport' });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

// ─── Trips ────────────────────────────────────────────────────────────────────

exports.listTrips = async (req, res) => {
  try {
    const filter = {};
    if (req.query.status)   filter.status   = req.query.status;
    if (req.query.driverId) filter.driverId = req.query.driverId;
    if (req.query.date) {
      const d = new Date(req.query.date);
      const next = new Date(d); next.setDate(next.getDate() + 1);
      filter.date = { $gte: d, $lt: next };
    }

    const trips = await TransportTrip.find(filter)
      .populate('driverId', 'name profile')
      .sort({ date: -1 })
      .limit(200);

    res.json({ success: true, data: trips });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

exports.createTrip = async (req, res) => {
  try {
    const { driverId, date, direction, isExtra, extraCharge, notes, studentIds } = req.body;
    if (!driverId || !date || !direction) {
      return res.status(400).json({ success: false, error: { message: 'driverId, date, and direction are required' } });
    }

    const driverUser = await User.findById(driverId);
    if (!driverUser || driverUser.role !== 'driver') {
      return res.status(400).json({ success: false, error: { message: 'Invalid driver' } });
    }

    // Build snapshot from driver's active students
    let filter = { driverId, isActive: true };
    if (studentIds?.length) filter._id = { $in: studentIds };

    const driverStudents = await DriverStudent.find(filter).populate('studentId', 'name');

    const studentsSnapshot = buildTripSnapshot(driverStudents, direction);
    const studentStatuses  = buildInitialStudentStatuses(driverStudents);

    const trip = await TransportTrip.create({
      driverId, date: new Date(date), direction,
      isExtra: isExtra || false,
      extraCharge: extraCharge || 0,
      studentsSnapshot, studentStatuses,
      notes, createdBy: req.user._id,
    });

    res.status(201).json({ success: true, data: trip });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

exports.updateTrip = async (req, res) => {
  try {
    const trip = await TransportTrip.findById(req.params.id);
    if (!trip) return res.status(404).json({ success: false, error: { message: 'Trip not found' } });

    // Driver reassignment
    if (req.body.driverId && String(req.body.driverId) !== String(trip.driverId)) {
      trip.driverId = req.body.driverId;
      trip.driverChangedBy = req.user._id;
      trip.driverChangedAt = new Date();
    }

    // Force-advance: scheduled → in_travel
    if (req.body.status === 'in_travel') {
      if (trip.status !== 'scheduled') {
        return res.status(400).json({ success: false, error: { message: `Cannot force-start a ${trip.status} trip` } });
      }
      trip.status = 'in_travel';
      trip.startedAt = new Date();
    }

    // Force-advance: in_travel → completed
    if (req.body.status === 'completed') {
      if (trip.status !== 'in_travel') {
        return res.status(400).json({ success: false, error: { message: `Cannot force-complete a ${trip.status} trip` } });
      }
      // Self-heal missing route km via a single Google Directions call (no haversine fallback).
      if (trip.totalRouteKm == null || trip.totalRouteKm <= 0) {
        try {
          const recomputed = await computeActualRouteKm(trip.studentsSnapshot, trip.direction);
          if (recomputed != null && recomputed > 0) trip.totalRouteKm = recomputed;
        } catch (err) {
          console.error('[reception completeTrip] route km recompute failed:', err.message);
        }
      }
      const pricing = await TransportPricing.findOne({ isActive: true });
      if (pricing && trip.totalRouteKm != null && trip.totalRouteKm > 0) {
        trip.driverEarnings = calculateTripDriverEarnings(trip.studentsSnapshot, pricing, trip.totalRouteKm);
      }
      trip.status = 'completed';
      trip.completedAt = new Date();
    }

    // Cancel
    if (req.body.status === 'cancelled') {
      const allowed = { scheduled: true, in_travel: true };
      if (!allowed[trip.status]) {
        return res.status(400).json({ success: false, error: { message: `Cannot cancel a ${trip.status} trip` } });
      }
      trip.status = 'cancelled';
      trip.cancelledAt = new Date();
      trip.cancelledBy = req.user._id;
      trip.cancellationReason = req.body.cancellationReason || '';
    }

    if (req.body.notes !== undefined) trip.notes = req.body.notes;
    trip.updatedBy = req.user._id;
    await trip.save();
    res.json({ success: true, data: trip });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

/**
 * DELETE /api/reception/transport/trips/:id
 *
 * Hard-delete a trip. Refuses while the trip is in_travel — the driver is
 * actively running it, deleting under their feet would orphan student-status
 * updates and live-location pings. Cancel first (PATCH status=cancelled),
 * then delete.
 *
 * Scheduled, cancelled, and completed trips can all be removed. We let
 * reception clean up bad data even from completed trips because the audit
 * trail (driverEarnings) lives on a separate aggregation, and reception
 * staff are trusted users.
 */
exports.removeTrip = async (req, res) => {
  try {
    const trip = await TransportTrip.findById(req.params.id);
    if (!trip) return res.status(404).json({ success: false, error: { message: 'Trip not found' } });

    if (trip.status === 'in_travel') {
      return res.status(409).json({
        success: false,
        error: {
          message: 'Cannot delete a trip that is currently in progress. Cancel it first.',
          code: 'TRIP_IN_TRAVEL',
        },
      });
    }

    await TransportTrip.deleteOne({ _id: trip._id });
    res.json({ success: true, message: 'Trip deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

// ─── Drivers ─────────────────────────────────────────────────────────────────

exports.listDrivers = async (req, res) => {
  try {
    const drivers = await User.find({ role: 'driver' }).select('-passwordHash');
    const profiles = await DriverProfile.find({ userId: { $in: drivers.map(d => d._id) } });
    const profileMap = {};
    profiles.forEach(p => { profileMap[String(p.userId)] = p; });

    // Student count per driver
    const counts = await DriverStudent.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$driverId', count: { $sum: 1 } } },
    ]);
    const countMap = {};
    counts.forEach(c => { countMap[String(c._id)] = c.count; });

    const result = drivers.map(d => ({
      ...d.toObject(),
      profile_data: profileMap[String(d._id)] || null,
      studentCount: countMap[String(d._id)] || 0,
      capacity: profileMap[String(d._id)]?.vehicleCapacity || 5,
    }));

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

exports.createDriver = async (req, res) => {
  try {
    const { email, name, password, vehiclePlate, vehicleModel, vehicleColor, vehicleCapacity, phoneNumber, photoUrl, notes } = req.body;
    if (!email || !name || !password) {
      return res.status(400).json({ success: false, error: { message: 'email, name, and password are required' } });
    }

    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ success: false, error: { message: 'Email already in use' } });

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ email, name, passwordHash, role: 'driver' });

    const profile = await DriverProfile.create({
      userId: user._id,
      vehiclePlate, vehicleModel, vehicleColor,
      vehicleCapacity: vehicleCapacity || 5,
      phoneNumber, photoUrl, notes,
      createdBy: req.user._id,
    });

    const { passwordHash: _pw, ...userOut } = user.toObject();
    res.status(201).json({ success: true, data: { user: userOut, profile } });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

exports.updateDriver = async (req, res) => {
  try {
    const profile = await DriverProfile.findOne({ userId: req.params.id });
    if (!profile) return res.status(404).json({ success: false, error: { message: 'Driver profile not found' } });

    const allowed = ['vehiclePlate', 'vehicleModel', 'vehicleColor', 'vehicleCapacity', 'phoneNumber', 'photoUrl', 'isAvailable', 'notes'];
    allowed.forEach(f => { if (req.body[f] !== undefined) profile[f] = req.body[f]; });
    profile.updatedBy = req.user._id;
    await profile.save();

    // Also allow editing the User record's display fields (name, phone on user).
    // Email and role intentionally NOT editable here — changing them affects auth.
    const userPatch = {};
    if (req.body.name !== undefined)        userPatch.name = req.body.name;
    if (req.body.phoneNumber !== undefined) userPatch.phoneNumber = req.body.phoneNumber;
    if (Object.keys(userPatch).length) {
      await User.updateOne({ _id: req.params.id, role: 'driver' }, { $set: userPatch });
    }

    res.json({ success: true, data: profile });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

/**
 * DELETE /api/reception/transport/drivers/:id
 *
 * Remove a driver from the system. Refuses if the driver is still operationally
 * tied to active state (students assigned, trip in progress) — reception must
 * reassign or finish those first. This is deliberate: deleting a driver mid-
 * trip would orphan students and break the trip's history.
 *
 * On success: deletes the DriverProfile and the User record. Past completed
 * trips keep their snapshot data so historical reporting is unaffected.
 */
exports.removeDriver = async (req, res) => {
  try {
    const driver = await User.findOne({ _id: req.params.id, role: 'driver' });
    if (!driver) return res.status(404).json({ success: false, error: { message: 'Driver not found' } });

    // Safety check 1: any active students assigned to this driver?
    const activeStudentCount = await DriverStudent.countDocuments({
      driverId: driver._id, isActive: true,
    });
    if (activeStudentCount > 0) {
      return res.status(409).json({
        success: false,
        error: {
          message: `Cannot delete: this driver has ${activeStudentCount} active student(s) assigned. Please reassign them first.`,
          code: 'DRIVER_HAS_STUDENTS',
          activeStudentCount,
        },
      });
    }

    // Safety check 2: any in-flight trip?
    const activeTrip = await TransportTrip.findOne({
      driverId: driver._id,
      status: { $in: ['scheduled', 'in_travel'] },
    }).select('_id status date');
    if (activeTrip) {
      return res.status(409).json({
        success: false,
        error: {
          message: `Cannot delete: this driver has a ${activeTrip.status} trip. Cancel or complete it first.`,
          code: 'DRIVER_HAS_ACTIVE_TRIP',
          tripId: activeTrip._id,
        },
      });
    }

    // Clean delete — historical trips keep their immutable snapshot intact,
    // so we never lose audit/earnings data even after the User row is gone.
    await DriverProfile.deleteOne({ userId: driver._id });
    await User.deleteOne({ _id: driver._id });

    res.json({ success: true, message: 'Driver removed' });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

// ─── Cost Estimate ────────────────────────────────────────────────────────────

exports.costEstimate = async (req, res) => {
  try {
    const { lat, lng, sessionsPerMonth } = req.body;
    if (lat == null || lng == null) {
      return res.status(400).json({ success: false, error: { message: 'lat and lng are required' } });
    }

    const pricing = await TransportPricing.findOne({ isActive: true });
    if (!pricing) return res.status(400).json({ success: false, error: { message: 'No active pricing config found' } });

    const academy = await getAcademyLocation();
    const { distanceKm, rawDistanceKm } = await calculateDistance(lat, lng);

    const sessions = sessionsPerMonth || 12;
    const monthlyFee = calculateStudentMonthlyFee(distanceKm, sessions, pricing);

    res.json({
      success: true,
      data: {
        distanceKm,
        rawDistanceKm,
        sessionsPerMonth: sessions,
        monthlyFee,
        breakdown: {
          currency: pricing.currency,
          studentRatePerKm: pricing.studentRatePerKm,
          legMultiplier: pricing.legMultiplier || 3,
          formula: `${distanceKm} km × ${pricing.legMultiplier || 3} legs × ${sessions} sessions × ${pricing.studentRatePerKm} ${pricing.currency}/km`,
        },
        academyLocation: academy,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

// ─── Academy Location ─────────────────────────────────────────────────────────

exports.getAcademyLocation = async (req, res) => {
  try {
    const location = await getAcademyLocation();
    res.json({ success: true, data: location });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

exports.setAcademyLocation = async (req, res) => {
  try {
    const { lat, lng } = req.body;
    if (lat == null || lng == null) {
      return res.status(400).json({ success: false, error: { message: 'lat and lng are required' } });
    }
    const location = { lat: parseFloat(lat), lng: parseFloat(lng) };
    await AcademySettings.findOneAndUpdate(
      { key: 'default' },
      { location, updatedBy: req.user._id },
      { upsert: true, new: true }
    );
    invalidateAcademyCache();
    res.json({ success: true, data: location });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

// ─── Trip Auto-Generation ─────────────────────────────────────────────────────

exports.generateTrips = async (req, res) => {
  try {
    const targetDate = req.query.date ? new Date(req.query.date) : new Date();
    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({ success: false, error: { message: 'Invalid date format. Use YYYY-MM-DD.' } });
    }
    // No forceWeekend toggle anymore — the scheduler decides per-driver based on
    // group schedules. If nobody has a session that day (e.g. Fri/Sat in most
    // setups), no trips are created. Just call POST /trips/generate?date=YYYY-MM-DD
    // to backfill or test a specific date.
    const summary = await scheduleDailyTrips(targetDate);
    res.json({ success: true, data: summary });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};
