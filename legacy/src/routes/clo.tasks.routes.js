/**
 * CLO Tasks Routes
 */

const express = require('express');
const router = express.Router();
const { requireAuth, requireRoles } = require('../middleware/auth');
const {
  createTask,
  updateTask,
  deleteTask,
  publishTask,
  duplicateTask,
  getAllTasks,
  getTaskDetails,
  getTaskResults
} = require('../controllers/clo.tasks.controller');

// All routes require authentication and CLO role
router.use(requireAuth);
router.use(requireRoles('clo', 'admin', 'superadmin'));

// POST /api/clo/tasks - Create a task linked to a session
router.post('/', createTask);

// GET /api/clo/tasks - Get all tasks
router.get('/', getAllTasks);

// PATCH /api/clo/tasks/:taskId/publish - Publish a draft task
router.patch('/:taskId/publish', publishTask);

// POST /api/clo/tasks/:taskId/duplicate - Duplicate a task as a draft copy
router.post('/:taskId/duplicate', duplicateTask);

// GET /api/clo/tasks/:taskId/results - Get task results statistics
router.get('/:taskId/results', getTaskResults);

// GET /api/clo/tasks/:taskId - Get task details with submissions
router.get('/:taskId', getTaskDetails);

// PUT /api/clo/tasks/:taskId - Update task
router.put('/:taskId', updateTask);

// DELETE /api/clo/tasks/:taskId - Delete task
router.delete('/:taskId', deleteTask);

module.exports = router;
