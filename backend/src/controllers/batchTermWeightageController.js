const { supabase, query } = require('../config/supabase');
const enhancedWeightageService = require('../services/enhancedWeightageValidationService');
const enhancedScoreService = require('../services/enhancedUnifiedScoreCalculationService');

/**
 * Batch Term Weightage Controller
 * Handles CRUD operations for batch-term specific weightages
 */

/**
 * Get all batch-term weightage configurations
 */
const getAllConfigurations = async (req, res) => {
  try {
    const { batch_id, term_id, is_active } = req.query;

    let queryBuilder = supabase
      .from('batch_term_weightage_config')
      .select(`
        id,
        batch_id,
        term_id,
        config_name,
        description,
        is_active,
        created_at,
        batches:batch_id(id, name),
        terms:term_id(id, name)
      `);

    if (batch_id) {
      queryBuilder = queryBuilder.eq('batch_id', batch_id);
    }
    if (term_id) {
      queryBuilder = queryBuilder.eq('term_id', term_id);
    }
    if (is_active !== undefined) {
      queryBuilder = queryBuilder.eq('is_active', is_active === 'true');
    }

    const result = await query(queryBuilder.order('created_at', { ascending: false }));

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Get all configurations error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get configurations',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Get specific batch-term weightage configuration
 */
const getConfiguration = async (req, res) => {
  try {
    const { batchId, termId } = req.params;

    const config = await enhancedWeightageService.getBatchTermWeightageConfig(batchId, termId);

    if (!config) {
      return res.status(404).json({
        success: false,
        error: 'Configuration not found',
        message: 'No weightage configuration found for this batch-term combination',
        timestamp: new Date().toISOString()
      });
    }

    // Get detailed weightages
    const quadrantWeightages = await enhancedWeightageService.getQuadrantWeightages(batchId, termId);
    const subcategoryWeightages = await enhancedWeightageService.getSubcategoryWeightages(batchId, termId);

    res.json({
      success: true,
      data: {
        config,
        quadrant_weightages: quadrantWeightages,
        subcategory_weightages: subcategoryWeightages
      },
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
};

/**
 * Create new batch-term weightage configuration
 */
const createConfiguration = async (req, res) => {
  try {
    const {
      batch_id,
      term_id,
      config_name,
      description,
      inherit_from = null
    } = req.body;

    if (!batch_id || !term_id || !config_name) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'batch_id, term_id, and config_name are required',
        timestamp: new Date().toISOString()
      });
    }

    const result = await enhancedWeightageService.createBatchTermWeightageConfig({
      batchId: batch_id,
      termId: term_id,
      configName: config_name,
      description,
      createdBy: req.user.id,
      inheritFrom: inherit_from
    });

    res.status(201).json({
      success: true,
      data: result,
      message: 'Weightage configuration created successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Create configuration error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create configuration',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Update quadrant weightages for a batch-term configuration
 */
const updateQuadrantWeightages = async (req, res) => {
  try {
    const { batchId, termId } = req.params;
    const { weightages } = req.body;

    if (!weightages || !Array.isArray(weightages)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid weightages data',
        message: 'weightages must be an array of weightage objects',
        timestamp: new Date().toISOString()
      });
    }

    // Get configuration
    const config = await enhancedWeightageService.getBatchTermWeightageConfig(batchId, termId);
    if (!config) {
      return res.status(404).json({
        success: false,
        error: 'Configuration not found',
        message: 'No weightage configuration found for this batch-term combination',
        timestamp: new Date().toISOString()
      });
    }

    // Validate total weightages
    const totalWeightage = weightages.reduce((sum, w) => sum + parseFloat(w.weightage), 0);
    if (Math.abs(totalWeightage - 100) > 0.01) {
      return res.status(400).json({
        success: false,
        error: 'Invalid weightage total',
        message: `Quadrant weightages must sum to 100%, got ${totalWeightage.toFixed(2)}%`,
        timestamp: new Date().toISOString()
      });
    }

    // Set current user for audit trail
    await query(supabase.rpc('set_config', {
      setting_name: 'app.current_user_id',
      new_value: req.user.id,
      is_local: true
    }));

    // Update weightages
    for (const weightage of weightages) {
      await query(
        supabase
          .from('batch_term_quadrant_weightages')
          .upsert({
            config_id: config.id,
            quadrant_id: weightage.quadrant_id,
            weightage: parseFloat(weightage.weightage),
            minimum_attendance: parseFloat(weightage.minimum_attendance || 0),
            business_rules: weightage.business_rules || {}
          }, {
            onConflict: 'config_id,quadrant_id'
          })
      );
    }

    // Validate the updated configuration
    const validation = await enhancedWeightageService.validateBatchTermWeightages(batchId, termId);

    res.json({
      success: true,
      message: 'Quadrant weightages updated successfully',
      validation: validation,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Update quadrant weightages error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update quadrant weightages',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Update subcategory weightages for a batch-term configuration
 */
const updateSubcategoryWeightages = async (req, res) => {
  try {
    const { batchId, termId } = req.params;
    const { weightages } = req.body;

    if (!weightages || !Array.isArray(weightages)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid weightages data',
        message: 'weightages must be an array of weightage objects',
        timestamp: new Date().toISOString()
      });
    }

    // Get configuration
    const config = await enhancedWeightageService.getBatchTermWeightageConfig(batchId, termId);
    if (!config) {
      return res.status(404).json({
        success: false,
        error: 'Configuration not found',
        message: 'No weightage configuration found for this batch-term combination',
        timestamp: new Date().toISOString()
      });
    }

    // Validate weightages by quadrant
    const weightagesByQuadrant = {};
    weightages.forEach(w => {
      if (!weightagesByQuadrant[w.quadrant_id]) {
        weightagesByQuadrant[w.quadrant_id] = 0;
      }
      weightagesByQuadrant[w.quadrant_id] += parseFloat(w.weightage);
    });

    for (const [quadrantId, total] of Object.entries(weightagesByQuadrant)) {
      if (Math.abs(total - 100) > 0.01) {
        return res.status(400).json({
          success: false,
          error: 'Invalid weightage total',
          message: `Subcategory weightages in quadrant ${quadrantId} must sum to 100%, got ${total.toFixed(2)}%`,
          timestamp: new Date().toISOString()
        });
      }
    }

    // Set current user for audit trail
    await query(supabase.rpc('set_config', {
      setting_name: 'app.current_user_id',
      new_value: req.user.id,
      is_local: true
    }));

    // Update weightages
    for (const weightage of weightages) {
      await query(
        supabase
          .from('batch_term_subcategory_weightages')
          .upsert({
            config_id: config.id,
            subcategory_id: weightage.subcategory_id,
            weightage: parseFloat(weightage.weightage)
          }, {
            onConflict: 'config_id,subcategory_id'
          })
      );
    }

    // Validate the updated configuration
    const validation = await enhancedWeightageService.validateBatchTermWeightages(batchId, termId);

    res.json({
      success: true,
      message: 'Subcategory weightages updated successfully',
      validation: validation,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Update subcategory weightages error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update subcategory weightages',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Validate batch-term weightage configuration
 */
const validateConfiguration = async (req, res) => {
  try {
    const { batchId, termId } = req.params;

    const validation = await enhancedWeightageService.validateBatchTermWeightages(batchId, termId);

    res.json({
      success: true,
      data: validation,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Validate configuration error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate configuration',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Recalculate scores for all students in a batch-term after weightage changes
 */
const recalculateScores = async (req, res) => {
  try {
    const { batchId, termId } = req.params;

    // Get all students in this batch-term
    const studentsResult = await query(
      supabase
        .from('students')
        .select('id, name')
        .eq('batch_id', batchId)
        .eq('current_term_id', termId)
    );

    const students = studentsResult.rows || [];
    const results = [];

    for (const student of students) {
      try {
        const result = await enhancedScoreService.calculateUnifiedHPS(student.id, termId);
        results.push({
          student_id: student.id,
          student_name: student.name,
          success: true,
          total_hps: result.totalHPS
        });
      } catch (error) {
        results.push({
          student_id: student.id,
          student_name: student.name,
          success: false,
          error: error.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    res.json({
      success: true,
      message: `Score recalculation completed: ${successCount} successful, ${failureCount} failed`,
      data: {
        total_students: students.length,
        successful_calculations: successCount,
        failed_calculations: failureCount,
        results: results
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Recalculate scores error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to recalculate scores',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

module.exports = {
  getAllConfigurations,
  getConfiguration,
  createConfiguration,
  updateQuadrantWeightages,
  updateSubcategoryWeightages,
  validateConfiguration,
  recalculateScores
};
