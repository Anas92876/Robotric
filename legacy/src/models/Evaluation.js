const mongoose = require("mongoose");

const evaluationSchema = new mongoose.Schema(
  {
    judgeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true, // Index for judge-specific queries
    },
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      required: true,
      index: true, // Index for team-specific queries
    },
    competitionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Competition",
      required: true,
      index: true, // Index for competition-specific queries
    },
    scores: { type: Object, default: {} },
    totalScore: { type: Number, default: 0, index: true }, // Index for sorting by score
    comments: { type: String },
  },
  { timestamps: true }
);

// Compound index for competition rankings (most common query)
evaluationSchema.index({ competitionId: 1, teamId: 1 });

// Compound index for judge's evaluations
evaluationSchema.index({ judgeId: 1, competitionId: 1 });

// Unique constraint: one evaluation per judge per team
evaluationSchema.index({ judgeId: 1, teamId: 1 }, { unique: true });

module.exports = mongoose.model("Evaluation", evaluationSchema);
