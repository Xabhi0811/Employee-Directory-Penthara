/**
 * Request Security Middleware Tests
 *
 * Covers the request-level guards: parameter-count limits, HTTP parameter
 * pollution defence, and the body-parser error translation that turns raw
 * parser failures into clean 4xx responses.
 */

import { describe, it, expect } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import {
  limitParameterCount,
  preventHPP,
  logRequestSize,
  setRequestLimits,
  bodyParserErrorHandler,
} from '../../src/middlewares/requestSecurity.middleware.js';
import { REQUEST_LIMITS } from '../../src/config/security.config.js';

describe('limitParameterCount', () => {
  const buildApp = () => {
    const app = express();
    app.use(express.json());
    app.use(limitParameterCount);
    app.get('/echo', (req, res) => res.status(200).json({ ok: true }));
    app.post('/echo', (req, res) => res.status(200).json({ ok: true }));
    return app;
  };

  it('should allow a request within the parameter limit', async () => {
    await request(buildApp()).get('/echo?a=1&b=2&c=3').expect(200);
  });

  it('should reject a query string with too many parameters', async () => {
    const query = Array.from(
      { length: REQUEST_LIMITS.PARAMETER_LIMIT + 5 },
      (_, i) => `p${i}=1`
    ).join('&');

    const res = await request(buildApp()).get(`/echo?${query}`).expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/too many query parameters/i);
  });

  it('should reject a body with too many fields', async () => {
    const body = {};
    for (let i = 0; i < REQUEST_LIMITS.PARAMETER_LIMIT + 5; i += 1) {
      body[`f${i}`] = 1;
    }

    const res = await request(buildApp()).post('/echo').send(body).expect(400);

    expect(res.body.message).toMatch(/too many body parameters/i);
  });

  it('should not count array bodies as parameter maps', async () => {
    await request(buildApp())
      .post('/echo')
      .send(Array.from({ length: 80 }, (_, i) => i))
      .expect(200);
  });
});

describe('preventHPP', () => {
  const buildApp = () => {
    const app = express();
    app.use(preventHPP);
    app.get('/echo', (req, res) => res.status(200).json({ query: req.query }));
    return app;
  };

  it('should collapse a duplicated parameter to a single value', async () => {
    const res = await request(buildApp()).get('/echo?search=a&search=b').expect(200);

    expect(Array.isArray(res.body.query.search)).toBe(false);
  });

  it('should preserve arrays for whitelisted parameters', async () => {
    const res = await request(buildApp())
      .get('/echo?department=Eng&department=Design')
      .expect(200);

    expect(res.body.query.department).toEqual(['Eng', 'Design']);
  });
});

describe('logRequestSize and setRequestLimits', () => {
  const buildApp = () => {
    const app = express();
    app.use(express.json());
    app.use(setRequestLimits);
    app.use(logRequestSize);
    app.post('/echo', (req, res) => res.status(200).json({ ok: true }));
    app.get('/echo', (req, res) => res.status(200).json({ ok: true }));
    return app;
  };

  it('should pass through a request that has a content-length', async () => {
    await request(buildApp()).post('/echo').send({ a: 1 }).expect(200);
  });

  it('should pass through a request with no body', async () => {
    await request(buildApp()).get('/echo').expect(200);
  });
});

describe('bodyParserErrorHandler', () => {
  /** App with a deliberately tiny JSON limit so the parser rejects payloads. */
  const buildApp = (limit) => {
    const app = express();
    app.use(express.json({ limit }));
    app.post('/echo', (req, res) => res.status(200).json({ ok: true }));
    app.use(bodyParserErrorHandler);
    return app;
  };

  it('should translate an oversized payload into 413', async () => {
    const res = await request(buildApp('100b'))
      .post('/echo')
      .send({ blob: 'x'.repeat(5000) })
      .expect(413);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/request too large/i);
  });

  it('should translate malformed JSON into 400', async () => {
    const res = await request(buildApp('1mb'))
      .post('/echo')
      .set('Content-Type', 'application/json')
      .send('{"name": ')
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/invalid json/i);
  });

  it('should forward unrelated errors to the next handler', async () => {
    const app = express();
    app.get('/boom', (req, res, next) => next(new Error('unrelated failure')));
    app.use(bodyParserErrorHandler);
    // Terminal handler proving the error was passed along untouched
    app.use((err, req, res, next) => res.status(500).json({ forwarded: err.message }));

    const res = await request(app).get('/boom').expect(500);

    expect(res.body.forwarded).toBe('unrelated failure');
  });
});
