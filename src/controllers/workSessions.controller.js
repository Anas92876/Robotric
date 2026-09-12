/**
 * Work Sessions Controller
 *
 * Hour tracking for hourly-paid staff.
 * Staff: clock in ("I start work"), clock out ("I end for this day"), view own history.
 * CTO: choose which staff are hourly, view everyone's sessions, fix mistakes (edit/delete).
 */

const asyncHandler = require('../utils/asyncHandler');
const { NotFoundError, BadRequestError } = require('../utils/errors');
const logger = require('../utils/logger');
const WorkSession = require('../models/WorkSession');
const User = require('../models/User');

// Sessions left open longer than this are assumed forgotten and force-closed
const MAX_SHIFT_HOURS = 12;

/**
 * Force-close any open session older than MAX_SHIFT_HOURS so a forgotten
 * clock-out never inflates hours. Closed sessions are flagged autoClosed
 * so the CTO can spot and correct them.
 */
async function autoCloseStale(userId) {
  const filter = {
    clockOut: null,
    clockIn: { $lt: new Date(Date.now() - MAX_SHIFT_HOURS * 3600000) },
  };
  if (userId) filter.user = userId;
  const stale = await WorkSession.find(filter);
  for (const session of stale) {
    session.clockOut = new Date(session.clockIn.getTime() + MAX_SHIFT_HOURS * 3600000);
    session.durationMinutes = MAX_SHIFT_HOURS * 60;
    session.autoClosed = true;
    await session.save();
    logger.warn(`Work session ${session._id} auto-closed after ${MAX_SHIFT_HOURS}h (forgotten clock-out)`);
  }
}

/** Build a clockIn date-range filter from optional from/to (YYYY-MM-DD), inclusive of the `to` day. */
function dateRangeFilter(from, to, defaultDaysBack) {
  const range = {};
  range.$gte = from ? new Date(from) : new Date(Date.now() - defaultDaysBack * 86400000);
  if (to) range.$lt = new Date(new Date(to).getTime() + 86400000);
  return range;
}

/* ============================== STAFF ============================== */

/**
 * @desc    Current clock state for the logged-in user (and whether tracking is enabled for them)
 * @route   GET /api/engineer/work/status
 * @access  Private (any staff)
 */
exports.getWorkStatus = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  await autoCloseStale(userId);
  const user = await User.findById(userId).select('isHourly').lean();
  const active = await WorkSession.findOne({ user: userId, clockOut: null }).lean();
  res.json({ success: true, data: { isHourly: !!(user && user.isHourly), active } });
});

/**
 * @desc    Clock in — "I start work"
 * @route   POST /api/engineer/work/start
 * @access  Private (hourly staff only)
 */
exports.startWork = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const user = await User.findById(userId).select('isHourly').lean();
  if (!user || !user.isHourly) {
    throw new BadRequestError('Hour tracking is not enabled for your account');
  }
  await autoCloseStale(userId);
  const existing = await WorkSession.findOne({ user: userId, clockOut: null });
  if (existing) {
    throw new BadRequestError('You are already clocked in');
  }
  const session = await WorkSession.create({ user: userId, clockIn: new Date() });
  res.status(201).json({ success: true, data: session });
});

/**
 * @desc    Clock out — "I end for this day"
 * @route   POST /api/engineer/work/stop
 * @access  Private (hourly staff only)
 */
exports.stopWork = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const session = await WorkSession.findOne({ user: userId, clockOut: null });
  if (!session) {
    throw new BadRequestError('You are not clocked in');
  }
  session.clockOut = new Date();
  session.durationMinutes = Math.max(1, Math.round((session.clockOut - session.clockIn) / 60000));
  await session.save();
  res.json({ success: true, data: session });
});

/**
 * @desc    My own session history (defaults to last 30 days)
 * @route   GET /api/engineer/work/sessions?from=YYYY-MM-DD&to=YYYY-MM-DD
 * @access  Private (any staff)
 */
exports.getMySessions = asyncHandler(async (req, res) => {
  await autoCloseStale(req.user._id);
  const { from, to } = req.query;
  const sessions = await WorkSession.find({
    user: req.user._id,
    clockIn: dateRangeFilter(from, to, 90),
  })
    .sort({ clockIn: -1 })
    .lean();
  res.json({ success: true, count: sessions.length, data: sessions });
});

/* =============================== CTO =============================== */

/**
 * @desc    All staff with their hourly flag + who is clocked in right now
 * @route   GET /api/cto/internal/work/staff
 * @access  Private (CTO)
 */
exports.getWorkStaff = asyncHandler(async (req, res) => {
  await autoCloseStale();
  const staff = await User.find({ role: { $ne: 'student' } })
    .select('_id name email role isHourly')
    .sort({ name: 1 })
    .lean();
  const open = await WorkSession.find({ clockOut: null }).select('user clockIn').lean();
  const activeMap = {};
  for (const s of open) activeMap[s.user.toString()] = s.clockIn;
  res.json({
    success: true,
    data: staff.map(u => ({
      ...u,
      isHourly: !!u.isHourly,
      workingSince: activeMap[u._id.toString()] || null,
    })),
  });
});

/**
 * @desc    Enable/disable hour tracking for a staff member
 * @route   PATCH /api/cto/internal/work/staff/:id/hourly
 * @access  Private (CTO)
 */
exports.setHourlyFlag = asyncHandler(async (req, res) => {
  const { isHourly } = req.body;
  if (typeof isHourly !== 'boolean') {
    throw new BadRequestError('isHourly must be a boolean');
  }
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { isHourly },
    { new: true }
  ).select('_id name email role isHourly');
  if (!user) throw new NotFoundError('User not found');
  res.json({ success: true, data: user });
});

/**
 * @desc    All work sessions across staff (defaults to last 7 days)
 * @route   GET /api/cto/internal/work/sessions?userId=&from=YYYY-MM-DD&to=YYYY-MM-DD
 * @access  Private (CTO)
 */
exports.getAllSessions = asyncHandler(async (req, res) => {
  await autoCloseStale();
  const { userId, from, to } = req.query;
  const filter = { clockIn: dateRangeFilter(from, to, 7) };
  if (userId) filter.user = userId;
  const sessions = await WorkSession.find(filter)
    .populate('user', 'name email role')
    .sort({ clockIn: -1 })
    .lean();
  res.json({ success: true, count: sessions.length, data: sessions });
});

/**
 * @desc    Correct a session's times (e.g. forgotten clock-out)
 * @route   PUT /api/cto/internal/work/sessions/:id
 * @access  Private (CTO)
 */
exports.updateSession = asyncHandler(async (req, res) => {
  const { clockIn, clockOut } = req.body;
  const session = await WorkSession.findById(req.params.id);
  if (!session) throw new NotFoundError('Work session not found');

  if (clockIn) session.clockIn = new Date(clockIn);
  if (clockOut !== undefined) session.clockOut = clockOut ? new Date(clockOut) : null;

  if (session.clockOut) {
    if (session.clockOut <= session.clockIn) {
      throw new BadRequestError('Clock-out must be after clock-in');
    }
    session.durationMinutes = Math.round((session.clockOut - session.clockIn) / 60000);
    session.autoClosed = false;
  } else {
    session.durationMinutes = 0;
  }
  session.editedBy = req.user._id;
  await session.save();
  await session.populate('user', 'name email role');
  res.json({ success: true, data: session });
});

/**
 * @desc    Delete a session entirely
 * @route   DELETE /api/cto/internal/work/sessions/:id
 * @access  Private (CTO)
 */
exports.deleteSession = asyncHandler(async (req, res) => {
  const session = await WorkSession.findByIdAndDelete(req.params.id);
  if (!session) throw new NotFoundError('Work session not found');
  res.json({ success: true, data: { _id: req.params.id } });
});
