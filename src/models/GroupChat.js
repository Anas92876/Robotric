/**
 * GroupChat Model
 *
 * Represents a chat room for a group with real-time messaging capabilities.
 * Supports text messages, file sharing, announcements, reactions, and threading.
 *
 * @model GroupChat
 * @description Manages real-time group communication between trainers and students
 */

const mongoose = require('mongoose');

const GroupChatSchema = new mongoose.Schema({
  // Reference to the group
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: [true, 'Group is required'],
    unique: true, // One chat per group
    index: true
  },

  // Chat name (defaults to group name)
  name: {
    type: String,
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },

  // Participants in the chat
  participants: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['trainer', 'student'],
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

  // Messages array
  messages: [{
    // Sender information
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    senderName: {
      type: String,
      required: true
    },
    senderRole: {
      type: String,
      enum: ['trainer', 'student'],
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
        type: Number, // Size in bytes
        required: true,
        max: [52428800, 'File size cannot exceed 50MB'] // 50MB limit
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

  // Pinned messages (quick access)
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
      type: Number, // Bytes
      default: 52428800, // 50MB
      max: [104857600, 'Max file size cannot exceed 100MB']
    },
    allowedFileTypes: [{
      type: String,
      trim: true
    }],
    autoDeleteAfterDays: {
      type: Number, // Auto-delete messages after X days (0 = never)
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
    },
    totalParticipants: {
      type: Number,
      default: 0,
      min: 0
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
GroupChatSchema.index({ groupId: 1 });
GroupChatSchema.index({ 'participants.userId': 1 });
GroupChatSchema.index({ 'messages.createdAt': -1 });
GroupChatSchema.index({ 'messages.senderId': 1 });
GroupChatSchema.index({ 'messages.type': 1 });

// Virtual: Get active messages (non-deleted)
GroupChatSchema.virtual('activeMessages').get(function() {
  return this.messages.filter(msg => !msg.isDeleted);
});

// Virtual: Get announcement messages
GroupChatSchema.virtual('announcements').get(function() {
  return this.messages.filter(
    msg => msg.type === 'announcement' && !msg.isDeleted
  );
});

// Virtual: Get unread count for a user (must be calculated separately)
// This is a placeholder - actual implementation would be in the method

// Method: Send a message
GroupChatSchema.methods.sendMessage = function(senderId, senderName, senderRole, message, type = 'text', attachments = []) {
  const newMessage = {
    senderId,
    senderName,
    senderRole,
    message,
    type,
    attachments,
    readBy: [{ userId: senderId, readAt: new Date() }], // Sender has read their own message
    createdAt: new Date()
  };

  this.messages.push(newMessage);
  this.stats.totalMessages += 1;

  if (attachments && attachments.length > 0) {
    this.stats.totalFiles += attachments.length;
  }

  return this.save();
};

// Method: Edit a message
GroupChatSchema.methods.editMessage = function(messageId, newContent) {
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
GroupChatSchema.methods.deleteMessage = function(messageId, deletedBy) {
  const message = this.messages.id(messageId);

  if (!message) {
    throw new Error('Message not found');
  }

  message.isDeleted = true;
  message.deletedAt = new Date();
  message.deletedBy = deletedBy;
  this.stats.totalMessages = Math.max(0, this.stats.totalMessages - 1);

  // Remove from pinned messages if it was pinned
  if (message.isPinned) {
    this.pinnedMessages = this.pinnedMessages.filter(
      id => id.toString() !== messageId.toString()
    );
    message.isPinned = false;
  }

  return this.save();
};

// Method: Pin a message
GroupChatSchema.methods.pinMessage = function(messageId) {
  const message = this.messages.id(messageId);

  if (!message) {
    throw new Error('Message not found');
  }

  if (message.isDeleted) {
    throw new Error('Cannot pin deleted message');
  }

  if (!message.isPinned) {
    message.isPinned = true;

    if (!this.pinnedMessages.includes(messageId)) {
      this.pinnedMessages.push(messageId);
    }
  }

  return this.save();
};

// Method: Unpin a message
GroupChatSchema.methods.unpinMessage = function(messageId) {
  const message = this.messages.id(messageId);

  if (!message) {
    throw new Error('Message not found');
  }

  message.isPinned = false;
  this.pinnedMessages = this.pinnedMessages.filter(
    id => id.toString() !== messageId.toString()
  );

  return this.save();
};

// Method: Add reaction to a message
GroupChatSchema.methods.addReaction = function(messageId, userId, emoji) {
  if (!this.settings.allowReactions) {
    throw new Error('Reactions are disabled for this chat');
  }

  const message = this.messages.id(messageId);

  if (!message) {
    throw new Error('Message not found');
  }

  if (message.isDeleted) {
    throw new Error('Cannot react to deleted message');
  }

  // Check if user already reacted with this emoji
  const existingReaction = message.reactions.find(
    r => r.userId.toString() === userId.toString() && r.emoji === emoji
  );

  if (existingReaction) {
    // Remove the reaction if it exists (toggle)
    message.reactions = message.reactions.filter(
      r => !(r.userId.toString() === userId.toString() && r.emoji === emoji)
    );
  } else {
    // Add new reaction
    message.reactions.push({
      userId,
      emoji,
      reactedAt: new Date()
    });
  }

  return this.save();
};

// Method: Mark messages as read for a user
GroupChatSchema.methods.markAsRead = function(userId, upToMessageId = null) {
  const participant = this.participants.find(
    p => p.userId.toString() === userId.toString()
  );

  if (participant) {
    participant.lastReadAt = new Date();
  }

  // If specific message ID provided, mark all messages up to that point
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
GroupChatSchema.methods.getUnreadMessages = function(userId) {
  const participant = this.participants.find(
    p => p.userId.toString() === userId.toString()
  );

  if (!participant) {
    return [];
  }

  return this.messages.filter(msg => {
    // Message is not deleted and created after last read time
    return !msg.isDeleted &&
           msg.senderId.toString() !== userId.toString() && // Don't count own messages
           msg.createdAt > participant.lastReadAt;
  });
};

// Method: Add participant
GroupChatSchema.methods.addParticipant = function(userId, role) {
  const existingParticipant = this.participants.find(
    p => p.userId.toString() === userId.toString()
  );

  if (existingParticipant) {
    throw new Error('Participant already exists');
  }

  this.participants.push({
    userId,
    role,
    joinedAt: new Date(),
    lastReadAt: new Date()
  });

  this.stats.totalParticipants = this.participants.length;

  // Add system message
  this.messages.push({
    senderId: userId,
    senderName: 'System',
    senderRole: 'trainer',
    message: `New ${role} joined the chat`,
    type: 'system',
    createdAt: new Date()
  });

  return this.save();
};

// Method: Remove participant
GroupChatSchema.methods.removeParticipant = function(userId) {
  this.participants = this.participants.filter(
    p => p.userId.toString() !== userId.toString()
  );

  this.stats.totalParticipants = this.participants.length;

  return this.save();
};

// Static method: Get chat by group
GroupChatSchema.statics.getChatByGroup = function(groupId) {
  return this.findOne({ groupId })
    .populate('participants.userId', 'name email role')
    .populate('groupId', 'name');
};

// Static method: Get messages with pagination
GroupChatSchema.statics.getMessages = async function(groupId, page = 1, limit = 50) {
  const chat = await this.findOne({ groupId });

  if (!chat) {
    throw new Error('Chat not found');
  }

  const activeMessages = chat.messages.filter(msg => !msg.isDeleted);
  const total = activeMessages.length;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;

  // Return messages in reverse chronological order (newest first)
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

// Pre-save hook: Update stats
GroupChatSchema.pre('save', function(next) {
  // Update total participants
  this.stats.totalParticipants = this.participants.length;

  // Count active messages and files
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

  // Only update if different to avoid unnecessary changes
  if (this.stats.totalMessages !== messageCount) {
    this.stats.totalMessages = messageCount;
  }
  if (this.stats.totalFiles !== fileCount) {
    this.stats.totalFiles = fileCount;
  }

  next();
});

module.exports = mongoose.model('GroupChat', GroupChatSchema);
