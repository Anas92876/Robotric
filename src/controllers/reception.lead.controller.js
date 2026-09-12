/**
 * Reception Lead Controller
 *
 * Handles lead (interested customers) management for reception staff:
 * - Create new leads
 * - View all leads with filters
 * - Update lead information
 * - Convert lead to student
 * - Track follow-ups
 */

const Lead = require('../models/Lead');
const User = require('../models/User');
const Course = require('../models/Course');

/**
 * Get all leads with filtering and pagination
 * GET /api/reception/leads
 */
exports.getAllLeads = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      interestField,
      referralSource,
      assignedTo,
      search,
      fromDate,
      toDate,
      sortBy = 'leadDate',
      sortOrder = 'desc'
    } = req.query;

    // Build filter query
    const filter = {};

    if (status) filter.status = status;
    if (interestField) filter.interestField = interestField;
    if (referralSource) filter.referralSource = referralSource;
    if (assignedTo) filter.assignedTo = assignedTo;

    // Search by name, mobile, or guardian mobile
    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { mobileNumber: { $regex: search, $options: 'i' } }
      ];
    }

    // Date range filter
    if (fromDate || toDate) {
      filter.createdAt = {};
      if (fromDate) filter.createdAt.$gte = new Date(fromDate);
      if (toDate) filter.createdAt.$lte = new Date(toDate);
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build sort
    const allowedSortFields = ['leadDate', 'createdAt', 'fullName'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'leadDate';
    const sortDir = sortOrder === 'asc' ? 1 : -1;

    let leads;

    if (sortField === 'fullName') {
      // Arabic collation sort
      leads = await Lead.find(filter)
        .populate('assignedTo', 'name email')
        .populate('convertedToStudent', 'name email')
        .sort({ fullName: sortDir })
        .collation({ locale: 'ar' })
        .skip(skip)
        .limit(parseInt(limit));
    } else if (sortField === 'leadDate') {
      // Use aggregation to push null leadDates to the end (asc) or beginning (desc)
      leads = await Lead.aggregate([
        { $match: filter },
        {
          $addFields: {
            _leadDateSort: {
              $ifNull: ['$leadDate', sortDir === 1 ? new Date('9999-12-31') : new Date(0)]
            }
          }
        },
        { $sort: { _leadDateSort: sortDir } },
        { $skip: skip },
        { $limit: parseInt(limit) }
      ]);

      // Re-populate after aggregation
      leads = await Lead.populate(leads, [
        { path: 'assignedTo', select: 'name email' },
        { path: 'convertedToStudent', select: 'name email' }
      ]);
    } else {
      leads = await Lead.find(filter)
        .populate('assignedTo', 'name email')
        .populate('convertedToStudent', 'name email')
        .sort({ [sortField]: sortDir })
        .skip(skip)
        .limit(parseInt(limit));
    }

    const total = await Lead.countDocuments(filter);

    res.json({
      leads,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ message: 'Failed to fetch leads',  });
  }
};

/**
 * Get single lead by ID
 * GET /api/reception/leads/:id
 */
exports.getLeadById = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id)
      .populate('assignedTo', 'name email')
      .populate('convertedToStudent', 'name email');

    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    res.json(lead);
  } catch (error) {
    console.error('Error fetching lead:', error);
    res.status(500).json({ message: 'Failed to fetch lead',  });
  }
};

/**
 * Create new lead
 * POST /api/reception/leads
 */
exports.createLead = async (req, res) => {
  try {
    const {
      fullName,
      englishName,
      firstName,
      lastName,
      gender,
      fatherName,
      motherName,
      dateOfBirth,
      age,
      residence,
      schoolName,
      mobileNumber,
      mobileNumberLabel,
      additionalNumbers,
      socialMedia,
      assignedTo,
      interestField,
      referralSource,
      notes,
      leadDate,
      status = 'new'
    } = req.body;

    // Validate required fields
    if (!fullName || !mobileNumber) {
      return res.status(400).json({
        message: 'Full name and mobile number are required'
      });
    }

    // Create lead
    const lead = new Lead({
      fullName,
      englishName,
      firstName,
      lastName,
      gender,
      fatherName,
      motherName,
      dateOfBirth,
      age,
      residence,
      schoolName,
      mobileNumber,
      mobileNumberLabel,
      additionalNumbers,
      socialMedia,
      assignedTo,
      interestField,
      referralSource,
      notes,
      leadDate: leadDate ? new Date(leadDate) : new Date(),
      status,
      createdBy: req.user.id
    });

    await lead.save();

    // Populate assigned user
    await lead.populate('assignedTo', 'name email');

    res.status(201).json({
      message: 'Lead created successfully',
      lead
    });
  } catch (error) {
    console.error('Error creating lead:', error);
    res.status(500).json({ message: 'Failed to create lead',  });
  }
};

/**
 * Update lead
 * PUT /api/reception/leads/:id
 */
exports.updateLead = async (req, res) => {
  try {
    const leadId = req.params.id;
    const updates = req.body;

    // Don't allow updating certain fields
    delete updates._id;
    delete updates.createdBy;
    delete updates.convertedToStudent;
    delete updates.createdAt;

    const lead = await Lead.findByIdAndUpdate(
      leadId,
      { ...updates, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).populate('assignedTo', 'name email');

    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    res.json({
      message: 'Lead updated successfully',
      lead
    });
  } catch (error) {
    console.error('Error updating lead:', error);
    res.status(500).json({ message: 'Failed to update lead',  });
  }
};

/**
 * Delete lead
 * DELETE /api/reception/leads/:id
 */
exports.deleteLead = async (req, res) => {
  try {
    const lead = await Lead.findByIdAndDelete(req.params.id);

    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    res.json({ message: 'Lead deleted successfully' });
  } catch (error) {
    console.error('Error deleting lead:', error);
    res.status(500).json({ message: 'Failed to delete lead',  });
  }
};

/**
 * Convert lead to student
 * POST /api/reception/leads/:id/convert
 */
exports.convertToStudent = async (req, res) => {
  try {
    const leadId = req.params.id;
    const { email, password } = req.body;

    // Validate required fields for student account
    if (!email || !password) {
      return res.status(400).json({
        message: 'Email and password are required to create student account'
      });
    }

    // Find lead
    const lead = await Lead.findById(leadId);
    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    // Check if already converted
    if (lead.status === 'converted') {
      return res.status(400).json({
        message: 'This lead has already been converted to a student'
      });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        message: 'A user with this email already exists'
      });
    }

    // Hash password
    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash(password, 10);

    // Create student user account
    const student = new User({
      name: lead.fullName || lead.englishName, // Use Arabic name first, fallback to English
      email,
      passwordHash,
      role: 'student',
      profile: {
        phone: lead.mobileNumber,
        status: 'active',
        dateOfBirth: lead.dateOfBirth,
        gender: lead.gender,
        address: lead.residence,
        guardianPhone: lead.guardianMobile,
        school: lead.schoolName,
        fatherName: lead.fatherName,
        motherName: lead.motherName
      }
    });

    await student.save();

    // Update lead status to student
    lead.status = 'student';
    lead.convertedToStudent = student._id;
    lead.convertedAt = new Date();
    await lead.save();

    res.json({
      message: 'Lead converted to student successfully',
      student: {
        _id: student._id,
        name: student.name,
        email: student.email,
        role: student.role
      },
      lead
    });
  } catch (error) {
    console.error('Error converting lead to student:', error);
    res.status(500).json({
      message: 'Failed to convert lead to student',
    });
  }
};

/**
 * Add follow-up note to lead
 * POST /api/reception/leads/:id/follow-up
 */
exports.addFollowUp = async (req, res) => {
  try {
    const leadId = req.params.id;
    const { note, nextFollowUpDate } = req.body;

    if (!note) {
      return res.status(400).json({ message: 'Follow-up note is required' });
    }

    const lead = await Lead.findById(leadId);
    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    // Add follow-up to array
    lead.followUps.push({
      note,
      date: new Date(),
      by: req.user.id
    });

    if (nextFollowUpDate) {
      lead.nextFollowUpDate = nextFollowUpDate;
    }

    await lead.save();
    await lead.populate('assignedTo', 'name email');

    res.json({
      message: 'Follow-up added successfully',
      lead
    });
  } catch (error) {
    console.error('Error adding follow-up:', error);
    res.status(500).json({
      message: 'Failed to add follow-up',
    });
  }
};

/**
 * Get lead statistics
 * GET /api/reception/leads/stats
 */
exports.getLeadStats = async (req, res) => {
  try {
    const total = await Lead.countDocuments();
    const interest = await Lead.countDocuments({ status: 'interest' });
    const waiting = await Lead.countDocuments({ status: 'waiting' });
    const student = await Lead.countDocuments({ status: 'student' });
    const blacklist = await Lead.countDocuments({ status: 'blacklist' });

    // Leads created in last 7 days
    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);
    const recentLeads = await Lead.countDocuments({
      createdAt: { $gte: last7Days }
    });

    // Leads needing follow-up
    const needsFollowUp = await Lead.countDocuments({
      status: { $in: ['interest'] },
      nextFollowUpDate: { $lte: new Date() }
    });

    res.json({
      total,
      interest,
      waiting,
      student,
      blacklist,
      recentLeads,
      needsFollowUp
    });
  } catch (error) {
    console.error('Error fetching lead stats:', error);
    res.status(500).json({
      message: 'Failed to fetch lead statistics',
    });
  }
};

/**
 * Set lead as waiting — creates a User account and records deposit info
 * POST /api/reception/leads/:id/set-waiting
 */
exports.setLeadWaiting = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      email,
      password,
      courseId,
      depositAmount = 0,
      depositMethod = 'cash',
      depositNotes = ''
    } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required to create a user account' });
    }
    if (!courseId) {
      return res.status(400).json({ message: 'Course is required for the waiting list' });
    }

    const lead = await Lead.findById(id);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    if (lead.status === 'student') {
      return res.status(400).json({ message: 'This lead has already been converted to a student' });
    }

    // Validate course exists
    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: 'Course not found' });

    // Check email uniqueness
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'A user with this email already exists' });
    }

    // Create the student User account
    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash(password, 10);

    const user = new User({
      name: lead.fullName || lead.englishName,
      email,
      passwordHash,
      role: 'student',
      profile: {
        phone: lead.mobileNumber,
        status: 'active',
        dateOfBirth: lead.dateOfBirth,
        gender: lead.gender,
        address: lead.residence,
        school: lead.schoolName,
        fatherName: lead.fatherName,
        motherName: lead.motherName
      }
    });
    await user.save();

    const oldStatus = lead.status;

    // Update lead
    lead.status = 'waiting';
    lead.convertedToStudent = user._id;
    lead.waitingInfo = {
      courseId,
      depositAmount: parseFloat(depositAmount) || 0,
      depositPaidAt: parseFloat(depositAmount) > 0 ? new Date() : null,
      depositMethod,
      depositNotes
    };
    lead.statusHistory.push({
      fromStatus: oldStatus,
      toStatus: 'waiting',
      reason: `Set to waiting list for course: ${course.title}${parseFloat(depositAmount) > 0 ? `. Deposit: $${depositAmount}` : ''}`,
      changedBy: req.user.id,
      changedAt: new Date()
    });

    await lead.save();
    await lead.populate([
      { path: 'convertedToStudent', select: 'name email' },
      { path: 'waitingInfo.courseId', select: 'title price' }
    ]);

    res.status(201).json({
      message: 'Lead set to waiting list successfully',
      lead,
      user: { _id: user._id, name: user.name, email: user.email }
    });
  } catch (error) {
    console.error('Error setting lead to waiting:', error);
    res.status(500).json({ message: 'Failed to set lead to waiting list' });
  }
};

/**
 * Get all waiting leads (optionally filtered by courseId)
 * GET /api/reception/leads/waiting
 */
exports.getWaitingLeads = async (req, res) => {
  try {
    const { courseId, page = 1, limit = 50 } = req.query;

    const filter = { status: 'waiting' };
    if (courseId) filter['waitingInfo.courseId'] = courseId;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const leads = await Lead.find(filter)
      .populate('convertedToStudent', 'name email')
      .populate('waitingInfo.courseId', 'title price')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Lead.countDocuments(filter);

    res.json({
      leads,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching waiting leads:', error);
    res.status(500).json({ message: 'Failed to fetch waiting leads' });
  }
};

/**
 * Change lead status with reason
 * POST /api/reception/leads/:id/change-status
 */
exports.changeLeadStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { newStatus, reason, isBannedFromPlatform } = req.body;

    // Validate required fields
    if (!newStatus) {
      return res.status(400).json({ message: 'New status is required' });
    }
    if (!reason || reason.trim() === '') {
      return res.status(400).json({ message: 'Reason is required' });
    }

    // Find lead
    const lead = await Lead.findById(id);
    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    const oldStatus = lead.status;

    // Validate status transition (can't change to same status)
    if (oldStatus === newStatus) {
      return res.status(400).json({ message: 'Lead is already in this status' });
    }

    // Update status
    lead.status = newStatus;

    // Add to status history
    lead.statusHistory.push({
      fromStatus: oldStatus,
      toStatus: newStatus,
      reason: reason.trim(),
      changedBy: req.user.id,
      changedAt: new Date()
    });

    // Handle blacklist-specific fields
    if (newStatus === 'blacklist') {
      lead.isBannedFromPlatform = isBannedFromPlatform || false;
      lead.blacklistReason = reason.trim();
    } else if (oldStatus === 'blacklist') {
      // Clear blacklist fields when moving away from blacklist
      lead.isBannedFromPlatform = false;
      lead.blacklistReason = null;
    }

    await lead.save();

    res.json({
      message: 'Lead status changed successfully',
      lead
    });
  } catch (error) {
    console.error('Error changing lead status:', error);
    res.status(500).json({
      message: 'Failed to change lead status',
    });
  }
};
