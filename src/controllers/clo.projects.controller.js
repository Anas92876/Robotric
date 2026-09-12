/**
 * CLO Projects Controller
 * 
 * Handles project-related operations for CLO (read-only access)
 */

const asyncHandler = require('../utils/asyncHandler');
const { NotFoundError } = require('../utils/errors');
const Project = require('../models/Project');

/**
 * @desc    Get all projects
 * @route   GET /api/clo/projects
 * @access  Private (CLO)
 */
exports.getAllProjects = asyncHandler(async (req, res) => {
  const { courseId, groupId, status, page = 1, limit = 20 } = req.query;

  // Build query
  const query = {};
  if (courseId) query.courseId = courseId;
  if (groupId) query.groupId = groupId;
  if (status) query.status = status;

  // Pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const projects = await Project.find(query)
    .populate('studentId', 'name email')
    .populate('groupId', 'name')
    .populate('courseId', 'title')
    .populate('createdBy', 'name email')
    .populate('gradedBy', 'name email')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Project.countDocuments(query);

  res.json({
    success: true,
    count: projects.length,
    data: projects,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
      total
    }
  });
});

/**
 * @desc    Get project details
 * @route   GET /api/clo/projects/:projectId
 * @access  Private (CLO)
 */
exports.getProjectDetails = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  const project = await Project.findById(projectId)
    .populate('studentId', 'name email')
    .populate('groupId', 'name')
    .populate('courseId', 'title')
    .populate('createdBy', 'name email')
    .populate('gradedBy', 'name email');

  if (!project) {
    throw new NotFoundError('Project not found', 'PROJECT_NOT_FOUND');
  }

  res.json({
    success: true,
    data: project
  });
});
