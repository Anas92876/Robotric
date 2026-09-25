const attendanceRepo = require('../repositories/attendance.repository');
const enrollmentRepo = require('../repositories/enrollment.repository');
const groupRepo      = require('../repositories/group.repository');

const { AppError } = require('../utils/errors');
const { computeAttendanceWithStartingSessions } = require('../utils/attendance.helpers');

// ─── Private Helpers ──────────────────────────────────────────────────────────

async function _getGroupIdsByCourse(courseId) {
  const groups = await groupRepo.find({ courseId });
  return groups.map(g => g._id);
}

async function _getStartingSessionForStudent(courseId, studentId) {
  const group = await groupRepo.findOne({ courseId, students: studentId });
  if (!group) return 1;
  return group.startingSessionNumber || 1;
}

function _extractStudentRecord(doc, studentId) {
  return doc.records.find(r => r.student.toString() === studentId.toString()) || null;
}

function _calcStats(attendanceDocs, studentId, startingSessionNumber = 1) {
  let present = 0, absent = 0, late = 0, excused = 0;

  attendanceDocs.forEach(doc => {
    const rec = _extractStudentRecord(doc, studentId);
    if (rec) {
      if      (rec.status === 'present')  present++;
      else if (rec.status === 'absent')   absent++;
      else if (rec.status === 'late')     late++;
      else if (rec.status === 'excused')  excused++;
    } else {
      absent++;
    }
  });

  const total    = attendanceDocs.length;
  const attended = present + late;
  const percentage = computeAttendanceWithStartingSessions(
    attended,
    total,
    startingSessionNumber
  );

  return {
    totalSessions:        total,
    presentCount:         present,
    absentCount:          absent,
    lateCount:            late,
    excusedCount:         excused,
    attendancePercentage: percentage
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

async function getAttendanceOverview(studentId) {
  const enrollments = await enrollmentRepo.find(
    { student: studentId, status: { $in: ['active', 'completed'] } },
    { populate: { path: 'course', select: 'title thumbnail' } }
  );

  if (enrollments.length === 0) {
    return {
      courses:          [],
      overallStats:     { totalCourses: 0, averageAttendance: 0, totalSessions: 0, totalPresent: 0, totalAbsent: 0, totalLate: 0 },
      recentAttendance: []
    };
  }

  // Resolve group IDs and startingSessionNumber for every enrolled course
  const groupMetaByEnrollment = await Promise.all(
    enrollments.map(async e => {
      const groupIds = await _getGroupIdsByCourse(e.course._id);
      const startingSessionNumber = await _getStartingSessionForStudent(e.course._id, studentId);
      return { groupIds, startingSessionNumber };
    })
  );

  // Build groupId → courseTitle lookup (used for recentAttendance)
  const groupToCourseTitle = {};
  enrollments.forEach((e, i) => {
    groupMetaByEnrollment[i].groupIds.forEach(gid => {
      groupToCourseTitle[gid.toString()] = e.course.title;
    });
  });

  const allGroupIds = groupMetaByEnrollment.flatMap(m => m.groupIds);

  // Per-course stats
  const courseAttendanceData = await Promise.all(
    enrollments.map(async (enrollment, i) => {
      const { groupIds, startingSessionNumber } = groupMetaByEnrollment[i];
      const docs = groupIds.length > 0
        ? await attendanceRepo.find({ groupId: { $in: groupIds }, 'records.student': studentId })
        : [];
      const stats = _calcStats(docs, studentId, startingSessionNumber);
      return {
        courseId:        enrollment.course._id.toString(),
        courseTitle:     enrollment.course.title,
        courseThumbnail: enrollment.course.thumbnail,
        ...stats
      };
    })
  );

  // Overall stats
  const overallStats = {
    totalCourses:      courseAttendanceData.length,
    averageAttendance: courseAttendanceData.length > 0
      ? Math.round(courseAttendanceData.reduce((s, c) => s + c.attendancePercentage, 0) / courseAttendanceData.length)
      : 0,
    totalSessions: courseAttendanceData.reduce((s, c) => s + c.totalSessions, 0),
    totalPresent:  courseAttendanceData.reduce((s, c) => s + c.presentCount, 0),
    totalAbsent:   courseAttendanceData.reduce((s, c) => s + c.absentCount, 0),
    totalLate:     courseAttendanceData.reduce((s, c) => s + c.lateCount, 0)
  };

  // Recent 10 attendance records across all enrolled groups
  const recentDocs = allGroupIds.length > 0
    ? await attendanceRepo.find(
        { groupId: { $in: allGroupIds }, 'records.student': studentId },
        { sort: { 'session.date': -1 }, limit: 10 }
      )
    : [];

  const recentAttendance = recentDocs.map(doc => {
    const rec = _extractStudentRecord(doc, studentId);
    return {
      _id:         doc._id,
      courseTitle: groupToCourseTitle[doc.groupId.toString()] || null,
      status:      rec ? rec.status      : 'absent',
      checkInTime: rec ? rec.checkInTime : null,
      session: {
        title:     doc.session.title,
        date:      doc.session.date,
        startTime: doc.session.startTime,
        endTime:   doc.session.endTime,
        type:      doc.session.type
      }
    };
  });

  return { courses: courseAttendanceData, overallStats, recentAttendance };
}

async function getCourseAttendance(studentId, courseId) {
  const enrollment = await enrollmentRepo.findOne({
    student: studentId,
    course:  courseId,
    status:  { $in: ['active', 'completed'] }
  });
  if (!enrollment) throw new AppError('You are not enrolled in this course', 403);

  const groupIds = await _getGroupIdsByCourse(courseId);
  if (groupIds.length === 0) return [];

  const docs = await attendanceRepo.find(
    { groupId: { $in: groupIds }, 'records.student': studentId },
    { sort: { 'session.date': -1 } }
  );

  return docs.map(doc => {
    const rec = _extractStudentRecord(doc, studentId);
    return {
      _id:         doc._id,
      status:      rec ? rec.status      : 'absent',
      checkInTime: rec ? rec.checkInTime : null,
      session: {
        title:     doc.session.title,
        date:      doc.session.date,
        startTime: doc.session.startTime,
        endTime:   doc.session.endTime,
        type:      doc.session.type
      }
    };
  });
}

async function getAttendanceSummary(studentId, courseId) {
  const enrollment = await enrollmentRepo.findOne({
    student: studentId,
    course:  courseId,
    status:  { $in: ['active', 'completed'] }
  });
  if (!enrollment) throw new AppError('You are not enrolled in this course', 403);

  const groupIds = await _getGroupIdsByCourse(courseId);
  if (groupIds.length === 0) {
    return { totalSessions: 0, presentCount: 0, absentCount: 0, lateCount: 0, excusedCount: 0, attendancePercentage: 0 };
  }

  const docs = await attendanceRepo.find({
    groupId:           { $in: groupIds },
    'records.student': studentId
  });

  const startingSessionNumber = await _getStartingSessionForStudent(courseId, studentId);

  return _calcStats(docs, studentId, startingSessionNumber);
}

async function getMonthlyAttendance(studentId, courseId, year, month) {
  const yearNum  = parseInt(year);
  const monthNum = parseInt(month);

  if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
    throw new AppError('Invalid year or month', 400);
  }

  const enrollment = await enrollmentRepo.findOne({
    student: studentId,
    course:  courseId,
    status:  { $in: ['active', 'completed'] }
  });
  if (!enrollment) throw new AppError('You are not enrolled in this course', 403);

  const groupIds = await _getGroupIdsByCourse(courseId);
  if (groupIds.length === 0) return [];

  const startDate = new Date(yearNum, monthNum - 1, 1);
  const endDate   = new Date(yearNum, monthNum, 0, 23, 59, 59);

  const docs = await attendanceRepo.find(
    {
      groupId:           { $in: groupIds },
      'records.student': studentId,
      'session.date':    { $gte: startDate, $lte: endDate }
    },
    { sort: { 'session.date': 1 } }
  );

  return docs.map(doc => {
    const rec = _extractStudentRecord(doc, studentId);
    return {
      date:   doc.session.date,
      status: rec ? rec.status : 'absent',
      session: {
        title:     doc.session.title,
        startTime: doc.session.startTime,
        endTime:   doc.session.endTime,
        type:      doc.session.type
      }
    };
  });
}

module.exports = {
  getAttendanceOverview,
  getCourseAttendance,
  getAttendanceSummary,
  getMonthlyAttendance
};
