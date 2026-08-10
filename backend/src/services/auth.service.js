/**
 * Authentication Service
 * Handles authentication business logic
 */

import User from '../models/User.js';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt.utils.js';
import { HTTP_STATUS } from '../../shared/constants/http.constants.js';
import logger from '../utils/logger.js';

/**
 * Authentication Service Class
 * Implements all authentication business logic
 */
class AuthService {
  /**
   * Register a new user
   * 
   * @param {Object} userData - User registration data
   * @param {string} userData.name - User's full name
   * @param {string} userData.email - User's email address
   * @param {string} userData.password - User's password (plain text)
   * @returns {Promise<Object>} - Created user object (without password)
   * @throws {Error} - If email already exists or registration fails
   */
  async signup(userData) {
    try {
      const { name, email, password } = userData;

      // Check if user already exists
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      
      if (existingUser) {
        logger.warn('Signup failed: Email already exists', { email });
        const error = new Error('An account with this email already exists');
        error.statusCode = HTTP_STATUS.CONFLICT;
        throw error;
      }

      // Create new user (password will be hashed by pre-save hook)
      const user = new User({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        passwordHash: password, // Will be hashed by pre-save hook
      });

      await user.save();

      logger.info('User registered successfully', {
        userId: user._id,
        email: user.email,
      });

      // Return user without password
      return user.toSafeObject();
    } catch (error) {
      // If it's already a custom error with statusCode, rethrow it
      if (error.statusCode) {
        throw error;
      }

      // Handle duplicate key error (race condition)
      if (error.code === 11000) {
        logger.warn('Signup failed: Duplicate key error', { email: userData.email });
        const duplicateError = new Error('An account with this email already exists');
        duplicateError.statusCode = HTTP_STATUS.CONFLICT;
        throw duplicateError;
      }

      // Handle validation errors
      if (error.name === 'ValidationError') {
        logger.warn('Signup failed: Validation error', { errors: error.errors });
        const validationError = new Error('Invalid user data');
        validationError.statusCode = HTTP_STATUS.BAD_REQUEST;
        validationError.details = Object.values(error.errors).map(err => err.message);
        throw validationError;
      }

      logger.error('Signup error:', error);
      throw new Error('Registration failed. Please try again.');
    }
  }

  /**
   * Authenticate user and generate tokens
   * 
   * @param {Object} credentials - Login credentials
   * @param {string} credentials.email - User's email
   * @param {string} credentials.password - User's password
   * @returns {Promise<Object>} - User object and tokens
   * @throws {Error} - If credentials are invalid
   */
  async login(credentials) {
    try {
      const { email, password } = credentials;

      // Find user by email with password
      const user = await User.findByEmailWithPassword(email.toLowerCase());

      if (!user) {
        logger.warn('Login failed: User not found', { email });
        const error = new Error('Invalid email or password');
        error.statusCode = HTTP_STATUS.UNAUTHORIZED;
        throw error;
      }

      // Compare password
      const isPasswordValid = await user.comparePassword(password);

      if (!isPasswordValid) {
        logger.warn('Login failed: Invalid password', {
          userId: user._id,
          email: user.email,
        });
        const error = new Error('Invalid email or password');
        error.statusCode = HTTP_STATUS.UNAUTHORIZED;
        throw error;
      }

      // Generate tokens
      const accessToken = generateAccessToken({
        userId: user._id.toString(),
        email: user.email,
      });

      const refreshToken = generateRefreshToken({
        userId: user._id.toString(),
      });

      logger.info('User logged in successfully', {
        userId: user._id,
        email: user.email,
      });

      // Return user without password and tokens
      return {
        user: user.toSafeObject(),
        accessToken,
        refreshToken,
      };
    } catch (error) {
      // If it's already a custom error with statusCode, rethrow it
      if (error.statusCode) {
        throw error;
      }

      logger.error('Login error:', error);
      throw new Error('Login failed. Please try again.');
    }
  }

  /**
   * Get current user by ID
   * 
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - User object without password
   * @throws {Error} - If user not found
   */
  async getMe(userId) {
    try {
      const user = await User.findById(userId).select('-passwordHash');

      if (!user) {
        logger.warn('Get user failed: User not found', { userId });
        const error = new Error('User not found');
        error.statusCode = HTTP_STATUS.NOT_FOUND;
        throw error;
      }

      logger.debug('User retrieved successfully', { userId: user._id });
      return user.toSafeObject();
    } catch (error) {
      // If it's already a custom error with statusCode, rethrow it
      if (error.statusCode) {
        throw error;
      }

      logger.error('Get user error:', error);
      throw new Error('Failed to retrieve user information');
    }
  }

  /**
   * Verify user exists by email
   * 
   * @param {string} email - User email
   * @returns {Promise<boolean>} - True if user exists
   */
  async userExists(email) {
    try {
      const user = await User.findOne({ email: email.toLowerCase() });
      return !!user;
    } catch (error) {
      logger.error('User exists check error:', error);
      return false;
    }
  }

  /**
   * Get user by ID
   * 
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} - User object or null
   */
  async getUserById(userId) {
    try {
      const user = await User.findById(userId).select('-passwordHash');
      return user ? user.toSafeObject() : null;
    } catch (error) {
      logger.error('Get user by ID error:', error);
      return null;
    }
  }
}

// Export singleton instance
export default new AuthService();
