/**
 * Reception User Subscriptions Controller
 * 
 * Handles reception operations for user subscription management
 * Reception role can assign, update, and cancel user subscriptions
 */

const asyncHandler = require('../utils/asyncHandler');
const { NotFoundError, BadRequestError, ValidationError } = require('../utils/errors');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const UserSubscription = require('../models/UserSubscription');
const User = require('../models/User');

/**
 * Get active subscription plans (for dropdown)
 * GET /api/reception/subscription-plans/active
 */
exports.getActiveSubscriptionPlans = asyncHandler(async (req, res) => {
  const plans = await SubscriptionPlan.find({ isActive: true })
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    data: {
      plans
    }
  });
});

/**
 * Get all user subscriptions
 * GET /api/reception/user-subscriptions
 */
exports.getUserSubscriptions = asyncHandler(async (req, res) => {
  const { status, userId } = req.query;

  const query = {};
  if (status && ['active', 'expired', 'canceled'].includes(status)) {
    query.status = status;
  }
  if (userId) {
    query.userId = userId;
  }

  const subscriptions = await UserSubscription.find(query)
    .populate('userId', 'name email role')
    .populate('planId', 'name monthlyHours price')
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    data: {
      subscriptions
    }
  });
});

/**
 * Create user subscription (assign student to plan)
 * POST /api/reception/user-subscriptions
 */
exports.createUserSubscription = asyncHandler(async (req, res) => {
  const { userId, planId, startsAt, endsAt } = req.body;

  // Validation
  if (!userId) {
    throw new ValidationError('User ID is required');
  }

  if (!planId) {
    throw new ValidationError('Plan ID is required');
  }

  if (!startsAt) {
    throw new ValidationError('Start date is required');
  }

  if (!endsAt) {
    throw new ValidationError('End date is required');
  }

  // Validate dates
  const startDate = new Date(startsAt);
  const endDate = new Date(endsAt);

  if (isNaN(startDate.getTime())) {
    throw new ValidationError('Invalid start date format');
  }

  if (isNaN(endDate.getTime())) {
    throw new ValidationError('Invalid end date format');
  }

  if (endDate <= startDate) {
    throw new ValidationError('End date must be after start date');
  }

  // Verify user exists and is a student
  const user = await User.findById(userId);
  if (!user) {
    throw new NotFoundError('User');
  }

  if (user.role !== 'student') {
    throw new BadRequestError('Subscriptions can only be assigned to students');
  }

  // Verify plan exists and is active
  const plan = await SubscriptionPlan.findById(planId);
  if (!plan) {
    throw new NotFoundError('Subscription plan');
  }

  if (!plan.isActive) {
    throw new BadRequestError('Cannot assign inactive subscription plan');
  }

  // Check if user has an active subscription
  const now = new Date();
  const existingActive = await UserSubscription.findOne({
    userId,
    status: 'active',
    endsAt: { $gt: now }
  });

  if (existingActive) {
    // Cancel existing subscription
    existingActive.status = 'canceled';
    existingActive.canceledAt = new Date();
    existingActive.canceledBy = req.user._id || req.user.id;
    await existingActive.save();
  }

  // Create new subscription
  const subscription = await UserSubscription.create({
    userId,
    planId,
    startsAt: startDate,
    endsAt: endDate,
    remainingHours: plan.monthlyHours, // Set to plan's monthly hours
    status: 'active'
  });

  // Populate for response
  await subscription.populate('userId', 'name email role');
  await subscription.populate('planId', 'name monthlyHours price');

  res.status(201).json({
    success: true,
    message: 'Subscription assigned successfully',
    data: subscription
  });
});

/**
 * Update user subscription
 * PUT /api/reception/user-subscriptions/:id
 */
exports.updateUserSubscription = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { endsAt, remainingHours } = req.body;

  const subscription = await UserSubscription.findById(id)
    .populate('planId');

  if (!subscription) {
    throw new NotFoundError('User subscription');
  }

  // Validation
  if (endsAt !== undefined) {
    const endDate = new Date(endsAt);
    if (isNaN(endDate.getTime())) {
      throw new ValidationError('Invalid end date format');
    }

    if (endDate <= subscription.startsAt) {
      throw new ValidationError('End date must be after start date');
    }

    subscription.endsAt = endDate;
  }

  if (remainingHours !== undefined) {
    if (remainingHours < 0) {
      throw new ValidationError('Remaining hours cannot be negative');
    }
    subscription.remainingHours = remainingHours;
  }

  await subscription.save();

  // Populate for response
  await subscription.populate('userId', 'name email role');
  await subscription.populate('planId', 'name monthlyHours price');

  res.json({
    success: true,
    message: 'Subscription updated successfully',
    data: subscription
  });
});

/**
 * Cancel user subscription
 * POST /api/reception/user-subscriptions/:id/cancel
 */
exports.cancelUserSubscription = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const subscription = await UserSubscription.findById(id);

  if (!subscription) {
    throw new NotFoundError('User subscription');
  }

  if (subscription.status === 'canceled') {
    throw new BadRequestError('Subscription is already canceled');
  }

  subscription.status = 'canceled';
  subscription.canceledAt = new Date();
  subscription.canceledBy = req.user._id || req.user.id;

  await subscription.save();

  // Populate for response
  await subscription.populate('userId', 'name email role');
  await subscription.populate('planId', 'name monthlyHours price');

  res.json({
    success: true,
    message: 'Subscription canceled successfully',
    data: subscription
  });
});
