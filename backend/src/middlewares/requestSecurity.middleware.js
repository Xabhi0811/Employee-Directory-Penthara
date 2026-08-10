/**
 * Request Security Middleware
 * Handles request timeouts, size limits, and HPP protection
 */

import hpp from 'hpp';
import { REQUEST_TIMEOUT, REQUEST_LIMITS } from '../config/security.config.js';
import logger from '../utils/logger.js';

/**
 * Request timeout middleware
 * Prevents slow requests from tying up resources
 */
export const requestTimeout = (req, res, next) => {
  // Set timeout on the request
  req.setTimeout(REQUEST_TIMEOUT.TIMEOUT_MS, () => {
    logger.error('Request timeout', {
      ip: req.ip,
      path: req.path,
      method: req.method,
      timeout: REQUEST_TIMEOUT.TIMEOUT_MS,
    });

    // If response hasn't been sent, send timeout error
    if (!res.headersSent) {
      res.status(408).json({
        success: false,
        message: REQUEST_TIMEOUT.MESSAGE,
      });
    }
  });

  // Set timeout on the response
  res.setTimeout(REQUEST_TIMEOUT.TIMEOUT_MS, () => {
    logger.error('Response timeout', {
      ip: req.ip,
      path: req.path,
      method: req.method,
      timeout: REQUEST_TIMEOUT.TIMEOUT_MS,
    });

    if (!res.headersSent) {
      res.status(408).json({
        success: false,
        message: REQUEST_TIMEOUT.MESSAGE,
      });
    }
  });

  next();
};

/**
 * HTTP Parameter Pollution (HPP) protection
 * Prevents attacks that rely on duplicate parameters
 * 
 * Example attack:
 * ?id=123&id[$ne]=0 (trying to bypass validation)
 */
export const preventHPP = hpp({
  // Whitelist parameters that are allowed to be arrays
  whitelist: [
    'department', // Allow multiple department filters
    'sortBy', // Allow multiple sort fields if needed
  ],
  
  // Check body, query, and params
  checkBody: true,
  checkQuery: true,
});

/**
 * Middleware to log request size
 */
export const logRequestSize = (req, res, next) => {
  const contentLength = req.headers['content-length'];
  
  if (contentLength) {
    const sizeMB = (parseInt(contentLength) / (1024 * 1024)).toFixed(2);
    
    logger.debug('Request size', {
      path: req.path,
      method: req.method,
      size: `${sizeMB} MB`,
      contentLength: contentLength,
    });

    // Warn if request is large
    if (sizeMB > 1) {
      logger.warn('Large request detected', {
        path: req.path,
        method: req.method,
        size: `${sizeMB} MB`,
      });
    }
  }

  next();
};

/**
 * Custom error handler for body parser errors
 * Handles payload too large errors gracefully
 */
export const bodyParserErrorHandler = (err, req, res, next) => {
  if (err.type === 'entity.too.large') {
    logger.error('Request entity too large', {
      ip: req.ip,
      path: req.path,
      method: req.method,
      limit: REQUEST_LIMITS.JSON,
    });

    return res.status(413).json({
      success: false,
      message: `Request too large. Maximum size is ${REQUEST_LIMITS.JSON}`,
    });
  }

  if (err.type === 'entity.parse.failed') {
    logger.error('Failed to parse request body', {
      ip: req.ip,
      path: req.path,
      method: req.method,
      error: err.message,
    });

    return res.status(400).json({
      success: false,
      message: 'Invalid JSON in request body',
    });
  }

  // Pass to next error handler
  next(err);
};

/**
 * Middleware to limit parameter count
 * Prevents attacks that send thousands of parameters
 */
export const limitParameterCount = (req, res, next) => {
  const MAX_PARAMS = REQUEST_LIMITS.PARAMETER_LIMIT;

  // Check query parameters
  if (req.query && Object.keys(req.query).length > MAX_PARAMS) {
    logger.warn('Too many query parameters', {
      ip: req.ip,
      path: req.path,
      count: Object.keys(req.query).length,
      max: MAX_PARAMS,
    });

    return res.status(400).json({
      success: false,
      message: `Too many query parameters. Maximum is ${MAX_PARAMS}`,
    });
  }

  // Check body parameters (if object)
  if (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) {
    const bodyParamCount = Object.keys(req.body).length;
    if (bodyParamCount > MAX_PARAMS) {
      logger.warn('Too many body parameters', {
        ip: req.ip,
        path: req.path,
        count: bodyParamCount,
        max: MAX_PARAMS,
      });

      return res.status(400).json({
        success: false,
        message: `Too many body parameters. Maximum is ${MAX_PARAMS}`,
      });
    }
  }

  next();
};

/**
 * Middleware to set security-related request limits
 */
export const setRequestLimits = (req, res, next) => {
  // Set maximum number of listeners to prevent memory leaks
  req.setMaxListeners(10);
  res.setMaxListeners(10);

  next();
};

/**
 * Combined request security middleware
 */
export const requestSecurityMiddleware = [
  setRequestLimits,
  requestTimeout,
  logRequestSize,
  limitParameterCount,
  preventHPP,
];

export default {
  requestTimeout,
  preventHPP,
  logRequestSize,
  bodyParserErrorHandler,
  limitParameterCount,
  setRequestLimits,
  requestSecurityMiddleware,
};
