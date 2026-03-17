const mongoose = require('mongoose');

const electionSettingsSchema = new mongoose.Schema({
  title: { type: String, default: 'Student Council Election' },
  description: String,
  startTime: Date,
  endTime: Date,
  isActive: { type: Boolean, default: false },
  maxVotesPerStudent: { type: Number, default: 1 },
  allowWriteIn: { type: Boolean, default: false },
  requireVerification: { type: Boolean, default: true },
  startedAt: Date,
  endedAt: Date,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ElectionSettings', electionSettingsSchema);
