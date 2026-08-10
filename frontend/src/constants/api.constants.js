/**
 * Frontend API Constants
 * Centralized API configuration
 */

/**
 * Validate required environment variables
 */
const validateEnvironment = () => {
  const apiUrl = import.meta.env.VITE_API_URL;
  
  if (!apiUrl) {
    throw new Error(
      '❌ VITE_API_URL environment variable is not configured.\n' +
      'Please create a .env file in the frontend directory with:\n' +
      'VITE_API_URL=http://localhost:5000/api'
    );
  }
  
  return apiUrl;
};

/**
 * API Base URL from environment variable
 */
export const API_BASE_URL = validateEnvironment();

/**
 * API Endpoints
 */
export const API_ENDPOINTS = {
  EMPLOYEES: '/employees',
  EMPLOYEE_BY_ID: (id) => `/employees/${id}`,
  // Plain list of department names, used to populate filter controls
  DEPARTMENTS: '/employees/departments/list',
  // Departments with live employee counts, used by the department cards
  DEPARTMENTS_WITH_COUNTS: '/departments',
  // Authentication endpoints
  AUTH: {
    SIGNUP: '/auth/signup',
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    ME: '/auth/me',
    STATUS: '/auth/status',
  },
};

/**
 * API Timeout
 */
export const API_TIMEOUT = 10000; // 10 seconds

/**
 * HTTP Headers
 */
export const API_HEADERS = {
  'Content-Type': 'application/json',
};
