/**
 * CLO Sessions Service
 *
 * Mirrors session.service.js but without trainer ownership constraints.
 * CLO can read, create, update, and delete sessions for any group.
 */

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

function _buildSessionQuery(filters) {
  const { groupId, status, startDate, endDate, search } = filters;
  const query = {};
  if (groupId)  query.groupId = groupId;
  if (status)   query.status  = status;
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

const SESSION_POPULATE = [
  { path: 'groupId',  select: 'name students color' },
  { path: 'courseId', select: 'title category' }
];

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * List all sessions (CLO can see all, optionally filtered)
 */
async function getSessions(filters = {}) {
  const query = _buildSessionQuery(filters);

  const sessions = await sessionRepo.find(query, {
    sort:     { scheduledDate: 1, startTime: 1 },
    populate: SESSION_POPULATE
  });

  return sessions.map(s => {
    const obj  = s.toObject({ virtuals: true });
    obj.status = s.getAutoStatus();
    return obj;
  });
}

/**
 * Get a single session by ID (CLO can access any session)
 */
async function getSessionById(sessionId) {
  const session = await sessionRepo.findOne({ _id: sessionId });
  if (!session) throw new AppError('Session not found', 404);

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

/**
 * Create a session for any group (CLO is not bound to be the group's trainer)
 */
async function createSession(cloUserId, body) {
  _validateCreateInput(body);

  const { title, description, groupId, lessonPlan, overrideSchedule, video } = body;

  // CLO can access any group — no trainerId constraint
  const group = await groupRepo.findOne({ _id: groupId }, { populate: 'courseId' });
  if (!group) throw new AppError('Group not found', 404);

  const sessionsCount = await sessionRepo.countDocuments({ groupId });

  const schedule = overrideSchedule
    ? _resolveScheduleOverride(body)
    : _resolveScheduleAuto(group, sessionsCount);

  // Use the group's trainerId for the session so trainer can still see it
  const trainerId = group.trainerId ?? cloUserId;

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
    video: {
      hasVideo:  !!(video?.hasVideo && video?.youtubeId?.trim()),
      youtubeId: video?.youtubeId?.trim() || ''
    },
    ...schedule
  });

  group.progress.totalSessions += 1;
  await groupRepo.save(group);

  await session.populate([
    { path: 'groupId',  select: 'name students' },
    { path: 'courseId', select: 'title category' }
  ]);

  _sendSessionNotifications(session, group).catch(err =>
    logger.error('CLO: Failed to send session notifications', {
      sessionId: session._id, error: err.message
    })
  );

  return session;
}

/**
 * Update any session (CLO not restricted by trainer ownership)
 */
async function updateSession(sessionId, updates) {
  const session = await sessionRepo.findOne({ _id: sessionId });
  if (!session) throw new AppError('Session not found', 404);
  // CLO can edit sessions regardless of status

  const ALLOWED = ['title', 'description', 'lessonPlan', 'scheduledDate', 'startTime', 'endTime', 'overrideSchedule', 'video'];
  ALLOWED.forEach(field => {
    if (updates[field] !== undefined) {
      if (field === 'video') {
        session.video = {
          hasVideo:  !!(updates.video?.hasVideo && updates.video?.youtubeId?.trim()),
          youtubeId: updates.video?.youtubeId?.trim() || ''
        };
      } else {
        session[field] = updates[field];
      }
    }
  });

  await sessionRepo.save(session);
  await session.populate([
    { path: 'groupId',  select: 'name students' },
    { path: 'courseId', select: 'title category' }
  ]);

  return session;
}

/**
 * Delete (cancel or permanently remove) any session
 */
async function deleteSession(sessionId, { permanent = false, reason } = {}) {
  const session = await sessionRepo.findOne({ _id: sessionId });
  if (!session) throw new AppError('Session not found', 404);

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
  session.cancellationReason = reason || 'Cancelled by CLO';
  await sessionRepo.save(session);

  return session;
}

/**
 * Update lesson plan for any session
 */
async function updateLessonPlan(sessionId, data) {
  const session = await sessionRepo.findOne({ _id: sessionId });
  if (!session) throw new AppError('Session not found', 404);

  session.lessonPlan = { ...session.toObject().lessonPlan, ...data };
  await sessionRepo.save(session);

  return session;
}

module.exports = {
  getSessions,
  getSessionById,
  createSession,
  updateSession,
  deleteSession,
  updateLessonPlan
};
