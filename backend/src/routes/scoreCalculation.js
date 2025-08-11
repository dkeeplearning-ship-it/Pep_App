const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const {
  calculateCompetencyScores,
  calculateQuadrantScores,
  calculateInterventionScore,
  recalculateAllScores,
  getInterventionStatistics,
  recalculateInterventionScores
} = require('../controllers/scoreCalculationController');

// ==========================================
// SCORE CALCULATION ROUTES
// ==========================================

/**
 * @route   GET /api/v1/score-calculation/students/:studentId/interventions/:interventionId/competencies
 * @desc    Calculate and return competency scores for a student in an intervention
 * @access  Teacher, Admin
 * @params  studentId: student UUID, interventionId: intervention UUID
 */
router.get('/students/:studentId/interventions/:interventionId/competencies',
  authenticateToken,
  requireRole('teacher', 'admin'),
  calculateCompetencyScores
);

/**
 * @route   GET /api/v1/score-calculation/students/:studentId/interventions/:interventionId/quadrants
 * @desc    Calculate and return quadrant scores for a student in an intervention
 * @access  Teacher, Admin
 * @params  studentId: student UUID, interventionId: intervention UUID
 */
router.get('/students/:studentId/interventions/:interventionId/quadrants',
  authenticateToken,
  requireRole('teacher', 'admin'),
  calculateQuadrantScores
);

/**
 * @route   GET /api/v1/score-calculation/students/:studentId/interventions/:interventionId/overall
 * @desc    Calculate and return overall intervention score for a student
 * @access  Teacher, Admin
 * @params  studentId: student UUID, interventionId: intervention UUID
 */
router.get('/students/:studentId/interventions/:interventionId/overall',
  authenticateToken,
  requireRole('teacher', 'admin'),
  calculateInterventionScore
);

/**
 * @route   POST /api/v1/score-calculation/students/:studentId/interventions/:interventionId/recalculate
 * @desc    Recalculate all scores for a student in an intervention
 * @access  Teacher, Admin
 * @params  studentId: student UUID, interventionId: intervention UUID
 */
router.post('/students/:studentId/interventions/:interventionId/recalculate',
  authenticateToken,
  requireRole('teacher', 'admin'),
  recalculateAllScores
);

/**
 * @route   GET /api/v1/score-calculation/interventions/:interventionId/statistics
 * @desc    Get score statistics for an intervention
 * @access  Teacher, Admin
 * @params  interventionId: intervention UUID
 */
router.get('/interventions/:interventionId/statistics',
  authenticateToken,
  requireRole('teacher', 'admin'),
  getInterventionStatistics
);

/**
 * @route   POST /api/v1/score-calculation/interventions/:interventionId/recalculate-all
 * @desc    Recalculate scores for all students in an intervention
 * @access  Admin only
 * @params  interventionId: intervention UUID
 */
router.post('/interventions/:interventionId/recalculate-all',
  authenticateToken,
  requireRole('admin'),
  recalculateInterventionScores
);

module.exports = router;
