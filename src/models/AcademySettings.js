const mongoose = require('mongoose');

// Single-document collection — only one record ever exists (key: 'default')
const AcademySettingsSchema = new mongoose.Schema({
  key: { type: String, default: 'default', unique: true },
  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

module.exports = mongoose.model('AcademySettings', AcademySettingsSchema);
