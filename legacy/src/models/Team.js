const mongoose = require("mongoose");

const teamSchema = new mongoose.Schema(
  {
    competitionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Competition",
      required: true,
      index: true, // Index for filtering teams by competition
    },
    coachId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true, // Index for filtering teams by coach
    },
    name: { type: String, required: true },
    members: { type: [String], default: [] },
  },
  { timestamps: true }
);

// Compound index for efficient queries by competition and coach
teamSchema.index({ competitionId: 1, coachId: 1 });

module.exports = mongoose.model("Team", teamSchema);
