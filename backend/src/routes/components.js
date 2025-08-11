const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const {
  getAllComponents,
  getComponentById,
  createComponent,
  updateComponent,
  deleteComponent
} = require('../controllers/componentController');

/**
 * @route   GET /api/v1/components
 * @desc    Get all components with optional filters
 * @access  Admin, Teacher
 * @query   sub_category_id?: string, quadrant_id?: string, include_inactive?: boolean
 */
router.get('/',
  authenticateToken,
  requireRole('admin', 'teacher'),
  getAllComponents
);

/**
 * @route   GET /api/v1/components/:id
 * @desc    Get component by ID with microcompetencies
 * @access  Admin, Teacher
 * @params  id: component UUID
 */
router.get('/:id',
  authenticateToken,
  requireRole('admin', 'teacher'),
  getComponentById
);

/**
 * @route   POST /api/v1/components
 * @desc    Create new component
 * @access  Admin
 * @body    { sub_category_id, name, description?, weightage?, max_score?, category?, display_order? }
 */
router.post('/',
  authenticateToken,
  requireRole('admin'),
  createComponent
);

/**
 * @route   PUT /api/v1/components/:id
 * @desc    Update component
 * @access  Admin
 * @params  id: component UUID
 * @body    { name?, description?, weightage?, max_score?, category?, display_order?, is_active? }
 */
router.put('/:id',
  authenticateToken,
  requireRole('admin'),
  updateComponent
);

/**
 * @route   DELETE /api/v1/components/:id
 * @desc    Delete component (soft delete)
 * @access  Admin
 * @params  id: component UUID
 */
router.delete('/:id',
  authenticateToken,
  requireRole('admin'),
  deleteComponent
);

module.exports = router;
