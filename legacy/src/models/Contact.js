/**
 * Contact Model
 *
 * Stores contact form submissions from the public website
 */

const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true
  },
  email: {
    type: String,
    trim: true,
    default: ''
  },
  location: {
    type: String,
    trim: true,
    default: ''
  },
  who: {
    type: String,
    enum: ['student', 'parent', 'business-owner', 'other'],
    trim: true
  },
  otherType: {
    type: String,
    trim: true,
    default: ''
  },
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    trim: true
  },
  message: {
    type: String,
    trim: true,
    default: ''
  },

  // Status tracking
  status: {
    type: String,
    enum: ['new', 'read', 'replied', 'archived'],
    default: 'new',
    lowercase: true
  },

  // Optional: Link to a lead if converted
  convertedToLead: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead'
  },

  // Timestamps
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
contactSchema.index({ status: 1 });
contactSchema.index({ createdAt: -1 });
contactSchema.index({ phone: 1 });

// Update timestamp on save
contactSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Contact', contactSchema);
