/**
 * Trainer Projects Controller
 * 
 * Handles project-related operations for trainers
 */

const asyncHandler = require('../utils/asyncHandler');
const { NotFoundError, ForbiddenError, BadRequestError } = require('../utils/errors');
const Project = require('../models/Project');
const Group = require('../models/Group');
const { uploadImage, deleteImage } = require('../services/cloudinary.service');
const logger = require('../utils/logger');
const { sendNotificationToUser } = require('../services/notification.service');

/**
 * @desc    Create a new project for a student
 * @route   POST /api/trainer/projects
 * @access  Private (Trainer)
 */
exports.createProject = asyncHandler(async (req, res) => {
  const trainerId = req.user._id || req.user.id;
  const { studentId, groupId, title, titleAr, description, descriptionAr, components, technologies, ownerId } = req.body;
  // Note: courseId is not taken from request body - it will be auto-set from group

  // Validate trainer owns the group
  const group = await Group.findById(groupId);
  if (!group) {
    throw new NotFoundError('Group not found', 'GROUP_NOT_FOUND');
  }

  if (group.trainerId.toString() !== trainerId.toString()) {
    throw new ForbiddenError('You do not own this group', 'GROUP_OWNERSHIP_REQUIRED');
  }

  // Validate student is in group
  const isStudentInGroup = group.students.some(
    id => id.toString() === studentId.toString()
  );

  if (!isStudentInGroup) {
    throw new BadRequestError('Student is not in this group', 'STUDENT_NOT_IN_GROUP');
  }

  // Note: Students can have multiple projects (removed single project restriction)

  // Determine ownerId: use provided ownerId or default to studentId for student projects
  const projectOwnerId = ownerId || studentId;

  // Auto-set courseId from group's courseId
  const courseId = group.courseId;

  // Create project
  const project = await Project.create({
    ownerId: projectOwnerId, // Required field - set to studentId for student projects
    studentId,
    groupId,
    courseId, // Automatically set from group.courseId
    createdBy: trainerId,
    title,
    titleAr,
    description,
    descriptionAr,
    components: components || [],
    technologies: technologies || [],
    status: 'in_progress',
    images: []
  });

  logger.info('Project created', {
    projectId: project._id,
    trainerId: trainerId,
    studentId: studentId,
    groupId: groupId
  });

  // Send notification to the assigned student
  try {
    const notificationBody = `${title} has been assigned to you`;
    
    await sendNotificationToUser(
      studentId,
      'New Project Assigned',
      notificationBody,
      {
        type: 'project',
        projectId: project._id.toString(),
        groupId: groupId.toString(),
        courseId: courseId ? courseId.toString() : null,
        screen: 'project'
      }
    );
    
    logger.info(`Project notification sent to student ${studentId}`, {
      projectId: project._id,
      studentId: studentId
    });
  } catch (notificationError) {
    // Log but don't fail the request
    logger.error(`Failed to send project notification: ${notificationError.message}`, {
      projectId: project._id,
      studentId: studentId,
      error: notificationError
    });
  }

  res.status(201).json({
    success: true,
    message: 'Project created successfully',
    data: project
  });
});

/**
 * @desc    Get project details
 * @route   GET /api/trainer/projects/:projectId
 * @access  Private (Trainer)
 */
exports.getProjectDetails = asyncHandler(async (req, res) => {
  const trainerId = req.user._id || req.user.id;
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

  // Validate trainer owns the group
  const group = await Group.findById(project.groupId);
  if (!group) {
    throw new NotFoundError('Group not found', 'GROUP_NOT_FOUND');
  }

  if (group.trainerId.toString() !== trainerId.toString()) {
    throw new ForbiddenError('You do not own this group', 'GROUP_OWNERSHIP_REQUIRED');
  }

  res.json({
    success: true,
    data: project
  });
});

/**
 * @desc    Get all projects for a group
 * @route   GET /api/trainer/projects/group/:groupId
 * @access  Private (Trainer)
 */
exports.getGroupProjects = asyncHandler(async (req, res) => {
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

  const projects = await Project.find({ groupId })
    .populate('studentId', 'name email')
    .populate('courseId', 'title')
    .populate('gradedBy', 'name email')
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    count: projects.length,
    data: projects
  });
});

/**
 * @desc    Upload project images
 * @route   POST /api/trainer/projects/:projectId/images
 * @access  Private (Trainer)
 */
exports.uploadProjectImages = asyncHandler(async (req, res) => {
  const trainerId = req.user._id || req.user.id;
  const { projectId } = req.params;
  const files = req.files || [];

  if (files.length === 0) {
    throw new BadRequestError('No images provided', 'NO_IMAGES');
  }

  const project = await Project.findById(projectId);
  if (!project) {
    throw new NotFoundError('Project not found', 'PROJECT_NOT_FOUND');
  }

  // Validate trainer owns the group
  const group = await Group.findById(project.groupId);
  if (!group) {
    throw new NotFoundError('Group not found', 'GROUP_NOT_FOUND');
  }

  if (group.trainerId.toString() !== trainerId.toString()) {
    throw new ForbiddenError('You do not own this group', 'GROUP_OWNERSHIP_REQUIRED');
  }

  // Upload images to Cloudinary
  const uploadedImages = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestError(`File ${i + 1} is not an image`, 'INVALID_FILE_TYPE');
    }

    const folder = `robotric/projects/${projectId}`;
    const uploadResult = await uploadImage(file.buffer, folder);

    uploadedImages.push({
      cloudinaryUrl: uploadResult.secure_url,
      cloudinaryPublicId: uploadResult.public_id,
      order: project.images.length + i
    });
  }

  // Add images to project
  project.images.push(...uploadedImages);
  await project.save();

  logger.info('Project images uploaded', {
    projectId: project._id,
    trainerId: trainerId,
    imageCount: uploadedImages.length
  });

  res.status(201).json({
    success: true,
    message: 'Images uploaded successfully',
    data: {
      project: project,
      uploadedImages: uploadedImages
    }
  });
});

/**
 * @desc    Delete a project image
 * @route   DELETE /api/trainer/projects/:projectId/images/:imageIndex
 * @access  Private (Trainer)
 */
exports.deleteProjectImage = asyncHandler(async (req, res) => {
  const trainerId = req.user._id || req.user.id;
  const { projectId, imageIndex } = req.params;

  const project = await Project.findById(projectId);
  if (!project) {
    throw new NotFoundError('Project not found', 'PROJECT_NOT_FOUND');
  }

  // Validate trainer owns the group
  const group = await Group.findById(project.groupId);
  if (!group) {
    throw new NotFoundError('Group not found', 'GROUP_NOT_FOUND');
  }

  if (group.trainerId.toString() !== trainerId.toString()) {
    throw new ForbiddenError('You do not own this group', 'GROUP_OWNERSHIP_REQUIRED');
  }

  const index = parseInt(imageIndex);
  if (isNaN(index) || index < 0 || index >= project.images.length) {
    throw new BadRequestError('Invalid image index', 'INVALID_IMAGE_INDEX');
  }

  const image = project.images[index];

  // Delete from Cloudinary
  try {
    await deleteImage(image.cloudinaryPublicId);
  } catch (error) {
    logger.logError(error, { context: 'delete_project_image', publicId: image.cloudinaryPublicId });
    // Continue even if Cloudinary delete fails
  }

  // Remove from array
  project.images.splice(index, 1);

  // Reorder remaining images
  project.images.forEach((img, idx) => {
    img.order = idx;
  });

  await project.save();

  logger.info('Project image deleted', {
    projectId: project._id,
    trainerId: trainerId,
    imageIndex: index
  });

  res.json({
    success: true,
    message: 'Image deleted successfully',
    data: project
  });
});

/**
 * @desc    Update project
 * @route   PUT /api/trainer/projects/:projectId
 * @access  Private (Trainer)
 */
exports.updateProject = asyncHandler(async (req, res) => {
  const trainerId = req.user._id || req.user.id;
  const { projectId } = req.params;
  const { title, titleAr, description, descriptionAr, components, technologies } = req.body;

  const project = await Project.findById(projectId);
  if (!project) {
    throw new NotFoundError('Project not found', 'PROJECT_NOT_FOUND');
  }

  // Validate trainer owns the group
  const group = await Group.findById(project.groupId);
  if (!group) {
    throw new NotFoundError('Group not found', 'GROUP_NOT_FOUND');
  }

  if (group.trainerId.toString() !== trainerId.toString()) {
    throw new ForbiddenError('You do not own this group', 'GROUP_OWNERSHIP_REQUIRED');
  }

  // Update fields
  if (title !== undefined) project.title = title;
  if (titleAr !== undefined) project.titleAr = titleAr;
  if (description !== undefined) project.description = description;
  if (descriptionAr !== undefined) project.descriptionAr = descriptionAr;
  if (components !== undefined) project.components = components;
  if (technologies !== undefined) project.technologies = technologies;

  await project.save();

  logger.info('Project updated', {
    projectId: project._id,
    trainerId: trainerId
  });

  res.json({
    success: true,
    message: 'Project updated successfully',
    data: project
  });
});

/**
 * @desc    Change project status
 * @route   PATCH /api/trainer/projects/:projectId/status
 * @access  Private (Trainer)
 */
exports.changeProjectStatus = asyncHandler(async (req, res) => {
  const trainerId = req.user._id || req.user.id;
  const { projectId } = req.params;
  const { status } = req.body;

  if (!['in_progress', 'completed', 'submitted'].includes(status)) {
    throw new BadRequestError('Invalid status', 'INVALID_STATUS');
  }

  const project = await Project.findById(projectId);
  if (!project) {
    throw new NotFoundError('Project not found', 'PROJECT_NOT_FOUND');
  }

  // Validate trainer owns the group
  const group = await Group.findById(project.groupId);
  if (!group) {
    throw new NotFoundError('Group not found', 'GROUP_NOT_FOUND');
  }

  if (group.trainerId.toString() !== trainerId.toString()) {
    throw new ForbiddenError('You do not own this group', 'GROUP_OWNERSHIP_REQUIRED');
  }

  project.status = status;
  await project.save();

  logger.info('Project status changed', {
    projectId: project._id,
    trainerId: trainerId,
    status: status
  });

  res.json({
    success: true,
    message: 'Project status updated successfully',
    data: project
  });
});

/**
 * @desc    Grade project
 * @route   POST /api/trainer/projects/:projectId/grade
 * @access  Private (Trainer)
 */
exports.gradeProject = asyncHandler(async (req, res) => {
  const trainerId = req.user._id || req.user.id;
  const { projectId } = req.params;
  const { grade, feedback } = req.body;

  const project = await Project.findById(projectId);
  if (!project) {
    throw new NotFoundError('Project not found', 'PROJECT_NOT_FOUND');
  }

  // Validate trainer owns the group
  const group = await Group.findById(project.groupId);
  if (!group) {
    throw new NotFoundError('Group not found', 'GROUP_NOT_FOUND');
  }

  if (group.trainerId.toString() !== trainerId.toString()) {
    throw new ForbiddenError('You do not own this group', 'GROUP_OWNERSHIP_REQUIRED');
  }

  if (grade !== undefined) {
    if (grade < 0) {
      throw new BadRequestError('Grade cannot be negative', 'INVALID_GRADE');
    }
    project.grade = grade;
  }

  if (feedback !== undefined) {
    project.feedback = feedback;
  }

  project.gradedAt = new Date();
  project.gradedBy = trainerId;

  await project.save();

  logger.info('Project graded', {
    projectId: project._id,
    trainerId: trainerId,
    grade: project.grade
  });

  res.json({
    success: true,
    message: 'Project graded successfully',
    data: project
  });
});

/**
 * @desc    Delete a project
 * @route   DELETE /api/trainer/projects/:projectId
 * @access  Private (Trainer)
 */
exports.deleteProject = asyncHandler(async (req, res) => {
  const trainerId = req.user._id || req.user.id;
  const { projectId } = req.params;

  const project = await Project.findById(projectId);
  if (!project) {
    throw new NotFoundError('Project not found', 'PROJECT_NOT_FOUND');
  }

  // Validate trainer owns the group
  const group = await Group.findById(project.groupId);
  if (!group) {
    throw new NotFoundError('Group not found', 'GROUP_NOT_FOUND');
  }

  if (group.trainerId.toString() !== trainerId.toString()) {
    throw new ForbiddenError('You do not own this group', 'GROUP_OWNERSHIP_REQUIRED');
  }

  // Delete all images from Cloudinary
  let deletedImagesCount = 0;
  if (project.images && project.images.length > 0) {
    for (const image of project.images) {
      if (image.cloudinaryPublicId) {
        try {
          await deleteImage(image.cloudinaryPublicId);
          deletedImagesCount++;
          logger.info('Deleted project image from Cloudinary', {
            publicId: image.cloudinaryPublicId,
            projectId: project._id
          });
        } catch (error) {
          logger.logError(error, {
            context: 'delete_project_image',
            publicId: image.cloudinaryPublicId,
            projectId: project._id
          });
          // Continue deletion even if image deletion fails
        }
      }
    }
  }

  // Delete the project
  await project.deleteOne();

  logger.info('Project deleted', {
    projectId: project._id,
    trainerId: trainerId,
    deletedImagesCount
  });

  res.json({
    success: true,
    message: 'Project deleted successfully',
    deletedImagesCount
  });
});