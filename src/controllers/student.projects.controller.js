/**
 * Student Projects Controller
 * 
 * Handles project-related operations for students
 */

const asyncHandler = require('../utils/asyncHandler');
const { NotFoundError, ForbiddenError } = require('../utils/errors');
const Project = require('../models/Project');
const logger = require('../utils/logger');

/**
 * @desc    Get all projects from students in the same group (default) or only my projects
 * @route   GET /api/student/projects
 * @query   myProjectsOnly=true - Show only the authenticated student's projects (not groupmates)
 * @access  Private (Student)
 */
exports.getMyProjects = asyncHandler(async (req, res) => {
  const studentId = req.user._id || req.user.id;
  const { courseId, status, page = 1, limit = 20, myProjectsOnly } = req.query;

  // Build query
  let query = {};

  // ✅ Default: Show all projects from students in the same group
  if (myProjectsOnly === 'true') {
    // Only show this student's own projects
    query.studentId = studentId;
  } else {
    // Show all projects from all students in the same group(s)
    const Group = require('../models/Group');

    // Find all groups that this student belongs to
    const groups = await Group.find({
      students: studentId
    }).select('_id');

    const groupIds = groups.map(g => g._id);

    if (groupIds.length > 0) {
      // Show projects from all students in these groups
      query.groupId = { $in: groupIds };
    } else {
      // Student not in any group, show only their own projects
      query.studentId = studentId;
    }
  }

  if (courseId) {
    query.courseId = courseId;
  }

  if (status) {
    query.status = status;
  }

  // Pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const projects = await Project.find(query)
    .populate('studentId', 'name email') // ✅ Show project owner
    .populate('groupId', 'name')
    .populate('courseId', 'title')
    .populate('createdBy', 'name email')
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
 * @route   GET /api/student/projects/:projectId
 * @access  Private (Student) - Can view own projects or groupmates' projects
 */
exports.getProjectDetails = asyncHandler(async (req, res) => {
  const studentId = req.user._id || req.user.id;
  const { projectId } = req.params;

  const project = await Project.findById(projectId)
    .populate('studentId', 'name email') // ✅ Added to show project owner
    .populate('groupId', 'name students')
    .populate('courseId', 'title')
    .populate('createdBy', 'name email')
    .populate('gradedBy', 'name email');

  if (!project) {
    throw new NotFoundError('Project not found', 'PROJECT_NOT_FOUND');
  }

  // ✅ Validate student owns the project OR is in the same group
  const isOwner = project.studentId && project.studentId._id.toString() === studentId.toString();

  let isGroupMate = false;
  if (project.groupId && project.groupId.students) {
    isGroupMate = project.groupId.students.some(
      student => student.toString() === studentId.toString()
    );
  }

  if (!isOwner && !isGroupMate) {
    throw new ForbiddenError('You do not have access to this project', 'PROJECT_ACCESS_DENIED');
  }

  res.json({
    success: true,
    data: project
  });
});
