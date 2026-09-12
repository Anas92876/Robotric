const mongoose = require('mongoose');

const scheduleEntrySchema = new mongoose.Schema({
  day: {
    type: String,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    required: true,
  },
  departureTimeToAcademy: { type: String }, // "07:30"
  departureTimeFromAcademy: { type: String }, // "14:00"
}, { _id: false });

const TransportRouteSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null },
  assignedDriverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  pricingId: { type: mongoose.Schema.Types.ObjectId, ref: 'TransportPricing', default: null },
  schedule: [scheduleEntrySchema],
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  driverChangedAt: { type: Date, default: null },
  driverChangedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

TransportRouteSchema.index({ assignedDriverId: 1 });
TransportRouteSchema.index({ status: 1 });

module.exports = mongoose.model('TransportRoute', TransportRouteSchema);
