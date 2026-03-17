const mongoose = require('mongoose');

const voteSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  positionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Position', default: null },
  candidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate', required: true },
  timestamp: { type: Date, default: Date.now },
  voterEmail: String,
  voterName: String
});

// Ensure one vote per student per position (positionId may be null for legacy single-position elections)
voteSchema.index({ studentId: 1, positionId: 1 }, { unique: true });

module.exports = mongoose.model('Vote', voteSchema);
