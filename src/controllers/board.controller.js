const asyncHandler = require('../utils/asyncHandler');
const { NotFoundError, ForbiddenError, BadRequestError } = require('../utils/errors');
const Group = require('../models/Group');
const BoardNote = require('../models/BoardNote');
const GroupBoardTask = require('../models/GroupBoardTask');

// ─── Shared helpers ────────────────────────────────────────────────────────────

async function getEnabledGroup(groupId) {
  const group = await Group.findById(groupId).lean();
  if (!group) throw new NotFoundError('Group', 'GROUP_NOT_FOUND');
  if (!group.boardEnabled) {
    throw new ForbiddenError('Board is not enabled for this group', 'BOARD_NOT_ENABLED');
  }
  return group;
}

// ─── GET board ─────────────────────────────────────────────────────────────────
// Used by both trainer and student
exports.getBoard = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const group = await getEnabledGroup(groupId);

  const [notes, tasks] = await Promise.all([
    BoardNote.find({ groupId })
      .populate('author', 'name email')
      .sort({ isPinned: -1, createdAt: -1 })
      .lean(),
    GroupBoardTask.find({ groupId })
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .sort({ priority: 1, dueDate: 1, createdAt: 1 })
      .lean(),
  ]);

  res.json({ success: true, data: { group, notes, tasks } });
});

// ─── Notes ─────────────────────────────────────────────────────────────────────

exports.createNote = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const { content } = req.body;
  await getEnabledGroup(groupId);

  if (!content || !content.trim()) throw new BadRequestError('Content is required', 'CONTENT_REQUIRED');

  const note = await BoardNote.create({ groupId, author: req.user._id, content: content.trim() });
  await note.populate('author', 'name email');

  res.status(201).json({ success: true, data: note });
});

exports.updateNote = asyncHandler(async (req, res) => {
  const { groupId, noteId } = req.params;
  const { content, isPinned } = req.body;
  await getEnabledGroup(groupId);

  const note = await BoardNote.findOne({ _id: noteId, groupId });
  if (!note) throw new NotFoundError('Note', 'NOTE_NOT_FOUND');

  const isTrainer = req.user.role === 'trainer' || req.user.role === 'teacher';
  const isOwner = note.author.toString() === req.user._id.toString();

  if (!isTrainer && !isOwner) throw new ForbiddenError('You can only edit your own notes', 'FORBIDDEN');

  if (content !== undefined) note.content = content.trim();
  // Only trainer can pin
  if (isPinned !== undefined && isTrainer) note.isPinned = isPinned;

  await note.save();
  await note.populate('author', 'name email');

  res.json({ success: true, data: note });
});

exports.deleteNote = asyncHandler(async (req, res) => {
  const { groupId, noteId } = req.params;
  await getEnabledGroup(groupId);

  const note = await BoardNote.findOne({ _id: noteId, groupId });
  if (!note) throw new NotFoundError('Note', 'NOTE_NOT_FOUND');

  const isTrainer = req.user.role === 'trainer' || req.user.role === 'teacher';
  const isOwner = note.author.toString() === req.user._id.toString();

  if (!isTrainer && !isOwner) throw new ForbiddenError('You can only delete your own notes', 'FORBIDDEN');

  await note.deleteOne();
  res.json({ success: true, message: 'Note deleted' });
});

// ─── Tasks (trainer only) ──────────────────────────────────────────────────────

exports.createTask = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const group = await getEnabledGroup(groupId);
  const { title, description, priority, assignedTo, dueDate } = req.body;

  if (!title || !title.trim()) throw new BadRequestError('Title is required', 'TITLE_REQUIRED');

  // Validate assignees are members of this group
  if (assignedTo && assignedTo.length > 0) {
    const groupStudentIds = (group.students || []).map(id => id.toString());
    const trainerIdStr = group.trainerId.toString();
    for (const userId of assignedTo) {
      if (!groupStudentIds.includes(userId) && userId !== trainerIdStr) {
        throw new BadRequestError(`User ${userId} is not a member of this group`, 'USER_NOT_IN_GROUP');
      }
    }
  }

  const task = await GroupBoardTask.create({
    groupId,
    title: title.trim(),
    description: description?.trim(),
    priority: priority || 3,
    assignedTo: assignedTo || [],
    createdBy: req.user._id,
    dueDate: dueDate || undefined,
  });

  await task.populate([
    { path: 'assignedTo', select: 'name email' },
    { path: 'createdBy', select: 'name email' },
  ]);

  res.status(201).json({ success: true, data: task });
});

exports.updateTask = asyncHandler(async (req, res) => {
  const { groupId, taskId } = req.params;
  const group = await getEnabledGroup(groupId);
  const { title, description, priority, status, assignedTo, dueDate } = req.body;

  const task = await GroupBoardTask.findOne({ _id: taskId, groupId });
  if (!task) throw new NotFoundError('Task', 'TASK_NOT_FOUND');

  if (title !== undefined) task.title = title.trim();
  if (description !== undefined) task.description = description.trim();
  if (priority !== undefined) task.priority = priority;
  if (status !== undefined) task.status = status;
  if (dueDate !== undefined) task.dueDate = dueDate || undefined;

  if (assignedTo !== undefined) {
    const groupStudentIds = (group.students || []).map(id => id.toString());
    const trainerIdStr = group.trainerId.toString();
    for (const userId of assignedTo) {
      if (!groupStudentIds.includes(userId) && userId !== trainerIdStr) {
        throw new BadRequestError(`User ${userId} is not a member of this group`, 'USER_NOT_IN_GROUP');
      }
    }
    task.assignedTo = assignedTo;
  }

  await task.save();
  await task.populate([
    { path: 'assignedTo', select: 'name email' },
    { path: 'createdBy', select: 'name email' },
  ]);

  res.json({ success: true, data: task });
});

exports.deleteTask = asyncHandler(async (req, res) => {
  const { groupId, taskId } = req.params;
  await getEnabledGroup(groupId);

  const task = await GroupBoardTask.findOne({ _id: taskId, groupId });
  if (!task) throw new NotFoundError('Task', 'TASK_NOT_FOUND');

  await task.deleteOne();
  res.json({ success: true, message: 'Task deleted' });
});

// ─── Task status (student only) ────────────────────────────────────────────────

exports.updateTaskStatus = asyncHandler(async (req, res) => {
  const { groupId, taskId } = req.params;
  const { status } = req.body;
  await getEnabledGroup(groupId);

  const VALID_STATUSES = ['todo', 'in_progress', 'done'];
  if (!VALID_STATUSES.includes(status)) {
    throw new BadRequestError(`Status must be one of: ${VALID_STATUSES.join(', ')}`, 'INVALID_STATUS');
  }

  const task = await GroupBoardTask.findOne({ _id: taskId, groupId });
  if (!task) throw new NotFoundError('Task', 'TASK_NOT_FOUND');

  const isAssigned = task.assignedTo.some(id => id.toString() === req.user._id.toString());
  if (!isAssigned) throw new ForbiddenError('You are not assigned to this task', 'NOT_ASSIGNED');

  task.status = status;
  await task.save();
  await task.populate([
    { path: 'assignedTo', select: 'name email' },
    { path: 'createdBy', select: 'name email' },
  ]);

  res.json({ success: true, data: task });
});
