const express = require('express');
const router = express.Router();
const { protect, requireTrainer } = require('../middleware/auth');
const {
  getAllQuizzes,
  getQuizById,
  createQuiz,
  updateQuiz,
  deleteQuiz,
  getCourseQuizzes,
  duplicateQuiz
} = require('../controllers/trainer.quizzes.controller');

// All routes require authentication and trainer role
router.use(protect);
router.use(requireTrainer);

// @route   GET /api/trainer/quizzes
// @desc    Get all quizzes created by trainer
// @access  Private (Trainer)
router.get('/', getAllQuizzes);

// @route   GET /api/trainer/quizzes/course/:courseId
// @desc    Get all quizzes for a specific course
// @access  Private (Trainer)
router.get('/course/:courseId', getCourseQuizzes);

// @route   POST /api/trainer/quizzes
// @desc    Create a new quiz
// @access  Private (Trainer)
router.post('/', createQuiz);

// @route   GET /api/trainer/quizzes/:id
// @desc    Get quiz by ID
// @access  Private (Trainer)
router.get('/:id', getQuizById);

// @route   PUT /api/trainer/quizzes/:id
// @desc    Update quiz
// @access  Private (Trainer)
router.put('/:id', updateQuiz);

// @route   DELETE /api/trainer/quizzes/:id
// @desc    Delete quiz
// @access  Private (Trainer)
router.delete('/:id', deleteQuiz);

// @route   POST /api/trainer/quizzes/:id/duplicate
// @desc    Duplicate an existing quiz
// @access  Private (Trainer)
router.post('/:id/duplicate', duplicateQuiz);

module.exports = router;
