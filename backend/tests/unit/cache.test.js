/**
 * LRU Cache Tests
 *
 * The cache backs every read endpoint, so its eviction and expiry rules are
 * correctness-critical: a bug here shows up as users being served stale or
 * missing data.
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { LRUCache, cacheManager } from '../../src/utils/cache.js';

let cache;

beforeEach(() => {
  cache = new LRUCache({ maxItems: 3, defaultTTL: 1000 });
});

afterEach(() => {
  // Release the periodic cleanup timer created by each instance
  cache.stopCleanup();
});

describe('LRUCache', () => {
  describe('basic operations', () => {
    it('should store and retrieve a value', () => {
      cache.set('a', { value: 1 });

      expect(cache.get('a')).toEqual({ value: 1 });
    });

    it('should return null for a missing key', () => {
      expect(cache.get('nope')).toBeNull();
    });

    it('should overwrite an existing key rather than duplicating it', () => {
      cache.set('a', { value: 1 });
      cache.set('a', { value: 2 });

      expect(cache.get('a')).toEqual({ value: 2 });
      expect(cache.keys()).toEqual(['a']);
    });

    it('should report presence with has()', () => {
      cache.set('a', 1);

      expect(cache.has('a')).toBe(true);
      expect(cache.has('b')).toBeFalsy();
    });

    it('should delete a key and report whether it existed', () => {
      cache.set('a', 1);

      expect(cache.delete('a')).toBe(true);
      expect(cache.delete('a')).toBe(false);
      expect(cache.get('a')).toBeNull();
    });

    it('should clear every entry and reset counters', () => {
      cache.set('a', 1);
      cache.set('b', 2);
      cache.get('a'); // register a hit

      cache.clear();

      expect(cache.keys()).toEqual([]);
      const stats = cache.getStats();
      expect(stats.items).toBe(0);
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });

    it('should expose a snapshot of keys that is safe to mutate during iteration', () => {
      cache.set('a', 1);
      cache.set('b', 2);

      const keys = cache.keys();
      keys.forEach((key) => cache.delete(key));

      expect(cache.keys()).toEqual([]);
    });
  });

  describe('TTL expiry', () => {
    it('should treat an entry as missing once its TTL has elapsed', async () => {
      cache.set('a', 1, 20);

      expect(cache.get('a')).toBe(1);

      await new Promise((resolve) => setTimeout(resolve, 40));

      expect(cache.get('a')).toBeNull();
    });

    it('should keep an entry indefinitely when TTL is falsy', async () => {
      cache.set('a', 1, 0);

      await new Promise((resolve) => setTimeout(resolve, 30));

      expect(cache.get('a')).toBe(1);
    });
  });

  describe('LRU eviction', () => {
    it('should evict the least recently used entry when over maxItems', () => {
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);

      // 'a' is the least recently used at this point
      cache.set('d', 4);

      expect(cache.get('a')).toBeNull();
      expect(cache.get('d')).toBe(4);
      expect(cache.keys()).toHaveLength(3);
    });

    it('should treat a read as recent use and spare that entry', () => {
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);

      cache.get('a'); // 'a' becomes most recently used, 'b' least
      cache.set('d', 4);

      expect(cache.get('a')).toBe(1);
      expect(cache.get('b')).toBeNull();
    });

    it('should evict by total size when maxSize is exceeded', () => {
      const small = new LRUCache({ maxSize: 200, maxItems: 100 });
      try {
        small.set('a', 'x'.repeat(150));
        small.set('b', 'y'.repeat(150));

        // Both cannot fit within 200 bytes, so the older entry is evicted
        expect(small.get('a')).toBeNull();
        expect(small.get('b')).not.toBeNull();
      } finally {
        small.stopCleanup();
      }
    });
  });

  describe('getStats', () => {
    it('should track hits, misses and hit rate', () => {
      cache.set('a', 1);

      cache.get('a'); // hit
      cache.get('a'); // hit
      cache.get('b'); // miss

      const stats = cache.getStats();

      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe('66.67%');
      expect(stats.items).toBe(1);
    });

    it('should report a zero hit rate before any access', () => {
      expect(cache.getStats().hitRate).toBe('0%');
    });
  });
});

describe('cacheManager', () => {
  it('should return the same instance for a repeated name', () => {
    const first = cacheManager.createCache('unit-test-cache');
    const second = cacheManager.createCache('unit-test-cache');

    expect(first).toBe(second);
    expect(cacheManager.getCache('unit-test-cache')).toBe(first);
  });

  it('should clear a single named cache', () => {
    const instance = cacheManager.createCache('unit-clear-one');
    instance.set('a', 1);

    cacheManager.clearCache('unit-clear-one');

    expect(instance.get('a')).toBeNull();
  });

  it('should clear every registered cache', () => {
    const a = cacheManager.createCache('unit-clear-a');
    const b = cacheManager.createCache('unit-clear-b');
    a.set('k', 1);
    b.set('k', 2);

    cacheManager.clearAll();

    expect(a.get('k')).toBeNull();
    expect(b.get('k')).toBeNull();
  });

  it('should aggregate stats across caches', () => {
    cacheManager.createCache('unit-stats');

    const stats = cacheManager.getAllStats();

    expect(stats).toHaveProperty('unit-stats');
    expect(stats['unit-stats']).toHaveProperty('hitRate');
  });
});
