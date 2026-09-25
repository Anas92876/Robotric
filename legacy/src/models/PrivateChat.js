/**
 * PrivateChat Model
 *
 * Represents a 1-on-1 private chat between two users
 * Supports text messages, file sharing, and read receipts
 * Designed to be reusable for any user-to-user private communication
 *
 * @model PrivateChat
 * @description Manages private real-time communication between users
 */

const mongoose = require('mongoose');

const PrivateChatSchema = new mongoose.Schema({
  // Participants (always exactly 2 users)
  participants: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['student', 'trainer', 'teacher', 'admin', 'judge', 'editor', 'organizer', 'superadmin', 'reception', 'clo', 'social'],
      required: true
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    lastReadAt: {
      type: Date,
      default: Date.now
    },
    isMuted: {
      type: Boolean,
      default: false
    }
  }],

  // Chat type (for extensibility: student-clo, student-trainer, etc.)
  chatType: {
    type: String,
    enum: ['student-clo', 'student-trainer', 'student-admin', 'trainer-clo', 'custom'],
    default: 'custom',
    index: true
  },

  // Messages array (same structure as GroupChat)
  messages: [{
    // Sender information
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    senderName: {
      type: String,
      required: true
    },
    senderRole: {
      type: String,
      required: true
    },

    // Message content
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: [5000, 'Message cannot exceed 5000 characters']
    },

    // Message type
    type: {
      type: String,
      enum: ['text', 'file', 'announcement', 'system'],
      default: 'text'
    },

    // Pinned status
    isPinned: {
      type: Boolean,
      default: false
    },

    // File attachments
    attachments: [{
      filename: {
        type: String,
        required: true
      },
      originalName: {
        type: String,
        required: true
      },
      url: {
        type: String,
        required: true
      },
      fileType: {
        type: String,
        required: true
      },
      fileSize: {
        type: Number,
        required: true,
        max: [52428800, 'File size cannot exceed 50MB']
      }
    }],

    // Emoji reactions
    reactions: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      emoji: {
        type: String,
        required: true,
        maxlength: [10, 'Emoji cannot exceed 10 characters']
      },
      reactedAt: {
        type: Date,
        default: Date.now
      }
    }],

    // Threading support
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },
    threadMessages: [{
      type: mongoose.Schema.Types.ObjectId
    }],

    // Read receipts
    readBy: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      readAt: {
        type: Date,
        default: Date.now
      }
    }],

    // Message management
    isEdited: {
      type: Boolean,
      default: false
    },
    editedAt: {
      type: Date,
      default: null
    },
    isDeleted: {
      type: Boolean,
      default: false
    },
    deletedAt: {
      type: Date,
      default: null
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },

    // Timestamps
    createdAt: {
      type: Date,
      default: Date.now,
      index: true
    }
  }],

  // Pinned messages
  pinnedMessages: [{
    type: mongoose.Schema.Types.ObjectId
  }],

  // Chat settings
  settings: {
    allowFileSharing: {
      type: Boolean,
      default: true
    },
    allowReactions: {
      type: Boolean,
      default: true
    },
    allowThreading: {
      type: Boolean,
      default: true
    },
    maxFileSize: {
      type: Number,
      default: 52428800, // 50MB
      max: [104857600, 'Max file size cannot exceed 100MB']
    },
    allowedFileTypes: [{
      type: String,
      trim: true
    }],
    autoDeleteAfterDays: {
      type: Number,
      default: 0,
      min: 0
    }
  },

  // Chat statistics
  stats: {
    totalMessages: {
      type: Number,
      default: 0,
      min: 0
    },
    totalFiles: {
      type: Number,
      default: 0,
      min: 0
    }
  },

  // Last message timestamp (for sorting)
  lastMessageAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
PrivateChatSchema.index({ 'participants.userId': 1 });
PrivateChatSchema.index({ chatType: 1, 'participants.userId': 1 });
PrivateChatSchema.index({ 'messages.createdAt': -1 });
PrivateChatSchema.index({ 'messages.senderId': 1 });
PrivateChatSchema.index({ lastMessageAt: -1 });

// Compound index for finding chat between two users
PrivateChatSchema.index({ 
  'participants.userId': 1 
}, { 
  unique: false // Not unique because we need to find chats with specific user combinations
});

// Virtual: Get active messages (non-deleted)
PrivateChatSchema.virtual('activeMessages').get(function() {
  return this.messages.filter(msg => !msg.isDeleted);
});

// Method: Send a message
PrivateChatSchema.methods.sendMessage = function(senderId, senderName, senderRole, message, type = 'text', attachments = []) {
  const newMessage = {
    senderId,
    senderName,
    senderRole,
    message,
    type,
    attachments,
    readBy: [{ userId: senderId, readAt: new Date() }],
    createdAt: new Date()
  };

  this.messages.push(newMessage);
  this.stats.totalMessages += 1;
  this.lastMessageAt = new Date();

  if (attachments && attachments.length > 0) {
    this.stats.totalFiles += attachments.length;
  }

  return this.save();
};

// Method: Edit a message
PrivateChatSchema.methods.editMessage = function(messageId, newContent) {
  const message = this.messages.id(messageId);

  if (!message) {
    throw new Error('Message not found');
  }

  if (message.isDeleted) {
    throw new Error('Cannot edit deleted message');
  }

  message.message = newContent;
  message.isEdited = true;
  message.editedAt = new Date();

  return this.save();
};

// Method: Delete a message
PrivateChatSchema.methods.deleteMessage = function(messageId, deletedBy) {
  const message = this.messages.id(messageId);

  if (!message) {
    throw new Error('Message not found');
  }

  message.isDeleted = true;
  message.deletedAt = new Date();
  message.deletedBy = deletedBy;
  this.stats.totalMessages = Math.max(0, this.stats.totalMessages - 1);

  if (message.isPinned) {
    this.pinnedMessages = this.pinnedMessages.filter(
      id => id.toString() !== messageId.toString()
    );
    message.isPinned = false;
  }

  return this.save();
};

// Method: Mark messages as read for a user
PrivateChatSchema.methods.markAsRead = function(userId, upToMessageId = null) {
  const participant = this.participants.find(
    p => p.userId.toString() === userId.toString()
  );

  if (participant) {
    participant.lastReadAt = new Date();
  }

  if (upToMessageId) {
    const messageIndex = this.messages.findIndex(
      m => m._id.toString() === upToMessageId.toString()
    );

    if (messageIndex !== -1) {
      for (let i = 0; i <= messageIndex; i++) {
        const message = this.messages[i];
        const alreadyRead = message.readBy.some(
          r => r.userId.toString() === userId.toString()
        );

        if (!alreadyRead) {
          message.readBy.push({
            userId,
            readAt: new Date()
          });
        }
      }
    }
  }

  return this.save();
};

// Method: Get unread messages for a user
PrivateChatSchema.methods.getUnreadMessages = function(userId) {
  const participant = this.participants.find(
    p => p.userId.toString() === userId.toString()
  );

  if (!participant) {
    return [];
  }

  return this.messages.filter(msg => {
    return !msg.isDeleted &&
           msg.senderId.toString() !== userId.toString() &&
           msg.createdAt > participant.lastReadAt;
  });
};

// Static method: Find or create chat between two users
PrivateChatSchema.statics.findOrCreateChat = async function(userId1, userId2, chatType = 'custom') {
  // Normalize user IDs to ensure consistent ordering
  const sortedIds = [userId1.toString(), userId2.toString()].sort();
  
  // Try to find existing chat
  let chat = await this.findOne({
    'participants.userId': { $all: sortedIds },
    $expr: { $eq: [{ $size: '$participants' }, 2] }
  });

  if (chat) {
    return chat;
  }

  // Get user info for participants
  const User = mongoose.model('User');
  const [user1, user2] = await Promise.all([
    User.findById(sortedIds[0]),
    User.findById(sortedIds[1])
  ]);

  if (!user1 || !user2) {
    throw new Error('One or both users not found');
  }

  // Create new chat
  chat = await this.create({
    participants: [
      {
        userId: user1._id,
        role: user1.role,
        joinedAt: new Date(),
        lastReadAt: new Date()
      },
      {
        userId: user2._id,
        role: user2.role,
        joinedAt: new Date(),
        lastReadAt: new Date()
      }
    ],
    chatType,
    lastMessageAt: new Date()
  });

  return chat;
};

// Static method: Get chat between two users
PrivateChatSchema.statics.getChatBetweenUsers = async function(userId1, userId2) {
  const sortedIds = [userId1.toString(), userId2.toString()].sort();
  
  return this.findOne({
    'participants.userId': { $all: sortedIds },
    $expr: { $eq: [{ $size: '$participants' }, 2] }
  }).populate('participants.userId', 'name email role');
};

// Static method: Get all chats for a user
PrivateChatSchema.statics.getUserChats = async function(userId) {
  return this.find({
    'participants.userId': userId
  })
    .populate('participants.userId', 'name email role')
    .sort({ lastMessageAt: -1 });
};

// Static method: Get messages with pagination
PrivateChatSchema.statics.getMessages = async function(chatId, page = 1, limit = 50) {
  const chat = await this.findById(chatId);

  if (!chat) {
    throw new Error('Chat not found');
  }

  const activeMessages = chat.messages.filter(msg => !msg.isDeleted);
  const total = activeMessages.length;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;

  const messages = activeMessages
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(startIndex, endIndex);

  return {
    messages,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasMore: endIndex < total
    }
  };
};

// Pre-save hook: Update stats and validate participants
PrivateChatSchema.pre('save', function(next) {
  // Validate exactly 2 participants
  if (this.participants.length !== 2) {
    return next(new Error('Private chat must have exactly 2 participants'));
  }

  // Update stats
  let messageCount = 0;
  let fileCount = 0;

  this.messages.forEach(msg => {
    if (!msg.isDeleted) {
      messageCount++;
      if (msg.attachments) {
        fileCount += msg.attachments.length;
      }
    }
  });

  if (this.stats.totalMessages !== messageCount) {
    this.stats.totalMessages = messageCount;
  }
  if (this.stats.totalFiles !== fileCount) {
    this.stats.totalFiles = fileCount;
  }

  // Update lastMessageAt if there are messages
  if (this.messages.length > 0) {
    const lastMessage = this.messages
      .filter(m => !m.isDeleted)
      .sort((a, b) => b.createdAt - a.createdAt)[0];
    
    if (lastMessage) {
      this.lastMessageAt = lastMessage.createdAt;
    }
  }

  next();
});

module.exports = mongoose.model('PrivateChat', PrivateChatSchema);
