const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
connectDB();

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/candidates', require('./routes/candidates'));
app.use('/api/votes', require('./routes/votes'));
app.use('/api/election', require('./routes/election'));
app.use('/api/positions', require('./routes/positions'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running' });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`TrustVote Server running on port ${PORT}`);
  console.log(`MongoDB: ${process.env.MONGODB_URI || 'mongodb://localhost:27017/trustvote'}`);
});
