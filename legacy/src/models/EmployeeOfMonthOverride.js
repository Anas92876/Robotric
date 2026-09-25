const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  month: { type: Number, required: true },
  year: { type: Number, required: true },
});

schema.index({ month: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('EmployeeOfMonthOverride', schema);
