const asyncHandler = require('../utils/asyncHandler');
const { NotFoundError, BadRequestError } = require('../utils/errors');
const logger = require('../utils/logger');
const { sendNotificationToUsers } = require('../services/notification.service');
const { createAndEmitNotification } = require('../services/webNotification.service');
const { uploadImage, deleteImage } = require('../services/cloudinary.service');
const { resolveSignedUrl } = require('../services/supabaseMedia.service');
const InternalProject = require('../models/InternalProject');
const InternalTask = require('../models/InternalTask');
const User = require('../models/User');

const validateAssignees = async (assignedTo) => {
  if (!assignedTo || assignedTo.length === 0) return [];
  const users = await User.find({ _id: { $in: assignedTo } }).select('_id');
  if (users.length !== assignedTo.length) {
    throw new NotFoundError('One or more assigned users', 'USER_NOT_FOUND');
  }
  return assignedTo;
};

exports.createTask = asyncHandler(async (req, res) => {
  const { projectId, subProjectId, title, description, priority, assignedTo, dueDate, hardDeadline } = req.body;

  const project = await InternalProject.findById(projectId);
  if (!project) throw new NotFoundError('Project', 'PROJECT_NOT_FOUND');

  if (subProjectId) {
    const subProject = await InternalProject.findById(subProjectId);
    if (!subProject) throw new NotFoundError('Sub-project', 'SUBPROJECT_NOT_FOUND');
    if (subProject.parentProject?.toString() !== projectId.toString()) {
      throw new BadRequestError('Sub-project does not belong to this project', 'SUBPROJECT_MISMATCH');
    }
  }

  const assignees = await validateAssignees(Array.isArray(assignedTo) ? assignedTo : assignedTo ? [assignedTo] : []);

  const task = await InternalTask.create({
    projectId,
    subProjectId: subProjectId || null,
    title,
    description,
    priority,
    assignedTo: assignees,
    createdBy: req.user._id,
    dueDate: dueDate || undefined,
    hardDeadline: hardDeadline || undefined,
  });

  logger.info(`CTO created internal task: ${task.title} (${task._id}) for project ${projectId}`);

  if (assignees.length > 0) {
    sendNotificationToUsers(assignees, 'New Task Assigned', task.title).catch(err => {
      logger.error('Failed to send task assignment notification', { error: err.message, taskId: task._id });
    });
  }

  res.status(201).json({ success: true, message: 'Task created', data: task });
});

exports.getTasks = asyncHandler(async (req, res) => {
  const { status, priority, assignedTo, projectId, subProjectId } = req.query;

  const filter = {};
  if (status) filter.status = status;
  if (priority) filter.priority = Number(priority);
  if (assignedTo) filter.assignedTo = assignedTo; // $in works on array field with a single value
  if (projectId) filter.projectId = projectId;

  if (subProjectId === 'none') {
    filter.subProjectId = null;
  } else if (subProjectId) {
    filter.subProjectId = subProjectId;
  }

  const tasks = await InternalTask.find(filter)
    .populate('assignedTo', 'name email')
    .populate('createdBy', 'name email')
    .populate('clientId', 'name email')
    .populate('projectId', 'name priority')
    .populate('subProjectId', 'name priority')
    .sort({ priority: 1, dueDate: 1, createdAt: 1 })
    .lean();

  res.json({ success: true, count: tasks.length, data: tasks });
});

exports.getTaskById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const task = await InternalTask.findById(id)
    .populate('assignedTo', 'name email')
    .populate('createdBy', 'name email')
    .populate('clientId', 'name email')
    .populate('projectId', 'name priority')
    .populate('subProjectId', 'name priority');

  if (!task) throw new NotFoundError('Task', 'TASK_NOT_FOUND');

  res.json({ success: true, data: task });
});

exports.updateTask = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, description, priority, status, assignedTo, dueDate, hardDeadline } = req.body;

  const task = await InternalTask.findById(id);
  if (!task) throw new NotFoundError('Task', 'TASK_NOT_FOUND');

  const previousAssigneeIds = task.assignedTo.map(a => a.toString());
  const previousPriority = task.priority;
  const previousStatus = task.status;

  if (title !== undefined) task.title = title;
  if (description !== undefined) task.description = description;
  if (priority !== undefined) task.priority = priority;
  if (status !== undefined) task.status = status;
  if (dueDate !== undefined) task.dueDate = dueDate || undefined;
  if (hardDeadline !== undefined) task.hardDeadline = hardDeadline || undefined;

  if (assignedTo !== undefined) {
    const incoming = Array.isArray(assignedTo) ? assignedTo : assignedTo ? [assignedTo] : [];
    task.assignedTo = await validateAssignees(incoming);
  }

  await task.save();

  const newAssigneeIds = task.assignedTo.map(a => a.toString());
  const priorityChanged = priority !== undefined && priority !== previousPriority;
  const statusChanged = status !== undefined && status !== previousStatus;

  // Notify users newly added to the task
  const newlyAdded = newAssigneeIds.filter(id => !previousAssigneeIds.includes(id));
  if (newlyAdded.length > 0) {
    sendNotificationToUsers(newlyAdded, 'New Task Assigned', task.title).catch(err => {
      logger.error('Failed to send task reassignment notification', { error: err.message, taskId: task._id });
    });
  }

  // Notify all current assignees on priority change
  if (priorityChanged && newAssigneeIds.length > 0) {
    sendNotificationToUsers(newAssigneeIds, 'Task Priority Updated', task.title).catch(err => {
      logger.error('Failed to send priority update notification', { error: err.message, taskId: task._id });
    });
  }

  // Client requests: notify the submitting client on approval (first save out of
  // pending_review) or any later status change — this is the client's only visibility
  // into progress, since they never see the internal Kanban.
  if (task.source === 'client' && task.clientId && statusChanged) {
    const isFirstApproval = previousStatus === 'pending_review';
    createAndEmitNotification(
      task.clientId,
      'task',
      isFirstApproval ? 'Request Approved' : 'Request Status Updated',
      isFirstApproval
        ? `Your request "${task.title}" has been reviewed and is now underway.`
        : `Your request "${task.title}" is now ${task.status.replace('_', ' ')}.`,
      { taskId: task._id.toString(), projectId: task.projectId.toString() },
      { actionUrl: `/client/tasks/${task._id}`, actionLabel: 'View Request' }
    ).catch(err => {
      logger.error('Failed to notify client of status change', { error: err.message, taskId: task._id });
    });
  }

  await task.populate('assignedTo', 'name email');
  await task.populate('createdBy', 'name email');
  await task.populate('clientId', 'name email');
  await task.populate('projectId', 'name priority');
  await task.populate('subProjectId', 'name priority');

  logger.info(`CTO updated internal task: ${task.title} (${task._id})`);

  res.json({ success: true, message: 'Task updated', data: task });
});

// ── Client requests: decline (with reason) ─────────────────────────────────
exports.declineTask = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { rejectedReason } = req.body;

  if (!rejectedReason || !rejectedReason.trim()) {
    throw new BadRequestError('A reason is required to decline a request', 'REASON_REQUIRED');
  }

  const task = await InternalTask.findById(id);
  if (!task) throw new NotFoundError('Task', 'TASK_NOT_FOUND');
  if (task.source !== 'client') {
    throw new BadRequestError('Only client requests can be declined', 'NOT_CLIENT_TASK');
  }

  task.status = 'declined';
  task.rejectedReason = rejectedReason.trim();
  await task.save();

  logger.info(`CTO declined client task: ${task.title} (${task._id})`);

  if (task.clientId) {
    createAndEmitNotification(
      task.clientId,
      'task',
      'Request Declined',
      `Your request "${task.title}" was declined: ${task.rejectedReason}`,
      { taskId: task._id.toString(), projectId: task.projectId.toString() },
      { actionUrl: `/client/tasks/${task._id}`, actionLabel: 'View Request' }
    ).catch(err => {
      logger.error('Failed to notify client of decline', { error: err.message, taskId: task._id });
    });
  }

  res.json({ success: true, message: 'Request declined', data: task });
});

// ── Client requests: read the client's attached media ──────────────────────
exports.getClientMedia = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const task = await InternalTask.findById(id).select('clientMedia');
  if (!task) throw new NotFoundError('Task', 'TASK_NOT_FOUND');

  const data = await Promise.all(task.clientMedia.map(async m => ({
    ...m.toObject(),
    url: await resolveSignedUrl(m.storageBucket, m.storagePath),
  })));

  res.json({ success: true, data });
});

// ── CTO: upload attachment images to a task ───────────────────────────────────
exports.addAttachments = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const task = await InternalTask.findById(id);
  if (!task) throw new NotFoundError('Task', 'TASK_NOT_FOUND');

  if (!req.files || req.files.length === 0) {
    throw new BadRequestError('No image files provided', 'NO_FILES');
  }

  const uploaded = [];
  for (const file of req.files) {
    const result = await uploadImage(file.buffer, `robotrick/tasks/${id}/attachments`);
    uploaded.push({ url: result.secure_url, publicId: result.public_id, name: file.originalname });
  }

  task.attachments.push(...uploaded);
  await task.save();

  logger.info(`CTO added ${uploaded.length} attachment(s) to task ${id}`);
  res.status(201).json({ success: true, message: 'Attachments uploaded', data: task.attachments });
});

// ── CTO: delete an attachment from a task ────────────────────────────────────
exports.deleteAttachment = asyncHandler(async (req, res) => {
  const { id, publicId } = req.params;
  const decodedPublicId = decodeURIComponent(publicId);

  const task = await InternalTask.findById(id);
  if (!task) throw new NotFoundError('Task', 'TASK_NOT_FOUND');

  const idx = task.attachments.findIndex(a => a.publicId === decodedPublicId);
  if (idx === -1) throw new NotFoundError('Attachment', 'ATTACHMENT_NOT_FOUND');

  await deleteImage(decodedPublicId).catch(() => {});
  task.attachments.splice(idx, 1);
  await task.save();

  res.json({ success: true, message: 'Attachment deleted', data: null });
});

exports.deleteTask = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const task = await InternalTask.findById(id);
  if (!task) throw new NotFoundError('Task', 'TASK_NOT_FOUND');

  if (task.status !== 'todo') {
    throw new BadRequestError(
      `Cannot delete task with status '${task.status}'. Only tasks with status 'todo' can be deleted.`,
      'TASK_NOT_DELETABLE'
    );
  }

  await InternalTask.findByIdAndDelete(id);

  logger.info(`CTO deleted internal task: ${task.title} (${task._id})`);

  res.json({ success: true, message: 'Task deleted successfully', data: null });
});
