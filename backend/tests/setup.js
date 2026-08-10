/**
 * Jest Test Setup
 * Runs before each test file (setupFilesAfterEach)
 *
 * NOTE: This project uses native ES modules ("type": "module") with
 * --experimental-vm-modules. The `jest` object is therefore NOT a global and
 * must be imported explicitly from '@jest/globals'.
 */

import { jest } from '@jest/globals';

// Set test environment variables.
// NODE_ENV=test also puts the Winston logger into silent mode (see src/utils/logger.js),
// which keeps test output readable and avoids writing to logs/*.log during tests.
process.env.NODE_ENV = 'test';
process.env.PORT = '5001';
process.env.CLIENT_URL = 'http://localhost:5173';

// Increase test timeout for integration tests
jest.setTimeout(30000);

// Global test utilities
global.testUtils = {
  /**
   * Create a valid employee object for testing
   */
  createValidEmployee: (overrides = {}) => ({
    name: 'John Doe',
    role: 'React JS Developer',
    department: 'Engineering',
    email: `test${Date.now()}${Math.random().toString(36).slice(2, 8)}@example.com`,
    phone: '+1234567890',
    joiningDate: new Date('2024-01-01'),
    employmentType: 'Fresher',
    ...overrides,
  }),

  /**
   * Wait for a condition to be true
   */
  waitFor: async (condition, timeout = 5000) => {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      if (await condition()) {
        return true;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error('Timeout waiting for condition');
  },
};
