/**
 * Axios instance with custom configuration
 * Provides centralized API communication with caching and optimization
 */

import axios from 'axios';
import { API_BASE_URL, API_TIMEOUT, API_HEADERS } from '../constants/api.constants';

/**
 * Create axios instance with default configuration
 */
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  withCredentials: true, // Send cookies with requests for authentication
  headers: {
    ...API_HEADERS,
    // NOTE: `Accept-Encoding` is intentionally NOT set here. Browsers manage it
    // automatically and forbid scripts from setting it ("Refused to set unsafe
    // header"). Compression negotiation happens without any client code.
  },
});

// PERFORMANCE: Track pending requests for deduplication
const pendingRequests = new Map();

/**
 * Generate request key for deduplication
 */
const generateRequestKey = (config) => {
  const { method, url, params, data } = config;
  return `${method}:${url}:${JSON.stringify(params)}:${JSON.stringify(data)}`;
};

/**
 * Request interceptor
 * Add authentication token, deduplication, and optimization headers
 */
api.interceptors.request.use(
  (config) => {
    // PERFORMANCE: Request deduplication for GET requests
    if (config.method === 'get') {
      const requestKey = generateRequestKey(config);
      
      if (pendingRequests.has(requestKey)) {
        // Return existing pending request
        if (process.env.NODE_ENV === 'development') {
          console.log('🔄 Request deduplicated:', config.url);
        }
        return pendingRequests.get(requestKey);
      }
      
      // Store pending request
      pendingRequests.set(requestKey, config);
    }

    // NOTE: `Cache-Control` and `If-None-Match` are intentionally NOT sent from
    // the client. They are non-simple headers that trigger a CORS preflight the
    // API does not allow, which blocked every request. Response caching is
    // handled server-side by the in-memory LRU cache instead.

    // Can add auth token here in future
    // config.headers.Authorization = `Bearer ${token}`;
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response interceptor
 * Handle errors globally and clean up tracked pending requests
 */
api.interceptors.response.use(
  (response) => {
    // PERFORMANCE: Cleanup pending request
    if (response.config.method === 'get') {
      const requestKey = generateRequestKey(response.config);
      pendingRequests.delete(requestKey);
    }

    // PERFORMANCE: Log cache status
    const cacheStatus = response.headers['x-cache'];
    if (cacheStatus && process.env.NODE_ENV === 'development') {
      console.log(`📦 Cache status: ${cacheStatus} - ${response.config.url}`);
    }

    return response;
  },
  (error) => {
    // PERFORMANCE: Cleanup pending request on error
    if (error.config && error.config.method === 'get') {
      const requestKey = generateRequestKey(error.config);
      pendingRequests.delete(requestKey);
    }

    // Handle different error scenarios
    if (error.response) {
      // Server responded with error status
      const message = error.response.data?.message || 'Something went wrong';
      error.message = message;
      
      // Handle 401 Unauthorized - authentication required
      if (error.response.status === 401) {
        // Don't redirect here - let the component/context handle it
        error.message = message || 'Authentication required. Please log in.';
      }
    } else if (error.request) {
      // Request made but no response received
      error.message = 'Network error. Please check your connection.';
    } else {
      // Something else happened
      error.message = 'An unexpected error occurred';
    }

    return Promise.reject(error);
  }
);

export default api;
