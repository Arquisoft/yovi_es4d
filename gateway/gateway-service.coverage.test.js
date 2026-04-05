const request = require('supertest');
const jwt = require('jsonwebtoken');

const privateKey = process.env.TOKEN_SECRET_KEY || 'mi_clave_secreta';

function createCookie(userId = 'testUser') {
  const token = jwt.sign({ userId }, privateKey);
  return `token=${token}`;
}

function loadGatewayWithMocks() {
  jest.resetModules();

  jest.doMock('axios', () => ({
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  }));

  jest.doMock('socket.io', () => ({
    Server: jest.fn(),
  }));

  const app = require('./gateway-service');
  const axios = require('axios');
  const { Server } = require('socket.io');

  return { app, axios, MockSocketServer: Server };
}

function createMockSocket(id) {
  const handlers = {};
  const roomEmitter = { emit: jest.fn() };

  return {
    id,
    handlers,
    on: jest.fn((event, handler) => {
      handlers[event] = handler;
    }),
    join: jest.fn(),
    emit: jest.fn(),
    to: jest.fn(() => roomEmitter),
    roomEmitter,
  };
}

describe('Gateway Service extra coverage', () => {
  let app;
  let axios;
  let MockSocketServer;

  beforeEach(() => {
    ({ app, axios, MockSocketServer } = loadGatewayWithMocks());
    jest.clearAllMocks();
  });

  it('rejects disallowed CORS origins', async () => {
    const res = await request(app)
      .get('/metrics')
      .set('Origin', 'http://evil.example');

    expect(res.statusCode).toBe(500);
  });

  it('returns game history successfully', async () => {
    axios.get.mockResolvedValueOnce({
      data: [{ id: 'game1', winner: 'user1' }],
    });

    const res = await request(app)
      .get('/api/game/history')
      .set('Cookie', createCookie('user1'));

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual([{ id: 'game1', winner: 'user1' }]);
  });

  it('updates avatar successfully', async () => {
    axios.post.mockResolvedValueOnce({
      data: { avatar: 'avatar-url' },
    });

    const res = await request(app)
      .post('/api/user/updateAvatar')
      .set('Cookie', createCookie('user1'))
      .send({});

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ avatar: 'avatar-url' });
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining('/updateAvatar'),
      { userId: 'user1' }
    );
  });

  it('returns update avatar service errors', async () => {
    axios.post.mockRejectedValueOnce({
      response: { status: 404, data: { error: 'User not found' } },
    });

    const res = await request(app)
      .post('/api/user/updateAvatar')
      .set('Cookie', createCookie('user1'))
      .send({});

    expect(res.statusCode).toBe(404);
    expect(res.body.error).toBe('User not found');
  });

  it('returns move errors when the game service fails without response', async () => {
    axios.post.mockRejectedValueOnce(new Error('Network move fail'));

    const res = await request(app)
      .post('/api/game/game123/move')
      .set('Cookie', createCookie('user1'))
      .send({ move: '(1,1,1)', mode: 'vsBot' });

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe('Network move fail');
  });

  it('enriches missing receiver data in friend requests', async () => {
    axios.get.mockResolvedValueOnce({
      data: [{
        _id: 'r1',
        status: 'pending',
        createdAt: 'now',
        sender: { _id: 'sender1', username: 'sender', email: 'sender@mail.com' },
        receiver: { _id: 'receiver1' },
      }],
    });
    axios.post.mockResolvedValueOnce({
      data: { username: 'receiver', email: 'receiver@mail.com' },
    });

    const res = await request(app)
      .get('/api/friends/requests')
      .set('Cookie', createCookie('user1'))
      .query({ type: 'received' });

    expect(res.statusCode).toBe(200);
    expect(res.body[0].receiver).toEqual({
      _id: 'receiver1',
      username: 'receiver',
      email: 'receiver@mail.com',
    });
  });

  it('returns 500 when friend request retrieval fails', async () => {
    axios.get.mockRejectedValueOnce(new Error('Friend service down'));

    const res = await request(app)
      .get('/api/friends/requests')
      .set('Cookie', createCookie('user1'))
      .query({ type: 'received' });

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe('Error obteniendo solicitudes');
  });

  it('starts the websocket server and handles room lifecycle events', () => {
    const fakeHttpServer = { close: jest.fn() };
    let connectionHandler;

    const ioInstance = {
      on: jest.fn((event, handler) => {
        if (event === 'connection') {
          connectionHandler = handler;
        }
      }),
      to: jest.fn(() => ({ emit: jest.fn() })),
    };

    MockSocketServer.mockImplementation(() => ioInstance);
    jest.spyOn(app, 'listen').mockImplementation((port, callback) => {
      if (callback) callback();
      return fakeHttpServer;
    });

    const server = app.startServer();

    expect(server).toBe(fakeHttpServer);
    expect(app.listen).toHaveBeenCalledWith(8000, expect.any(Function));
    expect(MockSocketServer).toHaveBeenCalledWith(
      fakeHttpServer,
      expect.objectContaining({
        cors: expect.objectContaining({
          origin: expect.arrayContaining(['http://localhost:5173', 'http://20.188.62.231:5173']),
          credentials: true,
        }),
      })
    );

    const socket1 = createMockSocket('socket-1');
    const socket2 = createMockSocket('socket-2');
    const socket3 = createMockSocket('socket-3');
    const socket4 = createMockSocket('socket-4');

    connectionHandler(socket1);
    connectionHandler(socket2);
    connectionHandler(socket3);
    connectionHandler(socket4);

    socket1.handlers.create_room();
    const createdRoom = socket1.emit.mock.calls.find(([event]) => event === 'room_created')[1].code;

    socket3.handlers.join_room({ code: 'missing' });
    expect(socket3.emit).toHaveBeenCalledWith('room_error', { message: 'Sala no encontrada' });

    socket2.handlers.join_room({ code: createdRoom.toLowerCase() });
    expect(socket2.join).toHaveBeenCalledWith(createdRoom);

    socket3.handlers.join_room({ code: createdRoom });
    expect(socket3.emit).toHaveBeenCalledWith('room_error', { message: 'Sala llena' });

    socket2.handlers.disconnect();
    socket2.handlers.rejoin_room({ code: createdRoom, role: 'j2' });
    socket1.handlers.player_info({ code: createdRoom, name: 'Alice', avatar: 'alice.png' });
    socket2.handlers.rejoin_room({ code: createdRoom, role: 'j2' });

    socket1.handlers.game_started({ code: createdRoom, gameId: 'game-1' });
    socket2.handlers.rejoin_room({ code: createdRoom, role: 'j2' });

    socket1.handlers.move_made({ code: createdRoom, position: '(1,1)', turn: 'j2' });
    expect(socket1.roomEmitter.emit).toHaveBeenCalledWith('opponent_move', { position: '(1,1)', turn: 'j2' });

    socket1.handlers.game_over({ code: createdRoom, winner: 'j1' });
    expect(socket1.roomEmitter.emit).toHaveBeenCalledWith('game_over', { winner: 'j1' });

    socket4.handlers.create_room({ boardSize: 13 });
    const secondRoom = socket4.emit.mock.calls.find(([event]) => event === 'room_created')[1].code;
    socket4.handlers.disconnect();
    socket1.handlers.disconnect();

    expect(socket1.roomEmitter.emit).toHaveBeenCalledWith('opponent_disconnected');
    expect(secondRoom).toBeTruthy();
  });
});
