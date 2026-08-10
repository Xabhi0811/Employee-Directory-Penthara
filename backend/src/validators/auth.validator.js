/**
 * Authentication Validation Middleware
 * Validates signup and login requests
 */

import { body, validationResult } from 'express-validator';
import { HTTP_STATUS } from '../../shared/constants/http.constants.js';

/**
 * Password validation rules
 * Strong password requirements:
 * - At least 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 */
const passwordValidation = () => {
  return body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/[a-z]/)
    .withMessage('Password must contain at least one lowercase letter')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter')
    .matches(/[0-9]/)
    .withMessage('Password must contain at least one number')
    .matches(/[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\/'`~;]/)
    .withMessage('Password must contain at least one special character');
};

/**
 * Email validation rules
 */
const emailValidation = () => {
  return body('email')
    .notEmpty()
    .withMessage('Email is required')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
    .isLength({ max: 100 })
    .withMessage('Email cannot exceed 100 characters');
};

/**
 * Name validation rules
 */
const nameValidation = () => {
  return body('name')
    .notEmpty()
    .withMessage('Name is required')
    .trim()
    .isLength({ min: 2 })
    .withMessage('Name must be at least 2 characters long')
    .isLength({ max: 100 })
    .withMessage('Name cannot exceed 100 characters')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('Name can only contain letters, spaces, hyphens, and apostrophes');
};

/**
 * Signup validation middleware
 * Validates name, email, password, and confirmPassword
 */
export const signupValidation = [
  nameValidation(),
  emailValidation(),
  passwordValidation(),
  
  // Confirm password validation
  body('confirmPassword')
    .notEmpty()
    .withMessage('Please confirm your password')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),

  // Custom middleware to check validation results
  (req, res, next) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map((err) => ({
          field: err.path || err.param,
          message: err.msg,
        })),
      });
    }
    
    next();
  },
];

/**
 * Login validation middleware
 * Validates email and password
 */
export const loginValidation = [
  emailValidation(),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isString()
    .withMessage('Password must be a string'),

  // Custom middleware to check validation results
  (req, res, next) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map((err) => ({
          field: err.path || err.param,
          message: err.msg,
        })),
      });
    }
    
    next();
  },
];

/**
 * Email-only validation (for password reset, etc.)
 */
export const emailOnlyValidation = [
  emailValidation(),

  // Custom middleware to check validation results
  (req, res, next) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map((err) => ({
          field: err.path || err.param,
          message: err.msg,
        })),
      });
    }
    
    next();
  },
];

export default {
  signupValidation,
  loginValidation,
  emailOnlyValidation,
};
