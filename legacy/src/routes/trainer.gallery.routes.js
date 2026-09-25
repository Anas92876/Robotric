/**
 * Trainer Gallery Routes
 */

const express = require('express');
const router = express.Router();
const { requireAuth, requireRoles } = require('../middleware/auth');
const { requireGroupOwnership } = require('../middleware/groupOwnership');
const upload = require('../middleware/upload');
const {
  uploadMomentImage,
  uploadProjectImage,
  getGroupGallery,
  deleteImage
} = require('../controllers/trainer.gallery.controller');

// All routes require authentication and trainer role
router.use(requireAuth);
router.use(requireRoles('trainer'));

// POST /api/trainer/gallery/moments - Upload moment image
router.post('/moments', upload.single('image'), uploadMomentImage);

// POST /api/trainer/gallery/projects - Upload project image
router.post('/projects', upload.single('image'), uploadProjectImage);

// GET /api/trainer/gallery/group/:groupId - Get gallery for a group
router.get('/group/:groupId', requireGroupOwnership, getGroupGallery);

// DELETE /api/trainer/gallery/:imageId - Delete image
router.delete('/:imageId', deleteImage);

module.exports = router;
