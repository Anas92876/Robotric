const mongoose = require('mongoose');

const AssignmentSubmissionSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Student is required']
  },
  assignment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Assignment',
    required: [true, 'Assignment is required']
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: [true, 'Course is required']
  },
  files: [{
    filename: {
      type: String,
      required: true
    },
    originalName: {
      type: String,
      required: true
    },
    fileUrl: {
      type: String,
      required: true
    },
    fileType: {
      type: String,
      required: true
    },
    fileSize: {
      type: Number, // in bytes
      required: true
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  submittedAt: {
    type: Date,
    default: Date.now
  },
  isLate: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['submitted', 'grading', 'graded', 'returned', 'resubmit_required'],
    default: 'submitted'
  },
  grade: {
    score: {
      type: Number,
      default: null,
      min: [0, 'Score cannot be negative']
    },
    feedback: {
      type: String,
      maxlength: [2000, 'Feedback cannot exceed 2000 characters']
    },
    rubricScores: [{
      criteriaId: {
        type: mongoose.Schema.Types.ObjectId
      },
      pointsEarned: {
        type: Number,
        min: [0, 'Points earned cannot be negative']
      }
    }],
    gradedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    gradedAt: {
      type: Date
    }
  },
  resubmission: {
    allowed: {
      type: Boolean,
      default: false
    },
    count: {
      type: Number,
      default: 0,
      min: [0, 'Resubmission count cannot be negative']
    },
    deadline: {
      type: Date,
      default: null
    }
  },
  comments: [{
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    text: {
      type: String,
      required: true,
      maxlength: [1000, 'Comment cannot exceed 1000 characters']
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  version: {
    type: Number,
    default: 1,
    min: [1, 'Version must be at least 1']
  }
}, {
  timestamps: true
});

// Compound index to track submissions
AssignmentSubmissionSchema.index({ student: 1, assignment: 1, version: 1 });
AssignmentSubmissionSchema.index({ assignment: 1, status: 1 });
AssignmentSubmissionSchema.index({ student: 1, course: 1 });
AssignmentSubmissionSchema.index({ student: 1, assignment: 1, status: 1 });

// Virtual to calculate percentage
AssignmentSubmissionSchema.virtual('percentage').get(function() {
  if (this.grade && this.grade.score !== null && this.assignment && this.assignment.maxScore) {
    return Math.round((this.grade.score / this.assignment.maxScore) * 100);
  }
  return null;
});

// Method to add comment
AssignmentSubmissionSchema.methods.addComment = function(authorId, text) {
  this.comments.push({
    author: authorId,
    text: text,
    createdAt: new Date()
  });
};

// Method to grade submission
AssignmentSubmissionSchema.methods.gradeSubmission = function(score, feedback, gradedBy) {
  this.status = 'graded';
  this.grade = {
    score: score,
    feedback: feedback,
    gradedBy: gradedBy,
    gradedAt: new Date()
  };
};

// Static method to get latest submission
AssignmentSubmissionSchema.statics.getLatestSubmission = async function(studentId, assignmentId) {
  return await this.findOne({
    student: studentId,
    assignment: assignmentId
  }).sort({ version: -1 });
};

// Static method to count submissions
AssignmentSubmissionSchema.statics.countSubmissions = async function(studentId, assignmentId) {
  return await this.countDocuments({
    student: studentId,
    assignment: assignmentId
  });
};

module.exports = mongoose.model('AssignmentSubmission', AssignmentSubmissionSchema);
