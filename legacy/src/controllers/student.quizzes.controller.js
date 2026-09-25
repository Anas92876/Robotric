const asyncHandler = require('../utils/asyncHandler');
const { AppError } = require('../utils/errors');
const logger = require('../utils/logger');
const Quiz = require('../models/Quiz');
const QuizAttempt = require('../models/QuizAttempt');
const Enrollment = require('../models/Enrollment');

// @desc    Get quiz details (without answers)
// @route   GET /api/student/quizzes/:quizId
// @access  Private (Student)
exports.getQuiz = asyncHandler(async (req, res) => {
  const { quizId } = req.params;
  const studentId = req.user._id;

  const quiz = await Quiz.findById(quizId).populate('module', 'title order');

  if (!quiz || !quiz.isActive) {
    throw new AppError('Quiz not found', 404);
  }

  // Check enrollment
  const enrollment = await Enrollment.findOne({
    student: studentId,
    course: quiz.course,
    status: { $in: ['active', 'completed'] }
  });

  if (!enrollment) {
    throw new AppError('You are not enrolled in this course', 403);
  }

  // Remove correct answers from response
  const quizData = quiz.toObject();
  quizData.questions = quizData.questions.map(q => ({
    _id: q._id,
    question: q.question,
    type: q.type,
    points: q.points,
    options: q.options.map((opt, idx) => ({
      index: idx,
      text: opt.text
    }))
  }));

  // Get attempt count
  const attemptCount = await QuizAttempt.getAttemptCount(studentId, quizId);
  const canAttempt = attemptCount < quiz.maxAttempts;

  res.json({
    success: true,
    data: quizData
  });
});

// @desc    Start a quiz attempt
// @route   POST /api/student/quizzes/:quizId/start
// @access  Private (Student)
exports.startQuizAttempt = asyncHandler(async (req, res) => {
  const { quizId } = req.params;
  const studentId = req.user._id;

  const quiz = await Quiz.findById(quizId);

  if (!quiz || !quiz.isActive) {
    throw new AppError('Quiz not found', 404);
  }

  // Check enrollment
  const enrollment = await Enrollment.findOne({
    student: studentId,
    course: quiz.course,
    status: 'active'
  });

  if (!enrollment) {
    throw new AppError('You are not enrolled in this course', 403);
  }

  // Check if max attempts reached
  const attemptCount = await QuizAttempt.getAttemptCount(studentId, quizId);
  if (attemptCount >= quiz.maxAttempts) {
    throw new AppError('Maximum attempts reached for this quiz', 400);
  }

  // Check for existing in-progress attempt
  const existingAttempt = await QuizAttempt.findOne({
    student: studentId,
    quiz: quizId,
    status: 'in_progress'
  });

  if (existingAttempt) {
    return res.json({
      success: true,
      message: 'Quiz attempt already in progress',
      data: {
        attemptId: existingAttempt._id,
        attempt: existingAttempt
      }
    });
  }

  // Create new attempt
  const attempt = await QuizAttempt.create({
    student: studentId,
    quiz: quizId,
    course: quiz.course,
    attemptNumber: attemptCount + 1,
    answers: [],
    status: 'in_progress',
    startedAt: new Date()
  });

  logger.info('Quiz attempt started', {
    studentId,
    quizId,
    attemptNumber: attempt.attemptNumber
  });

  res.status(201).json({
    success: true,
    message: 'Quiz attempt started',
    data: {
      attemptId: attempt._id,
      attempt: attempt
    }
  });
});

// @desc    Submit quiz answers
// @route   POST /api/student/quizzes/:quizId/submit
// @access  Private (Student)
exports.submitQuiz = asyncHandler(async (req, res) => {
  const { quizId } = req.params;
  const studentId = req.user._id;
  const { attemptId, answers } = req.body; // answers: [{ questionId, selectedOptions: [0, 1, ...] }]

  if (!attemptId || !answers) {
    throw new AppError('Attempt ID and answers are required', 400);
  }

  const quiz = await Quiz.findById(quizId);
  if (!quiz) {
    throw new AppError('Quiz not found', 404);
  }

  const attempt = await QuizAttempt.findOne({
    _id: attemptId,
    student: studentId,
    quiz: quizId,
    status: 'in_progress'
  });

  if (!attempt) {
    throw new AppError('Quiz attempt not found or already submitted', 404);
  }

  // Process answers and calculate score
  let totalPoints = 0;
  let earnedPoints = 0;

  const processedAnswers = answers.map(answer => {
    const question = quiz.questions.id(answer.questionId);
    if (!question) {
      return null;
    }

    totalPoints += question.points;

    // Check if answer is correct
    let isCorrect = false;
    const correctIndices = question.options
      .map((opt, idx) => (opt.isCorrect ? idx : null))
      .filter(idx => idx !== null);

    const selectedSet = new Set(answer.selectedOptions);
    const correctSet = new Set(correctIndices);

    // For single choice: exactly one correct answer selected
    // For multiple choice: all correct answers selected, no incorrect ones
    if (question.type === 'single') {
      isCorrect = selectedSet.size === 1 && correctSet.has([...selectedSet][0]);
    } else {
      isCorrect = selectedSet.size === correctSet.size &&
        [...selectedSet].every(idx => correctSet.has(idx));
    }

    if (isCorrect) {
      earnedPoints += question.points;
    }

    return {
      questionId: answer.questionId,
      questionText: question.question,
      selectedOptions: answer.selectedOptions,
      isCorrect,
      pointsEarned: isCorrect ? question.points : 0
    };
  }).filter(a => a !== null);

  // Update attempt
  attempt.answers = processedAnswers;
  attempt.totalPoints = totalPoints;
  attempt.earnedPoints = earnedPoints;
  attempt.calculateScore();
  attempt.checkPassed(quiz.passingScore);
  attempt.markAsSubmitted();

  await attempt.save();

  logger.info('Quiz submitted', {
    studentId,
    quizId,
    attemptId,
    score: attempt.score,
    passed: attempt.passed
  });

  // Return results with correct answers if feedback is enabled
  let detailedResults = null;
  if (quiz.showFeedback) {
    detailedResults = attempt.answers.map(answer => {
      const question = quiz.questions.id(answer.questionId);
      return {
        question: answer.questionText,
        selectedOptions: answer.selectedOptions,
        correctOptions: question.options
          .map((opt, idx) => (opt.isCorrect ? idx : null))
          .filter(idx => idx !== null),
        isCorrect: answer.isCorrect,
        pointsEarned: answer.pointsEarned,
        explanation: question.explanation
      };
    });
  }

  res.json({
    success: true,
    message: attempt.passed ? 'Congratulations! You passed the quiz!' : 'Quiz completed. Keep trying!',
    data: {
      score: attempt.score,
      earnedPoints: attempt.earnedPoints,
      totalPoints: attempt.totalPoints,
      passed: attempt.passed,
      timeSpent: attempt.timeSpent,
      attemptId: attempt._id,
      attemptNumber: attempt.attemptNumber,
      detailedResults
    }
  });
});

// @desc    Get quiz attempt history
// @route   GET /api/student/quizzes/:quizId/attempts
// @access  Private (Student)
exports.getQuizAttempts = asyncHandler(async (req, res) => {
  const { quizId } = req.params;
  const studentId = req.user._id;

  const attempts = await QuizAttempt.find({
    student: studentId,
    quiz: quizId,
    status: 'submitted'
  })
    .select('attemptNumber score earnedPoints totalPoints passed submittedAt timeSpent')
    .sort({ attemptNumber: -1 });

  // Get best score
  const bestScore = await QuizAttempt.getBestScore(studentId, quizId);

  res.json({
    success: true,
    count: attempts.length,
    bestScore,
    data: attempts
  });
});

// @desc    Get specific quiz attempt results
// @route   GET /api/student/quizzes/:quizId/results/:attemptId
// @access  Private (Student)
exports.getQuizResults = asyncHandler(async (req, res) => {
  const { quizId, attemptId } = req.params;
  const studentId = req.user._id;

  const attempt = await QuizAttempt.findOne({
    _id: attemptId,
    student: studentId,
    quiz: quizId,
    status: 'submitted'
  }).populate('quiz');

  if (!attempt) {
    throw new AppError('Quiz attempt not found', 404);
  }

  const quiz = await Quiz.findById(quizId);

  // Build detailed results if feedback is enabled
  let detailedResults = null;
  if (quiz.showFeedback) {
    detailedResults = attempt.answers.map(answer => {
      const question = quiz.questions.id(answer.questionId);
      return {
        question: answer.questionText,
        selectedOptions: answer.selectedOptions,
        correctOptions: question.options
          .map((opt, idx) => (opt.isCorrect ? idx : null))
          .filter(idx => idx !== null),
        isCorrect: answer.isCorrect,
        pointsEarned: answer.pointsEarned,
        explanation: question.explanation,
        allOptions: question.options.map((opt, idx) => ({
          index: idx,
          text: opt.text,
          isCorrect: opt.isCorrect
        }))
      };
    });
  }

  res.json({
    success: true,
    data: {
      attempt: {
        _id: attempt._id,
        attemptNumber: attempt.attemptNumber,
        score: attempt.score,
        earnedPoints: attempt.earnedPoints,
        totalPoints: attempt.totalPoints,
        passed: attempt.passed,
        timeSpent: attempt.timeSpent,
        submittedAt: attempt.submittedAt
      },
      quiz: {
        title: quiz.title,
        passingScore: quiz.passingScore,
        totalQuestions: quiz.questions.length
      },
      detailedResults
    }
  });
});

module.exports = exports;
