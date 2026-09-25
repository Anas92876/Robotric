const express = require('express');
const router  = express.Router();
const { protect, requireCLO } = require('../middleware/auth');

const {
  getAllSessions,
  getSessionById,
  createSession,
  updateSession,
  deleteSession,
  updateLessonPlan
} = require('../controllers/clo.sessions.controller');

// All routes require authentication + CLO role (clo, admin, superadmin)
router.use(protect);
router.use(requireCLO);

// @route   GET /api/clo/sessions
// @desc    Get all sessions (filtered by groupId, status, date range, search)
// @access  CLO, Admin, Superadmin
router.get('/', getAllSessions);

// @route   GET /api/clo/sessions/:sessionId
// @desc    Get session details
// @access  CLO, Admin, Superadmin
router.get('/:sessionId', getSessionById);

// @route   POST /api/clo/sessions
// @desc    Create a new session for any group
// @access  CLO, Admin, Superadmin
router.post('/', createSession);

// @route   PUT /api/clo/sessions/:sessionId
// @desc    Update a session
// @access  CLO, Admin, Superadmin
router.put('/:sessionId', updateSession);

// @route   DELETE /api/clo/sessions/:sessionId
// @desc    Delete or cancel a session (query: permanent, reason)
// @access  CLO, Admin, Superadmin
router.delete('/:sessionId', deleteSession);

// @route   PUT /api/clo/sessions/:sessionId/lesson-plan
// @desc    Update lesson plan
// @access  CLO, Admin, Superadmin
router.put('/:sessionId/lesson-plan', updateLessonPlan);

module.exports = router;
