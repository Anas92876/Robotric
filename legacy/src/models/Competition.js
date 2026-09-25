const mongoose = require("mongoose");

const competitionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    description: { type: String },
    maxTeams: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Competition", competitionSchema);
