const mongoose = require('mongoose');

const DriverProfileSchema = new mongoose.Schema({
  userId:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  vehiclePlate:    { type: String, trim: true },
  vehicleModel:    { type: String, trim: true },
  vehicleColor:    { type: String, trim: true },
  vehicleCapacity: { type: Number, default: 5, min: 1 },
  phoneNumber:     { type: String, trim: true },
  photoUrl:        { type: String, trim: true },
  isAvailable:     { type: Boolean, default: true },
  homeLocation: {
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
  },
  notes:           { type: String, trim: true },
  createdBy:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

DriverProfileSchema.index({ userId: 1 }, { unique: true });
DriverProfileSchema.index({ isAvailable: 1 });

module.exports = mongoose.model('DriverProfile', DriverProfileSchema);
