/**
 * Rate Limiting Middleware Tests
 *
 * Kept in a separate file from the main API tests for two reasons:
 *  - express-rate-limit keeps its counters in module-level state, so exhausting
 *    a limiter would break every other test sharing the file.
 *  - Driving the real 100-request global limit is slow and flaky. Mounting a
 *    small limiter on a throwaway app tests the same middleware deterministically.
 */

import { describe, it, expect } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import { createRateLimiter } from '../../src/middlewares/rateLimit.middleware.js';

/** Minimal app with a deliberately tiny limit. */
const buildApp = (limiterOptions) => {
  const app = express();
  app.use(createRateLimiter(limiterOptions));
  app.get('/health', (req, res) => res.status(200).json({ ok: true }));
  app.get('/thing', (req, res) => res.status(200).json({ ok: true }));
  return app;
};

describe('Rate limiting', () => {
  it('should allow requests up to the limit and reject the next one with 429', async () => {
    const app = buildApp({ max: 2, windowMs: 60_000 });

    await request(app).get('/thing').expect(200);
    await request(app).get('/thing').expect(200);

    const blocked = await request(app).get('/thing').expect(429);

    expect(blocked.body.success).toBe(false);
    expect(blocked.body.message).toMatch(/too many requests/i);
  });

  it('should expose standard RateLimit headers', async () => {
    const app = buildApp({ max: 5, windowMs: 60_000 });

    const res = await request(app).get('/thing').expect(200);

    expect(res.headers['ratelimit-limit']).toBeDefined();
    expect(res.headers['ratelimit-remaining']).toBeDefined();
    // Legacy headers are intentionally disabled
    expect(res.headers['x-ratelimit-limit']).toBeUndefined();
  });

  it('should never rate limit health probe endpoints', async () => {
    const app = buildApp({ max: 1, windowMs: 60_000 });

    // Well beyond the limit of 1
    for (let i = 0; i < 5; i += 1) {
      await request(app).get('/health').expect(200);
    }
  });

  it('should skip whitelisted IPs', async () => {
    const previous = process.env.RATE_LIMIT_WHITELIST;
    process.env.RATE_LIMIT_WHITELIST = '127.0.0.1,::1,::ffff:127.0.0.1';

    try {
      const app = buildApp({ max: 1, windowMs: 60_000 });

      await request(app).get('/thing').expect(200);
      await request(app).get('/thing').expect(200); // would be 429 without the whitelist
    } finally {
      if (previous === undefined) {
        delete process.env.RATE_LIMIT_WHITELIST;
      } else {
        process.env.RATE_LIMIT_WHITELIST = previous;
      }
    }
  });
});
