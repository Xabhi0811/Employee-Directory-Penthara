/**
 * HTTP Caching Middleware
 * Implements Cache-Control, ETag, and conditional requests
 */

import crypto from 'crypto';
import logger from '../utils/logger.js';

/**
 * Generate ETag from response data
 */
const generateETag = (data) => {
  const hash = crypto
    .createHash('md5')
    .update(JSON.stringify(data))
    .digest('hex');
  return `"${hash}"`;
};

/**
 * Set Cache-Control headers based on route
 */
const setCacheControl = (options = {}) => {
  return (req, res, next) => {
    const {
      maxAge = 300, // 5 minutes default
      sMaxAge,
      staleWhileRevalidate = 60,
      staleIfError = 3600,
      public: isPublic = true,
      private: isPrivate = false,
      noCache = false,
      noStore = false,
      mustRevalidate = false,
    } = options;

    // Build Cache-Control header
    const directives = [];

    if (noStore) {
      directives.push('no-store');
    } else if (noCache) {
      directives.push('no-cache');
    } else {
      if (isPublic) directives.push('public');
      if (isPrivate) directives.push('private');
      if (maxAge) directives.push(`max-age=${maxAge}`);
      if (sMaxAge) directives.push(`s-maxage=${sMaxAge}`);
      if (mustRevalidate) directives.push('must-revalidate');
      if (staleWhileRevalidate) directives.push(`stale-while-revalidate=${staleWhileRevalidate}`);
      if (staleIfError) directives.push(`stale-if-error=${staleIfError}`);
    }

    res.set('Cache-Control', directives.join(', '));
    next();
  };
};

/**
 * ETag middleware with conditional request support
 */
const etag = (options = {}) => {
  return (req, res, next) => {
    const { weak = false } = options;

    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json method to add ETag
    res.json = function (data) {
      // Generate ETag
      const etagValue = generateETag(data);
      const etagHeader = weak ? `W/${etagValue}` : etagValue;

      // Set ETag header
      res.set('ETag', etagHeader);

      // Check If-None-Match header for conditional requests
      const ifNoneMatch = req.headers['if-none-match'];
      
      if (ifNoneMatch) {
        // Remove W/ prefix if present
        const clientETag = ifNoneMatch.replace(/^W\//, '');
        const serverETag = etagValue.replace(/^W\//, '');

        if (clientETag === serverETag) {
          // ETag matches - return 304 Not Modified
          logger.debug('ETag match - returning 304', {
            url: req.url,
            etag: etagValue,
          });
          
          res.status(304);
          return res.end();
        }
      }

      // ETag doesn't match or not provided - return full response
      return originalJson(data);
    };

    next();
  };
};

/**
 * Last-Modified header support
 */
const lastModified = (getTimestamp) => {
  return (req, res, next) => {
    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json method to add Last-Modified
    res.json = function (data) {
      // Get timestamp from function or data
      const timestamp = typeof getTimestamp === 'function' 
        ? getTimestamp(data) 
        : new Date();

      // Set Last-Modified header
      res.set('Last-Modified', timestamp.toUTCString());

      // Check If-Modified-Since header
      const ifModifiedSince = req.headers['if-modified-since'];
      
      if (ifModifiedSince) {
        const clientDate = new Date(ifModifiedSince);
        const serverDate = new Date(timestamp);

        if (clientDate >= serverDate) {
          // Not modified - return 304
          logger.debug('Resource not modified - returning 304', {
            url: req.url,
            lastModified: timestamp,
          });
          
          res.status(304);
          return res.end();
        }
      }

      // Modified or not provided - return full response
      return originalJson(data);
    };

    next();
  };
};

/**
 * Vary header to indicate response variance
 */
const vary = (headers = []) => {
  return (req, res, next) => {
    const varyHeaders = Array.isArray(headers) ? headers : [headers];
    res.set('Vary', varyHeaders.join(', '));
    next();
  };
};

/**
 * Predefined cache configurations
 */
const cacheConfigs = {
  // No caching - for sensitive data
  noCache: {
    noStore: true,
  },

  // Short cache - for frequently changing data (5 minutes)
  short: {
    maxAge: 300,
    public: true,
    staleWhileRevalidate: 60,
  },

  // Medium cache - for moderately changing data (30 minutes)
  medium: {
    maxAge: 1800,
    public: true,
    staleWhileRevalidate: 300,
  },

  // Long cache - for rarely changing data (1 hour)
  long: {
    maxAge: 3600,
    public: true,
    staleWhileRevalidate: 600,
  },

  // Static cache - for immutable data (1 year)
  static: {
    maxAge: 31536000,
    public: true,
    immutable: true,
  },
};

/**
 * Apply cache configuration by name
 */
const applyCacheConfig = (configName) => {
  const config = cacheConfigs[configName] || cacheConfigs.short;
  return setCacheControl(config);
};

export {
  setCacheControl,
  etag,
  lastModified,
  vary,
  generateETag,
  cacheConfigs,
  applyCacheConfig,
};
