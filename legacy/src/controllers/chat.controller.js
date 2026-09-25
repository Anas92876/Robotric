/**
 * Chat Controller
 * 
 * REST API endpoints for chat functionality
 * Handles chat history, unread counts, and chat list
 */

const GroupChat = require('../models/GroupChat');
const Group = require('../models/Group');
const asyncHandler = require('../utils/asyncHandler');
const { NotFoundError, ForbiddenError } = require('../utils/errors');

/**
 * Get chat details for a group
 * GET /api/chats/groups/:groupId
 */
exports.getChatByGroup = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user._id || req.user.id;
  const userRole = req.user.role;
  
  // Verify group exists
  const group = await Group.findById(groupId);
  if (!group) {
    throw new NotFoundError('Group not found');
  }
  
  // Check access
  const isGroupMember = group.students.some(s => s.toString() === userId.toString());
  const isTrainer = group.trainerId.toString() === userId.toString();
  const isCLOorAdmin = ['clo', 'admin', 'superadmin'].includes(userRole);
  
  if (!isGroupMember && !isTrainer && !isCLOorAdmin) {
    throw new ForbiddenError('Not authorized to access this chat');
  }
  
  // Get or create chat
  let chat = await GroupChat.findOne({ groupId })
    .populate('participants.userId', 'name role');
  
  if (!chat) {
    chat = await GroupChat.create({
      groupId,
      name: `${group.name} Chat`,
      participants: []
    });
  }
  
  // Calculate unread count
  const participant = chat.participants.find(
    p => p.userId && p.userId._id.toString() === userId.toString()
  );
  
  const unreadCount = participant
    ? chat.messages.filter(
        msg => !msg.isDeleted &&
               msg.senderId.toString() !== userId.toString() &&
               msg.createdAt > participant.lastReadAt
      ).length
    : 0;
  
  res.json({
    success: true,
    data: {
      groupId: chat.groupId,
      name: chat.name,
      participants: chat.participants.map(p => ({
        userId: p.userId ? p.userId._id : p.userId,
        name: p.userId ? p.userId.name : 'Unknown',
        role: p.role
      })),
      unreadCount
    }
  });
});

/**
 * Get message history for a group chat
 * GET /api/chats/groups/:groupId/messages
 */
exports.getChatMessages = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user._id || req.user.id;
  const userRole = req.user.role;
  const limit = parseInt(req.query.limit) || 50;
  
  // Verify group exists and user has access
  const group = await Group.findById(groupId);
  if (!group) {
    throw new NotFoundError('Group not found');
  }
  
  const isGroupMember = group.students.some(s => s.toString() === userId.toString());
  const isTrainer = group.trainerId.toString() === userId.toString();
  const isCLOorAdmin = ['clo', 'admin', 'superadmin'].includes(userRole);
  
  if (!isGroupMember && !isTrainer && !isCLOorAdmin) {
    throw new ForbiddenError('Not authorized to access this chat');
  }
  
  // Get chat
  const chat = await GroupChat.findOne({ groupId });
  
  if (!chat) {
    return res.json({
      success: true,
      data: { messages: [], total: 0 }
    });
  }
  
  // Get last N messages (non-deleted, text only)
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
 * Get all chats for current user
 * GET /api/chats/my-chats
 * Returns all groups the user has access to, whether they have messages or not
 */
exports.getMyChats = asyncHandler(async (req, res) => {
  console.log('\n📥 [GET MY CHATS] Request received');
  console.log('👤 User ID:', req.user?._id || req.user?.id);
  console.log('👥 User Role:', req.user?.role);
  
  const userId = req.user._id || req.user.id;
  const userRole = req.user.role;

  let groups;

  // CLO/Admin: Get all groups
  if (['clo', 'admin', 'superadmin'].includes(userRole)) {
    groups = await Group.find({ status: 'active' })
      .populate('courseId', 'title')
      .sort({ startDate: -1 });
  }
  // Trainer: Get their groups
  else if (['trainer', 'teacher'].includes(userRole)) {
    groups = await Group.find({ trainerId: userId, status: 'active' })
      .populate('courseId', 'title')
      .sort({ startDate: -1 });
  }
  // Student: Get enrolled groups
  else {
    groups = await Group.find({ students: userId, status: 'active' })
      .populate('courseId', 'title')
      .sort({ startDate: -1 });
  }

  // Build chat list for all groups (with or without messages)
  const chats = [];

  for (const group of groups) {
    const chat = await GroupChat.findOne({ groupId: group._id });

    let lastMessage = null;
    let lastMessageAt = null;
    let unreadCount = 0;

    if (chat && chat.messages.length > 0) {
      // Get last message
      const lastMsg = chat.messages
        .filter(m => !m.isDeleted)
        .sort((a, b) => b.createdAt - a.createdAt)[0];

      if (lastMsg) {
        lastMessage = lastMsg.message;
        lastMessageAt = lastMsg.createdAt;
      }

      // Calculate unread count
      const participant = chat.participants.find(
        p => p.userId && p.userId.toString() === userId.toString()
      );

      if (participant) {
        // User has joined before - count messages after lastReadAt
        unreadCount = chat.messages.filter(
          msg => !msg.isDeleted &&
                 msg.senderId.toString() !== userId.toString() &&
                 msg.createdAt > participant.lastReadAt
        ).length;
      } else if (['clo', 'admin', 'superadmin'].includes(userRole)) {
        // CLO/Admin who hasn't joined yet - count all non-deleted messages as unread
        unreadCount = chat.messages.filter(
          msg => !msg.isDeleted &&
                 msg.senderId.toString() !== userId.toString()
        ).length;
      }
      // For other users who aren't participants, unreadCount stays 0
    }

    // Add group to chat list regardless of whether it has messages
    chats.push({
      groupId: group._id,
      groupName: group.name,
      courseName: group.courseId ? group.courseId.title : null,
      lastMessage,
      lastMessageAt,
      unreadCount
    });
  }

  // Sort: groups with recent messages first, then by group name
  chats.sort((a, b) => {
    if (a.lastMessageAt && b.lastMessageAt) {
      return new Date(b.lastMessageAt) - new Date(a.lastMessageAt);
    }
    if (a.lastMessageAt) return -1;
    if (b.lastMessageAt) return 1;
    return a.groupName.localeCompare(b.groupName);
  });

  res.json({
    success: true,
    data: { chats }
  });
});

/**
 * Delete a message from group chat
 * DELETE /api/chats/groups/:groupId/messages/:messageId
 */
exports.deleteMessage = asyncHandler(async (req, res) => {
  const { groupId, messageId } = req.params;
  const userId = req.user._id || req.user.id;
  const userRole = req.user.role;
  
  console.log('\n🗑️ [DELETE MESSAGE API] Request received');
  console.log('👤 User:', userId);
  console.log('👥 Group ID:', groupId);
  console.log('💬 Message ID:', messageId);
  
  // Verify group exists
  const group = await Group.findById(groupId);
  if (!group) {
    console.error('❌ [DELETE MESSAGE API] Group not found');
    throw new NotFoundError('Group not found');
  }
  
  // Check access
  const isGroupMember = group.students.some(s => s.toString() === userId.toString());
  const isTrainer = group.trainerId?.toString() === userId.toString();
  const isCLOorAdmin = ['clo', 'admin', 'superadmin'].includes(userRole);
  
  if (!isGroupMember && !isTrainer && !isCLOorAdmin) {
    console.error('❌ [DELETE MESSAGE API] Access denied');
    throw new ForbiddenError('Not authorized to access this chat');
  }
  
  // Get chat
  const chat = await GroupChat.findOne({ groupId });
  if (!chat) {
    console.error('❌ [DELETE MESSAGE API] Chat not found');
    throw new NotFoundError('Chat not found');
  }
  
  // Find message
  const message = chat.messages.id(messageId);
  if (!message) {
    console.error('❌ [DELETE MESSAGE API] Message not found');
    throw new NotFoundError('Message not found');
  }
  
  // Check if already deleted
  if (message.isDeleted) {
    console.log('⚠️ [DELETE MESSAGE API] Message already deleted');
    return res.json({
      success: true,
      message: 'Message already deleted',
      data: { messageId }
    });
  }
  
  // Authorization: Only message sender, trainer, or CLO/Admin can delete
  const isMessageSender = message.senderId.toString() === userId.toString();
  
  console.log('🔐 [DELETE MESSAGE API] Authorization check:');
  console.log('   - Is message sender:', isMessageSender);
  console.log('   - Is trainer:', isTrainer);
  console.log('   - Is CLO/Admin:', isCLOorAdmin);
  
  if (!isMessageSender && !isTrainer && !isCLOorAdmin) {
    console.error('❌ [DELETE MESSAGE API] Forbidden - user not authorized');
    throw new ForbiddenError('You can only delete your own messages');
  }
  
  // Delete message (soft delete)
  console.log('🗑️ [DELETE MESSAGE API] Deleting message...');
  await chat.deleteMessage(messageId, userId);
  console.log('✅ [DELETE MESSAGE API] Message deleted successfully');
  
  res.json({
    success: true,
    message: 'Message deleted successfully',
    data: { messageId, groupId }
  });
});