/**
 * Authentication Controller
 * Handles HTTP requests for authentication operations
 */

import authService from '../services/auth.service.js';
import { HTTP_STATUS, API_MESSAGES } from '../../shared/constants/http.constants.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import logger from '../utils/logger.js';

/**
 * Cookie configuration
 * Secure settings for HttpOnly cookies
 */
const getCookieOptions = () => {
  const isHttps = process.env.CLIENT_URL?.startsWith('https://');

  return {
    httpOnly: true, // Prevent XSS attacks
    secure: isHttps, // Only send over HTTPS when the client is served over HTTPS
    sameSite: isHttps ? 'strict' : 'lax', // CSRF protection
    maxAge: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
    path: '/', // Cookie available for all routes
  };
};

const getRefreshCookieOptions = () => {
  const isHttps = process.env.CLIENT_URL?.startsWith('https://');

  return {
    httpOnly: true,
    secure: isHttps,
    sameSite: isHttps ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    path: '/',
  };
};

/**
 * Authentication Controller Class
 * Handles all authentication-related HTTP requests
 */
class AuthController {
  /**
   * Signup - Register a new user
   * POST /api/auth/signup
   * 
   * @param {Request} req - Express request
   * @param {Response} res - Express response
   * @param {NextFunction} next - Express next function
   */
  async signup(req, res, next) {
    try {
      const { name, email, password } = req.body;

      // Register user
      const user = await authService.signup({ name, email, password });

      logger.info('User signup successful', {
        userId: user._id,
        email: user.email,
        ip: req.ip,
      });

      return sendSuccess(
        res,
        HTTP_STATUS.CREATED,
        'Account created successfully. Please log in.',
        user
      );
    } catch (error) {
      logger.error('Signup controller error:', {
        message: error.message,
        email: req.body.email,
        ip: req.ip,
      });

      // Use custom status code if provided
      const statusCode = error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
      return sendError(
        res,
        statusCode,
        error.message || 'Registration failed. Please try again.',
        error.details
      );
    }
  }

  /**
   * Login - Authenticate user and set cookies
   * POST /api/auth/login
   * 
   * @param {Request} req - Express request
   * @param {Response} res - Express response
   * @param {NextFunction} next - Express next function
   */
  async login(req, res, next) {
    try {
      const { email, password } = req.body;

      // Authenticate user
      const { user, accessToken, refreshToken } = await authService.login({
        email,
        password,
      });

      // Set HttpOnly cookies
      res.cookie('accessToken', accessToken, getCookieOptions());
      res.cookie('refreshToken', refreshToken, getRefreshCookieOptions());

      logger.info('User login successful', {
        userId: user._id,
        email: user.email,
        ip: req.ip,
      });

      return sendSuccess(
        res,
        HTTP_STATUS.OK,
        'Login successful',
        {
          user,
          // Don't send tokens in response body - they're in HttpOnly cookies
        }
      );
    } catch (error) {
      logger.error('Login controller error:', {
        message: error.message,
        email: req.body.email,
        ip: req.ip,
      });

      // Use custom status code if provided
      const statusCode = error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
      return sendError(
        res,
        statusCode,
        error.message || 'Login failed. Please try again.'
      );
    }
  }

  /**
   * Logout - Clear authentication cookies
   * POST /api/auth/logout
   * 
   * @param {Request} req - Express request
   * @param {Response} res - Express response
   * @param {NextFunction} next - Express next function
   */
  async logout(req, res, next) {
    try {
      const userId = req.userId;

      // Clear cookies
      res.clearCookie('accessToken', { path: '/' });
      res.clearCookie('refreshToken', { path: '/' });

      logger.info('User logout successful', {
        userId,
        ip: req.ip,
      });

      return sendSuccess(res, HTTP_STATUS.OK, 'Logout successful');
    } catch (error) {
      logger.error('Logout controller error:', {
        message: error.message,
        userId: req.userId,
        ip: req.ip,
      });

      return sendError(
        res,
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        'Logout failed. Please try again.'
      );
    }
  }

  /**
   * Get current user information
   * GET /api/auth/me
   * 
   * @param {Request} req - Express request (user attached by auth middleware)
   * @param {Response} res - Express response
   * @param {NextFunction} next - Express next function
   */
  async getMe(req, res, next) {
    try {
      const userId = req.userId;

      // Get user information
      const user = await authService.getMe(userId);

      logger.debug('User information retrieved', { userId });

      return sendSuccess(res, HTTP_STATUS.OK, 'User retrieved successfully', user);
    } catch (error) {
      logger.error('Get me controller error:', {
        message: error.message,
        userId: req.userId,
        ip: req.ip,
      });

      // Use custom status code if provided
      const statusCode = error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
      return sendError(
        res,
        statusCode,
        error.message || 'Failed to retrieve user information'
      );
    }
  }

  /**
   * Check authentication status (without throwing error)
   * GET /api/auth/status
   * 
   * @param {Request} req - Express request
   * @param {Response} res - Express response
   */
  async checkStatus(req, res) {
    try {
      if (req.user && req.userId) {
        return sendSuccess(res, HTTP_STATUS.OK, 'Authenticated', {
          authenticated: true,
          user: req.user,
        });
      } else {
        return sendSuccess(res, HTTP_STATUS.OK, 'Not authenticated', {
          authenticated: false,
        });
      }
    } catch (error) {
      logger.error('Check status error:', error);
      return sendError(
        res,
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        'Failed to check authentication status'
      );
    }
  }
}

// Export singleton instance
export default new AuthController();
