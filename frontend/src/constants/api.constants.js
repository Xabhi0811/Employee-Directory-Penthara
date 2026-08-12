/**
 * Frontend API constants - base URL, endpoints and shared request settings.
 */

/**
 * Reads VITE_API_URL and fails fast if it is missing, since every request needs it.
 *
 * @returns {string} The configured API base URL
 */
const validateEnvironment = () => {
  const apiUrl = import.meta.env.VITE_API_URL;
  
  if (!apiUrl) {
    throw new Error(
      'VITE_API_URL environment variable is not configured.\n' +
      'Please create a .env file in the frontend directory with:\n' +
      'VITE_API_URL=http://localhost:5000/api'
    );
  }
  
  return apiUrl;
};

export const API_BASE_URL = validateEnvironment();

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
 * Largest page size the employees endpoint accepts.
 *
 * The API clamps `limit` to 1–100 and defaults to 10, so any view that needs a
 * complete list (rather than the first page) must ask for this explicitly.
 */
export const MAX_PAGE_SIZE = 100;

export const API_TIMEOUT = 10000; // 10 seconds

export const API_HEADERS = {
  'Content-Type': 'application/json',
};
