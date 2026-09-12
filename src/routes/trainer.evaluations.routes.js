/**
 * Trainer Evaluations Routes
 *
 * API routes for trainer evaluation operations
 *
 * @routes TrainerEvaluationsRoutes
 * @version 1.0.0
 */

const express = require('express');
const router = express.Router();
const { protect: authenticate } = require('../middleware/auth');
const {
  createEvaluation,
  updateEvaluation,
  getEvaluationById,
  getEvaluations,
  getSessionEvaluations,
  getStudentEvaluations,
  getEvaluationStats,
  bulkCreateEvaluations,
  deleteEvaluation,
  shareEvaluation,
  getFlaggedStudents
} = require('../controllers/trainer.evaluations.controller');

const {
  getCriteriaForGroup
} = require('../controllers/clo.evaluationCriteria.controller');

// All routes require authentication
router.use(authenticate);

// ===== Specialized Routes (must come before parameterized routes) =====

/**
 * @route   GET /api/trainer/evaluations/stats
 * @desc    Get evaluation statistics
 * @access  Trainer only
 */
router.get('/stats', getEvaluationStats);

/**
 * @route   GET /api/trainer/evaluations/flagged
 * @desc    Get students flagged for attention
 * @access  Trainer only
 */
router.get('/flagged', getFlaggedStudents);

/**
 * @route   POST /api/trainer/evaluations/bulk
 * @desc    Create multiple evaluations at once
 * @access  Trainer only
 */
router.post('/bulk', bulkCreateEvaluations);

/**
 * @route   GET /api/trainer/evaluations/session/:sessionId
 * @desc    Get all evaluations for a specific session
 * @access  Trainer only
 */
router.get('/session/:sessionId', getSessionEvaluations);

/**
 * @route   GET /api/trainer/evaluations/student/:studentId
 * @desc    Get all evaluations for a specific student
 * @access  Trainer only
 */
router.get('/student/:studentId', getStudentEvaluations);

/**
 * @route   GET /api/trainer/evaluations/criteria/group/:groupId
 * @desc    Get evaluation criteria for a specific group
 * @access  Trainer only
 */
router.get('/criteria/group/:groupId', getCriteriaForGroup);

// ===== CRUD Operations =====

/**
 * @route   POST /api/trainer/evaluations
 * @desc    Create a new student evaluation
 * @access  Trainer only
 */
router.post('/', createEvaluation);

/**
 * @route   GET /api/trainer/evaluations
 * @desc    Get all evaluations with filters
 * @access  Trainer only
 */
router.get('/', getEvaluations);

/**
 * @route   GET /api/trainer/evaluations/:id
 * @desc    Get a single evaluation by ID
 * @access  Trainer only
 */
router.get('/:id', getEvaluationById);

/**
 * @route   PUT /api/trainer/evaluations/:id
 * @desc    Update an existing evaluation
 * @access  Trainer only
 */
router.put('/:id', updateEvaluation);

/**
 * @route   DELETE /api/trainer/evaluations/:id
 * @desc    Delete an evaluation
 * @access  Trainer only
 */
router.delete('/:id', deleteEvaluation);

// ===== Actions =====

/**
 * @route   POST /api/trainer/evaluations/:id/share
 * @desc    Share evaluation with student/parent
 * @access  Trainer only
 */
router.post('/:id/share', shareEvaluation);

module.exports = router;
