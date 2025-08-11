const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const {
  getAllSubCategories,
  getSubCategoryById,
  createSubCategory,
  updateSubCategory,
  deleteSubCategory
} = require('../controllers/subCategoryController');

/**
 * @route   GET /api/v1/sub-categories
 * @desc    Get all sub-categories with optional filters
 * @access  Admin, Teacher
 * @query   quadrant_id?: string, include_inactive?: boolean
 */
router.get('/',
  authenticateToken,
  requireRole('admin', 'teacher'),
  getAllSubCategories
);

/**
 * @route   GET /api/v1/sub-categories/:id
 * @desc    Get sub-category by ID with components
 * @access  Admin, Teacher
 * @params  id: sub-category UUID
 */
router.get('/:id',
  authenticateToken,
  requireRole('admin', 'teacher'),
  getSubCategoryById
);

/**
 * @route   POST /api/v1/sub-categories
 * @desc    Create new sub-category
 * @access  Admin
 * @body    { quadrant_id, name, description?, weightage?, display_order? }
 */
router.post('/',
  authenticateToken,
  requireRole('admin'),
  createSubCategory
);

/**
 * @route   PUT /api/v1/sub-categories/:id
 * @desc    Update sub-category
 * @access  Admin
 * @params  id: sub-category UUID
 * @body    { name?, description?, weightage?, display_order?, is_active? }
 */
router.put('/:id',
  authenticateToken,
  requireRole('admin'),
  updateSubCategory
);

/**
 * @route   DELETE /api/v1/sub-categories/:id
 * @desc    Delete sub-category (soft delete)
 * @access  Admin
 * @params  id: sub-category UUID
 */
router.delete('/:id',
  authenticateToken,
  requireRole('admin'),
  deleteSubCategory
);

module.exports = router;
