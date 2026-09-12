/**
 * CLO Gallery Controller
 * 
 * Handles gallery-related operations for CLO (read-only access)
 */

const asyncHandler = require('../utils/asyncHandler');
const Gallery = require('../models/Gallery');

/**
 * @desc    Get all gallery images
 * @route   GET /api/clo/gallery
 * @access  Private (CLO)
 */
exports.getAllGallery = asyncHandler(async (req, res) => {
  const { type, courseId, groupId, page = 1, limit = 20 } = req.query;

  // Build query
  const query = {};
  if (type) query.type = type;
  if (groupId) query.groupId = groupId;

  // If filtering by courseId, we need to check groups' courseId
  if (courseId) {
    const Group = require('../models/Group');
    const groups = await Group.find({ courseId }).select('_id');
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
    
    query.groupId = { $in: groupIds };
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
