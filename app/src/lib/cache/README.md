# API Caching System

A robust caching system for API calls using IndexedDB with TTL (Time To Live) support.

## Features

- ✅ **1 Hour Default Cache** - API responses cached for 1 hour by default
- ✅ **IndexedDB Storage** - Persistent storage across browser sessions
- ✅ **Automatic Expiration** - Expired cache entries are auto-deleted
- ✅ **Force Refresh** - Option to bypass cache and fetch fresh data
- ✅ **Custom TTL** - Configure cache duration per request
- ✅ **React Hooks** - Convenient hooks for using cached data in components

## Quick Start

### 1. Use Cached API Functions (Recommended)

Simply replace imports from `dramaApi` to `dramaApiCached`:

```typescript
// Before (no caching)
import { fetchLatestDramas } from '@/services/dramaApi';

// After (with caching)
import { fetchLatestDramas } from '@/services/dramaApiCached';

// Usage is the same
const dramas = await fetchLatestDramas();

// Force refresh (skip cache)
const dramas = await fetchLatestDramas(true);
```

### 2. Use React Hook for Components

```typescript
import { useCachedApi } from '@/hooks/useCachedApi';
import { fetchLatestDramas } from '@/services/dramaApiCached';

function DramaList() {
  const { data, loading, error, refresh } = useCachedApi(
    () => fetchLatestDramas(),
    []
  );

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <button onClick={() => refresh(true)}>Refresh</button>
      {data?.map(drama => <DramaCard key={drama.bookId} drama={drama} />)}
    </div>
  );
}
```

### 3. Advanced: Use cachedFetch Directly

```typescript
import { cachedFetch } from '@/lib/cache';

const { data, fromCache } = await cachedFetch<Drama[]>('/api/dramas', {
  ttl: 30 * 60 * 1000, // 30 minutes instead of 1 hour
});

console.log('Loaded from cache:', fromCache);
```

## Cache Durations

| Endpoint Type | Cache Duration |
|--------------|----------------|
| Drama Lists (latest, trending, etc.) | 1 hour |
| Search Results | 1 hour |
| Episode Lists | 1 hour |
| Drama Details | 30 minutes |

## API Reference

### Cached API Functions

All functions from `dramaApiCached` support an optional `forceRefresh` parameter:

```typescript
// All these functions accept forceRefresh as last parameter
fetchLatestDramas(forceRefresh?: boolean): Promise<Drama[]>
fetchTrendingDramas(forceRefresh?: boolean): Promise<Drama[]>
fetchForYouDramas(page?: number, forceRefresh?: boolean): Promise<Drama[]>
fetchVIPDramas(forceRefresh?: boolean): Promise<Drama[]>
searchDramas(query: string, forceRefresh?: boolean): Promise<Drama[]>
fetchDramaDetail(bookId: string, forceRefresh?: boolean): Promise<DramaDetail | null>
fetchPopularSearches(forceRefresh?: boolean): Promise<string[]>
fetchDubIndoDramas(classify, page, forceRefresh?: boolean): Promise<Drama[]>
fetchAllEpisodesRaw(bookId: string, forceRefresh?: boolean): Promise<EpisodeDataFromApi[]>
fetchAllEpisodes(bookId: string, forceRefresh?: boolean): Promise<EpisodeData[]>
```

### Cache Management

```typescript
import { clearCache, clearCacheEntry, cleanupExpiredCache } from '@/lib/cache';

// Clear all cache
await clearCache();

// Clear specific entry
await clearCacheEntry('/api/dramas');

// Clean up expired entries
const deletedCount = await cleanupExpiredCache();
```

### React Hooks

#### useCachedApi

```typescript
const { data, loading, error, refresh, fromCache } = useCachedApi(
  fetchFn: (forceRefresh?: boolean) => Promise<T>,
  deps: DependencyList,
  options?: { enabled?: boolean; onError?: Function; onSuccess?: Function }
);
```

#### usePrefetch

```typescript
const { prefetch, isPrefetched } = usePrefetch(() => fetchDramaDetail(bookId));

// Use on hover
<Link to={`/drama/${bookId}`} onMouseEnter={prefetch}>Title</Link>
```

#### useCacheRefresh

```typescript
// Auto-refresh every 5 minutes
const { data, loading } = useCacheRefresh(
  () => fetchLatestDramas(),
  5 * 60 * 1000
);
```

## Browser Compatibility

- Chrome/Edge 24+
- Firefox 16+
- Safari 8+
- All modern browsers support IndexedDB

## Console Logs

The cache system logs helpful debug messages:

```
[Cache] HIT: https://api.sansekai.my.id/api/dramabox/latest
[Cache] MISS: https://api.sansekai.my.id/api/dramabox/detail?bookId=123
[Cache] STORED: https://api.sansekai.my.id/api/dramabox/detail?bookId=123
```

## Migration Guide

### Step 1: Update Imports

Replace all imports from `dramaApi` to `dramaApiCached`:

```typescript
// Find and replace in all files:
// FROM:
import { fetchLatestDramas, fetchTrendingDramas } from '@/services/dramaApi';

// TO:
import { fetchLatestDramas, fetchTrendingDramas } from '@/services/dramaApiCached';
```

### Step 2: Add Refresh Buttons (Optional)

If you want users to be able to force refresh:

```typescript
<button onClick={() => refresh(true)}>
  Refresh Data
</button>
```

### Step 3: Test

1. Load the app - first load should hit the API
2. Refresh the page - should load from cache (check console logs)
3. Wait 1 hour - cache should expire and refetch
4. Click "Refresh" button - should force refetch

## Troubleshooting

### Cache Not Working

1. Check browser console for errors
2. Verify IndexedDB is not disabled in browser
3. Check if you're in private/incognito mode (IndexedDB may be limited)

### Clear Cache Manually

Open browser DevTools → Application → IndexedDB → `dracin-api-cache` → Clear all

### Too Much Storage Used

The cache auto-cleans expired entries, but you can manually clean:

```typescript
await cleanupExpiredCache();
```
