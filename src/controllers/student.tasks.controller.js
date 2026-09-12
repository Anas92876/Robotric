/**
 * Student Tasks Controller
 * 
 * Handles task-related operations for students
 */

const asyncHandler = require('../utils/asyncHandler');
const { NotFoundError, ForbiddenError, BadRequestError } = require('../utils/errors');
const Task = require('../models/Task');
const TaskSubmission = require('../models/TaskSubmission');
const Group = require('../models/Group');
const { uploadImage } = require('../services/cloudinary.service');
const logger = require('../utils/logger');
const { withTimeout, TIMEOUTS } = require('../utils/timeout');
const { ALLOWED_ARCHIVE_TYPES } = require('../middleware/upload');
const supabase = require('../config/supabase');

function isArchiveFile(file) {
  const ext = (file.originalname || '').split('.').pop()?.toLowerCase();
  return ALLOWED_ARCHIVE_TYPES.includes(file.mimetype) || ext === 'zip' || ext === 'rar';
}

async function uploadArchiveToSupabase(file, taskId, studentId) {
  if (!supabase) throw new Error('File storage service is not configured');
  const bucket = process.env.SUPABASE_BUCKET || 'resources';
  const timestamp = Date.now();
  const sanitized = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '-').substring(0, 100);
  const storagePath = `task-submissions/${taskId}/${studentId}/${timestamp}-${sanitized}`;

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(storagePath, file.buffer, { contentType: file.mimetype, upsert: false });

  if (error) throw new Error(`Failed to upload file: ${error.message}`);
  return { storagePath, bucket };
}

/**
 * @desc    Get all tasks for the authenticated student
 * @route   GET /api/student/tasks
 * @access  Private (Student)
 */
exports.getMyTasks = asyncHandler(async (req, res) => {
  const studentId = req.user._id || req.user.id;
  const { status, courseId, page = 1, limit = 20 } = req.query;

  // Get all groups the student is in (with timeout)
  const groups = await withTimeout(
    Group.find({
      students: studentId
    }).select('_id').lean(),
    TIMEOUTS.DATABASE_QUERY,
    'Get student groups'
  );

  const studentGroupIds = groups.map(g => g._id);

  if (studentGroupIds.length === 0) {
    return res.json({
      success: true,
      count: 0,
      data: [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: 0,
        total: 0
      }
    });
  }

  // Build query — students never see drafts. A task matches if the student's
  // group is either the legacy single groupId (trainer tasks) or anywhere in
  // groupIds (CLO tasks spanning multiple groups).
  const andConditions = [
    { $or: [{ groupId: { $in: studentGroupIds } }, { groupIds: { $in: studentGroupIds } }] },
    { status: { $ne: 'draft' } }
  ];

  if (status && status !== 'draft') {
    andConditions.push({ status });
  }

  if (courseId) {
    andConditions.push({ $or: [{ courseId }, { courseIds: courseId }] });
  }

  const query = { $and: andConditions };

  // Pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const tasks = await withTimeout(
    Task.find(query)
      .populate('groupId', 'name')
      .populate('courseId', 'title')
      .populate('groupIds', 'name')
      .populate('courseIds', 'title')
      .populate('sessionIds', 'title sessionNumber scheduledDate')
      .populate('createdBy', 'name email')
      .sort({ deadline: 1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    TIMEOUTS.DATABASE_QUERY,
    'Get student tasks'
  );

  const total = await withTimeout(
    Task.countDocuments(query),
    TIMEOUTS.DATABASE_QUERY,
    'Count student tasks'
  );

  // Get submission status for each task
  const tasksWithSubmission = await Promise.all(
    tasks.map(async (task) => {
      const submission = await TaskSubmission.findOne({
        taskId: task._id,
        studentId: studentId
      }).select('status score submittedAt isLate');

      const taskObj = task.toObject();
      taskObj.questions = (taskObj.questions || []).map(({ correctAnswers, ...q }) => q);
      return {
        ...taskObj,
        submission: submission || null
      };
    })
  );

  // Hide tasks whose sessions haven't started yet (day-level lock, same as sessions)
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const visibleTasks = tasksWithSubmission.filter(task => {
    const sessions = task.sessionIds;
    if (!sessions || sessions.length === 0) return true;
    return sessions.some(s => {
      if (!s || !s.scheduledDate) return true;
      const sessionDay = new Date(s.scheduledDate);
      sessionDay.setHours(0, 0, 0, 0);
      return sessionDay <= todayStart;
    });
  });

  res.json({
    success: true,
    count: visibleTasks.length,
    data: visibleTasks,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
      total
    }
  });
});

/**
 * @desc    Get task details
 * @route   GET /api/student/tasks/:taskId
 * @access  Private (Student)
 */
exports.getTaskDetails = asyncHandler(async (req, res) => {
  const studentId = req.user._id || req.user.id;
  const { taskId } = req.params;

  const task = await Task.findById(taskId)
    .populate('groupId', 'name')
    .populate('courseId', 'title')
    .populate('groupIds', 'name')
    .populate('courseIds', 'title')
    .populate('sessionIds', 'title sessionNumber scheduledDate')
    .populate('createdBy', 'name email');

  if (!task) {
    throw new NotFoundError('Task not found', 'TASK_NOT_FOUND');
  }

  // Verify student is in at least one of the task's groups
  const taskGroupIds = task.groupIds && task.groupIds.length > 0
    ? task.groupIds.map(g => g._id || g)
    : [task.groupId._id || task.groupId];
  const groups = await Group.find({ _id: { $in: taskGroupIds } });
  if (groups.length === 0) {
    throw new NotFoundError('Group not found', 'GROUP_NOT_FOUND');
  }

  const isStudent = groups.some(group =>
    group.students.some(id => id.toString() === studentId.toString())
  );
  const isTrainer = groups.some(group => group.trainerId.toString() === studentId.toString());

  if (!isStudent && !isTrainer) {
    throw new ForbiddenError('You are not a member of this group', 'NOT_GROUP_MEMBER');
  }

  // Session-time lock: task is inaccessible until at least one linked session's date arrives
  const taskSessionIds = task.sessionIds && task.sessionIds.length > 0 ? task.sessionIds : [];
  if (taskSessionIds.length > 0) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const anyUnlocked = taskSessionIds.some(s => {
      if (!s || !s.scheduledDate) return true;
      const sessionDay = new Date(s.scheduledDate);
      sessionDay.setHours(0, 0, 0, 0);
      return sessionDay <= todayStart;
    });
    if (!anyUnlocked) {
      return res.status(403).json({
        success: false,
        locked: true,
        error: { message: 'This task is not yet available' }
      });
    }
  }

  // Get submission if exists
  const submission = await TaskSubmission.findOne({
    taskId: task._id,
    studentId: studentId
  });

  // For students, hide correctAnswers until the task has been graded or returned
  const isGradedStatus =
    submission &&
    (submission.status === 'graded' || submission.status === 'returned');

  const taskObj = task.toObject();
  taskObj.questions = (taskObj.questions || []).map(({ correctAnswers, ...q }) => {
    if (isGradedStatus) {
      return { ...q, correctAnswers };
    }
    return q;
  });

  res.json({
    success: true,
    data: {
      task: taskObj,
      submission: submission || null
    }
  });
});

/**
 * @desc    Submit task
 * @route   POST /api/student/tasks/:taskId/submit
 * @access  Private (Student)
 */
exports.submitTask = asyncHandler(async (req, res) => {
  const studentId = req.user._id || req.user.id;
  const { taskId } = req.params;
  const files = req.files || [];
  const imageFiles = files.filter(f => !isArchiveFile(f));
  const archiveFiles = files.filter(f => isArchiveFile(f));

  // Parse answers from JSON string (multipart/form-data)
  let answers = [];
  if (req.body.answers) {
    try {
      answers = typeof req.body.answers === 'string' 
        ? JSON.parse(req.body.answers) 
        : req.body.answers;
    } catch (error) {
      throw new BadRequestError('Invalid answers format. Must be valid JSON', 'INVALID_ANSWERS_FORMAT');
    }
  }

  // Get task (populate sessionIds to check lock)
  const task = await Task.findById(taskId).populate('sessionIds', 'scheduledDate');
  if (!task) {
    throw new NotFoundError('Task not found', 'TASK_NOT_FOUND');
  }

  // Session-time lock: cannot submit before the session's date
  const submitSessionIds = task.sessionIds && task.sessionIds.length > 0 ? task.sessionIds : [];
  if (submitSessionIds.length > 0) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const anyUnlocked = submitSessionIds.some(s => {
      if (!s || !s.scheduledDate) return true;
      const sessionDay = new Date(s.scheduledDate);
      sessionDay.setHours(0, 0, 0, 0);
      return sessionDay <= todayStart;
    });
    if (!anyUnlocked) {
      throw new ForbiddenError('This task is not yet available', 'TASK_LOCKED');
    }
  }

  // Verify student is in at least one of the task's groups
  const taskGroupIds = task.groupIds && task.groupIds.length > 0 ? task.groupIds : [task.groupId];
  const groups = await Group.find({ _id: { $in: taskGroupIds } });
  if (groups.length === 0) {
    throw new NotFoundError('Group not found', 'GROUP_NOT_FOUND');
  }

  const isStudent = groups.some(group =>
    group.students.some(id => id.toString() === studentId.toString())
  );

  if (!isStudent) {
    throw new ForbiddenError('You are not a member of this group', 'NOT_GROUP_MEMBER');
  }

  // Validate task is open (draft tasks are not visible/submittable by students)
  if (task.status === 'draft') {
    throw new NotFoundError('Task not found', 'TASK_NOT_FOUND');
  }
  if (task.status !== 'open') {
    throw new BadRequestError('Task is closed', 'TASK_CLOSED');
  }

  // Validate deadline
  const now = new Date();
  const isLate = now > task.deadline;
  if (isLate && !task.allowLateSubmission) {
    throw new BadRequestError('Task deadline has passed', 'DEADLINE_PASSED');
  }

  // Validate answers
  if (!task.hasQuestions || !task.questions || task.questions.length === 0) {
    throw new BadRequestError('Task has no questions', 'NO_QUESTIONS');
  }

  // Validate all required questions are answered
  const requiredQuestions = task.questions.filter(q => q.required);
  const answeredQuestionIds = answers.map(a => a.questionId?.toString());
  
  for (const question of requiredQuestions) {
    if (!answeredQuestionIds.includes(question._id.toString())) {
      throw new BadRequestError(`Required question ${question.order + 1} is not answered`, 'MISSING_REQUIRED_ANSWER');
    }
  }

  // Process each answer
  const processedAnswers = [];
  let fileIndex = 0;

  for (const answer of answers) {
    const question = task.questions.id(answer.questionId);
    if (!question) {
      throw new BadRequestError(`Question ${answer.questionId} not found in task`, 'QUESTION_NOT_FOUND');
    }

    // Validate answerType matches
    if (answer.answerType !== question.answerType) {
      throw new BadRequestError(`Answer type mismatch for question ${question.order + 1}`, 'ANSWER_TYPE_MISMATCH');
    }

    const processedAnswer = {
      questionId: question._id,
      answerType: question.answerType
    };

    // Process based on answer type
    if (question.answerType === 'mcq') {
      // Validate selectedAnswers
      if (!answer.selectedAnswers || !Array.isArray(answer.selectedAnswers)) {
        throw new BadRequestError(`Invalid MCQ answer for question ${question.order + 1}`, 'INVALID_MCQ_ANSWER');
      }

      // Validate indices are valid
      for (const index of answer.selectedAnswers) {
        if (index < 0 || index >= question.options.length) {
          throw new BadRequestError(`Invalid option index for question ${question.order + 1}`, 'INVALID_OPTION_INDEX');
        }
      }

      // Validate single_choice has only one answer
      if (question.type === 'single_choice' && answer.selectedAnswers.length > 1) {
        throw new BadRequestError(`Single choice question ${question.order + 1} can only have one answer`, 'SINGLE_CHOICE_MULTIPLE_ANSWERS');
      }

      processedAnswer.selectedAnswers = answer.selectedAnswers;
    } else if (question.answerType === 'text') {
      // Validate textAnswer
      if (!answer.textAnswer || typeof answer.textAnswer !== 'string') {
        throw new BadRequestError(`Invalid text answer for question ${question.order + 1}`, 'INVALID_TEXT_ANSWER');
      }

      // Validate maxLength if specified
      if (question.maxLength && answer.textAnswer.length > question.maxLength) {
        throw new BadRequestError(`Text answer for question ${question.order + 1} exceeds maximum length of ${question.maxLength}`, 'TEXT_ANSWER_TOO_LONG');
      }

      processedAnswer.textAnswer = answer.textAnswer.trim();
    } else if (question.answerType === 'image') {
      // Validate imageFileIndices
      if (!answer.imageFileIndices || !Array.isArray(answer.imageFileIndices)) {
        throw new BadRequestError(`Invalid image answer for question ${question.order + 1}`, 'INVALID_IMAGE_ANSWER');
      }

      // Validate count
      if (answer.imageFileIndices.length > question.maxImages) {
        throw new BadRequestError(`Question ${question.order + 1} allows maximum ${question.maxImages} image(s)`, 'TOO_MANY_IMAGES');
      }

      // Upload images to Cloudinary
      const imageAnswers = [];
      for (const fileIdx of answer.imageFileIndices) {
        if (fileIdx < 0 || fileIdx >= imageFiles.length) {
          throw new BadRequestError(`Invalid file index ${fileIdx} for question ${question.order + 1}`, 'INVALID_FILE_INDEX');
        }

        const file = imageFiles[fileIdx];

        // Validate file type
        if (!file.mimetype.startsWith('image/')) {
          throw new BadRequestError(`File ${fileIdx} is not an image`, 'INVALID_FILE_TYPE');
        }

        // Validate allowed image types if specified
        if (question.allowedImageTypes && question.allowedImageTypes.length > 0) {
          if (!question.allowedImageTypes.includes(file.mimetype)) {
            throw new BadRequestError(`Image type ${file.mimetype} is not allowed for question ${question.order + 1}`, 'IMAGE_TYPE_NOT_ALLOWED');
          }
        }

        // Validate file size if specified
        if (question.maxImageSize) {
          const fileSizeMB = file.size / (1024 * 1024);
          if (fileSizeMB > question.maxImageSize) {
            throw new BadRequestError(`Image ${fileIdx} exceeds maximum size of ${question.maxImageSize}MB`, 'IMAGE_TOO_LARGE');
          }
        }

        // Upload to Cloudinary
        const folder = `robotric/tasks/${taskId}/submissions/${studentId}/questions/${question._id}`;
        const uploadResult = await uploadImage(file.buffer, folder);

        imageAnswers.push({
          cloudinaryUrl: uploadResult.secure_url,
          cloudinaryPublicId: uploadResult.public_id,
          filename: file.originalname,
          size: file.size,
          mimeType: file.mimetype
        });
      }

      processedAnswer.imageAnswers = imageAnswers;
    }

    processedAnswers.push(processedAnswer);
  }

  // Auto-grade MCQ questions
  let autoScore = 0;
  const hasNonMcqQuestions = task.questions.some(q => q.answerType !== 'mcq');

  for (const answer of processedAnswers) {
    if (answer.answerType !== 'mcq') continue;

    const question = task.questions.id(answer.questionId);
    if (!question || !question.correctAnswers || question.correctAnswers.length === 0) continue;

    const selected = answer.selectedAnswers || [];
    const correct = question.correctAnswers.map(Number);

    const isFullyCorrect =
      selected.length === correct.length &&
      correct.every(idx => selected.includes(idx));

    if (isFullyCorrect) {
      autoScore += question.points;
    }
  }

  const submissionStatus = hasNonMcqQuestions ? 'pending_review' : 'graded';

  // Upload archive files to Supabase
  const attachedFiles = [];
  for (const f of archiveFiles) {
    const { storagePath, bucket } = await uploadArchiveToSupabase(f, taskId, studentId);
    attachedFiles.push({
      filename: f.originalname,
      originalName: f.originalname,
      size: f.size,
      mimeType: f.mimetype,
      storagePath,
      storageBucket: bucket,
    });
  }

  // Create or update submission
  let submission = await TaskSubmission.findOne({
    taskId: task._id,
    studentId: studentId
  });

  if (submission) {
    submission.answers = processedAnswers;
    submission.attachedFiles = attachedFiles;
    submission.submittedAt = now;
    submission.isLate = isLate;
    submission.status = submissionStatus;
    submission.score = autoScore;
    if (!hasNonMcqQuestions) {
      submission.gradedAt = now;
    }
    await submission.save();
  } else {
    submission = await TaskSubmission.create({
      taskId: task._id,
      studentId: studentId,
      answers: processedAnswers,
      attachedFiles,
      submittedAt: now,
      isLate: isLate,
      status: submissionStatus,
      score: autoScore,
      ...(hasNonMcqQuestions ? {} : { gradedAt: now }),
    });
  }

  logger.info('Task submitted', {
    taskId: task._id,
    studentId: studentId,
    submissionId: submission._id,
    isLate
  });

  res.status(201).json({
    success: true,
    message: 'Task submitted successfully',
    data: submission
  });
});
