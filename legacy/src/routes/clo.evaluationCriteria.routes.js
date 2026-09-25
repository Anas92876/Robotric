/**
 * CLO Evaluation Criteria Routes
 *
 * Routes for CLO to manage evaluation criteria/parameters
 * CLO can create criteria for courses or specific groups
 *
 * @routes /api/clo/evaluation-criteria
 * @version 1.0.0
 */

const express = require('express');
const router = express.Router();
const {
  getAllCriteria,
  getCriteriaById,
  createCriteria,
  updateCriteria,
  deleteCriteria,
  getCriteriaForGroup
} = require('../controllers/clo.evaluationCriteria.controller');

const { requireAuth, requireRoles } = require('../middleware/auth');

/**
 * @route   GET /api/clo/evaluation-criteria
 * @desc    Get all evaluation criteria created by CLO
 * @access  Private (CLO only)
 * @query   courseId, status
 */
router.get('/',
  requireAuth,
  requireRoles('clo', 'admin', 'superadmin'),
  getAllCriteria
);

/**
 * @route   GET /api/clo/evaluation-criteria/:id
 * @desc    Get single evaluation criteria by ID
 * @access  Private (CLO only)
 */
router.get('/:id',
  requireAuth,
  requireRoles('clo', 'admin', 'superadmin'),
  getCriteriaById
);

/**
 * @route   POST /api/clo/evaluation-criteria
 * @desc    Create new evaluation criteria
 * @access  Private (CLO only)
 * @body    name, description, appliesTo, courseId, groupIds, parameters, etc.
 */
router.post('/',
  requireAuth,
  requireRoles('clo', 'admin', 'superadmin'),
  createCriteria
);

/**
 * @route   PUT /api/clo/evaluation-criteria/:id
 * @desc    Update evaluation criteria
 * @access  Private (CLO only)
 */
router.put('/:id',
  requireAuth,
  requireRoles('clo', 'admin', 'superadmin'),
  updateCriteria
);

/**
 * @route   DELETE /api/clo/evaluation-criteria/:id
 * @desc    Archive evaluation criteria (soft delete)
 * @access  Private (CLO only)
 */
router.delete('/:id',
  requireAuth,
  requireRoles('clo', 'admin', 'superadmin'),
  deleteCriteria
);

/**
 * @route   GET /api/trainer/evaluation-criteria/group/:groupId
 * @desc    Get evaluation criteria for a specific group (for trainers)
 * @access  Private (Trainer only)
 */
router.get('/group/:groupId',
  requireAuth,
  requireRoles('trainer', 'teacher', 'clo', 'admin', 'superadmin'),
  getCriteriaForGroup
);

module.exports = router;
