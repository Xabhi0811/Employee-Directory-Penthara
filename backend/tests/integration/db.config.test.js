/**
 * Database connection configuration regression tests (src/config/db.js).
 *
 * BACKGROUND: production once broke because db.js passed `bufferMaxEntries`
 * (removed in Mongoose 8) and `autoEncryption: false` (not a valid driver
 * value). The MongoDB v6 driver rejects unknown options, so the server retried
 * forever and never bound to its port. The existing suite missed it because it
 * connects with Mongoose's defaults via mongodb-memory-server and never
 * exercised db.js's own `connectionOptions`.
 *
 * These tests close that gap by driving the REAL connectDB() — with its real
 * option object — against an in-memory MongoDB. If an unsupported option is
 * ever reintroduced, the live driver throws and the success test fails, exactly
 * as production did.
 */

import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import connectDB, { closeConnection } from '../../src/config/db.js';

describe('database connection configuration (db.js)', () => {
  describe('successful connection with the configured options', () => {
    let mongoServer;
    let capturedOptions;
    let connectResult;

    beforeAll(async () => {
      mongoServer = await MongoMemoryServer.create();
      process.env.MONGO_URI = mongoServer.getUri();

      // Spy but call through: db.js performs a real connection, and we capture
      // the exact options object it hands to the driver.
      const connectSpy = jest.spyOn(mongoose, 'connect');
      connectResult = await connectDB();
      capturedOptions = connectSpy.mock.calls[0][1];
      connectSpy.mockRestore();
    }, 60000);

    afterAll(async () => {
      await closeConnection().catch(() => {});
      if (mongoServer) await mongoServer.stop();
    });

    it('connects successfully and reaches a connected state (readyState 1)', () => {
      // The connection actually succeeding is the core regression guard: the
      // live driver would have thrown on an unsupported option.
      expect(connectResult).toBeDefined();
      expect(mongoose.connection.readyState).toBe(1);
    });

    it('does not pass options removed/invalid in Mongoose 8 + MongoDB driver 6', () => {
      expect(capturedOptions).toBeDefined();
      // The two options that broke production must never come back.
      expect(capturedOptions).not.toHaveProperty('bufferMaxEntries');
      expect(capturedOptions.autoEncryption).not.toBe(false);
    });

    it('passes currently supported pooling, timeout and buffering options', () => {
      // Sanity that the intended configuration is still present and well-formed.
      expect(capturedOptions.maxPoolSize).toBeGreaterThan(0);
      expect(capturedOptions.minPoolSize).toBeGreaterThan(0);
      expect(capturedOptions).toHaveProperty('serverSelectionTimeoutMS');
      expect(capturedOptions).toHaveProperty('socketTimeoutMS');
      expect(capturedOptions.bufferCommands).toBe(true);
    });
  });

  describe('connection failure handling', () => {
    it('retries up to the limit and then exits the process', async () => {
      // Make every connection attempt fail without touching a real server.
      const connectSpy = jest
        .spyOn(mongoose, 'connect')
        .mockRejectedValue(new Error('connection refused'));

      // process.exit(1) is the terminal action; turn it into a catchable throw
      // so the test can assert it happened instead of killing the test runner.
      const exitSpy = jest
        .spyOn(process, 'exit')
        .mockImplementation((code) => {
          throw new Error(`__process_exit__:${code}`);
        });

      // Collapse the 5s retry back-off so the test runs instantly.
      const timeoutSpy = jest
        .spyOn(global, 'setTimeout')
        .mockImplementation((cb) => {
          cb();
          return 0;
        });

      try {
        await expect(connectDB()).rejects.toThrow('__process_exit__:1');

        // Initial attempt plus MAX_RETRIES (5) further attempts = 6 calls.
        expect(connectSpy).toHaveBeenCalledTimes(6);
        expect(exitSpy).toHaveBeenCalledWith(1);
      } finally {
        connectSpy.mockRestore();
        exitSpy.mockRestore();
        timeoutSpy.mockRestore();
      }
    });
  });
});
