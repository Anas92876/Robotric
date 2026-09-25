const mongoose = require('mongoose');

const QuizSchema = new mongoose.Schema({
  session: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session',
    required: false
  },
  module: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Module',
    required: false
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: [true, 'Course is required']
  },
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: false
  },
  title: {
    type: String,
    required: [true, 'Quiz title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  instructions: {
    type: String,
    maxlength: [2000, 'Instructions cannot exceed 2000 characters']
  },
  passingScore: {
    type: Number,
    default: 70,
    min: [0, 'Passing score cannot be negative'],
    max: [100, 'Passing score cannot exceed 100']
  },
  timeLimit: {
    type: Number, // in minutes
    default: null,
    min: [1, 'Time limit must be at least 1 minute']
  },
  maxAttempts: {
    type: Number,
    default: 3,
    min: [1, 'Max attempts must be at least 1']
  },
  shuffleQuestions: {
    type: Boolean,
    default: false
  },
  shuffleOptions: {
    type: Boolean,
    default: false
  },
  showFeedback: {
    type: Boolean,
    default: true
  },
  questions: [{
    question: {
      type: String,
      required: [true, 'Question text is required'],
      maxlength: [1000, 'Question cannot exceed 1000 characters']
    },
    type: {
      type: String,
      enum: ['single', 'multiple'],
      default: 'single'
    },
    options: [{
      text: {
        type: String,
        required: [true, 'Option text is required'],
        maxlength: [500, 'Option text cannot exceed 500 characters']
      },
      isCorrect: {
        type: Boolean,
        default: false
      }
    }],
    points: {
      type: Number,
      default: 1,
      min: [0, 'Points cannot be negative']
    },
    explanation: {
      type: String,
      maxlength: [1000, 'Explanation cannot exceed 1000 characters']
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
QuizSchema.index({ session: 1 });
QuizSchema.index({ module: 1 });
QuizSchema.index({ course: 1 });
QuizSchema.index({ group: 1 });

// Virtual for total points
QuizSchema.virtual('totalPoints').get(function() {
  if (!this.questions || this.questions.length === 0) return 0;
  return this.questions.reduce((sum, q) => sum + (q.points || 0), 0);
});

// Virtual for total questions
QuizSchema.virtual('totalQuestions').get(function() {
  return this.questions ? this.questions.length : 0;
});

// Method to validate quiz structure
QuizSchema.methods.validateQuestions = function() {
  const errors = [];

  this.questions.forEach((question, index) => {
    // Check if question has options
    if (!question.options || question.options.length < 2) {
      errors.push(`Question ${index + 1} must have at least 2 options`);
    }

    // Check if at least one option is correct
    const correctCount = question.options.filter(opt => opt.isCorrect).length;
    if (correctCount === 0) {
      errors.push(`Question ${index + 1} must have at least one correct answer`);
    }

    // For single choice, ensure only one correct answer
    if (question.type === 'single' && correctCount > 1) {
      errors.push(`Question ${index + 1} is single choice but has multiple correct answers`);
    }
  });

  return errors;
};

// Pre-save validation
QuizSchema.pre('save', function(next) {
  const errors = this.validateQuestions();
  if (errors.length > 0) {
    return next(new Error(errors.join('; ')));
  }
  next();
});

module.exports = mongoose.model('Quiz', QuizSchema);
