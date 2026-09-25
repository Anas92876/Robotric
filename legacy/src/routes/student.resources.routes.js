const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getViewerUrl, downloadResource, getSessionMaterials } = require('../controllers/student.resources.controller');
const { viewerLimiter } = require('../middleware/resource-rateLimiting');

// All routes require authentication
router.use(protect);

// @route   GET /api/student/resources/:resourceId/viewer
// @desc    Get PDF viewer URL (generates one-time secure token)
// @access  Private (Student, Trainer, CLO, Admin)
router.get('/:resourceId/viewer', viewerLimiter, getViewerUrl);

// @route   GET /api/student/resources/:resourceId/download
// @desc    Download resource with one-time token (IP-locked)
// @access  Private (Token-based, single-use)
router.get('/:resourceId/download', downloadResource);

// @route   GET /api/student/sessions/:sessionId/materials
// @desc    Get all materials for a session
// @access  Private (Students in group)
router.get('/sessions/:sessionId/materials', getSessionMaterials);

module.exports = router;
