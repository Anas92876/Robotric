const mongoose = require('mongoose');

const SubTaskSchema = new mongoose.Schema({
  taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'InternalTask', required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 500 },
  note: { type: String, trim: true, maxlength: 2000 },
  isDone: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

SubTaskSchema.index({ taskId: 1, createdAt: 1 });

module.exports = mongoose.model('SubTask', SubTaskSchema);
