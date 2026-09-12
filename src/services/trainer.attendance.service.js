const attendanceRepo = require('../repositories/attendance.repository');
const sessionRepo    = require('../repositories/session.repository');
const groupRepo      = require('../repositories/group.repository');

const { AppError } = require('../utils/errors');

// ─── Private Helpers ──────────────────────────────────────────────────────────

function _buildRecords(records, trainerId) {
  return records.map(record => ({
    student:     record.student,
    status:      record.status,
    markedBy:    trainerId,
    markedAt:    new Date(),
    notes:       record.notes,
    checkInTime: record.checkInTime ||
      (record.status === 'present' || record.status === 'late' ? new Date() : null)
  }));
}

async function _resolveSessionGroup(sessionId, trainerId) {
  const session = await sessionRepo.findOne({ _id: sessionId });
  if (!session) throw new AppError('Session not found', 404);

  const group = await groupRepo.findById(session.groupId);
  if (!group) throw new AppError('Group not found', 404);
  if (group.trainerId.toString() !== trainerId.toString()) {
    throw new AppError('You do not have access to this group', 403);
  }

  return { session, group };
}

// ─── Public API ───────────────────────────────────────────────────────────────

async function saveAttendance(trainerId, body) {
  const { sessionId, records } = body;

  if (!sessionId) {
    throw new AppError('sessionId is required', 400);
  }
  if (!records || records.length === 0) {
    throw new AppError('Attendance records are required', 400);
  }

  const { session, group } = await _resolveSessionGroup(sessionId, trainerId);

  const sessionInfo = {
    title:     session.title,
    date:      session.scheduledDate,
    startTime: session.startTime,
    endTime:   session.endTime,
    type:      session.type || 'lecture',
    location:  session.location,
    notes:     session.notes
  };

  const existing = await attendanceRepo.findOne({ sessionId });

  if (existing) {
    existing.records = _buildRecords(records, trainerId);
    await attendanceRepo.save(existing);
    return { attendance: existing, created: false };
  }

  const attendance = await attendanceRepo.create({
    sessionId,
    groupId: group._id,
    session: sessionInfo,
    records: _buildRecords(records, trainerId)
  });

  return { attendance, created: true };
}

async function getSessionAttendance(sessionId, trainerId) {
  await _resolveSessionGroup(sessionId, trainerId);

  return attendanceRepo.findOne(
    { sessionId },
    { populate: { path: 'records.student', select: 'name email' } }
  );
}

async function getTrainerAttendance(trainerId) {
  const groups = await groupRepo.find({ trainerId });
  if (groups.length === 0) return [];

  const groupIds = groups.map(g => g._id);

  return attendanceRepo.find(
    { groupId: { $in: groupIds } },
    {
      sort:     { 'session.date': -1 },
      populate: { path: 'records.student', select: 'name email' }
    }
  );
}

module.exports = {
  saveAttendance,
  getSessionAttendance,
  getTrainerAttendance
};
