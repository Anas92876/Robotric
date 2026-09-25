/**
 * Web Notifications Controller
 *
 * Handles HTTP requests for in-app notifications
 */

const asyncHandler = require('../utils/asyncHandler');
const { AppError, NotFoundError } = require('../utils/errors');
const logger = require('../utils/logger');
const {
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification
} = require('../services/webNotification.service');

/**
 * @route   GET /api/notifications
 * @desc    Get user's notifications with filters and pagination
 * @access  Private
 */
exports.getNotifications = asyncHandler(async (req, res) => {
  const userId = req.user._id || req.user.id;
  const {
    type,
    isRead,
    isImportant,
    since,
    limit = 20,
    page = 1,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  // Validate query parameters
  if (type && !['enrollment', 'payment', 'evaluation', 'session', 'assignment', 'system'].includes(type)) {
    throw new AppError('Invalid notification type', 400);
  }

  if (isRead !== undefined && isRead !== 'true' && isRead !== 'false') {
    throw new AppError('isRead must be true or false', 400);
  }

  const filters = {
    type,
    isRead: isRead === 'true' ? true : isRead === 'false' ? false : undefined,
    isImportant: isImportant === 'true' ? true : isImportant === 'false' ? false : undefined,
    since,
    limit: parseInt(limit),
    page: parseInt(page),
    sortBy,
    sortOrder
  };

  const result = await getUserNotifications(userId, filters);

  res.json({
    success: true,
    data: result.notifications,
    pagination: result.pagination
  });
});

/**
 * @route   GET /api/notifications/unread-count
 * @desc    Get unread notification count
 * @access  Private
 */
exports.getUnreadCount = asyncHandler(async (req, res) => {
  const userId = req.user._id || req.user.id;
  const count = await getUnreadCount(userId);

  res.json({
    success: true,
    data: { unreadCount: count }
  });
});

/**
 * @route   PUT /api/notifications/:id/read
 * @desc    Mark notification as read
 * @access  Private
 */
exports.markNotificationAsRead = asyncHandler(async (req, res) => {
  const userId = req.user._id || req.user.id;
  const { id } = req.params;

  const notification = await markAsRead(id, userId);

  res.json({
    success: true,
    message: 'Notification marked as read',
    data: notification
  });
});

/**
 * @route   PUT /api/notifications/read-all
 * @desc    Mark all notifications as read
 * @access  Private
 */
exports.markAllNotificationsAsRead = asyncHandler(async (req, res) => {
  const userId = req.user._id || req.user.id;

  const result = await markAllAsRead(userId);

  res.json({
    success: true,
    message: 'All notifications marked as read',
    data: {
      updatedCount: result.modifiedCount
    }
  });
});

/**
 * @route   DELETE /api/notifications/:id
 * @desc    Delete a notification
 * @access  Private
 */
exports.deleteNotification = asyncHandler(async (req, res) => {
  const userId = req.user._id || req.user.id;
  const { id } = req.params;

  await deleteNotification(id, userId);

  res.json({
    success: true,
    message: 'Notification deleted successfully'
  });
});

/**
 * @route   DELETE /api/notifications
 * @desc    Delete all read notifications
 * @access  Private
 */
exports.deleteAllReadNotifications = asyncHandler(async (req, res) => {
  const userId = req.user._id || req.user.id;
  const Notification = require('../models/Notification');

  const result = await Notification.deleteMany({
    userId,
    isRead: true
  });

  // Emit delete all event via Socket.io
  const { getIo } = require('../services/webNotification.service');
  const io = getIo();
  
  if (io) {
    io.to(`user:${userId}`).emit('notification:deleted-all', {});
    const unreadCount = await getUnreadCount(userId);
    io.to(`user:${userId}`).emit('notification:count', { unreadCount });
  }

  res.json({
    success: true,
    message: 'All read notifications deleted',
    data: {
      deletedCount: result.deletedCount
    }
  });
});
