/**
 * Business Logic Validation Middleware
 * Enforces business rules and data integrity constraints
 */

const { supabase, query } = require('../config/supabase');

/**
 * Validate that weightages sum to 100% for a given parent entity
 */
const validateWeightageSum = async (tableName, parentColumn, parentId, excludeId = null) => {
  try {
    let queryBuilder = supabase
      .from(tableName)
      .select('weightage')
      .eq(parentColumn, parentId)
      .eq('is_active', true);
    
    if (excludeId) {
      queryBuilder = queryBuilder.neq('id', excludeId);
    }
    
    const result = await query(queryBuilder);
    const total = result.rows.reduce((sum, row) => sum + parseFloat(row.weightage || 0), 0);
    
    return {
      isValid: Math.abs(total - 100) <= 0.01,
      currentTotal: total,
      difference: 100 - total
    };
  } catch (error) {
    console.error('❌ Weightage sum validation error:', error);
    return { isValid: false, error: error.message };
  }
};

/**
 * Validate quadrant weightages sum to 100%
 */
const validateQuadrantWeightageSum = async (req, res, next) => {
  try {
    const validation = await validateWeightageSum('quadrants', 'is_active', true);
    
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: 'BUSINESS_LOGIC_ERROR',
        message: `Quadrant weightages must sum to 100% (current total: ${validation.currentTotal}%)`,
        details: { currentTotal: validation.currentTotal, required: 100 },
        timestamp: new Date().toISOString()
      });
    }
    
    next();
  } catch (error) {
    console.error('❌ Quadrant weightage validation error:', error);
    res.status(500).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'Failed to validate quadrant weightages',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Validate subcategory weightages sum to 100% per quadrant
 */
const validateSubcategoryWeightageSum = async (quadrantId, excludeId = null) => {
  return await validateWeightageSum('sub_categories', 'quadrant_id', quadrantId, excludeId);
};

/**
 * Validate component weightages sum to 100% per subcategory
 */
const validateComponentWeightageSum = async (subcategoryId, excludeId = null) => {
  return await validateWeightageSum('components', 'sub_category_id', subcategoryId, excludeId);
};

/**
 * Validate microcompetency weightages sum to 100% per component
 */
const validateMicrocompetencyWeightageSum = async (componentId, excludeId = null) => {
  return await validateWeightageSum('microcompetencies', 'component_id', componentId, excludeId);
};

/**
 * Check for dependent records before deletion
 */
const checkDependentRecords = async (tableName, columnName, id) => {
  try {
    const result = await query(
      supabase
        .from(tableName)
        .select('id')
        .eq(columnName, id)
        .eq('is_active', true)
        .limit(1)
    );
    
    return result.rows.length > 0;
  } catch (error) {
    console.error(`❌ Dependent records check error for ${tableName}:`, error);
    return false;
  }
};

/**
 * Validate cascade delete operations
 */
const validateCascadeDelete = (entityType) => {
  return async (req, res, next) => {
    try {
      const { id } = req.params;
      let hasDependents = false;
      let dependentType = '';
      
      switch (entityType) {
        case 'quadrant':
          hasDependents = await checkDependentRecords('sub_categories', 'quadrant_id', id);
          dependentType = 'subcategories';
          break;
          
        case 'subcategory':
          hasDependents = await checkDependentRecords('components', 'sub_category_id', id);
          dependentType = 'components';
          break;
          
        case 'component':
          hasDependents = await checkDependentRecords('microcompetencies', 'component_id', id);
          dependentType = 'microcompetencies';
          break;
          
        case 'student':
          // Check for scores, attendance, interventions
          const hasScores = await checkDependentRecords('scores', 'student_id', id);
          const hasAttendance = await checkDependentRecords('attendance', 'student_id', id);
          const hasInterventions = await checkDependentRecords('student_interventions', 'student_id', id);
          
          if (hasScores || hasAttendance || hasInterventions) {
            hasDependents = true;
            dependentType = 'scores, attendance, or interventions';
          }
          break;
      }
      
      if (hasDependents) {
        return res.status(400).json({
          success: false,
          error: 'BUSINESS_LOGIC_ERROR',
          message: `Cannot delete ${entityType} because it has dependent ${dependentType}`,
          details: { 
            entityType, 
            dependentType,
            suggestion: 'Please delete or reassign dependent records first'
          },
          timestamp: new Date().toISOString()
        });
      }
      
      next();
    } catch (error) {
      console.error(`❌ Cascade delete validation error for ${entityType}:`, error);
      res.status(500).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Failed to validate cascade delete',
        timestamp: new Date().toISOString()
      });
    }
  };
};

/**
 * Validate hierarchical relationships
 */
const validateHierarchicalRelationship = (childType, parentType) => {
  return async (req, res, next) => {
    try {
      const childData = req.body;
      let isValid = false;
      
      switch (childType) {
        case 'subcategory':
          if (childData.quadrant_id) {
            const result = await query(
              supabase
                .from('quadrants')
                .select('id')
                .eq('id', childData.quadrant_id)
                .eq('is_active', true)
            );
            isValid = result.rows.length > 0;
          }
          break;
          
        case 'component':
          if (childData.sub_category_id) {
            const result = await query(
              supabase
                .from('sub_categories')
                .select('id')
                .eq('id', childData.sub_category_id)
                .eq('is_active', true)
            );
            isValid = result.rows.length > 0;
          }
          break;
          
        case 'microcompetency':
          if (childData.component_id) {
            const result = await query(
              supabase
                .from('components')
                .select('id')
                .eq('id', childData.component_id)
                .eq('is_active', true)
            );
            isValid = result.rows.length > 0;
          }
          break;
      }
      
      if (!isValid) {
        return res.status(400).json({
          success: false,
          error: 'BUSINESS_LOGIC_ERROR',
          message: `Invalid ${parentType} reference for ${childType}`,
          details: { childType, parentType },
          timestamp: new Date().toISOString()
        });
      }
      
      next();
    } catch (error) {
      console.error(`❌ Hierarchical relationship validation error:`, error);
      res.status(500).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Failed to validate hierarchical relationship',
        timestamp: new Date().toISOString()
      });
    }
  };
};

/**
 * Validate score ranges against component max scores
 */
const validateScoreRange = async (req, res, next) => {
  try {
    const { component_id, obtained_score } = req.body;
    
    if (component_id && obtained_score !== undefined) {
      const result = await query(
        supabase
          .from('components')
          .select('max_score')
          .eq('id', component_id)
      );
      
      if (result.rows.length > 0) {
        const maxScore = result.rows[0].max_score;
        
        if (obtained_score > maxScore) {
          return res.status(400).json({
            success: false,
            error: 'BUSINESS_LOGIC_ERROR',
            message: `Score cannot exceed maximum score for this component (${maxScore})`,
            details: { obtainedScore: obtained_score, maxScore },
            timestamp: new Date().toISOString()
          });
        }
      }
    }
    
    next();
  } catch (error) {
    console.error('❌ Score range validation error:', error);
    res.status(500).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'Failed to validate score range',
      timestamp: new Date().toISOString()
    });
  }
};

module.exports = {
  validateWeightageSum,
  validateQuadrantWeightageSum,
  validateSubcategoryWeightageSum,
  validateComponentWeightageSum,
  validateMicrocompetencyWeightageSum,
  validateCascadeDelete,
  validateHierarchicalRelationship,
  validateScoreRange
};
