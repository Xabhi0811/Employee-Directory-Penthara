/**
 * Authentication Middleware
 * Verifies JWT tokens and protects routes
 */

import { verifyAccessToken } from '../utils/jwt.utils.js';
import User from '../models/User.js';
import { HTTP_STATUS } from '../../shared/constants/http.constants.js';
import logger from '../utils/logger.js';

/**
 * Extract token from cookie or Authorization header
 * 
 * @param {Request} req - Express request object
 * @returns {string|null} - JWT token or null if not found
 */
const extractToken = (req) => {
  // First, check cookies (preferred method)
  if (req.cookies && req.cookies.accessToken) {
    return req.cookies.accessToken;
  }

  // Fallback: Check Authorization header (Bearer token)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7); // Remove 'Bearer ' prefix
  }

  return null;
};

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request
 * 
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 * @param {NextFunction} next - Express next function
 */
export const authenticate = async (req, res, next) => {
  try {
    // Extract token from cookie or header
    const token = extractToken(req);

    if (!token) {
      logger.warn('Authentication failed: No token provided', {
        path: req.path,
        method: req.method,
        ip: req.ip,
      });
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: 'Authentication required. Please log in.',
      });
    }

    // Verify token
    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (error) {
      logger.warn('Authentication failed: Invalid token', {
        path: req.path,
        method: req.method,
        error: error.message,
        ip: req.ip,
      });
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: error.message === 'Token expired' 
          ? 'Your session has expired. Please log in again.' 
          : 'Invalid authentication token. Please log in again.',
      });
    }

    // Find user by ID from token
    const user = await User.findById(decoded.userId).select('-passwordHash');
    
    if (!user) {
      logger.warn('Authentication failed: User not found', {
        userId: decoded.userId,
        path: req.path,
        method: req.method,
      });
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: 'User not found. Please log in again.',
      });
    }

    // Attach user to request object for use in subsequent middleware/controllers
    req.user = user;
    req.userId = user._id;

    logger.debug('User authenticated successfully', {
      userId: user._id,
      email: user.email,
      path: req.path,
    });

    next();
  } catch (error) {
    logger.error('Authentication middleware error:', {
      error: error.message,
      stack: error.stack,
      path: req.path,
      method: req.method,
    });
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Authentication error. Please try again.',
    });
  }
};

/**
 * Optional authentication middleware
 * Attaches user to request if token is present and valid, but doesn't block if missing
 * Useful for routes that can work with or without authentication
 * 
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 * @param {NextFunction} next - Express next function
 */
export const optionalAuthenticate = async (req, res, next) => {
  try {
    const token = extractToken(req);

    if (!token) {
      // No token, but that's okay for optional auth
      return next();
    }

    // Try to verify token
    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (error) {
      // Invalid token, but that's okay for optional auth
      logger.debug('Optional auth: Invalid token', { error: error.message });
      return next();
    }

    // Find user
    const user = await User.findById(decoded.userId).select('-passwordHash');
    
    if (user) {
      req.user = user;
      req.userId = user._id;
      logger.debug('Optional auth: User authenticated', { userId: user._id });
    }

    next();
  } catch (error) {
    logger.error('Optional authentication middleware error:', error);
    // Don't block request on error, just continue without user
    next();
  }
};

/**
 * Check if user is authenticated (utility for conditional logic)
 * 
 * @param {Request} req - Express request
 * @returns {boolean} - True if user is authenticated
 */
export const isAuthenticated = (req) => {
  return req.user && req.userId;
};

export default authenticate;
