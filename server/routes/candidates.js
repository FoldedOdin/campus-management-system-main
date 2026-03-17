const express = require('express');
const router = express.Router();
const Candidate = require('../models/Candidate');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

const authenticateAdmin = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token' });
    
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'admin') return res.status(403).json({ message: 'Admin only' });
    
    req.userId = decoded.userId;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Get all candidates
router.get('/', async (req, res) => {
  try {
    const candidates = await Candidate.find().populate('position').sort({ createdAt: -1 });
    res.json(candidates);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching candidates', error: err.message });
  }
});

// Add candidate (admin only)
router.post('/', authenticateAdmin, async (req, res) => {
  try {
    const { name, party, bio, email, phone, department, manifesto, avatarColor, position } = req.body;

    const candidate = new Candidate({
      name,
      party,
      bio,
      email,
      phone,
      department,
      manifesto,
      avatarColor,
      position: position || null,
      status: 'active'
    });

    await candidate.save();
    // populate position before returning
    await candidate.populate('position');
    res.status(201).json(candidate);
  } catch (err) {
    res.status(500).json({ message: 'Error adding candidate', error: err.message });
  }
});

// Update candidate (admin only)
router.put('/:id', authenticateAdmin, async (req, res) => {
  try {
    const updated = await Candidate.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('position');
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Error updating candidate', error: err.message });
  }
});

// Delete candidate (admin only)
router.delete('/:id', authenticateAdmin, async (req, res) => {
  try {
    await Candidate.findByIdAndDelete(req.params.id);
    res.json({ message: 'Candidate deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting candidate', error: err.message });
  }
});

module.exports = router;
