const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const {
  getStudentInterventionScores,
  getInterventionScoreBreakdown
} = require('../controllers/studentInterventionController');

// ==========================================
// STUDENT INTERVENTION SCORE ROUTES
// ==========================================

/**
 * @route   GET /api/v1/student-interventions/:studentId/scores
 * @desc    Get student's intervention-based scores with hierarchical breakdown
 * @access  Student (own data), Teacher, Admin
 * @params  studentId: student UUID
 * @query   interventionId?: string (optional, to filter specific intervention)
 */
router.get('/:studentId/scores',
  authenticateToken,
  requireRole('student', 'teacher', 'admin'),
  getStudentInterventionScores
);

/**
 * @route   GET /api/v1/student-interventions/:studentId/interventions/:interventionId/breakdown
 * @desc    Get detailed hierarchical score breakdown for a specific intervention
 * @access  Student (own data), Teacher, Admin
 * @params  studentId: student UUID, interventionId: intervention UUID
 */
router.get('/:studentId/interventions/:interventionId/breakdown',
  authenticateToken,
  requireRole('student', 'teacher', 'admin'),
  getInterventionScoreBreakdown
);

module.exports = router;
