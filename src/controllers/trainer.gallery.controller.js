/**
 * Trainer Gallery Controller
 * 
 * Handles gallery-related operations for trainers
 */

const asyncHandler = require('../utils/asyncHandler');
const { NotFoundError, ForbiddenError, BadRequestError, AppError } = require('../utils/errors');
const Gallery = require('../models/Gallery');
const Group = require('../models/Group');
const Project = require('../models/Project');
const { uploadImage, deleteImage, generateThumbnailUrl } = require('../services/cloudinary.service');
const logger = require('../utils/logger');

/**
 * @desc    Upload moment image
 * @route   POST /api/trainer/gallery/moments
 * @access  Private (Trainer)
 */
exports.uploadMomentImage = asyncHandler(async (req, res) => {
  const trainerId = req.user._id || req.user.id;
  const { groupId, title, description } = req.body;
  const file = req.file;

  if (!file) {
    throw new BadRequestError('No image provided', 'NO_IMAGE');
  }

  if (!file.mimetype.startsWith('image/')) {
    throw new BadRequestError('File is not an image', 'INVALID_FILE_TYPE');
  }

  // Validate trainer owns the group
  const group = await Group.findById(groupId);
  if (!group) {
    throw new NotFoundError('Group not found', 'GROUP_NOT_FOUND');
  }

  if (group.trainerId.toString() !== trainerId.toString()) {
    throw new ForbiddenError('You do not own this group', 'GROUP_OWNERSHIP_REQUIRED');
  }

  // Upload to Cloudinary
  const folder = `robotric/gallery/${groupId}/moments`;
  const uploadResult = await uploadImage(file.buffer, folder);

  // Generate and validate thumbnail URL
  const thumbnailUrl = generateThumbnailUrl(uploadResult.public_id);
  if (!thumbnailUrl) {
    logger.logError(new Error('Failed to generate valid thumbnail URL'), {
      context: 'gallery_upload',
      publicId: uploadResult.public_id,
      trainerId: trainerId
    });
    throw new AppError('Failed to generate thumbnail URL', 500);
  }

  // Create gallery record
  const gallery = await Gallery.create({
    groupId,
    type: 'moment',
    uploadedBy: trainerId,
    cloudinaryUrl: uploadResult.secure_url,
    cloudinaryPublicId: uploadResult.public_id,
    thumbnailUrl, // Validated and standardized
    title: title || null,
    description: description || null
  });

  logger.info('Moment image uploaded', {
    galleryId: gallery._id,
    trainerId: trainerId,
    groupId: groupId
  });

  res.status(201).json({
    success: true,
    message: 'Image uploaded successfully',
    data: gallery
  });
});

/**
 * @desc    Upload project image
 * @route   POST /api/trainer/gallery/projects
 * @access  Private (Trainer)
 */
exports.uploadProjectImage = asyncHandler(async (req, res) => {
  const trainerId = req.user._id || req.user.id;
  const { groupId, projectId, title, description } = req.body;
  const file = req.file;

  if (!file) {
    throw new BadRequestError('No image provided', 'NO_IMAGE');
  }

  if (!file.mimetype.startsWith('image/')) {
    throw new BadRequestError('File is not an image', 'INVALID_FILE_TYPE');
  }

  // Validate trainer owns the group
  const group = await Group.findById(groupId);
  if (!group) {
    throw new NotFoundError('Group not found', 'GROUP_NOT_FOUND');
  }

  if (group.trainerId.toString() !== trainerId.toString()) {
    throw new ForbiddenError('You do not own this group', 'GROUP_OWNERSHIP_REQUIRED');
  }

  // Validate project belongs to group
  const project = await Project.findById(projectId);
  if (!project) {
    throw new NotFoundError('Project not found', 'PROJECT_NOT_FOUND');
  }

  if (project.groupId.toString() !== groupId.toString()) {
    throw new BadRequestError('Project does not belong to this group', 'PROJECT_GROUP_MISMATCH');
  }

  // Upload to Cloudinary
  const folder = `robotric/gallery/${groupId}/projects`;
  const uploadResult = await uploadImage(file.buffer, folder);

  // Generate and validate thumbnail URL
  const thumbnailUrl = generateThumbnailUrl(uploadResult.public_id);
  if (!thumbnailUrl) {
    logger.logError(new Error('Failed to generate valid thumbnail URL'), {
      context: 'gallery_project_upload',
      publicId: uploadResult.public_id,
      trainerId: trainerId
    });
    throw new AppError('Failed to generate thumbnail URL', 500);
  }

  // Create gallery record
  const gallery = await Gallery.create({
    groupId,
    type: 'project',
    uploadedBy: trainerId,
    cloudinaryUrl: uploadResult.secure_url,
    cloudinaryPublicId: uploadResult.public_id,
    thumbnailUrl, // Validated and standardized
    studentId: project.studentId,
    projectId: project._id,
    title: title || null,
    description: description || null
  });

  logger.info('Project image uploaded', {
    galleryId: gallery._id,
    trainerId: trainerId,
    groupId: groupId,
    projectId: projectId
  });

  res.status(201).json({
    success: true,
    message: 'Image uploaded successfully',
    data: gallery
  });
});

/**
 * @desc    Get gallery for a group
 * @route   GET /api/trainer/gallery/group/:groupId
 * @access  Private (Trainer)
 */
exports.getGroupGallery = asyncHandler(async (req, res) => {
  const trainerId = req.user._id || req.user.id;
  const { groupId } = req.params;

  // Validate trainer owns the group
  const group = await Group.findById(groupId);
  if (!group) {
    throw new NotFoundError('Group not found', 'GROUP_NOT_FOUND');
  }

  if (group.trainerId.toString() !== trainerId.toString()) {
    throw new ForbiddenError('You do not own this group', 'GROUP_OWNERSHIP_REQUIRED');
  }

  const images = await Gallery.find({ groupId })
    .populate('uploadedBy', 'name email')
    .populate('studentId', 'name email')
    .populate('projectId', 'title')
    .sort({ order: 1, createdAt: -1 });

  res.json({
    success: true,
    count: images.length,
    data: images
  });
});

/**
 * @desc    Delete image
 * @route   DELETE /api/trainer/gallery/:imageId
 * @access  Private (Trainer)
 */
exports.deleteImage = asyncHandler(async (req, res) => {
  const trainerId = req.user._id || req.user.id;
  const { imageId } = req.params;

  const image = await Gallery.findById(imageId);
  if (!image) {
    throw new NotFoundError('Image not found', 'IMAGE_NOT_FOUND');
  }

  // Validate trainer uploaded the image
  if (image.uploadedBy.toString() !== trainerId.toString()) {
    throw new ForbiddenError('You did not upload this image', 'NOT_IMAGE_OWNER');
  }

  // Delete from Cloudinary
  try {
    await deleteImage(image.cloudinaryPublicId);
  } catch (error) {
    logger.logError(error, { context: 'delete_gallery_image', publicId: image.cloudinaryPublicId });
    // Continue even if Cloudinary delete fails
  }

  // Delete gallery record
  await image.deleteOne();

  logger.info('Gallery image deleted', {
    imageId: image._id,
    trainerId: trainerId
  });

  res.json({
    success: true,
    message: 'Image deleted successfully'
  });
});
