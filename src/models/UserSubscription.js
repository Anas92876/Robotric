/**
 * UserSubscription Model
 * 
 * Links users to subscription plans and tracks their subscription status
 * One active subscription per user at a time
 */

const mongoose = require('mongoose');

const UserSubscriptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  planId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubscriptionPlan',
    required: [true, 'Plan ID is required'],
    index: true
  },
  startsAt: {
    type: Date,
    required: [true, 'Start date is required'],
    default: Date.now,
    index: true
  },
  endsAt: {
    type: Date,
    required: [true, 'End date is required'],
    index: true
  },
  remainingHours: {
    type: Number,
    required: [true, 'Remaining hours is required'],
    default: 0,
    min: [0, 'Remaining hours cannot be negative']
  },
  status: {
    type: String,
    enum: ['active', 'expired', 'canceled'],
    default: 'active',
    index: true
  },
  canceledAt: {
    type: Date,
    default: null
  },
  canceledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound index for active subscription lookup
UserSubscriptionSchema.index({ userId: 1, status: 1, endsAt: 1 });

// Virtual to check if subscription is currently active
UserSubscriptionSchema.virtual('isCurrentlyActive').get(function() {
  const now = new Date();
  return this.status === 'active' && 
         this.startsAt <= now && 
         this.endsAt > now;
});

// Pre-save middleware to auto-expire subscriptions
UserSubscriptionSchema.pre('save', function(next) {
  if (this.status === 'active' && this.endsAt < new Date()) {
    this.status = 'expired';
  }
  next();
});

module.exports = mongoose.model('UserSubscription', UserSubscriptionSchema);
