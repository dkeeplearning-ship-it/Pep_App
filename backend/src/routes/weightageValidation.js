const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const {
  validateAllWeightages,
  validateQuadrantWeightages,
  validateSubCategoryWeightages,
  validateComponentWeightages,
  validateMicrocompetencyWeightages,
  getWeightageUsage
} = require('../controllers/weightageValidationController');

/**
 * @route   GET /api/v1/admin/weightage-validation
 * @desc    Validate all weightages across the system
 * @access  Admin
 */
router.get('/',
  authenticateToken,
  requireRole('admin'),
  validateAllWeightages
);

/**
 * @route   GET /api/v1/admin/weightage-validation/quadrants
 * @desc    Validate quadrant weightages
 * @access  Admin
 */
router.get('/quadrants',
  authenticateToken,
  requireRole('admin'),
  validateQuadrantWeightages
);

/**
 * @route   GET /api/v1/admin/weightage-validation/sub-categories
 * @desc    Validate sub-category weightages
 * @access  Admin
 * @query   quadrantId?: string
 */
router.get('/sub-categories',
  authenticateToken,
  requireRole('admin'),
  validateSubCategoryWeightages
);

/**
 * @route   GET /api/v1/admin/weightage-validation/components
 * @desc    Validate component weightages
 * @access  Admin
 * @query   subCategoryId?: string
 */
router.get('/components',
  authenticateToken,
  requireRole('admin'),
  validateComponentWeightages
);

/**
 * @route   GET /api/v1/admin/weightage-validation/microcompetencies
 * @desc    Validate microcompetency weightages
 * @access  Admin
 * @query   componentId?: string
 */
router.get('/microcompetencies',
  authenticateToken,
  requireRole('admin'),
  validateMicrocompetencyWeightages
);

/**
 * @route   GET /api/v1/admin/weightage-validation/usage/:type/:parentId
 * @desc    Get weightage usage for a specific parent
 * @access  Admin
 * @params  type: 'sub_category' | 'component' | 'microcompetency'
 * @params  parentId: UUID of the parent
 */
router.get('/usage/:type/:parentId',
  authenticateToken,
  requireRole('admin'),
  getWeightageUsage
);

module.exports = router;
