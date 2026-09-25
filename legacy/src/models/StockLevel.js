const mongoose = require("mongoose");

const stockLevelSchema = new mongoose.Schema(
  {
    partId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Part",
      unique: true,
      required: true,
    },
    availableQty: { type: Number, default: 0 },
    usedQty: { type: Number, default: 0 },
    damagedQty: { type: Number, default: 0 },
    updatedAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

module.exports = mongoose.model("StockLevel", stockLevelSchema);
