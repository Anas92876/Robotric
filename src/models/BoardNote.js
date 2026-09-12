const mongoose = require('mongoose');

const BoardNoteSchema = new mongoose.Schema({
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true,
    index: true,
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  content: {
    type: String,
    required: [true, 'Note content is required'],
    trim: true,
    maxlength: [2000, 'Note cannot exceed 2000 characters'],
  },
  isPinned: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

BoardNoteSchema.index({ groupId: 1, createdAt: -1 });

module.exports = mongoose.model('BoardNote', BoardNoteSchema);
