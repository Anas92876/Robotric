const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true },
    role: {
      type: String,
      enum: ["student", "trainer", "teacher", "admin", "judge", "editor", "organizer", "superadmin", "reception", "clo", "social", "cto", "engineer", "driver", "client"],
      default: "student",
    },
    assignedCompetitionId: { type: mongoose.Schema.Types.ObjectId, ref: "Competition", index: true },
    profile: { type: mongoose.Schema.Types.Mixed },
    // Staff paid by the hour — enables work clock (set by CTO)
    isHourly: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
