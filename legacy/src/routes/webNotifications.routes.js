/**
 * Web Notifications Routes
 *
 * API routes for in-app web notifications
 */

const express = require('express');
const router = express.Router();
const { protect: authenticate } = require('../middleware/auth');
const {
  getNotifications,
  getUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  deleteAllReadNotifications
} = require('../controllers/webNotifications.controller');

// All routes require authentication
router.use(authenticate);

// @route   GET /api/web-notifications
router.get('/', getNotifications);

// @route   GET /api/web-notifications/unread-count
router.get('/unread-count', getUnreadCount);

// Static routes MUST come before parameterized routes to avoid /:id matching "read-all"
// @route   PUT /api/web-notifications/read-all
router.put('/read-all', markAllNotificationsAsRead);

// @route   PUT /api/web-notifications/:id/read
router.put('/:id/read', markNotificationAsRead);

// @route   DELETE /api/web-notifications/:id
router.delete('/:id', deleteNotification);

// @route   DELETE /api/web-notifications
router.delete('/', deleteAllReadNotifications);

module.exports = router;
