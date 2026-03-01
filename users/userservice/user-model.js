const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { type: String, unique: true },
    password: String,
    email: { type: String, unique: true },
    createdAt: Date,
});

const User = mongoose.model('User', userSchema);

module.exports = User