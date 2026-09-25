/**
 * Trainer Groups Routes
 *
 * Routes for managing trainer groups including:
 * - Group CRUD operations
 * - Student management
 * - Group statistics
 */

const express = require('express');
const router = express.Router();
const { protect: authenticate } = require('../middleware/auth');
const {
  getAllGroups,
  getGroupById,
  createGroup,
  updateGroup,
  deleteGroup,
  addStudentToGroup,
  removeStudentFromGroup,
  getGroupStats,
  getGroupStudents,
  getCourses
} = require('../controllers/trainer.groups.controller');

// All routes require authentication
router.use(authenticate);

// @route   GET /api/trainer/groups
// @desc    Get all trainer's groups (read-only, assigned groups only)
// @access  Private (Trainer)
router.get('/', getAllGroups);

// @route   GET /api/trainer/groups/:groupId
// @desc    Get group details (read-only)
// @access  Private (Trainer)
router.get('/:groupId', getGroupById);

// Note: Group creation, updates, and deletion are now handled by CLO only
// Trainers can only view their assigned groups and manage students within them

// @route   POST /api/trainer/groups/:groupId/students
// @desc    Add student to group
// @access  Private (Trainer)
router.post('/:groupId/students', addStudentToGroup);

// @route   DELETE /api/trainer/groups/:groupId/students/:studentId
// @desc    Remove student from group
// @access  Private (Trainer)
router.delete('/:groupId/students/:studentId', removeStudentFromGroup);

// @route   GET /api/trainer/groups/:groupId/stats
// @desc    Get group statistics
// @access  Private (Trainer)
router.get('/:groupId/stats', getGroupStats);

// @route   GET /api/trainer/groups/:groupId/students
// @desc    Get group students
// @access  Private (Trainer)
router.get('/:groupId/students', getGroupStudents);

// @route   GET /api/trainer/courses
// @desc    Get all available courses
// @access  Private (Trainer)
router.get('/courses/all', getCourses);

module.exports = router;
