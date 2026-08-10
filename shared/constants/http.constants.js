/**
 * HTTP Status Codes
 * Shared constants for consistent status code usage
 */

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
};

/**
 * HTTP Methods
 */
export const HTTP_METHODS = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  DELETE: 'DELETE',
  PATCH: 'PATCH',
};

/**
 * API Response Messages
 */
export const API_MESSAGES = {
  EMPLOYEE_CREATED: 'Employee created successfully',
  EMPLOYEE_UPDATED: 'Employee updated successfully',
  EMPLOYEE_DELETED: 'Employee deleted successfully',
  EMPLOYEE_NOT_FOUND: 'Employee not found',
  EMPLOYEE_FETCHED: 'Employees fetched successfully',
  EMAIL_EXISTS: 'Employee with this email already exists',
  INVALID_ID: 'Invalid employee ID format',
  VALIDATION_ERROR: 'Validation error',
  SERVER_ERROR: 'Internal server error',
  SERVER_RUNNING: 'Server is running',
};
