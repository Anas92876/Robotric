const express = require('express');
const router = express.Router();
const { protect, requireTrainer } = require('../middleware/auth');
const {
  saveAttendance,
  getSessionAttendance,
  getTrainerAttendance
} = require('../controllers/trainer.attendance.controller');

// All routes require authentication and trainer role
router.use(protect);
router.use(requireTrainer);

// @route   POST /api/trainer/attendance
// @desc    Save/Update attendance for a session
router.post('/', saveAttendance);

// @route   GET /api/trainer/attendance
// @desc    Get all attendance records for trainer
router.get('/', getTrainerAttendance);

// @route   GET /api/trainer/attendance/session/:sessionId
// @desc    Get attendance for specific session
router.get('/session/:sessionId', getSessionAttendance);

module.exports = router;
