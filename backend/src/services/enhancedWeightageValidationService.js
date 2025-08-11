const { supabase, query } = require('../config/supabase');

/**
 * Enhanced Weightage Validation Service
 * Handles validation for term-batch specific weightages with fallback to default system
 */
class EnhancedWeightageValidationService {

  /**
   * Get active weightage configuration for a batch-term combination
   * @param {string} batchId - Batch UUID
   * @param {string} termId - Term UUID
   * @returns {Promise<Object>} Configuration details or null
   */
  async getBatchTermWeightageConfig(batchId, termId) {
    try {
      const result = await query(
        supabase
          .from('batch_term_weightage_config')
          .select(`
            id,
            config_name,
            description,
            is_active,
            created_at,
            batches:batch_id(id, name),
            terms:term_id(id, name)
          `)
          .eq('batch_id', batchId)
          .eq('term_id', termId)
          .eq('is_active', true)
          .limit(1)
      );

      return result.rows?.[0] || null;
    } catch (error) {
      console.error('Error getting batch-term weightage config:', error);
      throw new Error(`Failed to get weightage configuration: ${error.message}`);
    }
  }

  /**
   * Get quadrant weightages for a specific batch-term with fallback to defaults
   * @param {string} batchId - Batch UUID
   * @param {string} termId - Term UUID
   * @returns {Promise<Array>} Array of quadrant weightages
   */
  async getQuadrantWeightages(batchId, termId) {
    try {
      const config = await this.getBatchTermWeightageConfig(batchId, termId);
      
      if (config) {
        // Get term-batch specific weightages
        const result = await query(
          supabase
            .from('batch_term_quadrant_weightages')
            .select(`
              quadrant_id,
              weightage,
              minimum_attendance,
              business_rules,
              quadrants:quadrant_id(id, name, description)
            `)
            .eq('config_id', config.id)
        );

        if (result.rows && result.rows.length > 0) {
          return result.rows.map(row => ({
            id: row.quadrant_id,
            name: row.quadrants.name,
            description: row.quadrants.description,
            weightage: parseFloat(row.weightage),
            minimum_attendance: parseFloat(row.minimum_attendance || 0),
            business_rules: row.business_rules || {},
            source: 'batch_term_specific'
          }));
        }
      }

      // Fallback to default quadrant weightages
      const defaultResult = await query(
        supabase
          .from('quadrants')
          .select('id, name, description, weightage, minimum_attendance, business_rules')
          .eq('is_active', true)
          .order('display_order')
      );

      return defaultResult.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        weightage: parseFloat(row.weightage),
        minimum_attendance: parseFloat(row.minimum_attendance || 0),
        business_rules: row.business_rules || {},
        source: 'default_system'
      }));

    } catch (error) {
      console.error('Error getting quadrant weightages:', error);
      throw new Error(`Failed to get quadrant weightages: ${error.message}`);
    }
  }

  /**
   * Get subcategory weightages for a specific batch-term with fallback to defaults
   * @param {string} batchId - Batch UUID
   * @param {string} termId - Term UUID
   * @param {string} quadrantId - Optional quadrant filter
   * @returns {Promise<Array>} Array of subcategory weightages
   */
  async getSubcategoryWeightages(batchId, termId, quadrantId = null) {
    try {
      const config = await this.getBatchTermWeightageConfig(batchId, termId);
      
      if (config) {
        // Get term-batch specific weightages
        let queryBuilder = supabase
          .from('batch_term_subcategory_weightages')
          .select(`
            subcategory_id,
            weightage,
            sub_categories:subcategory_id(
              id, name, description, quadrant_id,
              quadrants:quadrant_id(id, name)
            )
          `)
          .eq('config_id', config.id);

        if (quadrantId) {
          queryBuilder = queryBuilder.eq('sub_categories.quadrant_id', quadrantId);
        }

        const result = await query(queryBuilder);

        if (result.rows && result.rows.length > 0) {
          return result.rows.map(row => ({
            id: row.subcategory_id,
            name: row.sub_categories.name,
            description: row.sub_categories.description,
            quadrant_id: row.sub_categories.quadrant_id,
            quadrant_name: row.sub_categories.quadrants.name,
            weightage: parseFloat(row.weightage),
            source: 'batch_term_specific'
          }));
        }
      }

      // Fallback to default subcategory weightages
      let defaultQueryBuilder = supabase
        .from('sub_categories')
        .select(`
          id, name, description, quadrant_id, weightage,
          quadrants:quadrant_id(id, name)
        `)
        .eq('is_active', true);

      if (quadrantId) {
        defaultQueryBuilder = defaultQueryBuilder.eq('quadrant_id', quadrantId);
      }

      const defaultResult = await query(defaultQueryBuilder.order('display_order'));

      return defaultResult.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        quadrant_id: row.quadrant_id,
        quadrant_name: row.quadrants.name,
        weightage: parseFloat(row.weightage),
        source: 'default_system'
      }));

    } catch (error) {
      console.error('Error getting subcategory weightages:', error);
      throw new Error(`Failed to get subcategory weightages: ${error.message}`);
    }
  }

  /**
   * Get component weightages for a batch-term combination with fallback to defaults
   * @param {string} batchId - Batch UUID
   * @param {string} termId - Term UUID
   * @param {string} subcategoryId - Optional subcategory filter
   * @returns {Promise<Array>} Component weightages
   */
  async getComponentWeightages(batchId, termId, subcategoryId = null) {
    try {
      const config = await this.getBatchTermWeightageConfig(batchId, termId);

      if (config) {
        // Get batch-term specific component weightages
        let queryBuilder = supabase
          .from('batch_term_component_weightages')
          .select(`
            component_id, weightage,
            components:component_id(
              id, name, description, max_score, sub_category_id,
              sub_categories:sub_category_id(
                id, name, quadrant_id,
                quadrants:quadrant_id(id, name)
              )
            )
          `)
          .eq('config_id', config.id);

        if (subcategoryId) {
          queryBuilder = queryBuilder.eq('components.sub_category_id', subcategoryId);
        }

        const result = await query(queryBuilder);

        if (result.rows && result.rows.length > 0) {
          return result.rows.map(row => ({
            id: row.component_id,
            name: row.components.name,
            description: row.components.description,
            max_score: row.components.max_score,
            sub_category_id: row.components.sub_category_id,
            subcategory_name: row.components.sub_categories.name,
            quadrant_id: row.components.sub_categories.quadrant_id,
            quadrant_name: row.components.sub_categories.quadrants.name,
            weightage: parseFloat(row.weightage),
            is_active: true, // Default to true when V2 columns not available
            source: 'batch_term_specific'
          }));
        }
      }

      // Fallback to default component weightages
      let defaultQueryBuilder = supabase
        .from('components')
        .select(`
          id, name, description, max_score, weightage, sub_category_id,
          sub_categories:sub_category_id(
            id, name, quadrant_id,
            quadrants:quadrant_id(id, name)
          )
        `)
        .eq('is_active', true);

      if (subcategoryId) {
        defaultQueryBuilder = defaultQueryBuilder.eq('sub_category_id', subcategoryId);
      }

      const defaultResult = await query(defaultQueryBuilder.order('display_order'));

      return defaultResult.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        max_score: row.max_score,
        sub_category_id: row.sub_category_id,
        subcategory_name: row.sub_categories.name,
        quadrant_id: row.sub_categories.quadrant_id,
        quadrant_name: row.sub_categories.quadrants.name,
        weightage: parseFloat(row.weightage),
        is_active: true,
        source: 'default_system'
      }));

    } catch (error) {
      console.error('Error getting component weightages:', error);
      throw new Error(`Failed to get component weightages: ${error.message}`);
    }
  }

  /**
   * Get microcompetency weightages for a batch-term combination with fallback to defaults
   * @param {string} batchId - Batch UUID
   * @param {string} termId - Term UUID
   * @param {string} componentId - Optional component filter
   * @returns {Promise<Array>} Microcompetency weightages
   */
  async getMicrocompetencyWeightages(batchId, termId, componentId = null) {
    try {
      const config = await this.getBatchTermWeightageConfig(batchId, termId);

      if (config) {
        // Get batch-term specific microcompetency weightages
        let queryBuilder = supabase
          .from('batch_term_microcompetency_weightages')
          .select(`
            microcompetency_id, weightage,
            microcompetencies:microcompetency_id(
              id, name, description, max_score, component_id,
              components:component_id(
                id, name, sub_category_id,
                sub_categories:sub_category_id(
                  id, name, quadrant_id,
                  quadrants:quadrant_id(id, name)
                )
              )
            )
          `)
          .eq('config_id', config.id);

        if (componentId) {
          queryBuilder = queryBuilder.eq('microcompetencies.component_id', componentId);
        }

        const result = await query(queryBuilder);

        if (result.rows && result.rows.length > 0) {
          return result.rows.map(row => ({
            id: row.microcompetency_id,
            name: row.microcompetencies.name,
            description: row.microcompetencies.description,
            max_score: row.microcompetencies.max_score,
            component_id: row.microcompetencies.component_id,
            component_name: row.microcompetencies.components.name,
            sub_category_id: row.microcompetencies.components.sub_category_id,
            subcategory_name: row.microcompetencies.components.sub_categories.name,
            quadrant_id: row.microcompetencies.components.sub_categories.quadrant_id,
            quadrant_name: row.microcompetencies.components.sub_categories.quadrants.name,
            weightage: parseFloat(row.weightage),
            is_active: true, // Default to true when V2 columns not available
            source: 'batch_term_specific'
          }));
        }
      }

      // Fallback to default microcompetency weightages
      let defaultQueryBuilder = supabase
        .from('microcompetencies')
        .select(`
          id, name, description, max_score, weightage, component_id,
          components:component_id(
            id, name, sub_category_id,
            sub_categories:sub_category_id(
              id, name, quadrant_id,
              quadrants:quadrant_id(id, name)
            )
          )
        `)
        .eq('is_active', true);

      if (componentId) {
        defaultQueryBuilder = defaultQueryBuilder.eq('component_id', componentId);
      }

      const defaultResult = await query(defaultQueryBuilder.order('display_order'));

      return defaultResult.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        max_score: row.max_score,
        component_id: row.component_id,
        component_name: row.components.name,
        sub_category_id: row.components.sub_category_id,
        subcategory_name: row.components.sub_categories.name,
        quadrant_id: row.components.sub_categories.quadrant_id,
        quadrant_name: row.components.sub_categories.quadrants.name,
        weightage: parseFloat(row.weightage),
        is_active: true,
        source: 'default_system'
      }));

    } catch (error) {
      console.error('Error getting microcompetency weightages:', error);
      throw new Error(`Failed to get microcompetency weightages: ${error.message}`);
    }
  }

  /**
   * Validate weightage totals for a batch-term configuration
   * @param {string} batchId - Batch UUID
   * @param {string} termId - Term UUID
   * @returns {Promise<Object>} Validation result
   */
  async validateBatchTermWeightages(batchId, termId) {
    try {
      const config = await this.getBatchTermWeightageConfig(batchId, termId);
      
      if (!config) {
        return {
          success: true,
          message: 'Using default system weightages',
          source: 'default_system',
          validation_details: await this.validateDefaultWeightages()
        };
      }

      // Use database function for validation
      const validationResult = await query(
        supabase.rpc('validate_weightage_totals', { p_config_id: config.id })
      );

      const validation = validationResult.data;

      return {
        success: validation.valid,
        message: validation.valid ? 'All weightages are valid' : 'Weightage validation failed',
        source: 'batch_term_specific',
        config_id: config.id,
        errors: validation.errors || [],
        validation_details: validation
      };

    } catch (error) {
      console.error('Error validating batch-term weightages:', error);
      return {
        success: false,
        error: 'VALIDATION_FAILED',
        message: `Failed to validate weightages: ${error.message}`
      };
    }
  }

  /**
   * Validate default system weightages (fallback)
   * @returns {Promise<Object>} Validation result
   */
  async validateDefaultWeightages() {
    try {
      // Validate quadrant weightages
      const quadrantResult = await query(
        supabase
          .from('quadrants')
          .select('weightage')
          .eq('is_active', true)
      );

      const quadrantTotal = quadrantResult.rows.reduce(
        (sum, q) => sum + parseFloat(q.weightage), 0
      );

      const errors = [];
      if (Math.abs(quadrantTotal - 100) > 0.01) {
        errors.push(`Quadrant weightages total ${quadrantTotal.toFixed(2)}%, should be 100%`);
      }

      // Validate subcategory weightages within each quadrant
      const subcategoryValidation = await query(
        supabase
          .from('sub_categories')
          .select('quadrant_id, weightage')
          .eq('is_active', true)
      );

      const subcategoryTotals = {};
      subcategoryValidation.rows.forEach(sc => {
        if (!subcategoryTotals[sc.quadrant_id]) {
          subcategoryTotals[sc.quadrant_id] = 0;
        }
        subcategoryTotals[sc.quadrant_id] += parseFloat(sc.weightage);
      });

      Object.entries(subcategoryTotals).forEach(([quadrantId, total]) => {
        if (Math.abs(total - 100) > 0.01) {
          errors.push(`Subcategory weightages in quadrant ${quadrantId} total ${total.toFixed(2)}%, should be 100%`);
        }
      });

      return {
        valid: errors.length === 0,
        errors: errors,
        quadrant_total: quadrantTotal,
        subcategory_totals: subcategoryTotals
      };

    } catch (error) {
      console.error('Error validating default weightages:', error);
      throw new Error(`Failed to validate default weightages: ${error.message}`);
    }
  }

  /**
   * Create a new batch-term weightage configuration
   * @param {Object} configData - Configuration data
   * @returns {Promise<Object>} Created configuration
   */
  async createBatchTermWeightageConfig(configData) {
    try {
      const {
        batchId,
        termId,
        configName,
        description,
        createdBy,
        inheritFrom = null // Can inherit from another config
      } = configData;

      // Check if configuration already exists
      const existing = await this.getBatchTermWeightageConfig(batchId, termId);
      if (existing) {
        throw new Error('Weightage configuration already exists for this batch-term combination');
      }

      // Create the main configuration
      const configResult = await query(
        supabase
          .from('batch_term_weightage_config')
          .insert({
            batch_id: batchId,
            term_id: termId,
            config_name: configName,
            description: description,
            is_active: true,
            created_by: createdBy
          })
          .select('id')
      );

      const configId = configResult.rows[0].id;

      if (inheritFrom) {
        // Copy weightages from another configuration
        await this.copyWeightageConfiguration(inheritFrom, configId);
      } else {
        // Copy from default system weightages
        await this.copyDefaultWeightagesToConfig(configId);
      }

      return {
        success: true,
        config_id: configId,
        message: 'Weightage configuration created successfully'
      };

    } catch (error) {
      console.error('Error creating batch-term weightage config:', error);
      throw new Error(`Failed to create weightage configuration: ${error.message}`);
    }
  }

  /**
   * Copy default system weightages to a new configuration
   * @param {string} configId - Target configuration ID
   */
  async copyDefaultWeightagesToConfig(configId) {
    try {
      // Copy quadrant weightages
      await query(
        supabase.rpc('copy_default_quadrant_weightages', { p_config_id: configId })
      );

      // Copy subcategory weightages
      await query(
        supabase.rpc('copy_default_subcategory_weightages', { p_config_id: configId })
      );

      // Copy component weightages
      await query(
        supabase.rpc('copy_default_component_weightages', { p_config_id: configId })
      );

      // Copy microcompetency weightages
      await query(
        supabase.rpc('copy_default_microcompetency_weightages', { p_config_id: configId })
      );

    } catch (error) {
      console.error('Error copying default weightages:', error);
      throw new Error(`Failed to copy default weightages: ${error.message}`);
    }
  }
}

module.exports = new EnhancedWeightageValidationService();
