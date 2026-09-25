// Student feedback on a single completed trip.
//
// Visibility: management only (cto / admin / superadmin). Drivers and reception
// staff never see this data — that's the whole point. Storing feedback in its
// own collection (rather than embedding it on the trip) keeps trips immutable
// and lets us index/aggregate feedback cheaply.
//
// One feedback per (trip, student) pair, enforced by a unique compound index.
// Students CAN edit their feedback after submission; updatedAt is timestamped
// automatically by mongoose so management can see the most recent revision.

const mongoose = require('mongoose');

// Predefined categories — multi-select chips on the mobile UI.
// Keeping the list closed (not free-form) gives management a clean facet to
// filter on. New categories should be added here, not by clients.
const FEEDBACK_CATEGORIES = [
  // negative signals
  'late', 'rude_driver', 'rough_driving', 'unsafe', 'dirty_vehicle',
  // positive signals
  'on_time', 'friendly_driver', 'smooth_driving', 'clean_vehicle', 'great_service',
];

const TransportTripFeedbackSchema = new mongoose.Schema({
  tripId:    { type: mongoose.Schema.Types.ObjectId, ref: 'TransportTrip', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User',          required: true },
  // Denormalised so management can filter/aggregate by driver without joining
  // through the trip every time. Set at submission, never updated afterwards.
  driverId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User',          required: true },

  rating:  { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, trim: true, default: '', maxlength: 2000 },
  categories: {
    type: [{ type: String, enum: FEEDBACK_CATEGORIES }],
    default: [],
    validate: { validator: arr => arr.length <= 10, message: 'Too many categories' },
  },
}, { timestamps: true });

// Enforce one feedback per (trip, student) pair. Update-in-place uses this
// index too, so the API can rely on `findOneAndUpdate({ tripId, studentId }, ..., { upsert: true })`.
TransportTripFeedbackSchema.index({ tripId: 1, studentId: 1 }, { unique: true });

// Management list queries — by driver, by recency.
TransportTripFeedbackSchema.index({ driverId: 1, createdAt: -1 });
TransportTripFeedbackSchema.index({ createdAt: -1 });

TransportTripFeedbackSchema.statics.CATEGORIES = FEEDBACK_CATEGORIES;

module.exports = mongoose.model('TransportTripFeedback', TransportTripFeedbackSchema);
