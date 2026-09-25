/**
 * Trainer Tasks Routes
 */

const express = require('express');
const router = express.Router();
const { requireAuth, requireRoles } = require('../middleware/auth');
const { requireGroupOwnership } = require('../middleware/groupOwnership');
const {
  createTask,
  getGroupTasks,
  getTaskDetails,
  updateTask,
  deleteTask,
  publishTask,
  getTaskSubmissions,
  gradeTaskSubmission,
  downloadSubmissionFile
} = require('../controllers/trainer.tasks.controller');

// All routes require authentication and trainer role
router.use(requireAuth);
router.use(requireRoles('trainer'));

// POST /api/trainer/tasks - Create task
router.post('/', createTask);

// GET /api/trainer/tasks/group/:groupId - Get all tasks for a group
router.get('/group/:groupId', requireGroupOwnership, getGroupTasks);

// Specific routes must come before generic :taskId routes
// PATCH /api/trainer/tasks/:taskId/publish - Publish a draft task
router.patch('/:taskId/publish', publishTask);

// GET /api/trainer/tasks/:taskId/submissions - Get all submissions for a task
router.get('/:taskId/submissions', getTaskSubmissions);

// POST /api/trainer/tasks/:taskId/submissions/:submissionId/grade - Grade submission
router.post('/:taskId/submissions/:submissionId/grade', gradeTaskSubmission);

// GET /api/trainer/tasks/:taskId/submissions/:submissionId/files/:fileId - Download attached file
router.get('/:taskId/submissions/:submissionId/files/:fileId', downloadSubmissionFile);

// Generic routes come last
// GET /api/trainer/tasks/:taskId - Get task details with questions and submissions
router.get('/:taskId', getTaskDetails);

// PUT /api/trainer/tasks/:taskId - Update task
router.put('/:taskId', updateTask);

// DELETE /api/trainer/tasks/:taskId - Delete task
router.delete('/:taskId', deleteTask);

module.exports = router;
