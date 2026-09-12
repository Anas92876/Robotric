/**
 * Reception Gallery Controller
 * 
 * Handles gallery-related operations for reception
 */

const asyncHandler = require('../utils/asyncHandler');
const { NotFoundError, BadRequestError, AppError } = require('../utils/errors');
const Gallery = require('../models/Gallery');
const Group = require('../models/Group');
const { uploadImage, deleteImage, generateThumbnailUrl } = require('../services/cloudinary.service');
const logger = require('../utils/logger');

/**
 * @desc    Get all groups (for gallery group picker)
 * @route   GET /api/reception/gallery/groups
 * @access  Private (Reception)
 */
exports.getAllGroups = asyncHandler(async (req, res) => {
  const groups = await Group.find({ status: 'active' })
    .select('name courseId status')
    .populate({
      path: 'courseId',
      select: 'title category level',
      options: { strictPopulate: false }
    })
    .sort({ name: 1 })
    .lean();

  res.json({
    success: true,
    count: groups.length,
    data: groups
  });
});

/**
 * @desc    Upload moment image to one or multiple groups
 * @route   POST /api/reception/gallery/moments
 * @access  Private (Reception)
 */
exports.uploadMomentImage = asyncHandler(async (req, res) => {
  const receptionId = req.user._id || req.user.id;
  const { groupId, title, description } = req.body;
  const file = req.file;

  if (!file) {
    throw new BadRequestError('No image provided', 'NO_IMAGE');
  }

  if (!file.mimetype.startsWith('image/')) {
    throw new BadRequestError('File is not an image', 'INVALID_FILE_TYPE');
  }

  // Support a single groupId or multiple groupIds (sent as JSON array, comma-separated
  // string, or repeated form fields under "groupIds")
  let groupIds = [];
  if (req.body.groupIds) {
    if (Array.isArray(req.body.groupIds)) {
      groupIds = req.body.groupIds;
    } else {
      try {
        const parsed = JSON.parse(req.body.groupIds);
        groupIds = Array.isArray(parsed) ? parsed : [req.body.groupIds];
      } catch {
        groupIds = req.body.groupIds.split(',').map((id) => id.trim());
      }
    }
  } else if (groupId) {
    groupIds = [groupId];
  }

  groupIds = [...new Set(groupIds.filter(Boolean))];

  if (groupIds.length === 0) {
    throw new BadRequestError('At least one group must be selected', 'NO_GROUP_SELECTED');
  }

  // Validate all groups exist
  const groups = await Group.find({ _id: { $in: groupIds } }).select('_id');
  if (groups.length !== groupIds.length) {
    throw new NotFoundError('One or more groups not found', 'GROUP_NOT_FOUND');
  }

  // Upload to Cloudinary once and reuse the same file across all selected groups
  const folder = `robotric/gallery/${groupIds[0]}/moments`;
  const uploadResult = await uploadImage(file.buffer, folder);

  // Generate and validate thumbnail URL
  const thumbnailUrl = generateThumbnailUrl(uploadResult.public_id);
  if (!thumbnailUrl) {
    logger.logError(new Error('Failed to generate valid thumbnail URL'), {
      context: 'gallery_upload_reception',
      publicId: uploadResult.public_id,
      receptionId: receptionId
    });
    throw new AppError('Failed to generate thumbnail URL', 500);
  }

  // Create one gallery record per selected group, all referencing the same uploaded file
  const galleries = await Gallery.insertMany(
    groupIds.map((gId) => ({
      groupId: gId,
      type: 'moment',
      uploadedBy: receptionId,
      cloudinaryUrl: uploadResult.secure_url,
      cloudinaryPublicId: uploadResult.public_id,
      thumbnailUrl, // Validated and standardized
      title: title || null,
      description: description || null
    }))
  );

  logger.info('Moment image uploaded by reception', {
    galleryIds: galleries.map((g) => g._id),
    receptionId: receptionId,
    groupIds
  });

  res.status(201).json({
    success: true,
    message: 'Image uploaded successfully',
    data: galleries
  });
});

/**
 * @desc    Get gallery for a group
 * @route   GET /api/reception/gallery/group/:groupId
 * @access  Private (Reception)
 */
exports.getGroupGallery = asyncHandler(async (req, res) => {
  const { groupId } = req.params;

  // Validate group exists
  const group = await Group.findById(groupId);
  if (!group) {
    throw new NotFoundError('Group not found', 'GROUP_NOT_FOUND');
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
 * @route   DELETE /api/reception/gallery/:imageId
 * @access  Private (Reception)
 */
exports.deleteImage = asyncHandler(async (req, res) => {
  const receptionId = req.user._id || req.user.id;
  const { imageId } = req.params;

  const image = await Gallery.findById(imageId);
  if (!image) {
    throw new NotFoundError('Image not found', 'IMAGE_NOT_FOUND');
  }

  // Validate reception uploaded the image
  if (image.uploadedBy.toString() !== receptionId.toString()) {
    throw new BadRequestError('You did not upload this image', 'NOT_IMAGE_OWNER');
  }

  // Delete gallery record first
  await image.deleteOne();

  // Only delete the file from Cloudinary if no other gallery record (e.g. for
  // another group the image was uploaded to) still references the same file
  const stillReferenced = await Gallery.exists({ cloudinaryPublicId: image.cloudinaryPublicId });
  if (!stillReferenced) {
    try {
      await deleteImage(image.cloudinaryPublicId);
    } catch (error) {
      logger.logError(error, { context: 'delete_gallery_image', publicId: image.cloudinaryPublicId });
      // Continue even if Cloudinary delete fails
    }
  }

  logger.info('Gallery image deleted by reception', {
    imageId: image._id,
    receptionId: receptionId
  });

  res.json({
    success: true,
    message: 'Image deleted successfully'
  });
});
