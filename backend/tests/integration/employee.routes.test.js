/**
 * Employee Routes Integration Tests
 * Drives the real Express app (full middleware chain) against an in-memory MongoDB.
 *
 * Two pieces of shared state must be neutralised for these tests to be
 * deterministic:
 *  1. Rate limiting  - the limiter store is module-level and shared across every
 *                      request in this file, so the loopback address is
 *                      whitelisted here. Limiter behaviour is covered separately
 *                      in tests/integration/rateLimit.test.js.
 *  2. Response cache - GET responses are cached for minutes, which would leak
 *                      state between tests, so caches are cleared in beforeEach.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Must be set before the app (and its rate limiters) handle any request.
process.env.RATE_LIMIT_WHITELIST = '127.0.0.1,::1,::ffff:127.0.0.1';

const { default: createApp } = await import('../../src/app.js');
const { default: Employee } = await import('../../src/models/Employee.js');
const { default: User } = await import('../../src/models/User.js');
const { employeeCache, departmentCache } = await import('../../src/utils/cache.js');

let mongoServer;
let app;
let authCookies; // Store authentication cookies for requests

/** Valid employee payload with a unique email. */
const makeEmployee = (overrides = {}) => ({
  name: 'John Doe',
  role: 'React JS Developer',
  department: 'Engineering',
  email: `user${Math.random().toString(36).slice(2, 10)}@example.com`,
  phone: '+1234567890',
  joiningDate: '2024-01-01',
  employmentType: 'Fresher',
  ...overrides,
});

/** Create and login a test user */
const loginTestUser = async () => {
  const userData = {
    name: 'Test User',
    email: `test${Math.random().toString(36).slice(2, 10)}@example.com`,
    password: 'Test@1234',
    confirmPassword: 'Test@1234',
  };

  await request(app).post('/api/auth/signup').send(userData).expect(201);

  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ email: userData.email, password: userData.password })
    .expect(200);

  return loginRes.headers['set-cookie'];
};

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  await Employee.createIndexes();
  await User.createIndexes();
  app = createApp();
}, 60000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
  employeeCache.stopCleanup();
  departmentCache.stopCleanup();
});

beforeEach(async () => {
  await Employee.deleteMany({});
  await User.deleteMany({});
  employeeCache.clear();
  departmentCache.clear();
  // Login before each test
  authCookies = await loginTestUser();
});

describe('Employee API', () => {
  describe('GET /api/employees', () => {
    it('should return an empty list when there are no employees', async () => {
      const res = await request(app).get('/api/employees').set('Cookie', authCookies).expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([]);
    });

    it('should return employees with pagination metadata under `meta`', async () => {
      await Employee.create([
        makeEmployee({ name: 'John Doe', joiningDate: new Date('2024-01-01') }),
        makeEmployee({ name: 'Jane Smith', joiningDate: new Date('2024-01-02') }),
      ]);

      const res = await request(app).get('/api/employees').set('Cookie', authCookies).expect(200);

      expect(res.body.data).toHaveLength(2);
      expect(res.body.meta).toEqual({
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      });
    });

    it('should not expose soft-delete flags in the response', async () => {
      await Employee.create(makeEmployee());

      const res = await request(app).get('/api/employees').expect(200);

      expect(res.body.data[0].isActive).toBeUndefined();
      expect(res.body.data[0].isArchived).toBeUndefined();
      expect(res.body.data[0]._id).toBeUndefined();
      expect(res.body.data[0].id).toBeDefined();
    });

    it('should filter employees by search term', async () => {
      await Employee.create([
        makeEmployee({ name: 'John Engineer', role: 'Developer' }),
        makeEmployee({ name: 'Jane Designer', role: 'Illustrator' }),
      ]);

      const res = await request(app).get('/api/employees?search=Illustrator').expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe('Jane Designer');
    });

    it('should filter employees by department', async () => {
      await Employee.create([
        makeEmployee({ name: 'Eng Person', department: 'Engineering' }),
        makeEmployee({ name: 'Design Person', department: 'Design' }),
      ]);

      const res = await request(app).get('/api/employees?department=Design').expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe('Design Person');
    });

    it('should paginate results', async () => {
      await Employee.create(
        Array.from({ length: 15 }, (_, i) => makeEmployee({ name: `Employee ${i + 1}` }))
      );

      const res = await request(app).get('/api/employees?page=2&limit=10').expect(200);

      expect(res.body.data).toHaveLength(5);
      expect(res.body.meta.page).toBe(2);
      expect(res.body.meta.totalPages).toBe(2);
      expect(res.body.meta.hasPrevPage).toBe(true);
      expect(res.body.meta.hasNextPage).toBe(false);
    });

    it.each(['role', 'email', 'department', 'name', 'joiningDate', 'createdAt'])(
      'should sort by %s without erroring',
      async (sortBy) => {
        await Employee.create([makeEmployee({ name: 'Alpha' }), makeEmployee({ name: 'Beta' })]);

        const res = await request(app)
          .get(`/api/employees?sortBy=${sortBy}&order=asc`)
          .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveLength(2);
      }
    );
  });

  describe('GET /api/employees/:id', () => {
    it('should return a single employee', async () => {
      const created = await Employee.create(makeEmployee({ name: 'John Doe' }));

      const res = await request(app).get(`/api/employees/${created._id}`).expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('John Doe');
    });

    it('should return 404 for an unknown id', async () => {
      const res = await request(app)
        .get(`/api/employees/${new mongoose.Types.ObjectId()}`)
        .expect(404);

      expect(res.body.success).toBe(false);
    });

    it('should return 400 for a malformed id', async () => {
      const res = await request(app).get('/api/employees/not-a-valid-id').expect(400);

      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/employees', () => {
    it('should create an employee and persist it', async () => {
      const payload = makeEmployee({ name: 'John Doe' });

      const res = await request(app).post('/api/employees').send(payload).expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();

      const persisted = await Employee.findById(res.body.data.id);
      expect(persisted).not.toBeNull();
      expect(persisted.name).toBe('John Doe');
    });

    it('should return 400 when required fields are invalid', async () => {
      const res = await request(app)
        .post('/api/employees')
        .send({ name: 'J', role: 'Dev', department: 'Eng', email: 'not-an-email' })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.errors).toBeDefined();
    });

    it('should return 409 for a duplicate email', async () => {
      const payload = makeEmployee({ email: 'duplicate@example.com' });

      await request(app).post('/api/employees').send(payload).expect(201);

      const res = await request(app)
        .post('/api/employees')
        .send({ ...payload, name: 'Someone Else' })
        .expect(409);

      expect(res.body.success).toBe(false);
    });

    it('should reject a future joining date', async () => {
      const future = new Date();
      future.setFullYear(future.getFullYear() + 1);

      await request(app)
        .post('/api/employees')
        .send(makeEmployee({ joiningDate: future.toISOString().split('T')[0] }))
        .expect(400);
    });
  });

  describe('PUT /api/employees/:id', () => {
    it('should update an employee', async () => {
      const created = await Employee.create(makeEmployee({ name: 'John Doe' }));

      const res = await request(app)
        .put(`/api/employees/${created._id}`)
        .send({ name: 'John Updated', role: 'Senior Developer' })
        .expect(200);

      expect(res.body.data.name).toBe('John Updated');
      expect(res.body.data.role).toBe('Senior Developer');
    });

    it('should return 404 for an unknown id', async () => {
      await request(app)
        .put(`/api/employees/${new mongoose.Types.ObjectId()}`)
        .send({ name: 'Test Name' })
        .expect(404);
    });
  });

  describe('DELETE /api/employees/:id', () => {
    it('should soft delete an employee', async () => {
      const created = await Employee.create(makeEmployee());

      const res = await request(app).delete(`/api/employees/${created._id}`).expect(200);
      expect(res.body.success).toBe(true);

      // Row remains but is flagged inactive
      const persisted = await Employee.findById(created._id);
      expect(persisted).not.toBeNull();
      expect(persisted.isActive).toBe(false);

      // ...and is no longer returned by the API
      const list = await request(app).get('/api/employees').expect(200);
      expect(list.body.data).toHaveLength(0);
    });

    it('should return 404 for an unknown id', async () => {
      await request(app)
        .delete(`/api/employees/${new mongoose.Types.ObjectId()}`)
        .expect(404);
    });
  });

  describe('GET /api/employees/departments/list', () => {
    it('should return unique, sorted department names', async () => {
      await Employee.create([
        makeEmployee({ department: 'Engineering' }),
        makeEmployee({ department: 'Design' }),
        makeEmployee({ department: 'Engineering' }),
      ]);

      const res = await request(app).get('/api/employees/departments/list').expect(200);

      expect(res.body.data).toEqual(['Design', 'Engineering']);
    });
  });

  describe('response caching', () => {
    it('should serve a cache HIT on a repeated identical GET', async () => {
      await Employee.create(makeEmployee());

      const first = await request(app).get('/api/employees').expect(200);
      const second = await request(app).get('/api/employees').expect(200);

      expect(first.headers['x-cache']).toBe('MISS');
      expect(second.headers['x-cache']).toBe('HIT');
    });

    it('should not serve stale list data after a create', async () => {
      await request(app).get('/api/employees').expect(200); // prime the cache

      await request(app).post('/api/employees').send(makeEmployee()).expect(201);

      const res = await request(app).get('/api/employees').expect(200);
      expect(res.body.data).toHaveLength(1);
    });

    it('should not serve stale list data after an update', async () => {
      const created = await Employee.create(makeEmployee({ name: 'Original Name' }));

      // Prime both the collection and the single-resource caches
      await request(app).get('/api/employees').expect(200);
      await request(app).get(`/api/employees/${created._id}`).expect(200);

      await request(app)
        .put(`/api/employees/${created._id}`)
        .send({ name: 'Updated Name' })
        .expect(200);

      const list = await request(app).get('/api/employees').expect(200);
      const single = await request(app).get(`/api/employees/${created._id}`).expect(200);

      expect(list.body.data[0].name).toBe('Updated Name');
      expect(single.body.data.name).toBe('Updated Name');
    });

    it('should not serve a stale department list after a create', async () => {
      await request(app).get('/api/employees/departments/list').expect(200); // prime

      await request(app)
        .post('/api/employees')
        .send(makeEmployee({ department: 'Robotics' }))
        .expect(201);

      const res = await request(app).get('/api/employees/departments/list').expect(200);
      expect(res.body.data).toContain('Robotics');
    });
  });

  describe('security', () => {
    it('should strip NoSQL operator keys from the request body', async () => {
      const res = await request(app)
        .post('/api/employees')
        .send({ ...makeEmployee(), $where: 'this.name === "x"' })
        .expect(201);

      expect(res.body.data.$where).toBeUndefined();
    });

    it('should reject attempts to set protected fields on create', async () => {
      // isActive/isArchived are on the FORBIDDEN_FIELDS list, so mass-assignment
      // protection rejects the whole request rather than silently stripping it.
      const res = await request(app)
        .post('/api/employees')
        .send({ ...makeEmployee(), isActive: false, isArchived: true })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.fields).toEqual(expect.arrayContaining(['isActive', 'isArchived']));
    });

    it('should drop non-whitelisted fields instead of persisting them', async () => {
      const res = await request(app)
        .post('/api/employees')
        .send({ ...makeEmployee(), salary: 999999 })
        .expect(201);

      const persisted = await Employee.findById(res.body.data.id);
      expect(persisted.salary).toBeUndefined();
    });

    it('should set security headers from helmet', async () => {
      const res = await request(app).get('/api/employees').expect(200);

      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options']).toBe('DENY');
    });

    it('should return 404 for an unknown route', async () => {
      const res = await request(app).get('/api/does-not-exist').expect(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /health', () => {
    it('should report service health', async () => {
      const res = await request(app).get('/health');
      expect([200, 503]).toContain(res.status);
      expect(res.body).toHaveProperty('success');
    });
  });
});
