/**
 * Chat Routes
 * 
 * REST API routes for chat functionality
 */

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getChatByGroup,
  getChatMessages,
  getMyChats,
  deleteMessage
} = require('../controllers/chat.controller');
const {
  getOrCreatePrivateChat,
  getPrivateChatMessages,
  getMyPrivateChats,
  deletePrivateMessage,
  getAvailableCLOs,
  getAvailableStudents
} = require('../controllers/privateChat.controller');

// All routes require authentication
router.use(protect);

// Health check route (for debugging)
router.get('/health', (req, res) => {
  res.json({ success: true, message: 'Chat routes are working', timestamp: new Date().toISOString() });
});

// Get user's chats
router.get('/my-chats', (req, res, next) => {
  console.log('📥 [CHAT ROUTES] GET /my-chats hit');
  console.log('👤 User:', req.user?._id || req.user?.id);
  console.log('👥 Role:', req.user?.role);
  next();
}, getMyChats);

// Group chat endpoints
router.get('/groups/:groupId', getChatByGroup);
router.get('/groups/:groupId/messages', getChatMessages);
router.delete('/groups/:groupId/messages/:messageId', deleteMessage);

// Private chat endpoints
// IMPORTANT: Place specific routes BEFORE parameterized routes to avoid conflicts
router.get('/private/available-clos', getAvailableCLOs);
router.get('/private/available-students', getAvailableStudents);
router.get('/private/my-chats', getMyPrivateChats);
router.get('/private/:otherUserId', getOrCreatePrivateChat);
router.get('/private/:chatId/messages', getPrivateChatMessages);
router.delete('/private/:chatId/messages/:messageId', deletePrivateMessage);

module.exports = router;
