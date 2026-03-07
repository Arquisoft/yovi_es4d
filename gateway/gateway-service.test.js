const request = require('supertest');
const axios = require('axios');
const jwt = require('jsonwebtoken');

const server = require('./gateway-service');

const privateKey = process.env.TOKEN_SECRET_KEY || 'your-secret-key';

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
    headers: {}        // ← no set-cookie
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
      .send({
        move: 'A1',
        userId: 'user1',
        role: 'player'
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.valid).toBe(true);
  });

  it('should return 400 if validateMove service fails', async () => {
  const gameId = 'game123';
  // Mockeamos axios.post para que falle
  jest.spyOn(axios, 'post').mockRejectedValue(new Error('Invalid move'));

  const res = await request(server)
    .post(`/api/game/${gameId}/validateMove`)
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
    .send({ move: 'A1', userId: 'user123', role: 'X' });

  expect(res.statusCode).toBe(400);
  expect(res.body.error).toBe('Move not allowed');
});

  it('should perform move vsBot', async () => {

    axios.post.mockResolvedValue({
      data: { board: [] }
    });

    const res = await request(server)
      .post('/api/game/game123/move')
      .send({
        move: 'A1',
        userId: 'user1',
        mode: 'vsBot'
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.board).toBeDefined();
  });

  it('should reject invalid mode', async () => {

    const res = await request(server)
      .post('/api/game/game123/move')
      .send({
        move: 'A1',
        userId: 'user1',
        mode: 'invalid'
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Invalid game mode');
  });

  it('should return 400 for invalid game mode', async () => {
  const res = await request(server)
    .post('/api/game/123/move')
    .send({ move: 'A1', userId: 'user123', mode: 'invalidMode', role: 'X' });

  expect(res.statusCode).toBe(400);
  expect(res.body.error).toBe('Invalid game mode');
});

it('should return 400 if move or userId is missing', async () => {
  const res = await request(server)
    .post('/api/game/123/move')
    .send({ mode: 'vsBot' }); // no move, no userId

  expect(res.statusCode).toBe(400);
  expect(res.body.error).toBe('Move and userId are required');
});

it('should call multiplayer endpoint for mode=multiplayer', async () => {
  const gameId = 'game123';

  // Mock de axios.post para simular respuesta del game-service
  jest.spyOn(axios, 'post').mockResolvedValueOnce({ data: { success: true } });

  const res = await request(server)
    .post(`/api/game/${gameId}/move`)
    .send({
      move: 'A1',
      userId: 'user123',
      mode: 'multiplayer',
      role: 'X'
    });

  expect(res.statusCode).toBe(200);
  expect(res.body).toEqual({ success: true });

  // Restaurar mock
  axios.post.mockRestore();
});

it('should return 500 if backend fails', async () => {
  const gameId = 'game123';

  // Mock para forzar error en axios
  jest.spyOn(axios, 'post').mockRejectedValueOnce(new Error('Backend failed'));

  const res = await request(server)
    .post(`/api/game/${gameId}/move`)
    .send({
      move: 'A1',
      userId: 'user123',
      mode: 'vsBot',
      role: 'X'
    });

  expect(res.statusCode).toBe(500);
  expect(res.body.error).toBe('Backend failed');

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


});