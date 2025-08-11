const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const {
  getAllTerms,
  getCurrentTerm,
  createTerm,
  updateTerm,
  setCurrentTerm,
  transitionStudentsToTerm,
  resetTermScores,
  deleteTerm
} = require('../controllers/termController');

/**
 * @route   GET /api/v1/terms
 * @desc    Get all terms with optional filters
 * @access  Public (for current term), Admin/Teacher (for all terms)
 * @query   includeInactive?: boolean
 */
router.get('/', getAllTerms);

/**
 * @route   GET /api/v1/terms/current
 * @desc    Get current active term
 * @access  Public
 */
router.get('/current', getCurrentTerm);

/**
 * @route   POST /api/v1/terms
 * @desc    Create new term
 * @access  Admin only
 * @body    {
 *            name: string,
 *            description?: string,
 *            start_date: string (YYYY-MM-DD),
 *            end_date: string (YYYY-MM-DD),
 *            academic_year: string,
 *            is_active?: boolean,
 *            is_current?: boolean
 *          }
 */
router.post('/',
  authenticateToken,
  requireRole('admin'),
  createTerm
);

/**
 * @route   PUT /api/v1/terms/:id
 * @desc    Update term
 * @access  Admin only
 * @params  id: term UUID
 * @body    Term update fields
 */
router.put('/:id',
  authenticateToken,
  requireRole('admin'),
  updateTerm
);

/**
 * @route   POST /api/v1/terms/:id/activate
 * @desc    Set term as current active term
 * @access  Admin only
 * @params  id: term UUID
 */
router.post('/:id/activate',
  authenticateToken,
  requireRole('admin'),
  setCurrentTerm
);

/**
 * @route   POST /api/v1/terms/:id/transition
 * @desc    Transition students to new term
 * @access  Admin only
 * @params  id: term UUID
 * @body    {
 *            studentIds?: string[] (optional, defaults to all active students),
 *            resetScores?: boolean (optional, defaults to true)
 *          }
 */
router.post('/:id/transition',
  authenticateToken,
  requireRole('admin'),
  transitionStudentsToTerm
);

/**
 * @route   POST /api/v1/terms/:id/reset-scores
 * @desc    Reset all scores for a term
 * @access  Admin only
 * @params  id: term UUID
 * @body    {
 *            studentIds?: string[] (optional, defaults to all enrolled students)
 *          }
 */
router.post('/:id/reset-scores',
  authenticateToken,
  requireRole('admin'),
  resetTermScores
);

/**
 * @route   DELETE /api/v1/terms/:id
 * @desc    Delete term (only if no associated data)
 * @access  Admin only
 * @params  id: term UUID
 */
router.delete('/:id',
  authenticateToken,
  requireRole('admin'),
  deleteTerm
);

module.exports = router;
