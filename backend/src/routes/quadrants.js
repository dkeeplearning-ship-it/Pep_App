const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const { validateInput, validationSchemas } = require('../middleware/weightageValidation');
const { validateCascadeDelete } = require('../middleware/businessLogicValidation');
const { withTransaction } = require('../utils/transactionWrapper');
const {
  getAllQuadrants,
  getQuadrantById,
  getQuadrantStats,
  createQuadrant,
  updateQuadrant,
  deleteQuadrant,
  getQuadrantHierarchy
} = require('../controllers/quadrantController');

/**
 * @route   GET /api/v1/quadrants
 * @desc    Get all quadrants
 * @access  Authenticated users only
 */
router.get('/', authenticateToken, getAllQuadrants);

/**
 * @route   GET /api/v1/quadrants/stats
 * @desc    Get quadrant statistics
 * @access  Authenticated users only
 */
router.get('/stats', authenticateToken, getQuadrantStats);

/**
 * @route   GET /api/v1/quadrants/:id/hierarchy
 * @desc    Get quadrant with full hierarchy (sub-categories, components, microcompetencies)
 * @access  Admin, Teacher
 * @params  id: quadrant ID
 * @query   includeInactive?: boolean
 */
router.get('/:id/hierarchy',
  authenticateToken,
  requireRole('admin', 'teacher'),
  getQuadrantHierarchy
);

/**
 * @route   GET /api/v1/quadrants/:id
 * @desc    Get quadrant by ID
 * @access  Authenticated users only
 */
router.get('/:id', authenticateToken, getQuadrantById);

/**
 * @route   POST /api/v1/quadrants
 * @desc    Create new quadrant
 * @access  Admin
 */
router.post('/',
  authenticateToken,
  requireRole('admin'),
  validateInput(validationSchemas.createQuadrant),
  createQuadrant
);

/**
 * @route   PUT /api/v1/quadrants/:id
 * @desc    Update quadrant
 * @access  Admin
 * @params  id: quadrant ID
 */
router.put('/:id',
  authenticateToken,
  requireRole('admin'),
  updateQuadrant
);

/**
 * @route   PATCH /api/v1/quadrants/:id
 * @desc    Partially update quadrant
 * @access  Admin
 * @params  id: quadrant ID
 */
router.patch('/:id',
  authenticateToken,
  requireRole('admin'),
  updateQuadrant
);

/**
 * @route   DELETE /api/v1/quadrants/:id
 * @desc    Delete quadrant (soft delete)
 * @access  Admin
 * @params  id: quadrant ID
 */
router.delete('/:id',
  authenticateToken,
  requireRole('admin'),
  validateCascadeDelete('quadrant'),
  withTransaction(deleteQuadrant)
);

module.exports = router;
