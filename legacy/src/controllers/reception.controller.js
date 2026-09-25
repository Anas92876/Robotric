const bcrypt = require('bcryptjs');
const { parsePagination } = require('../utils/http');
const User = require('../models/User');
const Enrollment = require('../models/Enrollment');
const Payment = require('../models/Payment');
const Group = require('../models/Group');
const Receipt = require('../models/Receipt');
const Lead = require('../models/Lead');
const asyncHandler = require('../utils/asyncHandler');
const { BadRequestError, NotFoundError, ConflictError } = require('../utils/errors');

/**
 * @desc    Get reception dashboard statistics
 * @route   GET /api/reception/dashboard
 * @access  Private/Reception
 */
const getDashboardStats = asyncHandler(async (req, res) => {
  // Get counts
  const totalStudents = await User.countDocuments({ role: 'student' });
  const totalTrainers = await User.countDocuments({
    role: { $in: ['trainer', 'teacher'] }
  });
  const totalEnrollments = await Enrollment.countDocuments();

  // Get recent enrollments (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const recentEnrollments = await Enrollment.countDocuments({
    createdAt: { $gte: sevenDaysAgo }
  });

  // Get active groups count
  const activeGroups = await Group.countDocuments({ status: 'active' });

  res.status(200).json({
    success: true,
    data: {
      totalStudents,
      totalTrainers,
      totalEnrollments,
      recentEnrollments,
      activeGroups
    }
  });
});

/**
 * @desc    Get all users with filters
 * @route   GET /api/reception/users
 * @access  Private/Reception
 */
const getAllUsers = asyncHandler(async (req, res) => {
  const { role, search } = req.query;

  const query = {};

  // Filter by role
  if (role) {
    query.role = role;
  }

  // Search by name or email
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];
  }

  const { page: safePage, limit: safeLimit, skip } = parsePagination(req.query);

  const users = await User.find(query)
    .select('-passwordHash')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(safeLimit);

  const total = await User.countDocuments(query);

  res.status(200).json({
    success: true,
    data: users,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      pages: Math.ceil(total / safeLimit)
    }
  });
});

/**
 * @desc    Create new user
 * @route   POST /api/reception/users
 * @access  Private/Reception
 */
const createUser = asyncHandler(async (req, res) => {
  const { name, email, password, role, phone } = req.body;

  // Validate required fields
  if (!name || !email || !password || !role) {
    throw new BadRequestError('Please provide name, email, password, and role');
  }

  // Restrict roles that reception can assign
  const allowedRoles = ['student', 'trainer', 'teacher', 'social', 'reception', 'clo', 'admin', 'cto', 'engineer', 'client'];
  if (!allowedRoles.includes(role)) {
    throw new BadRequestError(`Invalid role: ${role}`);
  }

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ConflictError('User with this email already exists');
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 10);

  // Create user
  const user = await User.create({
    name,
    email,
    passwordHash,
    role,
    profile: phone ? { phone } : {}
  });

  // Remove password from response
  const userResponse = user.toObject();
  delete userResponse.passwordHash;

  res.status(201).json({
    success: true,
    message: 'User created successfully',
    data: userResponse
  });
});

/**
 * @desc    Update user
 * @route   PUT /api/reception/users/:id
 * @access  Private/Reception
 */
const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, email, role, phone, password } = req.body;

  const user = await User.findById(id);
  if (!user) {
    throw new NotFoundError('User');
  }

  // Update fields
  if (name) user.name = name;
  if (email) {
    // Check if email is already taken by another user
    const existingUser = await User.findOne({ email, _id: { $ne: id } });
    if (existingUser) {
      throw new ConflictError('Email already in use');
    }
    user.email = email;
  }
  // A role change must invalidate existing sessions: the role is baked into the
  // JWT, so without this the user keeps their old permissions until the token
  // expires — including after a demotion.
  let mustRevokeSessions = false;

  if (role) {
    const allowedRoles = ['student', 'trainer', 'teacher', 'social', 'reception', 'clo', 'admin', 'cto', 'engineer', 'client'];
    if (!allowedRoles.includes(role)) {
      throw new BadRequestError(`Invalid role: ${role}`);
    }
    if (user.role !== role) mustRevokeSessions = true;
    user.role = role;
  }
  if (phone !== undefined) {
    user.profile = { ...user.profile, phone };
  }

  // Update password if provided
  if (password) {
    user.passwordHash = await bcrypt.hash(password, 10);
    mustRevokeSessions = true;
  }

  if (mustRevokeSessions) {
    user.tokenVersion = (user.tokenVersion ?? 0) + 1;
  }

  await user.save();

  // Remove password from response
  const userResponse = user.toObject();
  delete userResponse.passwordHash;

  res.status(200).json({
    success: true,
    message: 'User updated successfully',
    data: userResponse
  });
});

/**
 * @desc    Delete user permanently
 * @route   DELETE /api/reception/users/:id
 * @access  Private/Reception
 */
const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await User.findById(id);
  if (!user) {
    throw new NotFoundError('User');
  }

  // Prevent deletion of admin users
  if (user.role === 'admin' || user.role === 'clo') {
    throw new BadRequestError('Cannot delete admin or CLO users');
  }

  // Delete the user permanently
  await User.findByIdAndDelete(id);

  res.status(200).json({
    success: true,
    message: 'User deleted permanently'
  });
});


/**
 * @desc    Get recent enrollments (last 7 days)
 * @route   GET /api/reception/recent-enrollments
 * @access  Private/Reception
 */
const getRecentEnrollments = asyncHandler(async (req, res) => {
  const { limit: safeLimit } = parsePagination(req.query, { defaultLimit: 10 });

  // Get enrollments from last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const enrollments = await Enrollment.find({
    createdAt: { $gte: sevenDaysAgo }
  })
    .populate('student', 'name email')
    .populate('course', 'title')
    .sort({ enrolledAt: -1 })
    .limit(safeLimit);

  res.status(200).json({
    success: true,
    data: enrollments
  });
});

/**
 * @desc    Get recent activities (payments, status changes, leads converted)
 * @route   GET /api/reception/recent-activities
 * @access  Private/Reception
 */
const getRecentActivities = asyncHandler(async (req, res) => {
  const { limit: safeLimit } = parsePagination(req.query, { defaultLimit: 20 });

  // Combine and format activities
  const activities = [];

  // Get recent receipts (payments)
  try {
    const recentReceipts = await Receipt.find()
      .populate('student', 'name')
      .populate('course', 'title')
      .populate('issuedBy', 'name')
      .sort({ createdAt: -1 })
      .limit(safeLimit)
      .lean();

    // Add payment activities
    recentReceipts.forEach(receipt => {
      if (receipt.student && receipt.course && receipt.issuedBy) {
        activities.push({
          type: 'payment',
          date: receipt.createdAt,
          description: `Payment received from ${receipt.student.name}`,
          details: {
            amount: receipt.payment.amount,
            course: receipt.course.title,
            receiptNumber: receipt.receiptNumber,
            receivedBy: receipt.issuedBy.name
          }
        });
      }
    });
  } catch (err) {
    // Continue even if receipts fail - log but don't throw
    console.error('Error fetching receipts:', err);
  }

  // Get recently converted leads
  // Note: convertedToStudent is an ObjectId field, not a boolean
  // We check if it exists (is not null) to find converted leads
  try {
    const recentConversions = await Lead.find({ 
      convertedToStudent: { $ne: null } 
    })
      .select('fullName convertedAt')
      .sort({ convertedAt: -1 })
      .limit(safeLimit)
      .lean();

    // Add lead conversion activities
    recentConversions.forEach(lead => {
      if (lead.convertedAt) {
        activities.push({
          type: 'lead_converted',
          date: lead.convertedAt,
          description: `${lead.fullName} converted to student`,
          details: {
            leadName: lead.fullName
          }
        });
      }
    });
  } catch (err) {
    // Continue even if leads fail - log but don't throw
    console.error('Error fetching lead conversions:', err);
  }

  // Get recent enrollments (not updates, just recent ones)
  try {
    const recentEnrollments = await Enrollment.find()
      .populate('student', 'name')
      .populate('course', 'title')
      .sort({ createdAt: -1 })
      .limit(safeLimit)
      .lean();

    // Add enrollment activities (only for enrollments created in last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    recentEnrollments.forEach(enrollment => {
      if (enrollment.student && enrollment.course && new Date(enrollment.createdAt) > sevenDaysAgo) {
        activities.push({
          type: 'enrollment_created',
          date: enrollment.createdAt,
          description: `${enrollment.student.name} enrolled in ${enrollment.course.title}`,
          details: {
            status: enrollment.status,
            studentName: enrollment.student.name,
            courseName: enrollment.course.title
          }
        });
      }
    });
  } catch (err) {
    // Continue even if enrollments fail - log but don't throw
    console.error('Error fetching enrollments:', err);
  }

  // Sort all activities by date
  activities.sort((a, b) => new Date(b.date) - new Date(a.date));

  // Limit to requested number
  const limitedActivities = activities.slice(0, parseInt(limit));

  res.status(200).json({
    success: true,
    data: limitedActivities
  });
});

module.exports = {
  getDashboardStats,
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  getRecentEnrollments,
  getRecentActivities
};
