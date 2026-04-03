/**
 * Cache Module
 * 
 * Provides cached fetch functionality with IndexedDB storage and TTL support.
 * 
 * Usage:
 * ```typescript
 * import { cachedFetch, clearCache } from '@/lib/cache';
 * 
 * // Fetch with default 1 hour cache
 * const { data, fromCache } = await cachedFetch<Drama[]>('/api/dramas');
 * 
 * // Fetch with custom TTL (30 minutes)
 * const { data, fromCache } = await cachedFetch<Drama[]>('/api/dramas', {
 *   ttl: 30 * 60 * 1000
 * });
 * 
 * // Force refresh (skip cache)
 * const { data, fromCache } = await cachedFetch<Drama[]>('/api/dramas', {
 *   forceRefresh: true
 * });
 * 
 * // Clear all cache
 * await clearCache();
 * ```
 */

export { cachedFetch, clearCache, clearCacheEntry, cleanupExpiredCache, getCacheStats } from './apiCache';
export type { CacheOptions, CachedResponse } from './apiCache';
export { cacheDB } from './db';
