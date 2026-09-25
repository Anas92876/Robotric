/**
 * StudentEvaluation Model
 *
 * Represents trainer's evaluation of individual students during/after sessions.
 * Tracks student performance, skills, behavior, and progress over time.
 *
 * @model StudentEvaluation
 * @description Manages individual student performance evaluations by trainers
 * @version 1.0.0
 */

const mongoose = require('mongoose');

const StudentEvaluationSchema = new mongoose.Schema({
  // ===== CORE REFERENCES =====
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Student is required'],
    index: true
  },
  trainerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Trainer is required'],
    index: true
  },
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session',
    required: [true, 'Session is required'],
    index: true
  },
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: [true, 'Group is required'],
    index: true
  },

  // ===== PERFORMANCE METRICS =====
  // Overall performance rating (1-5 stars)
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

  // Detailed skill ratings (1-5 for each) - LEGACY: Now using dynamic parameters
  skillRatings: {
    technicalSkills: {
      type: Number,
      min: 1,
      max: 5,
      default: 3
    },
    problemSolving: {
      type: Number,
      min: 1,
      max: 5,
      default: 3
    },
    creativity: {
      type: Number,
      min: 1,
      max: 5,
      default: 3
    },
    teamwork: {
      type: Number,
      min: 1,
      max: 5,
      default: 3
    },
    communication: {
      type: Number,
      min: 1,
      max: 5,
      default: 3
    }
  },

  // ===== ATTENDANCE & PARTICIPATION ===== - LEGACY: Now using dynamic parameters
  attendance: {
    status: {
      type: String,
      enum: ['present', 'late', 'absent', 'excused'],
      default: 'present'
    },
    arrivalTime: {
      type: Date
    },
    departureTime: {
      type: Date
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [200, 'Attendance notes cannot exceed 200 characters']
    }
  },

  participation: {
    level: {
      type: String,
      enum: ['very_low', 'low', 'medium', 'high', 'very_high'],
      required: true,
      default: 'medium'
    },
    contributionQuality: {
      type: Number,
      min: 1,
      max: 5,
      default: 3
    },
    questionsAsked: {
      type: Number,
      min: 0,
      default: 0
    },
    helpedPeers: {
      type: Boolean,
      default: false
    }
  },

  // ===== LEARNING ASSESSMENT =====
  comprehension: {
    level: {
      type: String,
      enum: ['struggling', 'needs_support', 'adequate', 'good', 'excellent'],
      required: true,
      default: 'adequate'
    },
    conceptsUnderstood: [{
      type: String,
      trim: true,
      maxlength: [100, 'Concept name cannot exceed 100 characters']
    }],
    conceptsNeedingWork: [{
      type: String,
      trim: true,
      maxlength: [100, 'Concept name cannot exceed 100 characters']
    }],
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Comprehension notes cannot exceed 500 characters']
    }
  },

  // ===== BEHAVIORAL ASSESSMENT =====
  behavior: {
    engagement: {
      type: String,
      enum: ['distracted', 'passive', 'engaged', 'very_engaged', 'exceptional'],
      default: 'engaged'
    },
    attitude: {
      type: String,
      enum: ['negative', 'neutral', 'positive', 'enthusiastic'],
      default: 'positive'
    },
    focus: {
      type: Number,
      min: 1,
      max: 5,
      default: 3
    },
    respectful: {
      type: Boolean,
      default: true
    },
    followsInstructions: {
      type: Boolean,
      default: true
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [300, 'Behavior notes cannot exceed 300 characters']
    }
  },

  // ===== ACHIEVEMENTS & HIGHLIGHTS =====
  achievements: [{
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: [100, 'Achievement title cannot exceed 100 characters']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [300, 'Achievement description cannot exceed 300 characters']
    },
    category: {
      type: String,
      enum: ['technical', 'collaboration', 'creativity', 'leadership', 'improvement', 'other'],
      default: 'other'
    }
  }],

  // ===== AREAS FOR IMPROVEMENT =====
  improvements: [{
    area: {
      type: String,
      required: true,
      trim: true,
      maxlength: [100, 'Improvement area cannot exceed 100 characters']
    },
    suggestion: {
      type: String,
      trim: true,
      maxlength: [300, 'Suggestion cannot exceed 300 characters']
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium'
    }
  }],

  // ===== HOMEWORK & ASSIGNMENTS =====
  homework: {
    assigned: {
      type: Boolean,
      default: false
    },
    title: {
      type: String,
      trim: true,
      maxlength: [200, 'Homework title cannot exceed 200 characters']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Homework description cannot exceed 500 characters']
    },
    dueDate: {
      type: Date
    },
    estimatedHours: {
      type: Number,
      min: 0,
      max: 100
    }
  },

  // ===== TRAINER NOTES =====
  trainerNotes: {
    strengths: {
      type: String,
      trim: true,
      maxlength: [500, 'Strengths notes cannot exceed 500 characters']
    },
    weaknesses: {
      type: String,
      trim: true,
      maxlength: [500, 'Weaknesses notes cannot exceed 500 characters']
    },
    generalNotes: {
      type: String,
      trim: true,
      maxlength: [1000, 'General notes cannot exceed 1000 characters']
    },
    privateNotes: {
      type: String,
      trim: true,
      maxlength: [500, 'Private notes cannot exceed 500 characters']
    }
  },

  // ===== PROGRESS TRACKING =====
  progress: {
    comparedToPrevious: {
      type: String,
      enum: ['declined', 'no_change', 'slight_improvement', 'good_improvement', 'excellent_improvement'],
      default: 'no_change'
    },
    onTrack: {
      type: Boolean,
      default: true
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [300, 'Progress notes cannot exceed 300 characters']
    }
  },

  // ===== RECOMMENDATIONS =====
  recommendations: [{
    type: String,
    trim: true,
    maxlength: [200, 'Recommendation cannot exceed 200 characters']
  }],

  // ===== DYNAMIC EVALUATION PARAMETERS =====
  // Custom parameters defined by CLO in EvaluationCriteria
  parameters: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },

  // Metadata about the criteria used (for performance calculation)
  criteriaMetadata: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },

  // ===== FLAGS & ALERTS =====
  flags: {
    needsAttention: {
      type: Boolean,
      default: false
    },
    excelling: {
      type: Boolean,
      default: false
    },
    atRisk: {
      type: Boolean,
      default: false
    },
    parentContactNeeded: {
      type: Boolean,
      default: false
    }
  },

  // ===== VISIBILITY & SHARING =====
  visibility: {
    sharedWithStudent: {
      type: Boolean,
      default: false
    },
    sharedWithParent: {
      type: Boolean,
      default: false
    },
    sharedAt: {
      type: Date
    }
  },

  // ===== METADATA =====
  evaluationDate: {
    type: Date,
    default: Date.now,
    required: true
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

// ===== INDEXES FOR PERFORMANCE =====
StudentEvaluationSchema.index({ studentId: 1, evaluationDate: -1 });
StudentEvaluationSchema.index({ trainerId: 1, sessionId: 1 });
StudentEvaluationSchema.index({ groupId: 1, evaluationDate: -1 });
StudentEvaluationSchema.index({ sessionId: 1, studentId: 1 }, { unique: true }); // One evaluation per student per session
StudentEvaluationSchema.index({ 'flags.needsAttention': 1 });
StudentEvaluationSchema.index({ 'flags.atRisk': 1 });
StudentEvaluationSchema.index({ overallRating: 1 });

// ===== VIRTUALS =====

/**
 * Calculate average skill rating
 */
StudentEvaluationSchema.virtual('averageSkillRating').get(function() {
  if (!this.skillRatings) return 0;

  const sum = this.skillRatings.technicalSkills +
               this.skillRatings.problemSolving +
               this.skillRatings.creativity +
               this.skillRatings.teamwork +
               this.skillRatings.communication;

  return (sum / 5).toFixed(1);
});

/**
 * Calculate overall performance score (0-100)
 * Uses dynamic parameters if available, falls back to legacy calculation
 */
StudentEvaluationSchema.virtual('performanceScore').get(function() {
  // NEW: If using dynamic parameters with metadata, calculate weighted score
  if (this.parameters && this.criteriaMetadata && this.criteriaMetadata.parametersConfig) {
    let totalScore = 0;
    let totalWeight = 0;

    // Calculate score for each parameter
    this.criteriaMetadata.parametersConfig.forEach(paramConfig => {
      const value = this.parameters[paramConfig.name];

      if (value !== undefined && value !== null) {
        let normalizedScore = 0;

        // Normalize based on parameter type
        switch (paramConfig.type) {
          case 'rating':
            const { min = 1, max = 5 } = paramConfig.ratingScale || {};
            normalizedScore = ((value - min) / (max - min)) * 100;
            break;

          case 'percentage':
            normalizedScore = value;
            break;

          case 'boolean':
            normalizedScore = value ? 100 : 0;
            break;

          case 'grade':
            const gradeMap = { 'A': 100, 'B': 80, 'C': 60, 'D': 40, 'F': 0 };
            normalizedScore = gradeMap[value] || 0;
            break;

          default:
            normalizedScore = 0;
        }

        totalScore += normalizedScore * (paramConfig.weight / 100);
        totalWeight += paramConfig.weight;
      }
    });

    // If weights don't add up to 100, normalize
    if (totalWeight > 0 && totalWeight !== 100) {
      totalScore = (totalScore / totalWeight) * 100;
    }

    return Math.round(totalScore);
  }

  // Fallback: If parameters exist but no metadata, use overall rating
  if (this.parameters && Object.keys(this.parameters).length > 0) {
    return Math.round((this.overallRating / 5) * 100);
  }

  // LEGACY: Old weighted scoring for backward compatibility
  const ratingScore = (this.overallRating / 5) * 30;
  const skillScore = (parseFloat(this.averageSkillRating) / 5) * 30;

  const participationMap = {
    'very_low': 1, 'low': 2, 'medium': 3, 'high': 4, 'very_high': 5
  };
  const participationScore = ((participationMap[this.participation?.level] || 3) / 5) * 20;
  const behaviorScore = ((this.behavior?.focus || 3) / 5) * 20;

  return Math.round(ratingScore + skillScore + participationScore + behaviorScore);
});

/**
 * Get participation score (1-5)
 */
StudentEvaluationSchema.virtual('participationScore').get(function() {
  const levelMap = {
    'very_low': 1, 'low': 2, 'medium': 3, 'high': 4, 'very_high': 5
  };
  return levelMap[this.participation?.level] || 3;
});

/**
 * Check if student needs attention
 */
StudentEvaluationSchema.virtual('needsReview').get(function() {
  return this.flags?.needsAttention ||
         this.flags?.atRisk ||
         this.overallRating <= 2 ||
         this.attendance?.status === 'absent';
});

// ===== INSTANCE METHODS =====

/**
 * Share evaluation with student/parent
 */
StudentEvaluationSchema.methods.shareWithStudent = function() {
  this.visibility.sharedWithStudent = true;
  this.visibility.sharedAt = new Date();
  return this.save();
};

StudentEvaluationSchema.methods.shareWithParent = function() {
  this.visibility.sharedWithParent = true;
  if (!this.visibility.sharedAt) {
    this.visibility.sharedAt = new Date();
  }
  return this.save();
};

/**
 * Add achievement
 */
StudentEvaluationSchema.methods.addAchievement = function(title, description, category = 'other') {
  this.achievements.push({ title, description, category });
  return this.save();
};

/**
 * Add improvement area
 */
StudentEvaluationSchema.methods.addImprovement = function(area, suggestion, priority = 'medium') {
  this.improvements.push({ area, suggestion, priority });
  return this.save();
};

/**
 * Flag student for attention
 */
StudentEvaluationSchema.methods.flagForAttention = function(reason = '') {
  this.flags.needsAttention = true;
  if (reason) {
    this.trainerNotes.privateNotes = (this.trainerNotes.privateNotes || '') + `\nFlagged: ${reason}`;
  }
  return this.save();
};

// ===== STATIC METHODS =====

/**
 * Get all evaluations for a student
 */
StudentEvaluationSchema.statics.getStudentEvaluations = function(studentId, filters = {}) {
  const query = { studentId, ...filters };
  return this.find(query)
    .populate('trainerId', 'name email')
    .populate('sessionId', 'title scheduledDate type')
    .populate('groupId', 'name')
    .sort({ evaluationDate: -1 });
};

/**
 * Get evaluations by session
 */
StudentEvaluationSchema.statics.getSessionEvaluations = function(sessionId) {
  return this.find({ sessionId })
    .populate('studentId', 'name email')
    .sort({ overallRating: -1 });
};

/**
 * Get evaluations by trainer
 */
StudentEvaluationSchema.statics.getTrainerEvaluations = function(trainerId, filters = {}) {
  const query = { trainerId, ...filters };
  return this.find(query)
    .populate('studentId', 'name email')
    .populate('sessionId', 'title scheduledDate')
    .populate('groupId', 'name')
    .sort({ evaluationDate: -1 });
};

/**
 * Get student progress over time
 */
StudentEvaluationSchema.statics.getStudentProgress = async function(studentId, groupId = null) {
  const query = { studentId };
  if (groupId) query.groupId = groupId;

  const evaluations = await this.find(query)
    .populate('sessionId', 'scheduledDate')
    .sort({ evaluationDate: 1 });

  return evaluations.map(eval => ({
    date: eval.evaluationDate,
    sessionDate: eval.sessionId?.scheduledDate,
    overallRating: eval.overallRating,
    performanceScore: eval.performanceScore,
    skillRatings: eval.skillRatings,
    participation: eval.participationScore,
    comprehension: eval.comprehension?.level
  }));
};

/**
 * Get statistics for a student
 */
StudentEvaluationSchema.statics.getStudentStats = async function(studentId, groupId = null) {
  const query = { studentId };
  if (groupId) query.groupId = groupId;

  const evaluations = await this.find(query);

  if (evaluations.length === 0) {
    return {
      totalEvaluations: 0,
      averageRating: 0,
      averagePerformanceScore: 0,
      averageSkillRating: 0,
      attendanceRate: 0,
      averageParticipation: 0
    };
  }

  let totalRating = 0;
  let totalPerformance = 0;
  let totalSkills = 0;
  let totalParticipation = 0;
  let presentCount = 0;

  evaluations.forEach(evaluation => {
    totalRating += evaluation.overallRating;
    totalPerformance += evaluation.performanceScore;
    totalSkills += parseFloat(evaluation.averageSkillRating);
    totalParticipation += evaluation.participationScore;
    if (evaluation.attendance?.status === 'present') presentCount++;
  });

  return {
    totalEvaluations: evaluations.length,
    averageRating: (totalRating / evaluations.length).toFixed(1),
    averagePerformanceScore: Math.round(totalPerformance / evaluations.length),
    averageSkillRating: (totalSkills / evaluations.length).toFixed(1),
    attendanceRate: Math.round((presentCount / evaluations.length) * 100),
    averageParticipation: (totalParticipation / evaluations.length).toFixed(1)
  };
};

/**
 * Get students needing attention
 */
StudentEvaluationSchema.statics.getStudentsNeedingAttention = function(trainerId = null, groupId = null) {
  const query = { 'flags.needsAttention': true };
  if (trainerId) query.trainerId = trainerId;
  if (groupId) query.groupId = groupId;

  return this.find(query)
    .populate('studentId', 'name email')
    .populate('sessionId', 'title scheduledDate')
    .populate('groupId', 'name')
    .sort({ evaluationDate: -1 });
};

/**
 * Get top performers
 */
StudentEvaluationSchema.statics.getTopPerformers = function(groupId, limit = 10) {
  return this.find({ groupId })
    .populate('studentId', 'name email')
    .sort({ overallRating: -1, evaluationDate: -1 })
    .limit(limit);
};

// ===== MIDDLEWARE =====

/**
 * Pre-save: Update lastModified date
 */
StudentEvaluationSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.lastModified = new Date();
  }
  next();
});

/**
 * Pre-save: Auto-flag students at risk
 */
StudentEvaluationSchema.pre('save', function(next) {
  // Auto-flag if rating is very low
  if (this.overallRating <= 2) {
    this.flags.atRisk = true;
  }

  // Auto-flag if comprehension is struggling
  if (this.comprehension?.level === 'struggling') {
    this.flags.needsAttention = true;
  }

  // Auto-flag if behavior is concerning
  if (this.behavior?.attitude === 'negative' || this.behavior?.focus <= 2) {
    this.flags.needsAttention = true;
  }

  // Auto-flag if absent
  if (this.attendance?.status === 'absent') {
    this.flags.needsAttention = true;
  }

  // Mark as excelling if consistently high performance
  if (this.overallRating >= 5 && parseFloat(this.averageSkillRating) >= 4.5) {
    this.flags.excelling = true;
  }

  next();
});

module.exports = mongoose.model('StudentEvaluation', StudentEvaluationSchema);
