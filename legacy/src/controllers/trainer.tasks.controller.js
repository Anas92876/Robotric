/**
 * Trainer Tasks Controller
 * 
 * Handles task-related operations for trainers
 */

const asyncHandler = require('../utils/asyncHandler');
const { NotFoundError, ForbiddenError, BadRequestError } = require('../utils/errors');
const Task = require('../models/Task');
const TaskSubmission = require('../models/TaskSubmission');
const Group = require('../models/Group');
const logger = require('../utils/logger');
const { sendNotificationToUsers } = require('../services/notification.service');

/**
 * Clean questions by removing temporary _id fields
 * Frontend may send temporary IDs (e.g., "temp-123") which Mongoose cannot cast to ObjectId
 * @param {Array} questions - Array of question objects
 * @returns {Array} - Cleaned questions without temporary _id fields
 */
function cleanQuestions(questions) {
  if (!questions || !Array.isArray(questions)) {
    return questions;
  }
  
  return questions.map((question) => {
    const { _id, ...rest } = question;
    
    // Remove temporary _id if it's not a valid ObjectId format
    // Valid ObjectIds are 24 hex characters, temp IDs start with "temp-"
    if (_id && typeof _id === 'string' && _id.startsWith('temp-')) {
      // Return without _id - Mongoose will auto-generate it
      return rest;
    }
    
    // If _id is a valid ObjectId (24 hex chars) or already an ObjectId, keep it (for updates)
    // Otherwise, remove it to let Mongoose generate a new one
    if (_id && typeof _id === 'string' && /^[0-9a-fA-F]{24}$/.test(_id)) {
      return question; // Valid ObjectId format, keep it
    }
    
    // No _id or invalid format, return without it
    return rest;
  });
}

/**
 * @desc    Create a new task
 * @route   POST /api/trainer/tasks
 * @access  Private (Trainer)
 */
exports.createTask = asyncHandler(async (req, res) => {
  const trainerId = req.user._id || req.user.id;
  const { groupId, courseId, title, titleAr, description, descriptionAr, deadline, maxScore, questions, allowLateSubmission, status } = req.body;

  // Validate trainer owns the group
  const group = await Group.findById(groupId);
  if (!group) {
    throw new NotFoundError('Group not found', 'GROUP_NOT_FOUND');
  }

  if (group.trainerId.toString() !== trainerId.toString()) {
    throw new ForbiddenError('You do not own this group', 'GROUP_OWNERSHIP_REQUIRED');
  }

  // Clean questions: remove temporary _id fields (Mongoose will auto-generate them)
  let cleanedQuestions = questions;
  if (questions !== undefined) {
    cleanedQuestions = cleanQuestions(questions || []);
    
    // Validate questions structure
    if (cleanedQuestions && cleanedQuestions.length > 0) {
      const orders = [];
      for (const question of cleanedQuestions) {
      // Validate answerType
      if (!['mcq', 'image', 'text'].includes(question.answerType)) {
        throw new BadRequestError('Each question must have answerType: mcq, image, or text', 'INVALID_ANSWER_TYPE');
      }

      // Validate MCQ questions
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

      // Validate order is unique
      if (orders.includes(question.order)) {
        throw new BadRequestError('Question order must be unique', 'DUPLICATE_QUESTION_ORDER');
      }
      orders.push(question.order);
      }
    }
  }

  // Determine status — only 'draft' or 'open' allowed on create
  const taskStatus = status === 'draft' ? 'draft' : 'open';

  // Create task
  const task = await Task.create({
    groupId,
    courseId,
    createdBy: trainerId,
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

  logger.info('Task created', {
    taskId: task._id,
    trainerId: trainerId,
    groupId: groupId,
    status: taskStatus
  });

  // Only notify students when publishing immediately (not for drafts)
  if (taskStatus === 'open') {
    try {
      const studentIds = group.students || [];
      if (studentIds.length > 0) {
        const deadlineDate = new Date(deadline);
        const formattedDeadline = deadlineDate.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });

        await sendNotificationToUsers(
          studentIds,
          'New Task Assigned',
          `${title} - Due: ${formattedDeadline}`,
          {
            type: 'task',
            taskId: task._id.toString(),
            groupId: groupId.toString(),
            courseId: courseId ? courseId.toString() : null,
            screen: 'task'
          }
        );

        logger.info(`Task notifications sent to ${studentIds.length} students`, {
          taskId: task._id,
          studentCount: studentIds.length
        });
      }
    } catch (notificationError) {
      logger.error(`Failed to send task notifications: ${notificationError.message}`, {
        taskId: task._id,
        error: notificationError
      });
    }
  }

  res.status(201).json({
    success: true,
    message: taskStatus === 'draft' ? 'Task saved as draft' : 'Task created successfully',
    data: task
  });
});

/**
 * @desc    Get all tasks for a group
 * @route   GET /api/trainer/tasks/group/:groupId
 * @access  Private (Trainer)
 */
exports.getGroupTasks = asyncHandler(async (req, res) => {
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

  const tasks = await Task.find({ groupId })
    .populate('courseId', 'title')
    .populate('createdBy', 'name email')
    .sort({ deadline: 1, createdAt: -1 });

  res.json({
    success: true,
    count: tasks.length,
    data: tasks
  });
});

/**
 * @desc    Update a task
 * @route   PUT /api/trainer/tasks/:taskId
 * @access  Private (Trainer)
 */
exports.updateTask = asyncHandler(async (req, res) => {
  const trainerId = req.user._id || req.user.id;
  const { taskId } = req.params;
  const { title, titleAr, description, descriptionAr, deadline, maxScore, questions, allowLateSubmission, status } = req.body;

  const task = await Task.findById(taskId);
  if (!task) {
    throw new NotFoundError('Task not found', 'TASK_NOT_FOUND');
  }

  // Validate trainer owns the group
  const group = await Group.findById(task.groupId);
  if (!group) {
    throw new NotFoundError('Group not found', 'GROUP_NOT_FOUND');
  }

  if (group.trainerId.toString() !== trainerId.toString()) {
    throw new ForbiddenError('You do not own this group', 'GROUP_OWNERSHIP_REQUIRED');
  }

  // Check if submissions exist (drafts can always be edited; published tasks with submissions cannot)
  if (task.status !== 'draft') {
    const submissionCount = await TaskSubmission.countDocuments({ taskId: task._id });
    if (submissionCount > 0) {
      throw new BadRequestError('Cannot update task with existing submissions', 'SUBMISSIONS_EXIST');
    }
  }

  // Clean questions: remove temporary _id fields (Mongoose will auto-generate them)
  let cleanedQuestions = questions;
  if (questions !== undefined) {
    cleanedQuestions = cleanQuestions(questions || []);
    
    // Validate questions structure (same as create)
    if (cleanedQuestions && cleanedQuestions.length > 0) {
      const orders = [];
      for (const question of cleanedQuestions) {
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
  }

  // Update task
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

  logger.info('Task updated', {
    taskId: task._id,
    trainerId: trainerId,
    status: task.status
  });

  // Send notifications when a draft is published
  if (wasPublishing) {
    try {
      const taskGroup = await Group.findById(task.groupId);
      const studentIds = taskGroup?.students || [];
      if (studentIds.length > 0) {
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
            groupId: task.groupId.toString(),
            courseId: task.courseId ? task.courseId.toString() : null,
            screen: 'task'
          }
        );
        logger.info(`Publish notifications sent to ${studentIds.length} students`, {
          taskId: task._id
        });
      }
    } catch (notificationError) {
      logger.error(`Failed to send publish notifications: ${notificationError.message}`, {
        taskId: task._id,
        error: notificationError
      });
    }
  }

  res.json({
    success: true,
    message: wasPublishing ? 'Task published successfully' : 'Task updated successfully',
    data: task
  });
});

/**
 * @desc    Publish a draft task (set status from draft → open and notify students)
 * @route   PATCH /api/trainer/tasks/:taskId/publish
 * @access  Private (Trainer)
 */
exports.publishTask = asyncHandler(async (req, res) => {
  const trainerId = req.user._id || req.user.id;
  const { taskId } = req.params;

  const task = await Task.findById(taskId);
  if (!task) {
    throw new NotFoundError('Task not found', 'TASK_NOT_FOUND');
  }

  const group = await Group.findById(task.groupId);
  if (!group) {
    throw new NotFoundError('Group not found', 'GROUP_NOT_FOUND');
  }

  if (group.trainerId.toString() !== trainerId.toString()) {
    throw new ForbiddenError('You do not own this group', 'GROUP_OWNERSHIP_REQUIRED');
  }

  if (task.status !== 'draft') {
    throw new BadRequestError('Only draft tasks can be published', 'NOT_A_DRAFT');
  }

  task.status = 'open';
  await task.save();

  logger.info('Task published', { taskId: task._id, trainerId });

  // Notify students
  try {
    const studentIds = group.students || [];
    if (studentIds.length > 0) {
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
          groupId: task.groupId.toString(),
          courseId: task.courseId ? task.courseId.toString() : null,
          screen: 'task'
        }
      );
      logger.info(`Publish notifications sent to ${studentIds.length} students`, { taskId: task._id });
    }
  } catch (notificationError) {
    logger.error(`Failed to send publish notifications: ${notificationError.message}`, {
      taskId: task._id,
      error: notificationError
    });
  }

  res.json({
    success: true,
    message: 'Task published successfully',
    data: task
  });
});

/**
 * @desc    Delete a task
 * @route   DELETE /api/trainer/tasks/:taskId
 * @access  Private (Trainer)
 */
exports.deleteTask = asyncHandler(async (req, res) => {
  const trainerId = req.user._id || req.user.id;
  const { taskId } = req.params;

  const task = await Task.findById(taskId);
  if (!task) {
    throw new NotFoundError('Task not found', 'TASK_NOT_FOUND');
  }

  // Validate trainer owns the group
  const group = await Group.findById(task.groupId);
  if (!group) {
    throw new NotFoundError('Group not found', 'GROUP_NOT_FOUND');
  }

  if (group.trainerId.toString() !== trainerId.toString()) {
    throw new ForbiddenError('You do not own this group', 'GROUP_OWNERSHIP_REQUIRED');
  }

  // Delete all submissions associated with this task
  const submissionCount = await TaskSubmission.countDocuments({ taskId: task._id });
  
  if (submissionCount > 0) {
    // Get all submissions to delete associated images from Cloudinary
    const submissions = await TaskSubmission.find({ taskId: task._id }).select('answers');
    
    // Delete image files from Cloudinary if they exist
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
                  logger.info('Deleted image from Cloudinary', {
                    publicId: image.cloudinaryPublicId,
                    taskId: task._id
                  });
                } catch (error) {
                  logger.logError(error, {
                    context: 'delete_task_image',
                    publicId: image.cloudinaryPublicId,
                    taskId: task._id
                  });
                  // Continue deletion even if image deletion fails
                }
              }
            }
          }
        }
      }
    }
    
    // Delete all submissions from database
    await TaskSubmission.deleteMany({ taskId: task._id });
    
    logger.info('Deleted submissions for task', {
      taskId: task._id,
      submissionCount,
      deletedImagesCount,
      trainerId: trainerId
    });
  }

  // Delete the task
  await task.deleteOne();

  logger.info('Task deleted', {
    taskId: task._id,
    trainerId: trainerId,
    deletedSubmissions: submissionCount
  });

  res.json({
    success: true,
    message: 'Task deleted successfully',
    deletedSubmissions: submissionCount
  });
});

/**
 * @desc    Get task details with questions and submissions
 * @route   GET /api/trainer/tasks/:taskId
 * @access  Private (Trainer)
 */
exports.getTaskDetails = asyncHandler(async (req, res) => {
  const trainerId = req.user._id || req.user.id;
  const { taskId } = req.params;

  const task = await Task.findById(taskId)
    .populate('groupId', 'name')
    .populate('courseId', 'title')
    .populate('createdBy', 'name email');

  if (!task) {
    throw new NotFoundError('Task not found', 'TASK_NOT_FOUND');
  }

  // Validate trainer owns the group
  const group = await Group.findById(task.groupId);
  if (!group) {
    throw new NotFoundError('Group not found', 'GROUP_NOT_FOUND');
  }

  if (group.trainerId.toString() !== trainerId.toString()) {
    throw new ForbiddenError('You do not own this group', 'GROUP_OWNERSHIP_REQUIRED');
  }

  const submissions = await TaskSubmission.find({ taskId })
    .populate('studentId', 'name email')
    .populate('gradedBy', 'name email')
    .sort({ submittedAt: -1 });

  res.json({
    success: true,
    count: submissions.length,
    task: task,
    data: {
      questions: task.questions || [],
      submissions: submissions
    }
  });
});

/**
 * @desc    Get all submissions for a task
 * @route   GET /api/trainer/tasks/:taskId/submissions
 * @access  Private (Trainer)
 */
exports.getTaskSubmissions = asyncHandler(async (req, res) => {
  const trainerId = req.user._id || req.user.id;
  const { taskId } = req.params;

  const task = await Task.findById(taskId);
  if (!task) {
    throw new NotFoundError('Task not found', 'TASK_NOT_FOUND');
  }

  // Validate trainer owns the group
  const group = await Group.findById(task.groupId);
  if (!group) {
    throw new NotFoundError('Group not found', 'GROUP_NOT_FOUND');
  }

  if (group.trainerId.toString() !== trainerId.toString()) {
    throw new ForbiddenError('You do not own this group', 'GROUP_OWNERSHIP_REQUIRED');
  }

  const submissions = await TaskSubmission.find({ taskId })
    .populate('studentId', 'name email')
    .populate('gradedBy', 'name email')
    .sort({ submittedAt: -1 });

  res.json({
    success: true,
    count: submissions.length,
    data: {
      questions: task.questions || [],
      submissions: submissions
    }
  });
});

/**
 * @desc    Grade a task submission
 * @route   POST /api/trainer/tasks/:taskId/submissions/:submissionId/grade
 * @access  Private (Trainer)
 */
exports.gradeTaskSubmission = asyncHandler(async (req, res) => {
  const trainerId = req.user._id || req.user.id;
  const { taskId, submissionId } = req.params;
  const { score, feedback, status } = req.body;

  const task = await Task.findById(taskId);
  if (!task) {
    throw new NotFoundError('Task not found', 'TASK_NOT_FOUND');
  }

  // Validate trainer owns the group
  const group = await Group.findById(task.groupId);
  if (!group) {
    throw new NotFoundError('Group not found', 'GROUP_NOT_FOUND');
  }

  if (group.trainerId.toString() !== trainerId.toString()) {
    throw new ForbiddenError('You do not own this group', 'GROUP_OWNERSHIP_REQUIRED');
  }

  const submission = await TaskSubmission.findById(submissionId);
  if (!submission) {
    throw new NotFoundError('Submission not found', 'SUBMISSION_NOT_FOUND');
  }

  if (submission.taskId.toString() !== taskId) {
    throw new BadRequestError('Submission does not belong to this task', 'SUBMISSION_MISMATCH');
  }

  // Validate score
  if (score !== undefined) {
    if (score < 0 || score > task.maxScore) {
      throw new BadRequestError(`Score must be between 0 and ${task.maxScore}`, 'INVALID_SCORE');
    }
    submission.score = score;
  }

  if (feedback !== undefined) {
    submission.feedback = feedback;
  }

  if (status !== undefined) {
    if (!['pending_review', 'graded', 'returned'].includes(status)) {
      throw new BadRequestError('Invalid status', 'INVALID_STATUS');
    }
    submission.status = status;
  }

  submission.gradedAt = new Date();
  submission.gradedBy = trainerId;

  await submission.save();

  logger.info('Task submission graded', {
    taskId: task._id,
    submissionId: submission._id,
    trainerId: trainerId,
    score: submission.score
  });

  res.json({
    success: true,
    message: 'Submission graded successfully',
    data: submission
  });
});

/**
 * @desc    Download an attached file from a submission
 * @route   GET /api/trainer/tasks/:taskId/submissions/:submissionId/files/:fileId
 * @access  Private (Trainer)
 */
exports.downloadSubmissionFile = asyncHandler(async (req, res) => {
  const trainerId = req.user._id || req.user.id;
  const { taskId, submissionId, fileId } = req.params;

  const task = await Task.findById(taskId);
  if (!task) throw new NotFoundError('Task not found', 'TASK_NOT_FOUND');

  const group = await Group.findById(task.groupId);
  if (!group) throw new NotFoundError('Group not found', 'GROUP_NOT_FOUND');
  if (group.trainerId.toString() !== trainerId.toString()) {
    throw new ForbiddenError('You do not own this group', 'GROUP_OWNERSHIP_REQUIRED');
  }

  const submission = await TaskSubmission.findById(submissionId);
  if (!submission) throw new NotFoundError('Submission not found', 'SUBMISSION_NOT_FOUND');
  if (submission.taskId.toString() !== taskId) {
    throw new BadRequestError('Submission does not belong to this task', 'SUBMISSION_MISMATCH');
  }

  const attachedFile = submission.attachedFiles?.id(fileId);
  if (!attachedFile?.storagePath) throw new NotFoundError('File not found', 'FILE_NOT_FOUND');

  const supabase = require('../config/supabase');
  if (!supabase) throw new NotFoundError('Storage service not configured', 'STORAGE_NOT_CONFIGURED');

  const bucket = attachedFile.storageBucket || process.env.SUPABASE_BUCKET || 'resources';
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(attachedFile.storagePath, 300); // 5-minute download link

  if (error || !data?.signedUrl) {
    throw new Error(`Failed to generate download link: ${error?.message}`);
  }

  res.json({ success: true, data: { downloadUrl: data.signedUrl, filename: attachedFile.originalName || attachedFile.filename } });
});
