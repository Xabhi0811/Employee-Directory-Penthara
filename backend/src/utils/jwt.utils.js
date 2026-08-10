import jwt from 'jsonwebtoken';
import logger from './logger.js';

/**
 * @fileoverview JWT Utilities - Token generation and verification
 * @module utils/jwt
 * @requires jsonwebtoken
 * @requires utils/logger
 */

/**
 * Validate JWT configuration
 * Ensures required environment variables are set
 */
const validateJWTConfig = () => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is not set');
  }
  if (!process.env.JWT_EXPIRES_IN) {
    throw new Error('JWT_EXPIRES_IN environment variable is not set');
  }
};

/**
 * Generate JWT access token
 * 
 * @param {Object} payload - Token payload (typically user ID and email)
 * @param {string} payload.userId - User ID
 * @param {string} payload.email - User email
 * @returns {string} - Signed JWT token
 * @throws {Error} - If token generation fails
 */
export const generateAccessToken = (payload) => {
  try {
    validateJWTConfig();

    const token = jwt.sign(
      {
        userId: payload.userId,
        email: payload.email,
        type: 'access',
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || '24h',
        issuer: 'employee-directory',
        audience: 'employee-directory-client',
      }
    );

    logger.debug('Access token generated', { userId: payload.userId });
    return token;
  } catch (error) {
    logger.error('Error generating access token:', error);
    throw new Error('Failed to generate access token');
  }
};

/**
 * Generate JWT refresh token
 * 
 * @param {Object} payload - Token payload
 * @param {string} payload.userId - User ID
 * @returns {string} - Signed JWT refresh token
 * @throws {Error} - If token generation fails
 */
export const generateRefreshToken = (payload) => {
  try {
    if (!process.env.REFRESH_TOKEN_SECRET) {
      throw new Error('REFRESH_TOKEN_SECRET environment variable is not set');
    }

    const token = jwt.sign(
      {
        userId: payload.userId,
        type: 'refresh',
      },
      process.env.REFRESH_TOKEN_SECRET,
      {
        expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
        issuer: 'employee-directory',
        audience: 'employee-directory-client',
      }
    );

    logger.debug('Refresh token generated', { userId: payload.userId });
    return token;
  } catch (error) {
    logger.error('Error generating refresh token:', error);
    throw new Error('Failed to generate refresh token');
  }
};

/**
 * Verify JWT access token
 * 
 * @param {string} token - JWT token to verify
 * @returns {Object} - Decoded token payload
 * @throws {Error} - If token is invalid, expired, or verification fails
 */
export const verifyAccessToken = (token) => {
  try {
    validateJWTConfig();

    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: 'employee-directory',
      audience: 'employee-directory-client',
    });

    // Verify token type
    if (decoded.type !== 'access') {
      throw new Error('Invalid token type');
    }

    logger.debug('Access token verified', { userId: decoded.userId });
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      logger.warn('Access token expired');
      throw new Error('Token expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      logger.warn('Invalid access token:', error.message);
      throw new Error('Invalid token');
    } else {
      logger.error('Error verifying access token:', error);
      throw new Error('Token verification failed');
    }
  }
};

/**
 * Verify JWT refresh token
 * 
 * @param {string} token - JWT refresh token to verify
 * @returns {Object} - Decoded token payload
 * @throws {Error} - If token is invalid, expired, or verification fails
 */
export const verifyRefreshToken = (token) => {
  try {
    if (!process.env.REFRESH_TOKEN_SECRET) {
      throw new Error('REFRESH_TOKEN_SECRET environment variable is not set');
    }

    const decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET, {
      issuer: 'employee-directory',
      audience: 'employee-directory-client',
    });

    // Verify token type
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }

    logger.debug('Refresh token verified', { userId: decoded.userId });
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      logger.warn('Refresh token expired');
      throw new Error('Refresh token expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      logger.warn('Invalid refresh token:', error.message);
      throw new Error('Invalid refresh token');
    } else {
      logger.error('Error verifying refresh token:', error);
      throw new Error('Refresh token verification failed');
    }
  }
};

/**
 * Decode token without verification (for debugging only)
 * WARNING: Never use this for authentication/authorization
 * 
 * @param {string} token - JWT token to decode
 * @returns {Object|null} - Decoded token payload or null if invalid
 */
export const decodeToken = (token) => {
  try {
    const decoded = jwt.decode(token);
    return decoded;
  } catch (error) {
    logger.error('Error decoding token:', error);
    return null;
  }
};

/**
 * Get token expiration time
 * 
 * @param {string} token - JWT token
 * @returns {Date|null} - Expiration date or null if invalid
 */
export const getTokenExpiration = (token) => {
  try {
    const decoded = jwt.decode(token);
    if (decoded && decoded.exp) {
      return new Date(decoded.exp * 1000); // Convert Unix timestamp to Date
    }
    return null;
  } catch (error) {
    logger.error('Error getting token expiration:', error);
    return null;
  }
};

export default {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  decodeToken,
  getTokenExpiration,
};
