/**
 * API Cache Utility
 * 
 * Provides a cachedFetch function that:
 * 1. Checks IndexedDB cache first
 * 2. Returns cached data if available and not expired
 * 3. Fetches from API if no cache or expired
 * 4. Stores new response in cache
 * 
 * Default TTL: 1 day (24 hours = 86400000 ms)
 */

import { cacheDB } from './db';

// Default cache TTL: 1 day in milliseconds
const DEFAULT_TTL = 24 * 60 * 60 * 1000;

interface CacheOptions {
  ttl?: number;          // Time to live in milliseconds
  cacheKey?: string;     // Custom cache key (defaults to URL)
  forceRefresh?: boolean; // Force fetch from API, skip cache
}

interface CachedResponse<T> {
  data: T;
  fromCache: boolean;
  cachedAt?: number;
}

/**
 * Generate a cache key from URL and options
 */
function generateCacheKey(url: string, options?: RequestInit): string {
  // Include method and body in cache key for non-GET requests
  const method = options?.method || 'GET';
  const body = options?.body ? JSON.stringify(options.body) : '';
  return `${method}:${url}:${body}`;
}

/**
 * Fetch with caching support
 * 
 * @param url - The URL to fetch
 * @param options - Fetch options and cache options
 * @returns Promise with data and cache metadata
 * 
 * @example
 * // Basic usage with 1 hour cache
 * const { data, fromCache } = await cachedFetch<Drama[]>('/api/dramas');
 * 
 * @example
 * // Custom TTL (30 minutes)
 * const { data, fromCache } = await cachedFetch<Drama[]>('/api/dramas', {
 *   ttl: 30 * 60 * 1000
 * });
 * 
 * @example
 * // Force refresh (skip cache)
 * const { data, fromCache } = await cachedFetch<Drama[]>('/api/dramas', {
 *   forceRefresh: true
 * });
 */
export async function cachedFetch<T>(
  url: string,
  options?: RequestInit & CacheOptions
): Promise<CachedResponse<T>> {
  const {
    ttl = DEFAULT_TTL,
    cacheKey: customCacheKey,
    forceRefresh = false,
    ...fetchOptions
  } = options || {};

  const cacheKey = customCacheKey || generateCacheKey(url, fetchOptions);

  // Try to get from cache first (unless force refresh)
  if (!forceRefresh) {
    try {
      const cached = await cacheDB.get<T>(cacheKey);
      if (cached !== null) {
        console.log(`[Cache] HIT: ${url}`);
        return {
          data: cached,
          fromCache: true,
          cachedAt: Date.now() - ttl, // Approximate
        };
      }
    } catch (error) {
      console.warn('[Cache] Error reading from cache:', error);
      // Continue to fetch on cache error
    }
  }

  console.log(`[Cache] MISS: ${url}`);

  // Fetch from API
  const response = await fetch(url, fetchOptions);
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();

  // Store in cache
  try {
    await cacheDB.set(cacheKey, data, ttl);
    console.log(`[Cache] STORED: ${url}`);
  } catch (error) {
    console.warn('[Cache] Error writing to cache:', error);
    // Continue even if cache write fails
  }

  return {
    data,
    fromCache: false,
  };
}

/**
 * Clear all cached data
 */
export async function clearCache(): Promise<void> {
  await cacheDB.clear();
  console.log('[Cache] All cache cleared');
}

/**
 * Clear specific cache entry by URL
 */
export async function clearCacheEntry(url: string, options?: RequestInit): Promise<void> {
  const cacheKey = generateCacheKey(url, options);
  await cacheDB.delete(cacheKey);
  console.log(`[Cache] Entry cleared: ${url}`);
}

/**
 * Clean up expired cache entries
 * @returns Number of deleted entries
 */
export async function cleanupExpiredCache(): Promise<number> {
  const count = await cacheDB.cleanup();
  console.log(`[Cache] Cleaned up ${count} expired entries`);
  return count;
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  isSupported: boolean;
  dbName: string;
}> {
  return {
    isSupported: 'indexedDB' in window,
    dbName: 'dracin-api-cache',
  };
}

// Re-export for convenience
export { cacheDB };
export type { CacheOptions, CachedResponse };
