const mongoose = require('mongoose');

const ModuleSchema = new mongoose.Schema({
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: [true, 'Course is required']
  },
  title: {
    type: String,
    required: [true, 'Module title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  order: {
    type: Number,
    required: [true, 'Module order is required'],
    min: [1, 'Order must be at least 1']
  },
  type: {
    type: String,
    enum: ['video', 'pdf', 'text', 'quiz', 'assignment', 'live_session'],
    required: [true, 'Module type is required']
  },
  content: {
    videoUrl: {
      type: String,
      default: null
    },
    videoDuration: {
      type: Number, // in seconds
      default: null
    },
    pdfUrl: {
      type: String,
      default: null
    },
    textContent: {
      type: String,
      default: null
    },
    duration: {
      type: Number, // estimated time in minutes
      default: null
    }
  },
  resources: [{
    title: {
      type: String,
      trim: true
    },
    url: {
      type: String
    },
    type: {
      type: String,
      enum: ['link', 'file', 'document']
    }
  }],
  isLocked: {
    type: Boolean,
    default: false
  },
  unlockAfter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Module',
    default: null
  },
  quiz: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz',
    default: null
  },
  assignment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Assignment',
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },

  // ========== Face-to-Face Session Fields ==========
  // These fields are specifically for live_session type modules

  session: {
    // The scheduled date and time for the session
    date: {
      type: Date,
      default: null
    },
    // Start time (e.g., "10:00 AM")
    startTime: {
      type: String,
      trim: true,
      default: null
    },
    // End time (e.g., "12:00 PM")
    endTime: {
      type: String,
      trim: true,
      default: null
    },
    // Physical location (e.g., "Lab Room 101", "Building A - Floor 2")
    location: {
      type: String,
      trim: true,
      default: null
    },
    // Instructor notes or special instructions for this session
    instructorNotes: {
      type: String,
      maxlength: [500, 'Instructor notes cannot exceed 500 characters'],
      default: null
    },
    // Link to the attendance record for this session
    attendanceRecord: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Attendance',
      default: null
    }
  }
}, {
  timestamps: true
});

// ========== Indexes for Performance ==========
ModuleSchema.index({ course: 1, order: 1 });
ModuleSchema.index({ course: 1, type: 1 });
ModuleSchema.index({ 'session.date': 1 }); // Index for querying sessions by date

// ========== Virtual Properties ==========

/**
 * Check if this is a face-to-face session
 */
ModuleSchema.virtual('isSession').get(function() {
  return this.type === 'live_session';
});

/**
 * Get the session status based on current date/time
 * Returns: 'upcoming', 'ongoing', 'completed', 'cancelled'
 */
ModuleSchema.virtual('sessionStatus').get(function() {
  // Only applicable for live sessions
  if (!this.isSession || !this.session.date) {
    return null;
  }

  const now = new Date();
  const sessionDate = new Date(this.session.date);

  // If session date is in the future -> upcoming
  if (sessionDate > now) {
    return 'upcoming';
  }

  // If session date is in the past -> completed
  // (We'll mark as completed after the session end time)
  return 'completed';
});

/**
 * Check if the session has started
 */
ModuleSchema.virtual('hasStarted').get(function() {
  if (!this.isSession || !this.session.date) {
    return false;
  }
  return new Date() >= new Date(this.session.date);
});

/**
 * Get days until session (for upcoming sessions)
 */
ModuleSchema.virtual('daysUntilSession').get(function() {
  if (!this.isSession || !this.session.date) {
    return null;
  }

  const now = new Date();
  const sessionDate = new Date(this.session.date);
  const diffTime = sessionDate - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays > 0 ? diffDays : 0;
});

// ========== Instance Methods ==========

/**
 * Check if a student can access this module's content
 * @param {Date} currentDate - Current date/time
 * @returns {Boolean}
 */
ModuleSchema.methods.canAccess = function(currentDate = new Date()) {
  // If module is locked, can't access
  if (this.isLocked) {
    return false;
  }

  // For live sessions, content becomes available after the session date
  if (this.isSession && this.session.date) {
    return currentDate >= new Date(this.session.date);
  }

  // For other types, accessible immediately
  return true;
};

/**
 * Check if quiz/assignment should be available
 * @param {Date} currentDate - Current date/time
 * @returns {Boolean}
 */
ModuleSchema.methods.canAccessQuiz = function(currentDate = new Date()) {
  // Quiz becomes available after session has started
  if (this.isSession && this.session.date) {
    return currentDate >= new Date(this.session.date);
  }
  return true;
};

// ========== Static Methods ==========

/**
 * Get next module in course order
 */
ModuleSchema.statics.getNextModule = async function(courseId, currentOrder) {
  return await this.findOne({
    course: courseId,
    order: { $gt: currentOrder },
    isActive: true
  }).sort({ order: 1 });
};

/**
 * Get previous module in course order
 */
ModuleSchema.statics.getPreviousModule = async function(courseId, currentOrder) {
  return await this.findOne({
    course: courseId,
    order: { $lt: currentOrder },
    isActive: true
  }).sort({ order: -1 });
};

/**
 * Get upcoming sessions for a course
 * @param {ObjectId} courseId
 * @param {Number} limit - Number of sessions to return
 */
ModuleSchema.statics.getUpcomingSessions = async function(courseId, limit = 10) {
  const now = new Date();
  return await this.find({
    course: courseId,
    type: 'live_session',
    'session.date': { $gte: now },
    isActive: true
  })
    .sort({ 'session.date': 1 })
    .limit(limit);
};

/**
 * Get past sessions for a course
 * @param {ObjectId} courseId
 * @param {Number} limit - Number of sessions to return
 */
ModuleSchema.statics.getPastSessions = async function(courseId, limit = 10) {
  const now = new Date();
  return await this.find({
    course: courseId,
    type: 'live_session',
    'session.date': { $lt: now },
    isActive: true
  })
    .sort({ 'session.date': -1 })
    .limit(limit);
};

// ========== Export Model ==========
module.exports = mongoose.model('Module', ModuleSchema);
