const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  taskId:      { type: mongoose.Schema.Types.ObjectId, ref: 'InternalTask', required: true, index: true },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reason:      { type: String, required: true, trim: true, maxlength: 1000 },
  proposedDate:{ type: Date, required: true },
  status:      { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
  reviewedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  reviewNote:  { type: String, trim: true, maxlength: 500, default: '' },
  reviewedAt:  { type: Date, default: null },
}, { timestamps: true });

schema.index({ taskId: 1, status: 1 });

module.exports = mongoose.model('TimeExtensionRequest', schema);
