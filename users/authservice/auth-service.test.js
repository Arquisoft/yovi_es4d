const request = require('supertest');

jest.mock('mongoose', () => ({
  connect: jest.fn(),
  connection: {
    close: jest.fn(),
  },
}));

jest.mock('./auth-model', () => ({
  findOne: jest.fn(),
}));

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(),
}));

const mongoose = require('mongoose');
const User = require('./auth-model');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = require('./auth-service');

describe('Auth Service', () => {
  const user = {
    _id: 'user-123',
    email: 'testuser@example.com',
    password: 'hashed-password',
    createdAt: '2026-04-05T10:00:00.000Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    app.__failedAttempts.clear();
    jwt.sign.mockReturnValue('signed-token');
  });

  it('logs in successfully', async () => {
    User.findOne.mockResolvedValue(user);
    bcrypt.compare.mockResolvedValue(true);

    const response = await request(app)
      .post('/login')
      .send({ email: user.email, password: 'Password123' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      email: user.email,
      createdAt: user.createdAt,
      id: user._id,
    });
    expect(jwt.sign).toHaveBeenCalledWith(
      { userId: user._id },
      expect.any(String),
      { expiresIn: '1h' }
    );
    expect(response.headers['set-cookie']).toBeDefined();
  });

  it('fails login with wrong password', async () => {
    User.findOne.mockResolvedValue(user);
    bcrypt.compare.mockResolvedValue(false);

    const response = await request(app)
      .post('/login')
      .send({ email: user.email, password: 'wrongPassword' });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Invalid credentials');
  });

  it('fails login with non-existent email', async () => {
    User.findOne.mockResolvedValue(null);

    const response = await request(app)
      .post('/login')
      .send({ email: 'wrong@example.com', password: 'Password123' });

    expect(response.status).toBe(500);
    expect(response.body.error).toBe('Internal Server Error');
  });

  it('fails login with missing fields', async () => {
    const response = await request(app)
      .post('/login')
      .send({ email: user.email });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Invalid value');
  });

  it('fails login if validation fails', async () => {
    const response = await request(app)
      .post('/login')
      .send({ email: 'a', password: 'b' });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Invalid value');
  });

  it('blocks login after too many failed attempts', async () => {
    User.findOne.mockResolvedValue(user);
    bcrypt.compare.mockResolvedValue(false);

    for (let i = 0; i < 5; i += 1) {
      await request(app)
        .post('/login')
        .send({ email: user.email, password: 'wrongPassword' });
    }

    const response = await request(app)
      .post('/login')
      .send({ email: user.email, password: 'wrongPassword' });

    expect(response.status).toBe(429);
    expect(response.body.error).toBe('Too many login attempts, please try again later');
  });

  it('clears failed attempts after a successful login', async () => {
    User.findOne.mockResolvedValue(user);
    bcrypt.compare
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);

    await request(app)
      .post('/login')
      .send({ email: user.email, password: 'wrongPassword' });

    expect(app.__failedAttempts.size).toBe(1);

    const response = await request(app)
      .post('/login')
      .send({ email: user.email, password: 'Password123' });

    expect(response.status).toBe(200);
    expect(app.__failedAttempts.size).toBe(0);
  });

  it('handles internal errors during login', async () => {
    User.findOne.mockRejectedValue(new Error('DB error'));

    const response = await request(app)
      .post('/login')
      .send({ email: user.email, password: 'Password123' });

    expect(response.status).toBe(500);
    expect(response.body.error).toBe('Internal Server Error');
  });

  it('logs out successfully', async () => {
    const response = await request(app).post('/logout');

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Logged out');
    expect(response.headers['set-cookie']).toEqual(
      expect.arrayContaining([expect.stringContaining('token=;')])
    );
  });

  it('starts the server and closes mongoose connection on shutdown', () => {
    const fakeServer = {
      on: jest.fn((event, handler) => {
        if (event === 'close') {
          handler();
        }
      }),
    };

    jest.spyOn(app, 'listen').mockImplementation((port, callback) => {
      if (callback) callback();
      return fakeServer;
    });

    const server = app.startServer();

    expect(server).toBe(fakeServer);
    expect(app.listen).toHaveBeenCalledWith(8002, expect.any(Function));
    expect(mongoose.connection.close).toHaveBeenCalled();
  });

  it('throws when a required field is missing in the helper', () => {
    expect(() => app.__validateRequiredFields({ body: {} }, ['email']))
      .toThrow('Missing required field: email');
  });
});
