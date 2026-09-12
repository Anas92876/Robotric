const mongoose = require('mongoose');

const pushTokenSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  token: {
    type: String,
    required: [true, 'Push token is required'],
    trim: true,
    unique: true
  },
  platform: {
    type: String,
    enum: {
      values: ['android', 'ios'],
      message: 'Platform must be either android or ios'
    },
    required: [true, 'Platform is required']
  },
  deviceId: {
    type: String,
    trim: true,
    default: null
  },
  tokenType: {
    type: String,
    enum: {
      values: ['expo', 'fcm'],
      message: 'tokenType must be either expo or fcm'
    },
    default: 'expo'
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  deactivatedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Compound index for efficient queries by user and active status
pushTokenSchema.index({ userId: 1, isActive: 1 });

// TTL index: auto-delete inactive tokens after 30 days
pushTokenSchema.index({ deactivatedAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60, partialFilterExpression: { deactivatedAt: { $type: 'date' } } });

// Pre-save middleware: set deactivatedAt when isActive changes to false
pushTokenSchema.pre('save', function (next) {
  if (!this.isActive && !this.deactivatedAt) {
    this.deactivatedAt = new Date();
  } else if (this.isActive) {
    this.deactivatedAt = null;
  }
  next();
});

module.exports = mongoose.model('PushToken', pushTokenSchema);
