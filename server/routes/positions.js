const express = require('express');
const router = express.Router();
const Position = require('../models/Position');
const Candidate = require('../models/Candidate');

// GET /api/positions - list positions
router.get('/', async (req, res) => {
  try {
    const positions = await Position.find().sort({ createdAt: 1 });
    res.json(positions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/positions - create
router.post('/', async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ message: 'Name is required' });
    const pos = new Position({ name, description });
    await pos.save();
    res.status(201).json(pos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/positions/:id - update
router.put('/:id', async (req, res) => {
  try {
    const { name, description } = req.body;
    const pos = await Position.findById(req.params.id);
    if (!pos) return res.status(404).json({ message: 'Position not found' });
    if (name) pos.name = name;
    if (description !== undefined) pos.description = description;
    pos.updatedAt = Date.now();
    await pos.save();
    res.json(pos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/positions/:id - delete
// When deleting a position, unset the position on candidates that reference it
router.delete('/:id', async (req, res) => {
  try {
    const pos = await Position.findById(req.params.id);
    if (!pos) return res.status(404).json({ message: 'Position not found' });

    // unset position from candidates
    await Candidate.updateMany({ position: pos._id }, { $set: { position: null } });

    await pos.remove();
    res.json({ message: 'Position deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
