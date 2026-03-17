const mongoose = require('mongoose');

const candidateSchema = new mongoose.Schema({
  name: { type: String, required: true },
  party: { type: String, required: true },
  bio: String,
  email: String,
  phone: String,
  department: String,
  manifesto: String,
  avatarColor: String,
  position: { type: mongoose.Schema.Types.ObjectId, ref: 'Position', default: null },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  votes: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Candidate', candidateSchema);
