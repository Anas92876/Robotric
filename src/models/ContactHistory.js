/**
 * ContactHistory Model
 *
 * Tracks all interactions/contacts with leads
 * Automatically creates calendar events for each contact
 */

const mongoose = require('mongoose');

const contactHistorySchema = new mongoose.Schema({
  // Reference to the lead
  leadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead',
    required: [true, 'Lead ID is required'],
    index: true
  },

  // Type of contact
  contactType: {
    type: String,
    enum: ['call', 'meeting', 'email', 'other'],
    required: [true, 'Contact type is required'],
    lowercase: true
  },

  // Reason for the call/contact
  callReason: {
    type: String,
    required: [true, 'Call reason is required'],
    trim: true
  },

  // Outcome of the contact
  outcome: {
    type: String,
    enum: ['successful', 'no_answer', 'callback_requested', 'not_interested', 'converted', 'other'],
    required: [true, 'Outcome is required'],
    lowercase: true
  },

  // Detailed notes about the interaction
  notes: {
    type: String,
    trim: true
  },

  // Date and time of the contact
  contactDate: {
    type: Date,
    required: [true, 'Contact date is required'],
    index: true
  },

  // Duration in minutes
  duration: {
    type: Number,
    min: 0,
    default: 30
  },

  // Reference to the automatically created calendar event
  scheduledEventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: [true, 'Scheduled event ID is required']
  },

  // Suggested next follow-up date
  nextFollowUpDate: {
    type: Date
  },

  // Staff member who created the record
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Created by is required']
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
contactHistorySchema.index({ leadId: 1, contactDate: -1 });
contactHistorySchema.index({ createdBy: 1, contactDate: -1 });
contactHistorySchema.index({ outcome: 1 });
contactHistorySchema.index({ contactType: 1 });

// Update timestamp on save
contactHistorySchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Virtual for getting the event color based on outcome
contactHistorySchema.virtual('eventColor').get(function() {
  const colorMap = {
    successful: 'green',
    callback_requested: 'yellow',
    no_answer: 'gray',
    not_interested: 'red',
    converted: 'blue',
    other: 'purple'
  };
  return colorMap[this.outcome] || 'blue';
});

// Ensure virtuals are included in JSON
contactHistorySchema.set('toJSON', { virtuals: true });
contactHistorySchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('ContactHistory', contactHistorySchema);
