const mongoose = require('mongoose');

const DriverStudentSchema = new mongoose.Schema({
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  enrollmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Enrollment', default: null },

  homeLocation: {
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
  },
  homeAddress: { type: String, trim: true },
  phoneNumber: { type: String, trim: true },

  pickupOrder: { type: Number, default: 0 },          // legacy — used as fallback
  pickupOrderToAcademy: { type: Number, default: null },   // morning pickup sequence
  pickupOrderFromAcademy: { type: Number, default: null },  // afternoon dropoff sequence
  distanceKm: { type: Number, default: null },
  sessionsPerMonth: { type: Number, default: 0 },
  monthlyFee: { type: Number, default: null },

  feeBreakdown: {
    distanceKm: { type: Number, default: null },
    studentRatePerKm: { type: Number, default: null },
    sessionsPerMonth: { type: Number, default: null },
    legMultiplier: { type: Number, default: 3 },
    pricingId: { type: mongoose.Schema.Types.ObjectId, ref: 'TransportPricing', default: null },
    calculatedAt: { type: Date, default: null },
  },

  isActive: { type: Boolean, default: true },
  notes: { type: String, trim: true },

  locationUpdatedAt: { type: Date, default: null },
  locationUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

DriverStudentSchema.index({ driverId: 1, isActive: 1 });
DriverStudentSchema.index({ studentId: 1 });
DriverStudentSchema.index({ enrollmentId: 1 });

module.exports = mongoose.model('DriverStudent', DriverStudentSchema);
