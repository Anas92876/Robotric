/**
 * Student Gallery Routes
 */

const express = require('express');
const router = express.Router();
const { requireAuth, requireRoles } = require('../middleware/auth');
const {
  getGallery,
  getImageDetails
} = require('../controllers/student.gallery.controller');

// All routes require authentication and student role
router.use(requireAuth);
router.use(requireRoles('student'));

// GET /api/student/gallery - Get gallery images
router.get('/', getGallery);

// GET /api/student/gallery/:imageId - Get image details
router.get('/:imageId', getImageDetails);

module.exports = router;
