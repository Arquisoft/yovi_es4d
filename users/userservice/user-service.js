const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./user-model');

const app = express();
const port = 8001;

app.use(express.json());

// Connect to MongoDB
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/userdb';
mongoose.connect(mongoUri);

// Validate required fields
function validateRequiredFields(req, requiredFields) {
  for (const field of requiredFields) {
    if (!(field in req.body)) {
      throw new Error(`Missing required field: ${field}`);
    }
  }
}

// Validate password
function validatePassword(password) {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasNoSpaces = !/\s/.test(password);

  if (!hasUpperCase || !hasNumber || !hasNoSpaces || password.length < minLength) {
    throw new Error('Password does not meet requirements');
  }
}

app.post('/adduser', async (req, res) => {
  try {
    validateRequiredFields(req, ['username', 'email', 'password']);

    const { username, email: rawEmail, password } = req.body;

    // Validate username
    if (typeof username !== 'string' || username.length < 3 || username.length > 30) {
      return res.status(400).json({ error: 'Username must be between 3 and 30 characters' });
    }

    // Normalize email FIRST
    const email = rawEmail.trim().toLowerCase();

    // Validate email length
    if (email.length < 5 || email.length > 100) {
      return res.status(400).json({ error: 'Email must be between 5 and 100 characters' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Validate password
    validatePassword(password);

    // Check if email or username already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(409).json({ error: 'Email or username already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      createdAt: new Date(),
    });

    await newUser.save();

    res.status(201).json({
      message: 'User created successfully',
      id: newUser._id
    });

  } catch (error) {
    console.error(error);
    res.status(400).json({ error: error.message });
  }
});

const server = app.listen(port, () => {
  console.log(`User service running on port ${port}`);
});

server.on('close', () => {
  mongoose.connection.close();
});

module.exports = server;