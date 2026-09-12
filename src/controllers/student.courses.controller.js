const asyncHandler = require('../utils/asyncHandler');
const { AppError } = require('../utils/errors');
const logger = require('../utils/logger');
const { computeAttendanceWithStartingSessions } = require('../utils/attendance.helpers');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const Module = require('../models/Module');
const StudentEvaluation = require('../models/StudentEvaluation');
const Attendance = require('../models/Attendance');
const EvaluationCriteria = require('../models/EvaluationCriteria');
const Resource = require('../models/Resource');
const ResourceAssignment = require('../models/ResourceAssignment');
const TrainerResource = require('../models/TrainerResource'); // Legacy support
const Certificate = require('../models/Certificate');

/**
 * Helper: Parse duration string to extract hours
 * Examples: "40 hours", "40h", "2 months", "3 weeks"
 */
function parseDurationToHours(durationString) {
  if (!durationString) return 0;

  // Try to extract number from string
  const match = durationString.match(/(\d+\.?\d*)/);
  if (!match) return 0;

  const value = parseFloat(match[1]);
  const lowerStr = durationString.toLowerCase();

  // Check what unit is used
  if (lowerStr.includes('hour') || lowerStr.includes('hr') || lowerStr.includes('h')) {
    return value;
  } else if (lowerStr.includes('month')) {
    // Assume 1 month = 40 hours (typical course month)
    return value * 40;
  } else if (lowerStr.includes('week')) {
    // Assume 1 week = 10 hours
    return value * 10;
  } else if (lowerStr.includes('day')) {
    // Assume 1 day = 2 hours
    return value * 2;
  }

  // Default: assume the number IS hours
  return value;
}

// @desc    Get all enrolled courses for student
// @route   GET /api/student/courses
// @access  Private (Student)
exports.getMyCourses = asyncHandler(async (req, res) => {
  const studentId = req.user._id;

  const enrollments = await Enrollment.find({
    student: studentId,
    status: { $in: ['active', 'completed'] },
    // Exclude sub-course enrollments created as part of a bundle;
    // those are accessible by expanding the parent bundle card.
    enrollmentSource: { $ne: 'bundle' }
  })
    .populate({
      path: 'course',
      select: 'title description instructor duration totalHours price thumbnail category level startDate endDate type bundlePrice bundleCourses',
      populate: [
        { path: 'instructor', select: 'name email' },
        { path: 'bundleCourses', select: 'title category level thumbnail duration totalHours price' }
      ]
    })
    .sort({ enrolledAt: -1 });

  const coursesWithProgress = await Promise.all(enrollments.map(async (enrollment) => {
    // Calculate progress based on SESSION HOURS (same logic as dashboard and course details)
    const Group = require('../models/Group');
    const Session = require('../models/Session');
    const Course = require('../models/Course');
    const Attendance = require('../models/Attendance');

    const group = await Group.findOne({
      courseId: enrollment.course._id,
      students: studentId
    }).populate('trainerId', 'name email');

    let progressPercentage = 0;
    let completedSessions = 0;
    let totalSessions = 0;
    let attendancePercentage = 0;

    if (group) {
      const course = await Course.findById(enrollment.course._id);
      const sessions = await Session.find({
        groupId: group._id,
        courseId: enrollment.course._id
      }).sort({ sessionNumber: 1 });

      totalSessions = sessions.length;

      if (course && sessions.length > 0) {
        // Calculate completed sessions based on auto-status
        const completedSessionsList = sessions.filter(session => {
          const autoStatus = session.getAutoStatus();
          return autoStatus === 'completed';
        });

        completedSessions = completedSessionsList.length;

        // Sum completed session hours from startTime/endTime (fallback to duration field)
        const sessionHours = (s) => {
          if (s.startTime && s.endTime) {
            const [sh, sm] = s.startTime.split(':').map(Number);
            const [eh, em] = s.endTime.split(':').map(Number);
            return Math.max(0, (eh * 60 + em - sh * 60 - sm) / 60);
          }
          return (s.duration || 0) / 60;
        };

        let completedHours = completedSessionsList.reduce((sum, s) => sum + sessionHours(s), 0);

        // Calculate hours for sessions BEFORE this group started using the group's schedule
        // (those sessions don't exist in this group — we derive from the weekly schedule CLO set)
        const startingSession = group.startingSessionNumber || 1;
        let previousSessionsHours = 0;
        if (startingSession > 1 && group.schedule && group.schedule.length > 0) {
          const scheduleSlotHours = (slot) => {
            if (slot.startTime && slot.endTime) {
              const [sh, sm] = slot.startTime.split(':').map(Number);
              const [eh, em] = slot.endTime.split(':').map(Number);
              return Math.max(0, (eh * 60 + em - sh * 60 - sm) / 60);
            }
            return 0;
          };
          const totalScheduleHours = group.schedule.reduce((sum, slot) => sum + scheduleSlotHours(slot), 0);
          const avgHoursPerSession = totalScheduleHours / group.schedule.length;
          previousSessionsHours = avgHoursPerSession * (startingSession - 1);
          completedHours += previousSessionsHours;
        }

        // Get course total hours from duration field or totalHours field
        let courseTotalHours = course.totalHours || parseDurationToHours(course.duration) || 0;

        // Fallback: calculate from group sessions + previous sessions so denominator matches
        if (!courseTotalHours || courseTotalHours === 0) {
          const currentGroupHours = sessions.reduce((sum, s) => sum + sessionHours(s), 0);
          courseTotalHours = currentGroupHours + previousSessionsHours;
        }

        // Calculate progress percentage — capped at 0–100
        progressPercentage = courseTotalHours > 0
          ? Math.min(100, Math.max(0, Math.round((completedHours / courseTotalHours) * 100)))
          : 0;
      }

      // Calculate attendance from actual Attendance records (query by groupId — the real field)
      if (group) {
        const attendanceRecords = await Attendance.find({
          groupId: group._id,
          'records.student': studentId
        });

        let presentCount = 0;
        const totalCount = attendanceRecords.length;

        attendanceRecords.forEach(record => {
          const studentRecord = record.records.find(
            r => r.student.toString() === studentId.toString()
          );
          if (studentRecord && (studentRecord.status === 'present' || studentRecord.status === 'late')) {
            presentCount++;
          }
        });

        const startingSession = group.startingSessionNumber || 1;
        attendancePercentage = computeAttendanceWithStartingSessions(
          presentCount,
          totalCount,
          startingSession
        );
      }
    }

    const hasCertificate = group
      ? !!(await Certificate.findOne({ student: studentId, group: group._id }))
      : false;

    const certificate = group
      ? await Certificate.findOne({ student: studentId, group: group._id }).select('_id certificateNumber issuedAt')
      : null;

    // For bundle-type courses, compute progress/attendance for each sub-course
    let bundleSubCourses = null;
    if (enrollment.course.type === 'bundle') {
      const Group = require('../models/Group');
      const Session = require('../models/Session');

      const subEnrollments = await Enrollment.find({
        student: studentId,
        bundleEnrollmentId: enrollment._id,
        status: { $in: ['active', 'completed'] }
      }).populate({
        path: 'course',
        select: 'title category level thumbnail duration totalHours price'
      });

      bundleSubCourses = await Promise.all(subEnrollments.map(async (subEnr) => {
        const subGroup = await Group.findOne({
          courseId: subEnr.course._id,
          students: studentId
        }).populate('trainerId', 'name email');

        let subProgress = 0;
        let subAttendance = 0;
        let subCompletedSessions = 0;
        let subTotalSessions = 0;

        if (subGroup) {
          const sessions = await Session.find({ groupId: subGroup._id, courseId: subEnr.course._id }).sort({ sessionNumber: 1 });
          subTotalSessions = sessions.length;

          if (sessions.length > 0) {
            const sessionHours = (s) => {
              if (s.startTime && s.endTime) {
                const [sh, sm] = s.startTime.split(':').map(Number);
                const [eh, em] = s.endTime.split(':').map(Number);
                return Math.max(0, (eh * 60 + em - sh * 60 - sm) / 60);
              }
              return (s.duration || 0) / 60;
            };
            const completedList = sessions.filter(s => s.getAutoStatus() === 'completed');
            subCompletedSessions = completedList.length;
            const completedHours = completedList.reduce((sum, s) => sum + sessionHours(s), 0);
            const totalHours = subEnr.course.totalHours || parseDurationToHours(subEnr.course.duration) || sessions.reduce((sum, s) => sum + sessionHours(s), 0);
            subProgress = totalHours > 0 ? Math.min(100, Math.max(0, Math.round((completedHours / totalHours) * 100))) : 0;
          }

          const attendanceRecords = await Attendance.find({ groupId: subGroup._id, 'records.student': studentId });
          let presentCount = 0;
          attendanceRecords.forEach(record => {
            const r = record.records.find(r => r.student.toString() === studentId.toString());
            if (r && (r.status === 'present' || r.status === 'late')) presentCount++;
          });
          subAttendance = computeAttendanceWithStartingSessions(presentCount, attendanceRecords.length, subGroup.startingSessionNumber || 1);
        }

        return {
          _id: subEnr._id,
          enrollmentId: subEnr._id,
          course: {
            _id: subEnr.course._id,
            title: subEnr.course.title,
            category: subEnr.course.category,
            level: subEnr.course.level,
            thumbnail: subEnr.course.thumbnail,
            duration: subEnr.course.duration,
            price: subEnr.course.price,
          },
          groupId: subGroup?._id || null,
          groupStatus: subGroup?.status || null,
          trainer: subGroup?.trainerId ? { _id: subGroup.trainerId._id, name: subGroup.trainerId.name } : null,
          progress: { percentageComplete: subProgress, completedSessions: subCompletedSessions, totalSessions: subTotalSessions },
          attendance: { percentage: subAttendance },
          status: subEnr.status
        };
      }));
    }

    return {
      _id: enrollment._id,
      enrollmentSource: enrollment.enrollmentSource || 'direct',
      course: {
        _id: enrollment.course._id,
        title: enrollment.course.title,
        description: enrollment.course.description,
        instructor: enrollment.course.instructor,
        trainer: group?.trainerId ? {
          _id: group.trainerId._id,
          name: group.trainerId.name,
          email: group.trainerId.email,
        } : null,
        duration: enrollment.course.duration,
        price: enrollment.course.price,
        thumbnail: enrollment.course.thumbnail,
        category: enrollment.course.category,
        level: enrollment.course.level,
        startDate: enrollment.course.startDate,
        endDate: enrollment.course.endDate,
        type: enrollment.course.type || 'single',
        bundlePrice: enrollment.course.bundlePrice || null,
        bundleCourses: enrollment.course.bundleCourses || [],
      },
      enrolledAt: enrollment.enrolledAt,
      status: enrollment.status,
      groupStatus: group?.status || 'active',
      groupId: group?._id || null,
      hasCertificate,
      certificate: certificate ? {
        _id: certificate._id,
        certificateNumber: certificate.certificateNumber,
        issuedAt: certificate.issuedAt
      } : null,
      progress: {
        percentageComplete: progressPercentage,
        completedSessions: completedSessions,
        totalSessions: totalSessions
      },
      attendance: {
        percentage: attendancePercentage
      },
      payment: {
        totalAmount: enrollment.payment.totalAmount,
        paidAmount: enrollment.payment.paidAmount,
        remainingAmount: enrollment.payment.remainingAmount
      },
      bundleSubCourses
    };
  }));

  logger.info('Student courses retrieved', {
    studentId,
    count: coursesWithProgress.length
  });

  res.json({
    success: true,
    count: coursesWithProgress.length,
    data: coursesWithProgress
  });
});

/**
 * Helper: Calculate student evaluation average for a course
 */
async function calculateEvaluationAverage(studentId, courseId, groupId) {
  try {
    // Get session IDs for this course/group to ensure evaluations belong to the course
    const Session = require('../models/Session');
    const courseSessions = await Session.find({
      courseId,
      groupId
    }).select('_id').lean();

    const sessionIds = courseSessions.map(s => s._id);

    // Only get evaluations for sessions that belong to this course
    const evaluations = await StudentEvaluation.find({
      studentId,
      groupId,
      sessionId: { $in: sessionIds }  // Ensure sessions belong to course
    }).select('overallRating');

    if (evaluations.length === 0) {
      return null;
    }

    const sum = evaluations.reduce((acc, eval) => acc + eval.overallRating, 0);
    const average = sum / evaluations.length;
    
    // Return average on 0-5 scale, rounded to 1 decimal
    return Math.round(average * 10) / 10;
  } catch (error) {
    logger.logError(error, { context: 'calculateEvaluationAverage' });
    return null;
  }
}

/**
 * Helper: Calculate student attendance average for a course
 */
async function calculateAttendanceAverage(studentId, groupId) {
  try {
    if (!groupId) return null;

    // Query by groupId — the actual field on Attendance documents
    const Group = require('../models/Group');

    const [group, attendanceRecords] = await Promise.all([
      Group.findById(groupId).select('startingSessionNumber'),
      Attendance.find({
        groupId,
        'records.student': studentId
      }).select('records')
    ]);

    if (!attendanceRecords.length) return null;

    let presentCount = 0;
    const totalSessions = attendanceRecords.length;

    attendanceRecords.forEach(record => {
      const studentRecord = record.records.find(
        r => r.student.toString() === studentId.toString()
      );
      if (studentRecord && (studentRecord.status === 'present' || studentRecord.status === 'late')) {
        presentCount++;
      }
    });

    const startingSession = group?.startingSessionNumber || 1;

    return computeAttendanceWithStartingSessions(
      presentCount,
      totalSessions,
      startingSession
    );
  } catch (error) {
    logger.logError(error, { context: 'calculateAttendanceAverage' });
    return null;
  }
}

/**
 * Helper: Get sessions with evaluation averages for a student
 */
async function getSessionsWithEvaluations(sessions, studentId, groupId) {
  try {
    const sessionIds = sessions.map(s => s._id);

    // Fetch evaluations and attendance records for all sessions in one round-trip each
    const [evaluations, attendanceRecords] = await Promise.all([
      StudentEvaluation.find({
        studentId,
        sessionId: { $in: sessionIds },
        groupId
      }).select('sessionId overallRating'),
      Attendance.find({
        sessionId: { $in: sessionIds },
        groupId
      }).select('sessionId records')
    ]);

    // Build lookup maps
    const evaluationMap = new Map();
    evaluations.forEach(e => {
      evaluationMap.set(e.sessionId.toString(), e.overallRating);
    });

    const attendanceMap = new Map();
    attendanceRecords.forEach(record => {
      const studentRecord = record.records.find(
        r => r.student.toString() === studentId.toString()
      );
      if (studentRecord) {
        attendanceMap.set(record.sessionId.toString(), {
          status: studentRecord.status,
          checkedInAt: studentRecord.checkInTime
            ? new Date(studentRecord.checkInTime).toISOString()
            : null
        });
      }
    });

    return sessions.map(session => {
      const evaluationRating = evaluationMap.get(session._id.toString());
      const attendanceData = attendanceMap.get(session._id.toString()) || null;

      // isCompleted: session end time has passed (mirrors getAutoStatus logic)
      let isCompleted = false;
      if (session.scheduledDate && session.endTime && session.status !== 'cancelled') {
        const [eh, em] = session.endTime.split(':').map(Number);
        const endDateTime = new Date(session.scheduledDate);
        endDateTime.setHours(eh, em, 0, 0);
        isCompleted = new Date() > endDateTime;
      } else if (session.status === 'completed') {
        isCompleted = true;
      }

      return {
        id: session._id.toString(),
        title: session.title,
        titleAr: session.titleAr || null,
        order: session.sessionNumber || 0,
        evaluationAverage: evaluationRating || null,
        isCompleted,
        date: session.scheduledDate ? session.scheduledDate.toISOString().split('T')[0] : null,
        attendance: attendanceData  // { status, checkedInAt } or null if not marked
      };
    });
  } catch (error) {
    logger.logError(error, { context: 'getSessionsWithEvaluations' });
    return sessions.map(s => ({
      id: s._id.toString(),
      title: s.title,
      titleAr: s.titleAr || null,
      order: s.sessionNumber || 0,
      evaluationAverage: null,
      isCompleted: s.status === 'completed',
      date: s.scheduledDate ? s.scheduledDate.toISOString().split('T')[0] : null,
      attendance: null
    }));
  }
}

// @desc    Get single course details for student
// @route   GET /api/student/courses/:courseId
// @access  Private (Student)
exports.getCourseDetails = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const studentId = req.user._id;

  // Validate courseId format
  if (!courseId.match(/^[0-9a-fA-F]{24}$/)) {
    throw new AppError('Invalid course ID format', 400);
  }

  // Check if student is enrolled
  const enrollment = await Enrollment.findOne({
    student: studentId,
    course: courseId,
    status: { $in: ['active', 'completed'] }
  });

  if (!enrollment) {
    throw new AppError('You are not enrolled in this course', 403);
  }

  // Get course with instructor details
  const course = await Course.findById(courseId)
    .populate('instructor', 'name email')
    .populate('modules');

  if (!course) {
    throw new AppError('Course not found', 404);
  }

  // Get student's group for this course
  const Group = require('../models/Group');
  const group = await Group.findOne({
    courseId,
    students: studentId
  }).populate('trainerId', 'name email');

  // Get sessions for the student's group
  const Session = require('../models/Session');
  const sessions = group 
    ? await Session.find({
        groupId: group._id,
        courseId
      })
      .sort({ sessionNumber: 1, scheduledDate: 1 })
      .lean()
    : [];

  // Calculate student statistics in parallel for performance
  const [evaluationAverage, attendanceAverage, sessionsWithEvals] = await Promise.all([
    group ? calculateEvaluationAverage(studentId, courseId, group._id) : Promise.resolve(null),
    calculateAttendanceAverage(studentId, group?._id),
    group ? getSessionsWithEvaluations(sessions, studentId, group._id) : Promise.resolve([])
  ]);

  // ✅ Calculate progress from SESSION HOURS, with auto-status based on time
  // Convert lean objects to Mongoose documents to use getAutoStatus method
  const sessionsWithStatus = sessions.map(s => new Session(s));

  const completedSessionsList = sessionsWithStatus.filter(session => {
    const autoStatus = session.getAutoStatus();
    return autoStatus === 'completed';
  });
  const completedSessions = completedSessionsList.length;
  const totalSessions = sessions.length;

  // Calculate hours from startTime/endTime directly (fallback to duration field)
  const sessionHours = (s) => {
    if (s.startTime && s.endTime) {
      const [sh, sm] = s.startTime.split(':').map(Number);
      const [eh, em] = s.endTime.split(':').map(Number);
      return Math.max(0, (eh * 60 + em - sh * 60 - sm) / 60);
    }
    return (s.duration || 0) / 60;
  };

  let completedHours = completedSessionsList.reduce((sum, s) => sum + sessionHours(s), 0);

  // Calculate hours for sessions BEFORE this group started using the group's schedule
  // (those sessions don't exist in this group — we derive from the weekly schedule CLO set)
  const startingSession = group?.startingSessionNumber || 1;
  let previousSessionsHours = 0;
  if (startingSession > 1 && group?.schedule && group.schedule.length > 0) {
    const scheduleSlotHours = (slot) => {
      if (slot.startTime && slot.endTime) {
        const [sh, sm] = slot.startTime.split(':').map(Number);
        const [eh, em] = slot.endTime.split(':').map(Number);
        return Math.max(0, (eh * 60 + em - sh * 60 - sm) / 60);
      }
      return 0;
    };
    const totalScheduleHours = group.schedule.reduce((sum, slot) => sum + scheduleSlotHours(slot), 0);
    const avgHoursPerSession = totalScheduleHours / group.schedule.length;
    previousSessionsHours = avgHoursPerSession * (startingSession - 1);
    completedHours += previousSessionsHours;
  }

  // Get course total hours from duration field or totalHours field
  let courseTotalHours = course.totalHours || parseDurationToHours(course.duration) || 0;

  // Fallback: calculate from group sessions + previous sessions so denominator matches
  if (!courseTotalHours || courseTotalHours === 0) {
    const currentGroupHours = sessions.reduce((sum, s) => sum + sessionHours(s), 0);
    courseTotalHours = currentGroupHours + previousSessionsHours;
  }

  // Calculate progress percentage — capped at 0–100
  const progressPercentage = courseTotalHours > 0
    ? Math.min(100, Math.max(0, Math.round((completedHours / courseTotalHours) * 100)))
    : 0;

  const courseCertificate = group
    ? await Certificate.findOne({ student: studentId, group: group._id }).select('_id certificateNumber issuedAt')
    : null;

  // Build response matching mobile app requirements
  const response = {
    success: true,
    course: {
      id: course._id.toString(),
      title: course.title,
      titleAr: course.titleAr || null,
      description: course.description,
      groupStatus: group?.status || 'active',
      boardEnabled: group?.boardEnabled || false,
      groupId: group?._id?.toString() || null,
      hasCertificate: !!courseCertificate,
      certificate: courseCertificate ? {
        _id: courseCertificate._id,
        certificateNumber: courseCertificate.certificateNumber,
        issuedAt: courseCertificate.issuedAt
      } : null,
      instructor: course.instructor ? {
        _id: course.instructor._id,
        name: course.instructor.name,
        email: course.instructor.email
      } : null,
      trainer: group?.trainerId ? {
        _id: group.trainerId._id,
        name: group.trainerId.name,
        email: group.trainerId.email,
      } : null,
      studentStats: {
        evaluationAverage: evaluationAverage || null,
        attendanceAverage: attendanceAverage || null,
        progressPercentage,
        completedSessions,
        totalSessions
      },
      sessions: sessionsWithEvals
    }
  };

  logger.info('Course details retrieved with stats', {
    studentId,
    courseId,
    courseName: course.title,
    stats: response.course.studentStats
  });

  res.json(response);
});

// @desc    Get course sessions for student
// @route   GET /api/student/courses/:courseId/sessions
// @access  Private (Student)
exports.getCourseSessions = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const studentId = req.user._id;

  // Check enrollment
  const enrollment = await Enrollment.findOne({
    student: studentId,
    course: courseId,
    status: { $in: ['active', 'completed'] }
  });

  if (!enrollment) {
    throw new AppError('You are not enrolled in this course', 403);
  }

  // Get student's group for this course
  const Group = require('../models/Group');
  const group = await Group.findOne({
    courseId,
    students: studentId
  });

  if (!group) {
    return res.json({
      success: true,
      count: 0,
      data: []
    });
  }

  // Get sessions for the student's group
  const Session = require('../models/Session');
  const sessions = await Session.find({
    groupId: group._id,
    courseId
  })
    .populate('trainerId', 'name email')
    .sort({ sessionNumber: 1, scheduledDate: 1 });

  // Get quizzes for these sessions
  const Quiz = require('../models/Quiz');
  const sessionIds = sessions.map(s => s._id);
  const quizzes = await Quiz.find({
    session: { $in: sessionIds }
  }).select('session title passingScore timeLimit questions');

  // Get quiz attempts for this student
  const QuizAttempt = require('../models/QuizAttempt');
  const quizIds = quizzes.map(q => q._id);
  const quizAttempts = await QuizAttempt.find({
    student: studentId,
    quiz: { $in: quizIds }
  }).select('quiz score passed submittedAt');

  // Merge quizzes with sessions and add attempt info
  const sessionsWithQuizzes = sessions.map(session => {
    const sessionObj = session.toObject({ virtuals: true });
    const quiz = quizzes.find(q => q.session && q.session.toString() === session._id.toString());

    let quizAttempt = null;
    if (quiz) {
      // Find the best/latest attempt for this quiz
      const attempts = quizAttempts.filter(a => a.quiz.toString() === quiz._id.toString());
      if (attempts.length > 0) {
        // Get the best score or latest attempt
        quizAttempt = attempts.reduce((best, current) => {
          return current.score > best.score ? current : best;
        });
      }
    }

    return {
      ...sessionObj,
      quiz: quiz || null,
      quizAttempt: quizAttempt ? {
        score: quizAttempt.score,
        passed: quizAttempt.passed,
        submittedAt: quizAttempt.submittedAt
      } : null,
      isLocked: sessionObj.scheduledDate
        ? (() => {
            const sessionDay = new Date(new Date(sessionObj.scheduledDate).toDateString());
            const today      = new Date(new Date().toDateString());
            return sessionDay > today;
          })()
        : false,
      type: 'live_session'
    };
  });

  logger.info('Course sessions retrieved', {
    studentId,
    courseId,
    groupId: group._id,
    sessionCount: sessionsWithQuizzes.length
  });

  res.json({
    success: true,
    count: sessionsWithQuizzes.length,
    data: sessionsWithQuizzes
  });
});

// @desc    Enroll in a course
// @route   POST /api/student/courses/:courseId/enroll
// @access  Private (Student)
exports.enrollInCourse = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const studentId = req.user._id;
  const { paymentPlan } = req.body; // 'full' or 'installment'

  // Check if course exists
  const course = await Course.findById(courseId);
  if (!course) {
    throw new AppError('Course not found', 404);
  }

  // Check if course is published
  if (course.status !== 'published') {
    throw new AppError('This course is not available for enrollment', 400);
  }

  // Check if course is full
  if (course.isFull) {
    throw new AppError('This course is full', 400);
  }

  // Check if already enrolled
  const existingEnrollment = await Enrollment.findOne({
    student: studentId,
    course: courseId
  });

  if (existingEnrollment) {
    throw new AppError('You are already enrolled in this course', 400);
  }

  // Create enrollment
  const enrollmentData = {
    student: studentId,
    course: courseId,
    status: 'active',
    payment: {
      totalAmount: course.price,
      paidAmount: 0,
      remainingAmount: course.price,
      installments: []
    }
  };

  // Setup payment installments if needed
  if (paymentPlan === 'installment') {
    const installmentAmount = Math.ceil(course.price / 3);
    const now = new Date();

    enrollmentData.payment.installments = [
      {
        amount: installmentAmount,
        dueDate: new Date(now.getTime() + 0), // Due now
        status: 'pending'
      },
      {
        amount: installmentAmount,
        dueDate: new Date(now.setMonth(now.getMonth() + 1)),
        status: 'pending'
      },
      {
        amount: course.price - (installmentAmount * 2), // Remaining
        dueDate: new Date(now.setMonth(now.getMonth() + 1)),
        status: 'pending'
      }
    ];
  }

  const enrollment = await Enrollment.create(enrollmentData);

  // Update course enrolled students count
  course.enrolledStudents += 1;
  await course.save();

  logger.info('Student enrolled in course', {
    studentId,
    courseId,
    courseName: course.title,
    paymentPlan
  });

  res.status(201).json({
    success: true,
    message: 'Successfully enrolled in course',
    data: enrollment
  });
});

// @desc    Get enrollment details
// @route   GET /api/student/enrollments/:enrollmentId
// @access  Private (Student)
exports.getEnrollmentDetails = asyncHandler(async (req, res) => {
  const { enrollmentId } = req.params;
  const studentId = req.user._id;

  const enrollment = await Enrollment.findOne({
    _id: enrollmentId,
    student: studentId
  })
    .populate('course', 'title description instructor duration price')
    .populate('progress.completedModules', 'title order')
    .populate('progress.currentModule', 'title order');

  if (!enrollment) {
    throw new AppError('Enrollment not found', 404);
  }

  res.json({
    success: true,
    data: enrollment
  });
});

/**
 * Helper: Format evaluation parameters with names from criteria
 */
function formatEvaluationParameters(evaluation, criteria) {
  if (!evaluation || !evaluation.parameters || Object.keys(evaluation.parameters).length === 0) {
    return [];
  }

  const parameters = [];
  const paramValues = evaluation.parameters;
  const criteriaParams = criteria?.parameters || [];
  
  // Create a map to track which parameters we've already added
  const addedParams = new Set();

  // If we have criteria metadata with parameter config, use it first
  if (evaluation.criteriaMetadata && evaluation.criteriaMetadata.parametersConfig) {
    evaluation.criteriaMetadata.parametersConfig.forEach(paramConfig => {
      const value = paramValues[paramConfig.name];
      if (value !== undefined && value !== null) {
        parameters.push({
          id: paramConfig.name,
          name: paramConfig.name,
          nameAr: paramConfig.nameAr || null, // Support Arabic if exists
          score: value,
          maxScore: paramConfig.ratingScale?.max || 5
        });
        addedParams.add(paramConfig.name);
      }
    });
  }
  
  // Also check criteria parameters if available
  if (criteriaParams.length > 0) {
    criteriaParams.forEach(paramConfig => {
      const paramName = paramConfig.name;
      // Only add if not already added from criteriaMetadata
      if (!addedParams.has(paramName)) {
        const value = paramValues[paramName];
        if (value !== undefined && value !== null) {
          parameters.push({
            id: paramName,
            name: paramName,
            nameAr: paramConfig.nameAr || null,
            score: value,
            maxScore: paramConfig.ratingScale?.max || 5
          });
          addedParams.add(paramName);
        }
      }
    });
  }

  // IMPORTANT: Add ALL remaining parameters from evaluation.parameters
  // This ensures we return all parameters even if they're not in criteria
  Object.entries(paramValues).forEach(([key, value]) => {
    // Only add if not already added and value is valid
    if (!addedParams.has(key) && typeof value === 'number' && value !== null && value !== undefined) {
      parameters.push({
        id: key,
        name: key,
        nameAr: null,
        score: value,
        maxScore: 5
      });
      addedParams.add(key);
    }
  });

  return parameters;
}

/**
 * Helper: Calculate overall score from evaluation parameters
 */
function calculateOverallScore(evaluation) {
  if (!evaluation || !evaluation.parameters) {
    return evaluation?.overallRating || null; // Already on 0-5 scale
  }

  const parameters = formatEvaluationParameters(evaluation, null);
  if (parameters.length === 0) {
    return evaluation?.overallRating || null; // Already on 0-5 scale
  }

  const sum = parameters.reduce((acc, param) => acc + param.score, 0);
  const average = sum / parameters.length;
  return Math.round(average * 10) / 10; // Round to 1 decimal, scale 0-5
}

// @desc    Get session details for student
// @route   GET /api/student/sessions/:sessionId
// @access  Private (Student)
exports.getSessionDetails = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const studentId = req.user._id;

  // Validate sessionId format
  if (!sessionId.match(/^[0-9a-fA-F]{24}$/)) {
    throw new AppError('Invalid session ID format', 400);
  }

  const Session = require('../models/Session');
  const Group = require('../models/Group');

  // Get session with populated data
  const session = await Session.findById(sessionId)
    .populate('groupId', 'name students courseId')
    .populate('courseId', 'title')
    .lean();

  if (!session) {
    throw new AppError('Session not found', 404);
  }

  // Verify session has valid group and course references
  if (!session.groupId || !session.groupId._id) {
    throw new AppError('Session not found or access denied', 404);
  }

  if (!session.groupId.students || !Array.isArray(session.groupId.students)) {
    throw new AppError('Session not found or access denied', 404);
  }

  // Verify student is in the group
  const isStudentInGroup = session.groupId.students.some(
    student => {
      const studentIdStr = typeof student === 'object' && student._id 
        ? student._id.toString() 
        : student.toString();
      return studentIdStr === studentId.toString();
    }
  );

  if (!isStudentInGroup) {
    throw new AppError('Session not found or access denied', 404);
  }

  // Verify session's course matches student's enrollment
  if (!session.courseId || !session.courseId._id) {
    throw new AppError('Session does not belong to a valid course', 404);
  }

  const enrollment = await Enrollment.findOne({
    student: studentId,
    course: session.courseId._id,
    status: { $in: ['active', 'completed'] }
  });

  if (!enrollment) {
    throw new AppError('Session not found or access denied', 404);
  }

  // Block access to future sessions — date hasn't arrived yet
  if (session.scheduledDate) {
    const sessionDate = new Date(session.scheduledDate);
    const now = new Date();
    // Compare date only (ignore time-of-day) so the session unlocks on the scheduled day
    const sessionDay = new Date(sessionDate.getFullYear(), sessionDate.getMonth(), sessionDate.getDate());
    const today     = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (sessionDay > today) {
      return res.status(403).json({
        success: false,
        locked: true,
        scheduledDate: session.scheduledDate,
        startTime: session.startTime || null,
        endTime: session.endTime || null,
        title: session.title,
        error: { message: 'This session is not yet available' }
      });
    }
  }

  // Get student's attendance for this session — query by sessionId (the actual field on Attendance)
  let attendanceData = null;
  const attendance = await Attendance.findOne({ sessionId }).lean();

  if (attendance && attendance.records) {
    const studentRecord = attendance.records.find(
      r => r.student.toString() === studentId.toString()
    );

    if (studentRecord) {
      attendanceData = {
        status: studentRecord.status, // "present" | "absent" | "late" | "excused"
        checkedInAt: studentRecord.checkInTime
          ? new Date(studentRecord.checkInTime).toISOString()
          : null
      };
    }
  }

  // Get student's evaluation for this session
  let evaluationData = null;
  const evaluation = await StudentEvaluation.findOne({
    studentId,
    sessionId,
    groupId: session.groupId._id
  }).lean();

  if (evaluation) {
    // Get evaluation criteria for formatting parameter names
    // Wrap in try-catch to handle potential errors gracefully
    let criteria = null;
    try {
      if (session.groupId && session.groupId._id && session.courseId && session.courseId._id) {
        criteria = await EvaluationCriteria.getCriteriaForGroup(
          session.groupId._id,
          session.courseId._id
        );
      }
    } catch (error) {
      logger.logError(error, { 
        context: 'getCriteriaForGroup',
        sessionId,
        groupId: session.groupId?._id,
        courseId: session.courseId?._id
      });
      // Continue with null criteria - formatEvaluationParameters handles this
    }

    const parameters = formatEvaluationParameters(evaluation, criteria);
    const overallScore = calculateOverallScore(evaluation);

    evaluationData = {
      overallScore,
      parameters,
      trainerNotes: evaluation.trainerNotes?.generalNotes || null
    };
  }

  // Get PDF materials/resources for this session
  // Use Map to deduplicate by resource ID to avoid duplicates
  const materialsMap = new Map();
  
  // NEW SYSTEM: Get resources via ResourceAssignment
  if (session.groupId && session.groupId._id) {
    const assignments = await ResourceAssignment.find({
      groupId: session.groupId._id,
      sessionId,
      isVisible: true
    })
      .populate({
        path: 'resourceId',
        match: { status: 'active' },
        select: 'title description category fileSize originalName'
      })
      .lean();

    assignments.forEach(assignment => {
      if (assignment.resourceId && assignment.resourceId._id) {
        const resourceId = assignment.resourceId._id.toString();
        if (!materialsMap.has(resourceId)) {
          // Check availability dates
          const now = new Date();
          let isAvailable = true;
          
          if (assignment.availableFrom && now < assignment.availableFrom) {
            isAvailable = false;
          }
          if (assignment.availableUntil && now > assignment.availableUntil) {
            isAvailable = false;
          }
          
          if (isAvailable) {
            materialsMap.set(resourceId, {
              id: resourceId,
              _id: resourceId,
              title: assignment.resourceId.title,
              description: assignment.resourceId.description || '',
              category: assignment.resourceId.category || 'Documents',
              type: 'pdf',
              fileSize: assignment.resourceId.fileSize || 0,
              createdAt: assignment.resourceId.createdAt?.toISOString() || new Date().toISOString(),
              viewerUrl: `/student/resources/${resourceId}/viewer`,
              url: `/student/resources/${resourceId}/viewer`
            });
          }
        }
      }
    });
  }

  // LEGACY SUPPORT: Check TrainerResource for backward compatibility
  if (session.groupId && session.groupId._id) {
    const legacyResources = await TrainerResource.find({
      sessionId,
      status: 'active',
      fileType: 'pdf',
      $or: [
        { 'sharedWith.groupId': session.groupId._id },
        { isPublic: true }
      ]
    })
      .select('_id title fileType originalName')
      .lean();

    legacyResources.forEach(resource => {
      const resourceId = resource._id.toString();
      if (!materialsMap.has(resourceId)) {
        materialsMap.set(resourceId, {
          id: resourceId,
          _id: resourceId,
          title: resource.title,
          description: '',
          category: 'Documents',
          type: 'pdf',
          fileSize: 0,
          createdAt: resource.createdAt?.toISOString() || new Date().toISOString(),
          viewerUrl: `/student/resources/${resourceId}/viewer`,
          url: `/student/resources/${resourceId}/viewer`
        });
      }
    });
  }

  // Also check session lessonPlan attachments (legacy support)
  if (session.lessonPlan && session.lessonPlan.attachments) {
    session.lessonPlan.attachments.forEach(attachment => {
      if (attachment.url && (attachment.fileType === 'pdf' || attachment.url.endsWith('.pdf'))) {
        const attachmentId = attachment.filename || `attachment_${materialsMap.size}`;
        if (!materialsMap.has(attachmentId)) {
          materialsMap.set(attachmentId, {
            _id: attachmentId,
            title: attachment.originalName || 'Course Material',
            description: '',
            category: 'Documents',
            type: 'pdf',
            fileSize: 0,
            createdAt: new Date().toISOString()
          });
        }
      }
    });
  }

  // Convert Map to array
  const materials = Array.from(materialsMap.values());

  // Return first material's viewer URL as pdfUrl (for backward compatibility)
  const pdfUrl = materials.length > 0 && materials[0].viewerUrl
    ? materials[0].viewerUrl
    : (materials.length > 0 && materials[0].url ? materials[0].url : null);

  // Get all tasks linked to this session (CLO-assigned, open automatically
  // for the student when they open the session) along with their own
  // submission status for each, if any. A session can have multiple tasks.
  const Task = require('../models/Task');
  const TaskSubmission = require('../models/TaskSubmission');
  const sessionTasks = await Task.find({
    $or: [{ sessionId }, { sessionIds: sessionId }],
    status: { $ne: 'draft' }
  })
    .select('title titleAr deadline maxScore hasQuestions status')
    .lean();

  const tasksData = await Promise.all(sessionTasks.map(async (sessionTask) => {
    const taskSubmission = await TaskSubmission.findOne({
      taskId: sessionTask._id,
      studentId
    }).select('status score isLate').lean();

    return {
      _id: sessionTask._id.toString(),
      title: sessionTask.title,
      titleAr: sessionTask.titleAr || null,
      deadline: sessionTask.deadline,
      maxScore: sessionTask.maxScore,
      hasQuestions: sessionTask.hasQuestions,
      status: sessionTask.status,
      submission: taskSubmission ? {
        status: taskSubmission.status,
        score: taskSubmission.score,
        isLate: taskSubmission.isLate
      } : null
    };
  }));

  // Build response matching mobile app + web frontend requirements
  const response = {
    success: true,
    session: {
      id: session._id.toString(),
      _id: session._id.toString(),
      title: session.title,
      titleAr: session.titleAr || null,
      description: session.description || null,
      type: session.type || 'session',
      scheduledDate: session.scheduledDate
        ? session.scheduledDate.toISOString()
        : null,
      date: session.scheduledDate
        ? session.scheduledDate.toISOString().split('T')[0]
        : null,
      startTime: session.startTime || null,
      endTime: session.endTime || null,
      location: session.location || null,
      courseId: session.courseId ? {
        _id: session.courseId._id.toString(),
        title: session.courseId.title
      } : null,
      pdfUrl,
      materials: materials.length > 0 ? materials : null,
      attendance: attendanceData,
      evaluation: evaluationData,
      hasVideo: !!(session.video?.hasVideo && session.video?.youtubeId),
      tasks: tasksData
    }
  };

  logger.info('Session details retrieved for student', {
    studentId,
    sessionId,
    hasAttendance: !!attendanceData,
    hasEvaluation: !!evaluationData,
    materialsCount: materials.length
  });

  res.json(response);
});

/**
 * Get all evaluations for the logged-in student
 * GET /api/student/evaluations
 */
exports.getMyEvaluations = asyncHandler(async (req, res) => {
  const studentId = req.user._id;

  const evaluations = await StudentEvaluation.find({ studentId })
    .populate({ path: 'sessionId', select: 'title scheduledDate type courseId', populate: { path: 'courseId', select: 'title' } })
    .populate('groupId', 'name')
    .sort({ evaluationDate: -1 })
    .lean();

  const result = evaluations
    .filter(e => e.sessionId)
    .map(e => ({
      _id: e._id,
      sessionId: e.sessionId?._id,
      sessionTitle: e.sessionId?.title || 'Session',
      sessionDate: e.sessionId?.scheduledDate || null,
      sessionType: e.sessionId?.type || null,
      courseId: e.sessionId?.courseId?._id || null,
      courseName: e.sessionId?.courseId?.title || null,
      groupName: e.groupId?.name || null,
      overallScore: e.overallRating ?? null,
      maxScore: 5,
      parameters: Array.isArray(e.parameters)
        ? e.parameters.map(p => ({ name: p.name, score: p.rating ?? p.score ?? 0, maxScore: p.maxRating ?? 5 }))
        : [],
      trainerNotes: e.trainerNotes?.generalNotes || null,
      evaluationDate: e.evaluationDate || e.createdAt
    }));

  // Group by courseId (fall back to groupName key for sessions without a course)
  const courseMap = new Map();
  for (const ev of result) {
    const key = ev.courseId ? ev.courseId.toString() : `group:${ev.groupName}`;
    if (!courseMap.has(key)) {
      courseMap.set(key, {
        courseId: ev.courseId,
        courseName: ev.courseName || ev.groupName || 'Unknown Course',
        groupName: ev.groupName,
        evaluations: []
      });
    }
    courseMap.get(key).evaluations.push(ev);
  }

  // Build courseGroups with per-course average and percentage
  const courseGroups = Array.from(courseMap.values()).map(group => {
    const scored = group.evaluations.filter(e => e.overallScore !== null);
    const avgRaw = scored.length
      ? scored.reduce((s, e) => s + e.overallScore, 0) / scored.length
      : null;
    const percentage = avgRaw !== null ? Math.round((avgRaw / 5) * 100) : null;
    return {
      courseId: group.courseId,
      courseName: group.courseName,
      groupName: group.groupName,
      totalSessions: group.evaluations.length,
      scoredSessions: scored.length,
      averageScore: avgRaw !== null ? Math.round(avgRaw * 10) / 10 : null,
      percentage,
      evaluations: group.evaluations
    };
  });

  // Overall average across courses (average of course averages) — only meaningful with 2+ courses
  const coursesWithScore = courseGroups.filter(c => c.averageScore !== null);
  const overallAverage = coursesWithScore.length >= 2
    ? Math.round((coursesWithScore.reduce((s, c) => s + c.averageScore, 0) / coursesWithScore.length) * 10) / 10
    : null;
  const overallPercentage = overallAverage !== null ? Math.round((overallAverage / 5) * 100) : null;

  res.json({
    success: true,
    evaluations: result,
    total: result.length,
    courseGroups,
    overallAverage,
    overallPercentage
  });
});

// ─── Session Video (secured embed) ───────────────────────────────────────────

const jwt = require('jsonwebtoken');
const Session = require('../models/Session');

function getJwtSecret() {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error('JWT_SECRET not configured');
  return s;
}

/**
 * GET /api/student/sessions/:sessionId/video-token
 * Issues a 15-min signed token so the student can request the embed URL.
 * Never reveals the YouTube ID.
 */
exports.getSessionVideoToken = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const studentId = req.user._id;

  const session = await Session.findById(sessionId)
    .populate('groupId', 'students')
    .lean();

  if (!session) throw new AppError('Session not found', 404);

  // Verify student is in the group
  const inGroup = (session.groupId?.students || []).some(
    s => s.toString() === studentId.toString()
  );
  if (!inGroup) throw new AppError('Access denied', 403);

  if (!session.video?.hasVideo || !session.video?.youtubeId) {
    throw new AppError('This session has no video', 404);
  }

  const token = jwt.sign(
    { sessionId: sessionId.toString(), userId: studentId.toString(), purpose: 'video-embed' },
    getJwtSecret(),
    { expiresIn: '15m' }
  );

  res.json({ success: true, data: { token, expiresIn: 900 } });
});

/**
 * GET /api/student/sessions/:sessionId/video-embed?token=<jwt>
 * Serves a full HTML page with controls=0 + custom JS player controls.
 * Because this is a real page load (not a direct embed), YouTube does not
 * trigger the bot/sign-in check. The YouTube ID never reaches the client.
 */
exports.getSessionVideoEmbed = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const { token } = req.query;

  if (!token) throw new AppError('Video token required', 400);

  let payload;
  try {
    payload = jwt.verify(token, getJwtSecret());
  } catch {
    throw new AppError('Video token is invalid or expired', 401);
  }

  if (payload.purpose !== 'video-embed' || payload.sessionId !== sessionId) {
    throw new AppError('Video token mismatch', 401);
  }

  const session = await Session.findById(sessionId).select('video').lean();
  if (!session?.video?.hasVideo || !session?.video?.youtubeId) {
    throw new AppError('This session has no video', 404);
  }

  const backendOrigin = process.env.BACKEND_URL || 'https://robotrick-backend-production.up.railway.app';
  const frontendOrigin = process.env.CLIENT_ORIGIN || 'https://robotrick-main.vercel.app';
  const ytId = session.video.youtubeId;

  // Mobile (React Native WebView) requests ?format=json — return the embed URL
  // directly so the WebView loads youtube-nocookie.com with no iframe nesting.
  // Web iframe loads this endpoint as a page (no format param) — return HTML.
  if (req.query.format === 'json') {
    const embedUrl = `https://www.youtube-nocookie.com/embed/${ytId}?controls=1&rel=0&playsinline=1`;
    return res.json({ success: true, data: { embedUrl } });
  }

  // 514×289 scaling technique — YouTube hides "Watch on YouTube" below 514px wide.
  const embedSrc = `https://www.youtube-nocookie.com/embed/${ytId}?controls=1&rel=0&playsinline=1&enablejsapi=1&origin=${encodeURIComponent(backendOrigin)}`;

  res.removeHeader('X-Frame-Options');
  res.setHeader('Content-Security-Policy',
    `default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; ` +
    `frame-src https://www.youtube-nocookie.com; img-src data: https:; connect-src 'self'; ` +
    `frame-ancestors ${frontendOrigin} http://localhost:5173 http://localhost:5174 http://localhost:3000`
  );
  res.setHeader('Content-Type', 'text/html; charset=utf-8');

  res.send(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;background:#000;overflow:hidden}
#outer{width:100%;height:100%;overflow:hidden;position:relative}
#scaler{position:absolute;top:0;left:0;width:514px;height:289px;transform-origin:top left}
#yt{width:514px;height:289px;border:none;display:block}
</style>
</head>
<body>
<div id="outer">
  <div id="scaler">
    <iframe id="yt" src="${embedSrc}"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
      allowfullscreen
    ></iframe>
  </div>
</div>
<script>
var scaler = document.getElementById('scaler');
function rescale() {
  scaler.style.transform = 'scale('+( window.innerWidth/514)+','+(window.innerHeight/289)+')';
}
rescale();
window.addEventListener('resize', rescale);
document.addEventListener('fullscreenchange', rescale);
</script>
</body>
</html>`);
});


module.exports = exports;
