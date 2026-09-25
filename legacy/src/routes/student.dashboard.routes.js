const express = require('express');
const router = express.Router();
const { protect: authenticate } = require('../middleware/auth');
const {
  getDashboardStats,
  getRecentActivity,
  getUpcomingDeadlines,
  getProgressOverview
} = require('../controllers/student.dashboard.controller');

// All routes require authentication
router.use(authenticate);

// @route   GET /api/student/dashboard/stats
router.get('/stats', getDashboardStats);

// @route   GET /api/student/dashboard/recent-activity
router.get('/recent-activity', getRecentActivity);

// @route   GET /api/student/dashboard/upcoming-deadlines
router.get('/upcoming-deadlines', getUpcomingDeadlines);

// @route   GET /api/student/dashboard/progress
router.get('/progress', getProgressOverview);

module.exports = router;
