const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/usersdb';
    console.log(`Connecting to MongoDB at ${uri}...`);
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    console.log('Ensure MongoDB is running locally or update MONGODB_URI in .env');
    // Don't exit immediately in development to allow server to start (optional, but good for debugging)
    // process.exit(1); 
  }
};

module.exports = connectDB;
