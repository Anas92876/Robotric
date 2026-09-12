const mongoose = require('mongoose');

const WorkSessionSchema = new mongoose.Schema({
  user:            { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  clockIn:         { type: Date, required: true },
  clockOut:        { type: Date, default: null },
  durationMinutes: { type: Number, default: 0 },
  // Session was force-closed by the system because it was left open past the max shift length
  autoClosed:      { type: Boolean, default: false },
  // Last manager who manually corrected this session's times
  editedBy:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

WorkSessionSchema.index({ user: 1, clockIn: -1 });
WorkSessionSchema.index({ clockOut: 1 });

module.exports = mongoose.model('WorkSession', WorkSessionSchema);
