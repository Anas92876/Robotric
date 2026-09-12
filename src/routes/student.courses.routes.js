const express = require('express');
const router = express.Router();
const { protect: authenticate } = require('../middleware/auth');
const {
  getMyCourses,
  getCourseDetails,
  getCourseSessions,
  enrollInCourse,
  getEnrollmentDetails
} = require('../controllers/student.courses.controller');

// All routes require authentication
router.use(authenticate);

// @route   GET /api/student/courses
router.get('/', getMyCourses);

// @route   GET /api/student/courses/:courseId
router.get('/:courseId', getCourseDetails);

// @route   GET /api/student/courses/:courseId/sessions
router.get('/:courseId/sessions', getCourseSessions);

// @route   POST /api/student/courses/:courseId/enroll
router.post('/:courseId/enroll', enrollInCourse);

// @route   GET /api/student/enrollments/:enrollmentId
router.get('/enrollments/:enrollmentId', getEnrollmentDetails);

module.exports = router;
