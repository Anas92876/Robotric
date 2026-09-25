/**
 * Group Model
 *
 * Represents a student group/class managed by a trainer.
 * Groups are used to organize students for courses and sessions.
 *
 * @model Group
 * @description Manages student groups with schedules, enrollment, and progress tracking
 */

const mongoose = require('mongoose');

const GroupSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: [true, 'Group name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },

  // References
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: [true, 'Course is required']
  },
  trainerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Trainer is required'],
    index: true
  },

  // Student Enrollment
  students: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  maxStudents: {
    type: Number,
    default: 30,
    min: [1, 'Max students must be at least 1'],
    max: [100, 'Max students cannot exceed 100']
  },

  // Schedule Configuration
  schedule: [{
    day: {
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      required: true
    },
    startTime: {
      type: String, // Format: "14:00" (24-hour)
      required: true,
      validate: {
        validator: function(v) {
          return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
        },
        message: props => `${props.value} is not a valid time format! Use HH:MM`
      }
    },
    endTime: {
      type: String, // Format: "16:00" (24-hour)
      required: true,
      validate: {
        validator: function(v) {
          return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
        },
        message: props => `${props.value} is not a valid time format! Use HH:MM`
      }
    },
    location: {
      type: String,
      trim: true,
      maxlength: [200, 'Location cannot exceed 200 characters']
    }
  }],

  // Date Range
  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required'],
    validate: {
      validator: function(value) {
        return value > this.startDate;
      },
      message: 'End date must be after start date'
    }
  },

  // Status
  status: {
    type: String,
    enum: ['active', 'completed', 'archived', 'cancelled'],
    default: 'active',
    index: true
  },

  // Feature flags — toggled by CLO per group
  boardEnabled: {
    type: Boolean,
    default: false,
  },

  // Visual
  thumbnail: {
    type: String,
    default: null
  },
  color: {
    type: String,
    default: '#30c59b', // Primary color from design system
    validate: {
      validator: function(v) {
        return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(v);
      },
      message: 'Invalid color format. Use hex color (e.g., #30c59b)'
    }
  },

  // Session numbering (for groups that continue from a specific session)
  startingSessionNumber: {
    type: Number,
    default: 1,
    min: 1,
    required: false
  },

  // Progress Tracking
  progress: {
    completedSessions: {
      type: Number,
      default: 0,
      min: 0
    },
    totalSessions: {
      type: Number,
      default: 0,
      min: 0
    },
    percentageComplete: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    }
  },

  // Statistics
  stats: {
    averageAttendance: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    averagePerformance: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    totalAssignments: {
      type: Number,
      default: 0,
      min: 0
    },
    totalQuizzes: {
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

// Indexes for performance optimization
GroupSchema.index({ trainerId: 1, status: 1 });
GroupSchema.index({ courseId: 1 });
GroupSchema.index({ startDate: 1, endDate: 1 });
GroupSchema.index({ 'schedule.day': 1 });

// Virtual: Check if group is full
GroupSchema.virtual('isFull').get(function() {
  return (this.students?.length || 0) >= this.maxStudents;
});

// Virtual: Get number of enrolled students
GroupSchema.virtual('enrolledCount').get(function() {
  return this.students?.length || 0;
});

// Virtual: Check if group is currently active (within date range)
GroupSchema.virtual('isCurrentlyActive').get(function() {
  const now = new Date();
  return this.status === 'active' &&
         now >= this.startDate &&
         now <= this.endDate;
});

// Virtual: Get available seats
GroupSchema.virtual('availableSeats').get(function() {
  return Math.max(0, this.maxStudents - (this.students?.length || 0));
});

// Method: Add student to group
GroupSchema.methods.addStudent = function(studentId) {
  if (!this.students) this.students = [];
  if (this.isFull) {
    throw new Error('Group is full');
  }
  if (this.students.includes(studentId)) {
    throw new Error('Student already enrolled in this group');
  }
  this.students.push(studentId);
  return this.save();
};

// Method: Remove student from group
GroupSchema.methods.removeStudent = function(studentId) {
  if (!this.students) this.students = [];
  this.students = this.students.filter(
    id => id.toString() !== studentId.toString()
  );
  return this.save();
};

// Method: Update progress
GroupSchema.methods.updateProgress = function() {
  if (this.progress.totalSessions > 0) {
    this.progress.percentageComplete = Math.round(
      (this.progress.completedSessions / this.progress.totalSessions) * 100
    );
  } else {
    this.progress.percentageComplete = 0;
  }
  return this.save();
};

// Method: Update statistics
GroupSchema.methods.updateStats = async function() {
  const Session = mongoose.model('Session');
  const Attendance = mongoose.model('Attendance');

  try {
    // Get all sessions for this group
    const sessions = await Session.find({ groupId: this._id });

    // Calculate average attendance
    let totalAttendance = 0;
    let sessionCount = 0;

    for (const session of sessions) {
      const attendance = await Attendance.findOne({
        course: this.courseId,
        'session.date': session.scheduledDate
      });

      if (attendance && attendance.records.length > 0) {
        const presentCount = attendance.records.filter(
          r => r.status === 'present' || r.status === 'late'
        ).length;
        const attendanceRate = (presentCount / attendance.records.length) * 100;
        totalAttendance += attendanceRate;
        sessionCount++;
      }
    }

    if (sessionCount > 0) {
      this.stats.averageAttendance = Math.round(totalAttendance / sessionCount);
    }

    return this.save();
  } catch (error) {
    console.error('Error updating group stats:', error);
    throw error;
  }
};

// Static method: Get trainer's groups
GroupSchema.statics.getTrainerGroups = function(trainerId, filters = {}) {
  const query = { trainerId, ...filters };
  return this.find(query)
    .populate('courseId', 'title category level')
    .populate('students', 'name email')
    .sort({ startDate: -1 });
};

// Static method: Get active groups for trainer
GroupSchema.statics.getActiveGroups = function(trainerId) {
  return this.getTrainerGroups(trainerId, { status: 'active' });
};

// Pre-save hook: Validate date range
GroupSchema.pre('save', function(next) {
  if (this.endDate <= this.startDate) {
    next(new Error('End date must be after start date'));
  }
  next();
});

// Pre-save hook: Update progress percentage
GroupSchema.pre('save', function(next) {
  if (this.isModified('progress.completedSessions') ||
      this.isModified('progress.totalSessions')) {
    if (this.progress.totalSessions > 0) {
      this.progress.percentageComplete = Math.round(
        (this.progress.completedSessions / this.progress.totalSessions) * 100
      );
    }
  }
  next();
});

module.exports = mongoose.model('Group', GroupSchema);
