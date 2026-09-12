/**
 * TaskSubmission Model
 * 
 * Represents a student's submission for a task.
 * Supports different answer types: MCQ, text, or image.
 */

const mongoose = require('mongoose');

const imageAnswerSchema = new mongoose.Schema({
  cloudinaryUrl: {
    type: String,
    required: [true, 'Cloudinary URL is required']
  },
  cloudinaryPublicId: {
    type: String,
    required: [true, 'Cloudinary public ID is required']
  },
  filename: {
    type: String,
    trim: true
  },
  size: {
    type: Number,
    min: [0, 'Size cannot be negative']
  },
  mimeType: {
    type: String
  }
}, { _id: false });

const answerSchema = new mongoose.Schema({
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'Question ID is required']
  },
  answerType: {
    type: String,
    enum: ['mcq', 'image', 'text'],
    required: [true, 'Answer type is required']
  },
  // For MCQ type:
  selectedAnswers: [{
    type: Number,
    min: [0, 'Selected answer index cannot be negative']
  }],
  // For text type:
  textAnswer: {
    type: String,
    trim: true
  },
  // For image type:
  imageAnswers: [imageAnswerSchema]
}, { _id: false });

const attachedFileSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  originalName: { type: String },
  size: { type: Number },
  mimeType: { type: String },
  storagePath: { type: String, required: true }, // Supabase storage path
  storageBucket: { type: String, default: 'resources' }
}, { _id: true });

const TaskSubmissionSchema = new mongoose.Schema({
  taskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    required: [true, 'Task is required'],
    index: true
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Student is required'],
    index: true
  },
  answers: [answerSchema],
  attachedFiles: [attachedFileSchema],
  submittedAt: {
    type: Date,
    required: [true, 'Submission date is required'],
    default: Date.now
  },
  isLate: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['not_submitted', 'pending_review', 'graded', 'returned'],
    default: 'not_submitted',
    index: true
  },
  score: {
    type: Number,
    min: [0, 'Score cannot be negative']
  },
  feedback: {
    type: String,
    trim: true,
    maxlength: [5000, 'Feedback cannot exceed 5000 characters']
  },
  gradedAt: {
    type: Date
  },
  gradedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Compound unique index: one submission per student per task
TaskSubmissionSchema.index({ taskId: 1, studentId: 1 }, { unique: true });
TaskSubmissionSchema.index({ studentId: 1, status: 1 });

// Validation: Answer must match question's answerType
TaskSubmissionSchema.pre('validate', function(next) {
  // This validation will be done in the controller where we have access to the Task
  next();
});

module.exports = mongoose.model('TaskSubmission', TaskSubmissionSchema);
