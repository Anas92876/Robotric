/**
 * Contact Controller
 *
 * Handles contact form submissions from the public website:
 * - Submit new contact form (public)
 * - View all contacts (reception only)
 * - Update contact status (reception only)
 * - Get contact by ID (reception only)
 */

const Contact = require('../models/Contact');
const asyncHandler = require('../utils/asyncHandler');
const { BadRequestError, NotFoundError } = require('../utils/errors');

/**
 * Submit contact form (Public endpoint)
 * POST /api/contact
 */
exports.submitContact = asyncHandler(async (req, res) => {
  const { name, phone, email, location, who, otherType, subject, message } = req.body;

  // Validate required fields
  if (!name || !phone || !subject) {
    throw new BadRequestError('Name, phone, and subject are required');
  }

  // Validate phone format (basic)
  const phoneRegex = /^[0-9+\-\s()]{8,}$/;
  if (!phoneRegex.test(phone.trim())) {
    throw new BadRequestError('Invalid phone number format');
  }

  // Validate email if provided
  if (email && email.trim()) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      throw new BadRequestError('Invalid email address format');
    }
  }

    // Create contact submission
    const contact = await Contact.create({
      name: name.trim(),
      phone: phone.trim(),
      email: email ? email.trim() : '',
      location: location ? location.trim() : '',
      who: who || undefined,
      otherType: otherType ? otherType.trim() : '',
      subject: subject.trim(),
      message: message ? message.trim() : '',
      status: 'new'
    });

  res.status(201).json({
    success: true,
    message: 'Contact form submitted successfully',
    data: {
      id: contact._id,
      name: contact.name,
      phone: contact.phone,
      subject: contact.subject,
      createdAt: contact.createdAt
    }
  });
});

/**
 * Get all contacts with filtering and pagination (Reception only)
 * GET /api/reception/contacts
 */
exports.getAllContacts = asyncHandler(async (req, res) => {
    const {
      page = 1,
      limit = 20,
      status,
      search,
      fromDate,
      toDate
    } = req.query;

    // Build filter query
    const filter = {};

    if (status) filter.status = status;

    // Search by name, phone, email, location, or subject
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } }
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

    // Execute query
    const contacts = await Contact.find(filter)
      .populate('convertedToLead', 'fullName mobileNumber')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Contact.countDocuments(filter);

    // Get stats
    const stats = {
      total: await Contact.countDocuments({}),
      new: await Contact.countDocuments({ status: 'new' }),
      read: await Contact.countDocuments({ status: 'read' }),
      replied: await Contact.countDocuments({ status: 'replied' }),
      archived: await Contact.countDocuments({ status: 'archived' })
    };

  res.json({
    success: true,
    data: contacts,
    pagination: {
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      limit: parseInt(limit)
    },
    stats
  });
});

/**
 * Get single contact by ID (Reception only)
 * GET /api/reception/contacts/:id
 */
exports.getContactById = asyncHandler(async (req, res) => {
  const contact = await Contact.findById(req.params.id)
    .populate('convertedToLead', 'fullName mobileNumber email');

  if (!contact) {
    throw new NotFoundError('Contact');
  }

  res.json({
    success: true,
    data: contact
  });
});

/**
 * Update contact status (Reception only)
 * PUT /api/reception/contacts/:id
 */
exports.updateContact = asyncHandler(async (req, res) => {
  const { status, convertedToLead } = req.body;

  const updateData = {};
  if (status) updateData.status = status;
  if (convertedToLead) updateData.convertedToLead = convertedToLead;

  const contact = await Contact.findByIdAndUpdate(
    req.params.id,
    updateData,
    { new: true, runValidators: true }
  ).populate('convertedToLead', 'fullName mobileNumber');

  if (!contact) {
    throw new NotFoundError('Contact');
  }

  res.json({
    success: true,
    message: 'Contact updated successfully',
    data: contact
  });
});

/**
 * Delete contact (Reception only)
 * DELETE /api/reception/contacts/:id
 */
exports.deleteContact = asyncHandler(async (req, res) => {
  const contact = await Contact.findByIdAndDelete(req.params.id);

  if (!contact) {
    throw new NotFoundError('Contact');
  }

  res.json({
    success: true,
    message: 'Contact deleted successfully'
  });
});
