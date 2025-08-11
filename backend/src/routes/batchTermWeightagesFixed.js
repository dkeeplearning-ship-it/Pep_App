const express = require('express');
const router = express.Router();
const batchTermWeightageController = require('../controllers/batchTermWeightageController');

/**
 * Batch-Term Weightage Management Routes
 * 
 * IMPORTANT: Specific routes (with additional path segments) must come BEFORE generic routes
 * to avoid route conflicts. Express matches routes in the order they are defined.
 */

// ===== SPECIFIC ROUTES (must come first) =====

/**
 * @route GET /api/v1/admin/batch-term-weightages/:configId/subcategories
 * @desc Get subcategory weightages for specific configuration
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

    // Get subcategory weightages (without V2 columns for now)
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
 * @route PUT /api/v1/admin/batch-term-weightages/:configId/subcategories
 * @desc Update subcategory weightages for specific configuration
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
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'config_id,subcategory_id'
          })
      );
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
 * @route GET /api/v1/admin/batch-term-weightages/:configId/components
 * @desc Get component weightages for specific configuration
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
 * @route PUT /api/v1/admin/batch-term-weightages/:configId/components
 * @desc Update component weightages for specific configuration
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
 * @route GET /api/v1/admin/batch-term-weightages/:configId/microcompetencies
 * @desc Get microcompetency weightages for specific configuration
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

// ===== GENERIC ROUTES (must come after specific routes) =====

// Import all other routes from the original file
router.get('/batches', batchTermWeightageController.getBatches);
router.get('/terms', batchTermWeightageController.getTerms);
router.get('/quadrants', batchTermWeightageController.getQuadrants);
router.get('/subcategories', batchTermWeightageController.getSubCategories);
router.get('/', batchTermWeightageController.getAllConfigurations);
router.get('/:configId', batchTermWeightageController.getConfigurationDetails);
router.post('/', batchTermWeightageController.createConfiguration);
router.put('/:configId', batchTermWeightageController.updateConfiguration);
router.delete('/:configId', batchTermWeightageController.deleteConfiguration);

module.exports = router;
