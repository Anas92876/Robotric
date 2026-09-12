/**
 * Trainer Dashboard Routes
 *
 * Routes for trainer dashboard operations including:
 * - Dashboard statistics
 * - Today's schedule
 * - Recent activities
 * - Notifications
 * - Overview analytics
 */

const express = require('express');
const router = express.Router();
const { protect: authenticate } = require('../middleware/auth');
const {
  getDashboardStats,
  getTodaysSchedule,
  getRecentActivities,
  getNotifications,
  getOverview
} = require('../controllers/trainer.dashboard.controller');

// All routes require authentication
router.use(authenticate);

// @route   GET /api/trainer/dashboard/stats
// @desc    Get dashboard statistics
// @access  Private (Trainer)
router.get('/stats', getDashboardStats);

// @route   GET /api/trainer/dashboard/schedule
// @desc    Get today's schedule
// @access  Private (Trainer)
router.get('/schedule', getTodaysSchedule);

// @route   GET /api/trainer/dashboard/activities
// @desc    Get recent activities
// @access  Private (Trainer)
router.get('/activities', getRecentActivities);

// @route   GET /api/trainer/dashboard/notifications
// @desc    Get notifications
// @access  Private (Trainer)
router.get('/notifications', getNotifications);

// @route   GET /api/trainer/dashboard/overview
// @desc    Get overview analytics
// @access  Private (Trainer)
router.get('/overview', getOverview);

module.exports = router;
