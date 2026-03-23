const mongoose = require('mongoose');

const friendRequestSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// ✅ Evitar solicitudes duplicadas SOLO si están pendientes
friendRequestSchema.index(
  { senderId: 1, receiverId: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'pending' }
  }
);

const FriendRequest = mongoose.model('FriendRequest', friendRequestSchema);

module.exports = FriendRequest;