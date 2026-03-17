const express = require('express');
const router = express.Router();
const Vote = require('../models/Vote');
const Candidate = require('../models/Candidate');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

const authenticateStudent = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token' });
    
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) return res.status(401).json({ message: 'User not found' });
    
    req.userId = decoded.userId;
    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Cast a vote
router.post('/', authenticateStudent, async (req, res) => {
  try {
    const { candidateId, positionId } = req.body;
    const studentId = req.userId;

    // Check if student already voted for this position
    const existingVote = await Vote.findOne({ studentId, positionId: positionId || null });
    if (existingVote) {
      return res.status(400).json({ message: 'You have already voted for this position' });
    }

    // Create vote and increment candidate votes
    const vote = new Vote({
      studentId,
      positionId: positionId || null,
      candidateId,
      voterEmail: req.user?.email,
      voterName: req.user?.fullName
    });

    await vote.save();

    // Increment candidate vote count
    await Candidate.findByIdAndUpdate(candidateId, { $inc: { votes: 1 } });

    res.status(201).json({ message: 'Vote cast successfully', vote });
  } catch (err) {
    res.status(500).json({ message: 'Error casting vote', error: err.message });
  }
});

// Get student's vote
// Get student's votes (all positions)
router.get('/my-vote', authenticateStudent, async (req, res) => {
  try {
    const votes = await Vote.find({ studentId: req.userId }).populate('candidateId').populate('positionId');
    res.json(votes || []);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching vote', error: err.message });
  }
});

// Get results (all votes count)
// Get all votes (optionally grouped by position)
router.get('/results', async (req, res) => {
  try {
    const votes = await Vote.find().populate('candidateId').populate('positionId');
    res.json(votes);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching results', error: err.message });
  }
});

module.exports = router;
