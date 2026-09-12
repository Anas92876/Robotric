const Joi = require("joi");
const Order = require("../models/Order");
const StockLevel = require("../models/StockLevel");
const mongoose = require("mongoose");
const { adjustStock } = require("../services/stock.service");
const asyncHandler = require("../utils/asyncHandler");
const { NotFoundError, ValidationError, ForbiddenError, BadRequestError } = require("../utils/errors");
const logger = require("../utils/logger");

let ioRef = null;

function setIo(ioInstance) {
  ioRef = ioInstance;
}

const createOrderSchema = Joi.object({
  projectId: Joi.string().optional(),
  items: Joi.array()
    .items(
      Joi.object({
        partId: Joi.string().required(),
        qty: Joi.number().min(1).required(),
      })
    )
    .min(1)
    .required(),
});

/**
 * List all orders
 * GET /api/orders
 */
const listOrders = asyncHandler(async (req, res) => {
  const filter =
    req.user.role === "admin" || req.user.role === "superadmin"
      ? {}
      : { studentId: req.user.id };

  logger.logDB('find', 'Order', { filter });

  const orders = await Order.find(filter).populate("items.partId").lean();

  logger.info(`Listed ${orders.length} orders for user ${req.user.id}`);
  res.json(orders);
});

/**
 * Create a new order
 * POST /api/orders
 */
const createOrder = asyncHandler(async (req, res) => {
  const { error, value } = createOrderSchema.validate(req.body);

  if (error) {
    throw new ValidationError(error.message);
  }

  // Verify availability for all requested items before proceeding
  const partIds = value.items.map((i) => i.partId);

  logger.logDB('find', 'StockLevel', { partIds });

  const levels = await StockLevel.find({ partId: { $in: partIds } }).lean();
  const idToLevel = new Map(levels.map((l) => [String(l.partId), l]));
  const shortages = [];

  for (const item of value.items) {
    const lvl = idToLevel.get(String(item.partId));
    const available = Math.max(lvl?.availableQty || 0, 0);
    if (available < item.qty) {
      shortages.push({ partId: item.partId, requested: item.qty, available });
    }
  }

  if (shortages.length) {
    logger.warn('Insufficient stock for order', { studentId: req.user.id, shortages });
    throw new BadRequestError('Insufficient stock for one or more items', 'INSUFFICIENT_STOCK');
  }

  let session;
  try {
    // Try transactional path (requires Mongo replica set)
    session = await mongoose.startSession();
    await session.startTransaction();

    logger.logDB('create', 'Order', { studentId: req.user.id, itemCount: value.items.length });

    const order = await Order.create(
      [
        {
          studentId: req.user.id,
          projectId: value.projectId,
          items: value.items,
        },
      ],
      { session }
    );

    const created = order[0];

    for (const item of created.items) {
      await adjustStock({
        partId: item.partId,
        qtyChange: item.qty,
        reason: "reserve",
        orderId: created._id,
        createdBy: req.user.id,
      });
    }

    await session.commitTransaction();
    session.endSession();

    logger.info(`Created order ${created._id} by student ${req.user.id} (transactional)`);

    if (ioRef) {
      ioRef.to("admins").emit("order:new", { orderId: String(created._id) });
    }
    return res.status(201).json(created);
  } catch (e) {
    // If transactions are not supported (standalone Mongo), fall back to non-transaction flow
    const msg = String(e?.message || "");
    const isNoTxn =
      msg.includes("Transaction numbers are only allowed") ||
      msg.includes("replica set");

    try {
      if (session) {
        try {
          await session.abortTransaction();
        } catch (abortErr) {
          // Transaction already aborted or ended
        }
        session.endSession();
      }
    } catch (cleanupErr) {
      // Cleanup errors are not critical
    }

    if (!isNoTxn) {
      throw e;
    }

    logger.warn('Transactions not supported, using non-transactional order creation');

    logger.logDB('create', 'Order', { studentId: req.user.id, itemCount: value.items.length });

    const created = await Order.create({
      studentId: req.user.id,
      projectId: value.projectId,
      items: value.items,
    });

    for (const item of created.items) {
      await adjustStock({
        partId: item.partId,
        qtyChange: item.qty,
        reason: "reserve",
        orderId: created._id,
        createdBy: req.user.id,
      });
    }

    logger.info(`Created order ${created._id} by student ${req.user.id} (non-transactional)`);

    if (ioRef) {
      ioRef.to("admins").emit("order:new", { orderId: String(created._id) });
    }
    return res.status(201).json(created);
  }
});

/**
 * Helper to set order status and adjust stock
 */
const setStatus = asyncHandler(async (req, res, status, stockOps = []) => {
  logger.logDB('findById', 'Order', { id: req.params.id });

  const order = await Order.findById(req.params.id);

  if (!order) {
    throw new NotFoundError('Order');
  }

  order.status = status;
  await order.save();

  for (const op of stockOps) {
    for (const item of order.items) {
      await adjustStock({
        partId: item.partId,
        qtyChange: op.qtyMultiplier * item.qty,
        reason: op.reason,
        orderId: order._id,
        createdBy: req.user.id,
      });
    }
  }

  logger.info(`Order ${order._id} status changed to ${status} by ${req.user.id}`);

  if (ioRef) {
    ioRef.emit("order:update", {
      orderId: String(order._id),
      status: order.status,
      studentId: String(order.studentId),
    });
  }

  res.json(order);
});

/**
 * Approve an order
 * POST /api/orders/:id/approve
 */
const approveOrder = asyncHandler(async (req, res) => {
  return setStatus(req, res, "approved");
});

/**
 * Reject an order
 * POST /api/orders/:id/reject
 */
const rejectOrder = asyncHandler(async (req, res) => {
  return setStatus(req, res, "rejected", [
    { reason: "release", qtyMultiplier: -1 },
  ]);
});

/**
 * Fulfill an order
 * POST /api/orders/:id/fulfill
 */
const fulfillOrder = asyncHandler(async (req, res) => {
  return setStatus(req, res, "fulfilled", [
    { reason: "fulfill", qtyMultiplier: -1 },
  ]);
});

/**
 * Cancel an order
 * POST /api/orders/:id/cancel
 */
const cancelOrder = asyncHandler(async (req, res) => {
  logger.logDB('findById', 'Order', { id: req.params.id });

  const order = await Order.findById(req.params.id);

  if (!order) {
    throw new NotFoundError('Order');
  }

  if (
    String(order.studentId) !== req.user.id &&
    !(req.user.role === "admin" || req.user.role === "superadmin")
  ) {
    throw new ForbiddenError('You do not have permission to cancel this order');
  }

  order.status = "cancelled";
  await order.save();

  for (const item of order.items) {
    await adjustStock({
      partId: item.partId,
      qtyChange: -item.qty,
      reason: "cancel",
      orderId: order._id,
      createdBy: req.user.id,
    });
  }

  logger.info(`Order ${order._id} cancelled by ${req.user.id}`);

  if (ioRef) {
    ioRef.to("admins").emit("order:update", {
      orderId: String(order._id),
      status: order.status,
      studentId: String(order.studentId),
    });
  }

  res.json(order);
});

module.exports = {
  setIo,
  listOrders,
  createOrder,
  approveOrder,
  rejectOrder,
  fulfillOrder,
  cancelOrder,
};
