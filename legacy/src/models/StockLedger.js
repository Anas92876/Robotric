const mongoose = require("mongoose");

const stockLedgerSchema = new mongoose.Schema(
  {
    partId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Part",
      required: true,
      index: true,
    },
    qtyChange: { type: Number, required: true },
    reason: {
      type: String,
      enum: [
        "purchase",
        "adjustment",
        "used",
        "damaged",
        "return",
        "reserve",    // Added for order reservation
        "release",    // Added for order rejection/cancellation
        "fulfill",    // Added for order fulfillment
        "cancel",     // Added for order cancellation
        "other",
      ],
      required: true,
    },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    createdAt: { type: Date, default: Date.now, index: true },
    notes: { type: String }, // Optional notes for the ledger entry
  },
  { versionKey: false }
);

// Compound index for efficient queries by part and date
stockLedgerSchema.index({ partId: 1, createdAt: -1 });

// Index for timestamp-based queries (recent movements)
stockLedgerSchema.index({ createdAt: -1 });

module.exports = mongoose.model("StockLedger", stockLedgerSchema);
