/**
 * Authentication Service
 * Handles all authentication-related API calls
 */

import api from './api';
import { API_ENDPOINTS } from '../constants/api.constants';

/**
 * Signup - Register a new user
 * @param {Object} userData - User registration data
 * @param {string} userData.name - User's full name
 * @param {string} userData.email - User's email address
 * @param {string} userData.password - User's password
 * @param {string} userData.confirmPassword - Password confirmation
 * @returns {Promise<Object>} - Created user object
 */
export const signup = async (userData) => {
  const response = await api.post(API_ENDPOINTS.AUTH.SIGNUP, userData);
  return response.data.data;
};

/**
 * Login - Authenticate user
 * @param {Object} credentials - Login credentials
 * @param {string} credentials.email - User's email
 * @param {string} credentials.password - User's password
 * @returns {Promise<Object>} - User object
 */
export const login = async (credentials) => {
  const response = await api.post(API_ENDPOINTS.AUTH.LOGIN, credentials);
  return response.data.data;
};

/**
 * Logout - Clear authentication
 * @returns {Promise<void>}
 */
export const logout = async () => {
  await api.post(API_ENDPOINTS.AUTH.LOGOUT);
};

/**
 * Get current user information
 * @returns {Promise<Object>} - User object
 */
export const getMe = async () => {
  const response = await api.get(API_ENDPOINTS.AUTH.ME);
  return response.data.data;
};

/**
 * Check authentication status
 * @returns {Promise<Object>} - Authentication status and user (if authenticated)
 */
export const checkAuthStatus = async () => {
  const response = await api.get(API_ENDPOINTS.AUTH.STATUS);
  return response.data.data;
};

export default {
  signup,
  login,
  logout,
  getMe,
  checkAuthStatus,
};
