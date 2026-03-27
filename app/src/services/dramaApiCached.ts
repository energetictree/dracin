/**
 * Cached Drama API Service with Two-Tier Caching
 * 
 * Flow:
 * 1. Check local IndexedDB cache first
 * 2. If miss/expired, call proxy (which checks server shared cache)
 * 3. If proxy/server miss, proxy calls external API, caches server-side, returns
 * 4. Client caches response locally
 * 
 * Cache TTL: 1 day (24 hours) for all tiers
 */

import { cacheDB } from '@/lib/cache/db';
import type { Drama, DramaDetail, EpisodeData, EpisodeDataFromApi, VideoQuality } from '@/types/drama';

// Use proxy URL if available (from environment), otherwise fallback to direct API
// Note: In browser, use relative '/api-proxy' which Vite will proxy to dracin-proxy
const BASE_URL = typeof window !== 'undefined' 
  ? '/api-proxy'  // Browser: use Vite proxy
  : (import.meta.env.VITE_API_PROXY_URL || '/api-proxy');  // SSR/Node: use env var
const DIRECT_API_URL = 'https://api.sansekai.my.id/api/dramabox';

// Re-export types
export type { EpisodeData, VideoQuality };

// Local cache TTL: 1 day (24 hours)
const LOCAL_CACHE_TTL = 24 * 60 * 60 * 1000;

/**
 * Generate cache key from URL
 */
function generateCacheKey(url: string): string {
  return url.replace(BASE_URL, '').replace(DIRECT_API_URL, '');
}

/**
 * Clear client-side (local) cache
 */
export async function clearClientCache(): Promise<{ success: boolean; message: string }> {
  try {
    await cacheDB.clear();
    console.log('[Cache:L1-CLEARED] Local cache cleared');
    return { success: true, message: 'Local cache cleared successfully' };
  } catch (error) {
    console.error('[Cache:L1-ERROR] Failed to clear local cache:', error);
    return { success: false, message: 'Failed to clear local cache' };
  }
}

/**
 * Clear server-side cache
 */
export async function clearServerCache(): Promise<{ success: boolean; message: string; clearedKeys?: number }> {
  try {
    // Admin endpoint is proxied directly without /api prefix
    const adminBase = typeof window !== 'undefined' ? '' : (import.meta.env.VITE_API_PROXY_URL || '');
    const response = await fetch(`${adminBase}/admin/clear-cache`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('[Cache:L2-CLEARED] Server cache cleared:', result);
    return { 
      success: true, 
      message: result.message || 'Server cache cleared successfully',
      clearedKeys: result.clearedKeys 
    };
  } catch (error) {
    console.error('[Cache:L2-ERROR] Failed to clear server cache:', error);
    return { success: false, message: 'Failed to clear server cache' };
  }
}

/**
 * Two-tier cache fetch:
 * 1. Check local IndexedDB
 * 2. If miss, call proxy (server checks shared cache)
 * 3. Proxy may call API if needed, caches server-side
 * 4. Store result in local cache
n */
async function fetchWithTwoTierCache<T>(url: string, forceRefresh = false): Promise<T> {
  const cacheKey = generateCacheKey(url);
  
  // TIER 1: Check local cache (unless force refresh)
  if (!forceRefresh) {
    try {
      const cached = await cacheDB.get<T>(cacheKey);
      if (cached !== null) {
        console.log(`[Cache:L1-HIT] ${cacheKey}`);
        return cached;
      }
    } catch (error) {
      console.warn('[Cache:L1-ERROR] Reading local cache:', error);
    }
  }
  
  console.log(`[Cache:L1-MISS] ${cacheKey}`);
  
  // TIER 2: Call proxy server (has shared cache)
  // Proxy will check its cache, and if miss, call API and cache server-side
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Proxy error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Store in local cache (Tier 1)
    try {
      await cacheDB.set(cacheKey, data, LOCAL_CACHE_TTL);
      console.log(`[Cache:L1-STORE] ${cacheKey}`);
    } catch (error) {
      console.warn('[Cache:L1-ERROR] Storing to local cache:', error);
    }
    
    return data;
  } catch (error) {
    console.error(`[Cache:L2-ERROR] Proxy failed: ${cacheKey}`, error);
    
    // FALLBACK: Try direct API if proxy fails
    console.log(`[Cache:FALLBACK] Direct API: ${cacheKey}`);
    const directUrl = url.replace(BASE_URL, DIRECT_API_URL);
    
    try {
      const response = await fetch(directUrl);
      if (!response.ok) {
        throw new Error(`Direct API error: ${response.status}`);
      }
      const data = await response.json();
      
      // Cache locally even in fallback
      try {
        await cacheDB.set(cacheKey, data, LOCAL_CACHE_TTL);
        console.log(`[Cache:L1-STORE] ${cacheKey} (fallback)`);
      } catch (e) {
        // Ignore
      }
      
      return data;
    } catch (fallbackError) {
      console.error('[Cache:FALLBACK-FAILED]', fallbackError);
      throw fallbackError;
    }
  }
}

/**
 * Fetch latest dramas (cached for 1 day)
 */
export async function fetchLatestDramas(forceRefresh?: boolean): Promise<Drama[]> {
  try {
    return await fetchWithTwoTierCache<Drama[]>(`${BASE_URL}/latest`, forceRefresh);
  } catch (error) {
    console.error('Error fetching latest dramas:', error);
    return [];
  }
}

/**
 * Fetch trending dramas (cached for 1 day)
 */
export async function fetchTrendingDramas(forceRefresh?: boolean): Promise<Drama[]> {
  try {
    return await fetchWithTwoTierCache<Drama[]>(`${BASE_URL}/trending`, forceRefresh);
  } catch (error) {
    console.error('Error fetching trending dramas:', error);
    return [];
  }
}

/**
 * Fetch "For You" dramas with pagination (cached for 1 day)
 */
export async function fetchForYouDramas(page: number = 1, forceRefresh?: boolean): Promise<Drama[]> {
  try {
    return await fetchWithTwoTierCache<Drama[]>(
      `${BASE_URL}/foryou?page=${page}`, 
      forceRefresh
    );
  } catch (error) {
    console.error('Error fetching for you dramas:', error);
    return [];
  }
}

/**
 * Fetch VIP dramas (cached for 1 day)
 */
export async function fetchVIPDramas(forceRefresh?: boolean): Promise<Drama[]> {
  try {
    const data = await fetchWithTwoTierCache<any>(`${BASE_URL}/vip`, forceRefresh);
    
    // VIP API returns { columnVoList: [{ bookList: [...] }, { bookList: [...] }] }
    let results: any[] = [];
    
    if (data && Array.isArray(data.columnVoList)) {
      for (const column of data.columnVoList) {
        if (column && Array.isArray(column.bookList)) {
          results.push(...column.bookList);
        }
      }
    } else if (Array.isArray(data)) {
      results = data;
    } else if (data && Array.isArray(data.data)) {
      results = data.data;
    } else if (data && Array.isArray(data.results)) {
      results = data.results;
    } else if (data && Array.isArray(data.list)) {
      results = data.list;
    }
    
    if (results.length === 0) {
      console.warn('VIP API returned no results');
      return [];
    }
    
    // Map VIP API response to Drama type
    return results.map((item: any) => ({
      bookId: String(item.bookId || ''),
      bookName: String(item.bookName || ''),
      coverWap: String(item.coverWap || item.cover || ''),
      chapterCount: Number(item.chapterCount || item.episodeCount || 0),
      introduction: String(item.introduction || ''),
      tags: Array.isArray(item.tags) ? item.tags : (Array.isArray(item.tagNames) ? item.tagNames : []),
      tagV3s: Array.isArray(item.tagV3s) ? item.tagV3s : [],
      isEntry: Number(item.isEntry || 0),
      index: Number(item.index || 0),
      protagonist: String(item.protagonist || ''),
      dataFrom: String(item.dataFrom || 'vip'),
      cardType: Number(item.cardType || 0),
      rankVo: item.rankVo || { rankType: 0, hotCode: '0', sort: 0 },
      markNamesConnectKey: String(item.markNamesConnectKey || ', '),
      bookShelfTime: Number(item.bookShelfTime || 0),
      shelfTime: String(item.shelfTime || ''),
      inLibrary: Boolean(item.inLibrary),
    }));
  } catch (error) {
    console.error('Error fetching VIP dramas:', error);
    return [];
  }
}

/**
 * Search dramas (cached for 1 day)
 * Note: Search results are cached per query
 */
export async function searchDramas(query: string, forceRefresh?: boolean): Promise<Drama[]> {
  try {
    const data = await fetchWithTwoTierCache<any>(
      `${BASE_URL}/search?query=${encodeURIComponent(query)}`,
      forceRefresh
    );
    
    // Handle different response formats
    let results: any[] = [];
    if (Array.isArray(data)) {
      results = data;
    } else if (data && Array.isArray(data.data)) {
      results = data.data;
    } else if (data && Array.isArray(data.results)) {
      results = data.results;
    }
    
    // Map search API response to Drama type
    return results.map((item: any) => ({
      bookId: item.bookId || '',
      bookName: item.bookName || '',
      coverWap: item.cover || item.coverWap || '',
      chapterCount: item.chapterCount || item.episodeCount || 0,
      introduction: item.introduction || '',
      tags: item.tagNames || item.tags || [],
      tagV3s: item.tagV3s || [],
      isEntry: item.isEntry || 0,
      index: item.index || 0,
      protagonist: item.protagonist || '',
      dataFrom: item.dataFrom || 'search',
      cardType: item.cardType || 0,
      rankVo: item.rankVo || { rankType: 0, hotCode: '0', sort: 0 },
      markNamesConnectKey: item.markNamesConnectKey || ', ',
      bookShelfTime: item.bookShelfTime || 0,
      shelfTime: item.shelfTime || '',
      inLibrary: item.inLibrary || false,
    }));
  } catch (error) {
    console.error('Error searching dramas:', error);
    return [];
  }
}

/**
 * Fetch drama detail by bookId (cached for 1 day)
 */
export async function fetchDramaDetail(bookId: string, forceRefresh?: boolean): Promise<DramaDetail | null> {
  try {
    return await fetchWithTwoTierCache<DramaDetail>(
      `${BASE_URL}/detail?bookId=${bookId}`,
      forceRefresh
    );
  } catch (error) {
    console.error('Error fetching drama detail:', error);
    return null;
  }
}

/**
 * Fetch popular searches (cached for 1 day)
 */
export async function fetchPopularSearches(forceRefresh?: boolean): Promise<string[]> {
  try {
    return await fetchWithTwoTierCache<string[]>(`${BASE_URL}/populersearch`, forceRefresh);
  } catch (error) {
    console.error('Error fetching popular searches:', error);
    return [];
  }
}

/**
 * Fetch Indonesian dubbed dramas (cached for 1 day)
 */
export async function fetchDubIndoDramas(
  classify: 'terpopuler' | 'terbaru', 
  page: number = 1,
  forceRefresh?: boolean
): Promise<Drama[]> {
  try {
    return await fetchWithTwoTierCache<Drama[]>(
      `${BASE_URL}/dubindo?classify=${classify}&page=${page}`,
      forceRefresh
    );
  } catch (error) {
    console.error('Error fetching dub indo dramas:', error);
    return [];
  }
}

/**
 * Fetch all episodes raw data (cached for 1 day)
 */
export async function fetchAllEpisodesRaw(bookId: string, forceRefresh?: boolean): Promise<EpisodeDataFromApi[]> {
  try {
    const data = await fetchWithTwoTierCache<EpisodeDataFromApi[] | any>(
      `${BASE_URL}/allepisode?bookId=${bookId}`,
      forceRefresh
    );
    
    if (Array.isArray(data)) {
      return data;
    }
    return [];
  } catch (error) {
    console.error('Error fetching all episodes:', error);
    return [];
  }
}

/**
 * Fetch all episodes (legacy format) (cached for 1 day)
 */
export async function fetchAllEpisodes(bookId: string, forceRefresh?: boolean): Promise<EpisodeData[]> {
  try {
    const episodes = await fetchAllEpisodesRaw(bookId, forceRefresh);
    
    // Convert new format to legacy EpisodeData format
    return episodes.map((ep) => ({
      episodeId: ep.chapterId,
      episodeName: ep.chapterName,
      episodeOrder: ep.chapterIndex + 1,
      videoUrl: undefined,
      qualities: undefined
    }));
  } catch (error) {
    console.error('Error fetching all episodes:', error);
    return [];
  }
}

/**
 * Get video URL for a specific episode
 * Note: This is computed data, no caching needed (relies on fetchAllEpisodesRaw which is cached)
 */
export async function getEpisodeVideoUrl(
  bookId: string, 
  episodeNum: number, 
  preferredQuality: string = '720'
): Promise<{ url: string; quality: string } | null> {
  try {
    const episodes = await fetchAllEpisodesRaw(bookId);
    
    if (!episodes || episodes.length === 0) {
      console.warn('No episodes found for bookId:', bookId);
      return null;
    }

    const episode = episodes.find(ep => ep.chapterIndex === episodeNum - 1) || episodes[episodeNum - 1];
    
    if (!episode) {
      console.warn('Episode not found:', episodeNum);
      return null;
    }

    const defaultCdn = episode.cdnList.find(cdn => cdn.isDefault === 1) || episode.cdnList[0];
    
    if (!defaultCdn || !defaultCdn.videoPathList || defaultCdn.videoPathList.length === 0) {
      console.warn('No CDN or video paths found for episode:', episodeNum);
      return null;
    }

    const targetQuality = parseInt(preferredQuality, 10);

    let videoPathItem = defaultCdn.videoPathList.find((v) => v.quality === targetQuality);

    if (!videoPathItem) {
      videoPathItem = defaultCdn.videoPathList.find((v) => v.quality === 720);
    }
    if (!videoPathItem) {
      videoPathItem = defaultCdn.videoPathList.find((v) => v.quality === 540);
    }
    if (!videoPathItem) {
      videoPathItem = defaultCdn.videoPathList[0];
    }

    if (videoPathItem && videoPathItem.videoPath) {
      return { 
        url: videoPathItem.videoPath, 
        quality: String(videoPathItem.quality) 
      };
    }

    return null;
  } catch (error) {
    console.error('Error getting episode video URL:', error);
    return null;
  }
}

/**
 * Get video URL for first episode
 * Note: This is computed data, no caching needed (relies on fetchAllEpisodesRaw which is cached)
 */
export async function getFirstEpisodeVideoUrl(bookId: string): Promise<{ url: string; quality: string; episodeNum: number } | null> {
  try {
    const episodes = await fetchAllEpisodesRaw(bookId);
    
    if (!episodes || episodes.length === 0) {
      return null;
    }

    const firstEpisode = episodes[0];
    const episodeNum = firstEpisode.chapterIndex + 1;

    const defaultCdn = firstEpisode.cdnList.find(cdn => cdn.isDefault === 1) || firstEpisode.cdnList[0];
    
    if (!defaultCdn || !defaultCdn.videoPathList || defaultCdn.videoPathList.length === 0) {
      return null;
    }

    let videoPathItem = defaultCdn.videoPathList.find((v) => v.quality === 720);
    
    if (!videoPathItem) {
      videoPathItem = defaultCdn.videoPathList.find((v) => v.quality === 540);
    }
    if (!videoPathItem) {
      videoPathItem = defaultCdn.videoPathList[0];
    }

    if (videoPathItem && videoPathItem.videoPath) {
      return { 
        url: videoPathItem.videoPath, 
        quality: String(videoPathItem.quality),
        episodeNum 
      };
    }

    return null;
  } catch (error) {
    console.error('Error getting first episode video URL:', error);
    return null;
  }
}

// Re-export cache utilities for manual cache management
export { clearCache, clearCacheEntry, cleanupExpiredCache, getCacheStats } from '@/lib/cache/apiCache';
