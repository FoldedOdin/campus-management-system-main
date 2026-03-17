const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
  text: { type: String, required: true },
  title: String,
  author: String,
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  type: { type: String, default: 'general' },
  timestamp: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Announcement', announcementSchema);
