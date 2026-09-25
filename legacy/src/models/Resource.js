/**
 * Resource Model
 *
 * Represents PDF resources uploaded at course level.
 * One resource can be assigned to multiple groups and sessions.
 *
 * @model Resource
 * @description Manages course-level PDF resources with one-to-many assignment capability
 */

const mongoose = require('mongoose');

const ResourceSchema = new mongoose.Schema({
  // Basic Information
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters'],
    index: 'text'
  },
  
  description: {
    type: String,
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters'],
    index: 'text'
  },
  
  // File Information
  originalName: {
    type: String,
    required: [true, 'Original filename is required']
  },
  
  fileSize: {
    type: Number,
    required: [true, 'File size is required'],
    min: [0, 'File size cannot be negative']
  },
  
  mimeType: {
    type: String,
    default: 'application/pdf',
    required: true
  },
  
  // Storage (Supabase)
  fileUrl: {
    type: String,
    required: [true, 'File URL is required'],
    comment: 'Storage path, not signed URL'
  },
  
  storageBucket: {
    type: String,
    default: 'resources',
    required: true
  },
  
  storageProvider: {
    type: String,
    enum: ['supabase', 'local', 's3'],
    default: 'supabase',
    required: true
  },
  
  // Course Relationship (One resource per course)
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: [true, 'Course is required']
  },
  
  // Metadata
  version: {
    type: Number,
    default: 1,
    min: 1
  },
  
  // Upload Information
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Uploader is required'],
    index: true
  },
  
  // Status
  status: {
    type: String,
    enum: ['active', 'archived', 'deleted'],
    default: 'active',
    index: true
  },
  
  // Timestamps
  archivedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
ResourceSchema.index({ courseId: 1, status: 1 });
ResourceSchema.index({ title: 'text', description: 'text' });
ResourceSchema.index({ uploadedBy: 1, createdAt: -1 });

// Virtual: Get assignment count
ResourceSchema.virtual('assignmentCount', {
  ref: 'ResourceAssignment',
  localField: '_id',
  foreignField: 'resourceId',
  count: true
});

// Method: Soft delete
ResourceSchema.methods.archive = function() {
  this.status = 'archived';
  this.archivedAt = new Date();
  return this.save();
};

// Method: Restore archived resource
ResourceSchema.methods.restore = function() {
  this.status = 'active';
  this.archivedAt = null;
  return this.save();
};

// Static: Get resources by course
ResourceSchema.statics.getByCourse = function(courseId, filters = {}) {
  const query = { courseId, status: 'active', ...filters };
  return this.find(query)
    .populate('uploadedBy', 'name email')
    .populate('courseId', 'title category')
    .sort({ createdAt: -1 });
};

// Static: Search resources
ResourceSchema.statics.search = function(searchTerm, courseId = null) {
  const query = {
    status: 'active',
    $text: { $search: searchTerm }
  };
  
  if (courseId) {
    query.courseId = courseId;
  }
  
  return this.find(query)
    .populate('uploadedBy', 'name email')
    .populate('courseId', 'title')
    .sort({ score: { $meta: 'textScore' } });
};

module.exports = mongoose.model('Resource', ResourceSchema);
