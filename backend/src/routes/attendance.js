const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const {
  markAttendance,
  bulkMarkAttendance,
  updateAttendanceSummary
} = require('../controllers/attendanceController');

/**
 * Attendance Management API Routes
 * 
 * Handles admin functionality for managing student attendance records
 * Implements 80% eligibility enforcement as per Excel system requirements
 */

/**
 * @route   POST /api/v1/attendance
 * @desc    Mark attendance for a student
 * @access  Admins, Teachers
 * @body    { studentId: string, termId: string, quadrantId: string, attendanceDate: string, isPresent: boolean, reason?: string }
 */
router.post('/', 
  authenticateToken, 
  requireRole('admin', 'teacher'), 
  markAttendance
);

/**
 * @route   POST /api/v1/attendance/bulk
 * @desc    Bulk mark attendance for multiple students
 * @access  Admins, Teachers
 * @body    { termId: string, quadrantId: string, attendanceDate: string, attendanceRecords: Array<{ studentId: string, isPresent: boolean, reason?: string }> }
 */
router.post('/bulk', 
  authenticateToken, 
  requireRole('admin', 'teacher'), 
  bulkMarkAttendance
);

/**
 * @route   PUT /api/v1/attendance/summary
 * @desc    Update attendance summary for a student in a quadrant
 * @access  Admins only
 * @body    { studentId: string, termId: string, quadrantId: string, totalSessions: number, attendedSessions: number }
 */
router.put('/summary', 
  authenticateToken, 
  requireRole('admin'), 
  updateAttendanceSummary
);

module.exports = router;
