const mongoose = require('mongoose');

// One bracket: if studentCount is between minStudents and maxStudents (inclusive), pay ratePerKm
const driverRateTierSchema = new mongoose.Schema({
  minStudents: { type: Number, required: true, min: 1 },
  maxStudents: { type: Number, default: null }, // null = no upper bound (catch-all)
  ratePerKm:   { type: Number, required: true, min: 0 },
}, { _id: false });

const TransportPricingSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  studentRatePerKm: { type: Number, required: true, min: 0 },
  // Flat fallback driver rate — used when no tier matches
  driverRatePerKm: { type: Number, required: true, min: 0 },
  // Tiered driver rates by student count — overrides driverRatePerKm when matched
  driverRateTiers: { type: [driverRateTierSchema], default: [] },
  legMultiplier: { type: Number, default: 3 },
  currency: { type: String, enum: ['SYP', 'USD'], default: 'SYP' },
  isActive: { type: Boolean, default: false },
  effectiveFrom: { type: Date, default: Date.now },
  notes: { type: String, trim: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

TransportPricingSchema.index({ isActive: 1 });

module.exports = mongoose.model('TransportPricing', TransportPricingSchema);
