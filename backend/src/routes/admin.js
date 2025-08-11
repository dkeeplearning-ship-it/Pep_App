const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const {
  getDashboardOverview,
  getAllStudents,
  searchStudents,
  getStudentDetails,
  addStudent,
  updateStudent,
  deleteStudent,
  getAllTeachers,
  addTeacher,
  updateTeacher,
  // New intervention-centric functions
  getInterventionDashboard,
  getAllInterventionsWithDetails,
  getInterventionDetails,
  // Reports and analytics functions
  getReportsAnalytics,
  exportReports
} = require('../controllers/adminController');

// Admin Dashboard
router.get('/dashboard', authenticateToken, requireRole('admin'), getDashboardOverview);

// Student Management
router.get('/students', authenticateToken, requireRole('admin'), getAllStudents);
router.get('/students/search', authenticateToken, requireRole('admin'), searchStudents);
router.get('/students/:studentId', authenticateToken, requireRole('admin'), getStudentDetails);
router.post('/students', authenticateToken, requireRole('admin'), addStudent);
router.put('/students/:studentId', authenticateToken, requireRole('admin'), updateStudent);
router.delete('/students/:studentId', authenticateToken, requireRole('admin'), deleteStudent);

// Teacher Management
router.get('/teachers', authenticateToken, requireRole('admin'), getAllTeachers);
router.post('/teachers', authenticateToken, requireRole('admin'), addTeacher);
router.put('/teachers/:teacherId', authenticateToken, requireRole('admin'), updateTeacher);

// ==========================================
// NEW INTERVENTION-CENTRIC ADMIN ROUTES
// ==========================================

/**
 * @route   GET /api/v1/admin/intervention-dashboard
 * @desc    Get intervention management dashboard with statistics
 * @access  Admin only
 */
router.get('/intervention-dashboard',
  authenticateToken,
  requireRole('admin'),
  getInterventionDashboard
);

/**
 * @route   GET /api/v1/admin/interventions
 * @desc    Get all interventions with microcompetency details and pagination
 * @access  Admin only
 * @query   {
 *   page?: number,
 *   limit?: number,
 *   status?: string,
 *   search?: string,
 *   sortBy?: string,
 *   sortOrder?: 'asc' | 'desc'
 * }
 */
router.get('/interventions',
  authenticateToken,
  requireRole('admin'),
  getAllInterventionsWithDetails
);

/**
 * @route   GET /api/v1/admin/interventions/:interventionId
 * @desc    Get detailed intervention information with microcompetencies and assignments
 * @access  Admin only
 * @params  interventionId: intervention UUID
 */
router.get('/interventions/:interventionId',
  authenticateToken,
  requireRole('admin'),
  getInterventionDetails
);

// ==========================================
// REPORTS AND ANALYTICS ROUTES
// ==========================================

/**
 * @route   GET /api/v1/admin/reports
 * @desc    Get comprehensive reports and analytics
 * @access  Admin only
 * @query   {
 *   reportType?: string,
 *   startDate?: string,
 *   endDate?: string,
 *   interventionId?: string,
 *   quadrantId?: string
 * }
 */
router.get('/reports',
  authenticateToken,
  requireRole('admin'),
  getReportsAnalytics
);

/**
 * @route   GET /api/v1/admin/reports/export
 * @desc    Export reports data in various formats
 * @access  Admin only
 * @query   {
 *   format?: 'json' | 'csv',
 *   reportType?: string,
 *   startDate?: string,
 *   endDate?: string
 * }
 */
router.get('/reports/export',
  authenticateToken,
  requireRole('admin'),
  exportReports
);

module.exports = router;