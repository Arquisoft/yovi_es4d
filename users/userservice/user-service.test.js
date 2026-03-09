const request = require('supertest');
const bcrypt = require('bcrypt');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const { ObjectId } = require('mongodb');

const User = require('./user-model');

const correctUser = {
  username: 'testuser',
  email: 'test@example.com',
  password: 'Password123',
};

let mongoServer;
let app;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  process.env.MONGODB_URI = mongoUri;
  app = require('./user-service');
});

afterEach(async () => {
  const collections = await mongoose.connection.db.collections();
  for (let collection of collections) {
    await collection.deleteMany({});
  }
});

afterAll(async () => {
  app.close();
  await mongoServer.stop();
});

describe('User Service', () => {

  it('should add a new user on POST /adduser', async () => {
    const response = await request(app).post('/adduser').send(correctUser);
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('message', 'User created');

    // Check if the user is inserted into the database
    const userInDb = await User.findOne({ username: 'testuser' });
    expect(userInDb).not.toBeNull();
    expect(userInDb.username).toBe('testuser');
    const isPasswordValid = await bcrypt.compare('Password123', userInDb.password);
    expect(isPasswordValid).toBe(true);
  });

  it('should respond with error 400 for insecure password on POST /adduser', async () => {
    const newUser = { ...correctUser, password: 'password' };
    const response = await request(app).post('/adduser').send(newUser);
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error', 'Password does not meet requirements');
  });

  it('should respond with error 409 because username/email already exists on POST /adduser', async () => {
    await request(app).post('/adduser').send(correctUser);
    const response = await request(app).post('/adduser').send(correctUser);
    expect(response.status).toBe(409);
    expect(response.body).toHaveProperty('error', 'Email or username already exists');
  });

  it('should respond with error 400 because required fields are missing on POST /adduser', async () => {
    const newUser = { password: 'Password123' }; // missing username and email
    const response = await request(app).post('/adduser').send(newUser);
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error', 'Missing field: username');
  });

  it('should change username on POST /editUser', async () => {
    const newUser = await request(app).post('/adduser').send(correctUser);
    const newUserId = newUser.body.id;

    const requestData = { userId: newUserId, username: 'newusername' };
    const response = await request(app).post('/editUser').send(requestData);
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('message', 'Username updated');

    const updatedUser = await User.findById(newUserId);
    expect(updatedUser.username).toBe('newusername');
  });

  it('should respond with error 400 for invalid username on POST /editUser', async () => {
    const newUser = await request(app).post('/adduser').send(correctUser);
    const newUserId = newUser.body.id;

    const requestData = { userId: newUserId, username: 'ab' }; // too short
    const response = await request(app).post('/editUser').send(requestData);
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error', 'Invalid username');
  });

  it('should change password on POST /changePassword', async () => {
    const newUser = await request(app).post('/adduser').send(correctUser);
    const newUserId = newUser.body.id;

    const requestData = {
      userId: newUserId,
      currentPassword: correctUser.password,
      newPassword: 'NewPassword123'
    };

    const response = await request(app).post('/changePassword').send(requestData);
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('message', 'Password updated');

    const updatedUser = await User.findById(newUserId);
    const isPasswordValid = await bcrypt.compare('NewPassword123', updatedUser.password);
    expect(isPasswordValid).toBe(true);
  });

  it('should respond with error 400 for insecure new password on POST /changePassword', async () => {
    const newUser = await request(app).post('/adduser').send(correctUser);
    const newUserId = newUser.body.id;

    const requestData = {
      userId: newUserId,
      currentPassword: correctUser.password,
      newPassword: 'short'
    };

    const response = await request(app).post('/changePassword').send(requestData);
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error', 'Password does not meet requirements');
  });

  it('should respond with error 400 for incorrect current password on POST /changePassword', async () => {
    const newUser = await request(app).post('/adduser').send(correctUser);
    const newUserId = newUser.body.id;

    const requestData = {
      userId: newUserId,
      currentPassword: 'WrongPassword',
      newPassword: 'NewPassword123'
    };

    const response = await request(app).post('/changePassword').send(requestData);
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error', 'Current password incorrect');
  });

  it('should respond with error 404 for non-existent user on POST /changePassword', async () => {
    const requestData = {
      userId: new ObjectId('123456789012345678901234'),
      currentPassword: 'Password123',
      newPassword: 'NewPassword123'
    };

    const response = await request(app).post('/changePassword').send(requestData);
    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('error', 'User not found');
  });

  it('should respond 404 if user does not exist on POST /profile', async () => {
  const nonExistentId = new ObjectId(); // ID que no existe
  const response = await request(app)
    .post('/profile')
    .send({ userId: nonExistentId });

  expect(response.status).toBe(404);
  expect(response.body).toHaveProperty('error', 'User not found');
});
it('should respond 500 if an internal error occurs on POST /profile', async () => {
  const spy = jest.spyOn(User, 'findById').mockImplementation(() => {
    throw new Error('Database failure');
  });

  const response = await request(app)
    .post('/profile')
    .send({ userId: new ObjectId() });

  expect(response.status).toBe(500);
  expect(response.body).toHaveProperty('error', 'Internal error');

  spy.mockRestore(); // restaurar implementación original
});
it('should return user profile on POST /profile', async () => {
  const newUser = await request(app).post('/adduser').send(correctUser);
  const userId = newUser.body.id;

  const response = await request(app)
    .post('/profile')
    .send({ userId });

  expect(response.status).toBe(200);
  expect(response.body).toHaveProperty('id', userId);
  expect(response.body).toHaveProperty('username', correctUser.username);
  expect(response.body).toHaveProperty('email', correctUser.email.toLowerCase());
  expect(response.body).toHaveProperty('avatar');
});
it('should respond 500 if an internal error occurs on POST /editUser', async () => {
  // Simulamos que findByIdAndUpdate lanza un error
  const spy = jest.spyOn(User, 'findByIdAndUpdate').mockImplementation(() => {
    throw new Error('Database failure');
  });

  const newUser = await request(app).post('/adduser').send(correctUser);
  const userId = newUser.body.id;

  const response = await request(app)
    .post('/editUser')
    .send({ userId, username: 'newusername' });

  expect(response.status).toBe(500);
  expect(response.body).toHaveProperty('error', 'Internal error');

  spy.mockRestore(); // restauramos la implementación original
});
it('should instantiate a new User model', () => {
  const user = new User({
    username: 'foo',
    email: 'foo@example.com',
    password: 'Password123',
    avatar: 'avatar.png',
    createdAt: new Date()
  });

  expect(user.username).toBe('foo');
});
it('should use default Mongo URI if MONGODB_URI is not set', async () => {
  const originalEnv = process.env.MONGODB_URI;
  delete process.env.MONGODB_URI;

  const mongooseModule = require('./user-service'); // vuelve a requerir tu app
  expect(mongooseModule).toBeDefined();

  process.env.MONGODB_URI = originalEnv; // restaurar variable
});
});