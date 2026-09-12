const mongoose = require('mongoose');

const InternalProjectSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 200 },
  description: { type: String, trim: true, maxlength: 2000 },
  priority: { type: Number, enum: [1, 2, 3], required: true, default: 3 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  assignedEngineers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  clients: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  parentProject: { type: mongoose.Schema.Types.ObjectId, ref: 'InternalProject', default: null },
}, { timestamps: true });

InternalProjectSchema.index({ createdBy: 1 });
InternalProjectSchema.index({ priority: 1 });
InternalProjectSchema.index({ parentProject: 1 });
InternalProjectSchema.index({ clients: 1 });

module.exports = mongoose.model('InternalProject', InternalProjectSchema);
