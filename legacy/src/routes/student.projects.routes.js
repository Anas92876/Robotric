/**
 * Student Projects Routes
 */

const express = require('express');
const router = express.Router();
const { requireAuth, requireRoles } = require('../middleware/auth');
const {
  getMyProjects,
  getProjectDetails
} = require('../controllers/student.projects.controller');

// All routes require authentication and student role
router.use(requireAuth);
router.use(requireRoles('student'));

// GET /api/student/projects - Get all projects for student
router.get('/', getMyProjects);

// GET /api/student/projects/:projectId - Get project details
router.get('/:projectId', getProjectDetails);

module.exports = router;
