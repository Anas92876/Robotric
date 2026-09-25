const mongoose = require("mongoose");

const imageSchema = new mongoose.Schema(
  {
    filename: { type: String, required: true },
    originalname: { type: String, required: true },
    mimetype: { type: String, required: true },
    size: { type: Number, required: true },
    filePath: { type: String, required: true }, // Path to file on disk (filesystem-only storage)
    imageType: {
      type: String,
      enum: ["profile", "part", "project", "post", "other"],
      required: true,
    },
    associatedId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "associatedModel",
    },
    associatedModel: {
      type: String,
      enum: ["User", "Part", "Project", "Post"],
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

imageSchema.index({ imageType: 1, associatedId: 1 });
imageSchema.index({ uploadedBy: 1 });

module.exports = mongoose.model("Image", imageSchema);
