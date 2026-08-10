/**
 * Input Sanitization Middleware Tests
 *
 * These middlewares are the first line of defence against NoSQL injection, XSS
 * and prototype pollution, so each layer is exercised directly rather than only
 * incidentally through the API tests.
 */

import { describe, it, expect } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import sanitizationMiddleware, {
  sanitizeInput,
  preventPrototypePollution,
  trimInputs,
} from '../../src/middlewares/sanitization.middleware.js';

/**
 * Build an app that echoes back the (post-sanitisation) request body and query.
 */
const buildApp = (middleware) => {
  const app = express();
  app.use(express.json());
  app.use(middleware);
  app.post('/echo', (req, res) => res.status(200).json({ body: req.body, query: req.query }));
  app.get('/echo', (req, res) => res.status(200).json({ query: req.query }));
  return app;
};

describe('preventPrototypePollution', () => {
  it('should reject a body containing __proto__', async () => {
    // Sent as a raw JSON string on purpose: `{ __proto__: ... }` in an object
    // literal sets the prototype instead of creating an own property, so
    // JSON.stringify would silently drop it and the attack would not be
    // represented. JSON.parse, by contrast, creates a real own property.
    const res = await request(buildApp(preventPrototypePollution))
      .post('/echo')
      .set('Content-Type', 'application/json')
      .send('{"name":"John","__proto__":{"admin":true}}')
      .expect(400);

    expect(res.body.success).toBe(false);
  });

  it('should reject a nested constructor key', async () => {
    const res = await request(buildApp(preventPrototypePollution))
      .post('/echo')
      .send({ profile: { constructor: { evil: true } } })
      .expect(400);

    expect(res.body.success).toBe(false);
  });

  it('should allow a clean body through', async () => {
    const res = await request(buildApp(preventPrototypePollution))
      .post('/echo')
      .send({ name: 'John', profile: { title: 'Engineer' } })
      .expect(200);

    expect(res.body.body.name).toBe('John');
  });
});

describe('sanitizeInput', () => {
  it('should strip keys beginning with $ (NoSQL operators)', async () => {
    const res = await request(buildApp(sanitizeInput))
      .post('/echo')
      .send({ name: 'John', $where: 'this.a === 1' })
      .expect(200);

    expect(res.body.body.name).toBe('John');
    expect(res.body.body.$where).toBeUndefined();
  });

  it('should strip keys containing a dot (nested-path injection)', async () => {
    const res = await request(buildApp(sanitizeInput))
      .post('/echo')
      .send({ 'profile.admin': true, name: 'John' })
      .expect(200);

    expect(res.body.body['profile.admin']).toBeUndefined();
    expect(res.body.body.name).toBe('John');
  });

  it('should remove script tags from string values', async () => {
    const res = await request(buildApp(sanitizeInput))
      .post('/echo')
      .send({ name: '<script>alert("xss")</script>John' })
      .expect(200);

    expect(res.body.body.name).toBe('John');
  });

  it('should remove all HTML tags from string values', async () => {
    const res = await request(buildApp(sanitizeInput))
      .post('/echo')
      .send({ name: '<b>John</b> <img src=x>' })
      .expect(200);

    expect(res.body.body.name).not.toContain('<');
    expect(res.body.body.name).toContain('John');
  });

  it('should strip the javascript: protocol', async () => {
    const res = await request(buildApp(sanitizeInput))
      .post('/echo')
      .send({ website: 'javascript:alert(1)' })
      .expect(200);

    expect(res.body.body.website).not.toMatch(/javascript:/i);
  });

  it('should strip inline event handlers', async () => {
    const res = await request(buildApp(sanitizeInput))
      .post('/echo')
      .send({ note: 'onerror=alert(1)' })
      .expect(200);

    expect(res.body.body.note).not.toMatch(/onerror\s*=/i);
  });

  it('should sanitise values nested inside arrays', async () => {
    const res = await request(buildApp(sanitizeInput))
      .post('/echo')
      .send({ tags: ['<script>bad</script>ok', 'clean'] })
      .expect(200);

    expect(res.body.body.tags).toEqual(['ok', 'clean']);
  });

  it('should truncate strings beyond the configured maximum length', async () => {
    const res = await request(buildApp(sanitizeInput))
      .post('/echo')
      .send({ note: 'a'.repeat(10_050) })
      .expect(200);

    expect(res.body.body.note.length).toBe(10_000);
  });

  it('should cap oversized arrays', async () => {
    const res = await request(buildApp(sanitizeInput))
      .post('/echo')
      .send({ tags: Array.from({ length: 150 }, (_, i) => `t${i}`) })
      .expect(200);

    expect(res.body.body.tags.length).toBe(100);
  });
});

describe('trimInputs', () => {
  it('should trim surrounding whitespace from string values', async () => {
    const res = await request(buildApp(trimInputs))
      .post('/echo')
      .send({ name: '  John Doe  ', role: '\tEngineer\n' })
      .expect(200);

    expect(res.body.body.name).toBe('John Doe');
    expect(res.body.body.role).toBe('Engineer');
  });
});

describe('sanitizationMiddleware (composed)', () => {
  it('should apply every layer in order', async () => {
    const res = await request(buildApp(sanitizationMiddleware))
      .post('/echo')
      .send({ name: '  <script>x</script>John  ', $ne: 'bad' })
      .expect(200);

    expect(res.body.body.name).toBe('John');
    expect(res.body.body.$ne).toBeUndefined();
  });

  it('should still reject prototype pollution when composed', async () => {
    await request(buildApp(sanitizationMiddleware))
      .post('/echo')
      .set('Content-Type', 'application/json')
      .send('{"__proto__":{"admin":true}}')
      .expect(400);
  });
});
