const mongoose = require('mongoose');

const CourseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Course title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Course description is required'],
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  instructor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  duration: {
    type: String,
    required: [true, 'Duration is required'],
    trim: true
  },
  totalHours: {
    type: Number,
    required: false,
    min: [0, 'Total hours cannot be negative'],
    default: 0
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative']
  },
  thumbnail: {
    type: String,
    default: null
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    trim: true
  },
  level: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced', 'Beginner', 'Intermediate', 'Advanced'],
    required: [true, 'Level is required']
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  startDate: {
    type: Date,
    default: null
  },
  endDate: {
    type: Date,
    default: null
  },
  maxStudents: {
    type: Number,
    default: null,
    min: [1, 'Maximum students must be at least 1']
  },
  enrolledStudents: {
    type: Number,
    default: 0,
    min: [0, 'Enrolled students cannot be negative']
  },
  modules: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Module'
  }],
  syllabus: [{
    title: String,
    description: String,
    duration: Number,
    order: Number
  }],
  prerequisites: [{
    type: String,
    trim: true
  }],
  objectives: [{
    type: String,
    trim: true
  }],
  learningOutcomes: [{
    type: String,
    trim: true
  }],
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  wroDocumentsRequired: {
    type: Boolean,
    default: false
  },

  // Bundle / multi-course package support
  type: {
    type: String,
    enum: ['single', 'bundle'],
    default: 'single'
  },
  bundleCourses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  }],
  bundlePrice: {
    type: Number,
    default: null,
    min: [0, 'Bundle price cannot be negative']
  },
  parentBundle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    default: null
  }
}, {
  timestamps: true
});

// Index for faster queries
CourseSchema.index({ instructor: 1, status: 1 });
CourseSchema.index({ category: 1, level: 1 });
CourseSchema.index({ title: 'text', description: 'text' });
CourseSchema.index({ parentBundle: 1 });
CourseSchema.index({ type: 1 });

// Virtual for checking if course is full
CourseSchema.virtual('isFull').get(function() {
  if (!this.maxStudents) return false;
  return this.enrolledStudents >= this.maxStudents;
});

// Virtual for total modules count
CourseSchema.virtual('totalModules').get(function() {
  return this.modules ? this.modules.length : 0;
});

module.exports = mongoose.model('Course', CourseSchema);
