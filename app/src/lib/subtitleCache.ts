/**
 * Subtitle Cache Service
 * Caches VTT content locally in IndexedDB for 30 days
 * Key: subtitle URL, Value: VTT content + timestamp
 */

const DB_NAME = 'dracin_subtitle_cache';
const DB_VERSION = 1;
const STORE_NAME = 'vtt_cache';
const CACHE_TTL_DAYS = 30;
const CACHE_TTL_MS = CACHE_TTL_DAYS * 24 * 60 * 60 * 1000;

interface CacheEntry {
  url: string;
  vttContent: string;
  timestamp: number;
}

let db: IDBDatabase | null = null;

/**
 * Initialize IndexedDB
 */
async function initDB(): Promise<IDBDatabase> {
  if (db) return db;
  
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };
    
    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: 'url' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

/**
 * Get cached VTT content if valid
 */
export async function getCachedVtt(subtitleUrl: string): Promise<string | null> {
  try {
    const database = await initDB();
    
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(subtitleUrl);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const entry: CacheEntry | undefined = request.result;
        
        if (!entry) {
          resolve(null);
          return;
        }
        
        // Check if expired
        const now = Date.now();
        const age = now - entry.timestamp;
        
        if (age > CACHE_TTL_MS) {
          console.log('[SubtitleCache] Entry expired, deleting:', subtitleUrl.substring(0, 50));
          deleteCachedVtt(subtitleUrl);
          resolve(null);
          return;
        }
        
        console.log('[SubtitleCache] Cache hit:', subtitleUrl.substring(0, 50), 
          'Age:', Math.round(age / (24 * 60 * 60 * 1000)), 'days');
        resolve(entry.vttContent);
      };
    });
  } catch (error) {
    console.error('[SubtitleCache] Error getting cached VTT:', error);
    return null;
  }
}

/**
 * Store VTT content in cache
 */
export async function setCachedVtt(subtitleUrl: string, vttContent: string): Promise<void> {
  try {
    const database = await initDB();
    
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      const entry: CacheEntry = {
        url: subtitleUrl,
        vttContent,
        timestamp: Date.now()
      };
      
      const request = store.put(entry);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        console.log('[SubtitleCache] Stored:', subtitleUrl.substring(0, 50));
        resolve();
      };
    });
  } catch (error) {
    console.error('[SubtitleCache] Error storing VTT:', error);
  }
}

/**
 * Delete cached entry
 */
async function deleteCachedVtt(subtitleUrl: string): Promise<void> {
  try {
    const database = await initDB();
    
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(subtitleUrl);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  } catch (error) {
    console.error('[SubtitleCache] Error deleting cached VTT:', error);
  }
}

/**
 * Clear all expired entries (can be called periodically)
 */
export async function clearExpiredCache(): Promise<number> {
  try {
    const database = await initDB();
    const now = Date.now();
    
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('timestamp');
      const request = index.openCursor();
      
      let deletedCount = 0;
      
      request.onerror = () => reject(request.error);
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        
        if (cursor) {
          const entry: CacheEntry = cursor.value;
          const age = now - entry.timestamp;
          
          if (age > CACHE_TTL_MS) {
            cursor.delete();
            deletedCount++;
          }
          
          cursor.continue();
        } else {
          console.log('[SubtitleCache] Cleared', deletedCount, 'expired entries');
          resolve(deletedCount);
        }
      };
    });
  } catch (error) {
    console.error('[SubtitleCache] Error clearing expired cache:', error);
    return 0;
  }
}

/**
 * Get cache stats
 */
export async function getCacheStats(): Promise<{ total: number; expired: number }> {
  try {
    const database = await initDB();
    const now = Date.now();
    
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const entries: CacheEntry[] = request.result;
        const expired = entries.filter(e => (now - e.timestamp) > CACHE_TTL_MS).length;
        
        resolve({
          total: entries.length,
          expired
        });
      };
    });
  } catch (error) {
    console.error('[SubtitleCache] Error getting stats:', error);
    return { total: 0, expired: 0 };
  }
}
