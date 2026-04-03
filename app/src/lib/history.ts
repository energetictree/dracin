/**
 * Watch History Service
 * Manages local watch history - stores only on user device
 */

export interface WatchHistoryItem {
  bookId: string;
  bookName: string;
  coverWap: string;
  episodeNum: number;
  totalEpisodes: number;
  watchedAt: number; // timestamp
}

const STORAGE_KEY = 'dracin_watch_history';
const MAX_HISTORY_ITEMS = 100; // Limit to prevent storage issues

/**
 * Get all watch history
 */
export function getWatchHistory(): WatchHistoryItem[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data);
  } catch {
    return [];
  }
}

/**
 * Add or update watch history
 * Only keeps the latest episode per drama
 */
export function addToHistory(item: Omit<WatchHistoryItem, 'watchedAt'>): void {
  try {
    const history = getWatchHistory();
    const now = Date.now();
    
    // Remove existing entry for this drama
    const filtered = history.filter(h => h.bookId !== item.bookId);
    
    // Add new entry at the beginning (most recent)
    const newItem: WatchHistoryItem = {
      ...item,
      watchedAt: now,
    };
    
    const newHistory = [newItem, ...filtered].slice(0, MAX_HISTORY_ITEMS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
  } catch (error) {
    console.error('Failed to save watch history:', error);
  }
}

/**
 * Get latest watched episode for a drama
 */
export function getLatestWatchedEpisode(bookId: string): number | null {
  const history = getWatchHistory();
  const item = history.find(h => h.bookId === bookId);
  return item ? item.episodeNum : null;
}

/**
 * Get all watched episodes for a drama (for highlighting)
 */
export function getWatchedEpisodes(bookId: string): number[] {
  const history = getWatchHistory();
  const item = history.find(h => h.bookId === bookId);
  if (!item) return [];
  
  // Return all episodes up to the latest watched
  const episodes: number[] = [];
  for (let i = 1; i <= item.episodeNum; i++) {
    episodes.push(i);
  }
  return episodes;
}

/**
 * Check if a specific episode has been watched
 */
export function isEpisodeWatched(bookId: string, episodeNum: number): boolean {
  const latest = getLatestWatchedEpisode(bookId);
  return latest !== null && episodeNum <= latest;
}

/**
 * Remove a drama from history
 */
export function removeFromHistory(bookId: string): void {
  try {
    const history = getWatchHistory();
    const filtered = history.filter(h => h.bookId !== bookId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to remove from history:', error);
  }
}

/**
 * Clear all history
 */
export function clearHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear history:', error);
  }
}

/**
 * Get formatted "time ago" string
 */
export function getTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  
  const date = new Date(timestamp);
  return date.toLocaleDateString();
}
