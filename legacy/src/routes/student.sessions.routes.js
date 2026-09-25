const express = require('express');
const router = express.Router();
const { protect: authenticate } = require('../middleware/auth');
const {
  getSessionDetails,
  getMyEvaluations,
  getSessionVideoToken,
  getSessionVideoEmbed
} = require('../controllers/student.courses.controller');

// Public — JWT validated inside the handler; loaded as iframe src (no auth header)
router.get('/:sessionId/video-embed', getSessionVideoEmbed);

// All remaining routes require authentication
router.use(authenticate);

// @route   GET /api/student/sessions/evaluations
router.get('/evaluations', getMyEvaluations);

// @route   GET /api/student/sessions/:sessionId/video-token
router.get('/:sessionId/video-token', getSessionVideoToken);

// @route   GET /api/student/sessions/:sessionId
router.get('/:sessionId', getSessionDetails);

module.exports = router;
