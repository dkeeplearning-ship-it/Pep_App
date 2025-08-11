const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const batchTermWeightageController = require('../controllers/batchTermWeightageController');

/**
 * Batch Term Weightage Routes
 * All routes require authentication and admin role
 */

// Apply authentication and admin role requirement to all routes
router.use(authenticateToken);
router.use(requireRole('admin'));

/**
 * @route GET /api/batch-term-weightages/batches
 * @desc Get all batches for weightage management
 * @access Admin only
 */
router.get('/batches', async (req, res) => {
  try {
    const { supabase, query } = require('../config/supabase');

    const result = await query(
      supabase
        .from('batches')
        .select('id, name, year, is_active, current_term_number, max_terms')
        .eq('is_active', true)
        .order('name')
    );

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Get batches error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get batches',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route GET /api/batch-term-weightages/terms
 * @desc Get all terms for weightage management
 * @access Admin only
 */
router.get('/terms', async (req, res) => {
  try {
    const { supabase, query } = require('../config/supabase');

    const result = await query(
      supabase
        .from('terms')
        .select('id, name, description, start_date, end_date, is_active, term_number, academic_year')
        .eq('is_active', true)
        .order('term_number')
    );

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Get terms error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get terms',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route GET /api/batch-term-weightages/quadrants
 * @desc Get all quadrants for weightage management
 * @access Admin only
 */
router.get('/quadrants', async (req, res) => {
  try {
    const { supabase, query } = require('../config/supabase');

    const result = await query(
      supabase
        .from('quadrants')
        .select('id, name, description, weightage, minimum_attendance, display_order')
        .eq('is_active', true)
        .order('display_order')
    );

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Get quadrants error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get quadrants',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route GET /api/batch-term-weightages/subcategories
 * @desc Get all subcategories for weightage management
 * @access Admin only
 * @query {string} quadrant_id - Optional quadrant filter
 */
router.get('/subcategories', async (req, res) => {
  try {
    const { supabase, query } = require('../config/supabase');
    const { quadrant_id } = req.query;

    let queryBuilder = supabase
      .from('sub_categories')
      .select(`
        id, name, description, quadrant_id, weightage, display_order,
        quadrants:quadrant_id(id, name)
      `)
      .eq('is_active', true);

    if (quadrant_id) {
      queryBuilder = queryBuilder.eq('quadrant_id', quadrant_id);
    }

    const result = await query(queryBuilder.order('display_order'));

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Get subcategories error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get subcategories',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route POST /api/batch-term-weightages/copy
 * @desc Copy weightage configuration from one batch-term to another
 * @access Admin only
 * @body {string} source_batch_id - Source batch UUID
 * @body {string} source_term_id - Source term UUID
 * @body {string} target_batch_id - Target batch UUID
 * @body {string} target_term_id - Target term UUID
 * @body {string} config_name - New configuration name
 * @body {string} description - Optional description
 */
router.post('/copy', async (req, res) => {
  try {
    const {
      source_batch_id,
      source_term_id,
      target_batch_id,
      target_term_id,
      config_name,
      description
    } = req.body;

    if (!source_batch_id || !source_term_id || !target_batch_id || !target_term_id || !config_name) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'source_batch_id, source_term_id, target_batch_id, target_term_id, and config_name are required',
        timestamp: new Date().toISOString()
      });
    }

    const enhancedWeightageService = require('../services/enhancedWeightageValidationService');

    // Get source configuration
    const sourceConfig = await enhancedWeightageService.getBatchTermWeightageConfig(source_batch_id, source_term_id);
    if (!sourceConfig) {
      return res.status(404).json({
        success: false,
        error: 'Source configuration not found',
        message: 'No weightage configuration found for the source batch-term combination',
        timestamp: new Date().toISOString()
      });
    }

    // Create new configuration with inheritance
    const result = await enhancedWeightageService.createBatchTermWeightageConfig({
      batchId: target_batch_id,
      termId: target_term_id,
      configName: config_name,
      description: description || `Copied from ${sourceConfig.config_name}`,
      createdBy: req.user.id,
      inheritFrom: sourceConfig.id
    });

    res.status(201).json({
      success: true,
      data: result,
      message: 'Weightage configuration copied successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Copy configuration error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to copy configuration',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route GET /api/batch-term-weightages
 * @desc Get all batch-term weightage configurations
 * @access Admin only
 * @query {string} batch_id - Optional batch filter
 * @query {string} term_id - Optional term filter
 * @query {boolean} is_active - Optional active status filter
 */
router.get('/', batchTermWeightageController.getAllConfigurations);

/**
 * @route GET /api/batch-term-weightages/:configId
 * @desc Get specific batch-term weightage configuration by ID
 * @access Admin only
 * @param {string} configId - Configuration UUID
 */
router.get('/:configId', async (req, res) => {
  try {
    const { configId } = req.params;
    const { supabase, query } = require('../config/supabase');

    // Get configuration details
    const configResult = await query(
      supabase
        .from('batch_term_weightage_config')
        .select(`
          id, batch_id, term_id, config_name, description, is_active,
          created_at, updated_at, created_by,
          batches:batch_id(id, name, year),
          terms:term_id(id, name, academic_year)
        `)
        .eq('id', configId)
        .eq('is_active', true)
        .limit(1)
    );

    if (!configResult.rows || configResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Configuration not found',
        message: 'No weightage configuration found with the provided ID',
        timestamp: new Date().toISOString()
      });
    }

    // Get quadrant weightages separately
    const weightagesResult = await query(
      supabase
        .from('batch_term_quadrant_weightages')
        .select(`
          id, quadrant_id, weightage, minimum_attendance, business_rules,
          quadrants:quadrant_id(id, name, description)
        `)
        .eq('config_id', configId)
    );

    const config = configResult.rows[0];
    config.quadrant_weightages = weightagesResult.rows || [];

    const result = { rows: [config] };

    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Configuration not found',
        message: 'No weightage configuration found with the provided ID',
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Get configuration error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get configuration',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route PUT /api/batch-term-weightages/:configId
 * @desc Update specific batch-term weightage configuration
 * @access Admin only
 * @param {string} configId - Configuration UUID
 */
router.put('/:configId', async (req, res) => {
  try {
    const { configId } = req.params;
    const { quadrant_weightages } = req.body;
    const { supabase, query } = require('../config/supabase');

    if (!quadrant_weightages || !Array.isArray(quadrant_weightages)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request',
        message: 'quadrant_weightages array is required',
        timestamp: new Date().toISOString()
      });
    }

    // Validate total weightage adds up to 100%
    const totalWeightage = quadrant_weightages.reduce((sum, qw) => sum + (qw.weightage || 0), 0);
    if (Math.abs(totalWeightage - 100) > 0.01) {
      return res.status(400).json({
        success: false,
        error: 'Invalid weightages',
        message: `Total weightage must equal 100%. Current total: ${totalWeightage}%`,
        timestamp: new Date().toISOString()
      });
    }

    // Update quadrant weightages
    for (const qw of quadrant_weightages) {
      await query(
        supabase
          .from('batch_term_quadrant_weightages')
          .update({
            weightage: qw.weightage,
            minimum_attendance: qw.minimum_attendance || 0,
            business_rules: qw.business_rules || {},
            updated_at: new Date().toISOString()
          })
          .eq('config_id', configId)
          .eq('quadrant_id', qw.quadrant_id)
      );
    }

    // Update configuration timestamp
    await query(
      supabase
        .from('batch_term_weightage_config')
        .update({
          updated_at: new Date().toISOString()
        })
        .eq('id', configId)
    );

    res.json({
      success: true,
      message: 'Configuration updated successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Update configuration error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update configuration',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route GET /api/batch-term-weightages/:batchId/:termId
 * @desc Get specific batch-term weightage configuration
 * @access Admin only
 * @param {string} batchId - Batch UUID
 * @param {string} termId - Term UUID
 */
router.get('/:batchId/:termId', batchTermWeightageController.getConfiguration);

/**
 * @route POST /api/batch-term-weightages
 * @desc Create new batch-term weightage configuration
 * @access Admin only
 * @body {string} batch_id - Batch UUID
 * @body {string} term_id - Term UUID
 * @body {string} config_name - Configuration name
 * @body {string} description - Optional description
 * @body {string} inherit_from - Optional source configuration ID to inherit from
 */
router.post('/', batchTermWeightageController.createConfiguration);

/**
 * @route PUT /api/batch-term-weightages/:batchId/:termId/quadrants
 * @desc Update quadrant weightages for a batch-term configuration
 * @access Admin only
 * @param {string} batchId - Batch UUID
 * @param {string} termId - Term UUID
 * @body {Array} weightages - Array of quadrant weightage objects
 * @body {string} weightages[].quadrant_id - Quadrant ID
 * @body {number} weightages[].weightage - Weightage percentage (0-100)
 * @body {number} weightages[].minimum_attendance - Optional minimum attendance
 * @body {Object} weightages[].business_rules - Optional business rules
 */
router.put('/:batchId/:termId/quadrants', batchTermWeightageController.updateQuadrantWeightages);

/**
 * @route PUT /api/batch-term-weightages/:batchId/:termId/subcategories
 * @desc Update subcategory weightages for a batch-term configuration
 * @access Admin only
 * @param {string} batchId - Batch UUID
 * @param {string} termId - Term UUID
 * @body {Array} weightages - Array of subcategory weightage objects
 * @body {string} weightages[].subcategory_id - Subcategory UUID
 * @body {string} weightages[].quadrant_id - Parent quadrant ID
 * @body {number} weightages[].weightage - Weightage percentage (0-100)
 */
router.put('/:batchId/:termId/subcategories', batchTermWeightageController.updateSubcategoryWeightages);

/**
 * @route GET /api/batch-term-weightages/:batchId/:termId/validate
 * @desc Validate batch-term weightage configuration
 * @access Admin only
 * @param {string} batchId - Batch UUID
 * @param {string} termId - Term UUID
 */
router.get('/:batchId/:termId/validate', batchTermWeightageController.validateConfiguration);

/**
 * @route POST /api/batch-term-weightages/:batchId/:termId/recalculate
 * @desc Recalculate scores for all students in a batch-term after weightage changes
 * @access Admin only
 * @param {string} batchId - Batch UUID
 * @param {string} termId - Term UUID
 */
router.post('/:batchId/:termId/recalculate', batchTermWeightageController.recalculateScores);

/**
 * @route GET /api/batch-term-weightages/:configId/subcategories
 * @desc Get subcategory weightages for specific configuration
 * @access Admin only
 * @param {string} configId - Configuration UUID
 */
router.get('/:configId/subcategories', async (req, res) => {
  try {
    const { configId } = req.params;
    const { supabase, query } = require('../config/supabase');

    console.log(`📋 Getting subcategory weightages for configuration: ${configId}`);

    // Verify configuration exists
    const configResult = await query(
      supabase
        .from('batch_term_weightage_config')
        .select('id, batch_id, term_id, config_name')
        .eq('id', configId)
        .eq('is_active', true)
        .limit(1)
    );

    if (!configResult.rows || configResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Configuration not found',
        message: 'No weightage configuration found with the provided ID',
        timestamp: new Date().toISOString()
      });
    }

    // Get subcategory weightages
    const weightagesResult = await query(
      supabase
        .from('batch_term_subcategory_weightages')
        .select(`
          id, subcategory_id, weightage, is_active, business_rules,
          sub_categories:subcategory_id(
            id, name, description, quadrant_id,
            quadrants:quadrant_id(id, name)
          )
        `)
        .eq('config_id', configId)
        .order('sub_categories.quadrant_id, sub_categories.display_order')
    );

    res.json({
      success: true,
      data: {
        configId: configId,
        configName: configResult.rows[0].config_name,
        subcategoryWeightages: weightagesResult.rows || []
      },
      message: 'Subcategory weightages retrieved successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Get subcategory weightages error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to retrieve subcategory weightages',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route PUT /api/batch-term-weightages/:configId/subcategories
 * @desc Update subcategory weightages for specific configuration
 * @access Admin only
 * @param {string} configId - Configuration UUID
 */
router.put('/:configId/subcategories', async (req, res) => {
  try {
    const { configId } = req.params;
    const { subcategoryWeightages } = req.body;
    const { supabase, query } = require('../config/supabase');

    console.log(`📝 Updating subcategory weightages for configuration: ${configId}`);

    // Verify configuration exists
    const configResult = await query(
      supabase
        .from('batch_term_weightage_config')
        .select('id, batch_id, term_id, config_name')
        .eq('id', configId)
        .eq('is_active', true)
        .limit(1)
    );

    if (!configResult.rows || configResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Configuration not found',
        message: 'No weightage configuration found with the provided ID',
        timestamp: new Date().toISOString()
      });
    }

    // Validate subcategory weightages
    if (!Array.isArray(subcategoryWeightages)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input',
        message: 'subcategoryWeightages must be an array',
        timestamp: new Date().toISOString()
      });
    }

    // Update subcategory weightages
    for (const sw of subcategoryWeightages) {
      await query(
        supabase
          .from('batch_term_subcategory_weightages')
          .upsert({
            config_id: configId,
            subcategory_id: sw.subcategory_id,
            weightage: sw.weightage,
            is_active: sw.is_active !== undefined ? sw.is_active : true,
            business_rules: sw.business_rules || {},
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'config_id,subcategory_id'
          })
      );
    }

    // Create audit record
    await query(
      supabase
        .from('weightage_change_audit')
        .insert({
          config_id: configId,
          change_type: 'subcategory_update',
          changed_by: req.user?.id || 'system',
          old_values: {},
          new_values: { subcategoryWeightages },
          change_reason: 'Subcategory weightages updated via API',
          created_at: new Date().toISOString()
        })
    );

    res.json({
      success: true,
      message: 'Subcategory weightages updated successfully',
      data: {
        configId: configId,
        updatedCount: subcategoryWeightages.length
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Update subcategory weightages error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to update subcategory weightages',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route GET /api/batch-term-weightages/:configId/components
 * @desc Get component weightages for specific configuration
 * @access Admin only
 * @param {string} configId - Configuration UUID
 */
router.get('/:configId/components', async (req, res) => {
  try {
    const { configId } = req.params;
    const { supabase, query } = require('../config/supabase');

    console.log(`📋 Getting component weightages for configuration: ${configId}`);

    // Verify configuration exists
    const configResult = await query(
      supabase
        .from('batch_term_weightage_config')
        .select('id, batch_id, term_id, config_name')
        .eq('id', configId)
        .eq('is_active', true)
        .limit(1)
    );

    if (!configResult.rows || configResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Configuration not found',
        message: 'No weightage configuration found with the provided ID',
        timestamp: new Date().toISOString()
      });
    }

    // Get component weightages
    const weightagesResult = await query(
      supabase
        .from('batch_term_component_weightages')
        .select(`
          id, component_id, weightage, is_active, business_rules,
          components:component_id(
            id, name, description, max_score, sub_category_id,
            sub_categories:sub_category_id(
              id, name, quadrant_id,
              quadrants:quadrant_id(id, name)
            )
          )
        `)
        .eq('config_id', configId)
        .order('components.sub_categories.quadrant_id, components.sub_categories.display_order, components.display_order')
    );

    res.json({
      success: true,
      data: {
        configId: configId,
        configName: configResult.rows[0].config_name,
        componentWeightages: weightagesResult.rows || []
      },
      message: 'Component weightages retrieved successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Get component weightages error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to retrieve component weightages',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route PUT /api/batch-term-weightages/:configId/components
 * @desc Update component weightages for specific configuration
 * @access Admin only
 * @param {string} configId - Configuration UUID
 */
router.put('/:configId/components', async (req, res) => {
  try {
    const { configId } = req.params;
    const { componentWeightages } = req.body;
    const { supabase, query } = require('../config/supabase');

    console.log(`📝 Updating component weightages for configuration: ${configId}`);

    // Verify configuration exists
    const configResult = await query(
      supabase
        .from('batch_term_weightage_config')
        .select('id, batch_id, term_id, config_name')
        .eq('id', configId)
        .eq('is_active', true)
        .limit(1)
    );

    if (!configResult.rows || configResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Configuration not found',
        message: 'No weightage configuration found with the provided ID',
        timestamp: new Date().toISOString()
      });
    }

    // Validate component weightages
    if (!Array.isArray(componentWeightages)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input',
        message: 'componentWeightages must be an array',
        timestamp: new Date().toISOString()
      });
    }

    // Update component weightages
    for (const cw of componentWeightages) {
      await query(
        supabase
          .from('batch_term_component_weightages')
          .upsert({
            config_id: configId,
            component_id: cw.component_id,
            weightage: cw.weightage,
            is_active: cw.is_active !== undefined ? cw.is_active : true,
            business_rules: cw.business_rules || {},
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'config_id,component_id'
          })
      );
    }

    // Create audit record
    await query(
      supabase
        .from('weightage_change_audit')
        .insert({
          config_id: configId,
          change_type: 'component_update',
          changed_by: req.user?.id || 'system',
          old_values: {},
          new_values: { componentWeightages },
          change_reason: 'Component weightages updated via API',
          created_at: new Date().toISOString()
        })
    );

    res.json({
      success: true,
      message: 'Component weightages updated successfully',
      data: {
        configId: configId,
        updatedCount: componentWeightages.length
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Update component weightages error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to update component weightages',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route GET /api/batch-term-weightages/:configId/microcompetencies
 * @desc Get microcompetency weightages for specific configuration
 * @access Admin only
 * @param {string} configId - Configuration UUID
 */
router.get('/:configId/microcompetencies', async (req, res) => {
  try {
    const { configId } = req.params;
    const { supabase, query } = require('../config/supabase');

    console.log(`📋 Getting microcompetency weightages for configuration: ${configId}`);

    // Verify configuration exists
    const configResult = await query(
      supabase
        .from('batch_term_weightage_config')
        .select('id, batch_id, term_id, config_name')
        .eq('id', configId)
        .eq('is_active', true)
        .limit(1)
    );

    if (!configResult.rows || configResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Configuration not found',
        message: 'No weightage configuration found with the provided ID',
        timestamp: new Date().toISOString()
      });
    }

    // Get microcompetency weightages
    const weightagesResult = await query(
      supabase
        .from('batch_term_microcompetency_weightages')
        .select(`
          id, microcompetency_id, weightage, is_active, business_rules,
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
        .eq('config_id', configId)
        .order('microcompetencies.components.sub_categories.quadrant_id, microcompetencies.components.sub_categories.display_order, microcompetencies.components.display_order, microcompetencies.display_order')
    );

    res.json({
      success: true,
      data: {
        configId: configId,
        configName: configResult.rows[0].config_name,
        microcompetencyWeightages: weightagesResult.rows || []
      },
      message: 'Microcompetency weightages retrieved successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Get microcompetency weightages error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to retrieve microcompetency weightages',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route PUT /api/batch-term-weightages/:configId/microcompetencies
 * @desc Update microcompetency weightages for specific configuration
 * @access Admin only
 * @param {string} configId - Configuration UUID
 */
router.put('/:configId/microcompetencies', async (req, res) => {
  try {
    const { configId } = req.params;
    const { microcompetencyWeightages } = req.body;
    const { supabase, query } = require('../config/supabase');

    console.log(`📝 Updating microcompetency weightages for configuration: ${configId}`);

    // Verify configuration exists
    const configResult = await query(
      supabase
        .from('batch_term_weightage_config')
        .select('id, batch_id, term_id, config_name')
        .eq('id', configId)
        .eq('is_active', true)
        .limit(1)
    );

    if (!configResult.rows || configResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Configuration not found',
        message: 'No weightage configuration found with the provided ID',
        timestamp: new Date().toISOString()
      });
    }

    // Validate microcompetency weightages
    if (!Array.isArray(microcompetencyWeightages)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input',
        message: 'microcompetencyWeightages must be an array',
        timestamp: new Date().toISOString()
      });
    }

    // Update microcompetency weightages
    for (const mw of microcompetencyWeightages) {
      await query(
        supabase
          .from('batch_term_microcompetency_weightages')
          .upsert({
            config_id: configId,
            microcompetency_id: mw.microcompetency_id,
            weightage: mw.weightage,
            is_active: mw.is_active !== undefined ? mw.is_active : true,
            business_rules: mw.business_rules || {},
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'config_id,microcompetency_id'
          })
      );
    }

    // Create audit record
    await query(
      supabase
        .from('weightage_change_audit')
        .insert({
          config_id: configId,
          change_type: 'microcompetency_update',
          changed_by: req.user?.id || 'system',
          old_values: {},
          new_values: { microcompetencyWeightages },
          change_reason: 'Microcompetency weightages updated via API',
          created_at: new Date().toISOString()
        })
    );

    res.json({
      success: true,
      message: 'Microcompetency weightages updated successfully',
      data: {
        configId: configId,
        updatedCount: microcompetencyWeightages.length
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Update microcompetency weightages error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to update microcompetency weightages',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
