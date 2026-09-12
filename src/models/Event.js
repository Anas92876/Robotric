const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Event title is required'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  startTime: {
    type: Date,
    required: [true, 'Start time is required']
  },
  endTime: {
    type: Date,
    required: [true, 'End time is required']
  },
  color: {
    type: String,
    default: 'blue',
    enum: ['blue', 'green', 'red', 'yellow', 'purple', 'gray']
  },
  participants: [{
    type: {
      type: String,
      enum: ['lead', 'custom', 'company'],
      required: true
    },
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead'
    },
    customName: {
      type: String,
      trim: true
    },
    customPhone: {
      type: String,
      trim: true
    },
    companyRole: {
      type: String,
      enum: ['CEO', 'CLO', 'CTO'],
      trim: true
    }
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Validate end time is after start time
eventSchema.pre('validate', function(next) {
  if (this.startTime && this.endTime && this.startTime >= this.endTime) {
    this.invalidate('endTime', 'End time must be after start time');
  }
  next();
});

module.exports = mongoose.model('Event', eventSchema);
