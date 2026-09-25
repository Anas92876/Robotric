/**
 * Lead Model
 *
 * Represents an interested customer/prospect
 * Tracks contact information, interests, and follow-ups
 */

const mongoose = require('mongoose');

const followUpSchema = new mongoose.Schema({
  note: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
});

const leadSchema = new mongoose.Schema({
  // Basic Information
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  englishName: {
    type: String,
    trim: true
  },
  firstName: {
    type: String,
    trim: true
  },
  lastName: {
    type: String,
    trim: true
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
    lowercase: true
  },

  // Family Information
  fatherName: {
    type: String,
    trim: true
  },
  motherName: {
    type: String,
    trim: true
  },

  // Age/Date of Birth
  dateOfBirth: {
    type: Date
  },
  age: {
    type: Number
  },

  // Location
  residence: {
    type: String,
    trim: true
  },

  // Education
  schoolName: {
    type: String,
    trim: true
  },

  // Contact Information
  mobileNumber: {
    type: String,
    required: true,
    trim: true
  },
  mobileNumberLabel: {
    type: String,
    trim: true,
    default: 'Main'
  },
  additionalNumbers: [{
    number: {
      type: String,
      trim: true,
      required: true
    },
    label: {
      type: String,
      trim: true,
      default: 'Other'
    }
  }],
  socialMedia: [{
    platform: {
      type: String,
      trim: true,
      required: true
    },
    handle: {
      type: String,
      trim: true,
      required: true
    }
  }],

  // Assignment
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  // Interest Information
  interestField: {
    type: String,
    trim: true
  },
  referralSource: {
    type: String,
    trim: true
  },

  // Notes
  notes: {
    type: String,
    trim: true
  },

  // Lead Date — manually set by reception to record when this lead was acquired
  // Defaults to creation time but can be edited to reflect the actual date
  leadDate: {
    type: Date,
    default: Date.now
  },

  // Status Tracking
  status: {
    type: String,
    enum: ['interest', 'waiting', 'student', 'blacklist'],
    default: 'interest'
  },

  // Waiting list info — populated when status is set to 'waiting'
  waitingInfo: {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      default: null
    },
    depositAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    depositPaidAt: {
      type: Date,
      default: null
    },
    depositMethod: {
      type: String,
      enum: ['cash', 'sham_cash_app', 'other'],
      default: 'cash'
    },
    depositNotes: {
      type: String,
      trim: true,
      default: ''
    }
  },

  // Status History
  statusHistory: [{
    fromStatus: {
      type: String,
      enum: ['interest', 'waiting', 'student', 'blacklist']
    },
    toStatus: {
      type: String,
      enum: ['interest', 'waiting', 'student', 'blacklist'],
      required: true
    },
    reason: {
      type: String,
      required: true,
      trim: true
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    changedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Blacklist Information
  isBannedFromPlatform: {
    type: Boolean,
    default: false
  },
  blacklistReason: {
    type: String,
    trim: true
  },

  // Follow-ups
  followUps: [followUpSchema],
  nextFollowUpDate: {
    type: Date
  },

  // Conversion
  convertedToStudent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  convertedAt: {
    type: Date
  },

  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for better query performance
leadSchema.index({ mobileNumber: 1 });
leadSchema.index({ status: 1 });
leadSchema.index({ createdAt: -1 });
leadSchema.index({ assignedTo: 1 });
leadSchema.index({ nextFollowUpDate: 1 });

// Virtual for calculating age from date of birth
leadSchema.virtual('calculatedAge').get(function() {
  if (!this.dateOfBirth) return this.age;

  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
});

// Update timestamp on save
leadSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Lead', leadSchema);
