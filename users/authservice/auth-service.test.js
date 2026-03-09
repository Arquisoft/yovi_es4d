const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const bcrypt = require('bcrypt');
const User = require('./auth-model');

let mongoServer;
let app;

const user = {
  email: 'testuser@example.com',
  password: 'Password123',
};

// Agregamos createdAt para cubrir esa línea
async function addUser(user) {
  const hashedPassword = await bcrypt.hash(user.password, 10);
  const newUser = new User({ 
    email: user.email, 
    password: hashedPassword,
    createdAt: new Date() 
  });
  await newUser.save();
  return newUser;
}

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri();
  app = require('./auth-service'); // tu server
  await addUser(user);
});

afterAll(async () => {
  await mongoServer.stop();
  app.close();
});

describe('Auth Service', () => {

  it('should login successfully', async () => {
    const response = await request(app).post('/login').send(user);
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('email', user.email);
    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('createdAt');
    expect(response.headers['set-cookie']).toBeDefined();
  });

  it('should fail login with wrong password', async () => {
    const response = await request(app).post('/login').send({
      email: user.email,
      password: 'wrongPassword',
    });
    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Invalid credentials');
  });

  it('should fail login with non-existent email', async () => {
    const response = await request(app).post('/login').send({
      email: 'wrong@example.com',
      password: user.password,
    });
    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Invalid credentials');
  });

  it('should fail login with missing fields', async () => {
    const response = await request(app).post('/login').send({ email: user.email });
    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Invalid value');
  });

  it('should fail login if validation fails (short email/password)', async () => {
    const response = await request(app).post('/login').send({
      email: 'a',
      password: 'b',
    });
    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Invalid value, Invalid value');
  });

  it('should block login after too many failed attempts', async () => {
    for (let i = 0; i < 5; i++) {
      await request(app).post('/login').send({
        email: user.email,
        password: 'wrongPassword',
      });
    }
    const response = await request(app).post('/login').send({
      email: user.email,
      password: 'wrongPassword',
    });
    expect(response.status).toBe(429);
    expect(response.body.error).toBe('Too many login attempts, please try again later');
  });

  it('should handle internal error during login', async () => {
    // Simula un error interno para cubrir el catch
    jest.spyOn(User, 'findOne').mockImplementationOnce(() => { throw new Error('DB error'); });
    const response = await request(app).post('/login').send(user);
    expect(response.status).toBe(429);
    expect(response.body.error).toBe('Too many login attempts, please try again later');
  });

  it('should logout successfully', async () => {
    const response = await request(app).post('/logout');
    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Logged out');
  });

  
});
