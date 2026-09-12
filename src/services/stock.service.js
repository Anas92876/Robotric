const StockLevel = require("../models/StockLevel");
const StockLedger = require("../models/StockLedger");
const Part = require("../models/Part");
const mongoose = require("mongoose");

let ioRef = null;

function setIo(ioInstance) {
  ioRef = ioInstance;
}

async function ensureStockLevel(partId) {
  let level = await StockLevel.findOne({ partId });
  if (!level) {
    level = await StockLevel.create({
      partId,
      availableQty: 0,
      usedQty: 0,
      damagedQty: 0
    });
  }
  return level;
}

// Get all stock levels with filtering and pagination
async function getStockLevels({ category, search, sortBy = 'name', page = 1, limit = 20 }) {
  const query = {};
  
  if (category) {
    query['part.category'] = category;
  }
  
  if (search) {
    query['$or'] = [
      { 'part.name': { $regex: search, $options: 'i' } },
      { 'part.sku': { $regex: search, $options: 'i' } }
    ];
  }

  const skip = (page - 1) * limit;

  // Build the aggregation pipeline
  const pipeline = [
    {
      $lookup: {
        from: 'parts',
        localField: 'partId',
        foreignField: '_id',
        as: 'part'
      }
    },
    { $unwind: '$part' },
    { $match: query }
  ];

  // Get total count using the same pipeline
  const countPipeline = [
    ...pipeline,
    { $count: 'total' }
  ];
  const countResult = await StockLevel.aggregate(countPipeline);
  const total = countResult.length > 0 ? countResult[0].total : 0;

  // Get paginated results
  const levels = await StockLevel.aggregate([
    ...pipeline,
    { $sort: { [`part.${sortBy}`]: 1 } },
    { $skip: skip },
    { $limit: limit }
  ]);

  return {
    items: levels,
    total,
    page,
    totalPages: Math.ceil(total / limit)
  };
}

// Get dashboard statistics
async function getStockStats() {
  const [stockStats, valueStats] = await Promise.all([
    StockLevel.aggregate([
      {
        $facet: {
          totalParts: [{ $count: 'count' }],
          lowStock: [
            { $match: { availableQty: { $lt: 10 } } },
            { $count: 'count' }
          ],
          outOfStock: [
            { $match: { availableQty: { $lte: 0 } } },
            { $count: 'count' }
          ]
        }
      }
    ]),
    StockLevel.aggregate([
      {
        $group: {
          _id: null,
          totalValue: { $sum: { $multiply: ['$availableQty', 10] } } // Assuming average value of 10 per item
        }
      }
    ])
  ]);

  const stats = stockStats[0];
  const value = valueStats[0]?.totalValue || 0;

  return {
    totalParts: stats.totalParts[0]?.count || 0,
    lowStock: stats.lowStock[0]?.count || 0,
    outOfStock: stats.outOfStock[0]?.count || 0,
    totalValue: value
  };
}

// Get category breakdown
async function getCategoryBreakdown() {
  return Part.aggregate([
    {
      $lookup: {
        from: 'stocklevels',
        localField: '_id',
        foreignField: 'partId',
        as: 'stock'
      }
    },
    { $unwind: '$stock' },
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
        value: { $sum: { $multiply: ['$stock.availableQty', 10] } } // Assuming average value of 10 per item
      }
    },
    {
      $project: {
        category: '$_id',
        count: 1,
        value: 1,
        _id: 0
      }
    }
  ]);
}

// Get recent stock movements
async function getRecentMovements(limit = 10) {
  return StockLedger.aggregate([
    {
      $lookup: {
        from: 'parts',
        localField: 'partId',
        foreignField: '_id',
        as: 'part'
      }
    },
    { $unwind: '$part' },
    {
      $lookup: {
        from: 'users',
        localField: 'createdBy',
        foreignField: '_id',
        as: 'user'
      }
    },
    { $unwind: '$user' },
    { $sort: { createdAt: -1 } },
    { $limit: limit },
    {
      $project: {
        partName: '$part.name',
        sku: '$part.sku',
        qtyChange: 1,
        reason: 1,
        createdAt: 1,
        createdBy: {
          name: '$user.name',
          id: '$user._id'
        }
      }
    }
  ]);
}

// Get stock movement history with filtering
async function getStockHistory({ startDate, endDate, partId, reason }) {
  const query = {};

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  if (partId) query.partId = new mongoose.Types.ObjectId(partId);
  if (reason) query.reason = reason;

  return StockLedger.aggregate([
    { $match: query },
    {
      $lookup: {
        from: 'parts',
        localField: 'partId',
        foreignField: '_id',
        as: 'part'
      }
    },
    { $unwind: '$part' },
    {
      $lookup: {
        from: 'users',
        localField: 'createdBy',
        foreignField: '_id',
        as: 'user'
      }
    },
    { $unwind: '$user' },
    { $sort: { createdAt: -1 } },
    {
      $project: {
        partId: 1,
        partName: '$part.name',
        sku: '$part.sku',
        qtyChange: 1,
        reason: 1,
        notes: 1,
        createdAt: 1,
        createdBy: {
          name: '$user.name',
          id: '$user._id'
        }
      }
    }
  ]);
}

// Adjust stock levels
async function adjustStock({ partId, qtyChange, reason, orderId, createdBy, notes }) {
  let session;
  try {
    session = await mongoose.startSession();
    session.startTransaction();

    // Ensure stock level exists
    await ensureStockLevel(partId);

    // Create ledger entry
    await StockLedger.create([
      { partId, qtyChange, reason, orderId, createdBy, notes }
    ], { session });

    // Recompute stock levels from ledger
    const oid = new mongoose.Types.ObjectId(partId);
    const agg = await StockLedger.aggregate([
      { $match: { partId: oid } },
      {
        $group: {
          _id: '$partId',
          total: { $sum: '$qtyChange' },
          used: { $sum: { $cond: [{ $eq: ['$reason', 'used'] }, '$qtyChange', 0] } },
          damaged: { $sum: { $cond: [{ $eq: ['$reason', 'damaged'] }, '$qtyChange', 0] } }
        }
      }
    ]).session(session);

    const stats = agg[0] || { total: 0, used: 0, damaged: 0 };

    // Update stock levels
    const level = await StockLevel.findOneAndUpdate(
      { partId },
      {
        $set: {
          availableQty: stats.total,
          usedQty: stats.used,
          damagedQty: stats.damaged,
          updatedAt: new Date()
        }
      },
      { new: true, session }
    ).populate('partId');

    if (ioRef) {
      ioRef.emit('stockUpdate', { partId, availableQty: level.availableQty, action: reason });
    }

    await session.commitTransaction();
    return level;
  } catch (error) {
    // Fallback for standalone MongoDB without transactions
    if (
      String(error.message || '').includes('Transaction numbers are only allowed') ||
      String(error.code || '') === '20'
    ) {
      try {
        if (session) {
          try { await session.abortTransaction(); } catch {}
          session.endSession();
        }
        // Non-transactional fallback
        await ensureStockLevel(partId);
        await StockLedger.create({ partId, qtyChange, reason, orderId, createdBy, notes });
        const oid = new mongoose.Types.ObjectId(partId);
        const agg = await StockLedger.aggregate([
          { $match: { partId: oid } },
          {
            $group: {
              _id: '$partId',
              total: { $sum: '$qtyChange' },
              used: { $sum: { $cond: [{ $eq: ['$reason', 'used'] }, '$qtyChange', 0] } },
              damaged: { $sum: { $cond: [{ $eq: ['$reason', 'damaged'] }, '$qtyChange', 0] } }
            }
          }
        ]);
        const stats = agg[0] || { total: 0, used: 0, damaged: 0 };
        const level = await StockLevel.findOneAndUpdate(
          { partId },
          {
            $set: {
              availableQty: stats.total,
              usedQty: stats.used,
              damagedQty: stats.damaged,
              updatedAt: new Date()
            }
          },
          { new: true }
        ).populate('partId');
        if (ioRef) {
          ioRef.emit('stockUpdate', { partId, availableQty: level.availableQty, action: reason });
        }
        return level;
      } catch (fallbackErr) {
        throw fallbackErr;
      }
    }
    throw error;
  } finally {
    if (session) session.endSession();
  }
}

module.exports = {
  setIo,
  adjustStock,
  getStockLevels,
  getStockStats,
  getCategoryBreakdown,
  getRecentMovements,
  getStockHistory
};
