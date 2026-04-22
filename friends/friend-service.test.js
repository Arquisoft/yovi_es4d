process.env.SKIP_MONGO = 'true';

const request = require('supertest');
const axios = require('axios');

const USER_1 = '507f1f77bcf86cd799439011';
const USER_2 = '507f1f77bcf86cd799439012';
const USER_3 = '507f1f77bcf86cd799439013';
const USER_4 = '507f1f77bcf86cd799439014';

jest.mock('axios');
jest.mock('./models/friendRequest', () => {
  const FriendRequest = jest.fn();
  FriendRequest.find = jest.fn();
  FriendRequest.findOne = jest.fn();
  FriendRequest.findById = jest.fn();
  return FriendRequest;
});

jest.mock('./models/notification', () => ({
  create: jest.fn(),
  find: jest.fn(),
  countDocuments: jest.fn(),
  updateMany: jest.fn(),
  findOneAndDelete: jest.fn(),
}));


const app = require('./friend-service');
const FriendRequest = require('./models/friendRequest');
const Notification = require('./models/notification');

describe('Friend Service', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  
  // GET /friends

  it('should get friends', async () => {
    FriendRequest.find.mockResolvedValue([
      { senderId: USER_1, receiverId: USER_2, status: 'accepted' },
      { senderId: USER_3, receiverId: USER_1, status: 'accepted' }
    ]);
    axios.post.mockResolvedValue({ data: [USER_2, USER_3] });

    const res = await request(app)
      .get('/friends')
      .query({ userId: USER_1 });

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual([USER_2, USER_3]);
  });

  it('should return 400 if userId missing in get friends', async () => {
    const res = await request(app).get('/friends');

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe('Internal error');
  });

  it('should return 500 if get friends fails', async () => {
    FriendRequest.find.mockRejectedValue(new Error('DB fail'));

    const res = await request(app)
      .get('/friends')
      .query({ userId: USER_1 });

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe('Internal error');
  });

  
  // GET /friends/explore
  it('should explore users excluding self, friends and pending requests', async () => {
    FriendRequest.find
      .mockResolvedValueOnce([
        { senderId: USER_1, receiverId: USER_2, status: 'accepted' }
      ])
      .mockResolvedValueOnce([
        { senderId: USER_3, receiverId: USER_1, status: 'pending' }
      ]);

    axios.get.mockResolvedValue({
      data: [
        { _id: USER_1, username: 'me' },
        { _id: USER_2, username: 'friend' },
        { _id: USER_3, username: 'pending' },
        { _id: USER_4, username: 'available' }
      ]
    });

    const res = await request(app)
      .get('/friends/explore')
      .query({ userId: USER_1, search: 'u', page: 1 });

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      users: [{ _id: USER_4, username: 'available' }],
      pagination: {
        page: 1,
        limit: 10,
        hasPrev: false,
        hasNext: false
      }
    });
  });

  it('should return 400 if userId missing in explore', async () => {
    const res = await request(app).get('/friends/explore');

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('userId required');
  });

  it('should return 500 if explore fails', async () => {
    FriendRequest.find.mockRejectedValue(new Error('DB fail'));

    const res = await request(app)
      .get('/friends/explore')
      .query({ userId: USER_1 });

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe('Internal error');
  });

  
  // POST /friends/request
  it('should send friend request', async () => {
    FriendRequest.findOne.mockResolvedValue(null);

    axios.post
      .mockResolvedValueOnce({ data: { email: 'sender@test.com' } })
      .mockResolvedValueOnce({ data: { email: 'receiver@test.com' } });

    const saveMock = jest.fn().mockResolvedValue();
    FriendRequest.mockImplementationOnce(function (data) {
      return {
        ...data,
        save: saveMock
      };
    });

    Notification.create.mockResolvedValue({});

    const res = await request(app)
      .post('/friends/request')
      .send({ senderId: USER_1, receiverId: USER_2 });

    expect(res.statusCode).toBe(201);
    expect(res.body.message).toBe('Request sent');
    expect(saveMock).toHaveBeenCalled();
    expect(Notification.create).toHaveBeenCalledWith({
      userId: USER_2,
      type: 'friend_request',
      relatedUserId: USER_1,
      relatedUserEmail: 'sender@test.com'
    });
  });

  it('should return 400 if senderId or receiverId missing', async () => {
    const res = await request(app)
      .post('/friends/request')
      .send({ senderId: USER_1 });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('senderId and receiverId required');
  });

  it('should return 400 if request already exists', async () => {
    FriendRequest.findOne.mockResolvedValue({ _id: 'req1' });

    const res = await request(app)
      .post('/friends/request')
      .send({ senderId: USER_1, receiverId: USER_2 });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Request already exists');
  });

  it('should return 500 if sender or receiver email is missing', async () => {
    FriendRequest.findOne.mockResolvedValue(null);

    axios.post
      .mockResolvedValueOnce({ data: { email: 'sender@test.com' } })
      .mockResolvedValueOnce({ data: {} });

    const res = await request(app)
      .post('/friends/request')
      .send({ senderId: USER_1, receiverId: USER_2 });

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe('Cannot create friend request without emails');
  });

  it('should return 500 if send friend request fails', async () => {
    FriendRequest.findOne.mockRejectedValue(new Error('DB fail'));

    const res = await request(app)
      .post('/friends/request')
      .send({ senderId: USER_1, receiverId: USER_2 });

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe('Internal error');
  });

  
  // GET /friends/requests
  it('should get received friend requests', async () => {
    FriendRequest.find.mockResolvedValue([
      {
        _id: 'req1',
        status: 'pending',
        senderId: USER_2,
        senderEmail: 'user2@test.com',
        receiverId: USER_1,
        receiverEmail: 'user1@test.com',
        createdAt: '2024-01-01'
      }
    ]);

    const res = await request(app)
      .get('/friends/requests')
      .query({ userId: USER_1, type: 'received' });

    expect(res.statusCode).toBe(200);
    expect(res.body[0].sender._id).toBe(USER_2);
    expect(res.body[0].receiver._id).toBe(USER_1);
  });

  it('should get sent friend requests', async () => {
    FriendRequest.find.mockResolvedValue([
      {
        _id: 'req1',
        status: 'pending',
        senderId: USER_1,
        senderEmail: 'user1@test.com',
        receiverId: USER_2,
        receiverEmail: 'user2@test.com',
        createdAt: '2024-01-01'
      }
    ]);

    const res = await request(app)
      .get('/friends/requests')
      .query({ userId: USER_1, type: 'sent' });

    expect(res.statusCode).toBe(200);
    expect(res.body[0].sender._id).toBe(USER_1);
  });

  it('should return 400 if userId missing in get requests', async () => {
    const res = await request(app).get('/friends/requests');

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('userId required');
  });

  it('should return 500 if get requests fails', async () => {
    FriendRequest.find.mockRejectedValue(new Error('DB fail'));

    const res = await request(app)
      .get('/friends/requests')
      .query({ userId: USER_1, type: 'received' });

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe('Internal error');
  });

  
  // PATCH /friends/accept
   it('should accept friend request', async () => {
    const saveMock = jest.fn().mockResolvedValue();

    FriendRequest.findById.mockResolvedValue({
      _id: 'req1',
      senderId: USER_2,
      receiverId: { toString: () => USER_1 },
      status: 'pending',
      save: saveMock
    });

    Notification.findOneAndDelete.mockResolvedValue({});

    const res = await request(app)
      .patch('/friends/accept')
      .send({ requestId: 'req1', userId: USER_1 });

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Accepted');
    expect(saveMock).toHaveBeenCalled();
    expect(Notification.findOneAndDelete).toHaveBeenCalledWith({
      userId: USER_1,
      type: 'friend_request',
      relatedUserId: USER_2
    });
  });

  it('should return 400 if requestId or userId missing in accept', async () => {
    const res = await request(app)
      .patch('/friends/accept')
      .send({ requestId: 'req1' });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('requestId and userId required');
  });

  it('should return 404 if request not found in accept', async () => {
    FriendRequest.findById.mockResolvedValue(null);

    const res = await request(app)
      .patch('/friends/accept')
      .send({ requestId: 'req1', userId: USER_1 });

    expect(res.statusCode).toBe(404);
    expect(res.body.error).toBe('Not found');
  });

  it('should return 403 if user is not allowed to accept request', async () => {
    FriendRequest.findById.mockResolvedValue({
      _id: 'req1',
      receiverId: { toString: () => 'otherUser' }
    });

    const res = await request(app)
      .patch('/friends/accept')
      .send({ requestId: 'req1', userId: USER_1 });

    expect(res.statusCode).toBe(403);
    expect(res.body.error).toBe('Not allowed');
  });

  it('should return 500 if accept fails', async () => {
    FriendRequest.findById.mockRejectedValue(new Error('DB fail'));

    const res = await request(app)
      .patch('/friends/accept')
      .send({ requestId: 'req1', userId: USER_1 });

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe('Internal error');
  });

  
  // PATCH /friends/reject
  it('should reject friend request', async () => {
    const deleteOneMock = jest.fn().mockResolvedValue();

    FriendRequest.findById.mockResolvedValue({
      _id: 'req1',
      senderId: USER_2,
      deleteOne: deleteOneMock
    });

    Notification.findOneAndDelete.mockResolvedValue({});

    const res = await request(app)
      .patch('/friends/reject')
      .send({ requestId: 'req1' });

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Rejected');
    expect(deleteOneMock).toHaveBeenCalled();
    expect(Notification.findOneAndDelete).toHaveBeenCalledWith({
      type: 'friend_request',
      relatedUserId: USER_2
    });
  });

  it('should return 400 if requestId missing in reject', async () => {
    const res = await request(app)
      .patch('/friends/reject')
      .send({});

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('requestId required');
  });

  it('should return 404 if request not found in reject', async () => {
    FriendRequest.findById.mockResolvedValue(null);

    const res = await request(app)
      .patch('/friends/reject')
      .send({ requestId: 'req1' });

    expect(res.statusCode).toBe(404);
    expect(res.body.error).toBe('Not found');
  });

  it('should return 500 if reject fails', async () => {
    FriendRequest.findById.mockRejectedValue(new Error('DB fail'));

    const res = await request(app)
      .patch('/friends/reject')
      .send({ requestId: 'req1' });

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe('Internal error');
  });

  
  // DELETE /friends/request/:id
  it('should cancel friend request', async () => {
    const deleteOneMock = jest.fn().mockResolvedValue();

    FriendRequest.findById.mockResolvedValue({
      _id: 'req1',
      senderId: { toString: () => USER_1 },
      deleteOne: deleteOneMock
    });

    const res = await request(app)
      .delete('/friends/request/req1')
      .send({ senderId: USER_1 });

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Request cancelled');
    expect(deleteOneMock).toHaveBeenCalled();
  });

  it('should return 400 if senderId missing in cancel request', async () => {
    const res = await request(app)
      .delete('/friends/request/req1')
      .send({});

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('senderId required');
  });

  it('should return 404 if request not found in cancel request', async () => {
    FriendRequest.findById.mockResolvedValue(null);

    const res = await request(app)
      .delete('/friends/request/req1')
      .send({ senderId: USER_1 });

    expect(res.statusCode).toBe(404);
    expect(res.body.error).toBe('Not found');
  });

  it('should return 403 if sender is not allowed to cancel request', async () => {
    FriendRequest.findById.mockResolvedValue({
      _id: 'req1',
      senderId: { toString: () => 'otherUser' }
    });

    const res = await request(app)
      .delete('/friends/request/req1')
      .send({ senderId: USER_1 });

    expect(res.statusCode).toBe(403);
    expect(res.body.error).toBe('Not allowed');
  });

  it('should return 500 if cancel request fails', async () => {
    FriendRequest.findById.mockRejectedValue(new Error('DB fail'));

    const res = await request(app)
      .delete('/friends/request/req1')
      .send({ senderId: USER_1 });

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe('Internal error');
  });

  
  // GET /notifications
  it('should get notifications', async () => {
  const notificationsData = [
    {
      _id: 'n1',
      type: 'friend_request',
      read: false,
      createdAt: '2024-01-01',
      relatedUserId: USER_2
    }
  ];

  const queryMock = {
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue(notificationsData)
  };

  Notification.find.mockReturnValue(queryMock);
  Notification.countDocuments.mockResolvedValue(3);

  axios.post.mockResolvedValue({
    data: {
      username: 'user2',
      email: 'user2@test.com',
      avatar: 'avatar.png'
    }
  });

  const res = await request(app)
    .get('/notifications')
    .query({ userId: USER_1, page: 1 });

  expect(res.statusCode).toBe(200);
  expect(res.body.unreadCount).toBe(3);
  expect(res.body.notifications).toHaveLength(1);
  expect(res.body.notifications[0]).toEqual({
    _id: 'n1',
    type: 'friend_request',
    read: false,
    createdAt: '2024-01-01',
    relatedUser: {
      _id: USER_2,
      username: 'user2',
      email: 'user2@test.com',
      avatar: 'avatar.png'
    }
  });
});

  it('should fallback user data if profile lookup fails in notifications', async () => {
  const notificationsData = [
    {
      _id: 'n1',
      type: 'friend_request',
      read: false,
      createdAt: '2024-01-01',
      relatedUserId: USER_2
    }
  ];

  const queryMock = {
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue(notificationsData)
  };

  Notification.find.mockReturnValue(queryMock);
  Notification.countDocuments.mockResolvedValue(1);
  axios.post.mockRejectedValue(new Error('User service fail'));

  const res = await request(app)
    .get('/notifications')
    .query({ userId: USER_1 });

  expect(res.statusCode).toBe(200);
  expect(res.body.notifications).toHaveLength(1);
  expect(res.body.notifications[0]).toEqual({
    _id: 'n1',
    type: 'friend_request',
    read: false,
    createdAt: '2024-01-01',
    relatedUser: {
      _id: USER_2,
      username: 'Usuario desconocido',
      email: '',
      avatar: ''
    }
  });
});

  it('should return 400 if userId missing in notifications', async () => {
    const res = await request(app).get('/notifications');

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('userId required');
  });

  it('should return 500 if notifications fail', async () => {
    Notification.find.mockImplementation(() => {
      throw new Error('DB fail');
    });

    const res = await request(app)
      .get('/notifications')
      .query({ userId: USER_1 });

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe('Error obteniendo notificaciones');
  });

  
  // PATCH /notifications/read-all
  it('should mark all notifications as read', async () => {
    Notification.updateMany.mockResolvedValue({ modifiedCount: 2 });

    const res = await request(app)
      .patch('/notifications/read-all')
      .send({ userId: USER_1 });

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('All notifications read');

   
  });

  it('should return 400 if userId missing in read-all', async () => {
    const res = await request(app)
      .patch('/notifications/read-all')
      .send({});

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('userId required');
  });

  it('should return 500 if read-all fails', async () => {
    Notification.updateMany.mockRejectedValue(new Error('DB fail'));

    const res = await request(app)
      .patch('/notifications/read-all')
      .send({ userId: USER_1 });

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe('Internal error');
  });

  
  // POST /notifications/game-invite
   it('should send game invite notification', async () => {
    axios.get.mockResolvedValue({
      data: { email: 'sender@test.com' }
    });
    Notification.create.mockResolvedValue({});

   const res = await request(app)
      .post('/notifications/game-invite')
      .send({ senderId: USER_1, receiverId: USER_2 });

    expect(res.statusCode).toBe(201);
    expect(res.body.message).toBe('Game invite sent');
    expect(Notification.create).toHaveBeenCalledWith({
      userId: USER_2,
      type: 'game_invite',
      relatedUserId: USER_1,
      relatedUserEmail: 'sender@test.com'
    });
  });

  it('should return 400 if senderId or receiverId missing in game invite', async () => {
    const res = await request(app)
      .post('/notifications/game-invite')
      .send({ senderId: USER_1 });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('senderId and receiverId required');
  });

  it('should return 500 if game invite fails', async () => {
    axios.get.mockRejectedValue(new Error('User service fail'));

    const res = await request(app)
      .post('/notifications/game-invite')
      .send({ senderId: USER_1, receiverId: USER_2 });

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe('Internal error');
  });
});
