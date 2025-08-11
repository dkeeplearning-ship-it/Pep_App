const { query } = require('./query');
const { supabase } = require('../config/supabase');
const { performanceMonitor, queryCache } = require('../middleware/performanceOptimization');

/**
 * Optimized query utility with caching and performance monitoring
 */

/**
 * Execute a query with performance monitoring and optional caching
 */
async function optimizedQuery(queryBuilder, options = {}) {
  const {
    cache = false,
    cacheTTL = 5 * 60 * 1000, // 5 minutes
    cacheKey = null,
    queryName = 'Unknown Query',
    timeout = 30000 // 30 seconds
  } = options;

  // Generate cache key if caching is enabled
  let finalCacheKey = null;
  if (cache) {
    finalCacheKey = cacheKey || generateCacheKey(queryBuilder);
    
    // Check cache first
    const cachedResult = queryCache.get(finalCacheKey);
    if (cachedResult) {
      return cachedResult;
    }
  }

  // Execute query with performance monitoring
  const result = await performanceMonitor.monitorQuery(queryName, async () => {
    return await query(queryBuilder);
  });

  // Cache the result if caching is enabled
  if (cache && finalCacheKey && result) {
    queryCache.set(finalCacheKey, result);
  }

  return result;
}

/**
 * Generate a cache key from query builder
 */
function generateCacheKey(queryBuilder) {
  // This is a simplified cache key generation
  // In a real implementation, you'd want to serialize the query properly
  const queryString = JSON.stringify(queryBuilder);
  return `query:${Buffer.from(queryString).toString('base64').substring(0, 50)}`;
}

/**
 * Optimized queries for common operations
 */
const optimizedQueries = {
  /**
   * Get active students with caching
   */
  async getActiveStudents(options = {}) {
    const { batchId, sectionId, limit = 100 } = options;
    
    let queryBuilder = supabase
      .from('students')
      .select(`
        id, name, registration_no, email, status,
        current_term_id, batch_id, section_id,
        batches:batch_id(id, name, year),
        sections:section_id(id, name)
      `)
      .eq('status', 'Active');

    if (batchId) queryBuilder = queryBuilder.eq('batch_id', batchId);
    if (sectionId) queryBuilder = queryBuilder.eq('section_id', sectionId);
    
    queryBuilder = queryBuilder.limit(limit).order('name');

    return optimizedQuery(queryBuilder, {
      cache: true,
      cacheTTL: 10 * 60 * 1000, // 10 minutes
      queryName: 'Get Active Students'
    });
  },

  /**
   * Get current term with caching
   */
  async getCurrentTerm() {
    const queryBuilder = supabase
      .from('terms')
      .select('id, name, description, start_date, end_date, academic_year')
      .eq('is_current', true)
      .limit(1);

    return optimizedQuery(queryBuilder, {
      cache: true,
      cacheTTL: 30 * 60 * 1000, // 30 minutes
      queryName: 'Get Current Term'
    });
  },

  /**
   * Get student scores with optimization
   */
  async getStudentScores(studentId, termId, options = {}) {
    const { componentIds = null, limit = 1000 } = options;
    
    let queryBuilder = supabase
      .from('student_scores')
      .select(`
        id, student_id, component_id, term_id, score, max_score,
        created_at, updated_at,
        components:component_id(id, name, weightage, max_score),
        students:student_id(id, name, registration_no)
      `)
      .eq('student_id', studentId)
      .eq('term_id', termId);

    if (componentIds && Array.isArray(componentIds)) {
      queryBuilder = queryBuilder.in('component_id', componentIds);
    }

    queryBuilder = queryBuilder.limit(limit).order('updated_at', { ascending: false });

    return optimizedQuery(queryBuilder, {
      cache: true,
      cacheTTL: 2 * 60 * 1000, // 2 minutes
      queryName: 'Get Student Scores'
    });
  },

  /**
   * Get batch-term weightage configuration with caching
   */
  async getBatchTermWeightage(batchId, termId) {
    const queryBuilder = supabase
      .from('batch_term_weightage_config')
      .select(`
        id, batch_id, term_id, config_name, description, is_active,
        quadrant_weightages:quadrant_weightages(
          quadrant_id, weightage, minimum_attendance,
          quadrants:quadrant_id(id, name, description)
        ),
        batches:batch_id(id, name, year),
        terms:term_id(id, name, academic_year)
      `)
      .eq('batch_id', batchId)
      .eq('term_id', termId)
      .eq('is_active', true)
      .limit(1);

    return optimizedQuery(queryBuilder, {
      cache: true,
      cacheTTL: 15 * 60 * 1000, // 15 minutes
      queryName: 'Get Batch Term Weightage'
    });
  },

  /**
   * Get student score summary with optimization
   */
  async getStudentScoreSummary(studentId, termId, options = {}) {
    const { quadrantIds = null } = options;
    
    let queryBuilder = supabase
      .from('student_score_summary')
      .select(`
        id, student_id, term_id, quadrant_id,
        total_score, max_score, percentage, grade,
        attendance_percentage, is_eligible,
        updated_at,
        quadrants:quadrant_id(id, name, description),
        students:student_id(id, name, registration_no),
        terms:term_id(id, name, academic_year)
      `)
      .eq('student_id', studentId)
      .eq('term_id', termId);

    if (quadrantIds && Array.isArray(quadrantIds)) {
      queryBuilder = queryBuilder.in('quadrant_id', quadrantIds);
    }

    queryBuilder = queryBuilder.order('updated_at', { ascending: false });

    return optimizedQuery(queryBuilder, {
      cache: true,
      cacheTTL: 5 * 60 * 1000, // 5 minutes
      queryName: 'Get Student Score Summary'
    });
  },

  /**
   * Get components with caching
   */
  async getActiveComponents(options = {}) {
    const { subCategoryId = null, quadrantId = null } = options;
    
    let queryBuilder = supabase
      .from('components')
      .select(`
        id, name, description, weightage, max_score,
        sub_category_id, display_order, is_active,
        sub_categories:sub_category_id(
          id, name, quadrant_id,
          quadrants:quadrant_id(id, name)
        )
      `)
      .eq('is_active', true);

    if (subCategoryId) queryBuilder = queryBuilder.eq('sub_category_id', subCategoryId);
    if (quadrantId) {
      queryBuilder = queryBuilder.eq('sub_categories.quadrant_id', quadrantId);
    }

    queryBuilder = queryBuilder.order('display_order');

    return optimizedQuery(queryBuilder, {
      cache: true,
      cacheTTL: 20 * 60 * 1000, // 20 minutes
      queryName: 'Get Active Components'
    });
  },

  /**
   * Bulk insert with optimization
   */
  async bulkInsert(table, records, options = {}) {
    const { batchSize = 100, onConflict = null } = options;
    
    if (records.length <= batchSize) {
      let queryBuilder = supabase.from(table).insert(records);
      if (onConflict) queryBuilder = queryBuilder.onConflict(onConflict);
      
      return optimizedQuery(queryBuilder, {
        queryName: `Bulk Insert ${table}`
      });
    }

    // Process in batches
    const results = [];
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      
      let queryBuilder = supabase.from(table).insert(batch);
      if (onConflict) queryBuilder = queryBuilder.onConflict(onConflict);
      
      const result = await optimizedQuery(queryBuilder, {
        queryName: `Bulk Insert ${table} (Batch ${Math.floor(i / batchSize) + 1})`
      });
      
      results.push(result);
      
      // Small delay between batches
      if (i + batchSize < records.length) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }

    return results;
  }
};

/**
 * Cache invalidation utilities
 */
const cacheInvalidation = {
  /**
   * Invalidate cache for specific patterns
   */
  invalidatePattern(pattern) {
    const keys = Array.from(queryCache.cache.keys());
    const matchingKeys = keys.filter(key => key.includes(pattern));
    
    matchingKeys.forEach(key => queryCache.delete(key));
    
    return matchingKeys.length;
  },

  /**
   * Invalidate student-related caches
   */
  invalidateStudent(studentId) {
    return this.invalidatePattern(`student:${studentId}`);
  },

  /**
   * Invalidate term-related caches
   */
  invalidateTerm(termId) {
    return this.invalidatePattern(`term:${termId}`);
  },

  /**
   * Invalidate batch-related caches
   */
  invalidateBatch(batchId) {
    return this.invalidatePattern(`batch:${batchId}`);
  }
};

module.exports = {
  optimizedQuery,
  optimizedQueries,
  cacheInvalidation,
  generateCacheKey
};
