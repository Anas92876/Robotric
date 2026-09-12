const mongoose = require("mongoose");

const projectPartSchema = new mongoose.Schema(
  {
    partId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Part",
      required: true,
    },
    qty: { type: Number, required: true },
  },
  { _id: false }
);

const projectSchema = new mongoose.Schema(
  {
    // Existing fields (keep for inventory system):
    title: { type: String, required: true },
    description: { type: String },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true, // Index for filtering projects by owner
    },
    parts: { type: [projectPartSchema], default: [] }, // Keep existing inventory system
    
    // New fields for student projects:
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group"
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      index: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    titleAr: {
      type: String,
      trim: true,
      maxlength: [200, 'Title (Arabic) cannot exceed 200 characters']
    },
    descriptionAr: {
      type: String,
      trim: true,
      maxlength: [5000, 'Description (Arabic) cannot exceed 5000 characters']
    },
    images: [{
      cloudinaryUrl: {
        type: String,
        required: true
      },
      cloudinaryPublicId: {
        type: String,
        required: true
      },
      order: {
        type: Number,
        default: 0
      }
    }],
    components: [{
      type: String,
      trim: true,
      maxlength: [200, 'Component name cannot exceed 200 characters']
    }],
    technologies: [{
      type: String,
      trim: true,
      maxlength: [200, 'Technology name cannot exceed 200 characters']
    }],
    status: {
      type: String,
      enum: ['in_progress', 'completed', 'submitted'],
      default: 'in_progress'
    },
    grade: {
      type: Number,
      min: [0, 'Grade cannot be negative']
    },
    feedback: {
      type: String,
      trim: true,
      maxlength: [5000, 'Feedback cannot exceed 5000 characters']
    },
    gradedAt: {
      type: Date
    },
    gradedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  },
  { timestamps: true }
);

// Compound index for user's projects ordered by creation date
projectSchema.index({ ownerId: 1, createdAt: -1 });

// New indexes for student projects
projectSchema.index({ studentId: 1 }); // Index for querying student projects (not unique - students can have multiple projects)
projectSchema.index({ groupId: 1 });
projectSchema.index({ createdBy: 1 });

module.exports = mongoose.model("Project", projectSchema);
