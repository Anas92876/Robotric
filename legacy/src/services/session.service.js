const sessionRepo     = require('../repositories/session.repository');
const groupRepo       = require('../repositories/group.repository');
const attendanceRepo  = require('../repositories/attendance.repository');
const sessionEvalRepo = require('../repositories/sessionEvaluation.repository');

const { sendNotificationToUsers } = require('./notification.service');
const { AppError }                = require('../utils/errors');
const logger                      = require('../utils/logger');

// ─── Private Helpers ──────────────────────────────────────────────────────────

function _validateCreateInput({ title, groupId }) {
  if (!title || !groupId) {
    throw new AppError('Title and groupId are required', 400);
  }
}

function _resolveScheduleOverride(body) {
  const { scheduledDate: rawDate, startTime, endTime, duration: rawDuration } = body;

  if (!rawDate || !startTime || !endTime) {
    throw new AppError('Custom schedule requires date, startTime, and endTime', 400);
  }

  const scheduledDate = new Date(rawDate);
  if (Number.isNaN(scheduledDate.getTime())) {
    throw new AppError('Invalid scheduledDate', 400);
  }
  scheduledDate.setHours(0, 0, 0, 0);

  let duration = rawDuration && Number(rawDuration) > 0 ? Number(rawDuration) : null;
  if (!duration) {
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    duration = (eh * 60 + em) - (sh * 60 + sm);
  }

  if (duration <= 0) throw new AppError('endTime must be after startTime', 400);

  return { scheduledDate, startTime, endTime, duration };
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function _resolveScheduleAuto(group, sessionsCount) {
  if (!group.schedule || group.schedule.length === 0) {
    const scheduledDate = new Date();
    scheduledDate.setDate(scheduledDate.getDate() + 1);
    scheduledDate.setHours(0, 0, 0, 0);
    return { scheduledDate, startTime: '10:00', endTime: '12:00', duration: 120 };
  }

  const scheduleIndex  = sessionsCount % group.schedule.length;
  const selected       = group.schedule[scheduleIndex];
  const { startTime, endTime } = selected;

  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  const duration = (eh * 60 + em) - (sh * 60 + sm) || 120;

  const weekNumber     = Math.floor(sessionsCount / group.schedule.length);
  const targetDayIndex = DAYS.indexOf(selected.day);

  const today     = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const scheduledDate = new Date(weekStart);
  scheduledDate.setDate(weekStart.getDate() + weekNumber * 7 + targetDayIndex);
  if (scheduledDate < today) scheduledDate.setDate(scheduledDate.getDate() + 7);
  scheduledDate.setHours(0, 0, 0, 0);

  return { scheduledDate, startTime, endTime, duration };
}

function _resolveCourseId(group) {
  if (!group.courseId) return null;
  return group.courseId._id ?? group.courseId;
}

async function _sendSessionNotifications(session, group) {
  const studentIds = group.students || [];
  if (studentIds.length === 0) return;

  const formattedDate = new Date(session.scheduledDate).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric', timeZone: 'Asia/Damascus'
  });

  await sendNotificationToUsers(
    studentIds,
    'New Session Scheduled',
    `${session.title} - ${formattedDate} at ${session.startTime || 'TBD'}`,
    {
      type:      'session',
      sessionId: session._id.toString(),
      groupId:   session.groupId.toString(),
      courseId:  session.courseId ? session.courseId.toString() : null,
      screen:    'session'
    }
  );
}

function _buildSessionQuery(groupIds, { groupId, status, startDate, endDate, search }) {
  // Match sessions whose groupId is one the trainer owns
  const query = { groupId: { $in: groupIds } };
  if (groupId) query.groupId = groupId; // narrow to a specific group if filtered
  if (status)  query.status  = status;
  if (startDate || endDate) {
    query.scheduledDate = {};
    if (startDate) query.scheduledDate.$gte = new Date(startDate);
    if (endDate)   query.scheduledDate.$lte = new Date(endDate);
  }
  if (search) {
    const regex = new RegExp(search, 'i');
    query.$or = [{ title: regex }, { description: regex }];
  }
  return query;
}

function _calcDateRange(view, referenceDate) {
  switch (view) {
    case 'day': {
      const startDate = new Date(referenceDate); startDate.setHours(0, 0, 0, 0);
      const endDate   = new Date(referenceDate); endDate.setHours(23, 59, 59, 999);
      return { startDate, endDate };
    }
    case 'week': {
      const startDate = new Date(referenceDate);
      startDate.setDate(startDate.getDate() - startDate.getDay());
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 7);
      endDate.setHours(23, 59, 59, 999);
      return { startDate, endDate };
    }
    default: { // month
      const startDate = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
      const endDate   = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0);
      endDate.setHours(23, 59, 59, 999);
      return { startDate, endDate };
    }
  }
}

const SESSION_POPULATE = [
  { path: 'groupId', select: 'name students color' },
  { path: 'courseId', select: 'title category' }
];

// ─── Public API ───────────────────────────────────────────────────────────────

async function createSession(trainerId, body) {
  _validateCreateInput(body);

  const { title, description, groupId, lessonPlan, overrideSchedule } = body;

  const group = await groupRepo.findOne(
    { _id: groupId, trainerId },
    { populate: 'courseId' }
  );
  if (!group) throw new AppError('Group not found or does not belong to you', 404);

  const sessionsCount = await sessionRepo.countDocuments({ groupId });

  const schedule = overrideSchedule
    ? _resolveScheduleOverride(body)
    : _resolveScheduleAuto(group, sessionsCount);

  const session = await sessionRepo.create({
    title,
    description,
    groupId,
    courseId:         _resolveCourseId(group),
    trainerId,
    overrideSchedule: !!overrideSchedule,
    sessionNumber:    sessionsCount + 1,
    status:           'scheduled',
    lessonPlan:       lessonPlan || {},
    ...schedule
  });

  group.progress.totalSessions += 1;
  await groupRepo.save(group);

  await session.populate([
    { path: 'groupId', select: 'name students' },
    { path: 'courseId', select: 'title category' }
  ]);

  // Fire & forget — notification failure must not fail the request
  _sendSessionNotifications(session, group).catch(err =>
    logger.error('Failed to send session notifications', {
      sessionId: session._id, error: err.message
    })
  );

  return session;
}

async function getSessions(trainerId, filters = {}) {
  // Fetch all groups assigned to this trainer so we catch CLO-created sessions too
  const groups = await groupRepo.find({ trainerId });
  const groupIds = groups.map(g => g._id);

  if (groupIds.length === 0) return { groups: [], data: [] };

  const query = _buildSessionQuery(groupIds, filters);

  const sessions = await sessionRepo.find(query, {
    sort:     { scheduledDate: 1, startTime: 1 },
    populate: SESSION_POPULATE
  });

  return {
    groups,
    data: sessions.map(s => {
      const obj  = s.toObject({ virtuals: true });
      obj.status = s.getAutoStatus();
      return obj;
    }),
  };
}

async function getSessionById(sessionId, trainerId) {
  // Find session first, then verify the group belongs to this trainer
  const session = await sessionRepo.findOne({ _id: sessionId });
  if (!session) throw new AppError('Session not found', 404);

  const group = await groupRepo.findOne({ _id: session.groupId, trainerId });
  if (!group) throw new AppError('Session not found', 404);

  await session.populate([
    { path: 'groupId',     select: 'name students maxStudents color' },
    { path: 'courseId',    select: 'title category level' },
    { path: 'evaluationId' }
  ]);

  let attendance = null;
  if (session.courseId?._id) {
    attendance = await attendanceRepo.findOne({
      course:         session.courseId._id,
      'session.date': session.scheduledDate
    });
  }

  return {
    ...session.toObject({ virtuals: true }),
    status:        session.getAutoStatus(),
    hasAttendance: !!attendance,
    attendanceId:  attendance?._id || null,
    hasEvaluation: !!session.evaluationId,
    studentsCount: session.groupId?.students?.length || 0
  };
}

async function updateSession(sessionId, trainerId, updates) {
  const session = await sessionRepo.findOne({ _id: sessionId });
  if (!session) throw new AppError('Session not found', 404);
  const _ownerGroup = await groupRepo.findOne({ _id: session.groupId, trainerId });
  if (!_ownerGroup) throw new AppError('Session not found', 404);
  if (session.status === 'completed') {
    throw new AppError('Cannot update a completed session', 400);
  }

  const ALLOWED = ['title', 'description', 'lessonPlan', 'scheduledDate', 'startTime', 'endTime', 'overrideSchedule'];
  ALLOWED.forEach(field => {
    if (updates[field] !== undefined) session[field] = updates[field];
  });

  await sessionRepo.save(session);
  await session.populate([
    { path: 'groupId', select: 'name students' },
    { path: 'courseId', select: 'title category' }
  ]);

  return session;
}

async function deleteSession(sessionId, trainerId, { permanent = false, reason } = {}) {
  const session = await sessionRepo.findOne({ _id: sessionId });
  if (!session) throw new AppError('Session not found', 404);
  const _ownerGroup = await groupRepo.findOne({ _id: session.groupId, trainerId });
  if (!_ownerGroup) throw new AppError('Session not found', 404);

  if (permanent) {
    await attendanceRepo.deleteMany({ sessionId });
    await sessionEvalRepo.deleteMany({ sessionId });
    await sessionRepo.deleteById(sessionId);

    const group = await groupRepo.findOne({ _id: session.groupId });
    if (group) {
      group.progress.totalSessions = Math.max(0, group.progress.totalSessions - 1);
      await groupRepo.save(group);
    }

    return null;
  }

  session.status             = 'cancelled';
  session.cancellationReason = reason || 'Cancelled by trainer';
  await sessionRepo.save(session);

  return session;
}

async function startSession(sessionId, trainerId) {
  const session = await sessionRepo.findOne({ _id: sessionId });
  if (!session) throw new AppError('Session not found', 404);
  const _ownerGroup = await groupRepo.findOne({ _id: session.groupId, trainerId });
  if (!_ownerGroup) throw new AppError('Session not found', 404);
  if (session.status !== 'scheduled') {
    throw new AppError(`Cannot start a session with status: ${session.status}`, 400);
  }

  await session.startSession(); // model method handles save internally
  return session;
}

async function endSession(sessionId, trainerId) {
  const session = await sessionRepo.findOne({ _id: sessionId });
  if (!session) throw new AppError('Session not found', 404);
  const _ownerGroup = await groupRepo.findOne({ _id: session.groupId, trainerId });
  if (!_ownerGroup) throw new AppError('Session not found', 404);
  if (session.status !== 'in_progress') {
    throw new AppError(`Cannot end a session with status: ${session.status}`, 400);
  }

  await session.endSession(); // model method handles save internally
  return session;
}

async function getCalendarView(trainerId, view = 'month', date) {
  const referenceDate      = date ? new Date(date) : new Date();
  const { startDate, endDate } = _calcDateRange(view, referenceDate);

  const groups = await groupRepo.find({ trainerId }, { select: '_id' });
  const groupIds = groups.map(g => g._id);

  const sessions = groupIds.length === 0 ? [] : await sessionRepo.find(
    { groupId: { $in: groupIds }, scheduledDate: { $gte: startDate, $lte: endDate } },
    { sort: { scheduledDate: 1, startTime: 1 }, populate: SESSION_POPULATE }
  );

  return {
    view,
    startDate,
    endDate,
    events: sessions.map(s => ({
      id:            s._id,
      title:         s.title,
      start:         s.scheduledStartDateTime,
      end:           s.scheduledEndDateTime,
      groupName:     s.groupId?.name,
      groupColor:    s.groupId?.color || '#30c59b',
      status:        s.getAutoStatus(),
      location:      s.location,
      isOnline:      s.isOnline,
      studentsCount: s.groupId?.students?.length || 0,
      type:          s.type
    }))
  };
}

async function updateLessonPlan(sessionId, trainerId, data) {
  const session = await sessionRepo.findOne({ _id: sessionId });
  if (!session) throw new AppError('Session not found', 404);
  const _ownerGroup = await groupRepo.findOne({ _id: session.groupId, trainerId });
  if (!_ownerGroup) throw new AppError('Session not found', 404);

  session.lessonPlan = { ...session.toObject().lessonPlan, ...data };
  await sessionRepo.save(session);

  return session;
}

module.exports = {
  createSession,
  getSessions,
  getSessionById,
  updateSession,
  deleteSession,
  startSession,
  endSession,
  getCalendarView,
  updateLessonPlan
};
