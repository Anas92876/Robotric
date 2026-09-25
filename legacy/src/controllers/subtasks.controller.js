const asyncHandler = require('../utils/asyncHandler');
const { NotFoundError, ForbiddenError, BadRequestError } = require('../utils/errors');
const SubTask = require('../models/SubTask');
const InternalTask = require('../models/InternalTask');

// ── Shared helper ─────────────────────────────────────────────────────────────
const getPopulated = (doc) =>
  doc.populate('createdBy', 'name email role');

// ── CTO: read sub-tasks for any task ─────────────────────────────────────────
exports.getSubTasksCTO = asyncHandler(async (req, res) => {
  const { taskId } = req.params;

  const task = await InternalTask.findById(taskId).lean();
  if (!task) throw new NotFoundError('Task', 'TASK_NOT_FOUND');

  const subTasks = await SubTask.find({ taskId })
    .populate('createdBy', 'name email role')
    .sort({ createdAt: 1 })
    .lean();

  res.json({ success: true, count: subTasks.length, data: subTasks });
});

// ── CTO: delete any sub-task ──────────────────────────────────────────────────
exports.deleteSubTaskCTO = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const subTask = await SubTask.findById(id);
  if (!subTask) throw new NotFoundError('Sub-task', 'SUBTASK_NOT_FOUND');

  await SubTask.findByIdAndDelete(id);
  res.json({ success: true, message: 'Sub-task deleted', data: null });
});

// ── Employee: read sub-tasks for tasks assigned to them ───────────────────────
exports.getSubTasksEmployee = asyncHandler(async (req, res) => {
  const { taskId } = req.params;
  const userId = req.user._id;

  const task = await InternalTask.findById(taskId).lean();
  if (!task) throw new NotFoundError('Task', 'TASK_NOT_FOUND');

  const isAssigned = task.assignedTo.some(a => a.toString() === userId.toString());
  if (!isAssigned) throw new ForbiddenError('You are not assigned to this task', 'NOT_ASSIGNED');

  const subTasks = await SubTask.find({ taskId })
    .populate('createdBy', 'name email role')
    .sort({ createdAt: 1 })
    .lean();

  res.json({ success: true, count: subTasks.length, data: subTasks });
});

// ── Employee: create a sub-task on their assigned task ────────────────────────
exports.createSubTask = asyncHandler(async (req, res) => {
  const { taskId } = req.params;
  const { title, note } = req.body;
  const userId = req.user._id;

  if (!title?.trim()) throw new BadRequestError('Sub-task title is required', 'TITLE_REQUIRED');

  const task = await InternalTask.findById(taskId).lean();
  if (!task) throw new NotFoundError('Task', 'TASK_NOT_FOUND');

  const isAssigned = task.assignedTo.some(a => a.toString() === userId.toString());
  if (!isAssigned) throw new ForbiddenError('You are not assigned to this task', 'NOT_ASSIGNED');

  const subTask = await SubTask.create({
    taskId,
    title: title.trim(),
    note: note?.trim() || undefined,
    createdBy: userId,
  });

  await subTask.populate('createdBy', 'name email role');

  res.status(201).json({ success: true, message: 'Sub-task created', data: subTask });
});

// ── Employee: toggle isDone on their own sub-task ────────────────────────────
exports.toggleSubTask = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;

  const subTask = await SubTask.findById(id);
  if (!subTask) throw new NotFoundError('Sub-task', 'SUBTASK_NOT_FOUND');

  if (subTask.createdBy.toString() !== userId.toString()) {
    throw new ForbiddenError('You can only update your own sub-tasks', 'NOT_OWNER');
  }

  subTask.isDone = !subTask.isDone;
  await subTask.save();
  await subTask.populate('createdBy', 'name email role');

  res.json({ success: true, message: 'Sub-task updated', data: subTask });
});

// ── Employee: delete their own sub-task ──────────────────────────────────────
exports.deleteSubTaskEmployee = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;

  const subTask = await SubTask.findById(id);
  if (!subTask) throw new NotFoundError('Sub-task', 'SUBTASK_NOT_FOUND');

  if (subTask.createdBy.toString() !== userId.toString()) {
    throw new ForbiddenError('You can only delete your own sub-tasks', 'NOT_OWNER');
  }

  await SubTask.findByIdAndDelete(id);
  res.json({ success: true, message: 'Sub-task deleted', data: null });
});
