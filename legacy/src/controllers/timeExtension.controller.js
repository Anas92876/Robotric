const asyncHandler = require('../utils/asyncHandler');
const { NotFoundError, ForbiddenError, BadRequestError } = require('../utils/errors');
const TimeExtensionRequest = require('../models/TimeExtensionRequest');
const InternalTask = require('../models/InternalTask');
const { sendNotificationToUsers } = require('../services/notification.service');
const logger = require('../utils/logger');

// ── Employee: submit a new request ───────────────────────────────────────────
exports.createRequest = asyncHandler(async (req, res) => {
  const { taskId } = req.params;
  const { reason, proposedDate } = req.body;
  const userId = req.user._id;

  if (!reason?.trim()) throw new BadRequestError('Reason is required', 'REASON_REQUIRED');
  if (!proposedDate) throw new BadRequestError('Proposed date is required', 'DATE_REQUIRED');

  const task = await InternalTask.findById(taskId).lean();
  if (!task) throw new NotFoundError('Task', 'TASK_NOT_FOUND');

  const isAssigned = task.assignedTo.some(a => a.toString() === userId.toString());
  if (!isAssigned) throw new ForbiddenError('You are not assigned to this task', 'NOT_ASSIGNED');

  const proposed = new Date(proposedDate);
  if (isNaN(proposed.getTime())) throw new BadRequestError('Invalid date', 'INVALID_DATE');

  // Only one pending request per task per user
  const existing = await TimeExtensionRequest.findOne({ taskId, requestedBy: userId, status: 'pending' });
  if (existing) throw new BadRequestError('You already have a pending extension request for this task', 'ALREADY_PENDING');

  const request = await TimeExtensionRequest.create({
    taskId,
    requestedBy: userId,
    reason: reason.trim(),
    proposedDate: proposed,
  });

  await request.populate('requestedBy', 'name email role');

  // Notify the task creator (CTO/manager)
  if (task.createdBy) {
    sendNotificationToUsers(
      [task.createdBy],
      'Extension Request',
      `${req.user.name} requested extra time for: ${task.title}`
    ).catch(() => {});
  }

  logger.info(`Extension request created by ${userId} for task ${taskId}`);
  res.status(201).json({ success: true, message: 'Extension request submitted', data: request });
});

// ── Employee: get their own requests for a task ───────────────────────────────
exports.getMyRequests = asyncHandler(async (req, res) => {
  const { taskId } = req.params;
  const userId = req.user._id;

  const requests = await TimeExtensionRequest.find({ taskId, requestedBy: userId })
    .populate('reviewedBy', 'name')
    .sort({ createdAt: -1 })
    .lean();

  res.json({ success: true, data: requests });
});

// ── Employee: cancel their own pending request ────────────────────────────────
exports.cancelRequest = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;

  const request = await TimeExtensionRequest.findById(id);
  if (!request) throw new NotFoundError('Request', 'REQUEST_NOT_FOUND');
  if (request.requestedBy.toString() !== userId.toString())
    throw new ForbiddenError('Not your request', 'NOT_OWNER');
  if (request.status !== 'pending')
    throw new BadRequestError('Only pending requests can be cancelled', 'NOT_PENDING');

  await TimeExtensionRequest.findByIdAndDelete(id);
  res.json({ success: true, message: 'Request cancelled', data: null });
});

// ── CTO: list all pending requests (or filter by taskId) ─────────────────────
exports.getAllRequests = asyncHandler(async (req, res) => {
  const { taskId, status } = req.query;
  const filter = {};
  if (taskId) filter.taskId = taskId;
  if (status) filter.status = status;

  const requests = await TimeExtensionRequest.find(filter)
    .populate('requestedBy', 'name email role')
    .populate('taskId', 'title dueDate hardDeadline projectId')
    .populate('reviewedBy', 'name')
    .sort({ createdAt: -1 })
    .lean();

  res.json({ success: true, count: requests.length, data: requests });
});

// ── CTO: review (approve / reject) a request ─────────────────────────────────
exports.reviewRequest = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { action, reviewNote } = req.body; // action: 'approved' | 'rejected'
  const reviewerId = req.user._id;

  if (!['approved', 'rejected'].includes(action))
    throw new BadRequestError('action must be "approved" or "rejected"', 'INVALID_ACTION');

  const request = await TimeExtensionRequest.findById(id).populate('taskId');
  if (!request) throw new NotFoundError('Request', 'REQUEST_NOT_FOUND');
  if (request.status !== 'pending')
    throw new BadRequestError('Request has already been reviewed', 'ALREADY_REVIEWED');

  request.status = action;
  request.reviewedBy = reviewerId;
  request.reviewNote = reviewNote?.trim() || '';
  request.reviewedAt = new Date();
  await request.save();

  // If approved → update the task's dueDate to proposedDate
  if (action === 'approved' && request.taskId) {
    await InternalTask.findByIdAndUpdate(request.taskId._id, {
      dueDate: request.proposedDate,
    });
  }

  // Notify the employee
  sendNotificationToUsers(
    [request.requestedBy],
    action === 'approved' ? 'Extension Approved' : 'Extension Rejected',
    action === 'approved'
      ? `Your extension request for "${request.taskId?.title}" was approved`
      : `Your extension request for "${request.taskId?.title}" was rejected${reviewNote ? `: ${reviewNote}` : ''}`
  ).catch(() => {});

  await request.populate('requestedBy', 'name email role');
  await request.populate('reviewedBy', 'name');

  logger.info(`Extension request ${id} ${action} by ${reviewerId}`);
  res.json({ success: true, message: `Request ${action}`, data: request });
});
