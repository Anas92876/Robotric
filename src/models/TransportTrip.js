const mongoose = require('mongoose');

const ALLOWED_TRANSITIONS = {
  scheduled: ['in_travel', 'cancelled'],
  in_travel:  ['completed', 'cancelled'],
  completed:  [],
  cancelled:  [],
};

const studentSnapshotSchema = new mongoose.Schema({
  studentId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  studentName: { type: String, required: true },
  phoneNumber: { type: String },
  pickupOrder: { type: Number, default: 0 },
  homeAddress: { type: String },
  homeLocation: {
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
  },
  distanceKm: { type: Number, default: null },
}, { _id: false });

const studentStatusSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: {
    type: String,
    enum: ['pending', 'picked', 'dropped', 'absent'],
    default: 'pending',
  },
  arrivedAt: { type: Date, default: null },
}, { _id: true });

const TransportTripSchema = new mongoose.Schema({
  driverId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date:      { type: Date, required: true },
  direction: { type: String, enum: ['to_academy', 'from_academy'], required: true },
  status: {
    type: String,
    enum: ['scheduled', 'in_travel', 'completed', 'cancelled'],
    default: 'scheduled',
  },

  isExtra:     { type: Boolean, default: false },
  extraCharge: { type: Number, default: 0 },

  // Immutable snapshot built at creation
  studentsSnapshot: [studentSnapshotSchema],

  // Mutable — updated by driver during trip
  studentStatuses: [studentStatusSchema],

  // Google Maps optimized order: indices into studentsSnapshot
  optimizedWaypointOrder: [{ type: Number }],

  // Live location — driver pushes every 60s
  currentLocation: {
    lat:       { type: Number, default: null },
    lng:       { type: Number, default: null },
    updatedAt: { type: Date, default: null },
  },

  // Calculated on trip completion
  driverEarnings: { type: Number, default: null },

  // Actual road distance of the whole route (RoboTrick → student1 → student2 → ... → RoboTrick)
  // Computed from Google Directions API at trip completion. Used for earnings + reporting.
  totalRouteKm: { type: Number, default: null },

  startedAt:          { type: Date, default: null },
  completedAt:        { type: Date, default: null },
  cancelledAt:        { type: Date, default: null },
  cancellationReason: { type: String, trim: true },
  cancelledBy:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

  notes:           { type: String, trim: true },
  createdBy:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  driverChangedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  driverChangedAt: { type: Date, default: null },
}, { timestamps: true });

TransportTripSchema.index({ driverId: 1, date: -1 });
TransportTripSchema.index({ status: 1, date: -1 });
TransportTripSchema.index({ driverId: 1, status: 1 });

TransportTripSchema.statics.ALLOWED_TRANSITIONS = ALLOWED_TRANSITIONS;

TransportTripSchema.statics.isValidTransition = function (from, to) {
  return (ALLOWED_TRANSITIONS[from] || []).includes(to);
};

module.exports = mongoose.model('TransportTrip', TransportTripSchema);
