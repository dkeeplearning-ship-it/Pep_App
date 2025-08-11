const { supabase, query } = require('../config/supabase');
const bcrypt = require('bcryptjs');

// ==========================================
// TEACHER DASHBOARD & ASSESSMENT FUNCTIONS
// ==========================================

/**
 * Get teacher dashboard with overview data
 */
const getTeacherDashboard = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { termId } = req.query;

    // Verify teacher exists - try both user_id and direct id lookup
    let teacherCheck = await query(
      supabase
        .from('teachers')
        .select('id, name, employee_id, specialization, department, user_id')
        .eq('user_id', teacherId)
    );

    // If not found by user_id, try direct id lookup (for backward compatibility)
    if (!teacherCheck.rows || teacherCheck.rows.length === 0) {
      teacherCheck = await query(
        supabase
          .from('teachers')
          .select('id, name, employee_id, specialization, department, user_id')
          .eq('id', teacherId)
      );
    }

    if (!teacherCheck.rows || teacherCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found',
        timestamp: new Date().toISOString()
      });
    }

    const teacher = teacherCheck.rows[0];

    // Get current term if not specified
    let currentTermId = termId;
    if (!currentTermId) {
      const termResult = await query(
        supabase
          .from('terms')
          .select('id, name')
          .eq('is_current', true)
          .limit(1)
      );
      if (termResult.rows && termResult.rows.length > 0) {
        currentTermId = termResult.rows[0].id;
      }
    }

    // Get assigned students count
    const studentsResult = await query(
      supabase
        .from('teacher_assignments')
        .select('student_id', { count: 'exact' })
        .eq('teacher_id', teacher.id)
        .eq('is_active', true)
    );

    const totalStudents = studentsResult.count || 0;

    // Get pending assessments count
    const pendingAssessmentsResult = await query(
      supabase
        .from('scores')
        .select('id', { count: 'exact' })
        .eq('assessed_by', teacher.user_id)
        .eq('status', 'Draft')
    );

    const pendingAssessments = pendingAssessmentsResult.count || 0;

    // Get recent feedback count
    const recentFeedbackResult = await query(
      supabase
        .from('feedback')
        .select('id', { count: 'exact' })
        .eq('teacher_id', teacher.id)
        .gte('submitted_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    );

    const recentFeedback = recentFeedbackResult.count || 0;

    // Get assigned quadrant IDs
    const assignmentResult = await query(
      supabase
        .from('teacher_assignments')
        .select('quadrant_id')
        .eq('teacher_id', teacherId)
        .eq('is_active', true)
        .not('quadrant_id', 'is', null)
    );

    // Get unique quadrant IDs
    const uniqueQuadrantIds = [...new Set(assignmentResult.rows.map(item => item.quadrant_id))];

    // Get quadrant details
    let assignedQuadrants = [];
    if (uniqueQuadrantIds.length > 0) {
      const quadrantsResult = await query(
        supabase
          .from('quadrants')
          .select('id, name, display_order')
          .in('id', uniqueQuadrantIds)
          .order('display_order', { ascending: true })
      );
      assignedQuadrants = quadrantsResult.rows;
    }

    // Get recent activities (last 10)
    const activitiesResult = await query(
      supabase
        .from('scores')
        .select(`
          id,
          obtained_score,
          max_score,
          assessment_date,
          notes,
          students:student_id(name, registration_no),
          components:component_id(name)
        `)
        .eq('assessed_by', teacher.user_id)
        .order('assessment_date', { ascending: false })
        .limit(10)
    );

    const recentActivities = activitiesResult.rows.map(activity => ({
      id: activity.id,
      type: 'assessment',
      description: `Assessed ${activity.students?.name} on ${activity.components?.name}`,
      score: `${activity.obtained_score}/${activity.max_score}`,
      date: activity.assessment_date,
      notes: activity.notes
    }));

    res.status(200).json({
      success: true,
      data: {
        teacher,
        overview: {
          totalStudents,
          pendingAssessments,
          recentFeedback,
          assignedQuadrants: assignedQuadrants.length
        },
        assignedQuadrants,
        recentActivities,
        currentTerm: currentTermId
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching teacher dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch teacher dashboard',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Get students assigned to teacher
 */
const getAssignedStudents = async (req, res) => {
  try {
    const { teacherId } = req.params; // This is actually user_id from frontend
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const status = req.query.status || '';

    // First, get the teacher record by user_id
    const teacherCheck = await query(
      supabase
        .from('teachers')
        .select('id, name, user_id')
        .eq('user_id', teacherId)
    );

    if (!teacherCheck.rows || teacherCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found',
        timestamp: new Date().toISOString()
      });
    }

    const teacher = teacherCheck.rows[0];

    // Get students from both traditional assignments and intervention enrollments

    // 1. Get traditional teacher assignments
    let traditionalStudentsQuery = supabase
      .from('teacher_assignments')
      .select(`
        students:student_id(
          id,
          registration_no,
          name,
          course,
          overall_score,
          grade,
          status,
          batches:batch_id(name, year),
          sections:section_id(name),
          houses:house_id(name, color)
        ),
        quadrant_id,
        assigned_at,
        is_active
      `)
      .eq('teacher_id', teacher.id)
      .eq('is_active', true);

    // 2. Get students from intervention enrollments where teacher is assigned
    const teacherInterventionsResult = await query(
      supabase
        .from('teacher_microcompetency_assignments')
        .select('intervention_id')
        .eq('teacher_id', teacher.id)
        .eq('is_active', true)
    );

    const interventionIds = teacherInterventionsResult.rows.map(row => row.intervention_id);

    let interventionStudentsQuery = null;
    if (interventionIds.length > 0) {
      interventionStudentsQuery = supabase
        .from('intervention_enrollments')
        .select(`
          id,
          enrollment_date,
          enrollment_status,
          students:student_id(
            id,
            registration_no,
            name,
            course,
            overall_score,
            grade,
            status,
            batches:batch_id(name, year),
            sections:section_id(name),
            houses:house_id(name, color)
          ),
          interventions:intervention_id(
            id,
            name,
            status
          )
        `)
        .in('intervention_id', interventionIds)
        .eq('enrollment_status', 'Enrolled');
    }

    // Execute queries
    const [traditionalResult, interventionResult] = await Promise.all([
      query(traditionalStudentsQuery),
      interventionStudentsQuery ? query(interventionStudentsQuery) : { rows: [] }
    ]);

    // Combine and deduplicate students
    const allStudents = [];
    const studentIds = new Set();

    // Add traditional students
    traditionalResult.rows.forEach(assignment => {
      if (assignment.students && !studentIds.has(assignment.students.id)) {
        studentIds.add(assignment.students.id);
        allStudents.push({
          ...assignment.students,
          assignment_type: 'Traditional',
          quadrant_id: assignment.quadrant_id,
          assigned_at: assignment.assigned_at,
          source: 'teacher_assignment'
        });
      }
    });

    // Add intervention students
    interventionResult.rows.forEach(enrollment => {
      if (enrollment.students && !studentIds.has(enrollment.students.id)) {
        studentIds.add(enrollment.students.id);
        allStudents.push({
          ...enrollment.students,
          assignment_type: 'Intervention',
          intervention_name: enrollment.interventions?.name,
          enrolled_at: enrollment.enrollment_date,
          source: 'intervention_enrollment'
        });
      }
    });

    // Apply filters to combined results
    let filteredStudents = allStudents;

    if (search) {
      const searchLower = search.toLowerCase();
      filteredStudents = filteredStudents.filter(student =>
        student.name.toLowerCase().includes(searchLower) ||
        student.registration_no.toLowerCase().includes(searchLower)
      );
    }

    if (status) {
      filteredStudents = filteredStudents.filter(student => student.status === status);
    }

    // Apply pagination
    const totalStudents = filteredStudents.length;
    const totalPages = Math.ceil(totalStudents / limit);
    const paginatedStudents = filteredStudents
      .sort((a, b) => new Date(b.assigned_at || b.enrolled_at) - new Date(a.assigned_at || a.enrolled_at))
      .slice(offset, offset + limit);

    // Get additional intervention data for each student
    const paginatedStudentIds = paginatedStudents.map(s => s.id);
    let interventionEnrollments = [];
    
    if (paginatedStudentIds.length > 0) {
      const enrollmentsResult = await query(
        supabase
          .from('intervention_enrollments')
          .select(`
            student_id,
            enrollment_status,
            interventions:intervention_id(
              id,
              name,
              status
            )
          `)
          .in('student_id', paginatedStudentIds)
          .eq('enrollment_status', 'Enrolled')
      );
      interventionEnrollments = enrollmentsResult.rows || [];
    }

    // Group interventions by student
    const studentInterventions = {};
    interventionEnrollments.forEach(enrollment => {
      if (!studentInterventions[enrollment.student_id]) {
        studentInterventions[enrollment.student_id] = [];
      }
      studentInterventions[enrollment.student_id].push({
        id: enrollment.interventions.id,
        name: enrollment.interventions.name,
        status: enrollment.interventions.status,
        progress_percentage: 0 // Default, would need more complex calculation
      });
    });

    // Transform data
    const transformedData = paginatedStudents.map(student => ({
      id: student.id,
      registration_no: student.registration_no,
      name: student.name,
      course: student.course,
      overall_score: student.overall_score,
      grade: student.grade,
      status: student.status,
      assignment_type: student.assignment_type,
      assignedQuadrantId: student.quadrant_id,
      assignedDate: student.assigned_at || student.enrolled_at,
      intervention_name: student.intervention_name,
      source: student.source,
      batch: student.batches?.name || student.batch_name,
      section: student.sections?.name || student.section_name,
      batch_name: student.batches?.name,
      batch_year: student.batches?.year,
      section_name: student.sections?.name,
      house_name: student.houses?.name,
      house_color: student.houses?.color,
      average_score: student.overall_score,
      interventions: studentInterventions[student.id] || []
    }));

    res.status(200).json({
      success: true,
      message: 'Assigned students retrieved successfully',
      data: transformedData,
      pagination: {
        currentPage: page,
        totalPages,
        totalStudents,
        studentsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      },
      filters: {
        search,
        status
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching assigned students:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch assigned students',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Get student assessment details for teacher
 */
const getStudentAssessmentDetails = async (req, res) => {
  try {
    const { teacherId, studentId } = req.params; // teacherId is actually user_id from frontend
    const { termId, quadrantId } = req.query;

    // First, get the teacher record by user_id (same logic as getAssignedStudents)
    const teacherCheck = await query(
      supabase
        .from('teachers')
        .select('id, name, user_id')
        .eq('user_id', teacherId)
    );

    if (!teacherCheck.rows || teacherCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found',
        timestamp: new Date().toISOString()
      });
    }

    const teacher = teacherCheck.rows[0];

    // Verify teacher-student assignment using same logic as getAssignedStudents
    // Check both traditional assignments and intervention enrollments

    // 1. Check traditional teacher assignments
    const directAssignmentCheck = await query(
      supabase
        .from('teacher_assignments')
        .select('id')
        .eq('teacher_id', teacher.id)
        .eq('student_id', studentId)
        .eq('is_active', true)
        .limit(1)
    );

    let hasAccess = directAssignmentCheck.rows && directAssignmentCheck.rows.length > 0;

    // 2. If no direct assignment, check intervention enrollments
    if (!hasAccess) {
      // Get teacher's assigned interventions
      const teacherInterventionsResult = await query(
        supabase
          .from('teacher_microcompetency_assignments')
          .select('intervention_id')
          .eq('teacher_id', teacher.id)
          .eq('is_active', true)
      );

      const interventionIds = teacherInterventionsResult.rows.map(row => row.intervention_id);

      if (interventionIds.length > 0) {
        // Check if student is enrolled in any of teacher's interventions
        const interventionEnrollmentCheck = await query(
          supabase
            .from('intervention_enrollments')
            .select('id')
            .eq('student_id', studentId)
            .in('intervention_id', interventionIds)
            .eq('enrollment_status', 'Enrolled')
            .limit(1)
        );

        hasAccess = interventionEnrollmentCheck.rows && interventionEnrollmentCheck.rows.length > 0;
      }
    }

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Student not assigned to this teacher',
        timestamp: new Date().toISOString()
      });
    }

    // Get student details
    const studentResult = await query(
      supabase
        .from('students')
        .select(`
          id,
          registration_no,
          name,
          course,
          overall_score,
          grade,
          batches:batch_id(name, year),
          sections:section_id(name),
          houses:house_id(name, color)
        `)
        .eq('id', studentId)
        .limit(1)
    );

    if (!studentResult.rows || studentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
        timestamp: new Date().toISOString()
      });
    }

    const student = studentResult.rows[0];

    // Get assessment components for the quadrant
    let componentsQuery = supabase
      .from('components')
      .select(`
        id,
        name,
        category,
        max_score,
        sub_categories:sub_category_id(
          id,
          name,
          quadrants:quadrant_id(
            id,
            name
          )
        )
      `);

    if (quadrantId) {
      componentsQuery = componentsQuery.eq('sub_categories.quadrants.id', quadrantId);
    }

    const componentsResult = await query(componentsQuery);

    // Get existing scores for this student
    const scoresResult = await query(
      supabase
        .from('scores')
        .select(`
          id,
          obtained_score,
          max_score,
          percentage,
          assessment_date,
          notes,
          status,
          component_id,
          components:component_id(
            id,
            name
          )
        `)
        .eq('student_id', studentId)
        .order('assessment_date', { ascending: false })
    );

    // Map existing scores to components
    const scoresMap = {};
    scoresResult.rows.forEach(score => {
      if (score.component_id) {
        scoresMap[score.component_id] = score;
      }
    });

    // Combine components with existing scores
    const assessmentData = componentsResult.rows.map(component => ({
      ...component,
      existingScore: scoresMap[component.id] || null,
      quadrant: component.sub_categories?.quadrants
    }));

    // Get intervention enrollments for this student
    const interventionEnrollmentsResult = await query(
      supabase
        .from('intervention_enrollments')
        .select(`
          id,
          enrollment_date,
          enrollment_status,
          interventions:intervention_id(
            id,
            name,
            status,
            description,
            start_date,
            end_date
          )
        `)
        .eq('student_id', studentId)
        .eq('enrollment_status', 'Enrolled')
    );

    // Transform intervention enrollments for frontend
    const interventions = (interventionEnrollmentsResult.rows || []).map(enrollment => ({
      id: enrollment.interventions.id,
      name: enrollment.interventions.name,
      status: enrollment.interventions.status,
      enrolled_at: enrollment.enrollment_date,
      enrollment_status: enrollment.enrollment_status,
      description: enrollment.interventions.description,
      start_date: enrollment.interventions.start_date,
      end_date: enrollment.interventions.end_date,
      microcompetencies: [], // Would need additional query for detailed microcompetency data
      overall_progress: {
        total_microcompetencies: 0,
        scored_microcompetencies: 0,
        average_score: student.overall_score || 0,
        completion_percentage: 0 // Would need calculation based on actual progress
      }
    }));

    res.status(200).json({
      success: true,
      data: {
        student: {
          id: student.id,
          name: student.name,
          registration_no: student.registration_no,
          course: student.course,
          batch: student.batches?.name,
          section: student.sections?.name,
          status: student.status || 'Active',
          batch_name: student.batches?.name,
          batch_year: student.batches?.year,
          section_name: student.sections?.name,
          house_name: student.houses?.name,
          house_color: student.houses?.color
        },
        interventions: interventions,
        summary: {
          total_interventions: interventions.length,
          active_interventions: interventions.filter(i => i.status === 'Active').length,
          completed_interventions: interventions.filter(i => i.status === 'Completed').length,
          overall_average_score: student.overall_score || 0
        },
        assessmentComponents: assessmentData,
        termId: termId || null,
        quadrantId: quadrantId || null
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching student assessment details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch student assessment details',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Submit student assessment
 */
const submitStudentAssessment = async (req, res) => {
  try {
    const { teacherId, studentId } = req.params;
    const { termId, quadrantId, scores, overallNotes, status = 'Submitted' } = req.body;

    // Validate input
    if (!scores || !Array.isArray(scores) || scores.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Scores array is required',
        timestamp: new Date().toISOString()
      });
    }

    // Verify teacher-student assignment
    const assignmentCheck = await query(
      supabase
        .from('teacher_assignments')
        .select('id')
        .eq('teacher_id', teacherId)
        .eq('student_id', studentId)
        .eq('is_active', true)
        .limit(1)
    );

    if (!assignmentCheck.rows || assignmentCheck.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Student not assigned to this teacher',
        timestamp: new Date().toISOString()
      });
    }

    // Get teacher details for assessed_by field
    const teacherResult = await query(
      supabase
        .from('teachers')
        .select('employee_id, name, user_id')
        .eq('id', teacherId)
        .limit(1)
    );

    if (!teacherResult.rows || teacherResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found',
        timestamp: new Date().toISOString()
      });
    }

    const teacher = teacherResult.rows[0];

    // Process each score
    const submittedScores = [];
    for (const scoreData of scores) {
      const { componentId, obtainedScore, maxScore, notes } = scoreData;

      // Validate score data
      if (!componentId || obtainedScore === undefined || !maxScore) {
        continue; // Skip invalid entries
      }

      const percentage = (obtainedScore / maxScore) * 100;

      // Insert or update score
      const scoreResult = await query(
        supabase
          .from('scores')
          .upsert({
            student_id: studentId,
            component_id: componentId,
            obtained_score: obtainedScore,
            max_score: maxScore,
            percentage: percentage,
            assessment_date: new Date().toISOString(),
            notes: notes || overallNotes || '',
            assessed_by: teacher.user_id,
            status: status,
            term_id: termId || null
          })
          .select('id')
      );

      if (scoreResult.rows && scoreResult.rows.length > 0) {
        submittedScores.push(scoreResult.rows[0]);
      }
    }

    res.status(200).json({
      success: true,
      message: `Assessment ${status.toLowerCase()} successfully`,
      data: {
        submittedScores: submittedScores.length,
        status: status
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error submitting student assessment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit student assessment',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Save student assessment as draft
 */
const saveAssessmentDraft = async (req, res) => {
  try {
    // Use the same logic as submit but with status 'Draft'
    req.body.status = 'Draft';
    return submitStudentAssessment(req, res);
  } catch (error) {
    console.error('Error saving assessment draft:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save assessment draft',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Get feedback list for teacher (enhanced for intervention-based access)
 */
const getTeacherFeedback = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const status = req.query.status || '';
    const studentId = req.query.studentId || '';
    const interventionId = req.query.interventionId || '';

    // Verify teacher exists - try both user_id and direct id lookup
    let teacherCheck = await query(
      supabase
        .from('teachers')
        .select('id, name, employee_id, user_id')
        .eq('user_id', teacherId)
        .eq('is_active', true)
    );

    // If not found by user_id, try direct id lookup
    if (!teacherCheck.rows || teacherCheck.rows.length === 0) {
      teacherCheck = await query(
        supabase
          .from('teachers')
          .select('id, name, employee_id, user_id')
          .eq('id', teacherId)
          .eq('is_active', true)
      );
    }

    if (!teacherCheck.rows || teacherCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Teacher not found',
        timestamp: new Date().toISOString()
      });
    }

    const teacher = teacherCheck.rows[0];

    // Build feedback query
    let feedbackQuery = supabase
      .from('feedback')
      .select(`
        id,
        subject,
        message,
        category,
        priority,
        status,
        submitted_at,
        resolved_at,
        response,
        students:student_id(
          id,
          name,
          registration_no
        )
      `)
      .eq('teacher_id', teacher.id);

    // Apply filters
    if (status) {
      feedbackQuery = feedbackQuery.eq('status', status);
    }

    if (studentId) {
      feedbackQuery = feedbackQuery.eq('student_id', studentId);
    }

    // Get total count
    const countResult = await query(
      supabase
        .from('feedback')
        .select('*', { count: 'exact', head: true })
        .eq('teacher_id', teacherId)
    );

    const totalFeedback = countResult.count || 0;

    // Execute main query with pagination
    const result = await query(
      feedbackQuery
        .order('submitted_at', { ascending: false })
        .range(offset, offset + limit - 1)
    );

    const totalPages = Math.ceil(totalFeedback / limit);

    res.status(200).json({
      success: true,
      message: 'Teacher feedback retrieved successfully',
      data: {
        feedback: result.rows,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: totalFeedback,
          itemsPerPage: limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching teacher feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch teacher feedback',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Send feedback to student
 */
const sendFeedbackToStudent = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { studentId, subject, message, category, priority } = req.body;

    // Validate input
    if (!studentId || !subject || !message || !category || !priority) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: studentId, subject, message, category, priority',
        timestamp: new Date().toISOString()
      });
    }

    // Verify teacher exists - try both user_id and direct id lookup
    let teacherCheck = await query(
      supabase
        .from('teachers')
        .select('id, name, employee_id, user_id')
        .eq('user_id', teacherId)
        .eq('is_active', true)
    );

    // If not found by user_id, try direct id lookup
    if (!teacherCheck.rows || teacherCheck.rows.length === 0) {
      teacherCheck = await query(
        supabase
          .from('teachers')
          .select('id, name, employee_id, user_id')
          .eq('id', teacherId)
          .eq('is_active', true)
      );
    }

    if (!teacherCheck.rows || teacherCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Teacher not found',
        timestamp: new Date().toISOString()
      });
    }

    const teacher = teacherCheck.rows[0];

    // Verify teacher-student relationship (either traditional assignment or intervention enrollment)
    let hasAccess = false;

    // Check traditional teacher assignment
    const traditionalAssignmentCheck = await query(
      supabase
        .from('teacher_assignments')
        .select('id')
        .eq('teacher_id', teacher.id)
        .eq('student_id', studentId)
        .eq('is_active', true)
        .limit(1)
    );

    if (traditionalAssignmentCheck.rows && traditionalAssignmentCheck.rows.length > 0) {
      hasAccess = true;
    }

    // If no traditional assignment, check intervention access
    if (!hasAccess) {
      const teacherInterventionsResult = await query(
        supabase
          .from('teacher_microcompetency_assignments')
          .select('intervention_id')
          .eq('teacher_id', teacher.id)
          .eq('is_active', true)
      );

      const interventionIds = teacherInterventionsResult.rows.map(row => row.intervention_id);

      if (interventionIds.length > 0) {
        const studentInterventionCheck = await query(
          supabase
            .from('intervention_enrollments')
            .select('id')
            .eq('student_id', studentId)
            .in('intervention_id', interventionIds)
            .eq('enrollment_status', 'Enrolled')
            .limit(1)
        );

        if (studentInterventionCheck.rows && studentInterventionCheck.rows.length > 0) {
          hasAccess = true;
        }
      }
    }

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Student not accessible to this teacher',
        timestamp: new Date().toISOString()
      });
    }

    // Insert feedback
    const feedbackResult = await query(
      supabase
        .from('feedback')
        .insert({
          student_id: studentId,
          teacher_id: teacher.id,
          subject: subject,
          message: message,
          category: category,
          priority: priority,
          status: 'Submitted',
          submitted_at: new Date().toISOString()
        })
        .select('id, submitted_at')
    );

    if (!feedbackResult.rows || feedbackResult.rows.length === 0) {
      throw new Error('Failed to submit feedback');
    }

    const feedback = feedbackResult.rows[0];

    res.status(201).json({
      success: true,
      message: 'Feedback sent successfully',
      data: {
        feedbackId: feedback.id,
        submittedAt: feedback.submitted_at,
        status: 'submitted'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error sending feedback to student:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send feedback',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Get teacher reports
 */
const getTeacherReports = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { termId, reportType, format = 'json' } = req.query;

    // Get teacher details
    const teacherResult = await query(
      supabase
        .from('teachers')
        .select('id, name, employee_id, specialization, department, user_id')
        .eq('id', teacherId)
        .limit(1)
    );

    if (!teacherResult.rows || teacherResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found',
        timestamp: new Date().toISOString()
      });
    }

    const teacher = teacherResult.rows[0];

    // Get assigned students summary
    const studentsResult = await query(
      supabase
        .from('teacher_assignments')
        .select(`
          students:student_id(
            id,
            name,
            registration_no,
            overall_score,
            grade,
            status
          ),
          quadrant_id
        `)
        .eq('teacher_id', teacherId)
        .eq('is_active', true)
    );

    // Get assessment statistics
    const assessmentStats = await query(
      supabase
        .from('scores')
        .select('obtained_score, max_score, assessment_date, status')
        .eq('assessed_by', teacher.user_id)
    );

    // Calculate statistics
    const totalAssessments = assessmentStats.rows.length;
    const completedAssessments = assessmentStats.rows.filter(s => s.status === 'Submitted').length;
    const draftAssessments = assessmentStats.rows.filter(s => s.status === 'Draft').length;

    const averageScore = totalAssessments > 0
      ? assessmentStats.rows.reduce((sum, s) => sum + (s.obtained_score / s.max_score * 100), 0) / totalAssessments
      : 0;

    // Get feedback statistics
    const feedbackStats = await query(
      supabase
        .from('feedback')
        .select('status, submitted_at')
        .eq('teacher_id', teacherId)
    );

    const reportData = {
      teacher,
      summary: {
        totalStudents: studentsResult.rows.length,
        totalAssessments,
        completedAssessments,
        draftAssessments,
        averageScore: Math.round(averageScore * 100) / 100,
        totalFeedback: feedbackStats.rows.length
      },
      assignedStudents: studentsResult.rows.map(assignment => ({
        ...assignment.students,
        assignedQuadrantId: assignment.quadrant_id
      })),
      recentAssessments: assessmentStats.rows
        .sort((a, b) => new Date(b.assessment_date) - new Date(a.assessment_date))
        .slice(0, 10),
      feedbackSummary: {
        total: feedbackStats.rows.length,
        byStatus: feedbackStats.rows.reduce((acc, f) => {
          acc[f.status] = (acc[f.status] || 0) + 1;
          return acc;
        }, {})
      }
    };

    // Handle different formats
    if (format === 'pdf' || format === 'excel') {
      // For now, return JSON with a note about format
      // In a real implementation, you would generate PDF/Excel files
      return res.status(200).json({
        success: true,
        message: `Report data prepared for ${format} format`,
        data: reportData,
        note: `${format.toUpperCase()} generation would be implemented here`,
        timestamp: new Date().toISOString()
      });
    }

    res.status(200).json({
      success: true,
      message: 'Teacher report generated successfully',
      data: reportData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error generating teacher report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate teacher report',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// ==========================================
// ADMIN TEACHER MANAGEMENT FUNCTIONS
// ==========================================

/**
 * Get all teachers with pagination and filters
 */
const getAllTeachers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const department = req.query.department || '';
    const status = req.query.status || '';

    // Build teachers query
    let teachersQuery = supabase
      .from('teachers')
      .select(`
        id,
        employee_id,
        name,
        specialization,
        department,
        is_active,
        created_at,
        users:user_id(
          username,
          email,
          status
        )
      `)
      .neq('is_active', false);

    // Apply filters
    if (search) {
      teachersQuery = teachersQuery.or(`name.ilike.%${search}%,employee_id.ilike.%${search}%`);
    }

    if (department) {
      teachersQuery = teachersQuery.eq('department', department);
    }

    if (status) {
      teachersQuery = teachersQuery.eq('users.status', status);
    }

    // Get total count
    const countResult = await query(
      supabase
        .from('teachers')
        .select('*', { count: 'exact', head: true })
        .neq('is_active', false)
    );

    const totalTeachers = countResult.count || 0;

    // Execute main query with pagination
    const result = await query(
      teachersQuery
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)
    );

    const totalPages = Math.ceil(totalTeachers / limit);

    // Transform data
    const transformedData = result.rows.map(teacher => ({
      ...teacher,
      username: teacher.users?.username,
      email: teacher.users?.email,
      userStatus: teacher.users?.status
    }));

    res.status(200).json({
      success: true,
      message: 'Teachers retrieved successfully',
      data: transformedData,
      pagination: {
        currentPage: page,
        totalPages,
        totalTeachers,
        teachersPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      },
      filters: {
        search,
        department,
        status
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching teachers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve teachers',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Get teacher by ID with detailed information
 */
const getTeacherById = async (req, res) => {
  try {
    const { id } = req.params;

    // Get teacher with related data
    const teacherResult = await query(
      supabase
        .from('teachers')
        .select(`
          id,
          employee_id,
          name,
          specialization,
          department,
          is_active,
          created_at,
          updated_at,
          users:user_id(
            username,
            email,
            status,
            last_login
          )
        `)
        .eq('id', id)
        .limit(1)
    );

    if (!teacherResult.rows || teacherResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found',
        timestamp: new Date().toISOString()
      });
    }

    const teacher = teacherResult.rows[0];

    // Get assigned students count
    const studentsCount = await query(
      supabase
        .from('teacher_assignments')
        .select('*', { count: 'exact', head: true })
        .eq('teacher_id', id)
        .eq('is_active', true)
    );

    // Get assigned quadrant IDs
    const assignmentResult = await query(
      supabase
        .from('teacher_assignments')
        .select('quadrant_id, assigned_at')
        .eq('teacher_id', id)
        .eq('is_active', true)
        .not('quadrant_id', 'is', null)
    );

    // Get unique quadrant IDs with their assignment dates
    const quadrantMap = {};
    assignmentResult.rows.forEach(item => {
      if (!quadrantMap[item.quadrant_id]) {
        quadrantMap[item.quadrant_id] = item.assigned_at;
      }
    });

    // Get quadrant details
    let uniqueQuadrants = [];
    const quadrantIds = Object.keys(quadrantMap);
    if (quadrantIds.length > 0) {
      const quadrantsResult = await query(
        supabase
          .from('quadrants')
          .select('id, name, display_order')
          .in('id', quadrantIds)
          .order('display_order', { ascending: true })
      );

      uniqueQuadrants = quadrantsResult.rows.map(quadrant => ({
        ...quadrant,
        assigned_date: quadrantMap[quadrant.id]
      }));
    }

    // Get recent assessments
    const recentAssessments = await query(
      supabase
        .from('scores')
        .select(`
          id,
          obtained_score,
          max_score,
          assessment_date,
          students:student_id(name, registration_no),
          components:component_id(name)
        `)
        .eq('assessed_by', teacher.user_id)
        .order('assessment_date', { ascending: false })
        .limit(5)
    );

    // Transform teacher data
    const transformedTeacher = {
      ...teacher,
      username: teacher.users?.username,
      email: teacher.users?.email,
      userStatus: teacher.users?.status,
      lastLogin: teacher.users?.last_login,
      assignedStudentsCount: studentsCount.count || 0,
      assignedQuadrants: uniqueQuadrants,
      recentAssessments: recentAssessments.rows
    };

    res.status(200).json({
      success: true,
      message: 'Teacher details retrieved successfully',
      data: transformedTeacher,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching teacher details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve teacher details',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Create new teacher
 */
const createTeacher = async (req, res) => {
  try {
    const {
      username,
      email,
      password,
      employeeId,
      name,
      specialization,
      department
    } = req.body;

    // Validation
    if (!username || !email || !password || !employeeId || !name) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: username, email, password, employeeId, name',
        timestamp: new Date().toISOString()
      });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user first
    const userResult = await query(
      supabase
        .from('users')
        .insert({
          username,
          email,
          password_hash: hashedPassword,
          role: 'teacher',
          status: 'active'
        })
        .select('id')
    );

    if (!userResult.rows || userResult.rows.length === 0) {
      throw new Error('Failed to create user');
    }

    const userId = userResult.rows[0].id;

    // Create teacher record
    const teacherResult = await query(
      supabase
        .from('teachers')
        .insert({
          user_id: userId,
          employee_id: employeeId,
          name,
          specialization: specialization || null,
          department: department || null,
          is_active: true
        })
        .select('*')
    );

    if (!teacherResult.rows || teacherResult.rows.length === 0) {
      // Rollback user creation if teacher creation fails
      await query(
        supabase
          .from('users')
          .delete()
          .eq('id', userId)
      );
      throw new Error('Failed to create teacher record');
    }

    const teacher = teacherResult.rows[0];

    res.status(201).json({
      success: true,
      message: 'Teacher created successfully',
      data: teacher,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error creating teacher:', error);

    if (error.code === '23505') { // Unique violation
      return res.status(409).json({
        success: false,
        message: 'Teacher with this employee ID or email already exists',
        timestamp: new Date().toISOString()
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create teacher',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Update teacher information
 */
const updateTeacher = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, specialization, department, isActive } = req.body;

    // Build update object
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (specialization !== undefined) updateData.specialization = specialization;
    if (department !== undefined) updateData.department = department;
    if (isActive !== undefined) updateData.is_active = isActive;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update',
        timestamp: new Date().toISOString()
      });
    }

    updateData.updated_at = new Date().toISOString();

    // Update teacher
    const result = await query(
      supabase
        .from('teachers')
        .update(updateData)
        .eq('id', id)
        .select('*')
    );

    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found',
        timestamp: new Date().toISOString()
      });
    }

    res.status(200).json({
      success: true,
      message: 'Teacher updated successfully',
      data: result.rows[0],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating teacher:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update teacher',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Delete teacher (soft delete)
 */
const deleteTeacher = async (req, res) => {
  try {
    const { id } = req.params;

    // Soft delete by setting is_active to false
    const result = await query(
      supabase
        .from('teachers')
        .update({
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select('id, name')
    );

    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found',
        timestamp: new Date().toISOString()
      });
    }

    // Also deactivate teacher assignments
    await query(
      supabase
        .from('teacher_assignments')
        .update({ is_active: false })
        .eq('teacher_id', id)
    );

    res.status(200).json({
      success: true,
      message: 'Teacher deleted successfully',
      data: result.rows[0],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error deleting teacher:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete teacher',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Assign students to teacher
 */
const assignStudentsToTeacher = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { studentIds, quadrantIds, termId } = req.body;
    const assignedBy = req.user.userId; // Get from authenticated user

    // Validation
    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'studentIds array is required',
        timestamp: new Date().toISOString()
      });
    }

    // Verify teacher exists
    const teacherCheck = await query(
      supabase
        .from('teachers')
        .select('id, name')
        .eq('id', teacherId)
        .eq('is_active', true)
        .limit(1)
    );

    if (!teacherCheck.rows || teacherCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found or inactive',
        timestamp: new Date().toISOString()
      });
    }

    // Verify students exist
    const studentsCheck = await query(
      supabase
        .from('students')
        .select('id, name')
        .in('id', studentIds)
        .neq('status', 'Dropped')
    );

    if (!studentsCheck.rows || studentsCheck.rows.length !== studentIds.length) {
      return res.status(400).json({
        success: false,
        message: 'One or more students not found or inactive',
        timestamp: new Date().toISOString()
      });
    }

    // Create assignments
    const assignments = [];
    const currentDate = new Date().toISOString();

    for (const studentId of studentIds) {
      if (quadrantIds && quadrantIds.length > 0) {
        // Assign to specific quadrants
        for (const quadrantId of quadrantIds) {
          assignments.push({
            teacher_id: teacherId,
            student_id: studentId,
            quadrant_id: quadrantId,
            term_id: termId || null,
            assigned_at: currentDate,
            assigned_by: assignedBy,
            is_active: true
          });
        }
      } else {
        // General assignment (no specific quadrant)
        assignments.push({
          teacher_id: teacherId,
          student_id: studentId,
          quadrant_id: null,
          term_id: termId || null,
          assigned_at: currentDate,
          assigned_by: assignedBy,
          is_active: true
        });
      }
    }

    // Insert assignments
    const result = await query(
      supabase
        .from('teacher_assignments')
        .insert(assignments)
        .select('*')
    );

    if (!result.rows || result.rows.length === 0) {
      throw new Error('Failed to create assignments');
    }

    res.status(201).json({
      success: true,
      message: 'Students assigned to teacher successfully',
      data: {
        assignmentsCreated: result.rows.length,
        assignments: result.rows
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error assigning students to teacher:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign students to teacher',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Export all functions
module.exports = {
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
};
