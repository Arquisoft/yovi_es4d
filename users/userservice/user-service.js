const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./user-model');

const app = express();
const port = 8001;

app.use(express.json());

/* =============================
   Mongo connection
============================= */

const mongoUri =
  process.env.MONGODB_URI ||
  'mongodb://localhost:27017/userdb';

mongoose.connect(mongoUri);

/* =============================
   Helpers
============================= */

function validateRequiredFields(req, fields) {
  for (const field of fields) {
    if (!(field in req.body)) {
      throw new Error(`Missing field: ${field}`);
    }
  }
}

function validatePassword(password) {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasNoSpaces = !/\s/.test(password);

  if (
    !hasUpperCase ||
    !hasNumber ||
    !hasNoSpaces ||
    password.length < minLength
  ) {
    throw new Error('Password does not meet requirements');
  }
}

/* =============================
   CREATE USER
============================= */

app.post('/adduser', async (req, res) => {
  try {

    validateRequiredFields(req, [
      'username',
      'email',
      'password'
    ]);

    const { username, email: rawEmail, password } = req.body;

    const email = rawEmail.trim().toLowerCase();

    validatePassword(password);

    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(409).json({
        error: 'Email or username already exists'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    /* avatar automático */
    const avatar =
      `https://api.dicebear.com/8.x/initials/svg?seed=${email}`;

    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      avatar,
      createdAt: new Date()
    });

    await newUser.save();

    res.status(201).json({
      message: 'User created',
      id: newUser._id
    });

  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/* =============================
   GET PROFILE
   (userId viene del gateway)
============================= */

app.post('/profile', async (req, res) => {

  try {

    const { userId } = req.body;

    const user = await User
      .findById(userId)
      .select('-password');

    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    res.json({
      id: user._id,
      username: user.username,
      email: user.email,
      avatar: user.avatar
    });

  } catch (error) {
    res.status(500).json({
      error: 'Internal error'
    });
  }

});

/* =============================
   EDIT USERNAME
============================= */

app.post('/editUser', async (req, res) => {

  try {

    const { userId, username } = req.body;

    if (!username || username.length < 3) {
      return res.status(400).json({
        error: "Invalid username"
      });
    }

    await User.findByIdAndUpdate(
      userId,
      { username }
    );

    res.json({ message: "Username updated" });

  } catch (error) {
    res.status(500).json({
      error: "Internal error"
    });
  }

});

/* =============================
   CHANGE PASSWORD
============================= */

app.post('/changePassword', async (req, res) => {

  try {
    const {
      userId,
      currentPassword,
      newPassword
    } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        error: "User not found"
      });
    }

    const valid = await bcrypt.compare(
      currentPassword,
      user.password
    );

    if (!valid) {
      return res.status(400).json({
        error: "Current password incorrect"
      });
    }

    validatePassword(newPassword);

    const hashed = await bcrypt.hash(newPassword, 10);

    user.password = hashed;
    await user.save();

    res.json({
      message: "Password updated"
    });

  } catch (error) {
    res.status(400).json({
      error: error.message
    });
  }

});

/* =============================
   START SERVER
============================= */

const server = app.listen(port, () => {
  console.log(`User service running on ${port}`);
});

server.on('close', () => {
  mongoose.connection.close();
});

module.exports = server;