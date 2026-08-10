/**
 * Departments endpoint tests (GET /api/departments).
 *
 * The department-first home page depends on these counts being derived from the
 * live employee records, so the tests assert real aggregation results rather
 * than any stored or hard-coded totals.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

process.env.RATE_LIMIT_WHITELIST = '127.0.0.1,::1,::ffff:127.0.0.1';

const { default: createApp } = await import('../../src/app.js');
const { default: Employee } = await import('../../src/models/Employee.js');
const { employeeCache, departmentCache } = await import('../../src/utils/cache.js');

let mongoServer;
let app;

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

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  await Employee.createIndexes();
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
  employeeCache.clear();
  departmentCache.clear();
});

describe('GET /api/departments', () => {
  it('should return an empty list when there are no employees', async () => {
    const res = await request(app).get('/api/departments').expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual([]);
  });

  it('should return each department with a real employee count', async () => {
    await Employee.create([
      makeEmployee({ department: 'Engineering' }),
      makeEmployee({ department: 'Engineering' }),
      makeEmployee({ department: 'Engineering' }),
      makeEmployee({ department: 'Digital Marketing' }),
      makeEmployee({ department: 'Human Resources' }),
    ]);

    const res = await request(app).get('/api/departments').expect(200);

    // Sorted by department name
    expect(res.body.data).toEqual([
      { name: 'Digital Marketing', employeeCount: 1 },
      { name: 'Engineering', employeeCount: 3 },
      { name: 'Human Resources', employeeCount: 1 },
    ]);
  });

  it('should exclude soft-deleted employees from the counts', async () => {
    await Employee.create([
      makeEmployee({ department: 'Engineering' }),
      makeEmployee({ department: 'Engineering', isActive: false }),
    ]);

    const res = await request(app).get('/api/departments').expect(200);

    expect(res.body.data).toEqual([{ name: 'Engineering', employeeCount: 1 }]);
  });

  it('should omit a department entirely once it has no active employees', async () => {
    await Employee.create([
      makeEmployee({ department: 'Engineering' }),
      makeEmployee({ department: 'Ghost Department', isActive: false }),
    ]);

    const res = await request(app).get('/api/departments').expect(200);

    const names = res.body.data.map((d) => d.name);
    expect(names).toContain('Engineering');
    expect(names).not.toContain('Ghost Department');
  });

  it('should reflect a newly added employee in the counts (cache invalidated)', async () => {
    await Employee.create(makeEmployee({ department: 'Engineering' }));

    const first = await request(app).get('/api/departments').expect(200);
    expect(first.body.data).toEqual([{ name: 'Engineering', employeeCount: 1 }]);

    // Adding through the API must invalidate the cached department response
    await request(app)
      .post('/api/employees')
      .send(makeEmployee({ department: 'Engineering' }))
      .expect(201);

    const second = await request(app).get('/api/departments').expect(200);
    expect(second.body.data).toEqual([{ name: 'Engineering', employeeCount: 2 }]);
  });

  it('should reflect a deleted employee in the counts', async () => {
    const employee = await Employee.create(makeEmployee({ department: 'Engineering' }));
    await Employee.create(makeEmployee({ department: 'Engineering' }));

    await request(app).get('/api/departments').expect(200); // prime cache
    await request(app).delete(`/api/employees/${employee._id}`).expect(200);

    const res = await request(app).get('/api/departments').expect(200);
    expect(res.body.data).toEqual([{ name: 'Engineering', employeeCount: 1 }]);
  });
});
