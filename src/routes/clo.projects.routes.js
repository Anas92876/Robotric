/**
 * CLO Projects Routes
 */

const express = require('express');
const router = express.Router();
const { requireAuth, requireRoles } = require('../middleware/auth');
const {
  getAllProjects,
  getProjectDetails
} = require('../controllers/clo.projects.controller');

// All routes require authentication and CLO role
router.use(requireAuth);
router.use(requireRoles('clo', 'admin', 'superadmin'));

// GET /api/clo/projects - Get all projects
router.get('/', getAllProjects);

// GET /api/clo/projects/:projectId - Get project details
router.get('/:projectId', getProjectDetails);

module.exports = router;
