/**
 * Mass Assignment Protection Tests
 *
 * These guards decide which client-supplied fields are allowed to reach the
 * database. A regression here would let a caller flip internal flags such as
 * isActive, so each entry point is covered explicitly.
 */

import { describe, it, expect } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import {
  protectEmployeeCreation,
  protectEmployeeUpdate,
  protectMassAssignment,
  protectQueryParams,
} from '../../src/middlewares/massAssignment.middleware.js';

/** App that echoes the post-middleware body. */
const buildBodyApp = (middleware) => {
  const app = express();
  app.use(express.json());
  app.use(middleware);
  app.post('/echo', (req, res) => res.status(200).json({ body: req.body }));
  app.put('/echo', (req, res) => res.status(200).json({ body: req.body }));
  return app;
};

/** App that echoes the post-middleware query. */
const buildQueryApp = () => {
  const app = express();
  app.use(protectQueryParams);
  app.get('/echo', (req, res) => res.status(200).json({ query: req.query }));
  return app;
};

const validPayload = {
  name: 'John Doe',
  role: 'Engineer',
  department: 'Engineering',
  email: 'john@example.com',
  phone: '+1234567890',
  joiningDate: '2024-01-01',
};

describe('protectEmployeeCreation', () => {
  it('should pass a payload of only whitelisted fields through unchanged', async () => {
    const res = await request(buildBodyApp(protectEmployeeCreation))
      .post('/echo')
      .send(validPayload)
      .expect(200);

    expect(res.body.body).toEqual(validPayload);
  });

  it('should silently drop fields that are not whitelisted', async () => {
    const res = await request(buildBodyApp(protectEmployeeCreation))
      .post('/echo')
      .send({ ...validPayload, salary: 100000, nickname: 'Johnny' })
      .expect(200);

    expect(res.body.body.salary).toBeUndefined();
    expect(res.body.body.nickname).toBeUndefined();
    expect(res.body.body.name).toBe('John Doe');
  });

  it.each(['_id', 'id', '__v', 'createdAt', 'updatedAt', 'isActive', 'isArchived'])(
    'should reject the request outright when the forbidden field %s is present',
    async (field) => {
      const res = await request(buildBodyApp(protectEmployeeCreation))
        .post('/echo')
        .send({ ...validPayload, [field]: 'anything' })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.fields).toContain(field);
    }
  );

  it('should pass through when there is no body to inspect', async () => {
    const app = express();
    app.use(protectEmployeeCreation);
    app.get('/ping', (req, res) => res.status(200).json({ ok: true }));

    await request(app).get('/ping').expect(200);
  });
});

describe('protectEmployeeUpdate', () => {
  it('should allow a partial update of whitelisted fields', async () => {
    const res = await request(buildBodyApp(protectEmployeeUpdate))
      .put('/echo')
      .send({ role: 'Senior Engineer' })
      .expect(200);

    expect(res.body.body).toEqual({ role: 'Senior Engineer' });
  });

  it('should drop non-whitelisted fields from an update', async () => {
    const res = await request(buildBodyApp(protectEmployeeUpdate))
      .put('/echo')
      .send({ role: 'Senior Engineer', internalNotes: 'nope' })
      .expect(200);

    expect(res.body.body.internalNotes).toBeUndefined();
  });

  it('should reject an update targeting a forbidden field', async () => {
    const res = await request(buildBodyApp(protectEmployeeUpdate))
      .put('/echo')
      .send({ isActive: false })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.fields).toContain('isActive');
  });
});

describe('protectMassAssignment', () => {
  it('should keep only the fields supplied in the whitelist', async () => {
    const res = await request(buildBodyApp(protectMassAssignment(['alpha'])))
      .post('/echo')
      .send({ alpha: 1, beta: 2 })
      .expect(200);

    expect(res.body.body).toEqual({ alpha: 1 });
  });

  it('should reject forbidden fields regardless of the whitelist', async () => {
    const res = await request(buildBodyApp(protectMassAssignment(['alpha', 'isActive'])))
      .post('/echo')
      .send({ alpha: 1, isActive: false })
      .expect(400);

    expect(res.body.success).toBe(false);
  });
});

describe('protectQueryParams', () => {
  it('should leave benign query parameters untouched', async () => {
    const res = await request(buildQueryApp())
      .get('/echo?search=john&page=2')
      .expect(200);

    expect(res.body.query).toEqual({ search: 'john', page: '2' });
  });

  it.each(['$where', '$ne', '$gt', '$regex', '$exists'])(
    'should strip the MongoDB operator %s from the query string',
    async (operator) => {
      const res = await request(buildQueryApp())
        .get(`/echo?${encodeURIComponent(operator)}=bad&search=john`)
        .expect(200);

      expect(res.body.query[operator]).toBeUndefined();
      expect(res.body.query.search).toBe('john');
    }
  );

  it('should strip forbidden field names from the query string', async () => {
    const res = await request(buildQueryApp())
      .get('/echo?isActive=false&search=john')
      .expect(200);

    expect(res.body.query.isActive).toBeUndefined();
    expect(res.body.query.search).toBe('john');
  });
});
