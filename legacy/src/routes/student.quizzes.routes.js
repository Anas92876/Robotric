const express = require('express');
const router = express.Router();
const { protect: authenticate } = require('../middleware/auth');
const {
  getQuiz,
  startQuizAttempt,
  submitQuiz,
  getQuizAttempts,
  getQuizResults
} = require('../controllers/student.quizzes.controller');

// All routes require authentication
router.use(authenticate);

// @route   GET /api/student/quizzes/:quizId
router.get('/:quizId', getQuiz);

// @route   POST /api/student/quizzes/:quizId/start
router.post('/:quizId/start', startQuizAttempt);

// @route   POST /api/student/quizzes/:quizId/submit
router.post('/:quizId/submit', submitQuiz);

// @route   GET /api/student/quizzes/:quizId/attempts
router.get('/:quizId/attempts', getQuizAttempts);

// @route   GET /api/student/quizzes/:quizId/results/:attemptId
router.get('/:quizId/results/:attemptId', getQuizResults);

module.exports = router;
