/**
 * Engineer Controller
 *
 * Handles internal task and project operations for Engineer role.
 * Engineers can view their assigned projects, view and update the status of their assigned tasks.
 */

const asyncHandler = require('../utils/asyncHandler');
const { NotFoundError, BadRequestError } = require('../utils/errors');
const logger = require('../utils/logger');
const { sendNotificationToUsers } = require('../services/notification.service');
const { createAndEmitNotification } = require('../services/webNotification.service');
const { uploadImage, deleteImage, isValidUrl } = require('../services/cloudinary.service');
const { resolveSignedUrl } = require('../services/supabaseMedia.service');
const InternalProject = require('../models/InternalProject');
const InternalTask = require('../models/InternalTask');

/**
 * @desc    Get all projects assigned to this engineer with per-engineer task counts
 * @route   GET /api/engineer/projects
 * @access  Private (Engineer)
 */
exports.getMyProjects = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  logger.logDB('find', 'InternalProject', { assignedEngineers: userId });

  const projects = await InternalProject.find({ assignedEngineers: userId })
    .populate('createdBy', 'name')
    .sort({ priority: 1, createdAt: -1 })
    .lean();

  const projectIds = projects.map(p => p._id);

  // Aggregate task counts for this user only (tasks assigned to them in each project)
  const taskCountsRaw = await InternalTask.aggregate([
    {
      $match: {
        projectId: { $in: projectIds },
        assignedTo: userId,
      },
    },
    {
      $group: {
        _id: { projectId: '$projectId', status: '$status' },
        count: { $sum: 1 },
      },
    },
  ]);

  const taskCountMap = {};
  for (const entry of taskCountsRaw) {
    const pid = entry._id.projectId.toString();
    if (!taskCountMap[pid]) {
      taskCountMap[pid] = { total: 0, todo: 0, in_progress: 0, done: 0 };
    }
    taskCountMap[pid][entry._id.status] = entry.count;
    taskCountMap[pid].total += entry.count;
  }

  const projectsWithCounts = projects.map(project => ({
    ...project,
    myTaskCounts: taskCountMap[project._id.toString()] || { total: 0, todo: 0, in_progress: 0, done: 0 },
  }));

  res.json({
    success: true,
    count: projectsWithCounts.length,
    data: projectsWithCounts,
  });
});

/**
 * @desc    Get a single project by ID (only if this engineer is assigned)
 * @route   GET /api/engineer/projects/:id
 * @access  Private (Engineer)
 */
exports.getProjectById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;

  logger.logDB('findOne', 'InternalProject', { id, assignedEngineers: userId });

  const project = await InternalProject.findOne({ _id: id, assignedEngineers: userId })
    .populate('createdBy', 'name')
    .populate('assignedEngineers', 'name email');

  if (!project) {
    throw new NotFoundError('Project', 'PROJECT_NOT_FOUND');
  }

  res.json({
    success: true,
    data: project,
  });
});

/**
 * @desc    Get all tasks assigned to this engineer with optional filters
 * @route   GET /api/engineer/tasks
 * @access  Private (Engineer)
 */
exports.getMyTasks = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { status, priority, projectId, completionFilter } = req.query;

  const filter = { assignedTo: userId };
  if (status) filter.status = status;
  if (priority) filter.priority = Number(priority);
  if (projectId) filter.projectId = projectId;

  // Apply completedAt filter based on completionFilter
  if (completionFilter) {
    const now = new Date();

    if (completionFilter === 'today') {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      filter.completedAt = { $gte: startOfDay, $lte: endOfDay };
    } else if (completionFilter === 'week') {
      // ISO week: Monday as first day of week
      const dayOfWeek = now.getDay(); // 0 = Sunday
      const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - daysFromMonday);
      startOfWeek.setHours(0, 0, 0, 0);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);
      filter.completedAt = { $gte: startOfWeek, $lte: endOfWeek };
    } else if (completionFilter === 'month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      filter.completedAt = { $gte: startOfMonth, $lte: endOfMonth };
    }
  }

  logger.logDB('find', 'InternalTask', filter);

  const tasks = await InternalTask.find(filter)
    .populate('projectId', 'name priority')
    .populate('createdBy', 'name')
    .populate('clientId', 'name email')
    .sort({ priority: 1, dueDate: 1, createdAt: 1 })
    .lean();

  res.json({
    success: true,
    count: tasks.length,
    data: tasks,
  });
});

/**
 * @desc    Update the status of an assigned task (with transition rules)
 * @route   PATCH /api/engineer/tasks/:id/status
 * @access  Private (Engineer)
 */
exports.updateTaskStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const userId = req.user._id;

  const validStatuses = ['todo', 'in_progress', 'done'];
  if (!validStatuses.includes(status)) {
    throw new BadRequestError(
      `Invalid status '${status}'. Must be one of: ${validStatuses.join(', ')}`,
      'INVALID_STATUS'
    );
  }

  logger.logDB('findById', 'InternalTask', { id });

  const task = await InternalTask.findById(id);
  if (!task) {
    throw new NotFoundError('Task', 'TASK_NOT_FOUND');
  }

  // Ensure the user is assigned to this task
  const isAssigned = Array.isArray(task.assignedTo)
    ? task.assignedTo.some(a => a.toString() === userId.toString())
    : task.assignedTo?.toString() === userId.toString();
  if (!isAssigned) {
    throw new BadRequestError('You are not assigned to this task', 'NOT_ASSIGNED');
  }

  const currentStatus = task.status;

  const allowedTransitions = {
    todo: ['in_progress'],
    in_progress: ['todo', 'done'],
    done: ['in_progress'],
  };

  const allowed = allowedTransitions[currentStatus] || [];
  if (!allowed.includes(status)) {
    throw new BadRequestError(
      `Invalid status transition from '${currentStatus}' to '${status}'.`,
      'INVALID_TRANSITION'
    );
  }

  task.status = status;

  if (status === 'done') {
    task.completedAt = new Date();
  } else if (currentStatus === 'done') {
    task.completedAt = undefined;
  }

  await task.save();

  logger.info(`User ${userId} updated task ${task._id} status: ${currentStatus} -> ${status}`);

  // Send notification to task creator
  if (task.createdBy) {
    let notifTitle;
    if (status === 'done') {
      notifTitle = 'Task Completed';
    } else if (status === 'in_progress') {
      notifTitle = 'Task In Progress';
    }

    if (notifTitle) {
      sendNotificationToUsers([task.createdBy], notifTitle, task.title).catch(err => {
        logger.error('Failed to send task status notification', { error: err.message, taskId: task._id });
      });
    }
  }

  // Client requests: the client only ever sees status through their own portal —
  // give them a real-time in-app update whenever an engineer moves the task.
  if (task.source === 'client' && task.clientId) {
    createAndEmitNotification(
      task.clientId,
      'task',
      'Request Status Updated',
      `Your request "${task.title}" is now ${status.replace('_', ' ')}.`,
      { taskId: task._id.toString(), projectId: task.projectId.toString() },
      { actionUrl: `/client/tasks/${task._id}`, actionLabel: 'View Request' }
    ).catch(err => {
      logger.error('Failed to notify client of status change', { error: err.message, taskId: task._id });
    });
  }

  await task.populate('projectId', 'name priority');
  await task.populate('createdBy', 'name');
  await task.populate('clientId', 'name email');
  await task.populate('assignedTo', 'name email');

  res.json({
    success: true,
    data: task,
  });
});

// ── Employee: upload submission images ────────────────────────────────────────
exports.addSubmissionImages = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;

  const task = await InternalTask.findById(id);
  if (!task) throw new NotFoundError('Task', 'TASK_NOT_FOUND');

  const isAssigned = Array.isArray(task.assignedTo)
    ? task.assignedTo.some(a => a.toString() === userId.toString())
    : task.assignedTo?.toString() === userId.toString();
  if (!isAssigned) throw new BadRequestError('You are not assigned to this task', 'NOT_ASSIGNED');

  if (!req.files || req.files.length === 0) throw new BadRequestError('No image files provided', 'NO_FILES');

  const uploaded = [];
  for (const file of req.files) {
    const result = await uploadImage(file.buffer, `robotrick/tasks/${id}/submissions`);
    uploaded.push({ url: result.secure_url, publicId: result.public_id, uploadedBy: userId });
  }

  task.submission.images.push(...uploaded);
  await task.save();

  logger.info(`User ${userId} added ${uploaded.length} submission image(s) to task ${id}`);
  res.status(201).json({ success: true, message: 'Submission images uploaded', data: task.submission });
});

// ── Employee: delete a submission image ──────────────────────────────────────
exports.deleteSubmissionImage = asyncHandler(async (req, res) => {
  const { id, publicId } = req.params;
  const userId = req.user._id;
  const decodedPublicId = decodeURIComponent(publicId);

  const task = await InternalTask.findById(id);
  if (!task) throw new NotFoundError('Task', 'TASK_NOT_FOUND');

  const img = task.submission.images.find(i => i.publicId === decodedPublicId);
  if (!img) throw new NotFoundError('Image', 'IMAGE_NOT_FOUND');
  if (img.uploadedBy?.toString() !== userId.toString()) {
    throw new BadRequestError('You can only delete your own submission images', 'NOT_OWNER');
  }

  await deleteImage(decodedPublicId).catch(() => {});
  task.submission.images = task.submission.images.filter(i => i.publicId !== decodedPublicId);
  await task.save();

  res.json({ success: true, message: 'Image deleted', data: null });
});

// ── Employee: update submission links + note ──────────────────────────────────
exports.updateSubmissionLinks = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;
  const { links, note } = req.body;

  const task = await InternalTask.findById(id);
  if (!task) throw new NotFoundError('Task', 'TASK_NOT_FOUND');

  const isAssigned = Array.isArray(task.assignedTo)
    ? task.assignedTo.some(a => a.toString() === userId.toString())
    : task.assignedTo?.toString() === userId.toString();
  if (!isAssigned) throw new BadRequestError('You are not assigned to this task', 'NOT_ASSIGNED');

  if (links !== undefined) {
    const arr = Array.isArray(links) ? links : [links];
    const invalid = arr.filter(l => l && !isValidUrl(l));
    if (invalid.length > 0) throw new BadRequestError('One or more links are not valid HTTPS URLs', 'INVALID_LINKS');
    task.submission.links = arr.filter(Boolean);
  }

  if (note !== undefined) task.submission.note = note.trim();

  await task.save();

  res.json({ success: true, message: 'Submission updated', data: task.submission });
});

// ── Employee: read a client request's attached media (own assigned tasks only) ─
exports.getClientMedia = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;

  const task = await InternalTask.findById(id).select('clientMedia assignedTo');
  if (!task) throw new NotFoundError('Task', 'TASK_NOT_FOUND');

  const isAssigned = task.assignedTo.some(a => a.toString() === userId.toString());
  if (!isAssigned) throw new BadRequestError('You are not assigned to this task', 'NOT_ASSIGNED');

  const data = await Promise.all(task.clientMedia.map(async m => ({
    ...m.toObject(),
    url: await resolveSignedUrl(m.storageBucket, m.storagePath),
  })));

  res.json({ success: true, data });
});
