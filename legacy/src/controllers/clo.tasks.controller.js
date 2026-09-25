/**
 * CLO Tasks Controller
 *
 * CLO manages tasks that are linked to one or more Sessions — when a student
 * opens any of those sessions, the linked task is surfaced to them automatically.
 * Unlike trainer-created tasks (scoped to a group the trainer owns), CLO
 * tasks are always anchored to sessions, and the groups/courses are derived
 * from those sessions so they can never drift out of sync. A task can span
 * sessions from several different groups at once.
 */

const asyncHandler = require('../utils/asyncHandler');
const { NotFoundError, BadRequestError } = require('../utils/errors');
const Task = require('../models/Task');
const TaskSubmission = require('../models/TaskSubmission');
const Session = require('../models/Session');
const Group = require('../models/Group');
const logger = require('../utils/logger');
const { sendNotificationToUsers } = require('../services/notification.service');

/**
 * Clean questions by removing temporary _id fields
 * Frontend may send temporary IDs (e.g., "temp-123") which Mongoose cannot cast to ObjectId
 */
function cleanQuestions(questions) {
  if (!questions || !Array.isArray(questions)) {
    return questions;
  }

  return questions.map((question) => {
    const { _id, ...rest } = question;

    if (_id && typeof _id === 'string' && _id.startsWith('temp-')) {
      return rest;
    }

    if (_id && typeof _id === 'string' && /^[0-9a-fA-F]{24}$/.test(_id)) {
      return question;
    }

    return rest;
  });
}

function validateQuestions(questions) {
  if (!questions || questions.length === 0) return;

  const orders = [];
  for (const question of questions) {
    if (!['mcq', 'image', 'text'].includes(question.answerType)) {
      throw new BadRequestError('Each question must have answerType: mcq, image, or text', 'INVALID_ANSWER_TYPE');
    }

    if (question.answerType === 'mcq') {
      if (!question.type || !['single_choice', 'multiple_choice'].includes(question.type)) {
        throw new BadRequestError('MCQ questions must have type: single_choice or multiple_choice', 'INVALID_MCQ_TYPE');
      }
      if (!question.options || question.options.length < 2) {
        throw new BadRequestError('MCQ questions must have at least 2 options', 'INSUFFICIENT_OPTIONS');
      }
      if (!question.correctAnswers || question.correctAnswers.length === 0) {
        throw new BadRequestError(`MCQ question ${question.order + 1} must have at least one correct answer marked`, 'MISSING_CORRECT_ANSWER');
      }
      for (const idx of question.correctAnswers) {
        if (idx < 0 || idx >= question.options.length) {
          throw new BadRequestError(`Correct answer index out of range for question ${question.order + 1}`, 'INVALID_CORRECT_ANSWER_INDEX');
        }
      }
      if (question.type === 'single_choice' && question.correctAnswers.length > 1) {
        throw new BadRequestError(`Single choice question ${question.order + 1} can only have one correct answer`, 'SINGLE_CHOICE_MULTIPLE_CORRECT');
      }
    }

    if (orders.includes(question.order)) {
      throw new BadRequestError('Question order must be unique', 'DUPLICATE_QUESTION_ORDER');
    }
    orders.push(question.order);
  }
}

/**
 * Given a list of session IDs, look them up, validate they all exist and
 * belong to a group, and derive the de-duplicated set of groupIds/courseIds.
 * Throws if any session is missing or groupless.
 */
async function resolveSessionLinks(sessionIds) {
  if (!Array.isArray(sessionIds) || sessionIds.length === 0) {
    throw new BadRequestError('At least one session is required — select the sessions this task belongs to', 'SESSION_REQUIRED');
  }

  const uniqueSessionIds = [...new Set(sessionIds.map(String))];
  const sessions = await Session.find({ _id: { $in: uniqueSessionIds } });

  if (sessions.length !== uniqueSessionIds.length) {
    throw new NotFoundError('One or more sessions were not found', 'SESSION_NOT_FOUND');
  }

  if (sessions.some((s) => !s.groupId)) {
    throw new BadRequestError('One or more sessions has no group and cannot have a task', 'SESSION_HAS_NO_GROUP');
  }

  const groupIds = [...new Set(sessions.map((s) => s.groupId.toString()))];
  const courseIds = [...new Set(sessions.filter((s) => s.courseId).map((s) => s.courseId.toString()))];

  const groups = await Group.find({ _id: { $in: groupIds } });
  if (groups.length !== groupIds.length) {
    throw new NotFoundError('One or more groups for the selected sessions were not found', 'GROUP_NOT_FOUND');
  }

  return { sessionIds: uniqueSessionIds, groupIds, courseIds, groups };
}

async function notifyGroupsStudents(task, groups) {
  try {
    const studentIds = [...new Set(
      groups.flatMap((g) => (g?.students || []).map((id) => id.toString()))
    )];
    if (studentIds.length === 0) return;

    const formattedDeadline = new Date(task.deadline).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });

    await sendNotificationToUsers(
      studentIds,
      'New Task Assigned',
      `${task.title} - Due: ${formattedDeadline}`,
      {
        type: 'task',
        taskId: task._id.toString(),
        sessionId: task.sessionId ? task.sessionId.toString() : null,
        groupId: task.groupId.toString(),
        courseId: task.courseId ? task.courseId.toString() : null,
        screen: 'task'
      }
    );

    logger.info(`Task notifications sent to ${studentIds.length} students`, { taskId: task._id });
  } catch (notificationError) {
    logger.error(`Failed to send task notifications: ${notificationError.message}`, {
      taskId: task._id,
      error: notificationError
    });
  }
}

/**
 * @desc    Create a new task linked to one or more sessions
 * @route   POST /api/clo/tasks
 * @access  Private (CLO)
 */
exports.createTask = asyncHandler(async (req, res) => {
  const cloId = req.user._id || req.user.id;
  const { sessionIds, title, titleAr, description, descriptionAr, deadline, maxScore, questions, allowLateSubmission, status } = req.body;

  const { sessionIds: resolvedSessionIds, groupIds, courseIds, groups } = await resolveSessionLinks(sessionIds);

  const cleanedQuestions = cleanQuestions(questions || []);
  validateQuestions(cleanedQuestions);

  const taskStatus = status === 'draft' ? 'draft' : 'open';

  const task = await Task.create({
    groupId: groupIds[0],
    courseId: courseIds[0] || undefined,
    sessionId: resolvedSessionIds[0],
    groupIds,
    courseIds,
    sessionIds: resolvedSessionIds,
    createdBy: cloId,
    title,
    titleAr,
    description,
    descriptionAr,
    deadline: new Date(deadline),
    maxScore: maxScore || 100,
    hasQuestions: cleanedQuestions && cleanedQuestions.length > 0,
    questions: cleanedQuestions || [],
    allowLateSubmission: allowLateSubmission || false,
    status: taskStatus
  });

  logger.info('CLO task created', { taskId: task._id, cloId, sessionIds: resolvedSessionIds, groupIds, status: taskStatus });

  if (taskStatus === 'open') {
    await notifyGroupsStudents(task, groups);
  }

  res.status(201).json({
    success: true,
    message: taskStatus === 'draft' ? 'Task saved as draft' : 'Task created successfully',
    data: task
  });
});

/**
 * @desc    Update a task
 * @route   PUT /api/clo/tasks/:taskId
 * @access  Private (CLO)
 */
exports.updateTask = asyncHandler(async (req, res) => {
  const { taskId } = req.params;
  const { sessionIds, title, titleAr, description, descriptionAr, deadline, maxScore, questions, allowLateSubmission, status } = req.body;

  const task = await Task.findById(taskId);
  if (!task) {
    throw new NotFoundError('Task not found', 'TASK_NOT_FOUND');
  }

  if (task.status !== 'draft') {
    const submissionCount = await TaskSubmission.countDocuments({ taskId: task._id });
    if (submissionCount > 0) {
      throw new BadRequestError('Cannot update task with existing submissions', 'SUBMISSIONS_EXIST');
    }
  }

  let groups;
  if (sessionIds !== undefined) {
    const resolved = await resolveSessionLinks(sessionIds);
    task.sessionId = resolved.sessionIds[0];
    task.groupId = resolved.groupIds[0];
    task.courseId = resolved.courseIds[0] || undefined;
    task.sessionIds = resolved.sessionIds;
    task.groupIds = resolved.groupIds;
    task.courseIds = resolved.courseIds;
    groups = resolved.groups;
  } else {
    const existingGroupIds = task.groupIds && task.groupIds.length > 0 ? task.groupIds : [task.groupId];
    groups = await Group.find({ _id: { $in: existingGroupIds } });
    if (groups.length === 0) {
      throw new NotFoundError('Group not found', 'GROUP_NOT_FOUND');
    }
  }

  let cleanedQuestions = questions;
  if (questions !== undefined) {
    cleanedQuestions = cleanQuestions(questions || []);
    validateQuestions(cleanedQuestions);
  }

  if (title !== undefined) task.title = title;
  if (titleAr !== undefined) task.titleAr = titleAr;
  if (description !== undefined) task.description = description;
  if (descriptionAr !== undefined) task.descriptionAr = descriptionAr;
  if (deadline !== undefined) task.deadline = new Date(deadline);
  if (maxScore !== undefined) task.maxScore = maxScore;
  if (questions !== undefined) {
    task.questions = cleanedQuestions || [];
    task.hasQuestions = cleanedQuestions && cleanedQuestions.length > 0;
  }
  if (allowLateSubmission !== undefined) task.allowLateSubmission = allowLateSubmission;

  const wasPublishing = status === 'open' && task.status === 'draft';
  if (status !== undefined) {
    if (!['draft', 'open', 'closed'].includes(status)) {
      throw new BadRequestError('Invalid status', 'INVALID_STATUS');
    }
    task.status = status;
  }

  await task.save();

  logger.info('CLO task updated', { taskId: task._id, status: task.status });

  if (wasPublishing) {
    await notifyGroupsStudents(task, groups);
  }

  res.json({
    success: true,
    message: wasPublishing ? 'Task published successfully' : 'Task updated successfully',
    data: task
  });
});

/**
 * @desc    Publish a draft task (set status from draft → open and notify students)
 * @route   PATCH /api/clo/tasks/:taskId/publish
 * @access  Private (CLO)
 */
exports.publishTask = asyncHandler(async (req, res) => {
  const { taskId } = req.params;

  const task = await Task.findById(taskId);
  if (!task) {
    throw new NotFoundError('Task not found', 'TASK_NOT_FOUND');
  }

  if (task.status !== 'draft') {
    throw new BadRequestError('Only draft tasks can be published', 'NOT_A_DRAFT');
  }

  const groupIds = task.groupIds && task.groupIds.length > 0 ? task.groupIds : [task.groupId];
  const groups = await Group.find({ _id: { $in: groupIds } });
  if (groups.length === 0) {
    throw new NotFoundError('Group not found', 'GROUP_NOT_FOUND');
  }

  task.status = 'open';
  await task.save();

  logger.info('CLO task published', { taskId: task._id });

  await notifyGroupsStudents(task, groups);

  res.json({
    success: true,
    message: 'Task published successfully',
    data: task
  });
});

/**
 * @desc    Delete a task
 * @route   DELETE /api/clo/tasks/:taskId
 * @access  Private (CLO)
 */
exports.deleteTask = asyncHandler(async (req, res) => {
  const { taskId } = req.params;

  const task = await Task.findById(taskId);
  if (!task) {
    throw new NotFoundError('Task not found', 'TASK_NOT_FOUND');
  }

  const submissionCount = await TaskSubmission.countDocuments({ taskId: task._id });

  if (submissionCount > 0) {
    const submissions = await TaskSubmission.find({ taskId: task._id }).select('answers');

    const cloudinary = require('cloudinary').v2;
    let deletedImagesCount = 0;

    for (const submission of submissions) {
      if (submission.answers && Array.isArray(submission.answers)) {
        for (const answer of submission.answers) {
          if (answer.imageAnswers && Array.isArray(answer.imageAnswers)) {
            for (const image of answer.imageAnswers) {
              if (image.cloudinaryPublicId) {
                try {
                  await cloudinary.uploader.destroy(image.cloudinaryPublicId);
                  deletedImagesCount++;
                } catch (error) {
                  logger.logError(error, {
                    context: 'delete_clo_task_image',
                    publicId: image.cloudinaryPublicId,
                    taskId: task._id
                  });
                }
              }
            }
          }
        }
      }
    }

    await TaskSubmission.deleteMany({ taskId: task._id });

    logger.info('Deleted submissions for CLO task', {
      taskId: task._id,
      submissionCount,
      deletedImagesCount
    });
  }

  await task.deleteOne();

  logger.info('CLO task deleted', { taskId: task._id, deletedSubmissions: submissionCount });

  res.json({
    success: true,
    message: 'Task deleted successfully',
    deletedSubmissions: submissionCount
  });
});

/**
 * @desc    Duplicate a task as a draft copy (same content, new _id, no submissions)
 * @route   POST /api/clo/tasks/:taskId/duplicate
 * @access  Private (CLO)
 */
exports.duplicateTask = asyncHandler(async (req, res) => {
  const { taskId } = req.params;
  const cloId = req.user._id || req.user.id;

  const original = await Task.findById(taskId);
  if (!original) {
    throw new NotFoundError('Task not found', 'TASK_NOT_FOUND');
  }

  const copy = await Task.create({
    groupId: original.groupId,
    courseId: original.courseId,
    sessionId: original.sessionId,
    groupIds: original.groupIds || [],
    courseIds: original.courseIds || [],
    sessionIds: original.sessionIds || [],
    createdBy: cloId,
    title: `${original.title} (Copy)`,
    titleAr: original.titleAr ? `${original.titleAr} (نسخة)` : undefined,
    description: original.description,
    descriptionAr: original.descriptionAr,
    deadline: original.deadline,
    maxScore: original.maxScore,
    hasQuestions: original.hasQuestions,
    questions: original.questions || [],
    allowLateSubmission: original.allowLateSubmission,
    status: 'draft'
  });

  logger.info('CLO task duplicated', { originalTaskId: taskId, newTaskId: copy._id, cloId });

  res.status(201).json({
    success: true,
    message: 'Task duplicated as draft',
    data: copy
  });
});

/**
 * @desc    Get all tasks
 * @route   GET /api/clo/tasks
 * @access  Private (CLO)
 */
exports.getAllTasks = asyncHandler(async (req, res) => {
  const { courseId, groupId, sessionId, status, page = 1, limit = 20 } = req.query;

  // Build query — filters must match either the legacy singular field
  // (trainer-created, single-group tasks) or the new array field (CLO
  // tasks that can span multiple sessions/groups/courses).
  const andConditions = [];
  if (courseId) andConditions.push({ $or: [{ courseId }, { courseIds: courseId }] });
  if (groupId) andConditions.push({ $or: [{ groupId }, { groupIds: groupId }] });
  if (sessionId) andConditions.push({ $or: [{ sessionId }, { sessionIds: sessionId }] });
  if (status) andConditions.push({ status });

  const query = andConditions.length > 0 ? { $and: andConditions } : {};

  // Pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const tasks = await Task.find(query)
    .populate('groupId', 'name')
    .populate('courseId', 'title')
    .populate('sessionId', 'title sessionNumber scheduledDate')
    .populate('groupIds', 'name')
    .populate('courseIds', 'title')
    .populate('sessionIds', 'title sessionNumber scheduledDate')
    .populate('createdBy', 'name email')
    .sort({ deadline: 1, createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Task.countDocuments(query);

  res.json({
    success: true,
    count: tasks.length,
    data: tasks,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
      total
    }
  });
});

/**
 * @desc    Get task details with all submissions
 * @route   GET /api/clo/tasks/:taskId
 * @access  Private (CLO)
 */
exports.getTaskDetails = asyncHandler(async (req, res) => {
  const { taskId } = req.params;

  const task = await Task.findById(taskId)
    .populate('groupId', 'name')
    .populate('courseId', 'title')
    .populate('sessionId', 'title sessionNumber scheduledDate')
    .populate('groupIds', 'name')
    .populate('courseIds', 'title')
    .populate('sessionIds', 'title sessionNumber scheduledDate')
    .populate('createdBy', 'name email');

  if (!task) {
    throw new NotFoundError('Task not found', 'TASK_NOT_FOUND');
  }

  const submissions = await TaskSubmission.find({ taskId })
    .populate('studentId', 'name email')
    .populate('gradedBy', 'name email')
    .sort({ submittedAt: -1 });

  res.json({
    success: true,
    data: {
      task: task.toObject(),
      questions: task.questions || [],
      submissions
    }
  });
});

/**
 * @desc    Get task results statistics
 * @route   GET /api/clo/tasks/:taskId/results
 * @access  Private (CLO)
 */
exports.getTaskResults = asyncHandler(async (req, res) => {
  const { taskId } = req.params;

  const task = await Task.findById(taskId);
  if (!task) {
    throw new NotFoundError('Task not found', 'TASK_NOT_FOUND');
  }

  // Get all submissions
  const submissions = await TaskSubmission.find({ taskId })
    .populate('studentId', 'name email');

  const totalSubmissions = submissions.length;
  const gradedSubmissions = submissions.filter(s => s.status === 'graded').length;
  const pendingSubmissions = submissions.filter(s => s.status === 'pending_review').length;

  // Calculate average score
  const gradedWithScores = submissions.filter(s => s.score !== null && s.score !== undefined);
  const averageScore = gradedWithScores.length > 0
    ? gradedWithScores.reduce((sum, s) => sum + s.score, 0) / gradedWithScores.length
    : 0;

  // Calculate completion rate across the union of every group this task is linked to
  const groupIds = task.groupIds && task.groupIds.length > 0 ? task.groupIds : [task.groupId];
  const groupsForStats = await Group.find({ _id: { $in: groupIds } });
  const totalStudents = new Set(
    groupsForStats.flatMap((g) => (g.students || []).map((id) => id.toString()))
  ).size;
  const completionRate = totalStudents > 0
    ? (totalSubmissions / totalStudents) * 100
    : 0;

  // Late submissions count
  const lateSubmissions = submissions.filter(s => s.isLate).length;

  res.json({
    success: true,
    data: {
      taskId: task._id,
      taskTitle: task.title,
      questions: task.questions || [],
      statistics: {
        totalSubmissions,
        gradedSubmissions,
        pendingSubmissions,
        averageScore: Math.round(averageScore * 100) / 100,
        completionRate: Math.round(completionRate * 100) / 100,
        lateSubmissions,
        totalStudents
      },
      submissions: submissions.map(s => ({
        studentId: s.studentId._id,
        studentName: s.studentId.name,
        studentEmail: s.studentId.email,
        status: s.status,
        score: s.score,
        isLate: s.isLate,
        submittedAt: s.submittedAt
      }))
    }
  });
});
