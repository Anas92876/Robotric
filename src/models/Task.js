/**
 * Task Model
 * 
 * Represents a task/assignment created by a trainer for their group.
 * Tasks can have questions with different answer types: MCQ, text, or image.
 */

const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  questionText: {
    type: String,
    required: [true, 'Question text is required'],
    trim: true,
    maxlength: [2000, 'Question text cannot exceed 2000 characters']
  },
  questionTextAr: {
    type: String,
    trim: true,
    maxlength: [2000, 'Question text (Arabic) cannot exceed 2000 characters']
  },
  answerType: {
    type: String,
    enum: ['mcq', 'image', 'text'],
    required: [true, 'Answer type is required']
  },
  // For MCQ type:
  type: {
    type: String,
    enum: ['single_choice', 'multiple_choice']
  },
  options: [{
    type: String,
    trim: true,
    maxlength: [500, 'Option text cannot exceed 500 characters']
  }],
  // Correct answer indices for MCQ (used for auto-grading)
  correctAnswers: [{
    type: Number,
    min: [0, 'Correct answer index cannot be negative']
  }],
  // For all types:
  points: {
    type: Number,
    required: [true, 'Points are required'],
    min: [0, 'Points cannot be negative']
  },
  order: {
    type: Number,
    required: [true, 'Question order is required'],
    min: [0, 'Order cannot be negative']
  },
  required: {
    type: Boolean,
    default: false
  },
  // For text type:
  maxLength: {
    type: Number,
    min: [1, 'Max length must be at least 1']
  },
  // For image type:
  maxImages: {
    type: Number,
    default: 1,
    min: [1, 'Max images must be at least 1']
  },
  allowedImageTypes: [{
    type: String,
    enum: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  }],
  maxImageSize: {
    type: Number, // in MB
    min: [0.1, 'Max image size must be at least 0.1 MB']
  }
}, { _id: true });

const TaskSchema = new mongoose.Schema({
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: [true, 'Group is required']
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    index: true
  },
  // Optional link to a specific Session — when set, the task is surfaced
  // to students automatically when they open that session.
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session',
    default: null,
    index: true
  },
  // Multi-link variants (CLO tasks can span several sessions/groups/courses
  // at once). groupId/courseId/sessionId above stay populated with the first
  // value for backward compatibility — these arrays are the source of truth
  // for any task linked to more than one session.
  groupIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group'
  }],
  courseIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  }],
  sessionIds: {
    type: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Session'
    }],
    index: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Creator is required']
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  titleAr: {
    type: String,
    trim: true,
    maxlength: [200, 'Title (Arabic) cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [5000, 'Description cannot exceed 5000 characters']
  },
  descriptionAr: {
    type: String,
    trim: true,
    maxlength: [5000, 'Description (Arabic) cannot exceed 5000 characters']
  },
  deadline: {
    type: Date,
    required: [true, 'Deadline is required']
  },
  maxScore: {
    type: Number,
    default: 100,
    min: [0, 'Max score cannot be negative']
  },
  hasQuestions: {
    type: Boolean,
    default: false
  },
  questions: [questionSchema],
  allowLateSubmission: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['draft', 'open', 'closed'],
    default: 'open',
    index: true
  }
}, {
  timestamps: true
});

// Indexes
TaskSchema.index({ groupId: 1, status: 1 });
TaskSchema.index({ createdBy: 1 });
TaskSchema.index({ deadline: 1 });

// Validation: MCQ questions must have type and options
TaskSchema.pre('validate', function(next) {
  if (this.questions && this.questions.length > 0) {
    for (const question of this.questions) {
      if (question.answerType === 'mcq') {
        if (!question.type) {
          return next(new Error('MCQ questions must have a type (single_choice or multiple_choice)'));
        }
        if (!question.options || question.options.length < 2) {
          return next(new Error('MCQ questions must have at least 2 options'));
        }
      }
    }
  }
  next();
});

// Validation: Question order must be unique
TaskSchema.pre('save', function(next) {
  if (this.questions && this.questions.length > 0) {
    const orders = this.questions.map(q => q.order);
    const uniqueOrders = [...new Set(orders)];
    if (orders.length !== uniqueOrders.length) {
      return next(new Error('Question order must be unique'));
    }
  }
  next();
});

module.exports = mongoose.model('Task', TaskSchema);
