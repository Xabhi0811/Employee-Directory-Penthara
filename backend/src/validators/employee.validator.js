/**
 * Validation middleware using shared Zod schemas
 * Follows DRY principle by reusing validation logic
 */

import { param, query } from 'express-validator';
import { employeeSchema, updateEmployeeSchema } from '../../../shared/schemas/employee.schema.js';
import { HTTP_STATUS } from '../../../shared/constants/http.constants.js';

/**
 * Zod validation middleware factory
 * @param {Object} schema - Zod schema
 * @returns {Function} - Express middleware
 */
const validateWithZod = (schema) => {
  return async (req, res, next) => {
    try {
      const validated = await schema.parseAsync(req.body);
      req.body = validated;
      next();
    } catch (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Validation error',
        errors: error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      });
    }
  };
};

/**
 * Create employee validation middleware
 */
export const createEmployeeValidation = validateWithZod(employeeSchema);

/**
 * Update employee validation middleware
 */
export const updateEmployeeValidation = [
  param('id')
    .notEmpty()
    .withMessage('Employee ID is required')
    .isMongoId()
    .withMessage('Invalid employee ID format'),
  validateWithZod(updateEmployeeSchema),
];

/**
 * Employee ID validation
 */
export const employeeIdValidation = [
  param('id')
    .notEmpty()
    .withMessage('Employee ID is required')
    .isMongoId()
    .withMessage('Invalid employee ID format'),
];

/**
 * Search query validation with pagination and sorting
 */
export const searchValidation = [
  query('search')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Search term cannot exceed 100 characters'),

  query('department')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Department filter cannot exceed 100 characters'),

  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  query('sortBy')
    .optional()
    .isIn(['name', 'role', 'department', 'email', 'joiningDate', 'createdAt'])
    .withMessage('Invalid sort field'),

  query('order')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Order must be asc or desc'),
];
