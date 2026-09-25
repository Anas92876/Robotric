/**
 * CLO Subscription Plans Controller
 * 
 * Handles CRUD operations for subscription plans
 * CLO role can create, read, update, and delete subscription plans
 */

const asyncHandler = require('../utils/asyncHandler');
const { NotFoundError, BadRequestError, ValidationError } = require('../utils/errors');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const UserSubscription = require('../models/UserSubscription');

/**
 * Get all subscription plans
 * GET /api/clo/subscription-plans
 */
exports.getSubscriptionPlans = asyncHandler(async (req, res) => {
  const plans = await SubscriptionPlan.find({})
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    data: {
      plans
    }
  });
});

/**
 * Get single subscription plan
 * GET /api/clo/subscription-plans/:id
 */
exports.getSubscriptionPlan = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const plan = await SubscriptionPlan.findById(id);

  if (!plan) {
    throw new NotFoundError('Subscription plan');
  }

  res.json({
    success: true,
    data: plan
  });
});

/**
 * Create subscription plan
 * POST /api/clo/subscription-plans
 */
exports.createSubscriptionPlan = asyncHandler(async (req, res) => {
  const { name, monthlyHours, price, isActive, description } = req.body;

  // Validation
  if (!name || !name.trim()) {
    throw new ValidationError('Plan name is required');
  }

  if (name.length > 100) {
    throw new ValidationError('Plan name cannot exceed 100 characters');
  }

  if (monthlyHours === undefined || monthlyHours === null) {
    throw new ValidationError('Monthly hours is required');
  }

  if (monthlyHours < 1 || monthlyHours > 1000) {
    throw new ValidationError('Monthly hours must be between 1 and 1000');
  }

  if (price === undefined || price === null) {
    throw new ValidationError('Price is required');
  }

  if (price < 0) {
    throw new ValidationError('Price cannot be negative');
  }

  if (description && description.length > 500) {
    throw new ValidationError('Description cannot exceed 500 characters');
  }

  // Check for duplicate name
  const existingPlan = await SubscriptionPlan.findOne({ name: name.trim() });
  if (existingPlan) {
    throw new BadRequestError('A subscription plan with this name already exists');
  }

  // Create plan
  const plan = await SubscriptionPlan.create({
    name: name.trim(),
    monthlyHours,
    price,
    isActive: isActive !== undefined ? isActive : true,
    description: description ? description.trim() : undefined
  });

  res.status(201).json({
    success: true,
    message: 'Subscription plan created successfully',
    data: plan
  });
});

/**
 * Update subscription plan
 * PUT /api/clo/subscription-plans/:id
 */
exports.updateSubscriptionPlan = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, monthlyHours, price, isActive, description } = req.body;

  const plan = await SubscriptionPlan.findById(id);

  if (!plan) {
    throw new NotFoundError('Subscription plan');
  }

  // Validation
  if (name !== undefined) {
    if (!name || !name.trim()) {
      throw new ValidationError('Plan name cannot be empty');
    }
    if (name.length > 100) {
      throw new ValidationError('Plan name cannot exceed 100 characters');
    }
    // Check for duplicate name (excluding current plan)
    const existingPlan = await SubscriptionPlan.findOne({ 
      name: name.trim(),
      _id: { $ne: id }
    });
    if (existingPlan) {
      throw new BadRequestError('A subscription plan with this name already exists');
    }
    plan.name = name.trim();
  }

  if (monthlyHours !== undefined) {
    if (monthlyHours < 1 || monthlyHours > 1000) {
      throw new ValidationError('Monthly hours must be between 1 and 1000');
    }
    plan.monthlyHours = monthlyHours;
  }

  if (price !== undefined) {
    if (price < 0) {
      throw new ValidationError('Price cannot be negative');
    }
    plan.price = price;
  }

  if (isActive !== undefined) {
    plan.isActive = isActive;
  }

  if (description !== undefined) {
    if (description && description.length > 500) {
      throw new ValidationError('Description cannot exceed 500 characters');
    }
    plan.description = description ? description.trim() : undefined;
  }

  await plan.save();

  res.json({
    success: true,
    message: 'Subscription plan updated successfully',
    data: plan
  });
});

/**
 * Delete subscription plan
 * DELETE /api/clo/subscription-plans/:id
 */
exports.deleteSubscriptionPlan = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const plan = await SubscriptionPlan.findById(id);

  if (!plan) {
    throw new NotFoundError('Subscription plan');
  }

  // Check if plan is being used by any active subscriptions
  const activeSubscriptions = await UserSubscription.countDocuments({
    planId: id,
    status: 'active'
  });

  if (activeSubscriptions > 0) {
    throw new BadRequestError(
      `Cannot delete plan. It is being used by ${activeSubscriptions} active subscription(s)`
    );
  }

  await SubscriptionPlan.findByIdAndDelete(id);

  res.json({
    success: true,
    message: 'Subscription plan deleted successfully'
  });
});
