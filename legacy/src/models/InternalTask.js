const mongoose = require('mongoose');

const attachmentSchema = new mongoose.Schema({
  url:      { type: String, required: true },
  publicId: { type: String, required: true },
  name:     { type: String, default: '' },
}, { _id: false });

const submissionImageSchema = new mongoose.Schema({
  url:        { type: String, required: true },
  publicId:   { type: String, required: true },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  uploadedAt: { type: Date, default: Date.now },
}, { _id: false });

// Client-submitted media (image/video/voice) — stored on Supabase, not Cloudinary.
// Keeps its own _id (unlike attachmentSchema/submissionImageSchema) since there's
// no Cloudinary publicId equivalent to key deletes/lookups off of.
const clientMediaSchema = new mongoose.Schema({
  kind:            { type: String, enum: ['image', 'video', 'audio'], required: true },
  storageBucket:   { type: String, required: true },
  storagePath:     { type: String, required: true },
  mimeType:        { type: String, required: true },
  sizeBytes:       { type: Number, required: true },
  durationSeconds: { type: Number },
  name:            { type: String, default: '' },
  uploadedAt:      { type: Date, default: Date.now },
});

const InternalTaskSchema = new mongoose.Schema({
  projectId:    { type: mongoose.Schema.Types.ObjectId, ref: 'InternalProject', required: true, index: true },
  subProjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'InternalProject', default: null, index: true },
  title:        { type: String, required: true, trim: true, maxlength: 300 },
  description:  { type: String, trim: true, maxlength: 5000 },
  priority:     { type: Number, enum: [1, 2, 3], required: true, default: 3 },
  status:       { type: String, enum: ['pending_review', 'todo', 'in_progress', 'done', 'declined'], default: 'todo', index: true },
  assignedTo:   [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  dueDate:      { type: Date },
  hardDeadline: { type: Date },
  completedAt:  { type: Date },
  // Manager-attached reference images / files
  attachments:  { type: [attachmentSchema], default: [] },
  // Employee submission: images + links when marking done
  submission: {
    images: { type: [submissionImageSchema], default: [] },
    links:  { type: [{ type: String, trim: true }], default: [] },
    note:   { type: String, trim: true, maxlength: 1000, default: '' },
  },

  // Client request fields — only meaningful when source === 'client'
  source:         { type: String, enum: ['internal', 'client'], default: 'internal', index: true },
  clientId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  clientUrgency:  { type: String, enum: ['whenever', 'soon', 'urgent'], default: null },
  rejectedReason: { type: String, trim: true, maxlength: 1000, default: '' },
  clientMedia:    { type: [clientMediaSchema], default: [] },
}, { timestamps: true });

InternalTaskSchema.index({ projectId: 1, priority: 1, status: 1 });
InternalTaskSchema.index({ subProjectId: 1, priority: 1, status: 1 });
InternalTaskSchema.index({ assignedTo: 1, status: 1 }); // works on array fields too
InternalTaskSchema.index({ projectId: 1, source: 1 });

module.exports = mongoose.model('InternalTask', InternalTaskSchema);
