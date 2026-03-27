/**
 * @deprecated This file contains the original API functions without caching.
 * Please use '@/services/dramaApiCached' instead for automatic caching.
 * 
 * Example migration:
 * 
 * // Old (no caching)
 * import { fetchLatestDramas } from '@/services/dramaApi';
 * const dramas = await fetchLatestDramas();
 * 
 * // New (with 1 hour caching)
 * import { fetchLatestDramas } from '@/services/dramaApiCached';
 * const dramas = await fetchLatestDramas();
 * 
 * // Force refresh (skip cache)
 * const dramas = await fetchLatestDramas(true);
 */

import type { Drama, DramaDetail, EpisodeDataFromApi, VideoPathItem } from '@/types/drama';

const BASE_URL = 'https://api.sansekai.my.id/api/dramabox';

export interface VideoQuality {
  quality: string;
  url: string;
}

export interface EpisodeData {
  episodeId: string;
  episodeName: string;
  episodeOrder: number;
  videoUrl?: string;
  qualities?: VideoQuality[];
}

export async function fetchLatestDramas(): Promise<Drama[]> {
  try {
    const response = await fetch(`${BASE_URL}/latest`);
    if (!response.ok) throw new Error('Failed to fetch latest dramas');
    return await response.json();
  } catch (error) {
    console.error('Error fetching latest dramas:', error);
    return [];
  }
}

export async function fetchTrendingDramas(): Promise<Drama[]> {
  try {
    const response = await fetch(`${BASE_URL}/trending`);
    if (!response.ok) throw new Error('Failed to fetch trending dramas');
    return await response.json();
  } catch (error) {
    console.error('Error fetching trending dramas:', error);
    return [];
  }
}

export async function fetchForYouDramas(page: number = 1): Promise<Drama[]> {
  try {
    const response = await fetch(`${BASE_URL}/foryou?page=${page}`);
    if (!response.ok) throw new Error('Failed to fetch for you dramas');
    return await response.json();
  } catch (error) {
    console.error('Error fetching for you dramas:', error);
    return [];
  }
}

export async function fetchVIPDramas(): Promise<Drama[]> {
  try {
    const url = `${BASE_URL}/vip`;
    console.log('VIP API URL:', url);
    const response = await fetch(url);
    console.log('VIP API status:', response.status);
    if (!response.ok) throw new Error('Failed to fetch VIP dramas');
    const data = await response.json();
    
    console.log('VIP API raw response type:', typeof data);
    
    // VIP API returns { columnVoList: [{ bookList: [...] }, { bookList: [...] }] }
    let results: any[] = [];
    
    if (data && Array.isArray(data.columnVoList)) {
      // Extract books from all columns
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
    
    console.log('VIP API extracted results count:', results.length);
    
    if (results.length === 0) {
      console.warn('VIP API returned no results');
      return [];
    }
    
    // Map VIP API response to Drama type
    const mapped = results.map((item: any) => ({
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
    
    console.log('VIP API mapped results:', mapped.length);
    return mapped;
  } catch (error) {
    console.error('Error fetching VIP dramas:', error);
    return [];
  }
}

export async function searchDramas(query: string): Promise<Drama[]> {
  try {
    const response = await fetch(`${BASE_URL}/search?query=${encodeURIComponent(query)}`);
    if (!response.ok) throw new Error('Failed to search dramas');
    const data = await response.json();
    
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
    // Search API uses: cover (not coverWap), tagNames (not tags), no chapterCount
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

export async function fetchDramaDetail(bookId: string): Promise<DramaDetail | null> {
  try {
    const response = await fetch(`${BASE_URL}/detail?bookId=${bookId}`);
    if (!response.ok) throw new Error('Failed to fetch drama detail');
    return await response.json();
  } catch (error) {
    console.error('Error fetching drama detail:', error);
    return null;
  }
}

export async function fetchPopularSearches(): Promise<string[]> {
  try {
    const response = await fetch(`${BASE_URL}/populersearch`);
    if (!response.ok) throw new Error('Failed to fetch popular searches');
    return await response.json();
  } catch (error) {
    console.error('Error fetching popular searches:', error);
    return [];
  }
}

export async function fetchDubIndoDramas(classify: 'terpopuler' | 'terbaru', page: number = 1): Promise<Drama[]> {
  try {
    const response = await fetch(`${BASE_URL}/dubindo?classify=${classify}&page=${page}`);
    if (!response.ok) throw new Error('Failed to fetch dub indo dramas');
    return await response.json();
  } catch (error) {
    console.error('Error fetching dub indo dramas:', error);
    return [];
  }
}

// Fetch all episodes for a drama with video URLs
// Returns raw API response from /allepisode endpoint
export async function fetchAllEpisodesRaw(bookId: string): Promise<EpisodeDataFromApi[]> {
  try {
    const response = await fetch(`${BASE_URL}/allepisode?bookId=${bookId}`);
    if (!response.ok) throw new Error('Failed to fetch episodes');
    const data = await response.json();
    
    // The API returns an array directly
    if (Array.isArray(data)) {
      return data as EpisodeDataFromApi[];
    }
    return [];
  } catch (error) {
    console.error('Error fetching all episodes:', error);
    return [];
  }
}

// Legacy function for backward compatibility
export async function fetchAllEpisodes(bookId: string): Promise<EpisodeData[]> {
  try {
    const episodes = await fetchAllEpisodesRaw(bookId);
    
    // Convert new format to legacy EpisodeData format
    return episodes.map((ep) => ({
      episodeId: ep.chapterId,
      episodeName: ep.chapterName,
      episodeOrder: ep.chapterIndex + 1, // chapterIndex is 0-based
      videoUrl: undefined, // Will be extracted from cdnList when needed
      qualities: undefined
    }));
  } catch (error) {
    console.error('Error fetching all episodes:', error);
    return [];
  }
}

// Get video URL for a specific episode with preferred quality (default 720)
// Uses /allepisode endpoint which returns cdnList with videoPathList
export async function getEpisodeVideoUrl(
  bookId: string, 
  episodeNum: number, 
  preferredQuality: string = '720'
): Promise<{ url: string; quality: string } | null> {
  try {
    // Use raw API to get cdnList
    const episodes = await fetchAllEpisodesRaw(bookId);
    
    if (!episodes || episodes.length === 0) {
      console.warn('No episodes found for bookId:', bookId);
      return null;
    }

    // Find the episode by chapterIndex (0-based) or episodeNum (1-based)
    // chapterIndex = episodeNum - 1
    const episode = episodes.find(ep => ep.chapterIndex === episodeNum - 1) || episodes[episodeNum - 1];
    
    if (!episode) {
      console.warn('Episode not found:', episodeNum);
      return null;
    }

    // Find default CDN (isDefault=1)
    const defaultCdn = episode.cdnList.find(cdn => cdn.isDefault === 1) || episode.cdnList[0];
    
    if (!defaultCdn || !defaultCdn.videoPathList || defaultCdn.videoPathList.length === 0) {
      console.warn('No CDN or video paths found for episode:', episodeNum);
      return null;
    }

    // Parse preferred quality as number
    const targetQuality = parseInt(preferredQuality, 10);

    // Find video with preferred quality (720)
    let videoPathItem = defaultCdn.videoPathList.find(
      (v: VideoPathItem) => v.quality === targetQuality
    );

    // If not found, try 720, then 540, then any available
    if (!videoPathItem) {
      videoPathItem = defaultCdn.videoPathList.find((v: VideoPathItem) => v.quality === 720);
    }
    if (!videoPathItem) {
      videoPathItem = defaultCdn.videoPathList.find((v: VideoPathItem) => v.quality === 540);
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

// Get video URL for first episode (for "Watch Now" button)
export async function getFirstEpisodeVideoUrl(bookId: string): Promise<{ url: string; quality: string; episodeNum: number } | null> {
  try {
    // Use raw API to get cdnList
    const episodes = await fetchAllEpisodesRaw(bookId);
    
    if (!episodes || episodes.length === 0) {
      return null;
    }

    // Get first episode (chapterIndex 0)
    const firstEpisode = episodes[0];
    const episodeNum = firstEpisode.chapterIndex + 1; // Convert to 1-based

    // Find default CDN (isDefault=1)
    const defaultCdn = firstEpisode.cdnList.find(cdn => cdn.isDefault === 1) || firstEpisode.cdnList[0];
    
    if (!defaultCdn || !defaultCdn.videoPathList || defaultCdn.videoPathList.length === 0) {
      return null;
    }

    // Try to get 720p quality
    let videoPathItem = defaultCdn.videoPathList.find((v: VideoPathItem) => v.quality === 720);
    
    // Fallback to other qualities
    if (!videoPathItem) {
      videoPathItem = defaultCdn.videoPathList.find((v: VideoPathItem) => v.quality === 540);
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

// Get sample video URLs for testing (since the API might not provide direct video URLs)
export function getSampleVideoUrl(): string {
  // Using a sample HLS stream for testing
  // In production, this should come from the actual API
  return 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';
}
