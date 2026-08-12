/**
 * Axios instance with custom configuration
 * Provides centralized API communication with caching and optimization
 */

import axios from 'axios';
import { API_BASE_URL, API_TIMEOUT, API_HEADERS } from '../constants/api.constants';

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

// In-flight GET requests, keyed so duplicates can be collapsed.
const pendingRequests = new Map();

/**
 * Builds a unique key for a request so identical in-flight calls can be spotted.
 *
 * @param {Object} config - Axios request config
 * @returns {string} Key combining method, url, params and body
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
    if (config.method === 'get') {
      const requestKey = generateRequestKey(config);

      if (pendingRequests.has(requestKey)) {
        if (process.env.NODE_ENV === 'development') {
          console.log('Request deduplicated:', config.url);
        }
        return pendingRequests.get(requestKey);
      }

      pendingRequests.set(requestKey, config);
    }

    // NOTE: `Cache-Control` and `If-None-Match` are intentionally NOT sent from
    // the client. They are non-simple headers that trigger a CORS preflight the
    // API does not allow, which blocked every request. Response caching is
    // handled server-side by the in-memory LRU cache instead.

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
    if (response.config.method === 'get') {
      const requestKey = generateRequestKey(response.config);
      pendingRequests.delete(requestKey);
    }

    const cacheStatus = response.headers['x-cache'];
    if (cacheStatus && process.env.NODE_ENV === 'development') {
      console.log(`Cache status: ${cacheStatus} - ${response.config.url}`);
    }

    return response;
  },
  (error) => {
    if (error.config && error.config.method === 'get') {
      const requestKey = generateRequestKey(error.config);
      pendingRequests.delete(requestKey);
    }

    if (error.response) {
      const message = error.response.data?.message || 'Something went wrong';
      error.message = message;

      // Deliberately no redirect on 401 - the calling context decides what to do.
      if (error.response.status === 401) {
        error.message = message || 'Authentication required. Please log in.';
      }
    } else if (error.request) {
      // Request went out but nothing came back.
      error.message = 'Network error. Please check your connection.';
    } else {
      error.message = 'An unexpected error occurred';
    }

    return Promise.reject(error);
  }
);

export default api;
