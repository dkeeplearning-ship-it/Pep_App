const { logger } = require('../utils/logger');

/**
 * Performance optimization middleware and utilities
 */

// Cache for frequently accessed data
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Simple in-memory cache with TTL
 */
class PerformanceCache {
  constructor(ttl = CACHE_TTL) {
    this.cache = new Map();
    this.ttl = ttl;
  }

  set(key, value) {
    const expiry = Date.now() + this.ttl;
    this.cache.set(key, { value, expiry });
    
    // Clean up expired entries periodically
    if (this.cache.size % 100 === 0) {
      this.cleanup();
    }
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }

  delete(key) {
    this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }

  cleanup() {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
      }
    }
  }

  size() {
    return this.cache.size;
  }
}

// Global cache instances
const queryCache = new PerformanceCache(5 * 60 * 1000); // 5 minutes
const staticDataCache = new PerformanceCache(30 * 60 * 1000); // 30 minutes
const userSessionCache = new PerformanceCache(15 * 60 * 1000); // 15 minutes

/**
 * Query optimization middleware
 */
const queryOptimization = (req, res, next) => {
  const startTime = Date.now();
  
  // Add query optimization helpers to request
  req.cache = {
    query: queryCache,
    static: staticDataCache,
    session: userSessionCache
  };
  
  // Add performance tracking
  req.performance = {
    startTime,
    addMetric: (name, value) => {
      if (!req.performance.metrics) {
        req.performance.metrics = {};
      }
      req.performance.metrics[name] = value;
    }
  };
  
  // Log slow requests
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    if (duration > 1000) { // Log requests slower than 1 second
      logger.logPerformance('Slow Request', duration, {
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        metrics: req.performance.metrics
      });
    }
  });
  
  next();
};

/**
 * Database query optimization helpers
 */
const optimizeQuery = {
  /**
   * Add pagination to queries
   */
  paginate: (query, page = 1, limit = 50) => {
    const offset = (page - 1) * limit;
    return query.range(offset, offset + limit - 1);
  },

  /**
   * Add selective fields to reduce data transfer
   */
  selectFields: (query, fields) => {
    if (Array.isArray(fields)) {
      return query.select(fields.join(','));
    }
    return query.select(fields);
  },

  /**
   * Add common filters for active records
   */
  activeOnly: (query, field = 'is_active') => {
    return query.eq(field, true);
  },

  /**
   * Add date range filters
   */
  dateRange: (query, field, startDate, endDate) => {
    if (startDate) query = query.gte(field, startDate);
    if (endDate) query = query.lte(field, endDate);
    return query;
  },

  /**
   * Add ordering with performance considerations
   */
  orderBy: (query, field, ascending = true) => {
    return query.order(field, { ascending });
  }
};

/**
 * Response compression middleware
 */
const responseOptimization = (req, res, next) => {
  const originalJson = res.json;
  
  res.json = function(data) {
    // Add performance headers
    if (req.performance) {
      const duration = Date.now() - req.performance.startTime;
      res.setHeader('X-Response-Time', `${duration}ms`);
      res.setHeader('X-Cache-Status', req.cacheHit ? 'HIT' : 'MISS');
    }
    
    // Optimize response data
    if (data && typeof data === 'object') {
      // Remove null/undefined values to reduce payload size
      data = removeEmptyValues(data);
      
      // Add metadata for debugging
      if (process.env.NODE_ENV === 'development') {
        data._performance = {
          responseTime: Date.now() - req.performance.startTime,
          cacheHit: req.cacheHit || false,
          metrics: req.performance.metrics
        };
      }
    }
    
    return originalJson.call(this, data);
  };
  
  next();
};

/**
 * Remove empty values from objects to reduce payload size
 */
function removeEmptyValues(obj) {
  if (Array.isArray(obj)) {
    return obj.map(removeEmptyValues).filter(item => item !== null && item !== undefined);
  }
  
  if (obj && typeof obj === 'object') {
    const cleaned = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== null && value !== undefined && value !== '') {
        cleaned[key] = removeEmptyValues(value);
      }
    }
    return cleaned;
  }
  
  return obj;
}

/**
 * Batch processing utility for bulk operations
 */
const batchProcessor = {
  /**
   * Process items in batches to avoid overwhelming the database
   */
  async processBatch(items, processor, batchSize = 50) {
    const results = [];
    
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchResults = await processor(batch);
      results.push(...batchResults);
      
      // Add small delay between batches to prevent overwhelming the system
      if (i + batchSize < items.length) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }
    
    return results;
  },

  /**
   * Parallel processing with concurrency limit
   */
  async processParallel(items, processor, concurrency = 5) {
    const results = [];
    const executing = [];
    
    for (const item of items) {
      const promise = processor(item).then(result => {
        executing.splice(executing.indexOf(promise), 1);
        return result;
      });
      
      results.push(promise);
      executing.push(promise);
      
      if (executing.length >= concurrency) {
        await Promise.race(executing);
      }
    }
    
    return Promise.all(results);
  }
};

/**
 * Performance monitoring utilities
 */
const performanceMonitor = {
  /**
   * Monitor database query performance
   */
  async monitorQuery(queryName, queryFunction) {
    const startTime = Date.now();
    
    try {
      const result = await queryFunction();
      const duration = Date.now() - startTime;
      
      logger.logPerformance(`Query: ${queryName}`, duration, {
        success: true,
        resultCount: Array.isArray(result?.rows) ? result.rows.length : 1
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.logPerformance(`Query: ${queryName}`, duration, {
        success: false,
        error: error.message
      });
      
      throw error;
    }
  },

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      queryCache: {
        size: queryCache.size(),
        hitRate: queryCache.hitRate || 0
      },
      staticDataCache: {
        size: staticDataCache.size(),
        hitRate: staticDataCache.hitRate || 0
      },
      userSessionCache: {
        size: userSessionCache.size(),
        hitRate: userSessionCache.hitRate || 0
      }
    };
  },

  /**
   * Clear all caches
   */
  clearAllCaches() {
    queryCache.clear();
    staticDataCache.clear();
    userSessionCache.clear();
    
    logger.info('All performance caches cleared');
  }
};

/**
 * Middleware to add caching to specific routes
 */
const cacheMiddleware = (cacheType = 'query', ttl = 5 * 60 * 1000) => {
  return (req, res, next) => {
    const cacheKey = `${req.method}:${req.originalUrl}:${JSON.stringify(req.query)}`;
    
    let cache;
    switch (cacheType) {
      case 'static':
        cache = staticDataCache;
        break;
      case 'session':
        cache = userSessionCache;
        break;
      default:
        cache = queryCache;
    }
    
    // Check cache
    const cachedResponse = cache.get(cacheKey);
    if (cachedResponse) {
      req.cacheHit = true;
      return res.json(cachedResponse);
    }
    
    // Override res.json to cache the response
    const originalJson = res.json;
    res.json = function(data) {
      if (res.statusCode === 200 && data) {
        cache.set(cacheKey, data);
      }
      return originalJson.call(this, data);
    };
    
    req.cacheHit = false;
    next();
  };
};

module.exports = {
  queryOptimization,
  responseOptimization,
  optimizeQuery,
  batchProcessor,
  performanceMonitor,
  cacheMiddleware,
  PerformanceCache,
  queryCache,
  staticDataCache,
  userSessionCache
};
