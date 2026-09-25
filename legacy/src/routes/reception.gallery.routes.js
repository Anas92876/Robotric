/**
 * Reception Gallery Routes
 */

const express = require('express');
const router = express.Router();
const { requireAuth, requireReception } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  uploadMomentImage,
  getGroupGallery,
  getAllGroups,
  deleteImage
} = require('../controllers/reception.gallery.controller');

// All routes require authentication and reception role
router.use(requireAuth);
router.use(requireReception);

// GET /api/reception/gallery/groups - Get all groups (for group picker)
router.get('/groups', getAllGroups);

// POST /api/reception/gallery/moments - Upload moment image (one or multiple groups)
router.post('/moments', upload.single('image'), uploadMomentImage);

// GET /api/reception/gallery/group/:groupId - Get gallery for a group
router.get('/group/:groupId', getGroupGallery);

// DELETE /api/reception/gallery/:imageId - Delete image
router.delete('/:imageId', deleteImage);

module.exports = router;
