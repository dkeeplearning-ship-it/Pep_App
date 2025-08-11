/**
 * Query helper utility for Supabase operations
 * Provides consistent error handling and response formatting
 */

/**
 * Execute a Supabase query with consistent error handling
 * @param {Object} queryBuilder - Supabase query builder object
 * @returns {Object} - Standardized response object
 */
const query = async (queryBuilder) => {
  try {
    const { data, error, count } = await queryBuilder;
    
    if (error) {
      console.error('Supabase query error:', error);
      throw new Error(error.message || 'Database query failed');
    }
    
    return {
      rows: data,
      count: count,
      success: true
    };
  } catch (error) {
    console.error('Query execution error:', error);
    throw error;
  }
};

/**
 * Execute a Supabase query that expects a single result
 * @param {Object} queryBuilder - Supabase query builder object
 * @returns {Object} - Standardized response object with single row
 */
const querySingle = async (queryBuilder) => {
  try {
    const result = await query(queryBuilder);
    
    if (!result.rows || result.rows.length === 0) {
      return {
        rows: null,
        count: 0,
        success: false,
        error: 'No data found'
      };
    }
    
    return {
      rows: result.rows[0],
      count: 1,
      success: true
    };
  } catch (error) {
    console.error('Single query execution error:', error);
    throw error;
  }
};

/**
 * Execute multiple queries in a transaction-like manner
 * @param {Array} queries - Array of query builder objects
 * @returns {Array} - Array of results
 */
const queryMultiple = async (queries) => {
  try {
    const results = await Promise.all(
      queries.map(queryBuilder => query(queryBuilder))
    );
    
    return results;
  } catch (error) {
    console.error('Multiple query execution error:', error);
    throw error;
  }
};

/**
 * Execute a count query
 * @param {Object} queryBuilder - Supabase query builder object with count
 * @returns {Number} - Count result
 */
const queryCount = async (queryBuilder) => {
  try {
    const { count, error } = await queryBuilder;
    
    if (error) {
      console.error('Supabase count query error:', error);
      throw new Error(error.message || 'Count query failed');
    }
    
    return count || 0;
  } catch (error) {
    console.error('Count query execution error:', error);
    throw error;
  }
};

/**
 * Validate UUID format
 * @param {string} uuid - UUID string to validate
 * @returns {boolean} - True if valid UUID
 */
const isValidUUID = (uuid) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

/**
 * Sanitize string input for database queries
 * @param {string} input - Input string to sanitize
 * @returns {string} - Sanitized string
 */
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  // Remove potentially dangerous characters
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/['"]/g, '') // Remove quotes
    .trim(); // Remove leading/trailing whitespace
};

/**
 * Build pagination object for responses
 * @param {number} page - Current page number
 * @param {number} limit - Items per page
 * @param {number} total - Total number of items
 * @returns {Object} - Pagination object
 */
const buildPagination = (page, limit, total) => {
  const totalPages = Math.ceil(total / limit);
  
  return {
    page: parseInt(page),
    limit: parseInt(limit),
    total: total,
    totalPages: totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1
  };
};

module.exports = {
  query,
  querySingle,
  queryMultiple,
  queryCount,
  isValidUUID,
  sanitizeInput,
  buildPagination
};
