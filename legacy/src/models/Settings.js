const mongoose = require('mongoose');

/**
 * AppSettings - Single document storing application-wide settings
 * Uses findOneAndUpdate with upsert for single-document pattern
 */
const AppSettingsSchema = new mongoose.Schema({
  usdToSypExchangeRate: {
    type: Number,
    default: 120,
    min: [1, 'Exchange rate must be at least 1 S.P. per USD'],
    max: [10000, 'Exchange rate cannot exceed 10000 S.P. per USD']
  },
  minimumAppVersion: {
    type: String,
    default: '1.0.0'
  },
  forceUpdate: {
    type: Boolean,
    default: false
  },
  updateMessage: {
    type: String,
    default: ''
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  collection: 'appsettings',
  timestamps: true
});

// Ensure only one document exists
AppSettingsSchema.index({ _id: 1 }, { unique: true });

module.exports = mongoose.model('AppSettings', AppSettingsSchema);
