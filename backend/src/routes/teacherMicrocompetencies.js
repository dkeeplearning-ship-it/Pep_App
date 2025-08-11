const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const {
  getTeacherInterventions,
  getTeacherMicrocompetencies,
  getAllTeacherMicrocompetencies,
  getStudentsForScoring,
  scoreStudentMicrocompetency,
  batchScoreStudents
} = require('../controllers/teacherMicrocompetencyController');

// ==========================================
// TEACHER MICROCOMPETENCY ROUTES
// ==========================================

/**
 * @route   GET /api/v1/teacher-microcompetencies/:teacherId/interventions
 * @desc    Get teacher's assigned interventions with microcompetency counts
 * @access  Teacher, Admin
 * @params  teacherId: teacher UUID
 * @query   status?: string, includeCompleted?: boolean
 */
router.get('/:teacherId/interventions',
  authenticateToken,
  requireRole('teacher', 'admin'),
  getTeacherInterventions
);

/**
 * @route   GET /api/v1/teacher-microcompetencies/:teacherId/microcompetencies
 * @desc    Get all teacher's assigned microcompetencies across all interventions
 * @access  Teacher, Admin
 * @params  teacherId: teacher UUID
 */
router.get('/:teacherId/microcompetencies',
  authenticateToken,
  requireRole('teacher', 'admin'),
  getAllTeacherMicrocompetencies
);

/**
 * @route   GET /api/v1/teacher-microcompetencies/:teacherId/interventions/:interventionId/microcompetencies
 * @desc    Get teacher's assigned microcompetencies for a specific intervention
 * @access  Teacher, Admin
 * @params  teacherId: teacher UUID, interventionId: intervention UUID
 */
router.get('/:teacherId/interventions/:interventionId/microcompetencies',
  authenticateToken,
  requireRole('teacher', 'admin'),
  getTeacherMicrocompetencies
);

/**
 * @route   GET /api/v1/teacher-microcompetencies/:teacherId/interventions/:interventionId/students
 * @desc    Get students assigned to teacher for scoring in a specific intervention
 * @access  Teacher, Admin
 * @params  teacherId: teacher UUID, interventionId: intervention UUID
 * @query   microcompetencyId?: string (to get existing scores for specific microcompetency)
 */
router.get('/:teacherId/interventions/:interventionId/students',
  authenticateToken,
  requireRole('teacher', 'admin'),
  getStudentsForScoring
);

/**
 * @route   POST /api/v1/teacher-microcompetencies/:teacherId/interventions/:interventionId/students/:studentId/microcompetencies/:microcompetencyId/score
 * @desc    Score a student on a specific microcompetency
 * @access  Teacher, Admin
 * @params  teacherId: teacher UUID, interventionId: intervention UUID, studentId: student UUID, microcompetencyId: microcompetency UUID
 * @body    {
 *            obtained_score: number,
 *            feedback?: string,
 *            status?: 'Draft' | 'Submitted' | 'Reviewed'
 *          }
 */
router.post('/:teacherId/interventions/:interventionId/students/:studentId/microcompetencies/:microcompetencyId/score',
  authenticateToken,
  requireRole('teacher', 'admin'),
  scoreStudentMicrocompetency
);

/**
 * @route   POST /api/v1/teacher-microcompetencies/:teacherId/interventions/:interventionId/microcompetencies/:microcompetencyId/batch-score
 * @desc    Batch score multiple students on a specific microcompetency
 * @access  Teacher, Admin
 * @params  teacherId: teacher UUID, interventionId: intervention UUID, microcompetencyId: microcompetency UUID
 * @body    {
 *            scores: [
 *              {
 *                student_id: string,
 *                obtained_score: number,
 *                feedback?: string,
 *                status?: 'Draft' | 'Submitted' | 'Reviewed'
 *              }
 *            ]
 *          }
 */
router.post('/:teacherId/interventions/:interventionId/microcompetencies/:microcompetencyId/batch-score',
  authenticateToken,
  requireRole('teacher', 'admin'),
  batchScoreStudents
);

module.exports = router;
