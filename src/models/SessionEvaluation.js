/**
 * SessionEvaluation Model
 *
 * Represents trainer's evaluation and feedback for a completed session.
 * Includes ratings, notes, challenges, and follow-up actions.
 *
 * @model SessionEvaluation
 * @description Manages post-session evaluations and feedback from trainers
 */

const mongoose = require('mongoose');

const SessionEvaluationSchema = new mongoose.Schema({
  // References
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session',
    required: [true, 'Session is required'],
    unique: true, // One evaluation per session
    index: true
  },
  trainerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Trainer is required'],
    index: true
  },
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: [true, 'Group is required'],
    index: true
  },

  // Overall Ratings
  overallRating: {
    type: Number,
    required: [true, 'Overall rating is required'],
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5'],
    validate: {
      validator: Number.isInteger,
      message: 'Rating must be a whole number'
    }
  },

  // Engagement Assessment
  engagementLevel: {
    type: String,
    enum: ['very_low', 'low', 'medium', 'high', 'very_high'],
    required: [true, 'Engagement level is required']
  },

  // Learning Objectives Achievement
  objectivesAchievement: {
    type: Number, // Percentage 0-100
    required: [true, 'Objectives achievement percentage is required'],
    min: [0, 'Percentage cannot be less than 0'],
    max: [100, 'Percentage cannot exceed 100']
  },

  // Topics Coverage
  topicsCovered: [{
    topic: {
      type: String,
      required: true,
      trim: true,
      maxlength: [200, 'Topic cannot exceed 200 characters']
    },
    covered: {
      type: Boolean,
      default: false
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters']
    }
  }],

  // Session Feedback
  sessionNotes: {
    type: String,
    trim: true,
    maxlength: [2000, 'Session notes cannot exceed 2000 characters']
  },

  // Challenges and Issues
  challenges: {
    type: String,
    trim: true,
    maxlength: [1000, 'Challenges cannot exceed 1000 characters']
  },

  // Follow-up Actions
  followUpActions: [{
    type: String,
    trim: true,
    maxlength: [300, 'Follow-up action cannot exceed 300 characters']
  }],

  // Student Performance Assessment
  studentPerformance: {
    overallPerformance: {
      type: String,
      enum: ['poor', 'below_average', 'average', 'good', 'excellent'],
      default: 'average'
    },
    participationRate: {
      type: Number, // Percentage 0-100
      min: 0,
      max: 100,
      default: 0
    },
    comprehensionLevel: {
      type: String,
      enum: ['very_low', 'low', 'medium', 'high', 'very_high'],
      default: 'medium'
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Notes cannot exceed 1000 characters']
    }
  },

  // Session Effectiveness
  effectiveness: {
    timeManagement: {
      type: Number, // Rating 1-5
      min: 1,
      max: 5,
      default: 3
    },
    materialQuality: {
      type: Number, // Rating 1-5
      min: 1,
      max: 5,
      default: 3
    },
    studentInteraction: {
      type: Number, // Rating 1-5
      min: 1,
      max: 5,
      default: 3
    },
    learningOutcomes: {
      type: Number, // Rating 1-5
      min: 1,
      max: 5,
      default: 3
    }
  },

  // Improvements for Next Session
  improvements: [{
    type: String,
    trim: true,
    maxlength: [300, 'Improvement suggestion cannot exceed 300 characters']
  }],

  // Student Feedback Collection (optional)
  studentFeedback: {
    collected: {
      type: Boolean,
      default: false
    },
    averageRating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
    totalResponses: {
      type: Number,
      min: 0,
      default: 0
    },
    comments: [{
      studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      rating: {
        type: Number,
        min: 1,
        max: 5
      },
      comment: {
        type: String,
        trim: true,
        maxlength: [500, 'Comment cannot exceed 500 characters']
      },
      submittedAt: {
        type: Date,
        default: Date.now
      }
    }]
  },

  // Attachments (photos, screenshots, etc.)
  attachments: [{
    filename: {
      type: String,
      required: true
    },
    originalName: {
      type: String,
      required: true
    },
    url: {
      type: String,
      required: true
    },
    fileType: {
      type: String,
      required: true
    },
    fileSize: {
      type: Number,
      required: true
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Metadata
  evaluationDate: {
    type: Date,
    default: Date.now
  },
  lastModified: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
SessionEvaluationSchema.index({ trainerId: 1, evaluationDate: -1 });
SessionEvaluationSchema.index({ groupId: 1 });
SessionEvaluationSchema.index({ overallRating: 1 });
SessionEvaluationSchema.index({ engagementLevel: 1 });

// Virtual: Get average effectiveness rating
SessionEvaluationSchema.virtual('averageEffectiveness').get(function() {
  if (!this.effectiveness) return 0;

  const sum = this.effectiveness.timeManagement +
               this.effectiveness.materialQuality +
               this.effectiveness.studentInteraction +
               this.effectiveness.learningOutcomes;

  return (sum / 4).toFixed(1);
});

// Virtual: Check if objectives were mostly achieved
SessionEvaluationSchema.virtual('objectivesAchieved').get(function() {
  return this.objectivesAchievement >= 70; // 70% or more is considered achieved
});

// Virtual: Get engagement score (numerical)
SessionEvaluationSchema.virtual('engagementScore').get(function() {
  const engagementMap = {
    'very_low': 1,
    'low': 2,
    'medium': 3,
    'high': 4,
    'very_high': 5
  };
  return engagementMap[this.engagementLevel] || 3;
});

// Virtual: Calculate overall session score (0-100)
SessionEvaluationSchema.virtual('overallScore').get(function() {
  // Weighted scoring:
  // Overall rating: 30%
  // Objectives achievement: 30%
  // Engagement: 20%
  // Average effectiveness: 20%

  const ratingScore = (this.overallRating / 5) * 30;
  const objectivesScore = (this.objectivesAchievement / 100) * 30;
  const engagementScore = (this.engagementScore / 5) * 20;
  const effectivenessScore = (parseFloat(this.averageEffectiveness) / 5) * 20;

  return Math.round(ratingScore + objectivesScore + engagementScore + effectivenessScore);
});

// Method: Add student feedback
SessionEvaluationSchema.methods.addStudentFeedback = function(studentId, rating, comment = '') {
  this.studentFeedback.comments.push({
    studentId,
    rating,
    comment,
    submittedAt: new Date()
  });

  this.studentFeedback.totalResponses = this.studentFeedback.comments.length;

  // Recalculate average rating
  if (this.studentFeedback.comments.length > 0) {
    const totalRating = this.studentFeedback.comments.reduce(
      (sum, feedback) => sum + feedback.rating,
      0
    );
    this.studentFeedback.averageRating = totalRating / this.studentFeedback.comments.length;
  }

  this.studentFeedback.collected = true;
  return this.save();
};

// Method: Mark evaluation as modified
SessionEvaluationSchema.methods.markModified = function() {
  this.lastModified = new Date();
  return this.save();
};

// Static method: Get evaluations by trainer
SessionEvaluationSchema.statics.getTrainerEvaluations = function(trainerId, filters = {}) {
  const query = { trainerId, ...filters };
  return this.find(query)
    .populate('sessionId', 'title scheduledDate type')
    .populate('groupId', 'name')
    .sort({ evaluationDate: -1 });
};

// Static method: Get evaluations by group
SessionEvaluationSchema.statics.getGroupEvaluations = function(groupId) {
  return this.find({ groupId })
    .populate('sessionId', 'title scheduledDate sessionNumber')
    .sort({ evaluationDate: -1 });
};

// Static method: Get evaluation statistics for trainer
SessionEvaluationSchema.statics.getTrainerStats = async function(trainerId) {
  const evaluations = await this.find({ trainerId });

  if (evaluations.length === 0) {
    return {
      totalEvaluations: 0,
      averageRating: 0,
      averageEngagement: 0,
      averageObjectivesAchievement: 0,
      averageOverallScore: 0
    };
  }

  const stats = {
    totalEvaluations: evaluations.length,
    averageRating: 0,
    averageEngagement: 0,
    averageObjectivesAchievement: 0,
    averageOverallScore: 0
  };

  let totalRating = 0;
  let totalEngagement = 0;
  let totalObjectives = 0;
  let totalScore = 0;

  evaluations.forEach(evaluation => {
    totalRating += evaluation.overallRating;
    totalEngagement += evaluation.engagementScore;
    totalObjectives += evaluation.objectivesAchievement;
    totalScore += evaluation.overallScore;
  });

  stats.averageRating = (totalRating / evaluations.length).toFixed(1);
  stats.averageEngagement = (totalEngagement / evaluations.length).toFixed(1);
  stats.averageObjectivesAchievement = Math.round(totalObjectives / evaluations.length);
  stats.averageOverallScore = Math.round(totalScore / evaluations.length);

  return stats;
};

// Static method: Get recent evaluations
SessionEvaluationSchema.statics.getRecentEvaluations = function(trainerId, limit = 10) {
  return this.find({ trainerId })
    .populate('sessionId', 'title scheduledDate')
    .populate('groupId', 'name')
    .sort({ evaluationDate: -1 })
    .limit(limit);
};

// Pre-save hook: Update lastModified date
SessionEvaluationSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.lastModified = new Date();
  }
  next();
});

// Pre-save hook: Calculate student feedback average
SessionEvaluationSchema.pre('save', function(next) {
  if (this.studentFeedback && this.studentFeedback.comments.length > 0) {
    const totalRating = this.studentFeedback.comments.reduce(
      (sum, feedback) => sum + (feedback.rating || 0),
      0
    );
    this.studentFeedback.averageRating = totalRating / this.studentFeedback.comments.length;
    this.studentFeedback.totalResponses = this.studentFeedback.comments.length;
  }
  next();
});

module.exports = mongoose.model('SessionEvaluation', SessionEvaluationSchema);
