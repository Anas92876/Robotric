const mongoose = require('mongoose');

const QuizAttemptSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Student is required']
  },
  quiz: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz',
    required: [true, 'Quiz is required']
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: [true, 'Course is required']
  },
  attemptNumber: {
    type: Number,
    required: [true, 'Attempt number is required'],
    min: [1, 'Attempt number must be at least 1']
  },
  answers: [{
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    questionText: {
      type: String
    },
    selectedOptions: [{
      type: Number // Index of selected option(s)
    }],
    isCorrect: {
      type: Boolean,
      default: false
    },
    pointsEarned: {
      type: Number,
      default: 0
    }
  }],
  score: {
    type: Number, // Percentage
    min: [0, 'Score cannot be negative'],
    max: [100, 'Score cannot exceed 100']
  },
  totalPoints: {
    type: Number,
    default: 0,
    min: [0, 'Total points cannot be negative']
  },
  earnedPoints: {
    type: Number,
    default: 0,
    min: [0, 'Earned points cannot be negative']
  },
  passed: {
    type: Boolean,
    default: false
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  submittedAt: {
    type: Date,
    default: null
  },
  timeSpent: {
    type: Number, // in seconds
    default: 0,
    min: [0, 'Time spent cannot be negative']
  },
  status: {
    type: String,
    enum: ['in_progress', 'submitted', 'expired'],
    default: 'in_progress'
  }
}, {
  timestamps: true
});

// Index for faster queries
QuizAttemptSchema.index({ student: 1, quiz: 1, attemptNumber: 1 }, { unique: true });
QuizAttemptSchema.index({ student: 1, course: 1 });
QuizAttemptSchema.index({ quiz: 1, status: 1 });

// Method to calculate score
QuizAttemptSchema.methods.calculateScore = function() {
  if (this.totalPoints > 0) {
    this.score = Math.round((this.earnedPoints / this.totalPoints) * 100);
  } else {
    this.score = 0;
  }
};

// Method to check if passed
QuizAttemptSchema.methods.checkPassed = function(passingScore) {
  this.passed = this.score >= passingScore;
};

// Method to mark as submitted
QuizAttemptSchema.methods.markAsSubmitted = function() {
  this.status = 'submitted';
  this.submittedAt = new Date();

  // Calculate time spent
  if (this.startedAt) {
    this.timeSpent = Math.floor((this.submittedAt - this.startedAt) / 1000); // in seconds
  }
};

// Static method to get attempt count
QuizAttemptSchema.statics.getAttemptCount = async function(studentId, quizId) {
  return await this.countDocuments({
    student: studentId,
    quiz: quizId,
    status: 'submitted'
  });
};

// Static method to get best score
QuizAttemptSchema.statics.getBestScore = async function(studentId, quizId) {
  const result = await this.aggregate([
    {
      $match: {
        student: new mongoose.Types.ObjectId(studentId),
        quiz: new mongoose.Types.ObjectId(quizId),
        status: 'submitted'
      }
    },
    {
      $group: {
        _id: null,
        bestScore: { $max: '$score' }
      }
    }
  ]);

  return result.length > 0 ? result[0].bestScore : null;
};

module.exports = mongoose.model('QuizAttempt', QuizAttemptSchema);
