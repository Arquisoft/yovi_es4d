const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['friend_request', 'game_invite'], required: true },
  relatedUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  relatedUserEmail: { type: String, required: true }, // <- nuevo campo
  referenceId: { type: mongoose.Schema.Types.ObjectId, default: null }, 
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

// ✅ Optimiza consultas del punto rojo 🔴
notificationSchema.index({ userId: 1, read: 1 });

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;