/**
 * SessionRequest Model (Phase 2)
 * 
 * Private 1-1 session requests with time scheduling
 * No trainer assignment - sessions are with physical trainer (not in system)
 */

const mongoose = require('mongoose');

const SessionRequestSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  subscriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserSubscription',
    required: [true, 'Subscription ID is required'],
    index: true
  },
  // Time scheduling fields
  date: {
    type: Date,
    required: [true, 'Date is required']
  },
  startTime: {
    type: String,
    required: [true, 'Start time is required'],
    validate: {
      validator: function(v) {
        // Validate HH:mm format
        return /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(v);
      },
      message: 'Start time must be in HH:mm format (e.g., 14:30)'
    }
  },
  durationHours: {
    type: Number,
    required: [true, 'Duration is required'],
    min: [0.01, 'Duration must be greater than 0'],
    validate: {
      validator: function(v) {
        return v > 0;
      },
      message: 'Duration must be greater than 0'
    }
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'declined', 'canceled', 'completed', 'no_show'],
    default: 'pending',
    index: true
  },
  // Approval/decline fields
  approvedAt: {
    type: Date,
    default: null
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  declinedAt: {
    type: Date,
    default: null
  },
  declinedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  declineReason: {
    type: String,
    trim: true,
    maxlength: [500, 'Decline reason cannot exceed 500 characters']
  },
  // Cancellation fields
  canceledAt: {
    type: Date,
    default: null
  },
  canceledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  // Completion fields
  completedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indexes for common queries
SessionRequestSchema.index({ userId: 1, status: 1, createdAt: -1 });
SessionRequestSchema.index({ userId: 1, date: 1, status: 1 }); // For overlap checking
SessionRequestSchema.index({ subscriptionId: 1, status: 1 });
SessionRequestSchema.index({ status: 1, createdAt: -1 });
SessionRequestSchema.index({ date: 1, status: 1 }); // For reception queries

// Virtual to calculate end time
SessionRequestSchema.virtual('endTime').get(function() {
  if (!this.startTime || !this.durationHours) return null;
  
  const [hours, minutes] = this.startTime.split(':').map(Number);
  const startTotalMinutes = hours * 60 + minutes;
  const endTotalMinutes = startTotalMinutes + (this.durationHours * 60);
  
  const endHours = Math.floor(endTotalMinutes / 60);
  const endMins = endTotalMinutes % 60;
  
  return `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;
});

module.exports = mongoose.model('SessionRequest', SessionRequestSchema);
