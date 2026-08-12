import express from 'express';
import employeeController from '../controllers/employee.controller.js';
import { cacheResponse } from '../middlewares/cache.middleware.js';
import { applyCacheConfig, etag } from '../middlewares/httpCache.middleware.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = express.Router();

/**
 * Apply authentication to all department routes
 * All routes require authentication
 */
router.use(authenticate);

/**
 * Department Routes
 * All routes are prefixed with /api/departments
 *
 * Departments are derived from employee records rather than stored separately,
 * so these routes are backed by the employee controller/service. The response
 * cache is invalidated by employee mutations (see cache.middleware.js), which
 * keeps the headcounts accurate after an add, edit or delete.
 */

// Get all departments with their live employee counts
router.get(
  '/',
  applyCacheConfig('revalidate'), // browser must always revalidate; server cache still answers fast
  etag(),
  cacheResponse({ cacheName: 'departments', ttl: 10 * 60 * 1000 }),
  employeeController.getDepartmentsWithCounts
);

export default router;
