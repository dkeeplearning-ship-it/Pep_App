const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const {
  calculateStudentHPS,
  getStudentScoreSummary,
  recalculateAfterMicrocompetencyUpdate,
  recalculateAfterTraditionalUpdate,
  getScoreBreakdown
} = require('../controllers/unifiedScoreController');

// Import enhanced score calculation service
const enhancedScoreService = require('../services/enhancedUnifiedScoreCalculationService');

/**
 * Unified Score API Routes
 * 
 * All routes use the new unified scoring system with:
 * - Simple average calculations
 * - Term-aware processing
 * - No double counting
 * - Consistent response formats
 */

/**
 * @route   POST /api/v1/unified-scores/calculate/:studentId/:termId
 * @desc    Calculate enhanced unified HPS for a student using dynamic weightages
 * @access  Teachers, Admins
 */
router.post('/calculate/:studentId/:termId',
  authenticateToken,
  requireRole('teacher', 'admin'),
  async (req, res) => {
    try {
      const { studentId, termId } = req.params;
      const result = await enhancedScoreService.calculateUnifiedHPS(studentId, termId);

      res.json({
        success: true,
        message: 'Enhanced unified HPS calculated successfully',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Enhanced HPS calculation error:', error);
      res.status(500).json({
        success: false,
        error: 'Enhanced HPS calculation failed',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * @route   POST /api/v1/unified-scores/students/:studentId/hps
 * @desc    Calculate unified HPS for a student in a specific term (legacy)
 * @access  Teachers, Admins
 * @body    { termId: string }
 */
router.post('/students/:studentId/hps',
  authenticateToken,
  requireRole('teacher', 'admin'),
  calculateStudentHPS
);

/**
 * @route   GET /api/v1/unified-scores/students/:studentId/summary
 * @desc    Get unified score summary for a student in a term
 * @access  Students (own data), Teachers, Admins
 * @query   termId: string
 */
router.get('/students/:studentId/summary', 
  authenticateToken, 
  getStudentScoreSummary
);

/**
 * @route   GET /api/v1/unified-scores/students/:studentId/breakdown
 * @desc    Get detailed score breakdown by quadrants for a student
 * @access  Students (own data), Teachers, Admins
 * @query   termId: string
 */
router.get('/students/:studentId/breakdown', 
  authenticateToken, 
  getScoreBreakdown
);

/**
 * @route   POST /api/v1/unified-scores/recalculate/microcompetency
 * @desc    Recalculate scores after microcompetency score update
 * @access  Teachers, Admins
 * @body    { studentId: string, microcompetencyId: string }
 */
router.post('/recalculate/microcompetency', 
  authenticateToken, 
  requireRole('teacher', 'admin'), 
  recalculateAfterMicrocompetencyUpdate
);

/**
 * @route   POST /api/v1/unified-scores/recalculate/traditional
 * @desc    Recalculate scores after traditional score update
 * @access  Teachers, Admins
 * @body    { studentId: string, componentId: string, termId: string }
 */
router.post('/recalculate/traditional', 
  authenticateToken, 
  requireRole('teacher', 'admin'), 
  recalculateAfterTraditionalUpdate
);

module.exports = router;
