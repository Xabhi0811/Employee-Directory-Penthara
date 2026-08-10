/**
 * Input Sanitization Middleware
 * Prevents NoSQL injection, XSS, prototype pollution, and other injection attacks
 */

import mongoSanitize from 'express-mongo-sanitize';
import { SANITIZATION_RULES } from '../config/security.config.js';
import logger from '../utils/logger.js';

/**
 * Sanitize object recursively
 * Removes dangerous keys and limits depth/size
 * @param {*} obj - Object to sanitize
 * @param {number} depth - Current depth
 * @returns {*} - Sanitized object
 */
const sanitizeObject = (obj, depth = 0) => {
  // Prevent deep nesting attacks
  if (depth > SANITIZATION_RULES.MAX_OBJECT_DEPTH) {
    logger.warn('Max object depth exceeded during sanitization');
    return null;
  }

  // Handle null/undefined
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Handle primitives
  if (typeof obj !== 'object') {
    // Sanitize strings
    if (typeof obj === 'string') {
      // Limit string length to prevent memory exhaustion
      if (obj.length > SANITIZATION_RULES.MAX_STRING_LENGTH) {
        logger.warn('String length exceeded during sanitization', {
          length: obj.length,
        });
        return obj.substring(0, SANITIZATION_RULES.MAX_STRING_LENGTH);
      }
      return obj;
    }
    return obj;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    // Limit array length
    if (obj.length > SANITIZATION_RULES.MAX_ARRAY_LENGTH) {
      logger.warn('Array length exceeded during sanitization', {
        length: obj.length,
      });
      obj = obj.slice(0, SANITIZATION_RULES.MAX_ARRAY_LENGTH);
    }
    return obj.map(item => sanitizeObject(item, depth + 1));
  }

  // Handle objects
  const sanitized = {};
  
  for (const key in obj) {
    // Skip prototype chain properties
    if (!obj.hasOwnProperty(key)) {
      continue;
    }

    // Remove dangerous keys (prototype pollution prevention)
    if (SANITIZATION_RULES.DISALLOWED_KEYS.includes(key)) {
      logger.warn('Dangerous key detected and removed during sanitization', {
        key,
      });
      continue;
    }

    // Remove keys with dangerous characters
    if (key.startsWith('$') || key.includes('.')) {
      logger.warn('Potentially dangerous key detected and removed', {
        key,
      });
      continue;
    }

    // Recursively sanitize value
    sanitized[key] = sanitizeObject(obj[key], depth + 1);
  }

  return sanitized;
};

/**
 * Sanitize string to prevent XSS
 * @param {string} str - String to sanitize
 * @returns {string} - Sanitized string
 */
const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;

  // Remove HTML tags (basic XSS prevention)
  let sanitized = str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  sanitized = sanitized.replace(/<[^>]*>/g, '');
  
  // Remove javascript: protocol
  sanitized = sanitized.replace(/javascript:/gi, '');
  
  // Remove event handlers
  sanitized = sanitized.replace(/on\w+\s*=/gi, '');

  return sanitized;
};

/**
 * Deep sanitize all strings in an object
 * @param {*} obj - Object to sanitize
 * @returns {*} - Sanitized object
 */
const deepSanitizeStrings = (obj) => {
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => deepSanitizeStrings(item));
  }

  if (obj !== null && typeof obj === 'object') {
    const sanitized = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        sanitized[key] = deepSanitizeStrings(obj[key]);
      }
    }
    return sanitized;
  }

  return obj;
};

/**
 * Comprehensive input sanitization middleware
 * Applies multiple layers of sanitization
 */
export const sanitizeInput = (req, res, next) => {
  try {
    // Sanitize body
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body);
      req.body = deepSanitizeStrings(req.body);
    }

    // Sanitize query parameters
    if (req.query && typeof req.query === 'object') {
      req.query = sanitizeObject(req.query);
      req.query = deepSanitizeStrings(req.query);
    }

    // Sanitize URL parameters
    if (req.params && typeof req.params === 'object') {
      req.params = sanitizeObject(req.params);
      req.params = deepSanitizeStrings(req.params);
    }

    next();
  } catch (error) {
    logger.error('Error during input sanitization:', error);
    return res.status(400).json({
      success: false,
      message: 'Invalid input data',
    });
  }
};

/**
 * NoSQL Injection Prevention Middleware
 * Uses express-mongo-sanitize to remove $ and . from user input
 */
export const preventNoSQLInjection = mongoSanitize({
  // Remove data with prohibited characters
  replaceWith: '_',
  // Also sanitize query parameters and body
  onSanitize: ({ req, key }) => {
    logger.warn('NoSQL injection attempt detected', {
      key,
      ip: req.ip,
      path: req.path,
    });
  },
});

/**
 * Prototype Pollution Prevention
 * Prevents manipulation of __proto__, constructor, prototype
 */
export const preventPrototypePollution = (req, res, next) => {
  const checkObject = (obj, path = '') => {
    if (!obj || typeof obj !== 'object') {
      return true;
    }

    for (const key in obj) {
      if (!obj.hasOwnProperty(key)) continue;

      const currentPath = path ? `${path}.${key}` : key;

      // Check for dangerous keys
      if (SANITIZATION_RULES.DISALLOWED_KEYS.includes(key.toLowerCase())) {
        logger.error('Prototype pollution attempt detected', {
          key: currentPath,
          ip: req.ip,
          path: req.path,
        });
        return false;
      }

      // Recursively check nested objects
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        if (!checkObject(obj[key], currentPath)) {
          return false;
        }
      }
    }

    return true;
  };

  // Check body
  if (req.body && !checkObject(req.body, 'body')) {
    return res.status(400).json({
      success: false,
      message: 'Invalid request: potentially malicious input detected',
    });
  }

  // Check query
  if (req.query && !checkObject(req.query, 'query')) {
    return res.status(400).json({
      success: false,
      message: 'Invalid request: potentially malicious input detected',
    });
  }

  next();
};

/**
 * Trim whitespace from all string inputs
 */
export const trimInputs = (req, res, next) => {
  const trimObject = (obj) => {
    if (typeof obj === 'string') {
      return obj.trim();
    }

    if (Array.isArray(obj)) {
      return obj.map(trimObject);
    }

    if (obj !== null && typeof obj === 'object') {
      const trimmed = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          trimmed[key] = trimObject(obj[key]);
        }
      }
      return trimmed;
    }

    return obj;
  };

  if (req.body) req.body = trimObject(req.body);
  if (req.query) req.query = trimObject(req.query);
  if (req.params) req.params = trimObject(req.params);

  next();
};

/**
 * Combined sanitization middleware
 * Applies all sanitization in correct order
 */
export const sanitizationMiddleware = [
  preventPrototypePollution,
  preventNoSQLInjection,
  trimInputs,
  sanitizeInput,
];

export default sanitizationMiddleware;
