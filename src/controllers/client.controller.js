/**
 * Client Controller
 *
 * Handles project/task access for the external "client" role. Clients see the
 * projects they're linked to and the client-submitted requests on those projects
 * (shared visibility across every client contact on a project — see plan notes),
 * but can only submit/edit/delete their own requests.
 *
 * Deadlines, priority, and engineer assignment are never accepted from these
 * endpoints — those stay exclusively CTO/Admin-controlled via cto.tasks.controller.js.
 */

const asyncHandler = require('../utils/asyncHandler');
const { NotFoundError, BadRequestError } = require('../utils/errors');
const logger = require('../utils/logger');
const InternalProject = require('../models/InternalProject');
const InternalTask = require('../models/InternalTask');
const User = require('../models/User');
const clientMediaUpload = require('../middleware/client-media-upload');
const {
  CLIENT_MEDIA_BUCKET,
  uploadToSupabaseWithRetry,
  resolveSignedUrl,
  deleteFromSupabase,
  sanitizeFilename,
} = require('../services/supabaseMedia.service');
const { createAndEmitNotification } = require('../services/webNotification.service');

const MAX_MEDIA_ITEMS = 15;

async function getLinkedProjectIds(clientId) {
  const projects = await InternalProject.find({ clients: clientId }).select('_id').lean();
  return projects.map(p => p._id);
}

// ── Projects ────────────────────────────────────────────────────────────────

exports.getMyProjects = asyncHandler(async (req, res) => {
  const projects = await InternalProject.find({ clients: req.user._id, parentProject: null })
    .populate('assignedEngineers', 'name email')
    .sort({ createdAt: -1 })
    .lean();

  const projectIds = projects.map(p => p._id);

  const taskCountsRaw = await InternalTask.aggregate([
    { $match: { projectId: { $in: projectIds }, source: 'client' } },
    { $group: { _id: { projectId: '$projectId', status: '$status' }, count: { $sum: 1 } } },
  ]);

  const taskCountMap = {};
  for (const entry of taskCountsRaw) {
    const pid = entry._id.projectId.toString();
    if (!taskCountMap[pid]) taskCountMap[pid] = { total: 0, pending_review: 0, todo: 0, in_progress: 0, done: 0, declined: 0 };
    taskCountMap[pid][entry._id.status] = entry.count;
    taskCountMap[pid].total += entry.count;
  }

  const data = projects.map(project => ({
    ...project,
    taskCounts: taskCountMap[project._id.toString()] || { total: 0, pending_review: 0, todo: 0, in_progress: 0, done: 0, declined: 0 },
  }));

  res.json({ success: true, count: data.length, data });
});

exports.getProjectById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const project = await InternalProject.findOne({ _id: id, clients: req.user._id })
    .populate('assignedEngineers', 'name email')
    .populate('clients', 'name email');

  if (!project) throw new NotFoundError('Project', 'PROJECT_NOT_FOUND');

  res.json({ success: true, data: project });
});

// ── Tasks (requests) ───────────────────────────────────────────────────────

exports.getMyTasks = asyncHandler(async (req, res) => {
  const { status, projectId } = req.query;

  const projectIds = await getLinkedProjectIds(req.user._id);
  if (projectIds.length === 0) {
    return res.json({ success: true, count: 0, data: [] });
  }

  const filter = { projectId: { $in: projectIds }, source: 'client' };
  if (status) filter.status = status;
  if (projectId) {
    if (!projectIds.some(p => p.toString() === projectId)) {
      throw new BadRequestError('You are not linked to this project', 'NOT_LINKED');
    }
    filter.projectId = projectId;
  }

  const tasks = await InternalTask.find(filter)
    .populate('clientId', 'name email')
    .populate('projectId', 'name')
    .populate('assignedTo', 'name')
    .sort({ createdAt: -1 })
    .lean();

  res.json({ success: true, count: tasks.length, data: tasks });
});

exports.getTaskById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const projectIds = await getLinkedProjectIds(req.user._id);

  const task = await InternalTask.findOne({ _id: id, source: 'client', projectId: { $in: projectIds } })
    .populate('clientId', 'name email')
    .populate('projectId', 'name')
    .populate('assignedTo', 'name');

  if (!task) throw new NotFoundError('Task', 'TASK_NOT_FOUND');

  res.json({ success: true, data: task });
});

exports.createTask = asyncHandler(async (req, res) => {
  const { projectId, title, description, clientUrgency } = req.body;

  if (!projectId) throw new BadRequestError('projectId is required', 'MISSING_PROJECT');
  if (!title || !title.trim()) throw new BadRequestError('Title is required', 'MISSING_TITLE');

  const project = await InternalProject.findOne({ _id: projectId, clients: req.user._id });
  if (!project) throw new BadRequestError('You are not linked to this project', 'NOT_LINKED');

  if (clientUrgency && !['whenever', 'soon', 'urgent'].includes(clientUrgency)) {
    throw new BadRequestError('Invalid urgency value', 'INVALID_URGENCY');
  }

  // Deliberately ignores any dueDate/hardDeadline/priority/assignedTo the caller might send —
  // those are set exclusively by CTO/Admin during triage.
  const task = await InternalTask.create({
    projectId,
    title: title.trim(),
    description: description?.trim() || '',
    priority: 3,
    source: 'client',
    clientId: req.user._id,
    clientUrgency: clientUrgency || null,
    status: 'pending_review',
    createdBy: req.user._id,
  });

  logger.info(`Client ${req.user._id} submitted task request: ${task.title} (${task._id}) for project ${projectId}`);

  const managers = await User.find({ role: { $in: ['cto', 'admin', 'superadmin'] } }).select('_id').lean();
  Promise.all(managers.map(m => createAndEmitNotification(
    m._id, 'task', 'New Client Request',
    `${req.user.name} submitted "${task.title}" on ${project.name}`,
    { taskId: task._id.toString(), projectId: project._id.toString() },
    { actionUrl: '/cto-internal/tasks', actionLabel: 'Review Request' }
  ))).catch(err => {
    logger.error('Failed to notify managers of new client request', { error: err.message, taskId: task._id });
  });

  res.status(201).json({ success: true, message: 'Request submitted', data: task });
});

// ── Media ───────────────────────────────────────────────────────────────────

async function findOwnedPendingTask(taskId, clientId) {
  const task = await InternalTask.findOne({ _id: taskId, source: 'client', clientId });
  if (!task) throw new NotFoundError('Task', 'TASK_NOT_FOUND');
  return task;
}

// Note: the client-media-upload multer middleware (single 'file' field) is applied
// in client.routes.js, same convention as upload.array('images', ...) is applied in
// cto.internal.routes.js rather than bundled into the controller export.
exports.addMedia = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const task = await findOwnedPendingTask(id, req.user._id);
  if (task.status !== 'pending_review') {
    throw new BadRequestError('Media can only be added while the request is pending review', 'NOT_PENDING');
  }
  if (!req.file) throw new BadRequestError('No file provided', 'NO_FILE');
  if (task.clientMedia.length >= MAX_MEDIA_ITEMS) {
    throw new BadRequestError(`Maximum ${MAX_MEDIA_ITEMS} media files per request`, 'MEDIA_LIMIT');
  }

  const kind = clientMediaUpload.kindOf(req.file.mimetype);
  if (!kind) throw new BadRequestError(`Unsupported file type: ${req.file.mimetype}`, 'UNSUPPORTED_TYPE');

  const maxBytes = clientMediaUpload.MAX_BYTES[kind];
  if (req.file.size > maxBytes) {
    throw new BadRequestError(`${kind} files must be under ${Math.round(maxBytes / (1024 * 1024))}MB`, 'FILE_TOO_LARGE');
  }

  const storagePath = `${task._id}/${Date.now()}-${sanitizeFilename(req.file.originalname)}`;
  await uploadToSupabaseWithRetry(CLIENT_MEDIA_BUCKET, storagePath, req.file.buffer, req.file.mimetype);

  const durationSeconds = req.body.durationSeconds ? Number(req.body.durationSeconds) : undefined;

  task.clientMedia.push({
    kind,
    storageBucket: CLIENT_MEDIA_BUCKET,
    storagePath,
    mimeType: req.file.mimetype,
    sizeBytes: req.file.size,
    durationSeconds,
    name: req.file.originalname,
  });
  await task.save();

  const saved = task.clientMedia[task.clientMedia.length - 1];
  const url = await resolveSignedUrl(CLIENT_MEDIA_BUCKET, storagePath);

  res.status(201).json({ success: true, message: 'Media uploaded', data: { ...saved.toObject(), url } });
});

exports.getMedia = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const projectIds = await getLinkedProjectIds(req.user._id);
  const task = await InternalTask.findOne({ _id: id, source: 'client', projectId: { $in: projectIds } }).select('clientMedia');
  if (!task) throw new NotFoundError('Task', 'TASK_NOT_FOUND');

  const data = await Promise.all(task.clientMedia.map(async m => ({
    ...m.toObject(),
    url: await resolveSignedUrl(m.storageBucket, m.storagePath),
  })));

  res.json({ success: true, data });
});

exports.deleteMedia = asyncHandler(async (req, res) => {
  const { id, mediaId } = req.params;

  const task = await findOwnedPendingTask(id, req.user._id);
  if (task.status !== 'pending_review') {
    throw new BadRequestError('Media can only be removed while the request is pending review', 'NOT_PENDING');
  }

  const item = task.clientMedia.id(mediaId);
  if (!item) throw new NotFoundError('Media', 'MEDIA_NOT_FOUND');

  await deleteFromSupabase(item.storageBucket, item.storagePath);
  item.deleteOne();
  await task.save();

  res.json({ success: true, message: 'Media deleted', data: null });
});
