/**
 * Validation utilities using shared Zod schema
 * Eliminates duplication between frontend and backend
 */

import { validateEmployeeData } from '../../../shared/schemas/employee.schema.js';

/**
 * Validate employee form data
 * @param {Object} data - Employee data to validate
 * @returns {Object} - Validation errors object
 */
export const validateEmployee = (data) => {
  const result = validateEmployeeData(data);
  return result.errors;
};

/**
 * Format date to readable string
 * @param {string|Date} date - Date to format
 * @returns {string} - Formatted date string
 */
export const formatDate = (date) => {
  if (!date) return '';

  const dateObj = new Date(date);
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return dateObj.toLocaleDateString('en-US', options);
};
