require('dotenv').config();
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Use local MongoDB or provide MONGODB_URI in .env
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/trustvote';
    
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('MongoDB connected successfully');
  } catch (err) {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
