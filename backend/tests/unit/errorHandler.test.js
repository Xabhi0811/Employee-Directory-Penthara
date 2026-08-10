/**
 * Error Handler Middleware Tests
 *
 * The error handler is the single place where internal failures are translated
 * into client-facing responses, so its status-code mapping and its refusal to
 * leak stack traces outside development are both worth pinning down.
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import { errorHandler, notFoundHandler } from '../../src/middlewares/errorHandler.js';

/**
 * Build a throwaway app whose single route throws the supplied error.
 */
const buildApp = (error) => {
  const app = express();
  app.get('/boom', (req, res, next) => next(error));
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
};

describe('errorHandler', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('should default to 500 for an error with no status code', async () => {
    const res = await request(buildApp(new Error('kaboom'))).get('/boom').expect(500);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('kaboom');
  });

  it('should honour an explicit statusCode on the error', async () => {
    const err = new Error('Employee not found');
    err.statusCode = 404;

    const res = await request(buildApp(err)).get('/boom').expect(404);

    expect(res.body.message).toBe('Employee not found');
  });

  it('should map a Mongoose ValidationError to 400 with joined messages', async () => {
    const err = new Error('validation failed');
    err.name = 'ValidationError';
    err.errors = {
      name: { message: 'Name is required' },
      email: { message: 'Email is invalid' },
    };

    const res = await request(buildApp(err)).get('/boom').expect(400);

    expect(res.body.message).toBe('Name is required, Email is invalid');
  });

  it('should map a CastError to 400 with a generic id message', async () => {
    const err = new Error('cast failed');
    err.name = 'CastError';
    err.value = 'abc';
    err.path = '_id';

    const res = await request(buildApp(err)).get('/boom').expect(400);

    expect(res.body.message).toBe('Invalid employee ID format');
  });

  it('should map a duplicate key error (11000) to 409', async () => {
    const err = new Error('E11000 duplicate key');
    err.code = 11000;
    err.keyPattern = { email: 1 };
    err.keyValue = { email: 'john@example.com' };

    const res = await request(buildApp(err)).get('/boom').expect(409);

    expect(res.body.message).toBe('Email already exists');
  });

  it('should not leak a stack trace outside development', async () => {
    process.env.NODE_ENV = 'production';

    const res = await request(buildApp(new Error('kaboom'))).get('/boom').expect(500);

    expect(res.body.stack).toBeUndefined();
  });

  it('should include a stack trace in development for debugging', async () => {
    process.env.NODE_ENV = 'development';

    const res = await request(buildApp(new Error('kaboom'))).get('/boom').expect(500);

    expect(res.body.stack).toBeDefined();
  });
});

describe('notFoundHandler', () => {
  it('should return 404 naming the unmatched route', async () => {
    const res = await request(buildApp(new Error('unused')))
      .get('/no/such/route')
      .expect(404);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Route /no/such/route not found');
  });
});
