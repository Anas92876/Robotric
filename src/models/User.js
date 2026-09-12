const mongoose = require("mongoose");

/**
 * Transient authentication secrets.
 *
 * These previously lived inside the `profile` Mixed blob, which is serialised
 * wholesale by endpoints such as reception's getAllUsers. That meant any user
 * who could list users could read another user's *active* password-reset OTP
 * and take over the account, and could read pending bcrypt hashes.
 *
 * They now live here with `select: false`, so no ordinary query returns them.
 * The auth flows that legitimately need them opt in with `.select('+auth')`.
 *
 * Everything in here is short-lived (10-minute OTP windows); nothing here is
 * durable user data.
 */
const authSecretsSchema = new mongoose.Schema(
  {
    // Password change (authenticated)
    passwordOTP: String,
    passwordOTPExpiry: Date,
    passwordOTPAttempts: Number,
    pendingPasswordHash: String,

    // Email change (authenticated)
    emailOTP: String,
    emailOTPExpiry: Date,
    emailOTPAttempts: Number,
    pendingEmail: String,

    // Forgot password (public)
    forgotOTP: String,
    forgotOTPExpiry: Date,
    forgotOTPAttempts: Number,
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, index: true },
    // select:false — 78 of 80 user queries did not exclude this, so the bcrypt
    // hash was returned by any endpoint that serialised a user document.
    // Login and password-change opt in with .select('+passwordHash').
    passwordHash: { type: String, required: true, select: false },
    name: { type: String, required: true },
    role: {
      type: String,
      enum: ["student", "trainer", "teacher", "admin", "judge", "editor", "organizer", "superadmin", "reception", "clo", "social", "cto", "engineer", "driver", "client"],
      default: "student",
    },
    assignedCompetitionId: { type: mongoose.Schema.Types.ObjectId, ref: "Competition", index: true },
    profile: { type: mongoose.Schema.Types.Mixed },
    auth: { type: authSecretsSchema, select: false, default: undefined },
    // Bumped whenever every existing session for this user must stop working:
    // password change, password reset, role change, or an explicit logout-all.
    // The value is embedded in the JWT and compared on every authenticated
    // request, so revocation is immediate instead of waiting out the 7-day
    // token lifetime.
    tokenVersion: { type: Number, default: 0 },
    // Staff paid by the hour — enables work clock (set by CTO)
    isHourly: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
