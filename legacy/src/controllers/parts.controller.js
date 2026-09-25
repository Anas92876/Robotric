const Joi = require("joi");
const Part = require("../models/Part");
const StockLevel = require("../models/StockLevel");
const Image = require("../models/Image");
const asyncHandler = require("../utils/asyncHandler");
const { NotFoundError, ValidationError } = require("../utils/errors");
const logger = require("../utils/logger");

/**
 * List all parts with stock levels and images
 * GET /api/parts
 */
const listParts = asyncHandler(async (req, res) => {
  logger.logDB('find', 'Part');

  const parts = await Part.find().lean();
  const partIds = parts.map((p) => p._id);

  const [levels, images] = await Promise.all([
    StockLevel.find({ partId: { $in: partIds } }).lean(),
    Image.find({ associatedModel: 'Part', associatedId: { $in: partIds }, isActive: true })
      .sort({ createdAt: -1 })
      .lean(),
  ]);

  const map = new Map(levels.map((l) => [String(l.partId), l]));
  const latestImageByPart = new Map();

  for (const img of images) {
    const key = String(img.associatedId);
    if (!latestImageByPart.has(key)) {
      latestImageByPart.set(key, img);
    }
  }

  const enrichedParts = parts.map((p) => ({
    ...p,
    availableQty: map.get(String(p._id))?.availableQty || 0,
    reservedQty: map.get(String(p._id))?.reservedQty || 0,
    imageUrl: latestImageByPart.get(String(p._id))
      ? `/uploads/${latestImageByPart.get(String(p._id)).filename}`
      : undefined,
  }));

  logger.info(`Listed ${enrichedParts.length} parts`);
  res.json(enrichedParts);
});

const upsertSchema = Joi.object({
  name: Joi.string().required(),
  category: Joi.string().allow(""),
  description: Joi.string().allow(""),
  sku: Joi.string().allow(""),
  group: Joi.string().allow("").optional(),
  partNumber: Joi.string().when('group', {
    is: Joi.string().valid('Lego', 'lego'),
    then: Joi.string().required(),
    otherwise: Joi.string().allow('').optional(),
  }),
});

/**
 * Create a new part
 * POST /api/parts
 */
const createPart = asyncHandler(async (req, res) => {
  const { error, value } = upsertSchema.validate(req.body);

  if (error) {
    throw new ValidationError(error.message);
  }

  logger.logDB('create', 'Part', { name: value.name });

  const part = await Part.create(value);

  logger.info(`Created part: ${part.name} (${part._id})`);
  res.status(201).json(part);
});

const updateSchema = Joi.object({
  name: Joi.string(),
  category: Joi.string().allow(""),
  description: Joi.string().allow(""),
  sku: Joi.string().allow(""),
  group: Joi.string().allow("").optional(),
  partNumber: Joi.string().when('group', {
    is: Joi.string().valid('Lego', 'lego'),
    then: Joi.string().required(),
    otherwise: Joi.string().allow('').optional(),
  }),
});

/**
 * Update a part
 * PUT /api/parts/:id
 */
const updatePart = asyncHandler(async (req, res) => {
  const { error, value } = updateSchema.validate(req.body);

  if (error) {
    throw new ValidationError(error.message);
  }

  logger.logDB('findByIdAndUpdate', 'Part', { id: req.params.id });

  const part = await Part.findByIdAndUpdate(req.params.id, value, {
    new: true,
    runValidators: true
  });

  if (!part) {
    throw new NotFoundError('Part');
  }

  logger.info(`Updated part: ${part.name} (${part._id})`);
  res.json(part);
});

/**
 * Get a single part by ID with stock level and image
 * GET /api/parts/:id
 */
const getPartById = asyncHandler(async (req, res) => {
  logger.logDB('findById', 'Part', { id: req.params.id });

  const part = await Part.findById(req.params.id).lean();

  if (!part) {
    throw new NotFoundError('Part');
  }

  const [stockLevel, image] = await Promise.all([
    StockLevel.findOne({ partId: part._id }).lean(),
    Image.findOne({ associatedModel: 'Part', associatedId: part._id, isActive: true })
      .sort({ createdAt: -1 })
      .lean(),
  ]);

  const enrichedPart = {
    ...part,
    availableQty: stockLevel?.availableQty || 0,
    reservedQty: stockLevel?.reservedQty || 0,
    imageUrl: image ? `/uploads/${image.filename}` : undefined,
  };

  logger.info(`Retrieved part: ${part.name} (${part._id})`);
  res.json(enrichedPart);
});

/**
 * Delete a part
 * DELETE /api/parts/:id
 */
const deletePart = asyncHandler(async (req, res) => {
  logger.logDB('findByIdAndDelete', 'Part', { id: req.params.id });

  const part = await Part.findByIdAndDelete(req.params.id);

  if (!part) {
    throw new NotFoundError('Part');
  }

  // Also delete associated stock level
  await StockLevel.deleteOne({ partId: req.params.id });

  logger.info(`Deleted part: ${part.name} (${part._id})`);
  res.json({ success: true, message: 'Part deleted successfully' });
});

module.exports = {
  listParts,
  getPartById,
  createPart,
  updatePart,
  deletePart,
};
