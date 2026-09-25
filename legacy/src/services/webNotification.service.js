/**
 * Web Notification Service
 *
 * Handles creating, managing, and emitting in-app notifications for web users
 * Integrates with Socket.io for real-time notifications
 */

const Notification = require('../models/Notification');
const logger = require('../utils/logger');

// Socket.io instance (set via setIo method)
let io = null;

/**
 * Set Socket.io instance for emitting real-time notifications
 * @param {Server} socketIo - Socket.io server instance
 */
function setIo(socketIo) {
  io = socketIo;
}

/**
 * Get Socket.io instance (for use in controllers)
 * @returns {Server|null} Socket.io instance
 */
function getIo() {
  return io;
}

/**
 * Create a notification and save it to database
 * @param {string|ObjectId} userId - User ID
 * @param {string} type - Notification type
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {Object} data - Additional data (optional)
 * @param {Object} options - Additional options (isImportant, actionUrl, actionLabel)
 * @returns {Promise<Object>} Created notification
 */
async function createNotification(userId, type, title, message, data = {}, options = {}) {
  try {
    const notification = await Notification.create({
      userId,
      type,
      title,
      message,
      data,
      isImportant: options.isImportant || false,
      actionUrl: options.actionUrl,
      actionLabel: options.actionLabel
    });

    logger.info('Notification created', {
      notificationId: notification._id,
      userId: userId.toString(),
      type,
      title
    });

    return notification;
  } catch (error) {
    logger.logError(error, {
      context: 'create_notification_error',
      userId: userId.toString(),
      type,
      title
    });
    throw error;
  }
}

/**
 * Create a notification and emit it via Socket.io
 * @param {string|ObjectId} userId - User ID
 * @param {string} type - Notification type
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {Object} data - Additional data (optional)
 * @param {Object} options - Additional options (isImportant, actionUrl, actionLabel)
 * @returns {Promise<Object>} Created notification
 */
async function createAndEmitNotification(userId, type, title, message, data = {}, options = {}) {
  try {
    // Create notification in database
    const notification = await createNotification(userId, type, title, message, data, options);

    // Emit real-time notification via Socket.io
    if (io) {
      // Emit to user's notification room
      io.to(`user:${userId}`).emit('notification:new', {
        notification: {
          _id: notification._id,
          userId: notification.userId,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          data: notification.data,
          isRead: notification.isRead,
          isImportant: notification.isImportant,
          actionUrl: notification.actionUrl,
          actionLabel: notification.actionLabel,
          createdAt: notification.createdAt
        }
      });

      // Also emit unread count update
      const unreadCount = await getUnreadCount(userId);
      io.to(`user:${userId}`).emit('notification:count', { unreadCount });

      logger.info('Notification emitted via Socket.io', {
        notificationId: notification._id,
        userId: userId.toString()
      });
    } else {
      logger.warn('Socket.io not initialized, notification created but not emitted', {
        notificationId: notification._id,
        userId: userId.toString()
      });
    }

    return notification;
  } catch (error) {
    logger.logError(error, {
      context: 'create_and_emit_notification_error',
      userId: userId.toString(),
      type,
      title
    });
    throw error;
  }
}

/**
 * Mark notification as read
 * @param {string|ObjectId} notificationId - Notification ID
 * @param {string|ObjectId} userId - User ID (for security)
 * @returns {Promise<Object>} Updated notification
 */
async function markAsRead(notificationId, userId) {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, userId },
      { isRead: true, readAt: new Date() },
      { new: true }
    );

    if (!notification) {
      throw new Error('Notification not found or access denied');
    }

    // Emit read event via Socket.io
    if (io) {
      io.to(`user:${userId}`).emit('notification:read', {
        notificationId: notification._id
      });

      // Update unread count
      const unreadCount = await getUnreadCount(userId);
      io.to(`user:${userId}`).emit('notification:count', { unreadCount });
    }

    logger.info('Notification marked as read', {
      notificationId: notification._id,
      userId: userId.toString()
    });

    return notification;
  } catch (error) {
    logger.logError(error, {
      context: 'mark_notification_read_error',
      notificationId: notificationId.toString(),
      userId: userId.toString()
    });
    throw error;
  }
}

/**
 * Mark all user notifications as read
 * @param {string|ObjectId} userId - User ID
 * @returns {Promise<Object>} Update result
 */
async function markAllAsRead(userId) {
  try {
    const result = await Notification.updateMany(
      { userId, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    // Emit read all event via Socket.io
    if (io) {
      io.to(`user:${userId}`).emit('notification:read-all', {});
      io.to(`user:${userId}`).emit('notification:count', { unreadCount: 0 });
    }

    logger.info('All notifications marked as read', {
      userId: userId.toString(),
      updatedCount: result.modifiedCount
    });

    return result;
  } catch (error) {
    logger.logError(error, {
      context: 'mark_all_notifications_read_error',
      userId: userId.toString()
    });
    throw error;
  }
}

/**
 * Delete a notification
 * @param {string|ObjectId} notificationId - Notification ID
 * @param {string|ObjectId} userId - User ID (for security)
 * @returns {Promise<Object>} Deletion result
 */
async function deleteNotification(notificationId, userId) {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: notificationId,
      userId
    });

    if (!notification) {
      throw new Error('Notification not found or access denied');
    }

    // Emit delete event via Socket.io
    if (io) {
      io.to(`user:${userId}`).emit('notification:deleted', {
        notificationId: notification._id
      });

      // Update unread count
      const unreadCount = await getUnreadCount(userId);
      io.to(`user:${userId}`).emit('notification:count', { unreadCount });
    }

    logger.info('Notification deleted', {
      notificationId: notification._id,
      userId: userId.toString()
    });

    return { success: true };
  } catch (error) {
    logger.logError(error, {
      context: 'delete_notification_error',
      notificationId: notificationId.toString(),
      userId: userId.toString()
    });
    throw error;
  }
}

/**
 * Get user notifications with filters and pagination
 * @param {string|ObjectId} userId - User ID
 * @param {Object} filters - Filter options (type, isRead, limit, page)
 * @returns {Promise<Object>} Notifications and pagination info
 */
async function getUserNotifications(userId, filters = {}) {
  try {
    const {
      type,
      isRead,
      isImportant,
      since,
      limit = 20,
      page = 1,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = filters;

    // Build query
    const query = { userId };

    if (type) {
      query.type = type;
    }

    if (isRead !== undefined) {
      query.isRead = isRead;
    }

    if (isImportant !== undefined) {
      query.isImportant = isImportant;
    }

    // Filter by timestamp — fetch notifications created after a specific date
    if (since) {
      const sinceDate = new Date(since);
      if (!isNaN(sinceDate.getTime())) {
        query.createdAt = { $gt: sinceDate };
      }
    }

    // Calculate pagination
    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    // Execute query
    const [notifications, total] = await Promise.all([
      Notification.find(query)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Notification.countDocuments(query)
    ]);

    return {
      notifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    logger.logError(error, {
      context: 'get_user_notifications_error',
      userId: userId.toString(),
      filters
    });
    throw error;
  }
}

/**
 * Get unread notification count for user
 * @param {string|ObjectId} userId - User ID
 * @returns {Promise<number>} Unread count
 */
async function getUnreadCount(userId) {
  try {
    const count = await Notification.countDocuments({
      userId,
      isRead: false
    });

    return count;
  } catch (error) {
    logger.logError(error, {
      context: 'get_unread_count_error',
      userId: userId.toString()
    });
    throw error;
  }
}

module.exports = {
  setIo,
  getIo,
  createNotification,
  createAndEmitNotification,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getUserNotifications,
  getUnreadCount
};
