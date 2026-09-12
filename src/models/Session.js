/**
 * Session Model
 *
 * Represents a training session/class scheduled by a trainer.
 * Sessions include lesson plans, schedules, and tracking information.
 *
 * @model Session
 * @description Manages training sessions with lesson planning and execution tracking
 */

const mongoose = require('mongoose');

const SessionSchema = new mongoose.Schema({
  // References
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: [true, 'Group is required']
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: false, // Optional - can be null if group doesn't have a course
    default: null
  },
  trainerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Trainer is required'],
    index: true
  },

  // Basic Information
  title: {
    type: String,
    required: [true, 'Session title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  sessionNumber: {
    type: Number,
    min: 1,
    default: null // Auto-calculated based on group sessions count
  },

  // Schedule - Auto-populated from group schedule (can be overridden per session)
  overrideSchedule: {
    type: Boolean,
    default: false,
    index: true
  },

  // When overrideSchedule === false, these are auto-populated from group schedule.
  // When overrideSchedule === true, they come from trainer's manual input.
  scheduledDate: {
    type: Date,
    required: false, // Will be auto-populated based on group schedule
    index: true
  },
  startTime: {
    type: String, // Format: "14:00" (24-hour) - Auto-populated from group schedule
    required: false, // Will be auto-populated from group
    validate: {
      validator: function(v) {
        if (!v) return true; // Allow empty
        return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
      },
      message: props => `${props.value} is not a valid time format! Use HH:MM`
    }
  },
  endTime: {
    type: String, // Format: "16:00" (24-hour) - Auto-populated from group schedule
    required: false, // Will be auto-populated from group
    validate: {
      validator: function(v) {
        if (!v) return true; // Allow empty
        return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
      },
      message: props => `${props.value} is not a valid time format! Use HH:MM`
    }
  },
  duration: {
    type: Number, // Duration in minutes
    required: true,
    min: [15, 'Duration must be at least 15 minutes'],
    max: [480, 'Duration cannot exceed 8 hours']
  },

  // Online meeting (optional)
  isOnline: {
    type: Boolean,
    default: false
  },
  meetingLink: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        if (!v) return true; // Optional field
        return /^https?:\/\/.+/.test(v);
      },
      message: 'Meeting link must be a valid URL'
    }
  },

  // Status
  status: {
    type: String,
    enum: ['scheduled', 'in_progress', 'completed', 'cancelled', 'rescheduled'],
    default: 'scheduled',
    index: true
  },
  cancellationReason: {
    type: String,
    trim: true,
    maxlength: [500, 'Cancellation reason cannot exceed 500 characters']
  },

  // Lesson Plan
  lessonPlan: {
    // Learning objectives for this session
    objectives: [{
      type: String,
      trim: true,
      maxlength: [300, 'Objective cannot exceed 300 characters']
    }],

    // Session outline/agenda
    outline: [{
      startTime: {
        type: String, // "14:00"
        required: true
      },
      endTime: {
        type: String, // "14:45"
        required: true
      },
      duration: {
        type: Number, // Duration in minutes
        required: true,
        min: 1
      },
      title: {
        type: String,
        required: true,
        trim: true,
        maxlength: [200, 'Outline title cannot exceed 200 characters']
      },
      description: {
        type: String,
        trim: true,
        maxlength: [1000, 'Outline description cannot exceed 1000 characters']
      },
      activities: [{
        type: String,
        trim: true,
        maxlength: [300, 'Activity cannot exceed 300 characters']
      }]
    }],

    // Materials needed for the session
    materialsNeeded: [{
      type: String,
      trim: true,
      maxlength: [200, 'Material description cannot exceed 200 characters']
    }],

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
        required: true
      },
      uploadedAt: {
        type: Date,
        default: Date.now
      }
    }],

    // Additional notes
    notes: {
      type: String,
      maxlength: [2000, 'Notes cannot exceed 2000 characters']
    }
  },

  // Session video (YouTube, stored securely — ID only, never sent to students)
  video: {
    hasVideo: { type: Boolean, default: false },
    youtubeId: { type: String, trim: true, default: '' }
  },

  // Related Records
  attendanceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Attendance',
    default: null
  },
  evaluationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SessionEvaluation',
    default: null
  },

  // Actual session timing (when started/ended)
  actualStartTime: {
    type: Date,
    default: null
  },
  actualEndTime: {
    type: Date,
    default: null
  },

  // Recurrence (for recurring sessions)
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurrenceRule: {
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'biweekly', 'monthly', 'none'],
      default: 'none'
    },
    interval: {
      type: Number, // Every X days/weeks/months
      default: 1,
      min: 1
    },
    endDate: {
      type: Date,
      default: null
    },
    occurrences: {
      type: Number, // Number of occurrences
      default: null,
      min: 1
    }
  },
  parentSessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session',
    default: null // For sessions created from recurrence
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
SessionSchema.index({ trainerId: 1, scheduledDate: 1 });
SessionSchema.index({ groupId: 1, scheduledDate: 1 });
SessionSchema.index({ courseId: 1 });
SessionSchema.index({ status: 1, scheduledDate: 1 });
SessionSchema.index({ scheduledDate: 1, startTime: 1 });

// Virtual: Get full date-time for scheduled start
SessionSchema.virtual('scheduledStartDateTime').get(function() {
  if (!this.scheduledDate || !this.startTime) return null;
  const [hours, minutes] = this.startTime.split(':');
  const date = new Date(this.scheduledDate);
  date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
  return date;
});

// Virtual: Get full date-time for scheduled end
SessionSchema.virtual('scheduledEndDateTime').get(function() {
  if (!this.scheduledDate || !this.endTime) return null;
  const [hours, minutes] = this.endTime.split(':');
  const date = new Date(this.scheduledDate);
  date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
  return date;
});

// Virtual: Check if session is today
SessionSchema.virtual('isToday').get(function() {
  if (!this.scheduledDate) return false;
  const today = new Date();
  const sessionDate = new Date(this.scheduledDate);
  return sessionDate.toDateString() === today.toDateString();
});

// Virtual: Check if session is upcoming (in the future)
SessionSchema.virtual('isUpcoming').get(function() {
  if (!this.scheduledStartDateTime) return false;
  return this.scheduledStartDateTime > new Date() && this.status === 'scheduled';
});

// Virtual: Check if session is past
SessionSchema.virtual('isPast').get(function() {
  if (!this.scheduledEndDateTime) return false;
  return this.scheduledEndDateTime < new Date();
});

// Virtual: Get actual duration (if session was completed)
SessionSchema.virtual('actualDuration').get(function() {
  if (!this.actualStartTime || !this.actualEndTime) return null;
  return Math.round((this.actualEndTime - this.actualStartTime) / (1000 * 60)); // Minutes
});

// Method: Get automatic status based on current time
SessionSchema.methods.getAutoStatus = function() {
  // Don't override cancelled status
  if (this.status === 'cancelled') {
    return 'cancelled';
  }

  const now = new Date();
  const startDateTime = this.scheduledStartDateTime;
  const endDateTime = this.scheduledEndDateTime;

  if (!startDateTime || !endDateTime) {
    return this.status; // Return current status if times aren't set
  }

  // Session has ended
  if (now > endDateTime) {
    return 'completed';
  }

  // Session is currently happening
  if (now >= startDateTime && now <= endDateTime) {
    return 'in_progress';
  }

  // Session hasn't started yet
  return 'scheduled';
};

// Method: Start session
SessionSchema.methods.startSession = function() {
  this.status = 'in_progress';
  this.actualStartTime = new Date();
  return this.save();
};

// Method: End session
SessionSchema.methods.endSession = function() {
  this.status = 'completed';
  this.actualEndTime = new Date();
  return this.save();
};

// Method: Cancel session
SessionSchema.methods.cancelSession = function(reason = '') {
  this.status = 'cancelled';
  this.cancellationReason = reason;
  return this.save();
};

// Method: Reschedule session
SessionSchema.methods.rescheduleSession = function(newDate, newStartTime, newEndTime) {
  this.scheduledDate = newDate;
  this.startTime = newStartTime;
  this.endTime = newEndTime;
  this.status = 'rescheduled';
  return this.save();
};

// Static method: Get trainer's sessions
SessionSchema.statics.getTrainerSessions = function(trainerId, filters = {}) {
  const query = { trainerId, ...filters };
  return this.find(query)
    .populate('groupId', 'name students')
    .populate('courseId', 'title category')
    .sort({ scheduledDate: 1, startTime: 1 });
};

// Static method: Get sessions by date range
SessionSchema.statics.getSessionsByDateRange = function(trainerId, startDate, endDate) {
  return this.find({
    trainerId,
    scheduledDate: {
      $gte: startDate,
      $lte: endDate
    }
  })
    .populate('groupId', 'name')
    .populate('courseId', 'title')
    .sort({ scheduledDate: 1, startTime: 1 });
};

// Static method: Get today's sessions
SessionSchema.statics.getTodaysSessions = function(trainerId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return this.find({
    trainerId,
    scheduledDate: {
      $gte: today,
      $lt: tomorrow
    },
    status: { $ne: 'cancelled' }
  })
    .populate('groupId', 'name students')
    .populate('courseId', 'title')
    .sort({ startTime: 1 });
};

// Static method: Get upcoming sessions
SessionSchema.statics.getUpcomingSessions = function(trainerId, limit = 10) {
  const now = new Date();
  return this.find({
    trainerId,
    scheduledDate: { $gte: now },
    status: 'scheduled'
  })
    .populate('groupId', 'name')
    .populate('courseId', 'title')
    .sort({ scheduledDate: 1, startTime: 1 })
    .limit(limit);
};

// Pre-save hook: Calculate duration from startTime/endTime (always recalculate when times are present)
SessionSchema.pre('save', function(next) {
  if (this.startTime && this.endTime) {
    const [startHours, startMinutes] = this.startTime.split(':').map(Number);
    const [endHours, endMinutes] = this.endTime.split(':').map(Number);

    const startTotalMinutes = startHours * 60 + startMinutes;
    const endTotalMinutes = endHours * 60 + endMinutes;

    this.duration = endTotalMinutes - startTotalMinutes;
  }
  next();
});

// Pre-save hook: Validate time range
SessionSchema.pre('save', function(next) {
  if (this.startTime && this.endTime) {
    const [startHours, startMinutes] = this.startTime.split(':').map(Number);
    const [endHours, endMinutes] = this.endTime.split(':').map(Number);

    const startTotalMinutes = startHours * 60 + startMinutes;
    const endTotalMinutes = endHours * 60 + endMinutes;

    if (endTotalMinutes <= startTotalMinutes) {
      return next(new Error('End time must be after start time'));
    }
  }
  next();
});

// Post-save hook: Update group progress when session is completed
SessionSchema.post('save', async function(doc) {
  if (doc.status === 'completed') {
    try {
      const Group = mongoose.model('Group');
      const group = await Group.findById(doc.groupId);

      if (group) {
        group.progress.completedSessions += 1;
        await group.updateProgress();
      }
    } catch (error) {
      console.error('Error updating group progress:', error);
    }
  }
});

module.exports = mongoose.model('Session', SessionSchema);
