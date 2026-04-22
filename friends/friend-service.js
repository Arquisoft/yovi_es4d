require('dotenv').config();
const axios = require('axios');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const FriendRequest = require('./models/friendRequest');
const Notification = require('./models/notification');

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/gameDB';
const userServiceProtocol = process.env.USER_SERVICE_PROTOCOL || 'http';
const userServiceHost = process.env.USER_SERVICE_HOST || 'localhost';
const userServicePort = process.env.USER_SERVICE_PORT || '8001';
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || `${userServiceProtocol}://${userServiceHost}:${userServicePort}`;

function parseObjectId(value, fieldName) {
  if (typeof value !== 'string' || !mongoose.Types.ObjectId.isValid(value)) {
    throw new Error(`Invalid ${fieldName}`);
  }

  return new mongoose.Types.ObjectId(value);
}

// ConexiÃ³n a MongoDB
if (process.env.SKIP_MONGO !== 'true') {
  mongoose.connect(mongoUri)
    .then(() => console.log('Conectado a MongoDB'))
    .catch(err => console.error('Error conectando a MongoDB:', err));
}

const app = express();
app.disable('x-powered-by');
const port = process.env.PORT || 8004;

const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS ||
  'https://localhost:5173,https://20.188.62.231:5173,https://20.188.62.231:8000,https://20.188.62.231')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean)
  .reduce((origins, origin) => origins.add(origin), new Set());

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());

// AMIGOS
app.get('/friends', async (req, res) => {
  try {
    const { userId } = req.query;
    const userObjectId = parseObjectId(userId, 'userId');

    const relations = await FriendRequest.find({
      $or: [
        { senderId: userObjectId, status: 'accepted' },
        { receiverId: userObjectId, status: 'accepted' }
      ]
    });

    const friendIds = relations.map(r =>
      r.senderId.toString() === userId
        ? r.receiverId.toString()
        : r.senderId.toString()
    );

    const response = await axios.post(`${USER_SERVICE_URL}/api/users/bulk`, {
      ids: friendIds
    });

    res.json(response.data);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  }
});

//  EXPLORAR USUARIOS

app.get('/friends/explore', async (req, res) => {
  try {
    const { userId, search = '', page = 1 } = req.query;
    const limit = 10;
    const batchSize = 50;
    const pageNum = Math.max(Number.parseInt(page, 10) || 1, 1);
    const startIndex = (pageNum - 1) * limit;
    const endIndex = startIndex + limit;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    const safeUserId = parseObjectId(userId, 'userId');

    const relations = await FriendRequest.find({
      $or: [
        { senderId: safeUserId, status: 'accepted' },
        { receiverId: safeUserId, status: 'accepted' }
      ]
    });
    const friendIds = new Set(
      relations.map(r =>
        r.senderId.toString() === userId
          ? r.receiverId.toString()
          : r.senderId.toString()
      )
    );

    const pendingRequests = await FriendRequest.find({
      $or: [
        { senderId: safeUserId, status: 'pending' },
        { receiverId: safeUserId, status: 'pending' }
      ]
    });

    const pendingIds = new Set(pendingRequests.map(r =>
      r.senderId.toString() === userId
        ? r.receiverId.toString()
        : r.senderId.toString()
    ));

    const filteredUsers = [];
    let rawPage = 1;
    let hasMoreRawPages = true;

    // Pagina sobre usuarios ya filtrados para que el frontend no pueda avanzar a paginas vacias.
    while (hasMoreRawPages && filteredUsers.length <= endIndex) {
      const response = await axios.get(`${USER_SERVICE_URL}/api/users`, {
        params: { search, page: rawPage, limit: batchSize }
      });

      const rawUsers = Array.isArray(response.data) ? response.data : [];
      const allowedUsers = rawUsers.filter(u => {
        if (u._id === userId) return false;
        if (friendIds.has(u._id)) {
          return false;
        }
        if (pendingIds.has(u._id)) {
          return false;
        }
        return true;
      });

      filteredUsers.push(...allowedUsers);
      hasMoreRawPages = rawUsers.length === batchSize;
      rawPage += 1;
    }

    const users = filteredUsers.slice(startIndex, endIndex);

    res.json({
      users,
      pagination: {
        page: pageNum,
        limit,
        hasPrev: pageNum > 1,
        hasNext: filteredUsers.length > endIndex,
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  }
});


// SOLICITUDES

app.post('/friends/request', async (req, res) => {
  try {
    const { senderId, receiverId } = req.body;
    if (!senderId || !receiverId)
      return res.status(400).json({ error: 'senderId and receiverId required' });
    const safeSenderId = parseObjectId(senderId, 'senderId');
    const safeReceiverId = parseObjectId(receiverId, 'receiverId');

    const existing = await FriendRequest.findOne({
      senderId: safeSenderId,
      receiverId: safeReceiverId,
      status: 'pending'
    });
    if (existing) return res.status(400).json({ error: 'Request already exists' });

    const sender = await axios.post(`${USER_SERVICE_URL}/profile`, { userId: senderId });
    const receiver = await axios.post(`${USER_SERVICE_URL}/profile`, { userId: receiverId });

    // Validar que exista email
    if (!sender.data.email || !receiver.data.email)
      return res.status(500).json({ error: 'Cannot create friend request without emails' });

    const request = new FriendRequest({
      senderId,
      senderEmail: sender.data.email,
      receiverId,
      receiverEmail: receiver.data.email
    });
    await request.save();

    await Notification.create({
      userId: receiverId,
      type: 'friend_request',
      relatedUserId: senderId,
      relatedUserEmail: sender.data.email
    });

    res.status(201).json({ message: 'Request sent' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// Obtener solicitudes
app.get('/friends/requests', async (req, res) => {
  try {
    const { userId, type } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    const allowedTypes = ['received', 'sent'];

    if (!allowedTypes.includes(type)) {
      throw new Error('Invalid type');
    }

    const safeUserId = parseObjectId(userId, 'userId');

    let query;

    if (type === 'received') {
      query = {
        receiverId: safeUserId,
        status: 'pending'
      };
    } else if (type === 'sent') {
      query = {
        senderId: safeUserId,
        status: 'pending'
      };
    }
    
    const requests = await FriendRequest.find(query);

    const enriched = requests.map(r => ({
      _id: r._id,
      status: r.status,
      sender: { _id: r.senderId, email: r.senderEmail },
      receiver: { _id: r.receiverId, email: r.receiverEmail },
      createdAt: r.createdAt
    }));

    res.json(enriched);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// PATCH aceptar solicitud
app.patch('/friends/accept', async (req, res) => {
  try {
    const { requestId, userId } = req.body;
    if (!requestId || !userId) {
      return res.status(400).json({ error: 'requestId and userId required' });
    }

    const request = await FriendRequest.findById(requestId);
    if (!request) return res.status(404).json({ error: 'Not found' });

    if (request.receiverId.toString() !== userId) {
      return res.status(403).json({ error: 'Not allowed' });
    }

    request.status = 'accepted';
    await request.save();

    const safeSenderId = request.senderId.toString();
    const safeUserId = userId.toString();

    await Notification.findOneAndDelete({
      userId: safeUserId,
      type: 'friend_request',
      relatedUserId: safeSenderId
    });

    res.json({ message: 'Accepted' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// PATCH rechazar solicitud
app.patch('/friends/reject', async (req, res) => {
  try {
    const { requestId } = req.body;
    if (!requestId) return res.status(400).json({ error: 'requestId required' });

    const request = await FriendRequest.findById(requestId);
    if (!request) return res.status(404).json({ error: 'Not found' });

    await request.deleteOne();
    await Notification.findOneAndDelete({
      type: 'friend_request',
      relatedUserId: request.senderId
    });
    res.json({ message: 'Rejected' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// Cancelar solicitud
app.delete('/friends/request/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { senderId } = req.body;
    if (!senderId) return res.status(400).json({ error: 'senderId required' });

    const request = await FriendRequest.findById(id);
    if (!request) return res.status(404).json({ error: 'Not found' });
    if (request.senderId.toString() !== senderId) return res.status(403).json({ error: 'Not allowed' });

    await request.deleteOne();
    res.json({ message: 'Request cancelled' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  }
});


// NOTIFICACIONES

app.get('/notifications', async (req, res) => {
  try {
    const { userId, page = 1 } = req.query;
    const limit = 10;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error('Invalid userId');
    }

    const safeUserId = new mongoose.Types.ObjectId(userId);

    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(50, Math.max(1, Number(limit) || 10));

    const notifications = await Notification.find({
      userId: safeUserId
    })
      .sort({ createdAt: -1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit);

    const unreadCount = await Notification.countDocuments({ userId: safeUserId, read: false });

    const enrichedNotifications = await Promise.all(
      notifications.map(async (n) => {
        let relatedUserData;
        try {
          const response = await axios.post(`${USER_SERVICE_URL}/profile`, { userId: n.relatedUserId });
          relatedUserData = response.data;
        } catch (err) {
          console.error(`Error obteniendo datos de user ${n.relatedUserId}:`, err.message);
          relatedUserData = { username: 'Usuario desconocido', email: '', avatar: '' };
        }

        return {
          _id: n._id,
          type: n.type,
          read: n.read,
          createdAt: n.createdAt,
          relatedUser: {
            _id: n.relatedUserId,
            username: relatedUserData.username,
            email: relatedUserData.email,
            avatar: relatedUserData.avatar
          }
        };
      })
    );

    res.json({ unreadCount, notifications: enrichedNotifications });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error obteniendo notificaciones' });
  }
});

app.patch('/notifications/read-all', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    const safeUserId = parseObjectId(userId, 'userId');

    await Notification.updateMany({ userId: safeUserId, read: false }, { read: true });
    res.json({ message: 'All notifications read' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  }
});

app.post('/notifications/game-invite', async (req, res) => {
  try {
    const { senderId, receiverId } = req.body;
    if (!senderId || !receiverId) return res.status(400).json({ error: 'senderId and receiverId required' });

    const sender = await axios.post(`${USER_SERVICE_URL}/profile`, { userId: senderId });

    await Notification.create({
      userId: receiverId,
      type: 'game_invite',
      relatedUserId: senderId,
      relatedUserEmail: sender.data.email
    });

    res.status(201).json({ message: 'Game invite sent' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  }
});


if (!module.parent) {
  app.listen(port, '0.0.0.0', () =>
    console.log(`Friend Service listening on ${port}`)
  );
}

module.exports = app;
