const Joi = require("joi");
const {
  adjustStock,
  getStockLevels,
  getStockStats,
  getCategoryBreakdown,
  getRecentMovements,
  getStockHistory,
} = require("../services/stock.service");
const asyncHandler = require("../utils/asyncHandler");
const { ValidationError } = require("../utils/errors");
const logger = require("../utils/logger");

const adjustSchema = Joi.object({
  partId: Joi.string().required(),
  qtyChange: Joi.number().required(),
  reason: Joi.string()
    .valid(
      "purchase",
      "adjustment",
      "used",
      "damaged",
      "return",
      "other"
    )
    .required(),
  orderId: Joi.string().optional(),
  notes: Joi.string().optional(),
});

const querySchema = Joi.object({
  category: Joi.string().optional(),
  search: Joi.string().optional(),
  sortBy: Joi.string().optional(),
  limit: Joi.number().optional(),
  page: Joi.number().optional(),
});

const historyQuerySchema = Joi.object({
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  partId: Joi.string().optional(),
  reason: Joi.string().optional(),
});

/**
 * Get all stock levels with filtering and pagination
 * GET /api/stock/levels
 */
const getLevels = asyncHandler(async (req, res) => {
  const { error, value } = querySchema.validate(req.query);

  if (error) {
    throw new ValidationError(error.message);
  }

  logger.logDB('getStockLevels', 'StockLevel', { filters: value });

  const levels = await getStockLevels(value);

  logger.info(`Retrieved ${levels.length} stock levels`);
  res.json(levels);
});

/**
 * Get dashboard statistics
 * GET /api/stock/stats
 */
const getStats = asyncHandler(async (req, res) => {
  logger.logDB('getStockStats', 'StockLevel');

  const stats = await getStockStats();

  logger.info('Retrieved stock statistics');
  res.json(stats);
});

/**
 * Get category breakdown
 * GET /api/stock/categories
 */
const getCategories = asyncHandler(async (req, res) => {
  logger.logDB('getCategoryBreakdown', 'Part');

  const categories = await getCategoryBreakdown();

  logger.info(`Retrieved ${categories.length} category breakdowns`);
  res.json(categories);
});

/**
 * Get recent stock movements
 * GET /api/stock/recent
 */
const getRecent = asyncHandler(async (req, res) => {
  const { limit = 10 } = req.query;
  const parsedLimit = parseInt(limit);

  logger.logDB('getRecentMovements', 'StockMovement', { limit: parsedLimit });

  const movements = await getRecentMovements(parsedLimit);

  logger.info(`Retrieved ${movements.length} recent stock movements`);
  res.json(movements);
});

/**
 * Get stock movement history with filtering
 * GET /api/stock/history
 */
const getHistory = asyncHandler(async (req, res) => {
  const { error, value } = historyQuerySchema.validate(req.query);

  if (error) {
    throw new ValidationError(error.message);
  }

  logger.logDB('getStockHistory', 'StockMovement', { filters: value });

  const history = await getStockHistory(value);

  logger.info(`Retrieved ${history.length} stock history records`);
  res.json(history);
});

/**
 * Adjust stock levels
 * POST /api/stock/adjust
 */
const adjust = asyncHandler(async (req, res) => {
  const { error, value } = adjustSchema.validate(req.body);

  if (error) {
    throw new ValidationError(error.message);
  }

  logger.logDB('adjustStock', 'StockLevel', {
    partId: value.partId,
    qtyChange: value.qtyChange,
    reason: value.reason
  });

  const level = await adjustStock({ ...value, createdBy: req.user.id });

  logger.info(`Stock adjusted for part ${value.partId}: ${value.qtyChange > 0 ? '+' : ''}${value.qtyChange} (${value.reason})`);
  res.json(level);
});

module.exports = {
  getLevels,
  getStats,
  getCategories,
  getRecent,
  getHistory,
  adjust,
};
