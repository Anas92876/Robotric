const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    partId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Part",
      required: true,
    },
    qty: { type: Number, required: true },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      index: true, // Index for filtering orders by project
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "fulfilled", "cancelled"],
      default: "pending",
      index: true, // Index for filtering orders by status
    },
    items: { type: [orderItemSchema], required: true },
    createdAt: { type: Date, default: Date.now, index: true }, // Index for sorting by date
  },
  { versionKey: false }
);

orderSchema.index({ studentId: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model("Order", orderSchema);
