const express = require('express');
const router = express.Router();
const { protect: authenticate } = require('../middleware/auth');
const {
  getModuleContent,
  startModule,
  completeModule,
  updateModuleProgress,
  getModuleProgress,
  getNextModule,
  getPreviousModule
} = require('../controllers/student.modules.controller');

// All routes require authentication
router.use(authenticate);

// @route   GET /api/student/modules/:moduleId
router.get('/:moduleId', getModuleContent);

// @route   POST /api/student/modules/:moduleId/start
router.post('/:moduleId/start', startModule);

// @route   POST /api/student/modules/:moduleId/complete
router.post('/:moduleId/complete', completeModule);

// @route   PATCH /api/student/modules/:moduleId/progress
router.patch('/:moduleId/progress', updateModuleProgress);

// @route   GET /api/student/modules/:moduleId/progress
router.get('/:moduleId/progress', getModuleProgress);

// @route   GET /api/student/modules/:moduleId/next
router.get('/:moduleId/next', getNextModule);

// @route   GET /api/student/modules/:moduleId/previous
router.get('/:moduleId/previous', getPreviousModule);

module.exports = router;
