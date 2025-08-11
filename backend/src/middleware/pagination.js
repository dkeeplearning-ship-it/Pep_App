/**
 * Pagination Middleware
 * Provides consistent pagination support across all list endpoints
 */

const { createPaginationMeta } = require('../utils/responseFormatter');

/**
 * Parse pagination parameters from query string
 */
const parsePaginationParams = (req, res, next) => {
  const { page = 1, limit = 20, sort = 'created_at', order = 'desc' } = req.query;
  
  // Validate and sanitize parameters
  const parsedPage = Math.max(1, parseInt(page) || 1);
  const parsedLimit = Math.min(100, Math.max(1, parseInt(limit) || 20)); // Max 100 items per page
  const parsedSort = typeof sort === 'string' ? sort : 'created_at';
  const parsedOrder = ['asc', 'desc'].includes(order?.toLowerCase()) ? order.toLowerCase() : 'desc';
  
  // Calculate offset
  const offset = (parsedPage - 1) * parsedLimit;
  
  // Add pagination info to request
  req.pagination = {
    page: parsedPage,
    limit: parsedLimit,
    offset,
    sort: parsedSort,
    order: parsedOrder
  };
  
  next();
};

/**
 * Apply pagination to Supabase query
 */
const applyPagination = (queryBuilder, pagination) => {
  const { limit, offset, sort, order } = pagination;
  
  return queryBuilder
    .order(sort, { ascending: order === 'asc' })
    .range(offset, offset + limit - 1);
};

/**
 * Get total count for pagination
 */
const getTotalCount = async (supabase, tableName, filters = {}) => {
  try {
    let countQuery = supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });
    
    // Apply filters to count query
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        countQuery = countQuery.eq(key, value);
      }
    });
    
    const { count, error } = await countQuery;
    
    if (error) {
      console.error('❌ Count query error:', error);
      return 0;
    }
    
    return count || 0;
  } catch (error) {
    console.error('❌ Get total count error:', error);
    return 0;
  }
};

/**
 * Pagination middleware for list endpoints
 */
const paginateResults = (tableName, defaultSort = 'created_at') => {
  return async (req, res, next) => {
    try {
      // Parse pagination parameters
      parsePaginationParams(req, res, () => {});
      
      // Override default sort if not provided
      if (!req.query.sort) {
        req.pagination.sort = defaultSort;
      }
      
      // Add pagination utilities to request
      req.paginate = {
        apply: (queryBuilder) => applyPagination(queryBuilder, req.pagination),
        getTotalCount: (filters = {}) => getTotalCount(req.supabase || require('../config/supabase').supabase, tableName, filters),
        createMeta: (total) => createPaginationMeta(req.pagination.page, req.pagination.limit, total)
      };
      
      next();
    } catch (error) {
      console.error('❌ Pagination middleware error:', error);
      res.status(500).json({
        success: false,
        error: 'PAGINATION_ERROR',
        message: 'Failed to process pagination parameters',
        timestamp: new Date().toISOString()
      });
    }
  };
};

/**
 * Search and filter middleware
 */
const parseSearchAndFilters = (allowedFilters = [], searchFields = []) => {
  return (req, res, next) => {
    const { search, ...filters } = req.query;
    
    // Parse search query
    req.search = {
      query: search && typeof search === 'string' ? search.trim() : null,
      fields: searchFields
    };
    
    // Parse and validate filters
    req.filters = {};
    allowedFilters.forEach(filter => {
      if (filters[filter] !== undefined && filters[filter] !== null && filters[filter] !== '') {
        req.filters[filter] = filters[filter];
      }
    });
    
    next();
  };
};

/**
 * Apply search to Supabase query
 */
const applySearch = (queryBuilder, search) => {
  if (!search.query || !search.fields.length) {
    return queryBuilder;
  }
  
  // Create OR conditions for search across multiple fields
  const searchConditions = search.fields.map(field => 
    `${field}.ilike.%${search.query}%`
  ).join(',');
  
  return queryBuilder.or(searchConditions);
};

/**
 * Apply filters to Supabase query
 */
const applyFilters = (queryBuilder, filters) => {
  Object.entries(filters).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      queryBuilder = queryBuilder.in(key, value);
    } else if (typeof value === 'string' && value.includes(',')) {
      queryBuilder = queryBuilder.in(key, value.split(','));
    } else {
      queryBuilder = queryBuilder.eq(key, value);
    }
  });
  
  return queryBuilder;
};

/**
 * Complete pagination, search, and filter middleware
 */
const paginateSearchFilter = (tableName, options = {}) => {
  const {
    defaultSort = 'created_at',
    allowedFilters = [],
    searchFields = [],
    defaultFilters = {}
  } = options;
  
  return [
    parseSearchAndFilters(allowedFilters, searchFields),
    paginateResults(tableName, defaultSort),
    async (req, res, next) => {
      try {
        // Add utilities to request
        req.queryUtils = {
          applySearch: (queryBuilder) => applySearch(queryBuilder, req.search),
          applyFilters: (queryBuilder) => applyFilters(queryBuilder, { ...defaultFilters, ...req.filters }),
          applyAll: (queryBuilder) => {
            let query = queryBuilder;
            query = applyFilters(query, { ...defaultFilters, ...req.filters });
            query = applySearch(query, req.search);
            query = req.paginate.apply(query);
            return query;
          }
        };
        
        next();
      } catch (error) {
        console.error('❌ Query utils middleware error:', error);
        res.status(500).json({
          success: false,
          error: 'QUERY_ERROR',
          message: 'Failed to process query parameters',
          timestamp: new Date().toISOString()
        });
      }
    }
  ];
};

/**
 * Helper function to create paginated response
 */
const createPaginatedResponse = async (req, data, totalCount = null) => {
  try {
    // Get total count if not provided
    const total = totalCount !== null ? totalCount : await req.paginate.getTotalCount(req.filters);
    
    // Create pagination metadata
    const pagination = req.paginate.createMeta(total);
    
    return {
      success: true,
      data,
      pagination,
      count: data.length,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('❌ Create paginated response error:', error);
    throw error;
  }
};

module.exports = {
  parsePaginationParams,
  applyPagination,
  getTotalCount,
  paginateResults,
  parseSearchAndFilters,
  applySearch,
  applyFilters,
  paginateSearchFilter,
  createPaginatedResponse
};
