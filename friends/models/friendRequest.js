const mongoose = require('mongoose');

// Esquema de solicitud de amistad
const friendRequestSchema = new mongoose.Schema({
  senderId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  senderEmail: { type: String, required: true }, // <- nuevo campo
  receiverId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  receiverEmail: { type: String, required: true }, // <- nuevo campo
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
  { unique: true, partialFilterExpression: { status: 'pending' } }
);

// Crear modelo
const FriendRequest = mongoose.model('FriendRequest', friendRequestSchema);

module.exports = FriendRequest;