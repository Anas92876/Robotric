/**
 * CLO Gallery Routes
 */

const express = require('express');
const router = express.Router();
const { requireAuth, requireRoles } = require('../middleware/auth');
const {
  getAllGallery
} = require('../controllers/clo.gallery.controller');

// All routes require authentication and CLO role
router.use(requireAuth);
router.use(requireRoles('clo', 'admin', 'superadmin'));

// GET /api/clo/gallery - Get all gallery images
router.get('/', getAllGallery);

module.exports = router;
