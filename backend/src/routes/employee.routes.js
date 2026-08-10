import express from 'express';
import employeeController from '../controllers/employee.controller.js';
import {
  createEmployeeValidation,
  updateEmployeeValidation,
  employeeIdValidation,
  searchValidation,
} from '../validators/employee.validator.js';
import {
  protectEmployeeCreation,
  protectEmployeeUpdate,
  protectQueryParams,
} from '../middlewares/massAssignment.middleware.js';
import { writeOperationsLimiter } from '../middlewares/rateLimit.middleware.js';
import { cacheResponse, invalidateCache } from '../middlewares/cache.middleware.js';
import { applyCacheConfig, etag, vary } from '../middlewares/httpCache.middleware.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = express.Router();

/**
 * Apply authentication to all employee routes
 * All routes require authentication
 */
router.use(authenticate);

/**
 * Employee Routes
 * All routes are prefixed with /api/employees
 */

// Get all unique departments (cached for 10 minutes with ETag support)
router.get(
  '/departments/list',
  applyCacheConfig('medium'), // 30 minutes cache
  etag(), // ETag support for conditional requests
  cacheResponse({ cacheName: 'departments', ttl: 10 * 60 * 1000 }),
  employeeController.getDepartments
);

// Get all employees with optional search (cached for 5 minutes with ETag)
router.get(
  '/',
  protectQueryParams,
  searchValidation,
  applyCacheConfig('short'), // 5 minutes cache
  etag(), // ETag support
  vary(['Accept', 'Accept-Encoding']), // Vary by Accept headers
  cacheResponse({ cacheName: 'employees', ttl: 5 * 60 * 1000 }),
  employeeController.getAllEmployees
);

// Get single employee by ID (cached for 5 minutes with ETag)
router.get(
  '/:id',
  employeeIdValidation,
  applyCacheConfig('short'), // 5 minutes cache
  etag(), // ETag support
  cacheResponse({ cacheName: 'employees', ttl: 5 * 60 * 1000 }),
  employeeController.getEmployeeById
);

// Create new employee (no cache, invalidate existing cache)
router.post(
  '/',
  writeOperationsLimiter,
  protectEmployeeCreation,
  createEmployeeValidation,
  applyCacheConfig('noCache'), // No caching for mutations
  invalidateCache({ cacheName: 'employees' }),
  invalidateCache({ cacheName: 'departments' }),
  employeeController.createEmployee
);

// Update employee (no cache, invalidate existing cache)
router.put(
  '/:id',
  writeOperationsLimiter,
  protectEmployeeUpdate,
  updateEmployeeValidation,
  applyCacheConfig('noCache'), // No caching for mutations
  invalidateCache({ cacheName: 'employees' }),
  invalidateCache({ cacheName: 'departments' }),
  employeeController.updateEmployee
);

// Delete employee (no cache, invalidate existing cache)
router.delete(
  '/:id',
  writeOperationsLimiter,
  employeeIdValidation,
  applyCacheConfig('noCache'), // No caching for mutations
  invalidateCache({ cacheName: 'employees' }),
  invalidateCache({ cacheName: 'departments' }),
  employeeController.deleteEmployee
);

export default router;
