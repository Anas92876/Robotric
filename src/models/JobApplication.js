const mongoose = require('mongoose');

const jobApplicationSchema = new mongoose.Schema({
  // Which position they're applying for
  position: {
    type: String,
    required: true,
    trim: true
  },

  // Core personal info — required for every role
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    default: ''
  },
  age: {
    type: Number,
    min: 14,
    max: 70
  },
  location: {
    type: String,
    trim: true,
    default: ''
  },
  gender: {
    type: String,
    enum: ['male', 'female', null],
    default: null
  },

  // Experience & background — open text, fits any role
  experienceLevel: {
    type: String,
    enum: ['none', 'beginner', 'intermediate', 'professional', null],
    default: null
  },
  experienceDetails: {
    // Free-text: "I've been doing X for Y years..."
    type: String,
    trim: true,
    default: ''
  },

  // Skills — free array, applicant lists whatever is relevant
  skills: {
    type: [String],
    default: []
  },

  // Portfolio / work samples link (optional, useful for any creative/tech role)
  portfolioLink: {
    type: String,
    trim: true,
    default: ''
  },

  // Availability
  availability: {
    type: String,
    enum: ['full_time', 'part_time', 'flexible', null],
    default: null
  },

  // Why do you want to join us — fits every position
  whyUs: {
    type: String,
    trim: true,
    default: ''
  },

  // Any extra info the applicant wants to add
  additionalInfo: {
    type: String,
    trim: true,
    default: ''
  },

  // CV / Resume upload (Supabase Storage)
  cvUrl: {
    type: String,
    trim: true,
    default: ''
  },
  cvBucket: {
    type: String,
    trim: true,
    default: ''
  },

  // ── HR / Reception tracking ──────────────────────────────
  status: {
    type: String,
    enum: ['new', 'reviewed', 'interview', 'accepted', 'rejected'],
    default: 'new'
  },
  notes: {
    // Internal HR notes, not visible to applicant
    type: String,
    trim: true,
    default: ''
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  reviewedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

jobApplicationSchema.index({ status: 1 });
jobApplicationSchema.index({ position: 1 });
jobApplicationSchema.index({ createdAt: -1 });
jobApplicationSchema.index({ phone: 1 });

module.exports = mongoose.model('JobApplication', jobApplicationSchema);
