const mongoose = require('mongoose');

const ModuleProgressSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Student is required']
  },
  module: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Module',
    required: [true, 'Module is required']
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: [true, 'Course is required']
  },
  status: {
    type: String,
    enum: ['not_started', 'in_progress', 'completed'],
    default: 'not_started'
  },
  startedAt: {
    type: Date,
    default: null
  },
  completedAt: {
    type: Date,
    default: null
  },
  timeSpent: {
    type: Number, // in seconds
    default: 0,
    min: [0, 'Time spent cannot be negative']
  },
  lastAccessedAt: {
    type: Date,
    default: Date.now
  },
  videoProgress: {
    currentTime: {
      type: Number, // in seconds
      default: 0
    },
    duration: {
      type: Number, // in seconds
      default: 0
    },
    completed: {
      type: Boolean,
      default: false
    }
  },
  notes: {
    type: String,
    maxlength: [5000, 'Notes cannot exceed 5000 characters']
  }
}, {
  timestamps: true
});

// Compound index to ensure one progress record per student per module
ModuleProgressSchema.index({ student: 1, module: 1, course: 1 }, { unique: true });
ModuleProgressSchema.index({ student: 1, course: 1, status: 1 });
ModuleProgressSchema.index({ module: 1, status: 1 });

// Method to mark module as started
ModuleProgressSchema.methods.markAsStarted = function() {
  if (this.status === 'not_started') {
    this.status = 'in_progress';
    this.startedAt = new Date();
  }
  this.lastAccessedAt = new Date();
};

// Method to mark module as completed
ModuleProgressSchema.methods.markAsCompleted = function() {
  this.status = 'completed';
  this.completedAt = new Date();
  this.lastAccessedAt = new Date();
};

// Method to update time spent
ModuleProgressSchema.methods.addTimeSpent = function(seconds) {
  this.timeSpent += seconds;
  this.lastAccessedAt = new Date();
};

// Static method to get or create progress
ModuleProgressSchema.statics.getOrCreate = async function(studentId, moduleId, courseId) {
  let progress = await this.findOne({
    student: studentId,
    module: moduleId,
    course: courseId
  });

  if (!progress) {
    progress = await this.create({
      student: studentId,
      module: moduleId,
      course: courseId,
      status: 'not_started'
    });
  }

  return progress;
};

module.exports = mongoose.model('ModuleProgress', ModuleProgressSchema);
