/**
 * SubscriptionPlan Model
 * 
 * Defines available subscription plans with monthly hour quotas
 */

const mongoose = require('mongoose');

const SubscriptionPlanSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Plan name is required'],
    trim: true,
    maxlength: [100, 'Plan name cannot exceed 100 characters'],
    index: true
  },
  monthlyHours: {
    type: Number,
    required: [true, 'Monthly hours is required'],
    default: 20,
    min: [1, 'Monthly hours must be at least 1'],
    max: [1000, 'Monthly hours cannot exceed 1000']
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative']
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for active plans lookup
SubscriptionPlanSchema.index({ isActive: 1, createdAt: -1 });

module.exports = mongoose.model('SubscriptionPlan', SubscriptionPlanSchema);
