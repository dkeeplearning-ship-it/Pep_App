const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const {
  createIntervention,
  getAllInterventions,
  getInterventionById,
  updateIntervention,
  deleteIntervention,
  assignTeachers,
  enrollStudents,
  enrollStudentsByBatch,
  enrollStudentsByCriteria,
  getInterventionAnalytics,
  updateInterventionStatus,
  createTask,
  updateTask,
  deleteTask,
  getAllTasks,
  getTeacherTasks,
  getStudentTasks,
  submitTask,
  saveTaskDraft,
  getTeacherMicrocompetencies,
  getTeacherInterventions,
  getTeacherInterventionDetails,
  getTeacherSubmissions,
  gradeSubmission,
  // Direct assessment functions
  createDirectAssessment,
  updateDirectAssessment,
  getTaskDirectAssessments,
  getInterventionStudents,
  // New intervention-centric functions
  getInterventionMicrocompetencies,
  addMicrocompetenciesToIntervention,
  assignTeachersToMicrocompetencies,
  setScoringDeadline,
  getInterventionTeacherAssignments,
  removeTeacherAssignment
} = require('../controllers/interventionController');

// ==========================================
// ADMIN INTERVENTION ROUTES
// ==========================================

/**
 * @route   POST /api/v1/interventions
 * @desc    Create new intervention
 * @access  Admin only
 * @body    {
 *   name: string,
 *   description: string,
 *   startDate: string (YYYY-MM-DD),
 *   endDate: string (YYYY-MM-DD),
 *   quadrantWeightages: object,
 *   prerequisites: array,
 *   maxStudents: number,
 *   objectives: array
 * }
 */
router.post('/',
  authenticateToken,
  requireRole('admin'),
  createIntervention
);

/**
 * @route   GET /api/v1/interventions
 * @desc    Get all interventions with filtering and pagination
 * @access  Admin only
 * @query   {
 *   status?: string,
 *   page?: number,
 *   limit?: number,
 *   search?: string,
 *   sortBy?: string,
 *   sortOrder?: 'asc' | 'desc'
 * }
 */
router.get('/',
  authenticateToken,
  requireRole('admin'),
  getAllInterventions
);

/**
 * @route   GET /api/v1/interventions/:id
 * @desc    Get intervention details by ID
 * @access  Admin only
 * @params  id: intervention UUID
 */
router.get('/:id',
  authenticateToken,
  requireRole('admin'),
  getInterventionById
);

/**
 * @route   PUT /api/v1/interventions/:id
 * @desc    Update intervention details
 * @access  Admin only
 * @params  id: intervention UUID
 * @body    {
 *   name?: string,
 *   description?: string,
 *   startDate?: string,
 *   endDate?: string,
 *   quadrantWeightages?: object,
 *   prerequisites?: array,
 *   maxStudents?: number,
 *   objectives?: array
 * }
 */
router.put('/:id',
  authenticateToken,
  requireRole('admin'),
  updateIntervention
);

/**
 * @route   DELETE /api/v1/interventions/:id
 * @desc    Delete intervention (only Draft status)
 * @access  Admin only
 * @params  id: intervention UUID
 */
router.delete('/:id',
  authenticateToken,
  requireRole('admin'),
  deleteIntervention
);

/**
 * @route   POST /api/v1/interventions/:id/assign-teachers
 * @desc    Assign teachers to intervention
 * @access  Admin only
 * @params  id: intervention UUID
 * @body    {
 *   teachers: [
 *     {
 *       teacherId: string,
 *       assignedQuadrants: array,
 *       role: 'Lead' | 'Assistant',
 *       permissions: array
 *     }
 *   ]
 * }
 */
router.post('/:id/assign-teachers',
  authenticateToken,
  requireRole('admin'),
  assignTeachers
);

/**
 * @route   POST /api/v1/interventions/:id/enroll-students
 * @desc    Enroll students in intervention
 * @access  Admin only
 * @params  id: intervention UUID
 * @body    {
 *   students: array of student UUIDs,
 *   enrollmentType: 'Mandatory' | 'Optional'
 * }
 */
router.post('/:id/enroll-students',
  authenticateToken,
  requireRole('admin'),
  enrollStudents
);

/**
 * @route   POST /api/v1/interventions/:id/enroll-batch
 * @desc    Enroll students by batch
 * @access  Admin only
 * @params  id: intervention UUID
 * @body    {
 *   batch_ids: array of batch UUIDs,
 *   section_ids?: array of section UUIDs,
 *   course_filters?: array of course names,
 *   enrollmentType: 'Mandatory' | 'Optional'
 * }
 */
router.post('/:id/enroll-batch',
  authenticateToken,
  requireRole('admin'),
  enrollStudentsByBatch
);

/**
 * @route   POST /api/v1/interventions/:id/enroll-criteria
 * @desc    Enroll students by criteria
 * @access  Admin only
 * @params  id: intervention UUID
 * @body    {
 *   criteria: {
 *     batch_years?: array of years,
 *     courses?: array of course names,
 *     sections?: array of section UUIDs,
 *     houses?: array of house UUIDs
 *   },
 *   enrollmentType: 'Mandatory' | 'Optional'
 * }
 */
router.post('/:id/enroll-criteria',
  authenticateToken,
  requireRole('admin'),
  enrollStudentsByCriteria
);

/**
 * @route   GET /api/v1/interventions/:id/analytics
 * @desc    Get intervention analytics and statistics
 * @access  Admin only
 * @params  id: intervention UUID
 */
router.get('/:id/analytics',
  authenticateToken,
  requireRole('admin'),
  getInterventionAnalytics
);

/**
 * @route   PUT /api/v1/interventions/:id/status
 * @desc    Update intervention status
 * @access  Admin only
 * @params  id: intervention UUID
 * @body    {
 *   status: 'Draft' | 'Active' | 'Completed' | 'Archived' | 'Cancelled'
 * }
 */
router.put('/:id/status',
  authenticateToken,
  requireRole('admin'),
  updateInterventionStatus
);

/**
 * @route   GET /api/v1/interventions/:interventionId/teacher-microcompetencies
 * @desc    Get teacher's assigned microcompetencies for task creation
 * @access  Teachers only
 * @params  interventionId: intervention UUID
 */
router.get('/:interventionId/teacher-microcompetencies',
  authenticateToken,
  requireRole('teacher'),
  getTeacherMicrocompetencies
);

/**
 * @route   POST /api/v1/interventions/:interventionId/tasks
 * @desc    Create microcompetency-centric task (Teachers only)
 * @access  Teachers only
 * @params  interventionId: intervention UUID
 * @body    {
 *   name: string,
 *   description: string,
 *   microcompetencies: [{microcompetencyId: string, weightage: number}],
 *   maxScore: number,
 *   dueDate: string,
 *   instructions: string,
 *   rubric: array,
 *   submissionType: string,
 *   allowLateSubmission: boolean,
 *   latePenalty: number
 * }
 */
router.post('/:interventionId/tasks',
  authenticateToken,
  requireRole('teacher'),
  createTask
);

/**
 * @route   PUT /api/v1/interventions/tasks/:taskId
 * @desc    Update task (Admin or Task Creator)
 * @access  Admin or Task Creator
 * @params  taskId: task UUID
 * @body    Task update fields
 */
router.put('/tasks/:taskId',
  authenticateToken,
  requireRole('admin', 'teacher'),
  updateTask
);

/**
 * @route   DELETE /api/v1/interventions/tasks/:taskId
 * @desc    Delete task (Admin or Task Creator)
 * @access  Admin or Task Creator
 * @params  taskId: task UUID
 */
router.delete('/tasks/:taskId',
  authenticateToken,
  requireRole('admin', 'teacher'),
  deleteTask
);

// ==========================================
// STUDENT TASK ENDPOINTS
// ==========================================

/**
 * @route   GET /api/v1/interventions/student/:interventionId/tasks
 * @desc    Get student's available tasks for an intervention
 * @access  Students only
 * @params  interventionId: intervention UUID
 * @query   status?: string
 */
router.get('/student/:interventionId/tasks',
  authenticateToken,
  requireRole('student'),
  getStudentTasks
);

/**
 * @route   POST /api/v1/interventions/tasks/:taskId/submit
 * @desc    Submit task (Student)
 * @access  Students only
 * @params  taskId: task UUID
 * @body    { submissionText: string, attachments?: array }
 */
router.post('/tasks/:taskId/submit',
  authenticateToken,
  requireRole('student'),
  submitTask
);

/**
 * @route   POST /api/v1/interventions/tasks/:taskId/draft
 * @desc    Save task draft (Student)
 * @access  Students only
 * @params  taskId: task UUID
 * @body    { submissionText: string, attachments?: array }
 */
router.post('/tasks/:taskId/draft',
  authenticateToken,
  requireRole('student'),
  saveTaskDraft
);

// ==========================================
// NEW INTERVENTION-CENTRIC ROUTES
// ==========================================

/**
 * @route   GET /api/v1/interventions/:interventionId/microcompetencies
 * @desc    Get microcompetencies for intervention
 * @access  Teachers, Admins
 * @params  interventionId: intervention UUID
 * @query   quadrantId?: string, includeInactive?: boolean
 */
router.get('/:interventionId/microcompetencies',
  authenticateToken,
  requireRole('teacher', 'admin'),
  getInterventionMicrocompetencies
);

/**
 * @route   POST /api/v1/interventions/:interventionId/microcompetencies
 * @desc    Add microcompetencies to intervention
 * @access  Admin only
 * @params  interventionId: intervention UUID
 * @body    {
 *   microcompetencies: [
 *     {
 *       microcompetency_id: string,
 *       weightage: number (0-100),
 *       max_score: number (optional, default: 10)
 *     }
 *   ]
 * }
 */
router.post('/:interventionId/microcompetencies',
  authenticateToken,
  requireRole('admin'),
  addMicrocompetenciesToIntervention
);

/**
 * @route   POST /api/v1/interventions/:interventionId/assign-teachers-microcompetencies
 * @desc    Assign teachers to specific microcompetencies within intervention
 * @access  Admin only
 * @params  interventionId: intervention UUID
 * @body    {
 *   assignments: [
 *     {
 *       teacher_id: string,
 *       microcompetency_id: string,
 *       can_score: boolean (optional, default: true),
 *       can_create_tasks: boolean (optional, default: true)
 *     }
 *   ]
 * }
 */
router.post('/:interventionId/assign-teachers-microcompetencies',
  authenticateToken,
  requireRole('admin'),
  assignTeachersToMicrocompetencies
);

/**
 * @route   PUT /api/v1/interventions/:interventionId/scoring-deadline
 * @desc    Set scoring deadline for intervention
 * @access  Admin only
 * @params  interventionId: intervention UUID
 * @body    {
 *   scoring_deadline: string (ISO date),
 *   is_scoring_open: boolean (optional, default: true)
 * }
 */
router.put('/:interventionId/scoring-deadline',
  authenticateToken,
  requireRole('admin'),
  setScoringDeadline
);

/**
 * @route   GET /api/v1/interventions/:interventionId/teacher-assignments
 * @desc    Get teacher assignments for intervention
 * @access  Admin only
 * @params  interventionId: intervention UUID
 */
router.get('/:interventionId/teacher-assignments',
  authenticateToken,
  requireRole('admin'),
  getInterventionTeacherAssignments
);

/**
 * @route   DELETE /api/v1/interventions/:interventionId/teacher-assignments/:assignmentId
 * @desc    Remove teacher assignment from intervention
 * @access  Admin only
 * @params  interventionId: intervention UUID, assignmentId: assignment UUID
 */
router.delete('/:interventionId/teacher-assignments/:assignmentId',
  authenticateToken,
  requireRole('admin'),
  removeTeacherAssignment
);

// ==========================================
// TEACHER INTERVENTION ROUTES
// ==========================================

/**
 * @route   GET /api/v1/interventions/admin/tasks
 * @desc    Get all tasks for admin management
 * @access  Admins only
 * @query   status: task status filter, interventionId: filter by intervention, teacherId: filter by teacher
 */
router.get('/admin/tasks',
  authenticateToken,
  requireRole('admin'),
  getAllTasks
);

/**
 * @route   GET /api/v1/interventions/teacher/tasks
 * @desc    Get teacher's tasks across all interventions
 * @access  Teachers only
 * @query   status: task status filter, interventionId: filter by intervention
 */
router.get('/teacher/tasks',
  authenticateToken,
  requireRole('teacher'),
  getTeacherTasks
);

/**
 * @route   GET /api/v1/interventions/teachers/:teacherId
 * @desc    Get teacher's assigned interventions
 * @access  Teacher or Admin
 * @params  teacherId: teacher UUID
 */
router.get('/teachers/:teacherId',
  authenticateToken,
  requireRole('teacher', 'admin'),
  getTeacherInterventions
);

/**
 * @route   GET /api/v1/interventions/teachers/:teacherId/:interventionId
 * @desc    Get specific intervention details for teacher
 * @access  Teacher or Admin
 * @params  teacherId: teacher UUID, interventionId: intervention UUID
 */
router.get('/teachers/:teacherId/:interventionId',
  authenticateToken,
  requireRole('teacher', 'admin'),
  getTeacherInterventionDetails
);

/**
 * @route   GET /api/v1/interventions/teacher/:interventionId/submissions
 * @desc    Get task submissions for teacher review (microcompetency-based)
 * @access  Teachers only
 * @params  interventionId: intervention UUID
 * @query   taskId?: string, status?: string
 */
router.get('/teacher/:interventionId/submissions',
  authenticateToken,
  requireRole('teacher'),
  getTeacherSubmissions
);

/**
 * @route   POST /api/v1/interventions/submissions/:submissionId/grade
 * @desc    Grade a task submission with automatic microcompetency score updates
 * @access  Teachers only
 * @params  submissionId: submission UUID
 * @body    {
 *   score: number,
 *   feedback: string,
 *   privateNotes: string
 * }
 */
router.post('/submissions/:submissionId/grade',
  authenticateToken,
  requireRole('teacher'),
  gradeSubmission
);

// ==========================================
// DIRECT ASSESSMENT ENDPOINTS
// ==========================================

/**
 * @route   POST /api/v1/interventions/tasks/:taskId/direct-assessment
 * @desc    Create direct assessment for a student (no submission required)
 * @access  Teachers only
 * @params  taskId: task UUID
 * @body    {
 *   studentId: string,
 *   score: number,
 *   feedback?: string,
 *   privateNotes?: string
 * }
 */
router.post('/tasks/:taskId/direct-assessment',
  authenticateToken,
  requireRole('teacher'),
  createDirectAssessment
);

/**
 * @route   PUT /api/v1/interventions/direct-assessments/:assessmentId
 * @desc    Update direct assessment
 * @access  Teachers only
 * @params  assessmentId: assessment UUID
 * @body    {
 *   score?: number,
 *   feedback?: string,
 *   privateNotes?: string
 * }
 */
router.put('/direct-assessments/:assessmentId',
  authenticateToken,
  requireRole('teacher'),
  updateDirectAssessment
);

/**
 * @route   GET /api/v1/interventions/tasks/:taskId/direct-assessments
 * @desc    Get all direct assessments for a task
 * @access  Teachers only
 * @params  taskId: task UUID
 */
router.get('/tasks/:taskId/direct-assessments',
  authenticateToken,
  requireRole('teacher'),
  getTaskDirectAssessments
);

/**
 * @route   GET /api/v1/interventions/:interventionId/students
 * @desc    Get enrolled students for an intervention
 * @access  Teachers, Admins
 * @params  interventionId: intervention UUID
 */
router.get('/:interventionId/students',
  authenticateToken,
  requireRole('teacher', 'admin'),
  getInterventionStudents
);

module.exports = router;
