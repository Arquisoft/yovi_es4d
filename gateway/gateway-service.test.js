const request = require('supertest');
const axios = require('axios');
const jwt = require('jsonwebtoken');

const server = require('./gateway-service');

const privateKey = process.env.TOKEN_SECRET_KEY ||  'mi_clave_secreta';

jest.mock('axios');

afterAll(async () => {
  server.close();
});

describe('Gateway Service', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createCookie = (userId = 'testUser') => {
    const token = jwt.sign({ userId }, privateKey);
    return `token=${token}`;
  };

  it('should login and forward cookie', async () => {

    axios.post.mockResolvedValue({
      data: { success: true },
      headers: { 'set-cookie': ['token=faketoken'] }
    });

    const res = await request(server)
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

  const res = await request(server)
    .post('/login')
    .send({ email: 'a', password: 'b' });

  expect(res.statusCode).toBe(200);
  expect(res.body.result).toBe('ok');

});

it('login internal error should return 500', async () => {

  jest.spyOn(axios, 'post').mockRejectedValue({
    message: 'network error'
  });

  const res = await request(server)
    .post('/login')
    .send({ email: 'a', password: 'b' });

  expect(res.statusCode).toBe(500);
  expect(res.body.error).toBe('Login error');

});
  it('should handle login error', async () => {

    axios.post.mockRejectedValue({
      response: { status: 401, data: { error: 'Invalid credentials' } }
    });

    const res = await request(server)
      .post('/login')
      .send({ username: 'u', password: 'p' });

    expect(res.statusCode).toBe(401);
    expect(res.body.error).toBe('Invalid credentials');
  });

  it('should add user', async () => {

    axios.post.mockResolvedValue({
      data: { userId: '123' }
    });

    const res = await request(server)
      .post('/adduser')
      .send({ username: 'newuser', password: 'pass' });

    expect(res.statusCode).toBe(200);
    expect(res.body.userId).toBe('123');
  });

  it('should handle internal error in adduser', async () => {
  // Forzamos que axios post lance un error sin response
  jest.spyOn(axios, 'post').mockRejectedValue(new Error('Unexpected failure'));

  const res = await request(server)
    .post('/adduser')
    .send({ username: 'testuser', password: 'pass' });

  expect(res.statusCode).toBe(500);  // deberías manejar el 500 en tu catch
  expect(res.body.error).toBe('Unexpected failure');
});

  it('should edit username with valid cookie', async () => {

    axios.post.mockResolvedValue({
      data: { result: 'updated' }
    });

    const res = await request(server)
      .post('/api/user/editUsername')
      .set('Cookie', createCookie())
      .send({ username: 'newName' });

    expect(res.statusCode).toBe(200);
    expect(res.body.result).toBe('updated');
  });

  it('should edit username with invalid cookie', async () => {

  const res = await request(server)
    .post('/api/user/editUsername')
    .set('Cookie', 'token=invalidtoken')
    .send({ username: 'newName' });

  expect(res.statusCode).toBe(401);
  expect(res.body.message).toBe('Token inválido');

});

  it('should return 401 if cookie missing', async () => {

    const res = await request(server)
      .post('/api/user/editUsername')
      .send({ username: 'name' });

    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe('No autenticado');
  });

  it('should return 400 if username missing', async () => {
  const token = jwt.sign({ userId: 'user123' }, privateKey); // token válido

  const res = await request(server)
    .post('/api/user/editUsername')
    .set('Cookie', [`token=${token}`]) // enviamos token válido
    .send({ }); // sin username

  expect(res.statusCode).toBe(400);
  expect(res.body.error).toBe('Missing userId or username'); // coincide con tu código
});

  it('should return 401 if token is invalid', async () => {
  const res = await request(server)
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

  const res = await request(server)
    .post('/api/user/editUsername')
    .set('Cookie', [`token=${token}`])
    .send({ username: 'newName' });

  expect(res.statusCode).toBe(500);
  expect(res.body.error).toBe('Internal error');

  axios.post.mockRestore();
});

  it("should return 401 when token is invalid", async () => {

  const res = await request(server)
    .get("/api/auth/me")
    .set("Cookie", "token=tokenInvalido");

  expect(res.statusCode).toBe(401);
  expect(res.body.message).toBe("Token inválido");

});

  it('should change password', async () => {

    axios.post.mockResolvedValue({
      data: { success: true }
    });

    const res = await request(server)
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

  const res = await request(server)
    .post('/api/user/changePassword')
    .set('Cookie', [`token=${token}`])
    .send({ currentPassword: 'old', newPassword: 'new' });

  expect(res.statusCode).toBe(500);
  expect(res.body.error).toBe('Internal error');

  axios.post.mockRestore();
});

it('should return 400 if changePassword fields are missing', async () => {
  const token = jwt.sign({ userId: 'user123' }, privateKey);

  const res = await request(server)
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

    const res = await request(server)
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

  const res = await request(server)
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

  const res = await request(server)
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

  const res = await request(server)
    .post('/api/game/game123/validateMove')
    .set('Cookie', createCookie('user1')) // ← Cookie válida
    .send({ move: 'A1', userId: 'user1', role: 'player' });

  expect(res.statusCode).toBe(200);
  expect(res.body.valid).toBe(true);
});

it('should return 400 if validateMove service fails', async () => {
  const gameId = 'game123';
  jest.spyOn(axios, 'post').mockRejectedValue(new Error('Invalid move'));

  const res = await request(server)
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

  const res = await request(server)
    .post('/api/game/123/validateMove')
    .set('Cookie', createCookie('user123')) // ← Cookie válida
    .send({ move: 'A1', userId: 'user123', role: 'X' });

  expect(res.statusCode).toBe(400);
  expect(res.body.error).toBe('Move not allowed');
});

it('should perform move vsBot', async () => {
  axios.post.mockResolvedValue({ data: { board: [] } });

  const res = await request(server)
    .post('/api/game/game123/move')
    .set('Cookie', createCookie('user1')) // ← Cookie válida
    .send({ move: 'A1', userId: 'user1', mode: 'vsBot' });

  expect(res.statusCode).toBe(200);
  expect(res.body.board).toBeDefined();
});

it('should reject invalid mode', async () => {
  const res = await request(server)
    .post('/api/game/game123/move')
    .set('Cookie', createCookie('user1')) // ← Cookie válida
    .send({ move: 'A1', userId: 'user1', mode: 'invalid' });

  expect(res.statusCode).toBe(400);
  expect(res.body.error).toBe('Invalid game mode');
});

it('should return 400 for invalid game mode', async () => {
  const res = await request(server)
    .post('/api/game/123/move')
    .set('Cookie', createCookie('user123')) // ← Cookie válida
    .send({ move: 'A1', userId: 'user123', mode: 'invalidMode', role: 'X' });

  expect(res.statusCode).toBe(400);
  expect(res.body.error).toBe('Invalid game mode');
});

it('should return 400 if move or userId is missing', async () => {
  const res = await request(server)
    .post('/api/game/123/move')
    .set('Cookie', createCookie('user123')) // ← Cookie válida
    .send({ mode: 'vsBot' }); // sin move ni userId

  expect(res.statusCode).toBe(400);
  expect(res.body.error).toBe('Move and userId are required');
});

it('should call multiplayer endpoint for mode=multiplayer', async () => {
  const gameId = 'game123';
  jest.spyOn(axios, 'post').mockResolvedValueOnce({ data: { success: true } });

  const res = await request(server)
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

    const res = await request(server)
      .get('/api/game/game123')
      .set('Cookie', createCookie());

    expect(res.statusCode).toBe(200);
    expect(res.body.board).toBeDefined();
  });
  it('should return 500 if get game state service fails', async () => {
  const token = jwt.sign({ userId: 'user123' }, privateKey);
  const gameId = 'game123';

  jest.spyOn(axios, 'get').mockRejectedValue(new Error('Service unavailable'));

  const res = await request(server)
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

    const res = await request(server)
      .post('/api/game/end')
      .set('Cookie', createCookie())
      .send({ gameId: 'game123' });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
  it('should return 500 if end game service fails', async () => {
  const token = jwt.sign({ userId: 'user123' }, privateKey);

  jest.spyOn(axios, 'post').mockRejectedValue(new Error('Cannot end game'));

  const res = await request(server)
    .post('/api/game/end')
    .set('Cookie', [`token=${token}`])
    .send({ gameId: 'game123' });

  expect(res.statusCode).toBe(500);
  expect(res.body.error).toBe('Error finalizando juego');

  axios.post.mockRestore();
});

  it('should get auth user', async () => {

    const res = await request(server)
      .get('/api/auth/me')
      .set('Cookie', createCookie('userABC'));

    expect(res.statusCode).toBe(200);
    expect(res.body.userId).toBe('userABC');
  });

  it('should get user profile', async () => {

    axios.post.mockResolvedValue({
      data: { username: 'test' }
    });

    const res = await request(server)
      .post('/api/user/getUserProfile')
      .set('Cookie', createCookie());

    expect(res.statusCode).toBe(200);
    expect(res.body.username).toBe('test');
  });

  it('should return 401 if no token is provided', async () => {
  const res = await request(server)
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

  const res = await request(server)
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

    const res = await request(server)
      .post('/logout');

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('should return 500 if logout service fails', async () => {
  // Mockeamos axios.post para que falle
  jest.spyOn(axios, 'post').mockRejectedValue(new Error('Service unavailable'));

  const res = await request(server).post('/logout').send({});

  expect(res.statusCode).toBe(500);
  expect(res.body.error).toBe('Logout error');

  axios.post.mockRestore();
});

it('should return 500 if getUserProfile fails', async () => {
  jest.spyOn(axios, 'post').mockRejectedValue(new Error('Service down'));

  const res = await request(server)
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

  const res = await request(server)
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

  const res = await request(server)
    .get('/api/friends')
    .set('Cookie', createCookie('user1'))
    .query({ search: 'a', page: 1 })
    .send({ userId: 'user1' });

  expect(res.statusCode).toBe(200);
  expect(res.body).toEqual([{ name: 'friend1' }]);
});

it('should handle error getting friends', async () => {
  axios.get.mockRejectedValue({ response: { status: 500, data: { error: 'fail' } } });

  const res = await request(server)
    .get('/api/friends')
    .set('Cookie', createCookie())
    .send({ userId: 'user1' });

  expect(res.statusCode).toBe(500);
  expect(res.body.error).toBe('fail');
});

it('should explore users', async () => {
  axios.get.mockResolvedValue({ data: [{ username: 'userX' }] });

  const res = await request(server)
    .get('/api/friends/explore')
    .set('Cookie', createCookie('user1'))
    .query({ search: 'u', page: 2 })
    .send({ userId: 'user1' });

  expect(res.statusCode).toBe(200);
  expect(res.body).toEqual([{ username: 'userX' }]);
});

it('should send friend request', async () => {
  axios.post.mockResolvedValue({ data: { success: true } });

  const res = await request(server)
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

  const res = await request(server)
    .get('/api/friends/requests')
    .set('Cookie', createCookie('user1'))
    .query({ type: 'received' })
    .send({ userId: 'user1' });

  expect(res.statusCode).toBe(200);
  expect(res.body[0].sender.username).toBe('userA');
});

it('should accept friend request', async () => {
  axios.patch.mockResolvedValue({ data: { success: true } });

  const res = await request(server)
    .patch('/api/friends/accept')
    .set('Cookie', createCookie('user1'))
    .send({ requestId: 'r1', userId: 'user1' });

  expect(res.statusCode).toBe(200);
  expect(res.body.success).toBe(true);
});

it('should reject friend request', async () => {
  axios.patch.mockResolvedValue({ data: { success: true } });

  const res = await request(server)
    .patch('/api/friends/reject')
    .set('Cookie', createCookie('user1'))
    .send({ requestId: 'r1' });

  expect(res.statusCode).toBe(200);
  expect(res.body.success).toBe(true);
});

it('should cancel friend request', async () => {
  axios.delete.mockResolvedValue({ data: { success: true } });

  const res = await request(server)
    .delete('/api/friends/request/r1')
    .set('Cookie', createCookie('user1'))
    .send({ userId: 'user1' });

  expect(res.statusCode).toBe(200);
  expect(res.body.success).toBe(true);
});

it('should get notifications', async () => {
  axios.get.mockResolvedValue({ data: { notifications: ['n1'] } });

  const res = await request(server)
    .get('/api/notifications')
    .set('Cookie', createCookie('user1'))
    .query({ page: 1 })
    .send({ userId: 'user1' });

  expect(res.statusCode).toBe(200);
  expect(res.body.notifications).toEqual(['n1']);
});

it('should mark all notifications as read', async () => {
  axios.patch.mockResolvedValue({ data: { success: true } });

  const res = await request(server)
    .patch('/api/notifications/read-all')
    .set('Cookie', createCookie('user1'))
    .send({ userId: 'user1' });

  expect(res.statusCode).toBe(200);
  expect(res.body.success).toBe(true);
});

it('should send game invite notification', async () => {
  axios.post.mockResolvedValue({ data: { success: true } });

  const res = await request(server)
    .post('/api/notifications/game-invite')
    .set('Cookie', createCookie('user1'))
    .send({ receiverId: 'user2', userId: 'user1' });

  expect(res.statusCode).toBe(200);
  expect(res.body.success).toBe(true);
});

it('should return 500 if friend service get friends fails without response', async () => {
  axios.get.mockRejectedValue(new Error('Network error'));

  const res = await request(server)
    .get('/api/friends')
    .set('Cookie', createCookie())
    .send({ userId: 'user1' });

  expect(res.statusCode).toBe(500);
  expect(res.body.error).toBe('Error obteniendo amigos');
});

it('should return 500 if friend service explore fails without response', async () => {
  axios.get.mockRejectedValue(new Error('Network error'));

  const res = await request(server)
    .get('/api/friends/explore')
    .set('Cookie', createCookie())
    .send({ userId: 'user1' });

  expect(res.statusCode).toBe(500);
  expect(res.body.error).toBe('Error explorando usuarios');
});

it('should return 500 if sending friend request fails', async () => {
  axios.post.mockRejectedValue(new Error('Network error'));

  const res = await request(server)
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

  const res = await request(server)
    .get('/api/friends/requests')
    .set('Cookie', createCookie('user1'))
    .query({ type: 'received' })
    .send({ userId: 'user1' });

  expect(res.statusCode).toBe(200);
  expect(res.body[0].sender.email).toBe(''); // fallback
  expect(res.body[0].receiver.email).toBe(''); // fallback
});

it('should return 400 if accept friend request missing params', async () => {
  const res = await request(server)
    .patch('/api/friends/accept')
    .set('Cookie', createCookie('user1'))
    .send({}); // sin requestId ni userId

  expect(res.statusCode).toBe(400);
  expect(res.body.error).toBe('Faltan parámetros');
});

it('should return 500 if accepting friend request fails', async () => {
  axios.patch.mockRejectedValue(new Error('Friend service fail'));

  const res = await request(server)
    .patch('/api/friends/accept')
    .set('Cookie', createCookie('user1'))
    .send({ requestId: 'r1', userId: 'user1' });

  expect(res.statusCode).toBe(500);
  expect(res.body.error).toBe('Internal error');
});

it('should return 500 if rejecting friend request fails', async () => {
  axios.patch.mockRejectedValue(new Error('Friend service fail'));

  const res = await request(server)
    .patch('/api/friends/reject')
    .set('Cookie', createCookie('user1'))
    .send({ requestId: 'r1' });

  expect(res.statusCode).toBe(500);
  expect(res.body.error).toBe('Error rechazando solicitud');
});

it('should return 500 if cancelling friend request fails', async () => {
  axios.delete.mockRejectedValue(new Error('Friend service fail'));

  const res = await request(server)
    .delete('/api/friends/request/r1')
    .set('Cookie', createCookie('user1'))
    .send({ userId: 'user1' });

  expect(res.statusCode).toBe(500);
  expect(res.body.error).toBe('Error cancelando solicitud');
});

it('should return 500 if getting notifications fails', async () => {
  axios.get.mockRejectedValue(new Error('Notification service fail'));

  const res = await request(server)
    .get('/api/notifications')
    .set('Cookie', createCookie('user1'))
    .send({ userId: 'user1' });

  expect(res.statusCode).toBe(500);
  expect(res.body.error).toBe('Error obteniendo notificaciones');
});

it('should return 500 if marking all notifications as read fails', async () => {
  axios.patch.mockRejectedValue(new Error('Notification service fail'));

  const res = await request(server)
    .patch('/api/notifications/read-all')
    .set('Cookie', createCookie('user1'))
    .send({ userId: 'user1' });

  expect(res.statusCode).toBe(500);
  expect(res.body.error).toBe('Error actualizando notificaciones');
});

it('should return 500 if sending game invite notification fails', async () => {
  axios.post.mockRejectedValue(new Error('Notification service fail'));

  const res = await request(server)
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

  // ================= JWT MIDDLEWARE =================
  it('should reject request without token', async () => {
    const res = await request(server).get('/api/game/history');
    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe('No autenticado');
  });

  it('should reject request with invalid token', async () => {
    const res = await request(server)
      .get('/api/game/history')
      .set('Cookie', 'token=invalidtoken');
    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe('Token inválido');
  });

  // ================= CORS: origen no permitido (línea 61) =================
  it('should reject request from disallowed origin', async () => {
    const res = await request(server)
      .get('/api/auth/me')
      .set('Origin', 'http://evil.com')
      .set('Cookie', createCookie());
    expect([403, 500]).toContain(res.statusCode);
  });

  // ================= /api/game/history happy path (línea 123) =================
  it('should return game history', async () => {
    axios.get.mockResolvedValue({ data: [{ gameId: 'g1' }] });
    const res = await request(server)
      .get('/api/game/history')
      .set('Cookie', createCookie('user1'));
    expect(res.statusCode).toBe(200);
    expect(res.body[0].gameId).toBe('g1');
  });

  it('should return 500 if game history service fails', async () => {
    axios.get.mockRejectedValue(new Error('Service down'));
    const res = await request(server)
      .get('/api/game/history')
      .set('Cookie', createCookie('user1'));
    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe('Service down');
  });

  // ================= /api/user/updateAvatar (líneas 149-166) =================
  it('should update avatar successfully', async () => {
    axios.post.mockResolvedValue({ data: { avatar: 'new.png' } });
    const res = await request(server)
      .post('/api/user/updateAvatar')
      .set('Cookie', createCookie('user1'));
    expect(res.statusCode).toBe(200);
    expect(res.body.avatar).toBe('new.png');
  });

  it('should return 500 if updateAvatar service fails', async () => {
    axios.post.mockRejectedValue(new Error('Avatar service down'));
    const res = await request(server)
      .post('/api/user/updateAvatar')
      .set('Cookie', createCookie('user1'));
    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe('Internal error');
  });

  it('should return 401 if updateAvatar called without token', async () => {
    const res = await request(server).post('/api/user/updateAvatar');
    expect(res.statusCode).toBe(401);
  });

  // ================= /api/game/:gameId/move catch (líneas 508-509) =================
  it('should return 500 if move service fails', async () => {
    axios.post.mockRejectedValue(new Error('Move service down'));
    const res = await request(server)
      .post('/api/game/game123/move')
      .set('Cookie', createCookie('user1'))
      .send({ move: 'A1', userId: 'user1', mode: 'vsBot' });
    expect(res.statusCode).toBe(500);
  });

  // ================= /api/user/getUserProfile =================
  it('should return 401 if getUserProfile without token', async () => {
    const res = await request(server).post('/api/user/getUserProfile');
    expect(res.statusCode).toBe(401);
    expect(res.body.error).toBe('Not authenticated');
  });

  // ================= /api/friends/requests receiver sin email (líneas 647-648) =================
  it('should enrich receiver data when receiver lacks email/username', async () => {
    axios.get.mockResolvedValue({
      data: [{
        _id: 'r1',
        status: 'pending',
        createdAt: 'now',
        sender: { _id: 's1', email: 'sender@test.com', username: 'senderUser' },
        receiver: { _id: 'r2' } // sin email ni username
      }]
    });
    axios.post.mockResolvedValue({ data: { username: 'receiverUser', email: 'receiver@test.com' } });

    const res = await request(server)
      .get('/api/friends/requests')
      .set('Cookie', createCookie('user1'))
      .query({ type: 'sent' });

    expect(res.statusCode).toBe(200);
    expect(res.body[0].receiver.username).toBe('receiverUser');
  });

  // ================= /api/friends/requests catch (líneas 672-673) =================
  it('should return 500 if friend requests service fails', async () => {
    axios.get.mockRejectedValue(new Error('Friend service down'));
    const res = await request(server)
      .get('/api/friends/requests')
      .set('Cookie', createCookie('user1'));
    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe('Error obteniendo solicitudes');
  });

  // ================= /api/friends/requests fallback =================
  it('should fallback emails if user-service fails', async () => {
    axios.get.mockResolvedValue({
      data: [{ _id: 'r1', status: 'pending', createdAt: 'now', sender: { _id: 's1' }, receiver: { _id: 'r2' } }]
    });
    axios.post.mockRejectedValue(new Error('User service down'));

    const res = await request(server)
      .get('/api/friends/requests')
      .set('Cookie', createCookie('user1'))
      .query({ type: 'received' });

    expect(res.statusCode).toBe(200);
    expect(res.body[0].sender.email).toBe('');
    expect(res.body[0].receiver.email).toBe('');
  });

  // ================= /api/friends/reject catch =================
  it('should return 500 if reject request fails', async () => {
    axios.patch.mockRejectedValue(new Error('Friend service fail'));
    const res = await request(server)
      .patch('/api/friends/reject')
      .set('Cookie', createCookie('user1'))
      .send({ requestId: 'r1' });
    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe('Error rechazando solicitud');
  });
});

// =========================
// TESTS WEBSOCKETS (líneas 805-924)
// =========================
describe('Gateway Service - WebSockets', () => {
  const { io: ioClient } = require('socket.io-client');
  let client1, client2;

  beforeEach((done) => {
    jest.clearAllMocks();
    const addr = server.address();
    const url = `http://localhost:${addr.port}`;
    client1 = ioClient(url, { forceNew: true, transports: ['websocket'] });
    client1.on('connect', done);
  });

  afterEach((done) => {
    if (client1?.connected) client1.disconnect();
    if (client2?.connected) client2.disconnect();
    setTimeout(done, 50);
  });

  it('create_room: emite room_created con un código', (done) => {
    client1.emit('create_room', { boardSize: 11 });
    client1.on('room_created', ({ code }) => {
      expect(typeof code).toBe('string');
      expect(code.length).toBe(4);
      done();
    });
  });

  it('join_room: sala no encontrada emite room_error', (done) => {
    client1.emit('join_room', { code: 'XXXX' });
    client1.on('room_error', ({ message }) => {
      expect(message).toBe('Sala no encontrada');
      done();
    });
  });

  it('join_room: sala llena emite room_error', (done) => {
    const addr = server.address();
    const url = `http://localhost:${addr.port}`;

    client1.emit('create_room', { boardSize: 11 });
    client1.on('room_created', ({ code }) => {
      client2 = ioClient(url, { forceNew: true, transports: ['websocket'] });
      client2.on('connect', () => {
        // Un tercer cliente intenta entrar a la sala ya llena
        const client3 = ioClient(url, { forceNew: true, transports: ['websocket'] });
        client3.on('connect', () => {
          // Primero llenamos la sala con client2
          client2.emit('join_room', { code });
          client2.on('your_role', () => {
            // Ahora client3 intenta unirse a sala llena
            client3.emit('join_room', { code });
            client3.on('room_error', ({ message }) => {
              expect(message).toBe('Sala llena');
              client3.disconnect();
              done();
            });
          });
        });
      });
    });
  });

  it('join_room: asigna roles j1 y j2 correctamente', (done) => {
    const addr = server.address();
    const url = `http://localhost:${addr.port}`;
    let rolesReceived = 0;

    client1.emit('create_room', { boardSize: 11 });
    client1.on('room_created', ({ code }) => {
      client2 = ioClient(url, { forceNew: true, transports: ['websocket'] });
      client2.on('connect', () => {
        client2.emit('join_room', { code });
      });

      client1.on('your_role', ({ role }) => {
        expect(role).toBe('j1');
        rolesReceived++;
        if (rolesReceived === 2) done();
      });
      client2.on('your_role', ({ role }) => {
        expect(role).toBe('j2');
        rolesReceived++;
        if (rolesReceived === 2) done();
      });
    });
  });

  it('rejoin_room: sala inexistente no falla', (done) => {
    client1.emit('rejoin_room', { code: 'ZZZZ', role: 'j1' });
    setTimeout(done, 100); // no debe fallar
  });

  it('rejoin_room: j2 recibe game_joined si la partida ya empezó', (done) => {
    const addr = server.address();
    const url = `http://localhost:${addr.port}`;

    client1.emit('create_room', { boardSize: 11 });
    client1.on('room_created', ({ code }) => {
      // Simular que j1 inicia la partida
      client1.emit('game_started', { code, gameId: 'game-xyz' });

      client2 = ioClient(url, { forceNew: true, transports: ['websocket'] });
      client2.on('connect', () => {
        client2.emit('rejoin_room', { code, role: 'j2' });
        client2.on('game_joined', ({ gameId }) => {
          expect(gameId).toBe('game-xyz');
          done();
        });
      });
    });
  });

  it('player_info: reenvía perfil al rival si está conectado', (done) => {
    const addr = server.address();
    const url = `http://localhost:${addr.port}`;

    client1.emit('create_room', { boardSize: 11 });
    client1.on('room_created', ({ code }) => {
      client2 = ioClient(url, { forceNew: true, transports: ['websocket'] });
      client2.on('connect', () => {
        client2.emit('join_room', { code });
        client2.on('your_role', () => {
          client1.emit('player_info', { code, name: 'Alice', avatar: 'alice.png' });
          client2.on('opponent_info', ({ name }) => {
            expect(name).toBe('Alice');
            done();
          });
        });
      });
    });
  });

  it('player_info: sala inexistente no falla', (done) => {
    client1.emit('player_info', { code: 'ZZZZ', name: 'Nobody', avatar: 'x.png' });
    setTimeout(done, 100);
  });

  it('rejoin_room: reenvía opponent_info si el rival ya compartió su perfil', (done) => {
    const addr = server.address();
    const url = `http://localhost:${addr.port}`;

    client1.emit('create_room', { boardSize: 11 });
    client1.on('room_created', ({ code }) => {
      // j1 comparte su perfil antes de que j2 se una
      client1.emit('player_info', { code, name: 'Alice', avatar: 'alice.png' });

      client2 = ioClient(url, { forceNew: true, transports: ['websocket'] });
      client2.on('connect', () => {
        client2.emit('rejoin_room', { code, role: 'j2' });
        client2.on('opponent_info', ({ name }) => {
          expect(name).toBe('Alice');
          done();
        });
      });
    });
  });

  it('game_started: notifica a j2 con game_joined', (done) => {
    const addr = server.address();
    const url = `http://localhost:${addr.port}`;

    client1.emit('create_room', { boardSize: 11 });
    client1.on('room_created', ({ code }) => {
      client2 = ioClient(url, { forceNew: true, transports: ['websocket'] });
      client2.on('connect', () => {
        client2.emit('join_room', { code });
        client2.on('your_role', () => {
          client1.emit('game_started', { code, gameId: 'game-abc' });
          client2.on('game_joined', ({ gameId }) => {
            expect(gameId).toBe('game-abc');
            done();
          });
        });
      });
    });
  });

  it('move_made: reenvía el movimiento al rival', (done) => {
    const addr = server.address();
    const url = `http://localhost:${addr.port}`;

    client1.emit('create_room', { boardSize: 11 });
    client1.on('room_created', ({ code }) => {
      client2 = ioClient(url, { forceNew: true, transports: ['websocket'] });
      client2.on('connect', () => {
        client2.emit('join_room', { code });
        client2.on('your_role', () => {
          client1.emit('move_made', { code, position: '0,0', turn: 'j2' });
          client2.on('opponent_move', ({ position, turn }) => {
            expect(position).toBe('0,0');
            expect(turn).toBe('j2');
            done();
          });
        });
      });
    });
  });

  it('game_over: reenvía el ganador al rival', (done) => {
    const addr = server.address();
    const url = `http://localhost:${addr.port}`;

    client1.emit('create_room', { boardSize: 11 });
    client1.on('room_created', ({ code }) => {
      client2 = ioClient(url, { forceNew: true, transports: ['websocket'] });
      client2.on('connect', () => {
        client2.emit('join_room', { code });
        client2.on('your_role', () => {
          client1.emit('game_over', { code, winner: 'j1' });
          client2.on('game_over', ({ winner }) => {
            expect(winner).toBe('j1');
            done();
          });
        });
      });
    });
  });

  it('disconnect: emite opponent_disconnected al rival durante la partida', (done) => {
    const addr = server.address();
    const url = `http://localhost:${addr.port}`;

    client1.emit('create_room', { boardSize: 11 });
    client1.on('room_created', ({ code }) => {
      client2 = ioClient(url, { forceNew: true, transports: ['websocket'] });
      client2.on('connect', () => {
        client2.emit('join_room', { code });
        client2.on('your_role', () => {
          // Desactivar transitioning emitiendo game_started (lo pone a false)
          client1.emit('game_started', { code, gameId: 'game-disc' });
          // Esperar que la sala procese el game_started antes de desconectar
          setTimeout(() => {
            client2.on('opponent_disconnected', () => {
              done();
            });
            client1.disconnect();
          }, 100);
        });
      });
    });
  }, 10000);

  it('disconnect: sala en transitioning no emite opponent_disconnected', (done) => {
    const addr = server.address();
    const url = `http://localhost:${addr.port}`;

    client1.emit('create_room', { boardSize: 11 });
    client1.on('room_created', ({ code }) => {
      client2 = ioClient(url, { forceNew: true, transports: ['websocket'] });
      client2.on('connect', () => {
        client2.emit('join_room', { code }); // activa transitioning
        client2.on('your_role', () => {
          let disconnectReceived = false;
          client2.on('opponent_disconnected', () => {
            disconnectReceived = true;
          });
          client1.disconnect();
          setTimeout(() => {
            expect(disconnectReceived).toBe(false);
            done();
          }, 150);
        });
      });
    });
  });
});
});