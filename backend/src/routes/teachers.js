const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const {
  getTeacherDashboard,
  getAssignedStudents,
  getStudentAssessmentDetails,
  submitStudentAssessment,
  saveAssessmentDraft,
  getTeacherFeedback,
  sendFeedbackToStudent,
  getTeacherReports,
  getAllTeachers,
  getTeacherById,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  assignStudentsToTeacher
} = require('../controllers/teacherController');

// ==========================================
// TEACHER DASHBOARD & ASSESSMENT ROUTES
// ==========================================

/**
 * @route   GET /api/v1/teachers/:teacherId/dashboard
 * @desc    Get teacher dashboard with overview data
 * @access  Teacher (own data), Admin
 * @params  teacherId: teacher UUID
 * @query   termId?: string
 */
router.get('/:teacherId/dashboard',
  authenticateToken,
  requireRole('teacher', 'admin'),
  getTeacherDashboard
);

/**
 * @route   GET /api/v1/teachers/:teacherId/students
 * @desc    Get students assigned to teacher
 * @access  Teacher (own data), Admin
 * @params  teacherId: teacher UUID
 * @query   page?: number, limit?: number, search?: string, status?: string
 */
router.get('/:teacherId/students',
  authenticateToken,
  requireRole('teacher', 'admin'),
  getAssignedStudents
);

/**
 * @route   GET /api/v1/teachers/:teacherId/students/:studentId/assessment
 * @desc    Get student assessment details for teacher
 * @access  Teacher (own data), Admin
 * @params  teacherId: teacher UUID, studentId: student UUID
 * @query   termId?: string, quadrantId?: string
 */
router.get('/:teacherId/students/:studentId/assessment',
  authenticateToken,
  requireRole('teacher', 'admin'),
  getStudentAssessmentDetails
);

/**
 * @route   POST /api/v1/teachers/:teacherId/students/:studentId/assessment
 * @desc    Submit student assessment
 * @access  Teacher (own data), Admin
 * @params  teacherId: teacher UUID, studentId: student UUID
 * @body    {
 *            termId: string,
 *            quadrantId: string,
 *            scores: [
 *              {
 *                componentId: string,
 *                obtainedScore: number,
 *                maxScore: number,
 *                notes?: string
 *              }
 *            ],
 *            overallNotes?: string,
 *            status: 'Draft' | 'Submitted' | 'Reviewed'
 *          }
 */
router.post('/:teacherId/students/:studentId/assessment',
  authenticateToken,
  requireRole('teacher', 'admin'),
  submitStudentAssessment
);

/**
 * @route   POST /api/v1/teachers/:teacherId/students/:studentId/assessment/draft
 * @desc    Save student assessment as draft
 * @access  Teacher (own data), Admin
 * @params  teacherId: teacher UUID, studentId: student UUID
 * @body    Same as submit assessment
 */
router.post('/:teacherId/students/:studentId/assessment/draft',
  authenticateToken,
  requireRole('teacher', 'admin'),
  saveAssessmentDraft
);

/**
 * @route   GET /api/v1/teachers/:teacherId/feedback
 * @desc    Get feedback list for teacher
 * @access  Teacher (own data), Admin
 * @params  teacherId: teacher UUID
 * @query   page?: number, limit?: number, status?: string, studentId?: string
 */
router.get('/:teacherId/feedback',
  authenticateToken,
  requireRole('teacher', 'admin'),
  getTeacherFeedback
);

/**
 * @route   POST /api/v1/teachers/:teacherId/feedback
 * @desc    Send feedback to student
 * @access  Teacher (own data), Admin
 * @params  teacherId: teacher UUID
 * @body    {
 *            studentId: string,
 *            subject: string,
 *            message: string,
 *            category: 'Academic' | 'Behavioral' | 'General',
 *            priority: 'Low' | 'Medium' | 'High'
 *          }
 */
router.post('/:teacherId/feedback',
  authenticateToken,
  requireRole('teacher', 'admin'),
  sendFeedbackToStudent
);

/**
 * @route   GET /api/v1/teachers/:teacherId/reports
 * @desc    Get teacher reports
 * @access  Teacher (own data), Admin
 * @params  teacherId: teacher UUID
 * @query   termId?: string, reportType?: string, format?: 'json' | 'pdf' | 'excel'
 */
router.get('/:teacherId/reports',
  authenticateToken,
  requireRole('teacher', 'admin'),
  getTeacherReports
);

// ==========================================
// ADMIN TEACHER MANAGEMENT ROUTES
// ==========================================

/**
 * @route   GET /api/v1/teachers
 * @desc    Get all teachers with pagination and filters
 * @access  Admin only
 * @query   page?: number, limit?: number, search?: string, department?: string, status?: string
 */
router.get('/',
  authenticateToken,
  requireRole('admin'),
  getAllTeachers
);

/**
 * @route   GET /api/v1/teachers/:id
 * @desc    Get teacher by ID with detailed information
 * @access  Admin only
 * @params  id: teacher UUID
 */
router.get('/:id',
  authenticateToken,
  requireRole('admin'),
  getTeacherById
);

/**
 * @route   POST /api/v1/teachers
 * @desc    Create new teacher
 * @access  Admin only
 * @body    {
 *            username: string,
 *            email: string,
 *            password: string,
 *            employeeId: string,
 *            name: string,
 *            specialization?: string,
 *            department?: string
 *          }
 */
router.post('/',
  authenticateToken,
  requireRole('admin'),
  createTeacher
);

/**
 * @route   PUT /api/v1/teachers/:id
 * @desc    Update teacher information
 * @access  Admin only
 * @params  id: teacher UUID
 * @body    {
 *            name?: string,
 *            specialization?: string,
 *            department?: string,
 *            isActive?: boolean
 *          }
 */
router.put('/:id',
  authenticateToken,
  requireRole('admin'),
  updateTeacher
);

/**
 * @route   DELETE /api/v1/teachers/:id
 * @desc    Delete teacher (soft delete)
 * @access  Admin only
 * @params  id: teacher UUID
 */
router.delete('/:id',
  authenticateToken,
  requireRole('admin'),
  deleteTeacher
);

/**
 * @route   POST /api/v1/teachers/:teacherId/assign-students
 * @desc    Assign students to teacher
 * @access  Admin only
 * @params  teacherId: teacher UUID
 * @body    {
 *            studentIds: string[],
 *            quadrantIds?: string[],
 *            termId?: string
 *          }
 */
router.post('/:teacherId/assign-students',
  authenticateToken,
  requireRole('admin'),
  assignStudentsToTeacher
);

module.exports = router;
