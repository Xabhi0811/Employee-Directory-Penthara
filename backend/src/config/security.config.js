/**
 * Security Configuration
 * Centralized security settings for the application
 */

/**
 * Rate Limiting Configuration
 */
export const RATE_LIMIT_CONFIG = {
  // Global rate limit
  GLOBAL: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  },
  
  // Stricter limit for write operations
  WRITE_OPERATIONS: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 30, // 30 requests per windowMs
    message: 'Too many create/update/delete requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  },
  
  // Very strict limit for authentication endpoints (if added in future)
  AUTH: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per windowMs
    message: 'Too many authentication attempts, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  },
};

/**
 * CORS Configuration
 */
export const CORS_CONFIG = {
  // Allowed origins (whitelist)
  allowedOrigins: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
    : ['http://localhost:5173', 'http://localhost:3000'],
  
  // CORS options
  options: {
    credentials: true, // Allow cookies
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
    ],
    exposedHeaders: ['RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset'],
    maxAge: 600, // 10 minutes - how long to cache preflight requests
  },
};

/**
 * Helmet (Security Headers) Configuration
 */
export const HELMET_CONFIG = {
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      fontSrc: ["'self'", 'https:', 'data:'],
      formAction: ["'self'"],
      frameAncestors: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      objectSrc: ["'none'"],
      scriptSrc: ["'self'"],
      scriptSrcAttr: ["'none'"],
      styleSrc: ["'self'", 'https:', "'unsafe-inline'"],
      upgradeInsecureRequests: [],
    },
  },
  
  // HTTP Strict Transport Security
  hsts: {
    maxAge: 31536000, // 1 year in seconds
    includeSubDomains: true,
    preload: true,
  },
  
  // X-Frame-Options
  frameguard: {
    action: 'deny', // Prevent clickjacking
  },
  
  // X-Content-Type-Options
  noSniff: true, // Prevent MIME type sniffing
  
  // X-DNS-Prefetch-Control
  dnsPrefetchControl: {
    allow: false,
  },
  
  // X-Download-Options
  ieNoOpen: true,
  
  // X-Permitted-Cross-Domain-Policies
  permittedCrossDomainPolicies: {
    permittedPolicies: 'none',
  },
  
  // Referrer-Policy
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin',
  },
  
  // X-XSS-Protection
  xssFilter: true,
};

/**
 * Request Size Limits
 */
export const REQUEST_LIMITS = {
  JSON: '100kb', // Limit JSON body size
  URLENCODED: '100kb', // Limit URL-encoded body size
  PARAMETER_LIMIT: 50, // Maximum number of parameters
};

/**
 * Request Timeout
 */
export const REQUEST_TIMEOUT = {
  TIMEOUT_MS: 30000, // 30 seconds
  MESSAGE: 'Request timeout - operation took too long',
};

/**
 * Input Sanitization Rules
 */
export const SANITIZATION_RULES = {
  // Maximum string length to prevent memory exhaustion
  MAX_STRING_LENGTH: 10000,
  
  // Maximum array length
  MAX_ARRAY_LENGTH: 100,
  
  // Maximum object depth to prevent deep nesting attacks
  MAX_OBJECT_DEPTH: 5,
  
  // Disallowed keys (prevent prototype pollution)
  DISALLOWED_KEYS: ['__proto__', 'constructor', 'prototype'],
  
  // Regex patterns to sanitize (prevent ReDoS)
  REGEX_TIMEOUT_MS: 100, // Maximum time for regex execution
  MAX_REGEX_LENGTH: 100, // Maximum regex pattern length
};

/**
 * Mass Assignment Protection
 * Whitelisted fields for each operation
 */
export const ALLOWED_FIELDS = {
  EMPLOYEE_CREATE: [
    'name',
    'role',
    'department',
    'email',
    'phone',
    'joiningDate',
    'employmentType',
    'yearsOfExperience',
    'previousOrganization',
    'previousRole',
    'previousExperienceDescription',
  ],
  
  EMPLOYEE_UPDATE: [
    'name',
    'role',
    'department',
    'email',
    'phone',
    'joiningDate',
    'employmentType',
    'yearsOfExperience',
    'previousOrganization',
    'previousRole',
    'previousExperienceDescription',
  ],
  
  // Fields that should never be directly settable
  FORBIDDEN_FIELDS: [
    '_id',
    'id',
    '__v',
    'createdAt',
    'updatedAt',
    'isActive',
    'isArchived',
  ],
};

/**
 * Security Headers for responses
 */
export const CUSTOM_SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
};

export default {
  RATE_LIMIT_CONFIG,
  CORS_CONFIG,
  HELMET_CONFIG,
  REQUEST_LIMITS,
  REQUEST_TIMEOUT,
  SANITIZATION_RULES,
  ALLOWED_FIELDS,
  CUSTOM_SECURITY_HEADERS,
};
