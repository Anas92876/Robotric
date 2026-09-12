/**
 * EvaluationCriteria Model
 *
 * Represents evaluation parameters/criteria that CLO configures
 * Can be applied to a course (all groups) or specific groups
 *
 * @model EvaluationCriteria
 * @description Manages dynamic evaluation criteria configured by CLO
 * @version 1.0.0
 */

const mongoose = require('mongoose');

const EvaluationCriteriaSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: [true, 'Criteria name is required'],
    trim: true,
    maxlength: [200, 'Name cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },

  // Application Scope
  appliesTo: {
    type: String,
    enum: ['course', 'groups'],
    required: true,
    default: 'course'
  },

  // References — multi-course support
  courseIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  }],

  // If appliesTo is 'groups', specify which groups
  groupIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group'
  }],

  // Created by CLO
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Evaluation Parameters
  parameters: [{
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: [100, 'Parameter name cannot exceed 100 characters']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [200, 'Parameter description cannot exceed 200 characters']
    },
    type: {
      type: String,
      enum: ['rating', 'percentage', 'grade', 'boolean', 'text'],
      required: true,
      default: 'rating'
    },
    // For rating type
    ratingScale: {
      min: {
        type: Number,
        default: 1
      },
      max: {
        type: Number,
        default: 5
      },
      labels: {
        type: Map,
        of: String // e.g., { "1": "Poor", "5": "Excellent" }
      }
    },
    // Weight in overall calculation (%)
    weight: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    required: {
      type: Boolean,
      default: true
    },
    order: {
      type: Number,
      default: 0
    }
  }],

  // Overall rating configuration
  includeOverallRating: {
    type: Boolean,
    default: true
  },
  overallRatingScale: {
    min: {
      type: Number,
      default: 1
    },
    max: {
      type: Number,
      default: 5
    }
  },

  // Status
  status: {
    type: String,
    enum: ['active', 'inactive', 'archived'],
    default: 'active',
    index: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
EvaluationCriteriaSchema.index({ courseIds: 1, status: 1 });
EvaluationCriteriaSchema.index({ groupIds: 1, status: 1 });
EvaluationCriteriaSchema.index({ createdBy: 1 });

// Virtual: Get total weight
EvaluationCriteriaSchema.virtual('totalWeight').get(function() {
  return this.parameters.reduce((sum, param) => sum + (param.weight || 0), 0);
});

// Method: Validate weights sum to 100 if using weighted calculation
EvaluationCriteriaSchema.methods.validateWeights = function() {
  const total = this.totalWeight;
  if (total > 0 && total !== 100) {
    throw new Error(`Parameter weights must sum to 100%, current total: ${total}%`);
  }
  return true;
};

// Static: Get criteria for a specific group
EvaluationCriteriaSchema.statics.getCriteriaForGroup = async function(groupId, courseId) {
  const groupCriteria = await this.findOne({
    appliesTo: 'groups',
    groupIds: groupId,
    status: 'active'
  }).sort({ updatedAt: -1 });

  if (groupCriteria) return groupCriteria;

  // Course-level: criteria that includes this courseId in their courseIds array
  const courseCriteria = await this.findOne({
    appliesTo: 'course',
    courseIds: courseId,
    status: 'active'
  }).sort({ updatedAt: -1 });

  if (courseCriteria) return courseCriteria;

  // If this course is a sub-course of a "bucket"/bundle course, also check
  // for course-level criteria configured on that parent bundle.
  const Course = mongoose.model('Course');
  const course = await Course.findById(courseId).select('parentBundle');
  if (course?.parentBundle) {
    return await this.findOne({
      appliesTo: 'course',
      courseIds: course.parentBundle,
      status: 'active'
    }).sort({ updatedAt: -1 });
  }

  return null;
};

// Static: Get criteria for a course
EvaluationCriteriaSchema.statics.getCriteriaForCourse = async function(courseId) {
  return await this.findOne({
    appliesTo: 'course',
    courseIds: courseId,
    status: 'active'
  }).sort({ updatedAt: -1 });
};

// Pre-save validation
EvaluationCriteriaSchema.pre('save', function(next) {
  if (!this.courseIds || this.courseIds.length === 0) {
    return next(new Error('At least one course must be specified'));
  }

  // If appliesTo is 'course', clear groupIds
  if (this.appliesTo === 'course') {
    this.groupIds = [];
  }

  // If appliesTo is 'groups', ensure groupIds is not empty
  if (this.appliesTo === 'groups' && (!this.groupIds || this.groupIds.length === 0)) {
    return next(new Error('At least one group must be specified when appliesTo is "groups"'));
  }

  // Sort parameters by order
  if (this.parameters && this.parameters.length > 0) {
    this.parameters.sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  next();
});

module.exports = mongoose.model('EvaluationCriteria', EvaluationCriteriaSchema);
