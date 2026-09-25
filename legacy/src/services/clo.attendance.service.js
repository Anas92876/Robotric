const attendanceRepo = require('../repositories/attendance.repository');
const groupRepo      = require('../repositories/group.repository');

const { AppError } = require('../utils/errors');
const { computeAttendanceWithStartingSessions } = require('../utils/attendance.helpers');

// ─── Private Helpers ──────────────────────────────────────────────────────────

async function _getGroupIdsByCourse(courseId) {
  const groups = await groupRepo.find({ courseId });
  return groups.map(g => g._id);
}

function _calcSessionStats(records) {
  const total   = records.length;
  const present = records.filter(r => r.status === 'present').length;
  const absent  = records.filter(r => r.status === 'absent').length;
  const late    = records.filter(r => r.status === 'late').length;
  return {
    totalStudents:  total,
    present,
    absent,
    late,
    attendanceRate: total > 0 ? Math.round(((present + late) / total) * 100) : 0
  };
}

async function _buildQuery({ courseId, groupId, startDate, endDate, sessionType }) {
  const query = {};

  if (groupId) {
    query.groupId = groupId;
  } else if (courseId) {
    const groupIds = await _getGroupIdsByCourse(courseId);
    query.groupId  = { $in: groupIds };
  }

  if (sessionType) query['session.type'] = sessionType;

  if (startDate || endDate) {
    query['session.date'] = {};
    if (startDate) query['session.date'].$gte = new Date(startDate);
    if (endDate)   query['session.date'].$lte = new Date(endDate);
  }

  return query;
}

const POPULATE_RECORDS = [
  { path: 'records.student', select: 'name email' },
  { path: 'records.markedBy', select: 'name' }
];

// ─── Public API ───────────────────────────────────────────────────────────────

async function getAllAttendance(filters) {
  const {
    courseId, groupId, startDate, endDate, sessionType,
    page = 1, limit = 20, sortBy = 'session.date', sortOrder = 'desc'
  } = filters;

  const pageNum  = parseInt(page);
  const limitNum = parseInt(limit);
  const skip     = (pageNum - 1) * limitNum;

  const query = await _buildQuery({ courseId, groupId, startDate, endDate, sessionType });

  const [docs, total] = await Promise.all([
    attendanceRepo.find(query, {
      sort:     { [sortBy]: sortOrder === 'desc' ? -1 : 1 },
      skip,
      limit:    limitNum,
      populate: POPULATE_RECORDS
    }),
    attendanceRepo.countDocuments(query)
  ]);

  const data = docs.map(doc => ({
    ...doc.toObject(),
    stats: _calcSessionStats(doc.records)
  }));

  return {
    data,
    pagination: {
      page:  pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum)
    }
  };
}

async function getAttendanceById(id) {
  const doc = await attendanceRepo.findById(id, {
    populate: [
      { path: 'records.student', select: 'name email profile' },
      { path: 'records.markedBy', select: 'name email' }
    ]
  });
  if (!doc) throw new AppError('Attendance record not found', 404);

  return { ...doc.toObject(), stats: _calcSessionStats(doc.records) };
}

async function getCourseAttendance(courseId) {
  const groupIds = await _getGroupIdsByCourse(courseId);
  if (groupIds.length === 0) {
    return {
      attendanceRecords: [],
      stats: { totalSessions: 0, totalPresent: 0, totalAbsent: 0, totalLate: 0, overallAttendanceRate: 0 }
    };
  }

  const [docs, groups] = await Promise.all([
    attendanceRepo.find(
      { groupId: { $in: groupIds } },
      { sort: { 'session.date': -1 }, populate: { path: 'records.student', select: 'name email' } }
    ),
    groupRepo.find({ _id: { $in: groupIds } })
  ]);

  const groupStartMap = new Map(
    groups.map(g => [g._id.toString(), g.startingSessionNumber || 1])
  );

  let totalPresent = 0, totalAbsent = 0, totalLate = 0, totalStudentRecords = 0;
  const sessionRates = [];

  docs.forEach(doc => {
    const sessionTotal   = doc.records.length;
    const sessionPresent = doc.records.filter(r => r.status === 'present').length;
    const sessionLate    = doc.records.filter(r => r.status === 'late').length;

    totalStudentRecords += sessionTotal;
    totalPresent        += sessionPresent;
    totalAbsent         += doc.records.filter(r => r.status === 'absent').length;
    totalLate           += sessionLate;

    const baseRate = sessionTotal > 0
      ? ((sessionPresent + sessionLate) / sessionTotal) * 100
      : 0;

    sessionRates.push(baseRate);
  });

  // Add virtual 100% sessions for each group's startingSessionNumber - 1
  let virtualSessionCount = 0;
  groupStartMap.forEach(startNum => {
    const extra = Math.max(0, startNum - 1);
    virtualSessionCount += extra;
  });

  const totalRealSessions = sessionRates.length;
  const totalSessionsWithVirtual = totalRealSessions + virtualSessionCount;

  let overallAttendanceRate = 0;
  if (totalSessionsWithVirtual > 0) {
    const realSum = sessionRates.reduce((a, b) => a + b, 0);
    const virtualSum = virtualSessionCount * 100;
    overallAttendanceRate = Math.round((realSum + virtualSum) / totalSessionsWithVirtual);
  }

  return {
    attendanceRecords: docs,
    stats: {
      totalSessions:        docs.length,
      totalPresent,
      totalAbsent,
      totalLate,
      overallAttendanceRate
    }
  };
}

async function getAttendanceStats(filters) {
  const { courseId, startDate, endDate } = filters;
  const query = await _buildQuery({ courseId, startDate, endDate });
  const docs  = await attendanceRepo.find(query);

  if (docs.length === 0) {
    return {
      totalSessions:            0,
      totalStudentRecords:      0,
      overallAttendanceRate:    0,
      statusDistribution:       { present: 0, absent: 0, late: 0 },
      averageSessionAttendance: 0
    };
  }

  let totalPresent = 0, totalAbsent = 0, totalLate = 0;
  let totalStudentRecords = 0;
  const sessionRates = [];

  docs.forEach(doc => {
    const sessionTotal   = doc.records.length;
    const sessionPresent = doc.records.filter(r => r.status === 'present').length;
    const sessionLate    = doc.records.filter(r => r.status === 'late').length;

    if (sessionTotal > 0) {
      sessionRates.push(((sessionPresent + sessionLate) / sessionTotal) * 100);
    }

    totalStudentRecords += sessionTotal;
    totalPresent        += sessionPresent;
    totalAbsent         += doc.records.filter(r => r.status === 'absent').length;
    totalLate           += sessionLate;
  });

  const averageSessionAttendance = sessionRates.length > 0
    ? Math.round(sessionRates.reduce((a, b) => a + b, 0) / sessionRates.length)
    : 0;

  // For stats endpoint, align overallAttendanceRate with averageSessionAttendance,
  // which already reflects per-session attendance; startingSessionNumber impact
  // is accounted for at course level in getCourseAttendance.
  const overallAttendanceRate = averageSessionAttendance;

  return {
    totalSessions:            docs.length,
    totalStudentRecords,
    overallAttendanceRate,
    statusDistribution:       { present: totalPresent, absent: totalAbsent, late: totalLate },
    averageSessionAttendance
  };
}

module.exports = {
  getAllAttendance,
  getAttendanceById,
  getCourseAttendance,
  getAttendanceStats
};
