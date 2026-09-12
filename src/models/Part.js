const mongoose = require("mongoose");

const partSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    category: { type: String, required: true },
    description: { type: String },
    sku: { type: String, index: true, required: true },
    group: { type: String },
  partNumber: { type: String },
  
    },
  { timestamps: true }
);

partSchema.index({ name: 1 });

module.exports = mongoose.model("Part", partSchema);
