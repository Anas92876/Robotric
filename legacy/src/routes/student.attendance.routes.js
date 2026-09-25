const express = require('express');
const router = express.Router();
const { protect: authenticate } = require('../middleware/auth');
const {
  getAttendanceOverview,
  getCourseAttendance,
  getAttendanceSummary,
  getMonthlyAttendance
} = require('../controllers/student.attendance.controller');

// All routes require authentication
router.use(authenticate);

// @route   GET /api/student/attendance/overview
router.get('/overview', getAttendanceOverview);

// @route   GET /api/student/attendance/courses/:courseId
router.get('/courses/:courseId', getCourseAttendance);

// @route   GET /api/student/attendance/summary/:courseId
router.get('/summary/:courseId', getAttendanceSummary);

// @route   GET /api/student/attendance/courses/:courseId/month/:year/:month
router.get('/courses/:courseId/month/:year/:month', getMonthlyAttendance);

module.exports = router;
