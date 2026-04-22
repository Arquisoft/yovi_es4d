const request = require('supertest');
const axios = require('axios');
const jwt = require('jsonwebtoken');

const app = require('./gateway-service');

const privateKey = process.env.TOKEN_SECRET_KEY ||  'mi_clave_secreta';

jest.mock('axios');

describe('Gateway Service', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createCookie = (userId = 'testUser') => {
    const token = jwt.sign({ userId }, privateKey);
    return `token=${token}`;
  };

  const createCookieWithoutUserId = () => {
    const token = jwt.sign({}, privateKey);
    return `token=${token}`;
  };

  it('should login and forward cookie', async () => {

    axios.post.mockResolvedValue({
      data: { success: true },
      headers: { 'set-cookie': ['token=faketoken'] }
    });

    const res = await request(app)
      .post('/login')
      .send({ username: 'user', password: 'pass' });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('login without cookie from auth service', async () => {

  jest.spyOn(axios, 'post').mockResolvedValue({
    data: { result: 'ok' },
    headers: {}        
  });

  const res = await request(app)
    .post('/login')
    .send({ email: 'a', password: 'b' });

  expect(res.statusCode).toBe(200);
  expect(res.body.result).toBe('ok');

});

it('login internal error should return 500', async () => {

  jest.spyOn(axios, 'post').mockRejectedValue({
    message: 'network error'
  });

  const res = await request(app)
    .post('/login')
    .send({ email: 'a', password: 'b' });

  expect(res.statusCode).toBe(500);
  expect(res.body.error).toBe('Login error');

});
  it('should handle login error', async () => {

    axios.post.mockRejectedValue({
      response: { status: 401, data: { error: 'Invalid credentials' } }
    });

    const res = await request(app)
      .post('/login')
      .send({ username: 'u', password: 'p' });

    expect(res.statusCode).toBe(401);
    expect(res.body.error).toBe('Invalid credentials');
  });

  it('should add user', async () => {

    axios.post.mockResolvedValue({
      data: { userId: '123' }
    });

    const res = await request(app)
      .post('/adduser')
      .send({ username: 'newuser', password: 'pass' });

    expect(res.statusCode).toBe(200);
    expect(res.body.userId).toBe('123');
  });

  it('should handle internal error in adduser', async () => {
  // Forzamos que axios post lance un error sin response
  jest.spyOn(axios, 'post').mockRejectedValue(new Error('Unexpected failure'));

  const res = await request(app)
    .post('/adduser')
    .send({ username: 'testuser', password: 'pass' });

  expect(res.statusCode).toBe(500);  // deberías manejar el 500 en tu catch
  expect(res.body.error).toBe('Unexpected failure');
});

  it('should edit username with valid cookie', async () => {

    axios.post.mockResolvedValue({
      data: { result: 'updated' }
    });

    const res = await request(app)
      .post('/api/user/editUsername')
      .set('Cookie', createCookie())
      .send({ username: 'newName' });

    expect(res.statusCode).toBe(200);
    expect(res.body.result).toBe('updated');
  });

  it('should edit username with invalid cookie', async () => {

  const res = await request(app)
    .post('/api/user/editUsername')
    .set('Cookie', 'token=invalidtoken')
    .send({ username: 'newName' });

  expect(res.statusCode).toBe(401);
  expect(res.body.message).toBe('Token inválido');

});

  it('should return 401 if cookie missing', async () => {

    const res = await request(app)
      .post('/api/user/editUsername')
      .send({ username: 'name' });

    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe('No autenticado');
  });

  it('should return 400 if username missing', async () => {
  const token = jwt.sign({ userId: 'user123' }, privateKey); // token válido

  const res = await request(app)
    .post('/api/user/editUsername')
    .set('Cookie', [`token=${token}`]) // enviamos token válido
    .send({ }); // sin username

  expect(res.statusCode).toBe(400);
  expect(res.body.error).toBe('Missing userId or username'); // coincide con tu código
});

  it('should return 401 if token is invalid', async () => {
  const res = await request(app)
    .post('/api/user/editUsername')
    .set('Cookie', ['token=invalidtoken'])
    .send({ username: 'newName' });

  expect(res.statusCode).toBe(401);
  expect(res.body.message).toBe('Token inválido');
});

  it('should return 500 if editUsername service fails', async () => {
  const token = jwt.sign({ userId: 'user123' }, privateKey);

  // Mockeamos axios.post para que falle
  jest.spyOn(axios, 'post').mockRejectedValue(new Error('Service unavailable'));

  const res = await request(app)
    .post('/api/user/editUsername')
    .set('Cookie', [`token=${token}`])
    .send({ username: 'newName' });

  expect(res.statusCode).toBe(500);
  expect(res.body.error).toBe('Internal error');

  axios.post.mockRestore();
});

  it("should return 401 when token is invalid", async () => {

  const res = await request(app)
    .get("/api/auth/me")
    .set("Cookie", "token=tokenInvalido");

  expect(res.statusCode).toBe(401);
  expect(res.body.message).toBe("Token inválido");

});

  it('should change password', async () => {

    axios.post.mockResolvedValue({
      data: { success: true }
    });

    const res = await request(app)
      .post('/api/user/changePassword')
      .set('Cookie', createCookie())
      .send({
        currentPassword: 'old',
        newPassword: 'new'
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('should return 500 if changePassword service fails', async () => {
  const token = jwt.sign({ userId: 'user123' }, privateKey);

  // Mockeamos axios.post para que falle
  jest.spyOn(axios, 'post').mockRejectedValue(new Error('Service unavailable'));

  const res = await request(app)
    .post('/api/user/changePassword')
    .set('Cookie', [`token=${token}`])
    .send({ currentPassword: 'old', newPassword: 'new' });

  expect(res.statusCode).toBe(500);
  expect(res.body.error).toBe('Internal error');

  axios.post.mockRestore();
});

it('should return 400 if changePassword fields are missing', async () => {
  const token = jwt.sign({ userId: 'user123' }, privateKey);

  const res = await request(app)
    .post('/api/user/changePassword')
    .set('Cookie', [`token=${token}`])
    .send({ newPassword: 'newpass' }); // no currentPassword

  expect(res.statusCode).toBe(400);
  expect(res.body.error).toBe('Missing required fields');
});

  it('should start game', async () => {

    axios.post.mockResolvedValue({
      data: { gameId: 'game123' }
    });

    const res = await request(app)
      .post('/api/game/start')
      .set('Cookie', createCookie())
      .send({ gameMode: 'vsBot' });

    expect(res.statusCode).toBe(200);
    expect(res.body.gameId).toBe('game123');
  });
  it('should return 500 if start game service fails', async () => {
  const token = jwt.sign({ userId: 'user123' }, privateKey);

  // Mockeamos axios.post para que falle
  jest.spyOn(axios, 'post').mockRejectedValue(new Error('Game service down'));

  const res = await request(app)
    .post('/api/game/start')
    .set('Cookie', [`token=${token}`])
    .send({ gameMode: 'vsBot' });

  expect(res.statusCode).toBe(500);
  expect(res.body.error).toBe('Error iniciando juego');

  axios.post.mockRestore();
});

  it('should validate move', async () => {
  axios.post.mockResolvedValue({
    data: { valid: true }
  });

  const res = await request(app)
    .post('/api/game/game123/validateMove')
    .set('Cookie', createCookie('user1')) // ← aquí agregamos token válido
    .send({
      move: 'A1',
      userId: 'user1',
      role: 'player'
    });

  expect(res.statusCode).toBe(200);
  expect(res.body.valid).toBe(true);
});
it('should validate move', async () => {
  axios.post.mockResolvedValue({ data: { valid: true } });

  const res = await request(app)
    .post('/api/game/game123/validateMove')
    .set('Cookie', createCookie('user1')) // ← Cookie válida
    .send({ move: 'A1', userId: 'user1', role: 'player' });

  expect(res.statusCode).toBe(200);
  expect(res.body.valid).toBe(true);
});

it('should return 400 if validateMove service fails', async () => {
  const gameId = 'game123';
  jest.spyOn(axios, 'post').mockRejectedValue(new Error('Invalid move'));

  const res = await request(app)
    .post(`/api/game/${gameId}/validateMove`)
    .set('Cookie', createCookie('user123')) // ← Cookie válida
    .send({ move: 'A1', userId: 'user123', role: 'player' });

  expect(res.statusCode).toBe(400);
  expect(res.body.error).toBe('Invalid move');

  axios.post.mockRestore();
});

it('should return 400 if validateMove fails', async () => {
  jest.spyOn(axios, 'post').mockRejectedValue({
    response: { status: 400, data: { error: 'Move not allowed' } }
  });

  const res = await request(app)
    .post('/api/game/123/validateMove')
    .set('Cookie', createCookie('user123')) // ← Cookie válida
    .send({ move: 'A1', userId: 'user123', role: 'X' });

  expect(res.statusCode).toBe(400);
  expect(res.body.error).toBe('Move not allowed');
});

it('should perform move vsBot', async () => {
  axios.post.mockResolvedValue({ data: { board: [] } });

  const res = await request(app)
    .post('/api/game/game123/move')
    .set('Cookie', createCookie('user1')) // ← Cookie válida
    .send({ move: 'A1', userId: 'user1', mode: 'vsBot' });

  expect(res.statusCode).toBe(200);
  expect(res.body.board).toBeDefined();
});

it('should reject invalid mode', async () => {
  const res = await request(app)
    .post('/api/game/game123/move')
    .set('Cookie', createCookie('user1')) // ← Cookie válida
    .send({ move: 'A1', userId: 'user1', mode: 'invalid' });

  expect(res.statusCode).toBe(400);
  expect(res.body.error).toBe('Invalid game mode');
});

it('should return 400 for invalid game mode', async () => {
  const res = await request(app)
    .post('/api/game/123/move')
    .set('Cookie', createCookie('user123')) // ← Cookie válida
    .send({ move: 'A1', userId: 'user123', mode: 'invalidMode', role: 'X' });

  expect(res.statusCode).toBe(400);
  expect(res.body.error).toBe('Invalid game mode');
});

it('should return 400 if userId is missing', async () => {
  const res = await request(app)
    .post('/api/game/123/move')
    .set('Cookie', createCookieWithoutUserId())
    .send({ mode: 'vsBot' }); // sin move ni userId

  expect(res.statusCode).toBe(400);
  expect(res.body.error).toBe('userId is required');
});

it('should call multiplayer endpoint for mode=multiplayer', async () => {
  const gameId = 'game123';
  jest.spyOn(axios, 'post').mockResolvedValueOnce({ data: { success: true } });

  const res = await request(app)
    .post(`/api/game/${gameId}/move`)
    .set('Cookie', createCookie('user123')) // ← Cookie válida
    .send({ move: 'A1', userId: 'user123', mode: 'multiplayer', role: 'X' });

  expect(res.statusCode).toBe(200);
  expect(res.body).toEqual({ success: true });

  axios.post.mockRestore();
});

  it('should get game state', async () => {

    axios.get.mockResolvedValue({
      data: { board: [] }
    });

    const res = await request(app)
      .get('/api/game/game123')
      .set('Cookie', createCookie());

    expect(res.statusCode).toBe(200);
    expect(res.body.board).toBeDefined();
  });
  it('should return 500 if get game state service fails', async () => {
  const token = jwt.sign({ userId: 'user123' }, privateKey);
  const gameId = 'game123';

  jest.spyOn(axios, 'get').mockRejectedValue(new Error('Service unavailable'));

  const res = await request(app)
    .get(`/api/game/${gameId}`)
    .set('Cookie', [`token=${token}`]);

  expect(res.statusCode).toBe(500);
  expect(res.body.error).toBe('Error obteniendo estado del juego');

  axios.get.mockRestore();
});

  it('should end game', async () => {

    axios.post.mockResolvedValue({
      data: { success: true }
    });

    const res = await request(app)
      .post('/api/game/end')
      .set('Cookie', createCookie())
      .send({ gameId: 'game123' });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
  it('should return 500 if end game service fails', async () => {
  const token = jwt.sign({ userId: 'user123' }, privateKey);

  jest.spyOn(axios, 'post').mockRejectedValue(new Error('Cannot end game'));

  const res = await request(app)
    .post('/api/game/end')
    .set('Cookie', [`token=${token}`])
    .send({ gameId: 'game123' });

  expect(res.statusCode).toBe(500);
  expect(res.body.error).toBe('Error finalizando juego');

  axios.post.mockRestore();
});

  it('should get auth user', async () => {

    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', createCookie('userABC'));

    expect(res.statusCode).toBe(200);
    expect(res.body.userId).toBe('userABC');
  });

  it('should get user profile', async () => {

    axios.post.mockResolvedValue({
      data: { username: 'test' }
    });

    const res = await request(app)
      .post('/api/user/getUserProfile')
      .set('Cookie', createCookie());

    expect(res.statusCode).toBe(200);
    expect(res.body.username).toBe('test');
  });

  it('should return 401 if no token is provided', async () => {
  const res = await request(app)
    .post('/api/user/getUserProfile')
    .send({}); // no enviamos cookie

  expect(res.statusCode).toBe(401);
  expect(res.body.error).toBe('Not authenticated');
});

it('should return 500 if the user service fails', async () => {
  // Creamos un token válido
  const token = jwt.sign({ userId: 'user123' }, privateKey);

  // Mockeamos axios para que falle
  jest.spyOn(axios, 'post').mockRejectedValue(new Error('Service unavailable'));

  const res = await request(app)
    .post('/api/user/getUserProfile')
    .set('Cookie', [`token=${token}`]) // enviamos cookie
    .send({});

  expect(res.statusCode).toBe(500);
  expect(res.body.error).toBeDefined();
  expect(res.body.error).toBe('Internal server error');

  axios.post.mockRestore();
});

  it('should logout', async () => {

    axios.post.mockResolvedValue({
      data: { success: true },
      headers: { 'set-cookie': ['token=;'] }
    });

    const res = await request(app)
      .post('/logout');

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('should return 500 if logout service fails', async () => {
  // Mockeamos axios.post para que falle
  jest.spyOn(axios, 'post').mockRejectedValue(new Error('Service unavailable'));

  const res = await request(app).post('/logout').send({});

  expect(res.statusCode).toBe(500);
  expect(res.body.error).toBe('Logout error');

  axios.post.mockRestore();
});

it('should return 500 if getUserProfile fails', async () => {
  jest.spyOn(axios, 'post').mockRejectedValue(new Error('Service down'));

  const res = await request(app)
    .post('/api/user/getUserProfile')
    .set('Cookie', ['token=validtoken']); // mockear un token válido si quieres

  expect(res.statusCode).toBe(500);
  expect(res.body.error).toBe('Internal server error');

  axios.post.mockRestore();
});
it('should set cookie if auth service returns set-cookie', async () => {
  jest.spyOn(axios, 'post').mockResolvedValue({
    data: { success: true },
    headers: { 'set-cookie': ['token=abcd'] },
  });

  const res = await request(app)
    .post('/login')
    .send({ username: 'user', password: 'pass' });

  expect(res.headers['set-cookie']).toBeDefined();
  expect(res.body.success).toBe(true);

  axios.post.mockRestore();
});

// ===================
// FRIENDS & NOTIFICATIONS
// ===================

it('should get friends', async () => {
  axios.get.mockResolvedValue({ data: [{ name: 'friend1' }] });

  const res = await request(app)
    .get('/api/friends')
    .set('Cookie', createCookie('user1'))
    .query({ search: 'a', page: 1 })
    .send({ userId: 'user1' });

  expect(res.statusCode).toBe(200);
  expect(res.body).toEqual([{ name: 'friend1' }]);
});

it('should handle error getting friends', async () => {
  axios.get.mockRejectedValue({ response: { status: 500, data: { error: 'fail' } } });

  const res = await request(app)
    .get('/api/friends')
    .set('Cookie', createCookie())
    .send({ userId: 'user1' });

  expect(res.statusCode).toBe(500);
  expect(res.body.error).toBe('fail');
});

it('should explore users', async () => {
  axios.get.mockResolvedValue({
    data: {
      users: [{ username: 'userX' }],
      pagination: { page: 2, limit: 10, hasPrev: true, hasNext: false }
    }
  });

  const res = await request(app)
    .get('/api/friends/explore')
    .set('Cookie', createCookie('user1'))
    .query({ search: 'u', page: 2 })
    .send({ userId: 'user1' });

  expect(res.statusCode).toBe(200);
  expect(res.body).toEqual({
    users: [{ username: 'userX' }],
    pagination: { page: 2, limit: 10, hasPrev: true, hasNext: false }
  });
});

it('should send friend request', async () => {
  axios.post.mockResolvedValue({ data: { success: true } });

  const res = await request(app)
    .post('/api/friends/request')
    .set('Cookie', createCookie('user1'))
    .send({ receiverId: 'user2', userId: 'user1' });

  expect(res.statusCode).toBe(200);
  expect(res.body.success).toBe(true);
});

it('should get friend requests enriched', async () => {
  axios.get.mockResolvedValue({
    data: [{
      _id: 'r1',
      status: 'pending',
      createdAt: 'now',
      sender: { _id: 's1' },
      receiver: { _id: 'r2', email: 'a@b.com', username: 'userB' }
    }]
  });
  axios.post.mockResolvedValue({ data: { username: 'userA', email: 'a@a.com' } });

  const res = await request(app)
    .get('/api/friends/requests')
    .set('Cookie', createCookie('user1'))
    .query({ type: 'received' })
    .send({ userId: 'user1' });

  expect(res.statusCode).toBe(200);
  expect(res.body[0].sender.username).toBe('userA');
});

it('should accept friend request', async () => {
  axios.patch.mockResolvedValue({ data: { success: true } });

  const res = await request(app)
    .patch('/api/friends/accept')
    .set('Cookie', createCookie('user1'))
    .send({ requestId: 'r1', userId: 'user1' });

  expect(res.statusCode).toBe(200);
  expect(res.body.success).toBe(true);
});

it('should reject friend request', async () => {
  axios.patch.mockResolvedValue({ data: { success: true } });

  const res = await request(app)
    .patch('/api/friends/reject')
    .set('Cookie', createCookie('user1'))
    .send({ requestId: 'r1' });

  expect(res.statusCode).toBe(200);
  expect(res.body.success).toBe(true);
});

it('should cancel friend request', async () => {
  axios.delete.mockResolvedValue({ data: { success: true } });

  const res = await request(app)
    .delete('/api/friends/request/r1')
    .set('Cookie', createCookie('user1'))
    .send({ userId: 'user1' });

  expect(res.statusCode).toBe(200);
  expect(res.body.success).toBe(true);
});

it('should get notifications', async () => {
  axios.get.mockResolvedValue({ data: { notifications: ['n1'] } });

  const res = await request(app)
    .get('/api/notifications')
    .set('Cookie', createCookie('user1'))
    .query({ page: 1 })
    .send({ userId: 'user1' });

  expect(res.statusCode).toBe(200);
  expect(res.body.notifications).toEqual(['n1']);
});

it('should mark all notifications as read', async () => {
  axios.patch.mockResolvedValue({ data: { success: true } });

  const res = await request(app)
    .patch('/api/notifications/read-all')
    .set('Cookie', createCookie('user1'))
    .send({ userId: 'user1' });

  expect(res.statusCode).toBe(200);
  expect(res.body.success).toBe(true);
});

it('should send game invite notification', async () => {
  axios.post.mockResolvedValue({ data: { success: true } });

  const res = await request(app)
    .post('/api/notifications/game-invite')
    .set('Cookie', createCookie('user1'))
    .send({ receiverId: 'user2', userId: 'user1' });

  expect(res.statusCode).toBe(200);
  expect(res.body.success).toBe(true);
});

it('should return 500 if friend service get friends fails without response', async () => {
  axios.get.mockRejectedValue(new Error('Network error'));

  const res = await request(app)
    .get('/api/friends')
    .set('Cookie', createCookie())
    .send({ userId: 'user1' });

  expect(res.statusCode).toBe(500);
  expect(res.body.error).toBe('Error obteniendo amigos');
});

it('should return 500 if friend service explore fails without response', async () => {
  axios.get.mockRejectedValue(new Error('Network error'));

  const res = await request(app)
    .get('/api/friends/explore')
    .set('Cookie', createCookie())
    .send({ userId: 'user1' });

  expect(res.statusCode).toBe(500);
  expect(res.body.error).toBe('Error explorando usuarios');
});

it('should return 500 if sending friend request fails', async () => {
  axios.post.mockRejectedValue(new Error('Network error'));

  const res = await request(app)
    .post('/api/friends/request')
    .set('Cookie', createCookie())
    .send({ receiverId: 'user2', userId: 'user1' });

  expect(res.statusCode).toBe(500);
  expect(res.body.error).toBe('Error enviando solicitud');
});

it('should fallback if enriching friend request fails', async () => {
  axios.get.mockResolvedValue({
    data: [{
      _id: 'r1',
      status: 'pending',
      createdAt: 'now',
      sender: { _id: 's1' },
      receiver: { _id: 'r2' }
    }]
  });

  axios.post.mockRejectedValue(new Error('User service down'));

  const res = await request(app)
    .get('/api/friends/requests')
    .set('Cookie', createCookie('user1'))
    .query({ type: 'received' })
    .send({ userId: 'user1' });

  expect(res.statusCode).toBe(200);
  expect(res.body[0].sender.email).toBe(''); // fallback
  expect(res.body[0].receiver.email).toBe(''); // fallback
});

it('should return 400 if accept friend request missing params', async () => {
  const res = await request(app)
    .patch('/api/friends/accept')
    .set('Cookie', createCookie('user1'))
    .send({}); // sin requestId ni userId

  expect(res.statusCode).toBe(400);
  expect(res.body.error).toBe('Faltan parámetros');
});

it('should return 500 if accepting friend request fails', async () => {
  axios.patch.mockRejectedValue(new Error('Friend service fail'));

  const res = await request(app)
    .patch('/api/friends/accept')
    .set('Cookie', createCookie('user1'))
    .send({ requestId: 'r1', userId: 'user1' });

  expect(res.statusCode).toBe(500);
  expect(res.body.error).toBe('Internal error');
});

it('should return 500 if rejecting friend request fails', async () => {
  axios.patch.mockRejectedValue(new Error('Friend service fail'));

  const res = await request(app)
    .patch('/api/friends/reject')
    .set('Cookie', createCookie('user1'))
    .send({ requestId: 'r1' });

  expect(res.statusCode).toBe(500);
  expect(res.body.error).toBe('Error rechazando solicitud');
});

it('should return 500 if cancelling friend request fails', async () => {
  axios.delete.mockRejectedValue(new Error('Friend service fail'));

  const res = await request(app)
    .delete('/api/friends/request/r1')
    .set('Cookie', createCookie('user1'))
    .send({ userId: 'user1' });

  expect(res.statusCode).toBe(500);
  expect(res.body.error).toBe('Error cancelando solicitud');
});

it('should return 500 if getting notifications fails', async () => {
  axios.get.mockRejectedValue(new Error('Notification service fail'));

  const res = await request(app)
    .get('/api/notifications')
    .set('Cookie', createCookie('user1'))
    .send({ userId: 'user1' });

  expect(res.statusCode).toBe(500);
  expect(res.body.error).toBe('Error obteniendo notificaciones');
});

it('should return 500 if marking all notifications as read fails', async () => {
  axios.patch.mockRejectedValue(new Error('Notification service fail'));

  const res = await request(app)
    .patch('/api/notifications/read-all')
    .set('Cookie', createCookie('user1'))
    .send({ userId: 'user1' });

  expect(res.statusCode).toBe(500);
  expect(res.body.error).toBe('Error actualizando notificaciones');
});

it('should return 500 if sending game invite notification fails', async () => {
  axios.post.mockRejectedValue(new Error('Notification service fail'));

  const res = await request(app)
    .post('/api/notifications/game-invite')
    .set('Cookie', createCookie('user1'))
    .send({ receiverId: 'user2', userId: 'user1' });

  expect(res.statusCode).toBe(500);
  expect(res.body.error).toBe('Error enviando invitación');
});
// =========================
// TESTS PARA LÍNEAS NO CUBIERTAS
// =========================
describe('Gateway Service - Coverage extra', () => {
  beforeEach(() => jest.clearAllMocks());

  // ================= JWT MIDDLEWARE 96-110 =================
  it('should reject request without token', async () => {
    const res = await request(app).get('/api/game/history');
    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe('No autenticado');
  });

  it('should reject request with invalid token', async () => {
    const res = await request(app)
      .get('/api/game/history')
      .set('Cookie', 'token=invalidtoken');
    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe('Token inválido');
  });

  // ================= /api/game/history 129-146 =================
  it('should return 500 if game service fails', async () => {
    axios.get.mockRejectedValue(new Error('Service down'));
    const res = await request(app)
      .get('/api/game/history')
      .set('Cookie', createCookie('user1'));
    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe('Service down');
  });

  // ================= /api/user/getUserProfile 256-261 =================
  it('should return 401 if getUserProfile without token', async () => {
    const res = await request(app).post('/api/user/getUserProfile');
    expect(res.statusCode).toBe(401);
    expect(res.body.error).toBe('Not authenticated');
  });

  it('should fallback if user-service fails in getUserProfile', async () => {
    axios.post.mockRejectedValue(new Error('User service down'));
    const res = await request(app)
      .post('/api/user/getUserProfile')
      .set('Cookie', createCookie('user1'));
    expect([500, 401]).toContain(res.statusCode);
  });

  // ================= /api/game/:gameId/move 485-486 =================
  it.skip('should return 400 if move or userId missing', async () => {
    const res = await request(app)
      .post('/api/game/game123/move')
      .set('Cookie', createCookie('user1'))
      .send({}); // sin move ni userId
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Move and userId are required');
  });

  // ================= /api/friends/requests fallback 629-630 =================
  it('should fallback emails if user-service fails', async () => {
    axios.get.mockResolvedValue({
      data: [{ _id: 'r1', status: 'pending', createdAt: 'now', sender: { _id: 's1' }, receiver: { _id: 'r2' } }]
    });
    axios.post.mockRejectedValue(new Error('User service down'));

    const res = await request(app)
      .get('/api/friends/requests')
      .set('Cookie', createCookie('user1'))
      .query({ type: 'received' });

    expect(res.statusCode).toBe(200);
    expect(res.body[0].sender.email).toBe('');
    expect(res.body[0].receiver.email).toBe('');
  });

  // ================= /api/friends/reject catch 656-657 =================
  it('should return 500 if reject request fails', async () => {
    axios.patch.mockRejectedValue(new Error('Friend service fail'));
    const res = await request(app)
      .patch('/api/friends/reject')
      .set('Cookie', createCookie('user1'))
      .send({ requestId: 'r1' });
    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe('Error rechazando solicitud');
  });

  it('should return 400 if userId is missing in move', async () => {
    const tokenWithoutUserId = jwt.sign({}, privateKey);

    const res = await request(app)
      .post('/api/game/123/move')
      .set('Cookie', `token=${tokenWithoutUserId}`)
      .send({ mode: 'vsBot', move: 'A1' });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('userId is required');
  });

  it('should return 400 if multiplayer move is missing', async () => {
    const res = await request(app)
      .post('/api/game/123/move')
      .set('Cookie', createCookie('user123'))
      .send({ mode: 'multiplayer' });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Move is required');
  });

  it('should return gateway health status', async () => {
    const res = await request(app).get('/health');

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('Gateway Service is running');
  });
});
});

function createCookieExtra(userId = 'testUser') {
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

  const isolatedApp = require('./gateway-service');
  const isolatedAxios = require('axios');
  const { Server } = require('socket.io');

  return { isolatedApp, isolatedAxios, MockSocketServer: Server };
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

describe('Gateway Service extra coverage merged', () => {
  let isolatedApp;
  let isolatedAxios;
  let MockSocketServer;

  beforeEach(() => {
    ({ isolatedApp, isolatedAxios, MockSocketServer } = loadGatewayWithMocks());
    jest.clearAllMocks();
  });

  it('rejects disallowed CORS origins', async () => {
    const res = await request(isolatedApp)
      .get('/metrics')
      .set('Origin', 'http://evil.example');

    expect(res.statusCode).toBe(500);
  });

  it('returns game history successfully', async () => {
    isolatedAxios.get.mockResolvedValueOnce({
      data: [{ id: 'game1', winner: 'user1' }],
    });

    const res = await request(isolatedApp)
      .get('/api/game/history')
      .set('Cookie', createCookieExtra('user1'));

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual([{ id: 'game1', winner: 'user1' }]);
  });

  it('returns update avatar service errors', async () => {
    isolatedAxios.post.mockRejectedValueOnce({
      response: { status: 404, data: { error: 'User not found' } },
    });

    const res = await request(isolatedApp)
      .post('/api/user/updateAvatar')
      .set('Cookie', createCookieExtra('user1'))
      .send({});

    expect(res.statusCode).toBe(404);
    expect(res.body.error).toBe('User not found');
  });

  it('returns generic avatar update error without response', async () => {
    isolatedAxios.post.mockRejectedValueOnce(new Error('avatar fail'));

    const res = await request(isolatedApp)
      .post('/api/user/updateAvatar')
      .set('Cookie', createCookieExtra('user1'))
      .send({});

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe('Internal error');
  });

  it('uses default values when starting a game without body options', async () => {
    isolatedAxios.post.mockResolvedValueOnce({
      data: { gameId: 'g-default' },
    });

    const res = await request(isolatedApp)
      .post('/api/game/start')
      .set('Cookie', createCookieExtra('user1'))
      .send({});

    expect(res.statusCode).toBe(200);
    expect(isolatedAxios.post).toHaveBeenCalledWith(
      expect.stringContaining('/api/game/start'),
      expect.objectContaining({
        userId: 'user1',
        gameMode: 'vsBot',
        botMode: 'random_bot',
        boardSize: 11,
        startingPlayer: 'j1',
        boardVariant: 'classic',
      })
    );
  });

  it('returns generic game bot modes error without response', async () => {
    isolatedAxios.get.mockRejectedValueOnce(new Error('bot modes down'));

    const res = await request(isolatedApp).get('/api/game/bot-modes');

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe('Error obteniendo modos de bot');
  });

  it('returns move errors when the game service fails without response', async () => {
    isolatedAxios.post.mockRejectedValueOnce(new Error('Network move fail'));

    const res = await request(isolatedApp)
      .post('/api/game/game123/move')
      .set('Cookie', createCookieExtra('user1'))
      .send({ move: '(1,1,1)', mode: 'vsBot' });

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe('Network move fail');
  });

  it('sends vsBot move without move field when not provided', async () => {
    isolatedAxios.post.mockResolvedValueOnce({ data: { ok: true } });

    const res = await request(isolatedApp)
      .post('/api/game/game123/move')
      .set('Cookie', createCookieExtra('user1'))
      .send({ mode: 'vsBot' });

    expect(res.statusCode).toBe(200);
    expect(isolatedAxios.post).toHaveBeenCalledWith(
      expect.stringContaining('/vsBot/move'),
      { userId: 'user1', mode: 'vsBot', role: 'j2' }
    );
  });

  it('returns internal server error when move fails with a plain object', async () => {
    isolatedAxios.post.mockRejectedValueOnce({});

    const res = await request(isolatedApp)
      .post('/api/game/game123/move')
      .set('Cookie', createCookieExtra('user1'))
      .send({ move: '(1,1,1)', mode: 'multiplayer' });

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe('Internal server error');
  });

  it('enriches missing receiver data in friend requests', async () => {
    isolatedAxios.get.mockResolvedValueOnce({
      data: [{
        _id: 'r1',
        status: 'pending',
        createdAt: 'now',
        sender: { _id: 'sender1', username: 'sender', email: 'sender@mail.com' },
        receiver: { _id: 'receiver1' },
      }],
    });
    isolatedAxios.post.mockResolvedValueOnce({
      data: { username: 'receiver', email: 'receiver@mail.com' },
    });

    const res = await request(isolatedApp)
      .get('/api/friends/requests')
      .set('Cookie', createCookieExtra('user1'))
      .query({ type: 'received' });

    expect(res.statusCode).toBe(200);
    expect(res.body[0].receiver).toEqual({
      _id: 'receiver1',
      username: 'receiver',
      email: 'receiver@mail.com',
    });
  });

  it('returns 500 when friend request retrieval fails', async () => {
    isolatedAxios.get.mockRejectedValueOnce(new Error('Friend service down'));

    const res = await request(isolatedApp)
      .get('/api/friends/requests')
      .set('Cookie', createCookieExtra('user1'))
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
    jest.spyOn(isolatedApp, 'listen').mockImplementation((port, callback) => {
      if (callback) callback();
      return fakeHttpServer;
    });

    const server = isolatedApp.startServer();

    expect(server).toBe(fakeHttpServer);
    expect(isolatedApp.listen).toHaveBeenCalledWith(8000, expect.any(Function));

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
    socket3.handlers.join_room({ code: createdRoom });
    expect(socket3.emit).toHaveBeenCalledWith('room_error', { message: 'Sala llena' });

    socket2.handlers.disconnect();
    socket2.handlers.rejoin_room({ code: createdRoom, role: 'j2' });
    socket1.handlers.player_info({ code: createdRoom, name: 'Alice', avatar: 'alice.png' });
    socket2.handlers.rejoin_room({ code: createdRoom, role: 'j2' });
    socket1.handlers.game_started({ code: createdRoom, gameId: 'game-1' });
    socket2.handlers.rejoin_room({ code: createdRoom, role: 'j2' });
    socket1.handlers.move_made({ code: createdRoom, position: '(1,1)', turn: 'j2' });
    socket1.handlers.game_over({ code: createdRoom, winner: 'j1' });
    socket4.handlers.create_room({ boardSize: 13 });
    socket4.handlers.disconnect();
    socket1.handlers.disconnect();

    expect(socket1.roomEmitter.emit).toHaveBeenCalledWith('opponent_disconnected');
  });

  it('covers additional websocket branches for j1 rejoin and transition cleanup', () => {
    const fakeHttpServer = { close: jest.fn() };
    let connectionHandler;

    const roomEmitters = new Map();
    const ioInstance = {
      on: jest.fn((event, handler) => {
        if (event === 'connection') {
          connectionHandler = handler;
        }
      }),
      to: jest.fn((target) => {
        if (!roomEmitters.has(target)) {
          roomEmitters.set(target, { emit: jest.fn() });
        }
        return roomEmitters.get(target);
      }),
    };

    MockSocketServer.mockImplementation(() => ioInstance);
    jest.spyOn(isolatedApp, 'listen').mockImplementation((port, callback) => {
      if (callback) callback();
      return fakeHttpServer;
    });

    isolatedApp.startServer();

    const socket1 = createMockSocket('j1-socket');
    const socket2 = createMockSocket('j2-socket');
    connectionHandler(socket1);
    connectionHandler(socket2);

    socket1.handlers.create_room({ boardSize: 9, startingPlayer: 'j2' });
    const roomCode = socket1.emit.mock.calls.find(([event]) => event === 'room_created')[1].code;

    socket2.handlers.join_room({ code: roomCode });
    socket1.handlers.rejoin_room({ code: 'missing', role: 'j1' });
    socket1.handlers.player_info({ code: 'missing', name: 'Ghost', avatar: 'ghost.png' });
    socket1.handlers.game_started({ code: 'missing', gameId: 'g-missing' });
    socket1.handlers.player_info({ code: roomCode, name: 'Alice', avatar: 'alice.png' });
    socket1.handlers.rejoin_room({ code: roomCode, role: 'j1' });
    socket1.handlers.disconnect();
    socket2.handlers.disconnect();

    expect(roomEmitters.get('j1-socket').emit).toHaveBeenCalledWith(
      'your_role',
      expect.objectContaining({ role: 'j1', startingPlayer: 'j2', boardSize: 9 })
    );
    expect(roomEmitters.get('j2-socket').emit).toHaveBeenCalledWith('opponent_info', {
      name: 'Alice',
      avatar: 'alice.png',
    });
  });
});
