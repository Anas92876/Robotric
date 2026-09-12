/**
 * TrainerResource Model
 *
 * Represents educational resources uploaded and managed by trainers.
 * Resources can be shared with specific groups and tracked for usage.
 *
 * @model TrainerResource
 * @description Manages learning materials and resources shared by trainers
 */

const mongoose = require('mongoose');

const TrainerResourceSchema = new mongoose.Schema({
  // Owner information
  trainerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Trainer is required'],
    index: true
  },

  // Resource information
  title: {
    type: String,
    required: [true, 'Resource title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },

  // File information
  filename: {
    type: String,
    required: [true, 'Filename is required']
  },
  originalName: {
    type: String,
    required: [true, 'Original filename is required']
  },
  fileUrl: {
    type: String,
    required: [true, 'File URL is required']
  },
  fileType: {
    type: String,
    required: [true, 'File type is required'],
    enum: [
      'pdf',
      'doc',
      'docx',
      'ppt',
      'pptx',
      'xls',
      'xlsx',
      'txt',
      'video',
      'audio',
      'image',
      'code',
      'zip',
      'other'
    ]
  },
  mimeType: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number, // Size in bytes
    required: [true, 'File size is required'],
    max: [104857600, 'File size cannot exceed 100MB'] // 100MB limit
  },

  // Sharing configuration
  sharedWith: [{
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      required: true
    },
    sharedAt: {
      type: Date,
      default: Date.now
    },
    notifyStudents: {
      type: Boolean,
      default: true
    }
  }],

  // Categorization
  category: {
    type: String,
    enum: ['lecture', 'assignment', 'reference', 'tutorial', 'solution', 'template', 'other'],
    default: 'lecture'
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true,
    maxlength: [50, 'Tag cannot exceed 50 characters']
  }],

  // Related course/session
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    default: null
  },
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session',
    default: null
  },

  // Access control
  isPublic: {
    type: Boolean,
    default: false // Private by default, only shared groups can access
  },
  isDownloadable: {
    type: Boolean,
    default: true
  },
  requiresPassword: {
    type: Boolean,
    default: false
  },
  password: {
    type: String,
    select: false // Don't include in queries by default
  },

  // Visibility
  status: {
    type: String,
    enum: ['active', 'archived', 'deleted'],
    default: 'active',
    index: true
  },

  // Storage provider fields
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

  // Usage statistics
  stats: {
    downloads: {
      type: Number,
      default: 0,
      min: 0
    },
    views: {
      type: Number,
      default: 0,
      min: 0
    },
    shares: {
      type: Number,
      default: 0,
      min: 0
    },
    lastAccessed: {
      type: Date,
      default: null
    }
  },

  // Access log (optional, for tracking who accessed)
  accessLog: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    action: {
      type: String,
      enum: ['view', 'download', 'share'],
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    ipAddress: {
      type: String
    }
  }],

  // Version control (for updated files)
  version: {
    type: Number,
    default: 1,
    min: 1
  },
  previousVersions: [{
    version: {
      type: Number,
      required: true
    },
    filename: {
      type: String,
      required: true
    },
    fileUrl: {
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

  // Expiration (optional)
  expiresAt: {
    type: Date,
    default: null
  },

  // Metadata
  metadata: {
    duration: {
      type: Number, // For videos/audio in seconds
      default: null
    },
    pages: {
      type: Number, // For documents
      default: null
    },
    resolution: {
      type: String, // For images/videos
      default: null
    },
    language: {
      type: String,
      default: 'en'
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
TrainerResourceSchema.index({ trainerId: 1, status: 1 });
TrainerResourceSchema.index({ fileType: 1 });
TrainerResourceSchema.index({ category: 1 });
TrainerResourceSchema.index({ tags: 1 });
TrainerResourceSchema.index({ courseId: 1 });
TrainerResourceSchema.index({ 'sharedWith.groupId': 1 });
TrainerResourceSchema.index({ createdAt: -1 });
TrainerResourceSchema.index({ title: 'text', description: 'text', tags: 'text' });

// Virtual: Check if resource is expired
TrainerResourceSchema.virtual('isExpired').get(function() {
  if (!this.expiresAt) return false;
  return new Date() > this.expiresAt;
});

// Virtual: Get file size in human-readable format
TrainerResourceSchema.virtual('fileSizeFormatted').get(function() {
  const bytes = this.fileSize;

  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
});

// Virtual: Get groups count
TrainerResourceSchema.virtual('groupsCount').get(function() {
  return this.sharedWith ? this.sharedWith.length : 0;
});

// Virtual: Check if resource is shared
TrainerResourceSchema.virtual('isShared').get(function() {
  return this.sharedWith && this.sharedWith.length > 0;
});

// Method: Share resource with a group
TrainerResourceSchema.methods.shareWithGroup = function(groupId, notifyStudents = true) {
  // Check if already shared with this group
  const alreadyShared = this.sharedWith.some(
    share => share.groupId.toString() === groupId.toString()
  );

  if (alreadyShared) {
    throw new Error('Resource already shared with this group');
  }

  this.sharedWith.push({
    groupId,
    sharedAt: new Date(),
    notifyStudents
  });

  this.stats.shares += 1;

  return this.save();
};

// Method: Unshare resource from a group
TrainerResourceSchema.methods.unshareFromGroup = function(groupId) {
  const initialLength = this.sharedWith.length;

  this.sharedWith = this.sharedWith.filter(
    share => share.groupId.toString() !== groupId.toString()
  );

  if (this.sharedWith.length < initialLength) {
    this.stats.shares = Math.max(0, this.stats.shares - 1);
  }

  return this.save();
};

// Method: Record access (view or download)
TrainerResourceSchema.methods.recordAccess = function(userId, action, ipAddress = null) {
  // Update stats
  if (action === 'view') {
    this.stats.views += 1;
  } else if (action === 'download') {
    this.stats.downloads += 1;
  }

  this.stats.lastAccessed = new Date();

  // Add to access log (keep last 100 entries)
  this.accessLog.push({
    userId,
    action,
    timestamp: new Date(),
    ipAddress
  });

  // Limit access log size
  if (this.accessLog.length > 100) {
    this.accessLog = this.accessLog.slice(-100);
  }

  return this.save();
};

// Method: Archive resource
TrainerResourceSchema.methods.archive = function() {
  this.status = 'archived';
  return this.save();
};

// Method: Restore archived resource
TrainerResourceSchema.methods.restore = function() {
  this.status = 'active';
  return this.save();
};

// Method: Soft delete resource
TrainerResourceSchema.methods.softDelete = function() {
  this.status = 'deleted';
  return this.save();
};

// Method: Update file (create new version)
TrainerResourceSchema.methods.updateFile = function(newFileData) {
  // Save current version to history
  this.previousVersions.push({
    version: this.version,
    filename: this.filename,
    fileUrl: this.fileUrl,
    fileSize: this.fileSize,
    uploadedAt: new Date()
  });

  // Update to new version
  this.version += 1;
  this.filename = newFileData.filename;
  this.fileUrl = newFileData.fileUrl;
  this.fileSize = newFileData.fileSize;
  this.mimeType = newFileData.mimeType;

  // Limit version history to last 5 versions
  if (this.previousVersions.length > 5) {
    this.previousVersions = this.previousVersions.slice(-5);
  }

  return this.save();
};

// Static method: Get trainer's resources
TrainerResourceSchema.statics.getTrainerResources = function(trainerId, filters = {}) {
  const query = { trainerId, status: 'active', ...filters };
  return this.find(query)
    .populate('courseId', 'title')
    .populate('sessionId', 'title scheduledDate')
    .populate('sharedWith.groupId', 'name')
    .sort({ createdAt: -1 });
};

// Static method: Get resources by group
TrainerResourceSchema.statics.getGroupResources = function(groupId) {
  return this.find({
    'sharedWith.groupId': groupId,
    status: 'active'
  })
    .populate('trainerId', 'name email')
    .populate('courseId', 'title')
    .sort({ createdAt: -1 });
};

// Static method: Get resources by category
TrainerResourceSchema.statics.getResourcesByCategory = function(trainerId, category) {
  return this.find({
    trainerId,
    category,
    status: 'active'
  })
    .sort({ createdAt: -1 });
};

// Static method: Search resources
TrainerResourceSchema.statics.searchResources = function(trainerId, searchTerm) {
  return this.find({
    trainerId,
    status: 'active',
    $text: { $search: searchTerm }
  })
    .sort({ score: { $meta: 'textScore' } });
};

// Static method: Get most downloaded resources
TrainerResourceSchema.statics.getMostDownloaded = function(trainerId, limit = 10) {
  return this.find({
    trainerId,
    status: 'active'
  })
    .sort({ 'stats.downloads': -1 })
    .limit(limit);
};

// Static method: Get recently accessed resources
TrainerResourceSchema.statics.getRecentlyAccessed = function(trainerId, limit = 10) {
  return this.find({
    trainerId,
    status: 'active',
    'stats.lastAccessed': { $ne: null }
  })
    .sort({ 'stats.lastAccessed': -1 })
    .limit(limit);
};

// Static method: Get resource statistics for trainer
TrainerResourceSchema.statics.getTrainerStats = async function(trainerId) {
  const resources = await this.find({ trainerId, status: 'active' });

  const stats = {
    totalResources: resources.length,
    totalDownloads: 0,
    totalViews: 0,
    totalShares: 0,
    byCategory: {},
    byFileType: {},
    totalSize: 0
  };

  resources.forEach(resource => {
    stats.totalDownloads += resource.stats.downloads;
    stats.totalViews += resource.stats.views;
    stats.totalShares += resource.stats.shares;
    stats.totalSize += resource.fileSize;

    // Count by category
    if (!stats.byCategory[resource.category]) {
      stats.byCategory[resource.category] = 0;
    }
    stats.byCategory[resource.category]++;

    // Count by file type
    if (!stats.byFileType[resource.fileType]) {
      stats.byFileType[resource.fileType] = 0;
    }
    stats.byFileType[resource.fileType]++;
  });

  return stats;
};

// Pre-save hook: Validate expiration date
TrainerResourceSchema.pre('save', function(next) {
  if (this.expiresAt && this.expiresAt <= new Date()) {
    return next(new Error('Expiration date must be in the future'));
  }
  next();
});

// Pre-save hook: Update stats count
TrainerResourceSchema.pre('save', function(next) {
  if (this.isModified('sharedWith')) {
    this.stats.shares = this.sharedWith.length;
  }
  next();
});

module.exports = mongoose.model('TrainerResource', TrainerResourceSchema);
