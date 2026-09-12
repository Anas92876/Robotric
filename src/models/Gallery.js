/**
 * Gallery Model
 * 
 * Represents images in the gallery for a group.
 * Can be either 'moment' images (uploaded by Trainer/Reception) or 'project' images (linked to student projects).
 */

const mongoose = require('mongoose');

const GallerySchema = new mongoose.Schema({
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: [true, 'Group is required'],
    index: true
  },
  type: {
    type: String,
    enum: ['moment', 'project'],
    required: [true, 'Type is required'],
    index: true
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Uploader is required']
  },
  cloudinaryUrl: {
    type: String,
    required: [true, 'Cloudinary URL is required']
  },
  cloudinaryPublicId: {
    type: String,
    required: [true, 'Cloudinary public ID is required']
  },
  thumbnailUrl: {
    type: String,
    validate: {
      validator: function(v) {
        // Allow null/undefined (optional field)
        if (!v) return true;
        
        // Validate URL format
        if (typeof v !== 'string') return false;
        
        try {
          const url = new URL(v);
          // Must be HTTPS
          if (url.protocol !== 'https:') return false;
          // Must have valid hostname
          if (!url.hostname || url.hostname.length === 0) return false;
          // Should be a Cloudinary URL
          if (!url.hostname.includes('cloudinary.com') && !url.hostname.includes('res.cloudinary.com')) {
            // Log warning but don't fail validation (in case of custom CDN)
            console.warn('Thumbnail URL does not appear to be from Cloudinary:', v);
          }
          // Should not have query parameters (standardized format)
          if (url.search && url.search.length > 0) {
            console.warn('Thumbnail URL contains query parameters (should be standardized):', v);
          }
          return true;
        } catch {
          return false;
        }
      },
      message: 'Thumbnail URL must be a valid HTTPS URL'
    }
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    index: true
  },
  title: {
    type: String,
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  order: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes
GallerySchema.index({ groupId: 1, type: 1 });
GallerySchema.index({ uploadedBy: 1 });
GallerySchema.index({ studentId: 1 }); // For project type images

module.exports = mongoose.model('Gallery', GallerySchema);
