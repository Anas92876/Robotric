/**
 * Notification Model
 *
 * Stores in-app notifications for web users
 * Supports real-time notifications via Socket.io
 */

const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  // User who receives the notification
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },

  // Notification type
  type: {
    type: String,
    enum: ['enrollment', 'payment', 'evaluation', 'session', 'assignment', 'system', 'transport', 'task'],
    required: [true, 'Notification type is required'],
    index: true
  },

  // Notification content
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },

  message: {
    type: String,
    required: [true, 'Message is required'],
    trim: true,
    maxlength: [1000, 'Message cannot exceed 1000 characters']
  },

  // Additional data (optional, for context)
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },

  // Read status
  isRead: {
    type: Boolean,
    default: false,
    index: true
  },

  // Importance flag
  isImportant: {
    type: Boolean,
    default: false
  },

  // Action URL (optional, for navigation)
  actionUrl: {
    type: String,
    trim: true
  },

  // Action label (optional)
  actionLabel: {
    type: String,
    trim: true,
    maxlength: [50, 'Action label cannot exceed 50 characters']
  },

  // Read timestamp
  readAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true // Adds createdAt and updatedAt
});

// Indexes for efficient queries
notificationSchema.index({ userId: 1, isRead: 1 });
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, type: 1, createdAt: -1 });

// Compound index for common queries
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
