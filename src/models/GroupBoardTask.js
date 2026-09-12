const mongoose = require('mongoose');

const GroupBoardTaskSchema = new mongoose.Schema({
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true,
    index: true,
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [300, 'Title cannot exceed 300 characters'],
  },
  description: {
    type: String,
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters'],
  },
  priority: {
    type: Number,
    enum: [1, 2, 3],
    default: 3,
  },
  status: {
    type: String,
    enum: ['todo', 'in_progress', 'done'],
    default: 'todo',
    index: true,
  },
  assignedTo: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  dueDate: {
    type: Date,
  },
}, { timestamps: true });

GroupBoardTaskSchema.index({ groupId: 1, priority: 1, status: 1 });
GroupBoardTaskSchema.index({ assignedTo: 1, status: 1 });

module.exports = mongoose.model('GroupBoardTask', GroupBoardTaskSchema);
