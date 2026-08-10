/**
 * Health Check Controller
 * Provides system health information
 */

import mongoose from 'mongoose';
import { HTTP_STATUS } from '../../shared/constants/http.constants.js';
import logger from '../utils/logger.js';

/**
 * Health check endpoint
 * GET /health
 */
export const healthCheck = async (req, res) => {
  try {
    // Check database connection
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    const isHealthy = dbStatus === 'connected';

    const healthInfo = {
      success: true,
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      database: {
        status: dbStatus,
        name: mongoose.connection.name,
      },
      memory: {
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
        heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB',
      },
    };

    const statusCode = isHealthy ? HTTP_STATUS.OK : HTTP_STATUS.INTERNAL_SERVER_ERROR;

    if (!isHealthy) {
      logger.error('Health check failed', healthInfo);
    }

    res.status(statusCode).json(healthInfo);
  } catch (error) {
    logger.error('Health check error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      status: 'unhealthy',
      message: error.message,
    });
  }
};

/**
 * Simple readiness check
 * GET /ready
 */
export const readinessCheck = (req, res) => {
  const isReady = mongoose.connection.readyState === 1;

  if (isReady) {
    res.status(HTTP_STATUS.OK).json({
      success: true,
      status: 'ready',
    });
  } else {
    res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({
      success: false,
      status: 'not ready',
    });
  }
};

/**
 * Simple liveness check
 * GET /live
 */
export const livenessCheck = (req, res) => {
  res.status(HTTP_STATUS.OK).json({
    success: true,
    status: 'alive',
  });
};
