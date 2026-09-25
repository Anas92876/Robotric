const Interest = require('../models/Interest');
const asyncHandler = require('../utils/asyncHandler');
const { NotFoundError, ValidationError, ConflictError } = require('../utils/errors');

/**
 * Get all interests with optional filters
 */
exports.getAllInterests = asyncHandler(async (req, res) => {
  const { status, search } = req.query;

  // Build query
  const query = {};
  if (status) {
    query.status = status;
  }
  if (search) {
    query.name = { $regex: search, $options: 'i' };
  }

  const interests = await Interest.find(query)
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 });

  res.json({
    interests,
    total: interests.length,
  });
});

/**
 * Get interest by ID
 */
exports.getInterestById = asyncHandler(async (req, res) => {
  const interest = await Interest.findById(req.params.id)
    .populate('createdBy', 'name email');

  if (!interest) {
    throw new NotFoundError('Interest');
  }

  res.json({ interest });
});

/**
 * Create new interest
 */
exports.createInterest = asyncHandler(async (req, res) => {
  const { name, description } = req.body;

  // Validate required fields
  if (!name) {
    throw new ValidationError('Interest name is required', 'MISSING_NAME');
  }

  // Check if interest already exists
  const existingInterest = await Interest.findOne({ name });
  if (existingInterest) {
    throw new ConflictError('Interest with this name already exists', 'DUPLICATE_INTEREST');
  }

  // Create interest
  const interest = new Interest({
    name,
    description,
    createdBy: req.user.id,
  });

  await interest.save();

  res.status(201).json({
    message: 'Interest created successfully',
    interest,
  });
});

/**
 * Update interest
 */
exports.updateInterest = asyncHandler(async (req, res) => {
  const { name, description, status } = req.body;

  const interest = await Interest.findById(req.params.id);
  if (!interest) {
    throw new NotFoundError('Interest');
  }

  // Check if name is being changed and if it already exists
  if (name && name !== interest.name) {
    const existingInterest = await Interest.findOne({ name });
    if (existingInterest) {
      throw new ConflictError('Interest with this name already exists', 'DUPLICATE_INTEREST');
    }
    interest.name = name;
  }

  if (description !== undefined) interest.description = description;
  if (status) interest.status = status;

  await interest.save();

  res.json({
    message: 'Interest updated successfully',
    interest,
  });
});

/**
 * Archive interest
 */
exports.archiveInterest = asyncHandler(async (req, res) => {
  const interest = await Interest.findById(req.params.id);
  if (!interest) {
    throw new NotFoundError('Interest');
  }

  interest.status = 'archived';
  await interest.save();

  res.json({
    message: 'Interest archived successfully',
    interest,
  });
});

/**
 * Delete interest
 */
exports.deleteInterest = asyncHandler(async (req, res) => {
  const interest = await Interest.findById(req.params.id);
  if (!interest) {
    throw new NotFoundError('Interest');
  }

  await Interest.findByIdAndDelete(req.params.id);

  res.json({
    message: 'Interest deleted successfully',
  });
});
