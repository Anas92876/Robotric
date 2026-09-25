/**
 * Notifications Socket Handlers
 *
 * Real-time notification functionality using Socket.IO
 * Handles user notification rooms and real-time updates
 */

const logger = require('../utils/logger');
const { getUnreadCount } = require('../services/webNotification.service');

module.exports = (io) => {
  console.log('\n🔔 [NOTIFICATIONS SOCKET] Notification socket handlers loaded');

  io.on('connection', (socket) => {
    const userId = socket.userId;

    if (!userId) {
      console.warn('⚠️ [NOTIFICATIONS SOCKET] Socket connection without userId');
      return;
    }

    console.log(`✅ [NOTIFICATIONS SOCKET] User ${userId} connected for notifications`);

    // Join user's notification room
    const userRoom = `user:${userId}`;
    socket.join(userRoom);
    console.log(`📥 [NOTIFICATIONS SOCKET] User ${userId} joined room: ${userRoom}`);

    // Send initial unread count on connection
    getUnreadCount(userId)
      .then(count => {
        socket.emit('notification:count', { unreadCount: count });
      })
      .catch(error => {
        logger.logError(error, {
          context: 'notifications_socket_initial_count',
          userId: userId.toString()
        });
      });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`👋 [NOTIFICATIONS SOCKET] User ${userId} disconnected from notifications`);
    });

    // Handle errors
    socket.on('error', (error) => {
      logger.logError(error, {
        context: 'notifications_socket_error',
        userId: userId.toString(),
        socketId: socket.id
      });
    });
  });

  console.log('✅ [NOTIFICATIONS SOCKET] Notification socket handlers initialized\n');
};
