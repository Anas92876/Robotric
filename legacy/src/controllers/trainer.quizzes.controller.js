const Quiz = require('../models/Quiz');
const Module = require('../models/Module');
const Course = require('../models/Course');
const Group = require('../models/Group');
const logger = require('../utils/logger');
const { sendNotificationToUsers, getUserIdsByGroup, getUserIdsByCourse } = require('../services/notification.service');

async function checkTrainerCourseAccess(courseId, trainerId) {
  const course = await Course.findById(courseId);
  if (!course) return { hasAccess: false, course: null };

  // Check if trainer is course instructor
  if (course.instructor && course.instructor.toString() === trainerId.toString()) {
    return { hasAccess: true, course };
  }

  // Check if trainer has groups for this course
  const hasGroups = await Group.exists({ courseId, trainerId });
  return { hasAccess: !!hasGroups, course };
}

/**
 * @desc    Get all quizzes created by trainer
 * @route   GET /api/trainer/quizzes
 * @access  Private (Trainer)
 */
exports.getAllQuizzes = async (req, res) => {
  try {
    const trainerId = req.user._id || req.user.id;

    // Find all courses where trainer is instructor
    const instructorCourses = await Course.find({ 'instructor': trainerId }).select('_id');
    const instructorCourseIds = instructorCourses.map(c => c._id);

    // Find all courses where trainer has groups
    const groups = await Group.find({ trainerId }).distinct('courseId');

    // Combine both sets of course IDs
    const allCourseIds = [...new Set([...instructorCourseIds.map(id => id.toString()), ...groups.map(id => id.toString())])];

    // Get all quizzes for those courses
    const quizzes = await Quiz.find({ course: { $in: allCourseIds } })
      .populate('course', 'title category')
      .populate('module', 'title order')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: quizzes.length,
      data: quizzes
    });
  } catch (error) {
    console.error('Error fetching quizzes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch quizzes',
    });
  }
};

/**
 * @desc    Get quizzes for a specific course
 * @route   GET /api/trainer/quizzes/course/:courseId
 * @access  Private (Trainer)
 */
exports.getCourseQuizzes = async (req, res) => {
  try {
    const { courseId } = req.params;
    const trainerId = req.user._id || req.user.id;

    // Verify trainer has access to this course
    const { hasAccess } = await checkTrainerCourseAccess(courseId, trainerId);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this course'
      });
    }

    const quizzes = await Quiz.find({ course: courseId })
      .populate('module', 'title order')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: quizzes.length,
      data: quizzes
    });
  } catch (error) {
    console.error('Error fetching course quizzes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch course quizzes',
    });
  }
};

/**
 * @desc    Get quiz by ID
 * @route   GET /api/trainer/quizzes/:id
 * @access  Private (Trainer)
 */
exports.getQuizById = async (req, res) => {
  try {
    const { id } = req.params;
    const trainerId = req.user._id || req.user.id;

    const quiz = await Quiz.findById(id)
      .populate('course', 'title category')
      .populate('module', 'title order');

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
    }

    // Verify trainer has access
    const { hasAccess } = await checkTrainerCourseAccess(quiz.course._id, trainerId);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this quiz'
      });
    }

    res.status(200).json({
      success: true,
      data: quiz
    });
  } catch (error) {
    console.error('Error fetching quiz:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch quiz',
    });
  }
};

/**
 * @desc    Create a new quiz
 * @route   POST /api/trainer/quizzes
 * @access  Private (Trainer)
 */
exports.createQuiz = async (req, res) => {
  try {
    const trainerId = req.user._id || req.user.id;
    const {
      courseId,
      moduleId,
      sessionId,
      groupId,
      title,
      description,
      instructions,
      passingScore,
      timeLimit,
      maxAttempts,
      shuffleQuestions,
      shuffleOptions,
      showFeedback,
      questions
    } = req.body;

    // Validate required fields
    if (!courseId || !title || !questions || questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Course ID, title, and at least one question are required'
      });
    }

    // Verify trainer has access to this course
    const { hasAccess, course } = await checkTrainerCourseAccess(courseId, trainerId);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this course'
      });
    }
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // If module ID provided, verify it exists
    let moduleToUse = moduleId;
    if (moduleId) {
      const module = await Module.findOne({ _id: moduleId, course: courseId });
      if (!module) {
        return res.status(404).json({
          success: false,
          message: 'Module not found'
        });
      }
    } else {
      // Create a default module for this quiz
      const newModule = await Module.create({
        course: courseId,
        title: `Quiz Module: ${title}`,
        description: `Module for quiz: ${title}`,
        order: 999, // Put at end
        type: 'quiz',
        content: {
          duration: timeLimit || null
        }
      });
      moduleToUse = newModule._id;
    }

    // Validate questions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question || !q.options || q.options.length < 2) {
        return res.status(400).json({
          success: false,
          message: `Question ${i + 1} must have text and at least 2 options`
        });
      }

      // Check if at least one option is marked as correct
      const hasCorrect = q.options.some(opt => opt.isCorrect);
      if (!hasCorrect) {
        return res.status(400).json({
          success: false,
          message: `Question ${i + 1} must have at least one correct answer`
        });
      }
    }

    // Create quiz
    const quiz = await Quiz.create({
      session: sessionId,
      module: moduleToUse,
      course: courseId,
      group: groupId,
      title,
      description,
      instructions,
      passingScore: passingScore || 70,
      timeLimit,
      maxAttempts: maxAttempts || 3,
      shuffleQuestions: shuffleQuestions || false,
      shuffleOptions: shuffleOptions || false,
      showFeedback: showFeedback !== undefined ? showFeedback : true,
      questions,
      status: 'published',
      createdBy: trainerId
    });

    const populatedQuiz = await Quiz.findById(quiz._id)
      .populate('course', 'title category')
      .populate('module', 'title order')
      .populate('session', 'title scheduledDate')
      .populate('group', 'name');

    // Send notifications to students
    try {
      let studentIds = [];
      
      // Determine target students: group-based or course-based
      if (groupId) {
        // Get students from group
        studentIds = await getUserIdsByGroup(groupId);
        logger.info(`Sending quiz notification to group ${groupId} (${studentIds.length} students)`);
      } else {
        // Get students enrolled in course
        studentIds = await getUserIdsByCourse(courseId);
        logger.info(`Sending quiz notification to course ${courseId} (${studentIds.length} students)`);
      }

      if (studentIds.length > 0) {
        const notificationBody = `${title} is now available`;
        
        await sendNotificationToUsers(
          studentIds,
          'New Quiz Available',
          notificationBody,
          {
            type: 'quiz',
            quizId: quiz._id.toString(),
            courseId: courseId.toString(),
            groupId: groupId ? groupId.toString() : null,
            screen: 'quiz'
          }
        );
        
        logger.info(`Quiz notifications sent to ${studentIds.length} students`, {
          quizId: quiz._id,
          studentCount: studentIds.length
        });
      }
    } catch (notificationError) {
      // Log but don't fail the request
      logger.error(`Failed to send quiz notifications: ${notificationError.message}`, {
        quizId: quiz._id,
        error: notificationError
      });
    }

    res.status(201).json({
      success: true,
      message: 'Quiz created successfully',
      data: populatedQuiz
    });
  } catch (error) {
    console.error('Error creating quiz:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create quiz',
    });
  }
};

/**
 * @desc    Update quiz
 * @route   PUT /api/trainer/quizzes/:id
 * @access  Private (Trainer)
 */
exports.updateQuiz = async (req, res) => {
  try {
    const { id } = req.params;
    const trainerId = req.user._id || req.user.id;

    const quiz = await Quiz.findById(id);
    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
    }

    // Verify trainer has access
    const { hasAccess } = await checkTrainerCourseAccess(quiz.course, trainerId);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this quiz'
      });
    }

    // Validate questions if provided
    if (req.body.questions) {
      for (let i = 0; i < req.body.questions.length; i++) {
        const q = req.body.questions[i];
        if (!q.question || !q.options || q.options.length < 2) {
          return res.status(400).json({
            success: false,
            message: `Question ${i + 1} must have text and at least 2 options`
          });
        }

        const hasCorrect = q.options.some(opt => opt.isCorrect);
        if (!hasCorrect) {
          return res.status(400).json({
            success: false,
            message: `Question ${i + 1} must have at least one correct answer`
          });
        }
      }
    }

    // Update quiz
    const updatedQuiz = await Quiz.findByIdAndUpdate(
      id,
      { ...req.body, updatedBy: trainerId },
      { new: true, runValidators: true }
    )
      .populate('course', 'title category')
      .populate('module', 'title order');

    res.status(200).json({
      success: true,
      message: 'Quiz updated successfully',
      data: updatedQuiz
    });
  } catch (error) {
    console.error('Error updating quiz:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update quiz',
    });
  }
};

/**
 * @desc    Delete quiz
 * @route   DELETE /api/trainer/quizzes/:id
 * @access  Private (Trainer)
 */
exports.deleteQuiz = async (req, res) => {
  try {
    const { id } = req.params;
    const trainerId = req.user._id || req.user.id;

    const quiz = await Quiz.findById(id);
    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
    }

    // Verify trainer has access
    const { hasAccess } = await checkTrainerCourseAccess(quiz.course, trainerId);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this quiz'
      });
    }

    await Quiz.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Quiz deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting quiz:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete quiz',
    });
  }
};

/**
 * @desc    Duplicate an existing quiz
 * @route   POST /api/trainer/quizzes/:id/duplicate
 * @access  Private (Trainer)
 */
exports.duplicateQuiz = async (req, res) => {
  try {
    const { id } = req.params;
    const trainerId = req.user._id || req.user.id;

    const quiz = await Quiz.findById(id);
    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
    }

    // Verify trainer has access
    const { hasAccess } = await checkTrainerCourseAccess(quiz.course, trainerId);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this quiz'
      });
    }

    // Create duplicate
    const quizData = quiz.toObject();
    delete quizData._id;
    delete quizData.createdAt;
    delete quizData.updatedAt;
    quizData.title = `${quizData.title} (Copy)`;
    quizData.createdBy = trainerId;

    const duplicatedQuiz = await Quiz.create(quizData);

    const populatedQuiz = await Quiz.findById(duplicatedQuiz._id)
      .populate('course', 'title category')
      .populate('module', 'title order');

    res.status(201).json({
      success: true,
      message: 'Quiz duplicated successfully',
      data: populatedQuiz
    });
  } catch (error) {
    console.error('Error duplicating quiz:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to duplicate quiz',
    });
  }
};
