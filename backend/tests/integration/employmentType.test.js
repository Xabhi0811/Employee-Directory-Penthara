/**
 * Employment type API tests.
 *
 * Guards the rule that previous-experience data is required for an experienced
 * employee, rejected as invalid when malformed, never invented for a fresher,
 * and removed when an employee is switched back to fresher. Backend validation
 * is asserted here directly so the API cannot be trusted to the client alone.
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

const baseEmployee = (overrides = {}) => ({
  name: 'John Doe',
  role: 'React JS Developer',
  department: 'Engineering',
  email: `user${Math.random().toString(36).slice(2, 10)}@example.com`,
  phone: '+1234567890',
  joiningDate: '2024-01-01',
  ...overrides,
});

const experiencedPayload = (overrides = {}) =>
  baseEmployee({
    employmentType: 'Experienced',
    yearsOfExperience: 4,
    previousOrganization: 'ABC Technologies',
    previousRole: 'Senior React Developer',
    previousExperienceDescription: 'Worked on scalable React applications for four years.',
    ...overrides,
  });

/** Field names present in a validation error response. */
const errorFields = (res) => (res.body.errors || []).map((e) => e.field);

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

describe('employment type - create', () => {
  it('should create a fresher without any experience fields', async () => {
    const res = await request(app)
      .post('/api/employees')
      .send(baseEmployee({ employmentType: 'Fresher' }))
      .expect(201);

    expect(res.body.data.employmentType).toBe('Fresher');
    // Experience details are not exposed for a fresher
    expect(res.body.data.yearsOfExperience).toBeUndefined();
    expect(res.body.data.previousOrganization).toBeUndefined();

    const stored = await Employee.findById(res.body.data.id);
    expect(stored.yearsOfExperience).toBeUndefined();
    expect(stored.previousOrganization).toBeUndefined();
  });

  it('should create an experienced employee with all experience fields', async () => {
    const res = await request(app)
      .post('/api/employees')
      .send(experiencedPayload())
      .expect(201);

    expect(res.body.data.employmentType).toBe('Experienced');
    expect(res.body.data.yearsOfExperience).toBe(4);
    expect(res.body.data.previousOrganization).toBe('ABC Technologies');
    expect(res.body.data.previousRole).toBe('Senior React Developer');
  });

  it('should reject a missing employment type', async () => {
    const payload = baseEmployee();
    delete payload.employmentType;

    const res = await request(app).post('/api/employees').send(payload).expect(400);

    expect(errorFields(res)).toContain('employmentType');
  });

  it('should reject an unknown employment type', async () => {
    const res = await request(app)
      .post('/api/employees')
      .send(baseEmployee({ employmentType: 'Contractor' }))
      .expect(400);

    expect(errorFields(res)).toContain('employmentType');
  });

  it('should reject an experienced employee missing every experience field', async () => {
    const res = await request(app)
      .post('/api/employees')
      .send(baseEmployee({ employmentType: 'Experienced' }))
      .expect(400);

    expect(errorFields(res)).toEqual(
      expect.arrayContaining([
        'yearsOfExperience',
        'previousOrganization',
        'previousRole',
        'previousExperienceDescription',
      ])
    );
  });

  it('should reject negative years of experience', async () => {
    const res = await request(app)
      .post('/api/employees')
      .send(experiencedPayload({ yearsOfExperience: -3 }))
      .expect(400);

    expect(errorFields(res)).toContain('yearsOfExperience');
  });

  it('should reject a non-numeric years of experience', async () => {
    const res = await request(app)
      .post('/api/employees')
      .send(experiencedPayload({ yearsOfExperience: 'five' }))
      .expect(400);

    expect(errorFields(res)).toContain('yearsOfExperience');
  });

  it('should reject an unreasonably large years of experience', async () => {
    const res = await request(app)
      .post('/api/employees')
      .send(experiencedPayload({ yearsOfExperience: 99 }))
      .expect(400);

    expect(errorFields(res)).toContain('yearsOfExperience');
  });

  it('should reject a too-short experience description', async () => {
    const res = await request(app)
      .post('/api/employees')
      .send(experiencedPayload({ previousExperienceDescription: 'short' }))
      .expect(400);

    expect(errorFields(res)).toContain('previousExperienceDescription');
  });

  it('should ignore experience fields supplied for a fresher', async () => {
    const res = await request(app)
      .post('/api/employees')
      .send(
        baseEmployee({
          employmentType: 'Fresher',
          yearsOfExperience: 7,
          previousOrganization: 'Should Be Ignored',
        })
      )
      .expect(201);

    const stored = await Employee.findById(res.body.data.id);
    expect(stored.yearsOfExperience).toBeUndefined();
    expect(stored.previousOrganization).toBeUndefined();
  });
});

describe('employment type - update', () => {
  it('should switch a fresher to experienced', async () => {
    const created = await Employee.create(
      baseEmployee({ employmentType: 'Fresher' })
    );

    const res = await request(app)
      .put(`/api/employees/${created._id}`)
      .send({
        employmentType: 'Experienced',
        yearsOfExperience: 6,
        previousOrganization: 'Globex',
        previousRole: 'Lead Engineer',
        previousExperienceDescription: 'Led a platform team for six years.',
      })
      .expect(200);

    expect(res.body.data.employmentType).toBe('Experienced');
    expect(res.body.data.yearsOfExperience).toBe(6);

    const stored = await Employee.findById(created._id);
    expect(stored.previousOrganization).toBe('Globex');
  });

  it('should reject switching to experienced without the required details', async () => {
    const created = await Employee.create(
      baseEmployee({ employmentType: 'Fresher' })
    );

    const res = await request(app)
      .put(`/api/employees/${created._id}`)
      .send({ employmentType: 'Experienced' })
      .expect(400);

    expect(errorFields(res)).toEqual(
      expect.arrayContaining(['yearsOfExperience', 'previousOrganization'])
    );
  });

  it('should clear stored experience data when switching to fresher', async () => {
    const created = await Employee.create(
      baseEmployee({
        employmentType: 'Experienced',
        yearsOfExperience: 5,
        previousOrganization: 'ABC Technologies',
        previousRole: 'Senior Developer',
        previousExperienceDescription: 'Five years building web platforms.',
      })
    );

    const res = await request(app)
      .put(`/api/employees/${created._id}`)
      .send({ employmentType: 'Fresher' })
      .expect(200);

    expect(res.body.data.employmentType).toBe('Fresher');
    expect(res.body.data.yearsOfExperience).toBeUndefined();

    // The fields are removed from the document, not blanked out
    const stored = await Employee.findById(created._id);
    expect(stored.yearsOfExperience).toBeUndefined();
    expect(stored.previousOrganization).toBeUndefined();
    expect(stored.previousRole).toBeUndefined();
    expect(stored.previousExperienceDescription).toBeUndefined();
  });

  it('should allow updating an unrelated field without touching employment data', async () => {
    const created = await Employee.create(
      baseEmployee({
        employmentType: 'Experienced',
        yearsOfExperience: 5,
        previousOrganization: 'ABC Technologies',
        previousRole: 'Senior Developer',
        previousExperienceDescription: 'Five years building web platforms.',
      })
    );

    const res = await request(app)
      .put(`/api/employees/${created._id}`)
      .send({ name: 'Renamed Person' })
      .expect(200);

    expect(res.body.data.name).toBe('Renamed Person');
    expect(res.body.data.employmentType).toBe('Experienced');
    expect(res.body.data.yearsOfExperience).toBe(5);
  });
});
