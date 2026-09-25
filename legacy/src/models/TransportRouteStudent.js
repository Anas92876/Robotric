const mongoose = require('mongoose');

const pricingSnapshotSchema = new mongoose.Schema({
  pricingId: { type: mongoose.Schema.Types.ObjectId, ref: 'TransportPricing' },
  ratePerKm: Number,
  tripsPerMonth: Number,
  currency: String,
  routingProvider: { type: String, default: 'google' },
  calculatedAt: { type: Date, default: Date.now },
}, { _id: false });

const TransportRouteStudentSchema = new mongoose.Schema({
  routeId: { type: mongoose.Schema.Types.ObjectId, ref: 'TransportRoute', required: true },
  enrollmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Enrollment', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  homeLocation: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  homeAddress: { type: String, trim: true },

  rawDistanceKm: { type: Number },      // Haversine straight-line (metadata only)
  roadDistanceKm: { type: Number },     // Google Directions real road distance (used for pricing)

  monthlyFee: { type: Number, default: 0 },
  pricingSnapshot: { type: pricingSnapshotSchema, default: null },

  pickupOrderToAcademy: { type: Number, default: 0 },
  pickupOrderFromAcademy: { type: Number, default: 0 },

  isActive: { type: Boolean, default: true },

  locationUpdatedAt: { type: Date, default: null },
  locationUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  feeRecalculatedAt: { type: Date, default: null },
  feeRecalculatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

TransportRouteStudentSchema.index({ routeId: 1, isActive: 1 });
TransportRouteStudentSchema.index({ studentId: 1 });
TransportRouteStudentSchema.index({ enrollmentId: 1 });

module.exports = mongoose.model('TransportRouteStudent', TransportRouteStudentSchema);
