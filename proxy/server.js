/**
 * Dracin API Proxy Server
 * 
 * Provides server-side caching for API responses that all users can share.
 * Cache duration: 3 hours
 * Supports Primary and Backup API endpoints
 * Auto-failover on 403 with cache clear
 */

const express = require('express');
const cors = require('cors');
const NodeCache = require('node-cache');

const app = express();
const PORT = process.env.PORT || 3001;

// API Configuration - Primary and Backup
const PRIMARY_API = process.env.PRIMARY_API_URL || 'https://api.sansekai.my.id/api/dramabox';
const BACKUP_API = process.env.BACKUP_API_URL || 'https://apihub.bzbeez.work/api/dramabox';

// Domain configuration
const DOMAIN = process.env.DOMAIN || 'localhost';
const PUBLIC_URL = process.env.PUBLIC_URL || `http://localhost:${PORT}`;

// Initialize cache with 3 hours TTL and check period of 1 hour
const cache = new NodeCache({
  stdTTL: 3 * 60 * 60, // 3 hours in seconds
  checkperiod: 60 * 60, // Check for expired keys every hour
  useClones: true
});

// Enable CORS for all origins (configure for production as needed)
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Cache statistics
let stats = {
  hits: 0,
  misses: 0,
  requests: 0,
  primaryFails: 0,
  backupUses: 0,
  forbiddenErrors: 0,
  cacheClears: 0
};

/**
 * Generate cache key from URL and query params
 */
function generateCacheKey(path, query) {
  const queryString = Object.keys(query).length > 0 
    ? '?' + new URLSearchParams(query).toString() 
    : '';
  return `${path}${queryString}`;
}

/**
 * Clear all cache
 */
function clearAllCache() {
  const keysCount = cache.keys().length;
  cache.flushAll();
  stats.cacheClears++;
  console.log(`[CACHE CLEARED] ${keysCount} keys removed`);
  return keysCount;
}

/**
 * Build target URL from base API and path
 * baseApi: https://api.sansekai.my.id/api/dramabox
 * path: /api/dramabox/latest
 * result: https://api.sansekai.my.id/api/dramabox/latest
 */
function buildTargetUrl(baseApi, path, query) {
  // baseApi: https://api.sansekai.my.id/api/dramabox
  // path: /api/dramabox/latest
  // result: https://api.sansekai.my.id/api/dramabox/latest
  
  const baseUrl = new URL(baseApi);
  
  // Just append the path after /api/ to the baseApi
  // /api/dramabox/latest -> baseApi + /latest
  let apiPath = path;
  if (path.startsWith('/api/dramabox')) {
    apiPath = path.replace('/api/dramabox', '');
  } else if (path.startsWith('/api/')) {
    apiPath = path.substring(4);
  }
  
  const targetUrl = new URL(baseApi + apiPath);
  
  // Add query params
  Object.keys(query).forEach(key => {
    if (key !== '_refresh') {
      targetUrl.searchParams.append(key, query[key]);
    }
  });
  
  return targetUrl;
}

/**
 * Fetch from API with backup fallback
 * On 403 from primary: clears cache and tries backup
 */
async function fetchFromAPI(targetUrl, backupUrl = null, cacheKey = null) {
  try {
    // Try primary API first
    const response = await fetch(targetUrl.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Dracin-Proxy/1.0'
      }
    });
    
    // Handle 403 Forbidden - Clear cache and use backup
    if (response.status === 403) {
      console.error(`[PRIMARY 403] ${targetUrl}: Access Forbidden`);
      stats.forbiddenErrors++;
      
      // Clear cache on 403
      const clearedKeys = clearAllCache();
      
      // Try backup API if available
      if (backupUrl) {
        try {
          console.log(`[BACKUP TRY] Attempting backup API after 403: ${backupUrl}`);
          const backupResponse = await fetch(backupUrl.toString(), {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'Dracin-Proxy/1.0 (Backup after 403)'
            }
          });
          
          if (backupResponse.ok) {
            stats.backupUses++;
            console.log(`[BACKUP SUCCESS] Using backup API after 403`);
            return await backupResponse.json();
          }
          
          throw new Error(`Backup API error: ${backupResponse.status}`);
        } catch (backupError) {
          console.error(`[BACKUP FAIL] ${backupError.message}`);
          throw new Error(`Primary returned 403, backup also failed: ${backupError.message}`);
        }
      }
      
      throw new Error(`Primary API returned 403 Forbidden, no backup available`);
    }
    
    if (response.ok) {
      return await response.json();
    }
    
    throw new Error(`Primary API error: ${response.status}`);
  } catch (primaryError) {
    // Don't retry on 403 (already handled above)
    if (primaryError.message.includes('403')) {
      throw primaryError;
    }
    
    console.error(`[PRIMARY FAIL] ${targetUrl}: ${primaryError.message}`);
    stats.primaryFails++;
    
    // Try backup API for other errors
    if (backupUrl) {
      try {
        console.log(`[BACKUP TRY] Attempting backup API: ${backupUrl}`);
        const backupResponse = await fetch(backupUrl.toString(), {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Dracin-Proxy/1.0 (Backup)'
          }
        });
        
        if (backupResponse.ok) {
          stats.backupUses++;
          console.log(`[BACKUP SUCCESS] Using backup API`);
          return await backupResponse.json();
        }
        
        throw new Error(`Backup API error: ${backupResponse.status}`);
      } catch (backupError) {
        console.error(`[BACKUP FAIL] ${backupError.message}`);
        throw new Error(`Both primary and backup APIs failed`);
      }
    }
    
    throw primaryError;
  }
}

const cacheStats = cache.getStats();

/**
 * Proxy middleware with caching and backup support
 */
async function proxyWithCache(req, res) {
  const path = req.path;
  const query = req.query;
  const cacheKey = generateCacheKey(path, query);
  
  stats.requests++;
  
  // Check if force refresh is requested
  const forceRefresh = query._refresh === 'true';
  if (forceRefresh) {
    delete query._refresh; // Remove from query before forwarding
  }
  
  // Try to get from cache
  if (!forceRefresh) {
    const cached = cache.get(cacheKey);
    if (cached) {
      stats.hits++;
      console.log(`[CACHE HIT] ${cacheKey}`);
      return res.json(cached);
    }
  }
  
  stats.misses++;
  console.log(`[CACHE MISS] ${cacheKey}`);
  
  try {
    // Build target URLs using the full path
    const targetUrl = buildTargetUrl(PRIMARY_API, path, query);
    const backupUrl = buildTargetUrl(BACKUP_API, path, query);
    
    console.log(`[PROXY] Primary: ${targetUrl.toString()}`);
    console.log(`[PROXY] Backup: ${backupUrl.toString()}`);
    
    const data = await fetchFromAPI(targetUrl, backupUrl, cacheKey);
    
    // Store in cache
    cache.set(cacheKey, data);
    console.log(`[CACHE STORE] ${cacheKey} (TTL: 3 hours)`);
    
    res.json(data);
  } catch (error) {
    console.error(`[ERROR] ${cacheKey}:`, error.message);
    res.status(500).json({
      error: 'Failed to fetch from API',
      message: error.message,
      primary: PRIMARY_API,
      backup: BACKUP_API
    });
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  const cacheStats = cache.getStats();
  res.json({
    status: 'ok',
    domain: DOMAIN,
    publicUrl: PUBLIC_URL,
    apis: {
      primary: PRIMARY_API,
      backup: BACKUP_API
    },
    cache: {
      keys: cacheStats.keys,
      hits: stats.hits,
      misses: stats.misses,
      hitRate: stats.requests > 0 
        ? ((stats.hits / stats.requests) * 100).toFixed(2) + '%' 
        : 'N/A'
    },
    failover: {
      primaryFails: stats.primaryFails,
      backupUses: stats.backupUses,
      forbiddenErrors: stats.forbiddenErrors,
      cacheClears: stats.cacheClears
    }
  });
});

// Clear cache endpoint (for admin use)
app.post('/admin/clear-cache', (req, res) => {
  const clearedKeys = clearAllCache();
  stats = { hits: 0, misses: 0, requests: 0, primaryFails: 0, backupUses: 0, forbiddenErrors: 0, cacheClears: stats.cacheClears };
  console.log('[ADMIN] Cache cleared');
  res.json({ message: 'Cache cleared successfully', clearedKeys });
});

// Cache stats endpoint
app.get('/admin/stats', (req, res) => {
  const cacheStats = cache.getStats();
  res.json({
    cache: cacheStats,
    proxy: stats,
    apis: {
      primary: PRIMARY_API,
      backup: BACKUP_API
    },
    hitRate: stats.requests > 0 
      ? ((stats.hits / stats.requests) * 100).toFixed(2) + '%' 
      : 'N/A'
  });
});

// List all cached keys
app.get('/admin/keys', (req, res) => {
  const keys = cache.keys();
  res.json({
    count: keys.length,
    keys: keys.slice(0, 100) // Limit to first 100
  });
});

// API proxy routes - all routes starting with /api/*
app.all('/api/*', proxyWithCache);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Dracin API Proxy',
    version: '1.0.0',
    description: 'Server-side caching proxy for Dracin with Primary/Backup API failover',
    domain: DOMAIN,
    publicUrl: PUBLIC_URL,
    cache_ttl: '3 hours',
    apis: {
      primary: PRIMARY_API,
      backup: BACKUP_API
    },
    endpoints: {
      proxy: '/api/* - Proxy to dramabox API with caching and failover',
      health: '/health - Health check, cache stats, and API status',
      admin: {
        clearCache: 'POST /admin/clear-cache - Clear all cache',
        stats: 'GET /admin/stats - Detailed stats',
        keys: 'GET /admin/keys - List cached keys'
      }
    }
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   Dracin API Proxy Server                                    ║
║                                                              ║
║   Domain: ${DOMAIN.padEnd(55)}║
║   Port: ${PORT.toString().padEnd(57)}║
║   Public URL: ${PUBLIC_URL.padEnd(51)}║
║   Cache TTL: 3 hours                                         ║
║                                                              ║
║   Primary API: ${PRIMARY_API.padEnd(50)}║
║   Backup API:  ${BACKUP_API.padEnd(50)}║
║                                                              ║
║   Features: 403 → Clear Cache → Backup Failover              ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[SHUTDOWN] Saving cache...');
  cache.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[SHUTDOWN] Saving cache...');
  cache.close();
  process.exit(0);
});
