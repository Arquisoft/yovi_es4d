const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('./auth-model')
const { check, validationResult } = require('express-validator');
const app = express();
const port = 8002;

// Middleware to parse JSON in request body
app.use(express.json());
// Connect to MongoDB
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/userdb';
mongoose.connect(mongoUri);

const privateKey = process.env.TOKEN_SECRET_KEY || 'your-secret-key';

const failedAttempts = new Map(); // Store failed login attempts per IP address
const MAX_ATTEMPTS = 5; // Maximum number of failed attempts before blocking
const WINDOW_MS = 5 * 60 * 1000; // 5 minutes

// Middleware to limit the number of login attempts per IP
function loginLimiter(req, res, next) {
  const ip = req.ip;
  const entry = failedAttempts.get(ip);

  if (entry && entry.count+1 >= MAX_ATTEMPTS && (Date.now() - entry.lastAttempt) < WINDOW_MS) {
    return res.status(429).json({ error: 'Too many login attempts, please try again later' });
  }

  next();
}

// Function to validate required fields in the request body
function validateRequiredFields(req, requiredFields) {
  for (const field of requiredFields) {
    if (!(field in req.body)) {
      throw new Error(`Missing required field: ${field}`);
    }
  }
}

// Route for user login
app.post('/login', loginLimiter, [
  check('email').isLength({ min: 3 }).trim().escape(),
  check('password').isLength({ min: 3 }).trim().escape()
], async (req, res) => {
  const ip = req.ip;
  try {
    // Check if required fields are present in the request body

    validateRequiredFields(req, ['email', 'password']);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array().toString() });
    }
    let email = req.body.email.toString();
    let password = req.body.password.toString();
    // Find the user by email in the database
    const user = await User.findOne({ email });


    // Check if the user exists and verify the password
    if (user && await bcrypt.compare(password, user.password)) {
      // Reset failed attempts on successful login
      failedAttempts.delete(ip);
        
      // Generate a JWT token
      const token = jwt.sign({ userId: user._id }, privateKey, { expiresIn: '1h' });
      // Respond with the token and user information
      res.json({ token: token, email: email, createdAt: user.createdAt, id: user._id });
    } else {
      // Increment failed attempts for the IP address
      const entry = failedAttempts.get(ip) || { count: 0, lastAttempt: Date.now() };
      failedAttempts.set(ip, { count: entry.count + 1, lastAttempt: Date.now() });
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Start the server
const server = app.listen(port, () => {
});

server.on('close', () => {
  // Close the Mongoose connection
  mongoose.connection.close();
});

module.exports = server