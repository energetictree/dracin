/**
 * Dracin API Proxy Server
 * 
 * Provides server-side caching for API responses that all users can share.
 * Cache duration: 2 hours
 * Supports Primary and Backup API endpoints
 * Auto-failover on 403 with cache clear
 */

const express = require('express');
const cors = require('cors');
const NodeCache = require('node-cache');

const app = express();
const PORT = process.env.PORT || 3001;

// API Configuration - Primary and Backup
const PRIMARY_API = process.env.PRIMARY_API_URL;
const BACKUP_API = process.env.BACKUP_API_URL;

// Validate configuration
if (!PRIMARY_API) {
  console.error('ERROR: PRIMARY_API_URL environment variable is required');
  console.error('Please set it in your .env file or environment');
  process.exit(1);
}

// Domain configuration
const DOMAIN = process.env.DOMAIN || 'localhost';
const PUBLIC_URL = process.env.PUBLIC_URL || `http://localhost:${PORT}`;

// Initialize cache with 2 hours TTL and check period of 1 hour
const cache = new NodeCache({
  stdTTL: 2 * 60 * 60, // 2 hours in seconds
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
 * 
 * For decrypt-stream: always use backup API (primary is blocked)
 */
function buildTargetUrl(baseApi, path, query, isBackup = false) {
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
 * Check if path should always use backup API
 * decrypt-stream is blocked on primary API
 */
function shouldUseBackupOnly(path) {
  return path.includes('/decrypt-stream');
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
  
  // Special handling for decrypt-stream: always use backup API (primary is blocked)
  if (shouldUseBackupOnly(path)) {
    console.log(`[DECRYPT-STREAM] Using backup API directly`);
    const backupUrl = buildTargetUrl(BACKUP_API, path, query);
    
    try {
      // Use Node's native http to properly stream with range support
      const http = require('http');
      const https = require('https');
      const url = new URL(backupUrl.toString());
      const client = url.protocol === 'https:' ? https : http;
      
      const options = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method: 'GET',
        headers: {
          'Accept': req.headers['accept'] || '*/*',
          'User-Agent': 'Dracin-Proxy/1.0',
          'Host': url.hostname
        }
      };
      
      // Forward Range header from client for MP4 seeking support
      if (req.headers['range']) {
        options.headers['Range'] = req.headers['range'];
        console.log(`[DECRYPT-STREAM] Forwarding Range: ${req.headers['range']}`);
      }
      
      // Make request to backup API
      const proxyReq = client.request(options, (proxyRes) => {
        // Check for error status
        if (proxyRes.statusCode !== 200 && proxyRes.statusCode !== 206) {
          console.error(`[DECRYPT-STREAM ERROR] Backup API returned ${proxyRes.statusCode}`);
          res.status(502).json({ error: 'Failed to stream video', status: proxyRes.statusCode });
          return;
        }
        
        // Set response headers
        res.set('Content-Type', proxyRes.headers['content-type'] || 'video/mp4');
        res.set('Access-Control-Allow-Origin', '*');
        
        if (proxyRes.headers['content-length']) {
          res.set('Content-Length', proxyRes.headers['content-length']);
        }
        if (proxyRes.headers['content-range']) {
          res.set('Content-Range', proxyRes.headers['content-range']);
        }
        if (proxyRes.headers['accept-ranges']) {
          res.set('Accept-Ranges', proxyRes.headers['accept-ranges']);
        }
        
        // Set status
        res.status(proxyRes.statusCode);
        
        // Pipe the response directly to client (true streaming)
        proxyRes.pipe(res);
        
        console.log(`[DECRYPT-STREAM] Streaming ${proxyRes.statusCode} (content-length: ${proxyRes.headers['content-length'] || 'unknown'})`);
      });
      
      proxyReq.on('error', (error) => {
        console.error(`[DECRYPT-STREAM ERROR] ${error.message}`);
        if (!res.headersSent) {
          res.status(502).json({ error: 'Failed to stream video', message: error.message });
        }
      });
      
      proxyReq.end();
      return;
    } catch (error) {
      console.error(`[DECRYPT-STREAM ERROR] ${error.message}`);
      res.status(502).json({ error: 'Failed to stream video', message: error.message });
      return;
    }
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

// Convert SRT to VTT format
function srtToVtt(srtContent) {
  // VTT header
  let vtt = 'WEBVTT\n\n';
  
  // Replace SRT timing format with VTT format and remove cue numbers
  vtt += srtContent
    .replace(/\r\n/g, '\n') // Normalize line endings
    .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2') // Convert commas to dots in timestamps
    .replace(/^\d+\n/, '') // Remove first cue number if at start
    .replace(/\n\d+\n(?=\d{2}:\d{2}:\d{2})/g, '\n'); // Remove cue numbers before timestamps
  
  return vtt;
}

// Subtitle proxy endpoint - fetches, converts SRT to VTT, and returns
app.get('/subtitle-proxy', async (req, res) => {
  const subtitleUrl = req.query.url;
  
  if (!subtitleUrl) {
    return res.status(400).json({ error: 'Missing url parameter' });
  }
  
  console.log(`[SUBTITLE FETCH] ${subtitleUrl.substring(0, 80)}...`);
  
  try {
    const response = await fetch(subtitleUrl, {
      headers: {
        'Accept': '*/*',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const srtContent = await response.text();
    
    // Convert SRT to VTT
    const vttContent = srtToVtt(srtContent);
    
    console.log(`[SUBTITLE] Converted ${srtContent.length} bytes SRT to ${vttContent.length} bytes VTT`);
    
    res.set('Content-Type', 'text/vtt');
    res.set('Access-Control-Allow-Origin', '*');
    res.send(vttContent);
  } catch (error) {
    console.error(`[SUBTITLE ERROR] ${error.message}`);
    res.status(502).json({ error: 'Failed to fetch subtitle', message: error.message });
  }
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
    cache_ttl: '2 hours',
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
