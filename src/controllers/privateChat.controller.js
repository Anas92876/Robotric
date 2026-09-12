/**
 * Private Chat Controller
 *
 * REST API endpoints for private chat functionality
 * Handles 1-on-1 chats between users (e.g., student-CLO)
 */

const PrivateChat = require('../models/PrivateChat');
const User = require('../models/User');
const Lead = require('../models/Lead');
const asyncHandler = require('../utils/asyncHandler');
const { NotFoundError, ForbiddenError, BadRequestError } = require('../utils/errors');
const {
  hasChatAccess,
  getOtherParticipant,
  calculateUnreadCount,
  getLastMessage
} = require('../utils/chatUtils');

/**
 * Helper: Get both English and Arabic names from Lead database
 * Returns: { name: 'English Name', nameAr: 'Arabic Name' }
 */
async function getNamesFromLead(user) {
  try {
    const lead = await Lead.findOne({
      $or: [
        { fullName: user.name },      // Match by Arabic name (for existing users)
        { englishName: user.name },   // Match by English name (for new users)
        { email: user.email }          // Match by email
      ]
    }).select('englishName fullName');

    if (!lead) {
      return { name: user.name, nameAr: null };
    }

    return {
      name: lead.englishName || lead.fullName || user.name,  // Prefer English, fallback to Arabic, then user.name
      nameAr: lead.fullName || null                          // Arabic name
    };
  } catch (error) {
    console.error('Error getting names from Lead:', error);
    return { name: user.name, nameAr: null };
  }
}

/**
 * Get or create private chat between current user and another user
 * GET /api/chats/private/:otherUserId
 */
exports.getOrCreatePrivateChat = asyncHandler(async (req, res) => {
  const { otherUserId } = req.params;
  const userId = req.user._id || req.user.id;
  const userRole = req.user.role;

  if (otherUserId === userId.toString()) {
    throw new BadRequestError('Cannot create chat with yourself');
  }

  // Verify other user exists
  const otherUser = await User.findById(otherUserId);
  if (!otherUser) {
    throw new NotFoundError('User not found');
  }

  // Authorization: Only allow student-CLO chats for now
  // Can be extended to other combinations
  const isStudent = userRole === 'student';
  const isCLO = userRole === 'clo';
  const otherIsStudent = otherUser.role === 'student';
  const otherIsCLO = otherUser.role === 'clo';

  // Allow if: (current user is student AND other is CLO) OR (current user is CLO AND other is student)
  if (!((isStudent && otherIsCLO) || (isCLO && otherIsStudent))) {
    throw new ForbiddenError('Private chats are only allowed between students and CLOs');
  }

  // Determine chat type
  const chatType = (isStudent && otherIsCLO) || (isCLO && otherIsStudent) 
    ? 'student-clo' 
    : 'custom';

  // Find or create chat
  const chat = await PrivateChat.findOrCreateChat(userId, otherUserId, chatType);

  // Populate participants
  await chat.populate('participants.userId', 'name email role');

  // Get other participant info
  const otherParticipant = getOtherParticipant(chat, userId);
  const unreadCount = calculateUnreadCount(chat, userId);

  res.json({
    success: true,
    data: {
      chatId: chat._id,
      chatType: chat.chatType,
      otherParticipant,
      unreadCount,
      lastMessage: getLastMessage(chat)
    }
  });
});

/**
 * Get message history for a private chat
 * GET /api/chats/private/:chatId/messages
 */
exports.getPrivateChatMessages = asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  const userId = req.user._id || req.user.id;

  const chat = await PrivateChat.findById(chatId);
  if (!chat) {
    throw new NotFoundError('Chat not found');
  }

  // Check access - CLO/admin can access any private chat
  const isCLOorAdmin = ['clo', 'admin', 'superadmin'].includes(req.user.role);
  if (!isCLOorAdmin && !hasChatAccess(chat, userId, req.user.role)) {
    throw new ForbiddenError('Not authorized to access this chat');
  }

  const limit = parseInt(req.query.limit) || 50;

  // Get last N messages (non-deleted, text only for MVP)
  const messages = chat.messages
    .filter(msg => !msg.isDeleted && msg.type === 'text')
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, limit)
    .reverse() // Oldest first for display
    .map(msg => ({
      _id: msg._id,
      senderId: msg.senderId,
      senderName: msg.senderName,
      senderRole: msg.senderRole,
      message: msg.message,
      createdAt: msg.createdAt
    }));

  res.json({
    success: true,
    data: {
      messages,
      total: messages.length
    }
  });
});

/**
 * Get all private chats for current user
 * GET /api/chats/private/my-chats
 */
exports.getMyPrivateChats = asyncHandler(async (req, res) => {
  const userId = req.user._id || req.user.id;
  const userRole = req.user.role;

  // Get all private chats where user is a participant
  const chats = await PrivateChat.getUserChats(userId);

  // Format chat list
  const chatList = chats.map(chat => {
    const otherParticipant = getOtherParticipant(chat, userId);
    const unreadCount = calculateUnreadCount(chat, userId);
    const lastMessage = getLastMessage(chat);

    return {
      chatId: chat._id,
      chatType: chat.chatType,
      otherParticipant,
      lastMessage: lastMessage?.message || null,
      lastMessageAt: lastMessage?.createdAt || chat.createdAt,
      unreadCount
    };
  });

  // Sort by last message time (most recent first)
  chatList.sort((a, b) => {
    const timeA = new Date(a.lastMessageAt).getTime();
    const timeB = new Date(b.lastMessageAt).getTime();
    return timeB - timeA;
  });

  res.json({
    success: true,
    data: { chats: chatList }
  });
});

/**
 * Get available CLOs for private chat (for students)
 * GET /api/chats/private/available-clos
 */
exports.getAvailableCLOs = asyncHandler(async (req, res) => {
  const userId = req.user._id || req.user.id;
  const userRole = req.user.role;

  // Only students can access this endpoint
  if (userRole !== 'student') {
    throw new ForbiddenError('Only students can access available CLOs');
  }

  // Get all active CLO users
  const clos = await User.find({
    role: 'clo',
    $or: [
      { 'profile.status': { $ne: 'inactive' } },
      { 'profile.status': { $exists: false } } // Include users without status field
    ]
  })
    .select('_id name email role profile.avatar')
    .sort({ name: 1 }); // Alphabetical order

  // Format response with both English and Arabic names
  const users = await Promise.all(clos.map(async (clo) => {
    const { name, nameAr } = await getNamesFromLead(clo);
    return {
      userId: clo._id,
      name: name,        // English name from Lead
      nameAr: nameAr,    // Arabic name from Lead
      email: clo.email,
      role: clo.role,
      avatar: clo.profile?.avatar || null
    };
  }));

  res.json({
    success: true,
    data: {
      users
    }
  });
});

/**
 * Get available students for private chat (for CLOs)
 * GET /api/chats/private/available-students
 */
exports.getAvailableStudents = asyncHandler(async (req, res) => {
  const userId = req.user._id || req.user.id;
  const userRole = req.user.role;

  // Only CLOs can access this endpoint
  if (userRole !== 'clo') {
    throw new ForbiddenError('Only CLOs can access available students');
  }

  // Get all active student users
  const students = await User.find({
    role: 'student',
    $or: [
      { 'profile.status': { $ne: 'inactive' } },
      { 'profile.status': { $exists: false } } // Include users without status field
    ]
  })
    .select('_id name email role profile.avatar')
    .sort({ name: 1 }); // Alphabetical order

  // Format response with both English and Arabic names
  const users = await Promise.all(students.map(async (student) => {
    const { name, nameAr } = await getNamesFromLead(student);
    return {
      userId: student._id,
      name: name,        // English name from Lead
      nameAr: nameAr,    // Arabic name from Lead
      email: student.email,
      role: student.role,
      avatar: student.profile?.avatar || null
    };
  }));

  res.json({
    success: true,
    data: {
      users
    }
  });
});

/**
 * Delete a message from private chat
 * DELETE /api/chats/private/:chatId/messages/:messageId
 */
exports.deletePrivateMessage = asyncHandler(async (req, res) => {
  const { chatId, messageId } = req.params;
  const userId = req.user._id || req.user.id;

  const chat = await PrivateChat.findById(chatId);
  if (!chat) {
    throw new NotFoundError('Chat not found');
  }

  // Check access - CLO/admin can access any private chat
  const isCLOorAdmin = ['clo', 'admin', 'superadmin'].includes(req.user.role);
  if (!isCLOorAdmin && !hasChatAccess(chat, userId, req.user.role)) {
    throw new ForbiddenError('Not authorized to access this chat');
  }

  // Find message
  const message = chat.messages.id(messageId);
  if (!message) {
    throw new NotFoundError('Message not found');
  }

  // Check if already deleted
  if (message.isDeleted) {
    return res.json({
      success: true,
      message: 'Message already deleted',
      data: { messageId }
    });
  }

  // Authorization: Only message sender can delete (for private chats)
  const isMessageSender = message.senderId.toString() === userId.toString();

  if (!isMessageSender) {
    throw new ForbiddenError('You can only delete your own messages');
  }

  // Delete message (soft delete)
  await chat.deleteMessage(messageId, userId);

  res.json({
    success: true,
    message: 'Message deleted successfully',
    data: { messageId, chatId }
  });
});
