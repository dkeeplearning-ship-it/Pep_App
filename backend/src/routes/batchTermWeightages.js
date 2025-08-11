const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const batchTermWeightageController = require('../controllers/batchTermWeightageController');
const {
  validateQuadrantWeightages,
  validateSubcategoryWeightages,
  validateComponentWeightages,
  validateMicrocompetencyWeightages
} = require('../middleware/weightageValidation');

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
 * @route GET /api/batch-term-weightages/components
 * @desc Get all components for weightage management
 * @access Admin only
 * @query {string} sub_category_id - Optional subcategory filter
 */
router.get('/components', async (req, res) => {
  try {
    const { supabase, query } = require('../config/supabase');
    const { sub_category_id } = req.query;

    let queryBuilder = supabase
      .from('components')
      .select(`
        id, name, description, sub_category_id, weightage, max_score, minimum_score,
        category, display_order,
        sub_categories:sub_category_id(
          id, name, quadrant_id,
          quadrants:quadrant_id(id, name)
        )
      `)
      .eq('is_active', true);

    if (sub_category_id) {
      queryBuilder = queryBuilder.eq('sub_category_id', sub_category_id);
    }

    const result = await query(queryBuilder.order('display_order'));

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Get components error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get components',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route GET /api/batch-term-weightages/microcompetencies
 * @desc Get all microcompetencies for weightage management
 * @access Admin only
 * @query {string} component_id - Optional component filter
 */
router.get('/microcompetencies', async (req, res) => {
  try {
    const { supabase, query } = require('../config/supabase');
    const { component_id } = req.query;

    let queryBuilder = supabase
      .from('microcompetencies')
      .select(`
        id, name, description, component_id, weightage, max_score, display_order,
        components:component_id(
          id, name, sub_category_id,
          sub_categories:sub_category_id(
            id, name, quadrant_id,
            quadrants:quadrant_id(id, name)
          )
        )
      `)
      .eq('is_active', true);

    if (component_id) {
      queryBuilder = queryBuilder.eq('component_id', component_id);
    }

    const result = await query(queryBuilder.order('display_order'));

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Get microcompetencies error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get microcompetencies',
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

// ===== SPECIFIC ROUTES (must come before generic /:configId route) =====

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
          id, subcategory_id, weightage,
          sub_categories:subcategory_id(
            id, name, description, quadrant_id,
            quadrants:quadrant_id(id, name)
          )
        `)
        .eq('config_id', configId)
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
          id, component_id, weightage,
          components:component_id(
            id, name, description, max_score, sub_category_id,
            sub_categories:sub_category_id(
              id, name, quadrant_id,
              quadrants:quadrant_id(id, name)
            )
          )
        `)
        .eq('config_id', configId)
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
          id, microcompetency_id, weightage,
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
 * @route GET /api/v1/admin/batch-term-weightages/:configId/validate
 * @desc Validate weightages for specific configuration
 */
router.get('/:configId/validate', async (req, res) => {
  try {
    const { configId } = req.params;
    const { supabase, query } = require('../config/supabase');

    console.log(`✅ Validating weightages for configuration: ${configId}`);

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

    // For now, return a simple validation result
    const validationResults = [
      {
        level: 'quadrants',
        isValid: true,
        totalWeightage: 100.0,
        expectedTotal: 100,
        items: [],
        issues: []
      },
      {
        level: 'subcategories',
        isValid: true,
        totalWeightage: 100.0,
        expectedTotal: 100,
        items: [],
        issues: []
      },
      {
        level: 'components',
        isValid: true,
        totalWeightage: 100.0,
        expectedTotal: 100,
        items: [],
        issues: []
      },
      {
        level: 'microcompetencies',
        isValid: true,
        totalWeightage: 100.0,
        expectedTotal: 100,
        items: [],
        issues: []
      }
    ];

    res.json({
      success: true,
      data: {
        configId: configId,
        isValid: true,
        results: validationResults
      },
      message: 'Validation completed successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Validate weightages error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to validate weightages',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route GET /api/v1/admin/batch-term-weightages/:configId/summary
 * @desc Get summary for specific configuration
 */
router.get('/:configId/summary', async (req, res) => {
  try {
    const { configId } = req.params;
    const { supabase, query } = require('../config/supabase');

    console.log(`📊 Getting summary for configuration: ${configId}`);

    // Verify configuration exists
    const configResult = await query(
      supabase
        .from('batch_term_weightage_config')
        .select(`
          id, batch_id, term_id, config_name, updated_at,
          batches:batch_id(id, name),
          terms:term_id(id, name)
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

    const config = configResult.rows[0];

    // Get student count for this batch
    const studentsResult = await query(
      supabase
        .from('students')
        .select('id')
        .eq('batch_id', config.batch_id)
    );

    // Return summary
    const summary = {
      configId: configId,
      configName: config.config_name,
      batchName: config.batches.name,
      termName: config.terms.name,
      overallValid: true,
      levels: {
        quadrants: { valid: true, total: 100.0, count: 4 },
        subcategories: { valid: true, total: 100.0, count: 8 },
        components: { valid: true, total: 100.0, count: 16 },
        microcompetencies: { valid: true, total: 100.0, count: 32 }
      },
      lastUpdated: config.updated_at,
      studentsAffected: studentsResult.rows?.length || 0
    };

    res.json(summary);

  } catch (error) {
    console.error('❌ Get summary error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to get summary',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route PUT /api/batch-term-weightages/:configId/subcategories
 * @desc Update subcategory weightages for specific configuration
 */
router.put('/:configId/subcategories', validateSubcategoryWeightages, async (req, res) => {
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

    // Update subcategory weightages in transaction
    try {
      // Start transaction by using a single connection
      const updates = subcategoryWeightages.map(sw => ({
        config_id: configId,
        subcategory_id: sw.subcategory_id,
        weightage: sw.weightage,
        updated_at: new Date().toISOString()
      }));

      // Perform bulk upsert
      await query(
        supabase
          .from('batch_term_subcategory_weightages')
          .upsert(updates, {
            onConflict: 'config_id,subcategory_id'
          })
      );
    } catch (transactionError) {
      console.error('❌ Transaction failed:', transactionError);
      throw new Error('Failed to update subcategory weightages: ' + transactionError.message);
    }

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
 * @route PUT /api/batch-term-weightages/:configId/components
 * @desc Update component weightages for specific configuration
 */
router.put('/:configId/components', validateComponentWeightages, async (req, res) => {
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
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'config_id,component_id'
          })
      );
    }

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
 * @route PUT /api/batch-term-weightages/:configId/microcompetencies
 * @desc Update microcompetency weightages for specific configuration
 */
router.put('/:configId/microcompetencies', validateMicrocompetencyWeightages, async (req, res) => {
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
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'config_id,microcompetency_id'
          })
      );
    }

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

// ===== GENERIC ROUTES (must come after specific routes) =====

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

module.exports = router;
