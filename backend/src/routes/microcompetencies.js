const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const {
  getAllMicrocompetencies,
  getMicrocompetenciesByComponent,
  getMicrocompetenciesByQuadrant,
  createMicrocompetency,
  updateMicrocompetency,
  deleteMicrocompetency,
  getMicrocompetencyById,
  getComponentWeightageUsage,
  getMicrocompetenciesForIntervention
} = require('../controllers/microcompetencyController');

// ==========================================
// MICROCOMPETENCY ROUTES
// ==========================================

/**
 * @route   GET /api/v1/microcompetencies
 * @desc    Get all microcompetencies with pagination and filters
 * @access  Teachers, Admins
 * @query   page?: number, limit?: number, search?: string, quadrantId?: string, componentId?: string, includeInactive?: boolean
 */
router.get('/',
  authenticateToken,
  requireRole('teacher', 'admin'),
  getAllMicrocompetencies
);

/**
 * @route   GET /api/v1/microcompetencies/component/:componentId
 * @desc    Get all microcompetencies for a specific component
 * @access  Teachers, Admins
 * @params  componentId: component UUID
 * @query   includeInactive: boolean (optional)
 */
router.get('/component/:componentId',
  authenticateToken,
  requireRole('teacher', 'admin'),
  getMicrocompetenciesByComponent
);

/**
 * @route   GET /api/v1/microcompetencies/component/:componentId/weightage
 * @desc    Get weightage usage for a specific component
 * @access  Teachers, Admins
 * @params  componentId: component UUID
 */
router.get('/component/:componentId/weightage',
  authenticateToken,
  requireRole('teacher', 'admin'),
  getComponentWeightageUsage
);

/**
 * @route   GET /api/v1/microcompetencies/quadrant/:quadrantId
 * @desc    Get all microcompetencies for a specific quadrant (grouped by component)
 * @access  Teachers, Admins
 * @params  quadrantId: quadrant ID (persona, wellness, behavior, discipline)
 * @query   includeInactive: boolean (optional)
 */
router.get('/quadrant/:quadrantId',
  authenticateToken,
  requireRole('teacher', 'admin'),
  getMicrocompetenciesByQuadrant
);

/**
 * @route   GET /api/v1/microcompetencies/intervention/:interventionId
 * @desc    Get all microcompetencies for a specific intervention with teacher assignments
 * @access  Teachers, Admins
 * @params  interventionId: intervention UUID
 */
router.get('/intervention/:interventionId',
  authenticateToken,
  requireRole('teacher', 'admin'),
  getMicrocompetenciesForIntervention
);

/**
 * @route   GET /api/v1/microcompetencies/:microcompetencyId
 * @desc    Get microcompetency by ID
 * @access  Teachers, Admins
 * @params  microcompetencyId: microcompetency UUID
 */
router.get('/:microcompetencyId',
  authenticateToken,
  requireRole('teacher', 'admin'),
  getMicrocompetencyById
);

/**
 * @route   POST /api/v1/microcompetencies
 * @desc    Create new microcompetency
 * @access  Admin only
 * @body    {
 *            component_id: UUID,
 *            name: string,
 *            description: string (optional),
 *            weightage: number (0-100),
 *            max_score: number (optional, default: 10),
 *            display_order: number (optional, default: 0)
 *          }
 */
router.post('/',
  authenticateToken,
  requireRole('admin'),
  createMicrocompetency
);

/**
 * @route   PUT /api/v1/microcompetencies/:microcompetencyId
 * @desc    Update microcompetency
 * @access  Admin only
 * @params  microcompetencyId: microcompetency UUID
 * @body    {
 *            name: string (optional),
 *            description: string (optional),
 *            weightage: number (optional, 0-100),
 *            max_score: number (optional),
 *            display_order: number (optional),
 *            is_active: boolean (optional)
 *          }
 */
router.put('/:microcompetencyId',
  authenticateToken,
  requireRole('admin'),
  updateMicrocompetency
);

/**
 * @route   DELETE /api/v1/microcompetencies/:microcompetencyId
 * @desc    Delete microcompetency (soft delete)
 * @access  Admin only
 * @params  microcompetencyId: microcompetency UUID
 * @note    Will fail if microcompetency is used in interventions or has scores
 */
router.delete('/:microcompetencyId',
  authenticateToken,
  requireRole('admin'),
  deleteMicrocompetency
);

module.exports = router;
