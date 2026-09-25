/**
 * SessionReport Model
 * 
 * Stores session reports created by reception staff
 * Includes attendance tracking and optional PDF uploads
 */

const mongoose = require('mongoose');

const SessionReportSchema = new mongoose.Schema({
  sessionRequestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SessionRequest',
    required: [true, 'Session request ID is required'],
    unique: true // One report per session (unique already creates an index)
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Creator ID is required']
  },
  notes: {
    type: String,
    required: [true, 'Notes are required'],
    trim: true,
    maxlength: [5000, 'Notes cannot exceed 5000 characters']
  },
  pdfUrl: {
    type: String,
    trim: true,
    default: null,
    validate: {
      validator: function(v) {
        // Optional - if provided, should be a valid URL
        if (!v) return true;
        try {
          new URL(v);
          return true;
        } catch {
          return false;
        }
      },
      message: 'PDF URL must be a valid URL'
    }
  },
  attendance: {
    type: Boolean,
    required: [true, 'Attendance is required']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
SessionReportSchema.index({ sessionRequestId: 1 });
SessionReportSchema.index({ createdBy: 1, createdAt: -1 });
SessionReportSchema.index({ attendance: 1, createdAt: -1 });

module.exports = mongoose.model('SessionReport', SessionReportSchema);
