/**
 * Rate Limiting Middleware
 * Prevents brute force attacks and API abuse
 */

import rateLimit from 'express-rate-limit';
import { RATE_LIMIT_CONFIG } from '../config/security.config.js';
import logger from '../utils/logger.js';

/**
 * Custom handler for rate limit exceeded
 */
const rateLimitHandler = (req, res) => {
  logger.warn('Rate limit exceeded', {
    ip: req.ip,
    path: req.path,
    method: req.method,
  });

  res.status(429).json({
    success: false,
    message: 'Too many requests, please try again later.',
    retryAfter: res.getHeader('RateLimit-Reset'),
  });
};

/**
 * Skip function for rate limiting
 * Can skip rate limiting for certain conditions (e.g., whitelisted IPs)
 */
const skipRateLimit = (req) => {
  // Skip rate limiting for health check endpoints
  if (req.path === '/health' || req.path === '/ready' || req.path === '/live') {
    return true;
  }

  // Add whitelisted IPs if needed
  const whitelistedIPs = process.env.RATE_LIMIT_WHITELIST
    ? process.env.RATE_LIMIT_WHITELIST.split(',').map(ip => ip.trim())
    : [];

  if (whitelistedIPs.includes(req.ip)) {
    return true;
  }

  return false;
};

/**
 * Global rate limiter
 * Applies to all routes
 */
export const globalRateLimiter = rateLimit({
  windowMs: RATE_LIMIT_CONFIG.GLOBAL.windowMs,
  max: RATE_LIMIT_CONFIG.GLOBAL.max,
  message: RATE_LIMIT_CONFIG.GLOBAL.message,
  standardHeaders: RATE_LIMIT_CONFIG.GLOBAL.standardHeaders,
  legacyHeaders: RATE_LIMIT_CONFIG.GLOBAL.legacyHeaders,
  handler: rateLimitHandler,
  skip: skipRateLimit,
  // Use default key generator (handles IPv6 properly)
  // Store rate limit data in memory (can be replaced with Redis for production)
  // For production, consider using rate-limit-redis
});

/**
 * Write operations rate limiter
 * Stricter limits for POST, PUT, DELETE operations
 */
export const writeOperationsLimiter = rateLimit({
  windowMs: RATE_LIMIT_CONFIG.WRITE_OPERATIONS.windowMs,
  max: RATE_LIMIT_CONFIG.WRITE_OPERATIONS.max,
  message: RATE_LIMIT_CONFIG.WRITE_OPERATIONS.message,
  standardHeaders: RATE_LIMIT_CONFIG.WRITE_OPERATIONS.standardHeaders,
  legacyHeaders: RATE_LIMIT_CONFIG.WRITE_OPERATIONS.legacyHeaders,
  handler: rateLimitHandler,
  skip: skipRateLimit,
  // Use default key generator (handles IPv6 properly)
  // Only apply to write operations
  skipSuccessfulRequests: false, // Count all requests, even successful ones
  skipFailedRequests: false, // Count failed requests too
});

/**
 * Authentication rate limiter (for future use)
 * Very strict limits for authentication attempts
 */
export const authRateLimiter = rateLimit({
  windowMs: RATE_LIMIT_CONFIG.AUTH.windowMs,
  max: RATE_LIMIT_CONFIG.AUTH.max,
  message: RATE_LIMIT_CONFIG.AUTH.message,
  standardHeaders: RATE_LIMIT_CONFIG.AUTH.standardHeaders,
  legacyHeaders: RATE_LIMIT_CONFIG.AUTH.legacyHeaders,
  handler: rateLimitHandler,
  skip: skipRateLimit,
  // Use default key generator (handles IPv6 properly)
  skipSuccessfulRequests: true, // Only count failed login attempts
  skipFailedRequests: false,
});

/**
 * Create custom rate limiter with specific configuration
 * @param {Object} options - Rate limit options
 * @returns {Function} - Rate limiter middleware
 */
export const createRateLimiter = (options = {}) => {
  return rateLimit({
    windowMs: options.windowMs || 15 * 60 * 1000,
    max: options.max || 100,
    message: options.message || 'Too many requests',
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitHandler,
    skip: skipRateLimit,
    // Use default key generator (handles IPv6 properly)
    ...options,
  });
};

/**
 * Middleware to log rate limit info in response
 */
export const logRateLimitInfo = (req, res, next) => {
  const limit = res.getHeader('RateLimit-Limit');
  const remaining = res.getHeader('RateLimit-Remaining');
  const reset = res.getHeader('RateLimit-Reset');

  if (limit && remaining !== undefined) {
    logger.debug('Rate limit info', {
      ip: req.ip,
      path: req.path,
      limit,
      remaining,
      reset: new Date(reset * 1000).toISOString(),
    });
  }

  next();
};

export default {
  globalRateLimiter,
  writeOperationsLimiter,
  authRateLimiter,
  createRateLimiter,
  logRateLimitInfo,
};
