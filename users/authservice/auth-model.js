const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    createdAt: Date,
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

module.exports = User