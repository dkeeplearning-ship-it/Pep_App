const express = require('express');
const router = express.Router();
const {
  getAllStudents,
  getStudentFilterOptions,
  getStudentById,
  createStudent,
  getCurrentStudent,
  createStudentForExistingUser,
  getStudentPerformance,
  getStudentLeaderboard,
  getStudentQuadrantDetails,
  initializeSampleData,
  submitFeedback,
  getFeedbackHistory,
  getStudentProfile,
  updateStudentProfile,
  changePassword,
  getEligibilityRules,
  checkStudentEligibility,
  getImprovementPlan,
  setImprovementGoals,
  getStudentAttendance,
  getScoreBreakdown,
  getBehaviorRatingScale,
  getStudentInterventions,
  getStudentInterventionDetails,
  getStudentInterventionTasks,
  submitInterventionTask,
  getInterventionQuadrantImpact,
  getStudentInterventionPerformance
} = require('../controllers/studentController');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { validateInput, validationSchemas } = require('../middleware/weightageValidation');
const { authorizeStudentAccess } = require('../middleware/resourceAuthorization');
const { paginateSearchFilter } = require('../middleware/pagination');
const { successResponse, paginatedResponse } = require('../utils/responseFormatter');

// @route   GET /api/v1/students/me
// @desc    Get current student's profile
// @access  Students only
router.get('/me', authenticateToken, getCurrentStudent);

// @route   POST /api/v1/students/init-sample-data
// @desc    Initialize sample data for testing (development only)
// @access  Admin only
router.post('/init-sample-data', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    await initializeSampleData();
    res.status(200).json({
      success: true,
      message: 'Sample data initialized successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to initialize sample data',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// @route   GET /api/v1/students/eligibility-rules
// @desc    Get eligibility rules for all quadrants
// @access  All authenticated users
router.get('/eligibility-rules', authenticateToken, getEligibilityRules);

// Phase 1 Student Dashboard APIs

// @route   GET /api/v1/students/:studentId/performance
// @desc    Get student performance data for dashboard
// @access  Students (own data), Teachers, Admins
// @query   termId, includeHistory
router.get('/:studentId/performance', authenticateToken, authorizeStudentAccess, getStudentPerformance);

// @route   GET /api/v1/students/:studentId/leaderboard
// @desc    Get student leaderboard and rankings
// @access  Students (own data), Teachers, Admins
// @query   termId, quadrantId
router.get('/:studentId/leaderboard', authenticateToken, getStudentLeaderboard);

// @route   GET /api/v1/students/:studentId/quadrants/:quadrantId
// @desc    Get detailed quadrant information for a student
// @access  Students (own data), Teachers, Admins
// @query   termId
router.get('/:studentId/quadrants/:quadrantId', authenticateToken, getStudentQuadrantDetails);

// Feedback Management

// @route   POST /api/v1/students/:studentId/feedback
// @desc    Submit feedback from student
// @access  Students (own data), Teachers, Admins
router.post('/:studentId/feedback', authenticateToken, submitFeedback);

// @route   GET /api/v1/students/:studentId/feedback
// @desc    Get student feedback history
// @access  Students (own data), Teachers, Admins
// @query   page, limit, status
router.get('/:studentId/feedback', authenticateToken, getFeedbackHistory);

// Profile Management

// @route   GET /api/v1/students/:studentId/profile
// @desc    Get student profile information
// @access  Students (own data), Teachers, Admins
router.get('/:studentId/profile', authenticateToken, authorizeStudentAccess, getStudentProfile);

// @route   PUT /api/v1/students/:studentId/profile
// @desc    Update student profile
// @access  Students (own data), Admins
router.put('/:studentId/profile', authenticateToken, authorizeStudentAccess, updateStudentProfile);

// @route   POST /api/v1/students/:studentId/change-password
// @desc    Change student password
// @access  Students (own data), Admins
router.post('/:studentId/change-password', authenticateToken, changePassword);

// Eligibility and Assessment

// @route   GET /api/v1/students/:studentId/eligibility
// @desc    Check student eligibility status
// @access  Students (own data), Teachers, Admins
// @query   termId
router.get('/:studentId/eligibility', authenticateToken, checkStudentEligibility);

// @route   GET /api/v1/students/:studentId/improvement-plan
// @desc    Get AI-generated improvement plan for student
// @access  Students (own data), Teachers, Admins
// @query   termId, quadrantId
router.get('/:studentId/improvement-plan', authenticateToken, getImprovementPlan);

// @route   POST /api/v1/students/:studentId/improvement-goals
// @desc    Set improvement goals for student
// @access  Students (own data), Teachers, Admins
router.post('/:studentId/improvement-goals', authenticateToken, setImprovementGoals);

// Attendance Management

// @route   GET /api/v1/students/:studentId/attendance
// @desc    Get student attendance records
// @access  Students (own data), Teachers, Admins
// @query   termId, quadrant
router.get('/:studentId/attendance', authenticateToken, getStudentAttendance);

// Detailed Analytics

// @route   GET /api/v1/students/:studentId/scores/breakdown
// @desc    Get detailed score breakdown for student
// @access  Students (own data), Teachers, Admins
// @query   termId, quadrantId, includeHistory
router.get('/:studentId/scores/breakdown', authenticateToken, getScoreBreakdown);

// @route   GET /api/v1/students/:studentId/behavior-rating-scale
// @desc    Get behavior rating scale and scores
// @access  Students (own data), Teachers, Admins
// @query   termId
router.get('/:studentId/behavior-rating-scale', authenticateToken, getBehaviorRatingScale);

// Intervention Management

// @route   GET /api/v1/students/:studentId/interventions
// @desc    Get all interventions for a student
// @access  Students (own data), Teachers, Admins
// @query   status, quadrant
router.get('/:studentId/interventions', authenticateToken, getStudentInterventions);

// @route   GET /api/v1/students/:studentId/interventions/:interventionId
// @desc    Get detailed intervention information for a student
// @access  Students (own data), Teachers, Admins
router.get('/:studentId/interventions/:interventionId', authenticateToken, getStudentInterventionDetails);

// @route   GET /api/v1/students/:studentId/interventions/:interventionId/tasks
// @desc    Get intervention tasks for a student
// @access  Students (own data), Teachers, Admins
// @query   status, quadrant
router.get('/:studentId/interventions/:interventionId/tasks', authenticateToken, getStudentInterventionTasks);

// @route   POST /api/v1/students/:studentId/interventions/:interventionId/tasks/:taskId/submit
// @desc    Submit intervention task
// @access  Students (own data), Teachers, Admins
router.post('/:studentId/interventions/:interventionId/tasks/:taskId/submit', authenticateToken, submitInterventionTask);

// @route   GET /api/v1/students/:studentId/interventions/quadrant-impact
// @desc    Get intervention impact on quadrant scores
// @access  Students (own data), Teachers, Admins
// @query   termId, quadrant
router.get('/:studentId/interventions/quadrant-impact', authenticateToken, getInterventionQuadrantImpact);

// @route   GET /api/v1/students/:studentId/intervention-performance
// @desc    Get comprehensive intervention performance for student
// @access  Students (own data), Teachers, Admins
router.get('/:studentId/intervention-performance', authenticateToken, getStudentInterventionPerformance);

// Administrative Student Management

// @route   GET /api/v1/students/filter-options
// @desc    Get available filter options for student filtering
// @access  Teachers, Admins
router.get('/filter-options', authenticateToken, requireRole('teacher', 'admin'), getStudentFilterOptions);

// @route   GET /api/v1/students
// @desc    Get all students with enhanced pagination and filters
// @access  Teachers, Admins
// @query   page, limit, search, batch, section, status, course, house, batch_ids, batch_years, courses, sections, houses, exclude_enrolled
router.get('/',
  authenticateToken,
  requireRole('teacher', 'admin'),
  ...paginateSearchFilter('students', {
    allowedFilters: ['batch_id', 'section_id', 'house_id', 'is_active', 'course'],
    searchFields: ['name', 'registration_no', 'course'],
    defaultSort: 'name'
  }),
  getAllStudents
);

// @route   GET /api/v1/students/:id
// @desc    Get student by ID with detailed information
// @access  Teachers, Admins
router.get('/:id', authenticateToken, requireRole('teacher', 'admin'), getStudentById);

// @route   POST /api/v1/students
// @desc    Create new student
// @access  Admin only
router.post('/',
  authenticateToken,
  requireRole('admin'),
  validateInput(validationSchemas.createStudent),
  createStudent
);

// @route   POST /api/v1/students/create-for-user
// @desc    Create student record for existing user (temporary helper)
// @access  Admin only
router.post('/create-for-user', authenticateToken, requireRole('admin'), createStudentForExistingUser);

module.exports = router;
