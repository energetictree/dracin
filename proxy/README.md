# Dracin API Proxy

This is a server-side caching proxy for the Dracin API that provides shared caching for all users.

## Features

- **Shared Cache**: All users share the same cache, reducing API calls
- **1 Day TTL**: Cache entries expire after 24 hours
- **Auto-cleanup**: Expired entries are cleaned up automatically
- **Health Monitoring**: Built-in health check and statistics endpoints

## API Endpoints

### Proxy Endpoints (Cached)
- `GET /api/latest` - Latest dramas
- `GET /api/trending` - Trending dramas
- `GET /api/foryou?page=1` - For You dramas
- `GET /api/vip` - VIP dramas
- `GET /api/search?query=xxx` - Search dramas
- `GET /api/detail?bookId=xxx` - Drama details
- `GET /api/allepisode?bookId=xxx` - Episodes
- `GET /api/populersearch` - Popular searches
- `GET /api/dubindo?classify=xxx&page=1` - Dub Indo dramas

### Admin Endpoints
- `GET /health` - Health check and basic stats
- `GET /admin/stats` - Detailed cache statistics
- `GET /admin/keys` - List cached keys (first 100)
- `POST /admin/clear-cache` - Clear all cache

### Query Parameters
- `_refresh=true` - Force refresh (bypass cache)

## Cache Stats Example

```json
{
  "status": "ok",
  "cache": {
    "keys": 150,
    "hits": 1200,
    "misses": 150,
    "hitRate": "88.89%"
  }
}
```

## Environment Variables

- `PORT` - Server port (default: 3001)
- `NODE_ENV` - Environment (development/production)
