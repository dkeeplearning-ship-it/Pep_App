const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const {
  getSHLCompetencyComponents,
  calculateStudentSHLScores,
  getStudentSHLSummary,
  submitSHLCompetencyScore
} = require('../controllers/shlCompetencyController');

/**
 * SHL Competency API Routes
 * 
 * Handles the 7-core competency assessment system:
 * A&C: Analytical & Critical Thinking
 * C: Communication
 * E: Empathy
 * L: Leadership
 * N: Negotiation
 * P: Problem Solving
 * T: Teamwork
 */

/**
 * @route   GET /api/v1/shl-competencies/components
 * @desc    Get all SHL competency components
 * @access  Teachers, Admins
 */
router.get('/components', 
  authenticateToken, 
  requireRole('teacher', 'admin'), 
  getSHLCompetencyComponents
);

/**
 * @route   POST /api/v1/shl-competencies/students/:studentId/calculate
 * @desc    Calculate SHL competency scores for a student
 * @access  Teachers, Admins
 * @body    { termId: string }
 */
router.post('/students/:studentId/calculate', 
  authenticateToken, 
  requireRole('teacher', 'admin'), 
  calculateStudentSHLScores
);

/**
 * @route   GET /api/v1/shl-competencies/students/:studentId/summary
 * @desc    Get SHL competency summary for a student
 * @access  Students (own data), Teachers, Admins
 * @query   termId: string
 */
router.get('/students/:studentId/summary', 
  authenticateToken, 
  getStudentSHLSummary
);

/**
 * @route   POST /api/v1/shl-competencies/students/:studentId/components/:componentId/score
 * @desc    Submit SHL competency score for a student
 * @access  Teachers, Admins
 * @body    { obtainedScore: number, maxScore: number, termId: string, notes?: string }
 */
router.post('/students/:studentId/components/:componentId/score', 
  authenticateToken, 
  requireRole('teacher', 'admin'), 
  submitSHLCompetencyScore
);

module.exports = router;
