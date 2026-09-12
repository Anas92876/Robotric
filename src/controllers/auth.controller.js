const bcrypt = require("bcryptjs");
const Joi = require("joi");
const User = require("../models/User");
const Lead = require("../models/Lead");
const Enrollment = require("../models/Enrollment");
const PushToken = require("../models/PushToken");
const { signJwt } = require("../utils/jwt");
const asyncHandler = require("../utils/asyncHandler");
const { ValidationError, UnauthorizedError, NotFoundError } = require("../utils/errors");
const logger = require("../utils/logger");
const { sendOTP } = require("../services/email.service");

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Helper: Get both English and Arabic names from Lead database
 */
async function getNamesFromLead(user) {
  try {
    const lead = await Lead.findOne({
      $or: [
        { fullName: user.name },
        { englishName: user.name },
        { email: user.email }
      ]
    }).select('englishName fullName');

    if (!lead) return { name: user.name, nameAr: null };

    return {
      name: lead.englishName || lead.fullName || user.name,
      nameAr: lead.fullName || null
    };
  } catch (error) {
    logger.logError(error, { context: 'getNamesFromLead' });
    return { name: user.name, nameAr: null };
  }
}

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

/**
 * Login a user
 * POST /api/auth/login
 */
const login = asyncHandler(async (req, res) => {
  const { error, value } = loginSchema.validate(req.body);
  if (error) throw new ValidationError(error.message);

  const { email, password } = value;
  logger.logDB('findOne', 'User', { email });

  const user = await User.findOne({ email });
  if (!user) {
    logger.logSecurity('login_failed', { email, reason: 'user_not_found' });
    throw new UnauthorizedError('Invalid credentials', 'INVALID_CREDENTIALS');
  }

  if (user.profile && user.profile.status === 'inactive') {
    logger.logSecurity('login_failed', { email, userId: user._id, reason: 'user_inactive' });
    throw new UnauthorizedError('Account has been deactivated. Please contact support.', 'ACCOUNT_DEACTIVATED');
  }

  if (user.role === 'student') {
    const enrollments = await Enrollment.find({ student: user._id }).select('status').lean();
    if (enrollments.length > 0 && enrollments.every(e => e.status === 'inactive')) {
      logger.logSecurity('login_failed', { email, userId: user._id, reason: 'enrollment_inactive' });
      throw new UnauthorizedError('Your account has been deactivated. Please contact reception.', 'ENROLLMENT_INACTIVE');
    }
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    logger.logSecurity('login_failed', { email, userId: user._id, reason: 'wrong_password' });
    throw new UnauthorizedError('Invalid credentials', 'INVALID_CREDENTIALS');
  }

  const { name, nameAr } = await getNamesFromLead(user);
  const token = signJwt({ id: user._id, role: user.role, name: name, email: user.email });
  const isMobile = req.headers['x-platform'] === 'mobile';

  logger.logAuth('login', { id: user._id, email: user.email, role: user.role, platform: isMobile ? 'mobile' : 'web' });

  const responseData = {
    _id: user._id,
    id: user._id,
    email: user.email,
    role: user.role,
    name: name,
    nameAr: nameAr,
    assignedCompetitionId: user.assignedCompetitionId,
    token: token
  };

  if (!isMobile) {
    const isProduction = process.env.NODE_ENV === "production";
    const isCrossSite = process.env.CLIENT_ORIGIN && process.env.CLIENT_ORIGIN !== "http://localhost:5173";
    res.cookie("token", token, {
      httpOnly: true,
      sameSite: (isProduction || isCrossSite) ? "none" : (process.env.COOKIE_SAMESITE || "lax"),
      secure: process.env.COOKIE_SECURE === "true" || isProduction,
      maxAge: 7 * 24 * 3600 * 1000,
      domain: process.env.COOKIE_DOMAIN || undefined,
      path: "/",
    });
  }

  res.json({ success: true, message: 'Login successful', data: responseData });
});

/**
 * Logout a user
 * POST /api/auth/logout
 */
const logout = asyncHandler(async (req, res) => {
  const userId = req.user?._id || req.user?.id;
  logger.logAuth('logout', req.user || {});

  if (userId) {
    try {
      const result = await PushToken.updateMany(
        { userId, isActive: true },
        { isActive: false, deactivatedAt: new Date() }
      );
      if (result.modifiedCount > 0) {
        logger.info(`Deactivated ${result.modifiedCount} push token(s) on logout for user ${userId}`);
      }
    } catch (err) {
      logger.error('Failed to deactivate push tokens on logout:', { userId, error: err.message });
    }
  }

  res.clearCookie("token", {
    sameSite: process.env.COOKIE_SAMESITE || "lax",
    secure: process.env.COOKIE_SECURE === "true" || process.env.NODE_ENV === "production",
    path: "/"
  });

  res.json({ success: true, message: 'Logged out successfully' });
});

/**
 * Get current user
 * GET /api/auth/me
 */
const me = asyncHandler(async (req, res) => {
  logger.logDB('findById', 'User', { id: req.user.id });
  const user = await User.findById(req.user.id).lean();
  if (!user) throw new NotFoundError('User');

  const { name, nameAr } = await getNamesFromLead(user);

  res.json({
    success: true,
    data: {
      _id: user._id,
      id: user._id,
      email: user.email,
      role: user.role,
      name: name,
      nameAr: nameAr,
      assignedCompetitionId: user.assignedCompetitionId,
    }
  });
});

// ─── Change Password (authenticated) ────────────────────────────────────────

const changePasswordRequestSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(8).required(),
});

/**
 * Step 1: Validate current + new password, send OTP to current email
 * POST /api/auth/change-password/request
 */
const requestPasswordChange = asyncHandler(async (req, res) => {
  const { error, value } = changePasswordRequestSchema.validate(req.body);
  if (error) throw new ValidationError(error.message);

  const { currentPassword, newPassword } = value;
  const user = await User.findById(req.user.id);
  if (!user) throw new NotFoundError('User');

  const ok = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!ok) {
    logger.logSecurity('change_password_failed', { userId: user._id, reason: 'wrong_current_password' });
    throw new UnauthorizedError('Current password is incorrect', 'WRONG_PASSWORD');
  }

  const otp = generateOTP();
  const expiry = new Date(Date.now() + 10 * 60 * 1000);
  const newHash = await bcrypt.hash(newPassword, 10);

  user.profile = {
    ...(user.profile || {}),
    passwordOTP: otp,
    passwordOTPExpiry: expiry,
    pendingPasswordHash: newHash,
  };
  await user.save();

  await sendOTP(user.email, otp, 'passwordChange');

  logger.logAuth('change_password_otp_sent', { userId: user._id, email: user.email });
  res.json({ success: true, message: 'OTP sent to your email' });
});

/**
 * Step 2: Verify OTP, apply new password
 * POST /api/auth/change-password/confirm
 */
const confirmPasswordChange = asyncHandler(async (req, res) => {
  const { otp } = req.body;
  if (!otp) throw new ValidationError('OTP is required');

  const user = await User.findById(req.user.id);
  if (!user) throw new NotFoundError('User');

  const profile = user.profile || {};
  if (!profile.passwordOTP || !profile.passwordOTPExpiry || !profile.pendingPasswordHash) {
    throw new ValidationError('No pending password change. Please request a new code.');
  }

  if (new Date() > new Date(profile.passwordOTPExpiry)) {
    user.profile = { ...profile, passwordOTP: undefined, passwordOTPExpiry: undefined, pendingPasswordHash: undefined, passwordOTPAttempts: undefined };
    await user.save();
    throw new ValidationError('OTP has expired. Please request a new code.');
  }

  const attempts = (profile.passwordOTPAttempts || 0) + 1;
  if (profile.passwordOTP !== otp.toString().trim()) {
    logger.logSecurity('change_password_wrong_otp', { userId: user._id, attempts });
    if (attempts >= 5) {
      user.profile = { ...profile, passwordOTP: undefined, passwordOTPExpiry: undefined, pendingPasswordHash: undefined, passwordOTPAttempts: undefined };
      await user.save();
      throw new ValidationError('Too many incorrect attempts. Please request a new code.');
    }
    user.profile = { ...profile, passwordOTPAttempts: attempts };
    await user.save();
    throw new ValidationError('Invalid OTP');
  }

  user.passwordHash = profile.pendingPasswordHash;
  user.profile = { ...profile, passwordOTP: undefined, passwordOTPExpiry: undefined, pendingPasswordHash: undefined, passwordOTPAttempts: undefined };
  await user.save();

  logger.logAuth('change_password_success', { userId: user._id });
  res.json({ success: true, message: 'Password changed successfully' });
});

// ─── Change Email (authenticated) ───────────────────────────────────────────

const changeEmailRequestSchema = Joi.object({
  newEmail: Joi.string().email().required(),
});

/**
 * Step 1: Validate new email, send OTP to new email
 * POST /api/auth/change-email/request
 */
const requestEmailChange = asyncHandler(async (req, res) => {
  const { error, value } = changeEmailRequestSchema.validate(req.body);
  if (error) throw new ValidationError(error.message);

  const { newEmail } = value;
  const user = await User.findById(req.user.id);
  if (!user) throw new NotFoundError('User');

  const existing = await User.findOne({ email: newEmail });
  if (existing) {
    logger.logSecurity('change_email_duplicate_silenced', { userId: user._id, newEmail });
    return res.json({ success: true, message: 'If that address is available, a verification code has been sent to it' });
  }

  const otp = generateOTP();
  const expiry = new Date(Date.now() + 10 * 60 * 1000);

  user.profile = {
    ...(user.profile || {}),
    emailOTP: otp,
    emailOTPExpiry: expiry,
    pendingEmail: newEmail,
  };
  await user.save();

  await sendOTP(newEmail, otp, 'emailChange');

  logger.logAuth('change_email_otp_sent', { userId: user._id, newEmail });
  res.json({ success: true, message: 'If that address is available, a verification code has been sent to it' });
});

/**
 * Step 2: Verify OTP, apply new email
 * POST /api/auth/change-email/confirm
 */
const confirmEmailChange = asyncHandler(async (req, res) => {
  const { otp } = req.body;
  if (!otp) throw new ValidationError('OTP is required');

  const user = await User.findById(req.user.id);
  if (!user) throw new NotFoundError('User');

  const profile = user.profile || {};
  if (!profile.emailOTP || !profile.emailOTPExpiry || !profile.pendingEmail) {
    throw new ValidationError('No pending email change. Please request a new code.');
  }

  if (new Date() > new Date(profile.emailOTPExpiry)) {
    user.profile = { ...profile, emailOTP: undefined, emailOTPExpiry: undefined, pendingEmail: undefined, emailOTPAttempts: undefined };
    await user.save();
    throw new ValidationError('OTP has expired. Please request a new code.');
  }

  const attempts = (profile.emailOTPAttempts || 0) + 1;
  if (profile.emailOTP !== otp.toString().trim()) {
    logger.logSecurity('change_email_wrong_otp', { userId: user._id, attempts });
    if (attempts >= 5) {
      user.profile = { ...profile, emailOTP: undefined, emailOTPExpiry: undefined, pendingEmail: undefined, emailOTPAttempts: undefined };
      await user.save();
      throw new ValidationError('Too many incorrect attempts. Please request a new code.');
    }
    user.profile = { ...profile, emailOTPAttempts: attempts };
    await user.save();
    throw new ValidationError('Invalid OTP');
  }

  const alreadyTaken = await User.findOne({ email: profile.pendingEmail });
  if (alreadyTaken) {
    user.profile = { ...profile, emailOTP: undefined, emailOTPExpiry: undefined, pendingEmail: undefined, emailOTPAttempts: undefined };
    await user.save();
    throw new ValidationError('That email address is no longer available. Please request a new change.');
  }

  user.email = profile.pendingEmail;
  user.profile = { ...profile, emailOTP: undefined, emailOTPExpiry: undefined, pendingEmail: undefined, emailOTPAttempts: undefined };
  await user.save();

  logger.logAuth('change_email_success', { userId: user._id, newEmail: user.email });
  res.json({ success: true, message: 'Email changed successfully', data: { email: user.email } });
});

// ─── Forgot Password (public) ────────────────────────────────────────────────

const forgotPasswordRequestSchema = Joi.object({
  email: Joi.string().email().required(),
});

const forgotPasswordConfirmSchema = Joi.object({
  email: Joi.string().email().required(),
  otp: Joi.string().length(6).required(),
  newPassword: Joi.string().min(8).required(),
});

/**
 * Public step 1: Send OTP to email if registered — always same response
 * POST /api/auth/forgot-password/request
 */
const requestForgotPassword = asyncHandler(async (req, res) => {
  const { error, value } = forgotPasswordRequestSchema.validate(req.body);
  if (error) throw new ValidationError(error.message);

  const { email } = value;
  const GENERIC = 'If that email is registered, a verification code has been sent to it.';

  const user = await User.findOne({ email });
  if (!user) {
    logger.logSecurity('forgot_password_email_not_found', { email });
    return res.json({ success: true, message: GENERIC });
  }

  const otp = generateOTP();
  const expiry = new Date(Date.now() + 10 * 60 * 1000);

  user.profile = {
    ...(user.profile || {}),
    forgotOTP: otp,
    forgotOTPExpiry: expiry,
    forgotOTPAttempts: 0,
  };
  await user.save();

  await sendOTP(email, otp, 'passwordChange');

  logger.logAuth('forgot_password_otp_sent', { userId: user._id, email });
  res.json({ success: true, message: GENERIC });
});

/**
 * Public step 2: Verify OTP + apply new password
 * POST /api/auth/forgot-password/confirm
 */
const confirmForgotPassword = asyncHandler(async (req, res) => {
  const { error, value } = forgotPasswordConfirmSchema.validate(req.body);
  if (error) throw new ValidationError(error.message);

  const { email, otp, newPassword } = value;

  const user = await User.findOne({ email });
  if (!user) throw new ValidationError('Invalid or expired code. Please request a new one.');

  const profile = user.profile || {};
  if (!profile.forgotOTP || !profile.forgotOTPExpiry) {
    throw new ValidationError('No pending reset request. Please request a new code.');
  }

  if (new Date() > new Date(profile.forgotOTPExpiry)) {
    user.profile = { ...profile, forgotOTP: undefined, forgotOTPExpiry: undefined, forgotOTPAttempts: undefined };
    await user.save();
    throw new ValidationError('Code has expired. Please request a new one.');
  }

  const attempts = (profile.forgotOTPAttempts || 0) + 1;
  if (profile.forgotOTP !== otp.toString().trim()) {
    logger.logSecurity('forgot_password_wrong_otp', { userId: user._id, attempts });
    if (attempts >= 5) {
      user.profile = { ...profile, forgotOTP: undefined, forgotOTPExpiry: undefined, forgotOTPAttempts: undefined };
      await user.save();
      throw new ValidationError('Too many incorrect attempts. Please request a new code.');
    }
    user.profile = { ...profile, forgotOTPAttempts: attempts };
    await user.save();
    throw new ValidationError('Invalid code. Please try again.');
  }

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  user.profile = { ...profile, forgotOTP: undefined, forgotOTPExpiry: undefined, forgotOTPAttempts: undefined };
  await user.save();

  logger.logAuth('forgot_password_success', { userId: user._id });
  res.json({ success: true, message: 'Password reset successfully. You can now sign in.' });
});

module.exports = {
  login, logout, me,
  requestPasswordChange, confirmPasswordChange,
  requestEmailChange, confirmEmailChange,
  requestForgotPassword, confirmForgotPassword,
};
