const express = require('express');
const router = express.Router();
const {
  getStudentScores,
  getStudentScoreSummary,
  addScore,
  updateScore
} = require('../controllers/scoreController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// All score routes require authentication
router.use(authenticateToken);

// @route   GET /api/v1/scores/student/:studentId
// @desc    Get detailed scores for a student
// @access  Student (own data), Teachers, Admins
// @query   termId (optional)
router.get('/student/:studentId', getStudentScores);

// @route   GET /api/v1/scores/student/:studentId/summary
// @desc    Get score summary for a student
// @access  Student (own data), Teachers, Admins
// @query   termId (optional)
router.get('/student/:studentId/summary', getStudentScoreSummary);

// @route   POST /api/v1/scores
// @desc    Add a new score
// @access  Teachers, Admins
router.post('/', requireRole('teacher', 'admin'), addScore);

// @route   PUT /api/v1/scores/:id
// @desc    Update a score
// @access  Teachers, Admins
router.put('/:id', requireRole('teacher', 'admin'), updateScore);

module.exports = router; 