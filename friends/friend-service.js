// friend-service.js
require('dotenv').config();

const axios = require('axios');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const FriendRequest = require('./models/friendRequest');
const Notification = require('./models/Notification');

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/gameDB';
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:8001';

if (process.env.SKIP_MONGO !== 'true') {
  mongoose.connect(mongoUri)
    .then(() => console.log('Conectado a MongoDB'))
    .catch(err => console.error('Error conectando a MongoDB:', err));
}

const app = express();
const port = process.env.PORT || 8004;

app.use(cors());
app.use(express.json());

const privateKey = process.env.TOKEN_SECRET_KEY || 'your-secret-key';

// ----------------------
// Middleware JWT
// ----------------------
function authenticate(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const decoded = jwt.verify(token, privateKey);
    req.userId = decoded.userId;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// ----------------------
// Función para obtener datos de usuarios desde el user-service
// ----------------------
async function getUsersByIds(ids) {
  try {
    if (!ids || !ids.length) return [];
    const res = await axios.post(`${USER_SERVICE_URL}/api/users/bulk`, { ids });
    return res.data; // [{ _id, username, avatar }, ...]
  } catch (err) {
    console.error('Error fetching users from user-service', err);
    return [];
  }
}

// ----------------------
// 🧑‍🤝‍🧑 AMIGOS
// ----------------------

// GET amigos (con búsqueda y paginación)
app.get('/friends', authenticate, async (req, res) => {
  try {
    const search = req.query.search || '';
    const page = parseInt(req.query.page) || 1;
    const limit = 10;

    const relations = await FriendRequest.find({
      $or: [
        { senderId: req.userId, status: 'accepted' },
        { receiverId: req.userId, status: 'accepted' }
      ]
    });

    const friendIds = relations.map(r =>
      r.senderId.toString() === req.userId ? r.receiverId : r.senderId
    );

    let friends = await getUsersByIds(friendIds);

    // Filtrar por búsqueda
    if (search) {
      friends = friends.filter(f => f.username.toLowerCase().includes(search.toLowerCase()));
    }

    // Paginación
    const start = (page - 1) * limit;
    const paginated = friends.slice(start, start + limit);

    res.json(paginated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// ----------------------
// 🔍 EXPLORAR USUARIOS
// ----------------------
app.get('/friends/explore', authenticate, async (req, res) => {
  try {
    const search = req.query.search || '';
    const page = parseInt(req.query.page) || 1;
    const limit = 10;

    const relations = await FriendRequest.find({
      $or: [
        { senderId: req.userId },
        { receiverId: req.userId }
      ]
    });

    const excludedIds = new Set([req.userId]);
    relations.forEach(r => {
      excludedIds.add(r.senderId.toString());
      excludedIds.add(r.receiverId.toString());
    });

    const resUsers = await axios.get(`${USER_SERVICE_URL}/api/users`, {
      params: { exclude: Array.from(excludedIds), search }
    });

    const users = resUsers.data.slice((page - 1) * limit, page * limit);

    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// ----------------------
// 📩 SOLICITUDES
// ----------------------

// Enviar solicitud
app.post('/friends/request', authenticate, async (req, res) => {
  try {
    const { receiverId } = req.body;

    const existing = await FriendRequest.findOne({
      senderId: req.userId,
      receiverId,
      status: 'pending'
    });

    if (existing) return res.status(400).json({ error: 'Request already exists' });

    const request = new FriendRequest({ senderId: req.userId, receiverId });
    await request.save();

    await Notification.create({
      userId: receiverId,
      type: 'friend_request',
      relatedUserId: req.userId
    });

    res.status(201).json({ message: 'Request sent' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// Obtener solicitudes
app.get('/friends/requests', authenticate, async (req, res) => {
  try {
    const { type } = req.query;

    let query = {};
    if (type === 'received') query = { receiverId: req.userId, status: 'pending' };
    else if (type === 'sent') query = { senderId: req.userId, status: 'pending' };

    const requests = await FriendRequest.find(query);

    // Llenar datos de usuarios usando user-service
    const senderIds = requests.map(r => r.senderId.toString());
    const receiverIds = requests.map(r => r.receiverId.toString());
    const usersData = await getUsersByIds([...new Set([...senderIds, ...receiverIds])]);

    const enriched = requests.map(r => ({
      _id: r._id,
      status: r.status,
      sender: usersData.find(u => u._id === r.senderId.toString()),
      receiver: usersData.find(u => u._id === r.receiverId.toString()),
      createdAt: r.createdAt
    }));

    res.json(enriched);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// Aceptar solicitud
app.patch('/friends/accept', authenticate, async (req, res) => {
  try {
    const { requestId } = req.body;
    const request = await FriendRequest.findById(requestId);
    if (!request) return res.status(404).json({ error: 'Not found' });
    if (request.receiverId.toString() !== req.userId) return res.status(403).json({ error: 'Not allowed' });

    request.status = 'accepted';
    await request.save();

    await Notification.create({
      userId: request.senderId,
      type: 'friend_request',
      relatedUserId: req.userId
    });

    res.json({ message: 'Accepted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// Rechazar solicitud
app.patch('/friends/reject', authenticate, async (req, res) => {
  try {
    const { requestId } = req.body;
    await FriendRequest.findByIdAndUpdate(requestId, { status: 'rejected' });
    res.json({ message: 'Rejected' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// Cancelar solicitud enviada
app.delete('/friends/request/:id', authenticate, async (req, res) => {
  try {
    const request = await FriendRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ error: 'Not found' });
    if (request.senderId.toString() !== req.userId) return res.status(403).json({ error: 'Not allowed' });

    await request.deleteOne();
    res.json({ message: 'Request cancelled' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// ----------------------
// 🔔 NOTIFICACIONES
// ----------------------
app.get('/notifications', authenticate, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;

    const notifications = await Notification.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const unreadCount = await Notification.countDocuments({ userId: req.userId, read: false });

    res.json({ unreadCount, notifications });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  }
});

app.patch('/notifications/read-all', authenticate, async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.userId, read: false }, { read: true });
    res.json({ message: 'All notifications read' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  }
});

app.post('/notifications/game-invite', authenticate, async (req, res) => {
  try {
    const { receiverId } = req.body;
    await Notification.create({ userId: receiverId, type: 'game_invite', relatedUserId: req.userId });
    res.status(201).json({ message: 'Game invite sent' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// ----------------------
if (require.main === module) {
  app.listen(port, '0.0.0.0', () => console.log(`Friend Service listening on ${port}`));
}

module.exports = app;