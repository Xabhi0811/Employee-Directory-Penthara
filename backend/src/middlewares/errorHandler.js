/**
 * Centralized Error Handler Middleware
 * Handles all errors and sends appropriate responses
 */

import { HTTP_STATUS, API_MESSAGES } from '../../shared/constants/http.constants.js';
import logger from '../utils/logger.js';

/**
 * Error handler middleware
 * @param {Error} err - Error object
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 * @param {NextFunction} next - Express next function
 */
const errorHandler = (err, req, res, next) => {
  // Log error with context
  logger.error('Error Handler:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    statusCode: err.statusCode,
    body: req.body,
  });

  // Default error status and message
  let statusCode = err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let message = err.message || API_MESSAGES.SERVER_ERROR;

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    message = Object.values(err.errors)
      .map((error) => error.message)
      .join(', ');
    logger.warn('Validation error:', { errors: err.errors });
  }

  if (err.name === 'CastError') {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    message = API_MESSAGES.INVALID_ID;
    logger.warn('Cast error:', { value: err.value, path: err.path });
  }

  if (err.code === 11000) {
    statusCode = HTTP_STATUS.CONFLICT;
    const field = Object.keys(err.keyPattern)[0];
    message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`;
    logger.warn('Duplicate key error:', { field, value: err.keyValue });
  }

  // Handle JSON parsing errors
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    message = 'Invalid JSON payload';
    logger.warn('JSON parsing error');
  }

  // Send error response
  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

/**
 * 404 Not Found Handler
 */
const notFoundHandler = (req, res) => {
  logger.warn('Route not found:', { path: req.originalUrl, method: req.method });
  res.status(HTTP_STATUS.NOT_FOUND).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
};

export { errorHandler, notFoundHandler };
