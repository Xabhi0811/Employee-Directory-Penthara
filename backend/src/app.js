import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import employeeRoutes from './routes/employee.routes.js';
import departmentRoutes from './routes/department.routes.js';
import authRoutes from './routes/auth.routes.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';
import requestLogger from './middlewares/requestLogger.js';
import { healthCheck, readinessCheck, livenessCheck } from './controllers/health.controller.js';
import { CORS_CONFIG, HELMET_CONFIG, REQUEST_LIMITS } from './config/security.config.js';
import { globalRateLimiter } from './middlewares/rateLimit.middleware.js';
import sanitizationMiddleware from './middlewares/sanitization.middleware.js';
import {
  requestSecurityMiddleware,
  bodyParserErrorHandler,
} from './middlewares/requestSecurity.middleware.js';
import { cacheStats, clearCache } from './middlewares/cache.middleware.js';

/**
 * CORS origin validation function
 */
const corsOriginValidator = (origin, callback) => {
  // Allow requests with no origin (mobile apps, Postman, etc.)
  if (!origin) {
    return callback(null, true);
  }

  // Check if origin is in whitelist
  if (CORS_CONFIG.allowedOrigins.includes(origin)) {
    callback(null, true);
  } else {
    callback(new Error('Not allowed by CORS'));
  }
};

/**
 * Create and configure Express application
 */
const createApp = () => {
  const app = express();

  // ======================
  // SECURITY MIDDLEWARE (Order is important!)
  // ======================

  // 1. Request security (timeout, size limits, HPP)
  app.use(requestSecurityMiddleware);

  // 2. Compression - Enable gzip/deflate compression (PERFORMANCE)
  app.use(
    compression({
      filter: (req, res) => {
        // Don't compress responses if explicitly disabled
        if (req.headers['x-no-compression']) {
          return false;
        }
        // Use compression filter function
        return compression.filter(req, res);
      },
      level: 6, // Compression level (0-9, 6 is balanced)
      threshold: 1024, // Only compress responses larger than 1KB
      memLevel: 8, // Memory level (1-9, 8 is balanced)
    })
  );

  // 3. Helmet - Security headers (must be early to set headers)
  app.use(helmet(HELMET_CONFIG));

  // 4. CORS configuration with whitelist validation
  app.use(
    cors({
      origin: corsOriginValidator,
      ...CORS_CONFIG.options,
    })
  );

  // 5. Cookie parser - Parse cookies for authentication
  app.use(cookieParser());

  // 6. Body parser middleware with strict size limits
  app.use(
    express.json({
      limit: REQUEST_LIMITS.JSON,
      strict: true, // Only accept arrays and objects
    })
  );
  app.use(
    express.urlencoded({
      extended: true,
      limit: REQUEST_LIMITS.URLENCODED,
      parameterLimit: REQUEST_LIMITS.PARAMETER_LIMIT,
    })
  );

  // 7. Body parser error handler
  app.use(bodyParserErrorHandler);

  // 8. Input sanitization (NoSQL injection, XSS, prototype pollution)
  app.use(sanitizationMiddleware);

  // 9. Global rate limiting
  app.use(globalRateLimiter);

  // 10. Request logging middleware
  if (process.env.NODE_ENV !== 'test') {
    app.use(requestLogger);
  }

  // ======================
  // HEALTH CHECK ROUTES (before rate limiting and auth)
  // ======================
  app.get('/health', healthCheck);
  app.get('/ready', readinessCheck);
  app.get('/live', livenessCheck);

  // Cache management routes (for monitoring and debugging)
  app.get('/api/cache/stats', cacheStats);
  app.post('/api/cache/clear', clearCache);

  // ======================
  // API ROUTES
  // ======================
  app.use('/api/auth', authRoutes);
  app.use('/api/employees', employeeRoutes);
  app.use('/api/departments', departmentRoutes);

  // ======================
  // ERROR HANDLERS (must be last)
  // ======================

  // 404 handler (must be after all routes)
  app.use(notFoundHandler);

  // Global error handler (must be last)
  app.use(errorHandler);

  return app;
};

export default createApp;
