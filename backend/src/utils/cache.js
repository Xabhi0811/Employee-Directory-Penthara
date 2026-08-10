/**
 * In-Memory LRU Cache Implementation
 * For caching API responses without Redis dependency
 * Uses Least Recently Used (LRU) eviction policy
 */

import logger from './logger.js';

/**
 * Cache Node for doubly linked list
 */
class CacheNode {
  constructor(key, value) {
    this.key = key;
    this.value = value;
    this.expiry = null;
    this.prev = null;
    this.next = null;
    this.size = this._calculateSize(value);
  }

  /**
   * Calculate approximate size of value in bytes
   */
  _calculateSize(value) {
    const str = JSON.stringify(value);
    return new Blob([str]).size;
  }

  /**
   * Check if node is expired
   */
  isExpired() {
    return this.expiry && Date.now() > this.expiry;
  }
}

/**
 * LRU Cache with TTL support
 */
class LRUCache {
  constructor(options = {}) {
    this.maxSize = options.maxSize || 100 * 1024 * 1024; // 100MB default
    this.maxItems = options.maxItems || 1000;
    this.defaultTTL = options.defaultTTL || 5 * 60 * 1000; // 5 minutes
    
    this.cache = new Map();
    this.head = null; // Most recently used
    this.tail = null; // Least recently used
    this.currentSize = 0;
    this.hits = 0;
    this.misses = 0;
    
    // Start cleanup interval
    this._startCleanup();
  }

  /**
   * Get value from cache
   */
  get(key) {
    const node = this.cache.get(key);
    
    if (!node) {
      this.misses++;
      logger.debug('Cache miss', { key });
      return null;
    }

    // Check if expired
    if (node.isExpired()) {
      this.delete(key);
      this.misses++;
      logger.debug('Cache expired', { key });
      return null;
    }

    // Move to head (most recently used)
    this._moveToHead(node);
    this.hits++;
    logger.debug('Cache hit', { key });
    
    return node.value;
  }

  /**
   * Set value in cache
   */
  set(key, value, ttl = this.defaultTTL) {
    // Check if key exists
    let node = this.cache.get(key);
    
    if (node) {
      // Update existing node
      const oldSize = node.size;
      node.value = value;
      node.size = node._calculateSize(value);
      node.expiry = ttl ? Date.now() + ttl : null;
      
      this.currentSize += (node.size - oldSize);
      this._moveToHead(node);
      
      logger.debug('Cache updated', { key, size: node.size });
    } else {
      // Create new node
      node = new CacheNode(key, value);
      node.expiry = ttl ? Date.now() + ttl : null;
      
      // Add to cache
      this.cache.set(key, node);
      this._addToHead(node);
      this.currentSize += node.size;
      
      logger.debug('Cache set', { key, size: node.size, ttl });
    }

    // Evict if necessary
    this._evictIfNeeded();
  }

  /**
   * Delete key from cache
   */
  delete(key) {
    const node = this.cache.get(key);
    
    if (!node) {
      return false;
    }

    this._removeNode(node);
    this.cache.delete(key);
    this.currentSize -= node.size;
    
    logger.debug('Cache deleted', { key });
    return true;
  }

  /**
   * Check if key exists
   */
  has(key) {
    const node = this.cache.get(key);
    return node && !node.isExpired();
  }

  /**
   * List all cache keys currently held (including not-yet-reaped expired ones).
   * Returns an array rather than an iterator so callers can safely delete
   * entries while iterating.
   *
   * @returns {string[]} Snapshot of cache keys
   */
  keys() {
    return Array.from(this.cache.keys());
  }

  /**
   * Clear all cache
   */
  clear() {
    this.cache.clear();
    this.head = null;
    this.tail = null;
    this.currentSize = 0;
    this.hits = 0;
    this.misses = 0;
    
    logger.info('Cache cleared');
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? (this.hits / total * 100).toFixed(2) : 0;
    
    return {
      items: this.cache.size,
      maxItems: this.maxItems,
      size: this.currentSize,
      maxSize: this.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRate: `${hitRate}%`,
      memoryUsage: `${(this.currentSize / 1024 / 1024).toFixed(2)} MB`,
    };
  }

  /**
   * Move node to head (most recently used)
   * @private
   */
  _moveToHead(node) {
    if (node === this.head) {
      return;
    }

    this._removeNode(node);
    this._addToHead(node);
  }

  /**
   * Add node to head
   * @private
   */
  _addToHead(node) {
    node.next = this.head;
    node.prev = null;

    if (this.head) {
      this.head.prev = node;
    }

    this.head = node;

    if (!this.tail) {
      this.tail = node;
    }
  }

  /**
   * Remove node from linked list
   * @private
   */
  _removeNode(node) {
    if (node.prev) {
      node.prev.next = node.next;
    } else {
      this.head = node.next;
    }

    if (node.next) {
      node.next.prev = node.prev;
    } else {
      this.tail = node.prev;
    }
  }

  /**
   * Evict least recently used items if cache is full
   * @private
   */
  _evictIfNeeded() {
    // Evict by size
    while (this.currentSize > this.maxSize && this.tail) {
      logger.debug('Evicting by size', { key: this.tail.key });
      this.delete(this.tail.key);
    }

    // Evict by count
    while (this.cache.size > this.maxItems && this.tail) {
      logger.debug('Evicting by count', { key: this.tail.key });
      this.delete(this.tail.key);
    }
  }

  /**
   * Start periodic cleanup of expired items
   * @private
   */
  _startCleanup() {
    this._cleanupTimer = setInterval(() => {
      let expired = 0;

      for (const key of this.keys()) {
        const node = this.cache.get(key);
        if (node && node.isExpired()) {
          this.delete(key);
          expired++;
        }
      }

      if (expired > 0) {
        logger.debug('Cache cleanup', { expired });
      }
    }, 60000); // Run every minute

    // Don't let the cleanup timer hold the event loop open. Without this the
    // process (and Jest) will not exit on its own.
    if (typeof this._cleanupTimer.unref === 'function') {
      this._cleanupTimer.unref();
    }
  }

  /**
   * Stop the periodic cleanup timer. Useful for tests and graceful shutdown.
   */
  stopCleanup() {
    if (this._cleanupTimer) {
      clearInterval(this._cleanupTimer);
      this._cleanupTimer = null;
    }
  }
}

/**
 * Cache Manager
 * Manages multiple cache instances
 */
class CacheManager {
  constructor() {
    this.caches = new Map();
  }

  /**
   * Create or get cache instance
   */
  createCache(name, options = {}) {
    if (this.caches.has(name)) {
      return this.caches.get(name);
    }

    const cache = new LRUCache(options);
    this.caches.set(name, cache);
    
    logger.info('Cache created', { name, options });
    return cache;
  }

  /**
   * Get cache instance
   */
  getCache(name) {
    return this.caches.get(name);
  }

  /**
   * Clear specific cache
   */
  clearCache(name) {
    const cache = this.caches.get(name);
    if (cache) {
      cache.clear();
    }
  }

  /**
   * Clear all caches
   */
  clearAll() {
    for (const cache of this.caches.values()) {
      cache.clear();
    }
    logger.info('All caches cleared');
  }

  /**
   * Get statistics for all caches
   */
  getAllStats() {
    const stats = {};
    
    for (const [name, cache] of this.caches.entries()) {
      stats[name] = cache.getStats();
    }

    return stats;
  }
}

// Create singleton instance
const cacheManager = new CacheManager();

// Create default caches with environment-based configuration
const employeeCache = cacheManager.createCache('employees', {
  maxSize: parseInt(process.env.EMPLOYEE_CACHE_SIZE) || 50 * 1024 * 1024, // 50MB
  maxItems: parseInt(process.env.EMPLOYEE_CACHE_ITEMS) || 500,
  defaultTTL: parseInt(process.env.EMPLOYEE_CACHE_TTL) || 5 * 60 * 1000, // 5 minutes
});

const departmentCache = cacheManager.createCache('departments', {
  maxSize: parseInt(process.env.DEPARTMENT_CACHE_SIZE) || 1 * 1024 * 1024, // 1MB
  maxItems: parseInt(process.env.DEPARTMENT_CACHE_ITEMS) || 100,
  defaultTTL: parseInt(process.env.DEPARTMENT_CACHE_TTL) || 10 * 60 * 1000, // 10 minutes
});

export { LRUCache, cacheManager, employeeCache, departmentCache };
export default cacheManager;
