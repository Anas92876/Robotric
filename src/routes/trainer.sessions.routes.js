/**
 * Trainer Sessions Routes
 *
 * Routes for managing trainer sessions including:
 * - Session CRUD operations
 * - Session status management (start, end, cancel)
 * - Calendar views
 * - Lesson plan management
 *
 * @routes TrainerSessionsRoutes
 * @version 1.0.0
 */

const express = require('express');
const router = express.Router();
const { protect: authenticate } = require('../middleware/auth');
const {
  getAllSessions,
  getSessionById,
  createSession,
  updateSession,
  deleteSession,
  startSession,
  endSession,
  getCalendarView,
  updateLessonPlan
} = require('../controllers/trainer.sessions.controller');

// All routes require authentication
router.use(authenticate);

// @route   GET /api/trainer/sessions/calendar
// @desc    Get calendar view of sessions
// @access  Private (Trainer)
// @query   view (day|week|month), date
router.get('/calendar', getCalendarView);

// @route   GET /api/trainer/sessions
// @desc    Get all trainer's sessions
// @access  Private (Trainer)
// @query   groupId, status, startDate, endDate, search
router.get('/', getAllSessions);

// @route   GET /api/trainer/sessions/:sessionId
// @desc    Get session details
// @access  Private (Trainer)
router.get('/:sessionId', getSessionById);

// @route   POST /api/trainer/sessions
// @desc    Create new session
// @access  Private (Trainer)
router.post('/', createSession);

// @route   PUT /api/trainer/sessions/:sessionId
// @desc    Update session
// @access  Private (Trainer)
router.put('/:sessionId', updateSession);

// @route   DELETE /api/trainer/sessions/:sessionId
// @desc    Delete/cancel session
// @access  Private (Trainer)
// @query   permanent (true|false), reason
router.delete('/:sessionId', deleteSession);

// @route   POST /api/trainer/sessions/:sessionId/start
// @desc    Start session
// @access  Private (Trainer)
router.post('/:sessionId/start', startSession);

// @route   POST /api/trainer/sessions/:sessionId/end
// @desc    End session
// @access  Private (Trainer)
router.post('/:sessionId/end', endSession);

// @route   PUT /api/trainer/sessions/:sessionId/lesson-plan
// @desc    Update lesson plan
// @access  Private (Trainer)
router.put('/:sessionId/lesson-plan', updateLessonPlan);

module.exports = router;
