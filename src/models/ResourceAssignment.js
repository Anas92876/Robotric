/**
 * ResourceAssignment Model
 *
 * Maps resources to specific groups and sessions.
 * Enables one resource to be assigned to many groups/sessions.
 *
 * @model ResourceAssignment
 * @description Manages resource-to-group/session assignments
 */

const mongoose = require('mongoose');

const ResourceAssignmentSchema = new mongoose.Schema({
  // Core References
  resourceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resource',
    required: [true, 'Resource is required'],
    index: true
  },
  
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: [true, 'Group is required'],
    index: true
  },
  
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session',
    required: [true, 'Session is required'],
    index: true
  },
  
  // Assignment Metadata
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Assigned by is required']
  },
  
  assignedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  // Visibility Control (Optional)
  isVisible: {
    type: Boolean,
    default: true,
    index: true
  },
  
  availableFrom: {
    type: Date,
    default: null
  },
  
  availableUntil: {
    type: Date,
    default: null
  },
  
  // Notes
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters'],
    trim: true
  }
}, {
  timestamps: true
});

// Unique Constraint: Prevent duplicate assignments
ResourceAssignmentSchema.index(
  { resourceId: 1, groupId: 1, sessionId: 1 },
  { unique: true, name: 'unique_assignment' }
);

// Compound Indexes for queries
ResourceAssignmentSchema.index({ groupId: 1, sessionId: 1 });
ResourceAssignmentSchema.index({ resourceId: 1, isVisible: 1 });
ResourceAssignmentSchema.index({ sessionId: 1, isVisible: 1 });

// Virtual: Check if assignment is currently available
ResourceAssignmentSchema.virtual('isAvailable').get(function() {
  if (!this.isVisible) return false;
  
  const now = new Date();
  
  if (this.availableFrom && now < this.availableFrom) return false;
  if (this.availableUntil && now > this.availableUntil) return false;
  
  return true;
});

// Static: Get assignments for resource
ResourceAssignmentSchema.statics.getByResource = function(resourceId, filters = {}) {
  const query = { resourceId, ...filters };
  return this.find(query)
    .populate('groupId', 'name students')
    .populate('sessionId', 'sessionNumber title scheduledDate startTime endTime')
    .populate('assignedBy', 'name email')
    .sort({ assignedAt: -1 });
};

// Static: Get assignments for session
ResourceAssignmentSchema.statics.getBySession = function(sessionId, filters = {}) {
  const query = { sessionId, isVisible: true, ...filters };
  return this.find(query)
    .populate('resourceId', 'title description category fileSize originalName')
    .populate('groupId', 'name')
    .sort({ assignedAt: -1 });
};

// Static: Get assignments for group
ResourceAssignmentSchema.statics.getByGroup = function(groupId, filters = {}) {
  const query = { groupId, isVisible: true, ...filters };
  return this.find(query)
    .populate('resourceId', 'title description category')
    .populate('sessionId', 'sessionNumber title scheduledDate')
    .sort({ 'sessionId.scheduledDate': 1 });
};

module.exports = mongoose.model('ResourceAssignment', ResourceAssignmentSchema);
