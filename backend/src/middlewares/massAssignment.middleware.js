/**
 * Mass Assignment Protection Middleware
 * Prevents users from setting fields they shouldn't have access to
 */

import { ALLOWED_FIELDS } from '../config/security.config.js';
import logger from '../utils/logger.js';

/**
 * Filter object to only include whitelisted fields
 * @param {Object} obj - Input object
 * @param {Array<string>} allowedFields - Array of allowed field names
 * @returns {Object} - Filtered object
 */
const filterFields = (obj, allowedFields) => {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return obj;
  }

  const filtered = {};
  const removedFields = [];

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      if (allowedFields.includes(key)) {
        filtered[key] = obj[key];
      } else {
        removedFields.push(key);
      }
    }
  }

  if (removedFields.length > 0) {
    logger.warn('Mass assignment attempt detected - fields removed', {
      removedFields,
    });
  }

  return filtered;
};

/**
 * Check for forbidden fields that should never be settable
 * @param {Object} obj - Input object
 * @returns {Array<string>} - Array of forbidden fields found
 */
const checkForbiddenFields = (obj) => {
  if (!obj || typeof obj !== 'object') {
    return [];
  }

  const foundForbidden = [];

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      if (ALLOWED_FIELDS.FORBIDDEN_FIELDS.includes(key)) {
        foundForbidden.push(key);
      }
    }
  }

  return foundForbidden;
};

/**
 * Middleware to protect employee creation from mass assignment
 */
export const protectEmployeeCreation = (req, res, next) => {
  if (!req.body || typeof req.body !== 'object') {
    return next();
  }

  // Check for forbidden fields
  const forbiddenFields = checkForbiddenFields(req.body);
  if (forbiddenFields.length > 0) {
    logger.error('Attempt to set forbidden fields during creation', {
      forbiddenFields,
      ip: req.ip,
      path: req.path,
    });

    return res.status(400).json({
      success: false,
      message: 'Invalid request: attempting to set protected fields',
      fields: forbiddenFields,
    });
  }

  // Filter to only allowed fields
  req.body = filterFields(req.body, ALLOWED_FIELDS.EMPLOYEE_CREATE);

  next();
};

/**
 * Middleware to protect employee update from mass assignment
 */
export const protectEmployeeUpdate = (req, res, next) => {
  if (!req.body || typeof req.body !== 'object') {
    return next();
  }

  // Check for forbidden fields
  const forbiddenFields = checkForbiddenFields(req.body);
  if (forbiddenFields.length > 0) {
    logger.error('Attempt to set forbidden fields during update', {
      forbiddenFields,
      ip: req.ip,
      path: req.path,
    });

    return res.status(400).json({
      success: false,
      message: 'Invalid request: attempting to set protected fields',
      fields: forbiddenFields,
    });
  }

  // Filter to only allowed fields
  req.body = filterFields(req.body, ALLOWED_FIELDS.EMPLOYEE_UPDATE);

  next();
};

/**
 * Generic mass assignment protection middleware
 * @param {Array<string>} allowedFields - Array of allowed field names
 * @returns {Function} - Express middleware
 */
export const protectMassAssignment = (allowedFields) => {
  return (req, res, next) => {
    if (!req.body || typeof req.body !== 'object') {
      return next();
    }

    // Check for forbidden fields
    const forbiddenFields = checkForbiddenFields(req.body);
    if (forbiddenFields.length > 0) {
      logger.error('Attempt to set forbidden fields', {
        forbiddenFields,
        ip: req.ip,
        path: req.path,
      });

      return res.status(400).json({
        success: false,
        message: 'Invalid request: attempting to set protected fields',
        fields: forbiddenFields,
      });
    }

    // Filter to only allowed fields
    req.body = filterFields(req.body, allowedFields);

    next();
  };
};

/**
 * Middleware to prevent setting internal fields in query params
 */
export const protectQueryParams = (req, res, next) => {
  if (!req.query || typeof req.query !== 'object') {
    return next();
  }

  const dangerousQueryParams = ['$where', '$regex', '$gt', '$gte', '$lt', '$lte', '$ne', '$in', '$nin', '$exists'];
  const foundDangerous = [];

  for (const key in req.query) {
    if (req.query.hasOwnProperty(key)) {
      // Check for MongoDB operators in query params
      if (dangerousQueryParams.some(op => key.includes(op))) {
        foundDangerous.push(key);
      }

      // Check for forbidden fields
      if (ALLOWED_FIELDS.FORBIDDEN_FIELDS.includes(key)) {
        foundDangerous.push(key);
      }
    }
  }

  if (foundDangerous.length > 0) {
    logger.warn('Dangerous query parameters detected', {
      parameters: foundDangerous,
      ip: req.ip,
      path: req.path,
    });

    // Remove dangerous parameters
    foundDangerous.forEach(param => {
      delete req.query[param];
    });
  }

  next();
};

export default {
  protectEmployeeCreation,
  protectEmployeeUpdate,
  protectMassAssignment,
  protectQueryParams,
};
