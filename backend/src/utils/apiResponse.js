/**
 * API Response Utility
 * Ensures consistent response format across all endpoints
 */

import { HTTP_STATUS } from '../../shared/constants/http.constants.js';

/**
 * Success Response Builder
 * @param {Response} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Success message
 * @param {*} data - Response data
 * @param {Object} meta - Additional metadata (pagination, etc.)
 */
export const sendSuccess = (res, statusCode, message, data = null, meta = null) => {
  const response = {
    success: true,
    message,
    ...(data !== null && { data }),
    ...(meta !== null && { meta }),
  };

  return res.status(statusCode).json(response);
};

/**
 * Error Response Builder
 * @param {Response} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Error message
 * @param {Array} errors - Validation errors array
 */
export const sendError = (res, statusCode, message, errors = null) => {
  const response = {
    success: false,
    message,
    ...(errors !== null && { errors }),
  };

  return res.status(statusCode).json(response);
};

/**
 * Pagination Meta Builder
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @param {number} total - Total items
 */
export const buildPaginationMeta = (page, limit, total) => {
  const totalPages = Math.ceil(total / limit);
  
  return {
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
};
