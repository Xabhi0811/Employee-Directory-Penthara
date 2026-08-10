/**
 * Cache Middleware
 * Caches API responses with cache invalidation support
 */

import { employeeCache, departmentCache } from '../utils/cache.js';
import logger from '../utils/logger.js';
import crypto from 'crypto';

/**
 * Resolve the full request path including the router mount point.
 *
 * Inside a mounted router `req.path` is relative to the mount (e.g. '/' for the
 * collection route), which makes cache keys ambiguous and impossible to match
 * during invalidation. Combining `baseUrl` with `path` yields a stable,
 * meaningful path such as '/api/employees' or '/api/employees/<id>'.
 *
 * @param {import('express').Request} req
 * @returns {string} Normalised path without a trailing slash
 */
const resolveFullPath = (req) => {
  const full = `${req.baseUrl || ''}${req.path || ''}`;
  // Strip trailing slash so the collection route is '/api/employees', not '/api/employees/'
  return full.length > 1 && full.endsWith('/') ? full.slice(0, -1) : full;
};

/**
 * Generate cache key from request.
 * Format: `<METHOD>:<fullPath>:<hash of query>`
 * The plain-text path prefix is what makes targeted invalidation possible.
 */
const generateCacheKey = (req) => {
  const { method, query } = req;
  const fullPath = resolveFullPath(req);
  const queryString = JSON.stringify(query);

  // Hash only the query so the path stays readable/matchable in the key
  const hash = crypto
    .createHash('md5')
    .update(`${method}:${fullPath}:${queryString}`)
    .digest('hex');

  return `${method}:${fullPath}:${hash}`;
};

/**
 * Cache response middleware
 * @param {Object} options - Cache options
 * @param {string} options.cacheName - Cache name ('employees' or 'departments')
 * @param {number} options.ttl - Time to live in milliseconds
 * @param {Function} options.keyGenerator - Custom key generator function
 */
const cacheResponse = (options = {}) => {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Get cache instance
    const cacheName = options.cacheName || 'employees';
    const cache = cacheName === 'departments' ? departmentCache : employeeCache;
    const ttl = options.ttl || cache.defaultTTL;
    const keyGenerator = options.keyGenerator || generateCacheKey;

    // Generate cache key
    const cacheKey = keyGenerator(req);

    try {
      // Check cache
      const cachedData = cache.get(cacheKey);

      if (cachedData) {
        // Cache hit
        logger.debug('Cache hit', { key: cacheKey });
        
        // Set cache headers
        res.set('X-Cache', 'HIT');
        res.set('X-Cache-Key', cacheKey);
        
        return res.status(200).json(cachedData);
      }

      // Cache miss
      logger.debug('Cache miss', { key: cacheKey });
      res.set('X-Cache', 'MISS');
      res.set('X-Cache-Key', cacheKey);

      // Store original json method
      const originalJson = res.json.bind(res);

      // Override json method to cache response
      res.json = function (data) {
        // Only cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          cache.set(cacheKey, data, ttl);
          logger.debug('Response cached', { key: cacheKey, ttl });
        }

        return originalJson(data);
      };

      next();
    } catch (error) {
      logger.error('Cache middleware error', { error: error.message });
      next();
    }
  };
};

/**
 * Invalidate cache on mutations
 * Clears relevant cache entries when data changes
 * Uses selective invalidation based on operation type
 */
const invalidateCache = (options = {}) => {
  return (req, res, next) => {
    const cacheName = options.cacheName || 'employees';
    const cache = cacheName === 'departments' ? departmentCache : employeeCache;

    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json method to invalidate cache after successful mutation
    res.json = function (data) {
      // Only invalidate on successful mutations (POST, PUT, DELETE)
      if (
        ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method) &&
        res.statusCode >= 200 &&
        res.statusCode < 300
      ) {
        const employeeId = req.params.id;

        if ((req.method === 'PUT' || req.method === 'PATCH') && employeeId) {
          // Targeted invalidation: the updated resource plus every collection
          // listing (any page/filter combination), which may now be stale.
          const collectionPrefix = `GET:${req.baseUrl || ''}:`;
          const resourcePrefix = `GET:${req.baseUrl || ''}/${employeeId}:`;

          const keysToDelete = [];
          for (const key of cache.keys()) {
            if (key.startsWith(resourcePrefix) || key.startsWith(collectionPrefix)) {
              keysToDelete.push(key);
            }
          }
          keysToDelete.forEach((key) => cache.delete(key));

          logger.info('Cache invalidated (update)', {
            cacheName,
            method: req.method,
            employeeId,
            keysInvalidated: keysToDelete.length,
          });
        } else {
          // Create and delete change collection membership and can affect any
          // cached page, so a full clear is the only correct option.
          cache.clear();
          logger.info('Cache invalidated (create/delete)', {
            cacheName,
            method: req.method,
            path: resolveFullPath(req),
          });
        }

        // Employee mutations can add or remove a department, so the derived
        // department list must always be invalidated too.
        if (cacheName === 'employees') {
          departmentCache.clear();
        }
      }

      return originalJson(data);
    };

    next();
  };
};

/**
 * Cache statistics endpoint middleware
 */
const cacheStats = (req, res) => {
  const employeeStats = employeeCache.getStats();
  const departmentStats = departmentCache.getStats();

  res.status(200).json({
    success: true,
    data: {
      employees: employeeStats,
      departments: departmentStats,
    },
  });
};

/**
 * Clear cache endpoint middleware
 */
const clearCache = (req, res) => {
  const { cacheName } = req.query;

  if (cacheName === 'employees') {
    employeeCache.clear();
  } else if (cacheName === 'departments') {
    departmentCache.clear();
  } else {
    employeeCache.clear();
    departmentCache.clear();
  }

  logger.info('Cache cleared via API', { cacheName });

  res.status(200).json({
    success: true,
    message: 'Cache cleared successfully',
  });
};

export { cacheResponse, invalidateCache, cacheStats, clearCache, generateCacheKey };
