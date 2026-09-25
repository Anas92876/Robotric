/**
 * Student Tasks Routes
 */

const express = require('express');
const router = express.Router();
const { requireAuth, requireRoles } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  getMyTasks,
  getTaskDetails,
  submitTask
} = require('../controllers/student.tasks.controller');

// All routes require authentication and student role
router.use(requireAuth);
router.use(requireRoles('student'));

// GET /api/student/tasks - Get all tasks for student
router.get('/', getMyTasks);

// GET /api/student/tasks/:taskId - Get task details
router.get('/:taskId', getTaskDetails);

// POST /api/student/tasks/:taskId/submit - Submit task (with file uploads)
router.post('/:taskId/submit', upload.array('files', 20), submitTask);

module.exports = router;
