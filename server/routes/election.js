const express = require('express');
const router = express.Router();
const ElectionSettings = require('../models/ElectionSettings');
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

// Get election settings
router.get('/', async (req, res) => {
  try {
    let settings = await ElectionSettings.findOne();
    if (!settings) {
      settings = new ElectionSettings({
        title: 'Student Council Election',
        description: 'Annual student council elections'
      });
      await settings.save();
    }
    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching settings', error: err.message });
  }
});

// Update election settings (admin only)
router.put('/', authenticateAdmin, async (req, res) => {
  try {
    let settings = await ElectionSettings.findOne();
    if (!settings) {
      settings = new ElectionSettings(req.body);
    } else {
      Object.assign(settings, req.body);
      settings.updatedAt = new Date();
    }
    await settings.save();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: 'Error updating settings', error: err.message });
  }
});

// Start election (admin only)
router.post('/start', authenticateAdmin, async (req, res) => {
  try {
    let settings = await ElectionSettings.findOne();
    if (!settings) {
      settings = new ElectionSettings();
    }
    settings.isActive = true;
    settings.startedAt = new Date();
    await settings.save();
    res.json({ message: 'Election started', settings });
  } catch (err) {
    res.status(500).json({ message: 'Error starting election', error: err.message });
  }
});

// Stop election (admin only)
router.post('/stop', authenticateAdmin, async (req, res) => {
  try {
    const settings = await ElectionSettings.findOne();
    if (!settings) {
      return res.status(404).json({ message: 'No election settings found' });
    }
    settings.isActive = false;
    settings.endedAt = new Date();
    await settings.save();
    res.json({ message: 'Election stopped', settings });
  } catch (err) {
    res.status(500).json({ message: 'Error stopping election', error: err.message });
  }
});

module.exports = router;
