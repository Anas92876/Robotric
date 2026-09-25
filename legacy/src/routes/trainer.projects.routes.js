/**
 * Trainer Projects Routes
 */

const express = require('express');
const router = express.Router();
const { requireAuth, requireRoles } = require('../middleware/auth');
const { requireGroupOwnership } = require('../middleware/groupOwnership');
const upload = require('../middleware/upload');
const {
  createProject,
  getProjectDetails,
  getGroupProjects,
  uploadProjectImages,
  deleteProjectImage,
  updateProject,
  changeProjectStatus,
  gradeProject,
  deleteProject
} = require('../controllers/trainer.projects.controller');

// All routes require authentication and trainer role
router.use(requireAuth);
router.use(requireRoles('trainer'));

// POST /api/trainer/projects - Create project
router.post('/', createProject);

// GET /api/trainer/projects/group/:groupId - Get all projects for a group
router.get('/group/:groupId', requireGroupOwnership, getGroupProjects);

// GET /api/trainer/projects/:projectId - Get project details
router.get('/:projectId', getProjectDetails);

// PUT /api/trainer/projects/:projectId - Update project
router.put('/:projectId', updateProject);

// POST /api/trainer/projects/:projectId/images - Upload project images
router.post('/:projectId/images', upload.array('images', 20), uploadProjectImages);

// DELETE /api/trainer/projects/:projectId/images/:imageIndex - Delete project image
router.delete('/:projectId/images/:imageIndex', deleteProjectImage);

// PATCH /api/trainer/projects/:projectId/status - Change project status
router.patch('/:projectId/status', changeProjectStatus);

// POST /api/trainer/projects/:projectId/grade - Grade project
router.post('/:projectId/grade', gradeProject);

// DELETE /api/trainer/projects/:projectId - Delete project
router.delete('/:projectId', deleteProject);

module.exports = router;
