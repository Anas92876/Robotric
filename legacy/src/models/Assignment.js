const mongoose = require('mongoose');

const AssignmentSchema = new mongoose.Schema({
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
  title: {
    type: String,
    required: [true, 'Assignment title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Assignment description is required'],
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  instructions: {
    type: String,
    maxlength: [5000, 'Instructions cannot exceed 5000 characters']
  },
  dueDate: {
    type: Date,
    required: [true, 'Due date is required']
  },
  maxScore: {
    type: Number,
    default: 100,
    min: [0, 'Max score cannot be negative']
  },
  allowedFileTypes: [{
    type: String,
    enum: ['pdf', 'doc', 'docx', 'txt', 'jpg', 'jpeg', 'png', 'zip', 'rar']
  }],
  maxFileSize: {
    type: Number, // in MB
    default: 5,
    min: [1, 'Max file size must be at least 1 MB']
  },
  maxFiles: {
    type: Number,
    default: 5,
    min: [1, 'Max files must be at least 1']
  },
  allowLateSubmission: {
    type: Boolean,
    default: false
  },
  lateSubmissionDeadline: {
    type: Date,
    default: null
  },
  latePenalty: {
    type: Number, // Percentage deduction
    default: 0,
    min: [0, 'Late penalty cannot be negative'],
    max: [100, 'Late penalty cannot exceed 100']
  },
  resources: [{
    title: {
      type: String,
      trim: true
    },
    url: {
      type: String
    }
  }],
  rubric: [{
    criteria: {
      type: String,
      required: true
    },
    points: {
      type: Number,
      required: true,
      min: [0, 'Points cannot be negative']
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for faster queries
AssignmentSchema.index({ module: 1 });
AssignmentSchema.index({ course: 1 });
AssignmentSchema.index({ dueDate: 1 });

// Virtual to check if assignment is overdue
AssignmentSchema.virtual('isOverdue').get(function() {
  return new Date() > this.dueDate;
});

// Method to check if file type is allowed
AssignmentSchema.methods.isFileTypeAllowed = function(fileType) {
  if (!this.allowedFileTypes || this.allowedFileTypes.length === 0) {
    return true; // All types allowed if none specified
  }
  return this.allowedFileTypes.includes(fileType.toLowerCase());
};

// Method to check if submission is late
AssignmentSchema.methods.isSubmissionLate = function(submissionDate) {
  return new Date(submissionDate) > this.dueDate;
};

module.exports = mongoose.model('Assignment', AssignmentSchema);
