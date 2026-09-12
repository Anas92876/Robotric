/**
 * Student Gallery Controller
 * 
 * Handles gallery-related operations for students
 */

const asyncHandler = require('../utils/asyncHandler');
const { NotFoundError, ForbiddenError } = require('../utils/errors');
const Gallery = require('../models/Gallery');
const Group = require('../models/Group');

/**
 * @desc    Get gallery images for student's groups
 * @route   GET /api/student/gallery
 * @access  Private (Student)
 */
exports.getGallery = asyncHandler(async (req, res) => {
  const studentId = req.user._id || req.user.id;
  const { type, courseId, page = 1, limit = 20 } = req.query;

  // Get all groups the student is in
  const groups = await Group.find({
    students: studentId
  }).select('_id');

  const groupIds = groups.map(g => g._id);

  if (groupIds.length === 0) {
    return res.json({
      success: true,
      count: 0,
      data: [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: 0,
        total: 0
      }
    });
  }

  // Build query
  const query = {
    groupId: { $in: groupIds }
  };

  if (type) {
    query.type = type;
  }

  // If filtering by courseId, we need to check groups' courseId
  if (courseId) {
    const Group = require('../models/Group');
    const groupsWithCourse = await Group.find({
      _id: { $in: groupIds },
      courseId: courseId
    }).select('_id');

    const groupIdsWithCourse = groupsWithCourse.map(g => g._id);
    if (groupIdsWithCourse.length === 0) {
      return res.json({
        success: true,
        count: 0,
        data: [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: 0,
          total: 0
        }
      });
    }
    query.groupId = { $in: groupIdsWithCourse };
  }

  // Pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const images = await Gallery.find(query)
    .populate('groupId', 'name')
    .populate('uploadedBy', 'name email')
    .populate('studentId', 'name email')
    .populate('projectId', 'title')
    .sort({ order: 1, createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Gallery.countDocuments(query);

  res.json({
    success: true,
    count: images.length,
    data: images,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
      total
    }
  });
});

/**
 * @desc    Get image details
 * @route   GET /api/student/gallery/:imageId
 * @access  Private (Student)
 */
exports.getImageDetails = asyncHandler(async (req, res) => {
  const studentId = req.user._id || req.user.id;
  const { imageId } = req.params;

  const image = await Gallery.findById(imageId)
    .populate('groupId', 'name')
    .populate('uploadedBy', 'name email')
    .populate('studentId', 'name email')
    .populate('projectId', 'title');

  if (!image) {
    throw new NotFoundError('Image not found', 'IMAGE_NOT_FOUND');
  }

  // Validate image belongs to student's group
  const group = await Group.findById(image.groupId);
  if (!group) {
    throw new NotFoundError('Group not found', 'GROUP_NOT_FOUND');
  }

  const isStudent = group.students.some(
    id => id.toString() === studentId.toString()
  );

  if (!isStudent && group.trainerId.toString() !== studentId.toString()) {
    throw new ForbiddenError('You are not a member of this group', 'NOT_GROUP_MEMBER');
  }

  res.json({
    success: true,
    data: image
  });
});
