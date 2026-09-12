/**
 * Chat Utilities
 * 
 * Reusable utility functions for both GroupChat and PrivateChat
 * Ensures consistent behavior across different chat types
 */

/**
 * Validate message content
 * @param {string} message - Message text
 * @returns {{ valid: boolean, error?: string }}
 */
exports.validateMessage = (message) => {
  if (!message || typeof message !== 'string') {
    return { valid: false, error: 'Message is required' };
  }

  const trimmed = message.trim();
  if (!trimmed) {
    return { valid: false, error: 'Message cannot be empty' };
  }

  if (trimmed.length > 5000) {
    return { valid: false, error: 'Message exceeds 5000 characters' };
  }

  return { valid: true };
};

/**
 * Check if user has access to a chat
 * @param {Object} chat - Chat document (GroupChat or PrivateChat)
 * @param {string} userId - User ID to check
 * @param {string} userRole - User role
 * @param {Object} group - Group document (for group chats)
 * @returns {boolean}
 */
exports.hasChatAccess = (chat, userId, userRole, group = null) => {
  // Normalize userId to string for comparison
  const userIdStr = userId?.toString();
  
  // Helper to get participant userId (handles both populated and non-populated)
  const getParticipantUserId = (participant) => {
    if (!participant || !participant.userId) return null;
    // If populated (object with _id), use _id, otherwise use userId directly
    return participant.userId._id 
      ? participant.userId._id.toString() 
      : participant.userId.toString();
  };

  // For private chats, check if user is a participant
  if (chat.chatType || chat.participants?.length === 2) {
    return chat.participants.some(
      p => getParticipantUserId(p) === userIdStr
    );
  }

  // For group chats, check group membership
  if (group) {
    const isGroupMember = group.students?.some(
      s => s.toString() === userIdStr
    );
    const isTrainer = group.trainerId?.toString() === userIdStr;
    const isCLOorAdmin = ['clo', 'admin', 'superadmin'].includes(userRole);

    return isGroupMember || isTrainer || isCLOorAdmin;
  }

  // Fallback: check if user is a participant
  return chat.participants?.some(
    p => getParticipantUserId(p) === userIdStr
  );
};

/**
 * Get the other participant in a private chat
 * @param {Object} chat - PrivateChat document
 * @param {string} userId - Current user ID
 * @returns {Object|null} - Other participant info
 */
exports.getOtherParticipant = (chat, userId) => {
  if (!chat.participants || chat.participants.length !== 2) {
    return null;
  }

  const other = chat.participants.find(
    p => p.userId.toString() !== userId.toString()
  );

  return other ? {
    userId: other.userId._id || other.userId,
    name: other.userId?.name || 'Unknown',
    role: other.role
  } : null;
};

/**
 * Format message for socket emission
 * @param {Object} message - Message document
 * @returns {Object} - Formatted message
 */
exports.formatMessageForSocket = (message) => {
  return {
    _id: message._id,
    senderId: message.senderId,
    senderName: message.senderName,
    senderRole: message.senderRole,
    message: message.message,
    type: message.type || 'text',
    createdAt: message.createdAt,
    isEdited: message.isEdited || false,
    editedAt: message.editedAt || null
  };
};

/**
 * Calculate unread count for a user in a chat
 * @param {Object} chat - Chat document
 * @param {string} userId - User ID
 * @returns {number} - Unread message count
 */
exports.calculateUnreadCount = (chat, userId) => {
  const participant = chat.participants?.find(
    p => p.userId?.toString() === userId.toString()
  );

  if (!participant) {
    return 0;
  }

  return chat.messages?.filter(msg => {
    return !msg.isDeleted &&
           msg.senderId.toString() !== userId.toString() &&
           msg.createdAt > participant.lastReadAt;
  }).length || 0;
};

/**
 * Get last message from chat
 * @param {Object} chat - Chat document
 * @returns {Object|null} - Last message or null
 */
exports.getLastMessage = (chat) => {
  if (!chat.messages || chat.messages.length === 0) {
    return null;
  }

  const lastMsg = chat.messages
    .filter(m => !m.isDeleted)
    .sort((a, b) => b.createdAt - a.createdAt)[0];

  return lastMsg ? {
    message: lastMsg.message,
    createdAt: lastMsg.createdAt,
    senderName: lastMsg.senderName
  } : null;
};

/**
 * Determine chat type from participants
 * @param {Array} participants - Array of participant objects with role
 * @returns {string} - Chat type
 */
exports.determineChatType = (participants) => {
  if (participants.length !== 2) {
    return 'custom';
  }

  const roles = participants.map(p => p.role).sort();
  const [role1, role2] = roles;

  // Student-CLO chat
  if ((role1 === 'student' && role2 === 'clo') || 
      (role1 === 'clo' && role2 === 'student')) {
    return 'student-clo';
  }

  // Student-Trainer chat
  if ((role1 === 'student' && role2 === 'trainer') || 
      (role1 === 'trainer' && role2 === 'student')) {
    return 'student-trainer';
  }

  // Student-Admin chat
  if ((role1 === 'student' && ['admin', 'superadmin'].includes(role2)) || 
      (['admin', 'superadmin'].includes(role1) && role2 === 'student')) {
    return 'student-admin';
  }

  // Trainer-CLO chat
  if ((role1 === 'trainer' && role2 === 'clo') || 
      (role1 === 'clo' && role2 === 'trainer')) {
    return 'trainer-clo';
  }

  return 'custom';
};
