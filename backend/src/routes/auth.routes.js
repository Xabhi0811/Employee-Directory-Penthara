/**
 * Authentication Routes
 * Handles all authentication-related endpoints
 */

import express from 'express';
import authController from '../controllers/auth.controller.js';
import { signupValidation, loginValidation } from '../validators/auth.validator.js';
import { authRateLimiter } from '../middlewares/rateLimit.middleware.js';
import { authenticate, optionalAuthenticate } from '../middlewares/auth.middleware.js';
import sanitizationMiddleware from '../middlewares/sanitization.middleware.js';
import { applyCacheConfig } from '../middlewares/httpCache.middleware.js';

const router = express.Router();

/**
 * Authentication Routes
 * All routes are prefixed with /api/auth
 */

/**
 * Signup - Register a new user
 * POST /api/auth/signup
 * 
 * Public route with rate limiting
 * Rate limit: 5 attempts per 15 minutes per IP
 */
router.post(
  '/signup',
  authRateLimiter, // Strict rate limiting for auth
  sanitizationMiddleware, // Sanitize input
  signupValidation, // Validate signup data
  applyCacheConfig('noCache'), // No caching for auth endpoints
  authController.signup
);

/**
 * Login - Authenticate user
 * POST /api/auth/login
 * 
 * Public route with rate limiting
 * Rate limit: 5 attempts per 15 minutes per IP
 */
router.post(
  '/login',
  authRateLimiter, // Strict rate limiting for auth
  sanitizationMiddleware, // Sanitize input
  loginValidation, // Validate login data
  applyCacheConfig('noCache'), // No caching for auth endpoints
  authController.login
);

/**
 * Logout - Clear authentication
 * POST /api/auth/logout
 * 
 * Protected route - requires authentication
 */
router.post(
  '/logout',
  authenticate, // Require authentication
  applyCacheConfig('noCache'), // No caching for auth endpoints
  authController.logout
);

/**
 * Get current user
 * GET /api/auth/me
 * 
 * Protected route - requires authentication
 */
router.get(
  '/me',
  authenticate, // Require authentication
  applyCacheConfig('noCache'), // No caching for user data
  authController.getMe
);

/**
 * Check authentication status
 * GET /api/auth/status
 * 
 * Optional authentication - returns status regardless of auth state
 */
router.get(
  '/status',
  optionalAuthenticate, // Optional authentication
  applyCacheConfig('noCache'), // No caching
  authController.checkStatus
);

export default router;
