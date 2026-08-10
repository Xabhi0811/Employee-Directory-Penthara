/**
 * Authentication Routes Integration Tests
 * Tests the complete auth flow including signup, login, logout, and protected routes
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Whitelist loopback for rate limiting in tests
process.env.RATE_LIMIT_WHITELIST = '127.0.0.1,::1,::ffff:127.0.0.1';

const { default: createApp } = await import('../../src/app.js');
const { default: User } = await import('../../src/models/User.js');
const { default: Employee } = await import('../../src/models/Employee.js');

let mongoServer;
let app;

/** Valid user payload with unique email */
const makeUser = (overrides = {}) => ({
  name: 'John Doe',
  email: `user${Math.random().toString(36).slice(2, 10)}@example.com`,
  password: 'Test@1234',
  confirmPassword: 'Test@1234',
  ...overrides,
});

/** Valid employee payload */
const makeEmployee = (overrides = {}) => ({
  name: 'Jane Smith',
  role: 'Developer',
  department: 'Engineering',
  email: `emp${Math.random().toString(36).slice(2, 10)}@example.com`,
  phone: '+1234567890',
  joiningDate: '2024-01-01',
  employmentType: 'Fresher',
  ...overrides,
});

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  await User.createIndexes();
  await Employee.createIndexes();
  app = createApp();
}, 60000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

beforeEach(async () => {
  await User.deleteMany({});
  await Employee.deleteMany({});
});

describe('Authentication API', () => {
  describe('POST /api/auth/signup', () => {
    it('should create a new user with valid data', async () => {
      const userData = makeUser();

      const res = await request(app)
        .post('/api/auth/signup')
        .send(userData)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('email', userData.email.toLowerCase());
      expect(res.body.data).toHaveProperty('name', userData.name);
      expect(res.body.data).not.toHaveProperty('passwordHash');
      expect(res.body.data).not.toHaveProperty('password');
    });

    it('should normalize email to lowercase', async () => {
      const userData = makeUser({ email: 'TEST@EXAMPLE.COM' });

      const res = await request(app)
        .post('/api/auth/signup')
        .send(userData)
        .expect(201);

      expect(res.body.data.email).toBe('test@example.com');
    });

    it('should reject signup with duplicate email', async () => {
      const userData = makeUser();
      
      await request(app).post('/api/auth/signup').send(userData).expect(201);
      
      const res = await request(app)
        .post('/api/auth/signup')
        .send(userData)
        .expect(409);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/already exists/i);
    });

    it('should reject signup with missing name', async () => {
      const userData = makeUser({ name: '' });

      const res = await request(app)
        .post('/api/auth/signup')
        .send(userData)
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.errors).toBeDefined();
    });

    it('should reject signup with invalid email', async () => {
      const userData = makeUser({ email: 'invalid-email' });

      const res = await request(app)
        .post('/api/auth/signup')
        .send(userData)
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should reject signup with weak password (no uppercase)', async () => {
      const userData = makeUser({ 
        password: 'test@1234',
        confirmPassword: 'test@1234' 
      });

      const res = await request(app)
        .post('/api/auth/signup')
        .send(userData)
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/validation/i);
    });

    it('should reject signup with weak password (no special char)', async () => {
      const userData = makeUser({ 
        password: 'Test1234',
        confirmPassword: 'Test1234' 
      });

      const res = await request(app)
        .post('/api/auth/signup')
        .send(userData)
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should reject signup with short password', async () => {
      const userData = makeUser({ 
        password: 'Te@1',
        confirmPassword: 'Te@1' 
      });

      const res = await request(app)
        .post('/api/auth/signup')
        .send(userData)
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should reject signup when passwords do not match', async () => {
      const userData = makeUser({ 
        password: 'Test@1234',
        confirmPassword: 'Different@1234' 
      });

      const res = await request(app)
        .post('/api/auth/signup')
        .send(userData)
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/validation/i);
    });

    it('should hash password before storing', async () => {
      const userData = makeUser();

      await request(app).post('/api/auth/signup').send(userData).expect(201);

      const user = await User.findOne({ email: userData.email.toLowerCase() }).select('+passwordHash');
      expect(user.passwordHash).toBeDefined();
      expect(user.passwordHash).not.toBe(userData.password);
      expect(user.passwordHash.length).toBeGreaterThan(20);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const userData = makeUser();
      await request(app).post('/api/auth/signup').send(userData).expect(201);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: userData.email, password: userData.password })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toHaveProperty('email', userData.email.toLowerCase());
      expect(res.body.data.user).not.toHaveProperty('passwordHash');
      
      // Should set cookies
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies.some(cookie => cookie.includes('accessToken'))).toBe(true);
      expect(cookies.some(cookie => cookie.includes('HttpOnly'))).toBe(true);
    });

    it('should reject login with wrong password', async () => {
      const userData = makeUser();
      await request(app).post('/api/auth/signup').send(userData).expect(201);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: userData.email, password: 'WrongPassword@123' })
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/invalid/i);
    });

    it('should reject login with non-existent email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nonexistent@example.com', password: 'Test@1234' })
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/invalid/i);
    });

    it('should reject login with missing credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com' })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should be case-insensitive for email', async () => {
      const userData = makeUser({ email: 'test@example.com' });
      await request(app).post('/api/auth/signup').send(userData).expect(201);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'TEST@EXAMPLE.COM', password: userData.password })
        .expect(200);

      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current user when authenticated', async () => {
      const userData = makeUser();
      await request(app).post('/api/auth/signup').send(userData).expect(201);

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: userData.email, password: userData.password })
        .expect(200);

      const cookies = loginRes.headers['set-cookie'];

      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', cookies)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('email', userData.email.toLowerCase());
      expect(res.body.data).not.toHaveProperty('passwordHash');
    });

    it('should return 401 when not authenticated', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/authentication required/i);
    });

    it('should return 401 with invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', 'accessToken=invalid-token')
        .expect(401);

      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout and clear cookies', async () => {
      const userData = makeUser();
      await request(app).post('/api/auth/signup').send(userData).expect(201);

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: userData.email, password: userData.password })
        .expect(200);

      const cookies = loginRes.headers['set-cookie'];

      const res = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', cookies)
        .expect(200);

      expect(res.body.success).toBe(true);

      // Should clear cookies
      const setCookies = res.headers['set-cookie'];
      expect(setCookies).toBeDefined();
      expect(setCookies.some(cookie => cookie.includes('accessToken=;'))).toBe(true);
    });

    it('should require authentication', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .expect(401);

      expect(res.body.success).toBe(false);
    });
  });

  describe('Protected Routes - Employee API', () => {
    it('should block unauthenticated access to GET /api/employees', async () => {
      const res = await request(app)
        .get('/api/employees')
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/authentication required/i);
    });

    it('should allow authenticated access to GET /api/employees', async () => {
      const userData = makeUser();
      await request(app).post('/api/auth/signup').send(userData).expect(201);

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: userData.email, password: userData.password })
        .expect(200);

      const cookies = loginRes.headers['set-cookie'];

      const res = await request(app)
        .get('/api/employees')
        .set('Cookie', cookies)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });

    it('should block unauthenticated access to POST /api/employees', async () => {
      const employeeData = makeEmployee();

      const res = await request(app)
        .post('/api/employees')
        .send(employeeData)
        .expect(401);

      expect(res.body.success).toBe(false);
    });

    it('should allow authenticated access to POST /api/employees', async () => {
      const userData = makeUser();
      await request(app).post('/api/auth/signup').send(userData).expect(201);

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: userData.email, password: userData.password })
        .expect(200);

      const cookies = loginRes.headers['set-cookie'];
      const employeeData = makeEmployee();

      const res = await request(app)
        .post('/api/employees')
        .set('Cookie', cookies)
        .send(employeeData)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('email', employeeData.email);
    });

    it('should block unauthenticated access to GET /api/departments', async () => {
      const res = await request(app)
        .get('/api/departments')
        .expect(401);

      expect(res.body.success).toBe(false);
    });

    it('should allow authenticated access to GET /api/departments', async () => {
      const userData = makeUser();
      await request(app).post('/api/auth/signup').send(userData).expect(201);

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: userData.email, password: userData.password })
        .expect(200);

      const cookies = loginRes.headers['set-cookie'];

      const res = await request(app)
        .get('/api/departments')
        .set('Cookie', cookies)
        .expect(200);

      expect(res.body.success).toBe(true);
    });
  });

  describe('Public Routes', () => {
    it('should allow access to health check without auth', async () => {
      const res = await request(app)
        .get('/health')
        .expect(200);

      expect(res.body.status).toBe('ok');
    });

    it('should allow access to ready check without auth', async () => {
      const res = await request(app)
        .get('/ready')
        .expect(200);

      expect(res.body.status).toBe('ready');
    });
  });
});
