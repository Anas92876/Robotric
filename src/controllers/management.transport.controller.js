const TransportPricing = require('../models/TransportPricing');
const TransportTrip    = require('../models/TransportTrip');
const TransportTripFeedback = require('../models/TransportTripFeedback');
const DriverProfile    = require('../models/DriverProfile');
const DriverStudent    = require('../models/DriverStudent');
const User             = require('../models/User');
const { resolveDriverRatePerKm } = require('../services/transport.service');
const { asyncRoute, fail, ok } = require('../utils/http');

function validateTiers(tiers) {
  if (!Array.isArray(tiers)) return 'driverRateTiers must be an array';
  for (let i = 0; i < tiers.length; i++) {
    const t = tiers[i];
    if (t.minStudents == null || t.minStudents < 1) return `Tier ${i + 1}: minStudents must be ≥ 1`;
    if (t.ratePerKm == null || t.ratePerKm < 0)    return `Tier ${i + 1}: ratePerKm must be ≥ 0`;
    if (t.maxStudents != null && t.maxStudents < t.minStudents)
      return `Tier ${i + 1}: maxStudents must be ≥ minStudents`;
  }
  return null;
}

// ─── Pricing ──────────────────────────────────────────────────────────────────

exports.listPricing = async (req, res) => {
  try {
    const records = await TransportPricing.find()
      .sort({ createdAt: -1 })
      .populate('createdBy', 'name')
      .populate('updatedBy', 'name');
    res.json({ success: true, data: records });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

exports.createPricing = async (req, res) => {
  try {
    const { name, studentRatePerKm, driverRatePerKm, driverRateTiers, currency, effectiveFrom, notes } = req.body;
    if (!name || studentRatePerKm == null || driverRatePerKm == null) {
      return res.status(400).json({ success: false, error: { message: 'name, studentRatePerKm and driverRatePerKm are required' } });
    }

    if (driverRateTiers != null) {
      const err = validateTiers(driverRateTiers);
      if (err) return res.status(400).json({ success: false, error: { message: err } });
    }

    // New pricing always becomes the active one — deactivate all others first
    await TransportPricing.updateMany({}, { isActive: false });

    const pricing = await TransportPricing.create({
      name,
      studentRatePerKm,
      driverRatePerKm,
      driverRateTiers: driverRateTiers || [],
      currency: currency || 'SYP',
      effectiveFrom: effectiveFrom || new Date(),
      notes,
      isActive: true,
      createdBy: req.user._id,
    });

    res.status(201).json({ success: true, data: pricing });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

exports.updatePricing = async (req, res) => {
  try {
    const pricing = await TransportPricing.findById(req.params.id);
    if (!pricing) return res.status(404).json({ success: false, error: { message: 'Pricing not found' } });

    if (req.body.driverRateTiers != null) {
      const err = validateTiers(req.body.driverRateTiers);
      if (err) return res.status(400).json({ success: false, error: { message: err } });
    }

    const allowed = ['name', 'studentRatePerKm', 'driverRatePerKm', 'driverRateTiers', 'legMultiplier', 'currency', 'effectiveFrom', 'notes'];
    allowed.forEach(f => { if (req.body[f] !== undefined) pricing[f] = req.body[f]; });
    pricing.updatedBy = req.user._id;
    await pricing.save();

    res.json({ success: true, data: pricing });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

exports.activatePricing = async (req, res) => {
  try {
    const pricing = await TransportPricing.findById(req.params.id);
    if (!pricing) return res.status(404).json({ success: false, error: { message: 'Pricing not found' } });

    // Deactivate all others
    await TransportPricing.updateMany({ _id: { $ne: pricing._id } }, { isActive: false });

    pricing.isActive = true;
    pricing.updatedBy = req.user._id;
    await pricing.save();

    res.json({ success: true, data: pricing });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

// ─── Earnings ─────────────────────────────────────────────────────────────────

exports.getMonthlyEarnings = async (req, res) => {
  try {
    const { year, month } = req.query;
    const now = new Date();
    const y = parseInt(year) || now.getFullYear();
    const m = parseInt(month) || now.getMonth() + 1;

    const start = new Date(y, m - 1, 1);
    const end   = new Date(y, m, 1);

    const trips = await TransportTrip.find({
      status: 'completed',
      date: { $gte: start, $lt: end },
    }).lean();

    // Group by driver
    const byDriver = {};
    for (const trip of trips) {
      const dId = trip.driverId.toString();
      if (!byDriver[dId]) byDriver[dId] = { driverId: dId, trips: 0, students: 0, earnings: 0 };
      byDriver[dId].trips += 1;
      byDriver[dId].students += trip.studentsSnapshot?.length || 0;
      byDriver[dId].earnings += trip.driverEarnings || 0;
    }

    // Attach driver names
    const driverIds = Object.keys(byDriver);
    const drivers = await User.find({ _id: { $in: driverIds } }).select('name').lean();
    const profiles = await DriverProfile.find({ userId: { $in: driverIds } }).lean();

    const nameMap = {};
    drivers.forEach(d => { nameMap[d._id.toString()] = d.name; });
    const profileMap = {};
    profiles.forEach(p => { profileMap[p.userId.toString()] = p; });

    const summary = Object.values(byDriver).map(entry => ({
      ...entry,
      earnings: parseFloat(entry.earnings.toFixed(2)),
      driverName: nameMap[entry.driverId] || 'Unknown',
      vehiclePlate: profileMap[entry.driverId]?.vehiclePlate || '',
    }));

    res.json({ success: true, data: { year: y, month: m, drivers: summary } });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

exports.getOverview = async (req, res) => {
  try {
    const { year, month } = req.query;
    const now = new Date();
    const y = parseInt(year) || now.getFullYear();
    const m = parseInt(month) || now.getMonth() + 1;

    const start = new Date(y, m - 1, 1);
    const end   = new Date(y, m, 1);

    const [trips, activeStudents] = await Promise.all([
      TransportTrip.find({ status: 'completed', date: { $gte: start, $lt: end } }).lean(),
      DriverStudent.countDocuments({ isActive: true }),
    ]);

    const totalDriverCost = trips.reduce((s, t) => s + (t.driverEarnings || 0), 0);

    // Student revenue = sum of all active student monthly fees
    const studentFees = await DriverStudent.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: null, totalRevenue: { $sum: '$monthlyFee' } } },
    ]);
    const totalStudentRevenue = studentFees[0]?.totalRevenue || 0;

    res.json({
      success: true,
      data: {
        year: y,
        month: m,
        totalTrips: trips.length,
        activeStudents,
        totalStudentRevenue: parseFloat(totalStudentRevenue.toFixed(2)),
        totalDriverCost: parseFloat(totalDriverCost.toFixed(2)),
        netProfit: parseFloat((totalStudentRevenue - totalDriverCost).toFixed(2)),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

// ─── Trip feedback ────────────────────────────────────────────────────────────
//
// Read-side endpoints for the feedback that students leave on completed trips.
// Mounted under the management router, so the requireManagement middleware on
// that router already restricts these to cto / admin / superadmin. Drivers and
// reception never see this data.

/**
 * GET /api/management/transport/feedback
 *
 * Query params (all optional):
 *   page          number, default 1
 *   limit         number, default 20 (capped at 100)
 *   driverId      filter by driver
 *   tripId        filter by a specific trip
 *   minRating     only return feedback with rating >= this value
 *   maxRating     only return feedback with rating <= this value
 *   from, to      ISO date strings — filter by createdAt
 *
 * Response shape includes paginated rows plus a `total` count so the UI can
 * render proper pagination controls.
 */
exports.listFeedback = asyncRoute(async (req, res) => {
  const page  = Math.max(1, parseInt(req.query.page)  || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));

  const where = {};
  if (req.query.driverId) where.driverId = req.query.driverId;
  if (req.query.tripId)   where.tripId   = req.query.tripId;

  if (req.query.minRating || req.query.maxRating) {
    where.rating = {};
    if (req.query.minRating) where.rating.$gte = parseInt(req.query.minRating);
    if (req.query.maxRating) where.rating.$lte = parseInt(req.query.maxRating);
  }

  if (req.query.from || req.query.to) {
    where.createdAt = {};
    if (req.query.from) where.createdAt.$gte = new Date(req.query.from);
    if (req.query.to)   where.createdAt.$lte = new Date(req.query.to);
  }

  const [rows, total] = await Promise.all([
    TransportTripFeedback.find(where)
      .populate('studentId', 'name')
      .populate('driverId', 'name')
      .populate('tripId', 'date direction status')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    TransportTripFeedback.countDocuments(where),
  ]);

  const data = rows.map(r => ({
    _id: r._id,
    rating: r.rating,
    comment: r.comment,
    categories: r.categories,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    student: r.studentId ? { _id: r.studentId._id, name: r.studentId.name } : null,
    driver:  r.driverId  ? { _id: r.driverId._id,  name: r.driverId.name }  : null,
    trip:    r.tripId    ? {
      _id: r.tripId._id, date: r.tripId.date,
      direction: r.tripId.direction, status: r.tripId.status,
    } : null,
  }));

  ok(res, { data, page, limit, total });
});

/**
 * GET /api/management/transport/feedback/stats
 *
 * Aggregated quality signals — per-driver average rating, total count, and the
 * count of low-rated (<= 2 stars) feedback. Useful for spotting drivers whose
 * service is slipping without scrolling the raw list.
 */
exports.getFeedbackStats = asyncRoute(async (req, res) => {
  // Optional date window — defaults to "all time".
  const match = {};
  if (req.query.from || req.query.to) {
    match.createdAt = {};
    if (req.query.from) match.createdAt.$gte = new Date(req.query.from);
    if (req.query.to)   match.createdAt.$lte = new Date(req.query.to);
  }

  const [byDriver, byCategory, overall] = await Promise.all([
    TransportTripFeedback.aggregate([
      { $match: match },
      { $group: {
        _id: '$driverId',
        avgRating:  { $avg: '$rating' },
        count:      { $sum: 1 },
        lowCount:   { $sum: { $cond: [{ $lte: ['$rating', 2] }, 1, 0] } },
        highCount:  { $sum: { $cond: [{ $gte: ['$rating', 4] }, 1, 0] } },
      } },
      { $sort: { avgRating: 1 } }, // worst first — that's what management wants to act on
    ]),

    TransportTripFeedback.aggregate([
      { $match: match },
      { $unwind: '$categories' },
      { $group: { _id: '$categories', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),

    TransportTripFeedback.aggregate([
      { $match: match },
      { $group: {
        _id: null,
        avgRating: { $avg: '$rating' },
        count:     { $sum: 1 },
      } },
    ]),
  ]);

  // Hydrate driver names — single round trip rather than a $lookup
  const driverIds = byDriver.map(r => r._id).filter(Boolean);
  const drivers = driverIds.length === 0
    ? []
    : await User.find({ _id: { $in: driverIds } }).select('name').lean();
  const nameById = Object.fromEntries(drivers.map(d => [String(d._id), d.name]));

  ok(res, {
    overall: overall[0]
      ? { avgRating: round2(overall[0].avgRating), count: overall[0].count }
      : { avgRating: null, count: 0 },
    byDriver: byDriver.map(r => ({
      driverId:  r._id,
      driverName: nameById[String(r._id)] || null,
      avgRating: round2(r.avgRating),
      count:     r.count,
      lowCount:  r.lowCount,
      highCount: r.highCount,
    })),
    byCategory: byCategory.map(r => ({ category: r._id, count: r.count })),
  });
});

function round2(n) {
  return n == null ? null : parseFloat(n.toFixed(2));
}

/**
 * GET /api/management/transport/feedback/:id
 * Single feedback record with populated student/driver/trip.
 */
exports.getFeedbackById = asyncRoute(async (req, res) => {
  const r = await TransportTripFeedback.findById(req.params.id)
    .populate('studentId', 'name email')
    .populate('driverId', 'name')
    .populate('tripId', 'date direction status totalRouteKm')
    .lean();
  if (!r) return fail(res, 404, 'Feedback not found');

  ok(res, {
    _id: r._id,
    rating: r.rating,
    comment: r.comment,
    categories: r.categories,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    student: r.studentId ? { _id: r.studentId._id, name: r.studentId.name, email: r.studentId.email } : null,
    driver:  r.driverId  ? { _id: r.driverId._id,  name: r.driverId.name }  : null,
    trip:    r.tripId    ? {
      _id: r.tripId._id, date: r.tripId.date,
      direction: r.tripId.direction, status: r.tripId.status,
      totalRouteKm: r.tripId.totalRouteKm,
    } : null,
  });
});
