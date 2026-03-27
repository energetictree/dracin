/**
 * React Hook for Cached API Calls
 * 
 * Provides a convenient way to use cached API calls in React components
 * with loading states, error handling, and manual refresh capability.
 * 
 * @example
 * ```typescript
 * // Basic usage
 * const { data, loading, error, refresh, fromCache } = useCachedApi(
 *   () => fetchLatestDramas(),
 *   []
 * );
 * 
 * // With dependencies
 * const { data, loading, error, refresh } = useCachedApi(
 *   () => fetchDramaDetail(bookId),
 *   [bookId]
 * );
 * 
 * // Force refresh
 * <button onClick={() => refresh(true)}>Force Refresh</button>
 * ```
 */

import { useState, useEffect, useCallback, useRef } from 'react';

interface UseCachedApiOptions {
  enabled?: boolean;      // Whether to fetch on mount (default: true)
  onError?: (error: Error) => void;
  onSuccess?: (data: unknown) => void;
}

interface UseCachedApiResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refresh: (force?: boolean) => Promise<void>;
  fromCache: boolean;
}

export function useCachedApi<T>(
  fetchFn: (forceRefresh?: boolean) => Promise<T>,
  deps: React.DependencyList = [],
  options: UseCachedApiOptions = {}
): UseCachedApiResult<T> {
  const { enabled = true, onError, onSuccess } = options;
  
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [fromCache, setFromCache] = useState<boolean>(false);
  
  // Use ref to track if component is mounted
  const isMounted = useRef(true);
  
  // Track if this is the initial fetch
  const isInitialFetch = useRef(true);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  void isInitialFetch.current;

  const fetchData = useCallback(async (forceRefresh = false) => {
    // Don't set loading true if we have cached data (for smoother UX)
    const hasData = data !== null;
    if (!hasData) {
      setLoading(true);
    }
    setError(null);

    try {
      // Note: The fetchFn should return data directly
      // If using cachedFetch, it returns { data, fromCache }
      // The API functions in dramaApiCached unwrap this for convenience
      const result = await fetchFn(forceRefresh);
      
      if (isMounted.current) {
        setData(result);
        // Check if result indicates it came from cache
        // This depends on your API implementation
        setFromCache(false); // Will be set based on your API
        setLoading(false);
        onSuccess?.(result);
      }
    } catch (err) {
      if (isMounted.current) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        setLoading(false);
        onError?.(error);
      }
    }
  }, [fetchFn, onError, onSuccess, data]);

  // Initial fetch
  useEffect(() => {
    isMounted.current = true;
    
    if (enabled) {
      fetchData(false);
    }
    
    return () => {
      isMounted.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, fetchData, ...deps]);

  // Refresh function that can force refresh
  const refresh = useCallback(async (force = false) => {
    await fetchData(force);
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refresh,
    fromCache,
  };
}

/**
 * Hook to prefetch data for later use
 * Useful for preloading data when hovering over links
 * 
 * @example
 * ```typescript
 * const { prefetch } = usePrefetch(() => fetchDramaDetail(bookId));
 * 
 * <Link 
 *   to={`/drama/${bookId}`}
 *   onMouseEnter={prefetch}
 * >
 *   Drama Title
 * </Link>
 * ```
 */
export function usePrefetch<T>(
  fetchFn: () => Promise<T>
): { prefetch: () => Promise<void>; isPrefetched: boolean } {
  const [isPrefetched, setIsPrefetched] = useState(false);

  const prefetch = useCallback(async () => {
    if (isPrefetched) return;
    
    try {
      await fetchFn();
      setIsPrefetched(true);
    } catch (error) {
      console.warn('Prefetch failed:', error);
    }
  }, [fetchFn, isPrefetched]);

  return { prefetch, isPrefetched };
}

/**
 * Hook to manage cache refresh interval
 * Automatically refreshes data at specified intervals
 * 
 * @example
 * ```typescript
 * const { data, loading } = useCacheRefresh(
 *   () => fetchLatestDramas(),
 *   5 * 60 * 1000 // Refresh every 5 minutes
 * );
 * ```
 */
export function useCacheRefresh<T>(
  fetchFn: (forceRefresh?: boolean) => Promise<T>,
  intervalMs: number,
  immediate = true
): UseCachedApiResult<T> {
  const result = useCachedApi(fetchFn, [], { enabled: immediate });

  useEffect(() => {
    if (intervalMs <= 0) return;

    const intervalId = setInterval(() => {
      result.refresh(true); // Force refresh on interval
    }, intervalMs);

    return () => clearInterval(intervalId);
  }, [intervalMs, result]);

  return result;
}
