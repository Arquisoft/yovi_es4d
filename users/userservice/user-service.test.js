const request = require('supertest');

jest.mock('mongoose', () => ({
  connect: jest.fn(),
  Types: {
    ObjectId: class MockObjectId {
      constructor(value) {
        this.value = value;
      }

      toString() {
        return this.value;
      }

      static isValid(value) {
        return typeof value === 'string' && /^[a-fA-F0-9]{24}$/.test(value);
      }
    },
  },
  connection: {
    close: jest.fn(),
  },
}));

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

const MockUser = jest.fn(function MockUser(data) {
  Object.assign(this, data);
  this.save = jest.fn().mockResolvedValue(this);
});

MockUser.findOne = jest.fn();
MockUser.findById = jest.fn();
MockUser.findByIdAndUpdate = jest.fn();
MockUser.find = jest.fn();

jest.mock('./user-model', () => MockUser);

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./user-model');
const app = require('./user-service');

function createQueryChain(result) {
  const chain = {
    select: jest.fn(() => chain),
    skip: jest.fn(() => chain),
    limit: jest.fn(() => Promise.resolve(result)),
  };
  return chain;
}

describe('User Service', () => {
  const correctUser = {
    username: 'testuser',
    email: 'test@example.com',
    password: 'Password123',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    bcrypt.hash.mockResolvedValue('hashed-password');
    bcrypt.compare.mockResolvedValue(true);
  });

  it('adds a new user on POST /adduser', async () => {
    User.findOne.mockResolvedValue(null);

    const response = await request(app).post('/adduser').send(correctUser);

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('message', 'User created');
    expect(bcrypt.hash).toHaveBeenCalledWith(correctUser.password, 10);
    expect(User).toHaveBeenCalledWith(expect.objectContaining({
      username: correctUser.username,
      email: correctUser.email,
      password: 'hashed-password',
      avatar: expect.stringContaining(correctUser.email),
    }));
  });

  it('responds with error 400 for insecure password on POST /adduser', async () => {
    const response = await request(app)
      .post('/adduser')
      .send({ ...correctUser, password: 'password' });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Password does not meet requirements');
  });

  it('responds with error 409 when username or email already exists on POST /adduser', async () => {
    User.findOne.mockResolvedValue({ _id: 'existing-user' });

    const response = await request(app).post('/adduser').send(correctUser);

    expect(response.status).toBe(409);
    expect(response.body.error).toBe('Email or username already exists');
  });

  it('responds with error 400 when required fields are missing on POST /adduser', async () => {
    const response = await request(app)
      .post('/adduser')
      .send({ password: 'Password123' });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Missing field: username');
  });

  it('returns 400 if creating the user throws', async () => {
    User.findOne.mockResolvedValue(null);
    bcrypt.hash.mockRejectedValue(new Error('Hash failed'));

    const response = await request(app).post('/adduser').send(correctUser);

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Hash failed');
  });

  it('updates avatar on POST /updateAvatar', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    User.findById.mockResolvedValue({ avatar: '', save });

    const response = await request(app)
      .post('/updateAvatar')
      .send({ userId: 'user-1' });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Avatar updated');
    expect(response.body.avatar).toContain('https://api.dicebear.com/8.x/adventurer/svg?seed=');
    expect(save).toHaveBeenCalled();
  });

  it('returns 404 when updating avatar for a non-existent user', async () => {
    User.findById.mockResolvedValue(null);

    const response = await request(app)
      .post('/updateAvatar')
      .send({ userId: 'missing-user' });

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('User not found');
  });

  it('returns 500 if updateAvatar throws', async () => {
    User.findById.mockRejectedValue(new Error('DB fail'));

    const response = await request(app)
      .post('/updateAvatar')
      .send({ userId: 'user-1' });

    expect(response.status).toBe(500);
    expect(response.body.error).toBe('Internal error');
  });

  it('returns user profile on POST /profile', async () => {
    const chain = {
      select: jest.fn().mockResolvedValue({
        _id: 'user-1',
        username: correctUser.username,
        email: correctUser.email.toLowerCase(),
        avatar: 'avatar.png',
      }),
    };
    User.findById.mockReturnValue(chain);

    const response = await request(app)
      .post('/profile')
      .send({ userId: 'user-1' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: 'user-1',
      username: correctUser.username,
      email: correctUser.email.toLowerCase(),
      avatar: 'avatar.png',
    });
    expect(chain.select).toHaveBeenCalledWith('-password');
  });

  it('responds 404 if user does not exist on POST /profile', async () => {
    const chain = {
      select: jest.fn().mockResolvedValue(null),
    };
    User.findById.mockReturnValue(chain);

    const response = await request(app)
      .post('/profile')
      .send({ userId: 'missing-user' });

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('User not found');
  });

  it('responds 500 if an internal error occurs on POST /profile', async () => {
    User.findById.mockImplementation(() => {
      throw new Error('Database failure');
    });

    const response = await request(app)
      .post('/profile')
      .send({ userId: 'user-1' });

    expect(response.status).toBe(500);
    expect(response.body.error).toBe('Internal error');
  });

  it('changes username on POST /editUser', async () => {
    User.findByIdAndUpdate.mockResolvedValue({});

    const response = await request(app)
      .post('/editUser')
      .send({ userId: 'user-1', username: 'newusername' });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Username updated');
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith('user-1', { username: 'newusername' });
  });

  it('responds with error 400 for invalid username on POST /editUser', async () => {
    const response = await request(app)
      .post('/editUser')
      .send({ userId: 'user-1', username: 'ab' });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Invalid username');
  });

  it('responds 500 if an internal error occurs on POST /editUser', async () => {
    User.findByIdAndUpdate.mockRejectedValue(new Error('Database failure'));

    const response = await request(app)
      .post('/editUser')
      .send({ userId: 'user-1', username: 'newusername' });

    expect(response.status).toBe(500);
    expect(response.body.error).toBe('Internal error');
  });

  it('changes password on POST /changePassword', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    User.findById.mockResolvedValue({ password: 'old-hash', save });
    bcrypt.compare.mockResolvedValue(true);
    bcrypt.hash.mockResolvedValue('new-hash');

    const response = await request(app)
      .post('/changePassword')
      .send({
        userId: 'user-1',
        currentPassword: correctUser.password,
        newPassword: 'NewPassword123',
      });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Password updated');
    expect(bcrypt.hash).toHaveBeenCalledWith('NewPassword123', 10);
    expect(save).toHaveBeenCalled();
  });

  it('responds with error 400 for insecure new password on POST /changePassword', async () => {
    User.findById.mockResolvedValue({ password: 'old-hash', save: jest.fn() });
    bcrypt.compare.mockResolvedValue(true);

    const response = await request(app)
      .post('/changePassword')
      .send({
        userId: 'user-1',
        currentPassword: correctUser.password,
        newPassword: 'short',
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Password does not meet requirements');
  });

  it('responds with error 400 for incorrect current password on POST /changePassword', async () => {
    User.findById.mockResolvedValue({ password: 'old-hash', save: jest.fn() });
    bcrypt.compare.mockResolvedValue(false);

    const response = await request(app)
      .post('/changePassword')
      .send({
        userId: 'user-1',
        currentPassword: 'WrongPassword',
        newPassword: 'NewPassword123',
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Current password incorrect');
  });

  it('responds with error 404 for non-existent user on POST /changePassword', async () => {
    User.findById.mockResolvedValue(null);

    const response = await request(app)
      .post('/changePassword')
      .send({
        userId: 'missing-user',
        currentPassword: 'Password123',
        newPassword: 'NewPassword123',
      });

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('User not found');
  });

  it('returns 400 if changePassword throws', async () => {
    User.findById.mockRejectedValue(new Error('DB fail'));

    const response = await request(app)
      .post('/changePassword')
      .send({
        userId: 'user-1',
        currentPassword: 'Password123',
        newPassword: 'NewPassword123',
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('DB fail');
  });

 it('returns users in bulk on POST /api/users/bulk', async () => {
  const id1 = '507f1f77bcf86cd799439011';
  const id2 = '507f1f77bcf86cd799439012';

  const users = [{ _id: id1 }, { _id: id2 }];
  User.find.mockResolvedValue(users);

  const response = await request(app)
    .post('/api/users/bulk')
    .send({ ids: [id1, id2] });

  expect(response.status).toBe(200);
  expect(response.body).toEqual(users);

  // Verifica que se llamó correctamente
  expect(User.find).toHaveBeenCalledWith({
    _id: { $in: expect.any(Array) }
  });

  // Verifica que los ObjectId son correctos
  const calledIds = User.find.mock.calls[0][0]._id.$in;
  expect(calledIds.map(id => id.toString())).toEqual([id1, id2]);
});

 it('returns filtered users on GET /api/users', async () => {
  const id1 = '507f1f77bcf86cd799439011';

  const chain = createQueryChain([
    { _id: 'user-2', username: 'alice' }
  ]);

  User.find.mockReturnValue(chain);

  const response = await request(app)
    .get('/api/users')
    .query({
      exclude: [id1],
      search: 'ali',
      page: 2,
      limit: 5
    });

  expect(response.status).toBe(200);
  expect(response.body).toEqual([
    { _id: 'user-2', username: 'alice' }
  ]);

  // Verifica llamada base
  expect(User.find).toHaveBeenCalledWith({
    _id: { $nin: expect.any(Array) },
    username: { $regex: 'ali', $options: 'i' },
  });

  // Verifica ObjectId real
  const calledExclude = User.find.mock.calls[0][0]._id.$nin;
  expect(calledExclude[0].toString()).toBe(id1);

  // Verifica paginación
  expect(chain.select).toHaveBeenCalledWith('-password');
  expect(chain.skip).toHaveBeenCalledWith(5); // (page 2 - 1) * limit 5
  expect(chain.limit).toHaveBeenCalledWith(5);
});

  it('returns 500 if GET /api/users fails', async () => {
    User.find.mockImplementation(() => {
      throw new Error('DB fail');
    });

    const response = await request(app).get('/api/users');

    expect(response.status).toBe(500);
    expect(response.body.error).toBe('Internal error');
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
    expect(app.listen).toHaveBeenCalledWith(8001, expect.any(Function));
    expect(mongoose.connection.close).toHaveBeenCalled();
  });

  it('throws when a required field is missing in the helper', () => {
    expect(() => app.__validateRequiredFields({ body: {} }, ['username']))
      .toThrow('Missing field: username');
  });

  it('throws when password does not meet requirements in the helper', () => {
    expect(() => app.__validatePassword('password'))
      .toThrow('Password does not meet requirements');
  });
});
