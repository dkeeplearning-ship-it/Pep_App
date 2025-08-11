const weightageValidationService = require('../services/weightageValidationService');

/**
 * Validate all weightages across the system
 * GET /api/v1/admin/weightage-validation
 */
const validateAllWeightages = async (req, res) => {
  try {
    const result = await weightageValidationService.validateAllWeightages();

    if (result.success) {
      res.json({
        ...result,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        ...result,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('❌ Error validating weightages:', error.message);
    res.status(500).json({
      success: false,
      error: 'VALIDATION_FAILED',
      message: 'Failed to validate weightages',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Validate quadrant weightages
 * GET /api/v1/admin/weightage-validation/quadrants
 */
const validateQuadrantWeightages = async (req, res) => {
  try {
    const result = await weightageValidationService.validateQuadrantWeightages();

    if (result.success) {
      res.json({
        ...result,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        ...result,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('❌ Error validating quadrant weightages:', error.message);
    res.status(500).json({
      success: false,
      error: 'VALIDATION_FAILED',
      message: 'Failed to validate quadrant weightages',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Validate sub-category weightages
 * GET /api/v1/admin/weightage-validation/sub-categories
 * GET /api/v1/admin/weightage-validation/sub-categories?quadrantId=xxx
 */
const validateSubCategoryWeightages = async (req, res) => {
  try {
    const { quadrantId } = req.query;
    const result = await weightageValidationService.validateSubCategoryWeightages(quadrantId);

    if (result.success) {
      res.json({
        ...result,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        ...result,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('❌ Error validating sub-category weightages:', error.message);
    res.status(500).json({
      success: false,
      error: 'VALIDATION_FAILED',
      message: 'Failed to validate sub-category weightages',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Validate component weightages
 * GET /api/v1/admin/weightage-validation/components
 * GET /api/v1/admin/weightage-validation/components?subCategoryId=xxx
 */
const validateComponentWeightages = async (req, res) => {
  try {
    const { subCategoryId } = req.query;
    const result = await weightageValidationService.validateComponentWeightages(subCategoryId);

    if (result.success) {
      res.json({
        ...result,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        ...result,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('❌ Error validating component weightages:', error.message);
    res.status(500).json({
      success: false,
      error: 'VALIDATION_FAILED',
      message: 'Failed to validate component weightages',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Validate microcompetency weightages
 * GET /api/v1/admin/weightage-validation/microcompetencies
 * GET /api/v1/admin/weightage-validation/microcompetencies?componentId=xxx
 */
const validateMicrocompetencyWeightages = async (req, res) => {
  try {
    const { componentId } = req.query;
    const result = await weightageValidationService.validateMicrocompetencyWeightages(componentId);

    if (result.success) {
      res.json({
        ...result,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        ...result,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('❌ Error validating microcompetency weightages:', error.message);
    res.status(500).json({
      success: false,
      error: 'VALIDATION_FAILED',
      message: 'Failed to validate microcompetency weightages',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Get weightage usage for a specific parent
 * GET /api/v1/admin/weightage-validation/usage/:type/:parentId
 */
const getWeightageUsage = async (req, res) => {
  try {
    const { type, parentId } = req.params;

    if (!['sub_category', 'component', 'microcompetency'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_TYPE',
        message: 'Type must be one of: sub_category, component, microcompetency',
        timestamp: new Date().toISOString()
      });
    }

    const result = await weightageValidationService.getWeightageUsage(type, parentId);

    if (result.success) {
      res.json({
        ...result,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        ...result,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('❌ Error getting weightage usage:', error.message);
    res.status(500).json({
      success: false,
      error: 'USAGE_CALCULATION_FAILED',
      message: 'Failed to calculate weightage usage',
      timestamp: new Date().toISOString()
    });
  }
};

module.exports = {
  validateAllWeightages,
  validateQuadrantWeightages,
  validateSubCategoryWeightages,
  validateComponentWeightages,
  validateMicrocompetencyWeightages,
  getWeightageUsage
};
