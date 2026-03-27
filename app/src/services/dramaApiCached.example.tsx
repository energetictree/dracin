/**
 * Example: How to use the cached API in components
 * 
 * This file shows how to migrate from the non-cached API to the cached API.
 */

// =============================================================================
// EXAMPLE 1: Simple Component
// =============================================================================

// BEFORE: Without caching
/*
import { useState, useEffect } from 'react';
import { fetchLatestDramas } from '@/services/dramaApi';

function LatestDramas() {
  const [dramas, setDramas] = useState<Drama[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLatestDramas().then(data => {
      setDramas(data);
      setLoading(false);
    });
  }, []);

  if (loading) return <div>Loading...</div>;
  return <div>{dramas.map(d => <DramaCard key={d.bookId} drama={d} />)}</div>;
}
*/

// AFTER: With caching
/*
import { useCachedApi } from '@/hooks/useCachedApi';
import { fetchLatestDramas } from '@/services/dramaApiCached';

function LatestDramas() {
  const { data: dramas, loading } = useCachedApi(
    () => fetchLatestDramas(),
    []
  );

  if (loading) return <div>Loading...</div>;
  return <div>{dramas?.map(d => <DramaCard key={d.bookId} drama={d} />)}</div>;
}
*/

// =============================================================================
// EXAMPLE 2: With Refresh Button
// =============================================================================

// BEFORE: Without caching
/*
function DramaList() {
  const [dramas, setDramas] = useState<Drama[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDramas = async () => {
    setLoading(true);
    const data = await fetchLatestDramas();
    setDramas(data);
    setLoading(false);
  };

  useEffect(() => {
    loadDramas();
  }, []);

  return (
    <div>
      <button onClick={loadDramas} disabled={loading}>
        Refresh
      </button>
      {loading ? <Spinner /> : dramas.map(d => <DramaCard key={d.bookId} drama={d} />)}
    </div>
  );
}
*/

// AFTER: With caching and force refresh
/*
import { useCachedApi } from '@/hooks/useCachedApi';
import { fetchLatestDramas } from '@/services/dramaApiCached';

function DramaList() {
  const { data: dramas, loading, refresh } = useCachedApi(
    () => fetchLatestDramas(),
    []
  );

  return (
    <div>
      <button onClick={() => refresh(true)} disabled={loading}>
        Refresh
      </button>
      {loading ? <Spinner /> : dramas?.map(d => <DramaCard key={d.bookId} drama={d} />)}
    </div>
  );
}
*/

// =============================================================================
// EXAMPLE 3: With URL Parameters
// =============================================================================

// BEFORE: Without caching
/*
function DramaDetail({ bookId }: { bookId: string }) {
  const [drama, setDrama] = useState<DramaDetail | null>(null);

  useEffect(() => {
    fetchDramaDetail(bookId).then(setDrama);
  }, [bookId]);

  return <div>{drama?.bookName}</div>;
}
*/

// AFTER: With caching - cache key automatically includes bookId
/*
import { useCachedApi } from '@/hooks/useCachedApi';
import { fetchDramaDetail } from '@/services/dramaApiCached';

function DramaDetail({ bookId }: { bookId: string }) {
  const { data: drama } = useCachedApi(
    () => fetchDramaDetail(bookId),
    [bookId]  // Will refetch when bookId changes
  );

  return <div>{drama?.bookName}</div>;
}
*/

// =============================================================================
// EXAMPLE 4: Search with Debounce
// =============================================================================

// AFTER: With caching - search results cached per query
/*
import { useState } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { useCachedApi } from '@/hooks/useCachedApi';
import { searchDramas } from '@/services/dramaApiCached';

function SearchDramas() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);

  const { data: results, loading } = useCachedApi(
    () => debouncedQuery ? searchDramas(debouncedQuery) : Promise.resolve([]),
    [debouncedQuery]
  );

  return (
    <div>
      <input 
        value={query} 
        onChange={e => setQuery(e.target.value)} 
        placeholder="Search dramas..."
      />
      {loading && <Spinner />}
      {results?.map(d => <DramaCard key={d.bookId} drama={d} />)}
    </div>
  );
}
*/

// =============================================================================
// EXAMPLE 5: Prefetch on Hover (Performance Optimization)
// =============================================================================

/*
import { usePrefetch } from '@/hooks/useCachedApi';
import { fetchDramaDetail } from '@/services/dramaApiCached';

function DramaLink({ bookId, title }: { bookId: string; title: string }) {
  const { prefetch } = usePrefetch(() => fetchDramaDetail(bookId));

  return (
    <Link 
      to={`/drama/${bookId}`}
      onMouseEnter={prefetch}  // Starts loading when user hovers
    >
      {title}
    </Link>
  );
}
*/

// =============================================================================
// EXAMPLE 6: Auto-refresh Every 5 Minutes
// =============================================================================

/*
import { useCacheRefresh } from '@/hooks/useCachedApi';
import { fetchLatestDramas } from '@/services/dramaApiCached';

function AutoRefreshDramaList() {
  const { data: dramas, loading } = useCacheRefresh(
    () => fetchLatestDramas(),
    5 * 60 * 1000  // Refresh every 5 minutes
  );

  return (
    <div>
      {loading && <Spinner />}
      {dramas?.map(d => <DramaCard key={d.bookId} drama={d} />)}
    </div>
  );
}
*/

// Export empty object to make this a module
export {};
