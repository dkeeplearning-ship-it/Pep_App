const { supabase, query } = require('../config/supabase');

// ==========================================
// TEACHER MICROCOMPETENCY MANAGEMENT
// ==========================================

// Get teacher's assigned interventions with microcompetencies
const getTeacherInterventions = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { status, includeCompleted = false } = req.query;

    // Verify teacher exists - try both user_id and direct id lookup
    let teacherCheck = await query(
      supabase
        .from('teachers')
        .select('id, name, employee_id, user_id')
        .eq('user_id', teacherId)
        .eq('is_active', true)
    );

    // If not found by user_id, try direct id lookup (for backward compatibility)
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

    // Get teacher's assigned interventions through microcompetency assignments
    let interventionsQuery = supabase
      .from('teacher_microcompetency_assignments')
      .select(`
        intervention_id,
        interventions:intervention_id(
          id,
          name,
          description,
          start_date,
          end_date,
          status,
          scoring_deadline,
          is_scoring_open,
          created_at
        )
      `)
      .eq('teacher_id', teacher.id)
      .eq('is_active', true);

    if (status) {
      interventionsQuery = interventionsQuery.eq('interventions.status', status);
    }

    if (!includeCompleted) {
      interventionsQuery = interventionsQuery.neq('interventions.status', 'Completed');
    }

    const result = await query(interventionsQuery);

    // Remove duplicates and format data
    const uniqueInterventions = {};
    result.rows.forEach(row => {
      const intervention = row.interventions;
      if (intervention && !uniqueInterventions[intervention.id]) {
        uniqueInterventions[intervention.id] = intervention;
      }
    });

    // Get microcompetency counts for each intervention
    const interventionIds = Object.keys(uniqueInterventions);
    if (interventionIds.length > 0) {
      const microcompetencyCounts = await query(
        supabase
          .from('teacher_microcompetency_assignments')
          .select('intervention_id, microcompetency_id')
          .eq('teacher_id', teacherId)
          .in('intervention_id', interventionIds)
          .eq('is_active', true)
      );

      // Add counts to interventions
      const countsByIntervention = microcompetencyCounts.rows.reduce((acc, row) => {
        acc[row.intervention_id] = (acc[row.intervention_id] || 0) + 1;
        return acc;
      }, {});

      Object.values(uniqueInterventions).forEach(intervention => {
        intervention.assigned_microcompetencies_count = countsByIntervention[intervention.id] || 0;
      });
    }

    res.status(200).json({
      success: true,
      message: 'Teacher interventions retrieved successfully',
      data: {
        teacher: teacherCheck.rows[0],
        interventions: Object.values(uniqueInterventions)
      },
      count: Object.keys(uniqueInterventions).length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Get teacher interventions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve teacher interventions',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Get teacher's assigned microcompetencies for a specific intervention
const getTeacherMicrocompetencies = async (req, res) => {
  try {
    const { teacherId, interventionId } = req.params;

    // Verify teacher exists - try both user_id and direct id lookup
    let teacherCheck = await query(
      supabase
        .from('teachers')
        .select('id, name, employee_id, user_id')
        .eq('user_id', teacherId)
        .eq('is_active', true)
    );

    // If not found by user_id, try direct id lookup (for backward compatibility)
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

    const interventionCheck = await query(
      supabase
        .from('interventions')
        .select('id, name, status, scoring_deadline, is_scoring_open')
        .eq('id', interventionId)
    );

    if (!interventionCheck.rows || interventionCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Intervention not found',
        timestamp: new Date().toISOString()
      });
    }

    const intervention = interventionCheck.rows[0];

    // Get teacher's assigned microcompetencies for this intervention
    const result = await query(
      supabase
        .from('teacher_microcompetency_assignments')
        .select(`
          id,
          can_score,
          can_create_tasks,
          assigned_at,
          microcompetencies:microcompetency_id(
            id,
            name,
            description,
            weightage,
            max_score,
            display_order,
            components:component_id(
              id,
              name,
              sub_categories:sub_category_id(
                id,
                name,
                quadrants:quadrant_id(id, name, display_order)
              )
            )
          )
        `)
        .eq('teacher_id', teacher.id)
        .eq('intervention_id', interventionId)
        .eq('is_active', true)
    );

    // Get intervention microcompetency data separately
    const interventionMicrosResult = await query(
      supabase
        .from('intervention_microcompetencies')
        .select('microcompetency_id, weightage, max_score')
        .eq('intervention_id', interventionId)
        .eq('is_active', true)
    );

    // Create a map for quick lookup
    const interventionMicrosMap = interventionMicrosResult.rows.reduce((acc, item) => {
      acc[item.microcompetency_id] = item;
      return acc;
    }, {});

    // Group by quadrant and component
    const groupedData = result.rows.reduce((acc, item) => {
      const micro = item.microcompetencies;
      const quadrant = micro.components.sub_categories.quadrants;
      const component = micro.components;
      
      if (!acc[quadrant.id]) {
        acc[quadrant.id] = {
          quadrant: quadrant,
          components: {}
        };
      }
      
      if (!acc[quadrant.id].components[component.id]) {
        acc[quadrant.id].components[component.id] = {
          component: component,
          microcompetencies: []
        };
      }
      
      acc[quadrant.id].components[component.id].microcompetencies.push({
        assignment_id: item.id,
        microcompetency: {
          id: micro.id,
          name: micro.name,
          description: micro.description,
          component_weightage: micro.weightage,
          intervention_weightage: interventionMicrosMap[micro.id]?.weightage || 0,
          max_score: interventionMicrosMap[micro.id]?.max_score || 10,
          display_order: micro.display_order
        },
        permissions: {
          can_score: item.can_score,
          can_create_tasks: item.can_create_tasks
        },
        assigned_at: item.assigned_at
      });
      
      return acc;
    }, {});

    // Convert to array format
    const formattedData = Object.values(groupedData).map(quadrantData => ({
      quadrant: quadrantData.quadrant,
      components: Object.values(quadrantData.components)
    }));

    // Also create a flattened array for frontend compatibility
    const flattenedMicrocompetencies = [];
    formattedData.forEach(quadrantData => {
      quadrantData.components.forEach(componentData => {
        componentData.microcompetencies.forEach(mcData => {
          flattenedMicrocompetencies.push({
            id: mcData.assignment_id,
            intervention_id: interventionId,
            microcompetency_id: mcData.microcompetency.id,
            weightage: mcData.microcompetency.intervention_weightage,
            max_score: mcData.microcompetency.max_score,
            is_active: true,
            created_at: mcData.assigned_at,
            microcompetencies: {
              id: mcData.microcompetency.id,
              name: mcData.microcompetency.name,
              description: mcData.microcompetency.description,
              weightage: mcData.microcompetency.component_weightage,
              max_score: mcData.microcompetency.max_score,
              display_order: mcData.microcompetency.display_order
            },
            quadrant: {
              id: quadrantData.quadrant.id,
              name: quadrantData.quadrant.name
            },
            permissions: mcData.permissions,
            assigned_at: mcData.assigned_at
          });
        });
      });
    });

    res.status(200).json({
      success: true,
      message: 'Teacher microcompetencies retrieved successfully',
      data: {
        teacher: teacher,
        intervention: intervention,
        microcompetencies: flattenedMicrocompetencies,
        structured_microcompetencies: formattedData
      },
      count: result.rowCount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Get teacher microcompetencies error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve teacher microcompetencies',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Get students assigned to teacher for scoring in a specific intervention
const getStudentsForScoring = async (req, res) => {
  try {
    const { teacherId, interventionId } = req.params;
    const { microcompetencyId } = req.query;

    // Verify teacher exists - try both user_id and direct id lookup
    let teacherCheck = await query(
      supabase
        .from('teachers')
        .select('id, name, employee_id, user_id')
        .eq('user_id', teacherId)
        .eq('is_active', true)
    );

    // If not found by user_id, try direct id lookup (for backward compatibility)
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

    // Verify teacher has access to this intervention
    const accessCheck = await query(
      supabase
        .from('teacher_microcompetency_assignments')
        .select('id, can_score')
        .eq('teacher_id', teacher.id)
        .eq('intervention_id', interventionId)
        .eq('is_active', true)
        .limit(1)
    );

    if (!accessCheck.rows || accessCheck.rows.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'Teacher not assigned to this intervention',
        timestamp: new Date().toISOString()
      });
    }

    // Get enrolled students for this intervention
    let studentsQuery = supabase
      .from('intervention_enrollments')
      .select(`
        student_id,
        enrollment_date,
        enrollment_status,
        students:student_id(
          id,
          name,
          registration_no
        )
      `)
      .eq('intervention_id', interventionId)
      .eq('enrollment_status', 'Enrolled');

    const studentsResult = await query(studentsQuery);

    // Get existing scores for all microcompetencies this teacher can score
    let scoresData = {};

    if (microcompetencyId) {
      // If specific microcompetency is requested, verify teacher can score it
      const microcompetencyAccessCheck = await query(
        supabase
          .from('teacher_microcompetency_assignments')
          .select('id, can_score')
          .eq('teacher_id', teacher.id)
          .eq('intervention_id', interventionId)
          .eq('microcompetency_id', microcompetencyId)
          .eq('can_score', true)
          .eq('is_active', true)
      );

      if (!microcompetencyAccessCheck.rows || microcompetencyAccessCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          error: 'Teacher not authorized to score this microcompetency',
          timestamp: new Date().toISOString()
        });
      }

      // Get existing scores for this specific microcompetency
      const scoresResult = await query(
        supabase
          .from('microcompetency_scores')
          .select(`
            student_id,
            microcompetency_id,
            obtained_score,
            max_score,
            percentage,
            feedback,
            status,
            scored_at
          `)
          .eq('intervention_id', interventionId)
          .eq('microcompetency_id', microcompetencyId)
          .eq('scored_by', teacher.id)
      );

      scoresData = scoresResult.rows.reduce((acc, score) => {
        acc[score.student_id] = score;
        return acc;
      }, {});
    } else {
      // Get all scores for all microcompetencies this teacher can score in this intervention
      const scoresResult = await query(
        supabase
          .from('microcompetency_scores')
          .select(`
            student_id,
            microcompetency_id,
            obtained_score,
            max_score,
            percentage,
            feedback,
            status,
            scored_at
          `)
          .eq('intervention_id', interventionId)
          .eq('scored_by', teacher.id)
      );

      // Group scores by student_id for easy lookup
      scoresData = scoresResult.rows.reduce((acc, score) => {
        if (!acc[score.student_id]) {
          acc[score.student_id] = [];
        }
        acc[score.student_id].push(score);
        return acc;
      }, {});
    }

    // Format student data with scores if available (flattened for frontend compatibility)
    const studentsWithScores = studentsResult.rows.map(enrollment => {
      const student = enrollment.students;
      const studentScores = scoresData[student.id];

      // Handle different score structures based on whether microcompetencyId was specified
      let scoreData = null;
      if (studentScores) {
        if (microcompetencyId) {
          // Single score object for specific microcompetency
          scoreData = studentScores;
        } else {
          // Array of scores for all microcompetencies - use the first one or aggregate
          scoreData = Array.isArray(studentScores) ? studentScores[0] : studentScores;
        }
      }

      return {
        id: student.id,
        name: student.name,
        registration_no: student.registration_no,
        enrollment_status: enrollment.enrollment_status,
        enrolled_at: enrollment.enrollment_date,
        completion_percentage: 0, // TODO: Calculate actual completion percentage
        score: scoreData || null,
        scores: Array.isArray(studentScores) ? studentScores : (studentScores ? [studentScores] : [])
      };
    });

    res.status(200).json({
      success: true,
      message: 'Students for scoring retrieved successfully',
      data: {
        intervention_id: interventionId,
        microcompetency_id: microcompetencyId || null,
        students: studentsWithScores
      },
      count: studentsWithScores.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Get students for scoring error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve students for scoring',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Score student on microcompetency
const scoreStudentMicrocompetency = async (req, res) => {
  try {
    const { teacherId, interventionId, studentId, microcompetencyId } = req.params;
    const { obtained_score, feedback, status = 'Submitted' } = req.body;

    // Validate required fields
    if (obtained_score === undefined || obtained_score === null) {
      return res.status(400).json({
        success: false,
        error: 'Obtained score is required',
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

    // If not found by user_id, try direct id lookup (for backward compatibility)
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

    // Verify teacher can score this microcompetency
    const accessCheck = await query(
      supabase
        .from('teacher_microcompetency_assignments')
        .select('id, can_score')
        .eq('teacher_id', teacher.id)
        .eq('intervention_id', interventionId)
        .eq('microcompetency_id', microcompetencyId)
        .eq('can_score', true)
        .eq('is_active', true)
        .limit(1)
    );

    if (!accessCheck.rows || accessCheck.rows.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'Teacher not authorized to score this microcompetency',
        timestamp: new Date().toISOString()
      });
    }

    // Get max score from intervention microcompetencies
    const interventionMicroResult = await query(
      supabase
        .from('intervention_microcompetencies')
        .select('max_score')
        .eq('intervention_id', interventionId)
        .eq('microcompetency_id', microcompetencyId)
        .eq('is_active', true)
        .limit(1)
    );

    const maxScore = (interventionMicroResult.rows && interventionMicroResult.rows.length > 0)
      ? interventionMicroResult.rows[0].max_score
      : 10;

    // Validate score range
    if (obtained_score < 0 || obtained_score > maxScore) {
      return res.status(400).json({
        success: false,
        error: `Score must be between 0 and ${maxScore}`,
        timestamp: new Date().toISOString()
      });
    }

    // Verify student is enrolled in intervention
    const enrollmentCheck = await query(
      supabase
        .from('intervention_enrollments')
        .select('id')
        .eq('intervention_id', interventionId)
        .eq('student_id', studentId)
        .eq('enrollment_status', 'Enrolled')
        .limit(1)
    );

    if (!enrollmentCheck.rows || enrollmentCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Student not enrolled in this intervention',
        timestamp: new Date().toISOString()
      });
    }

    // Check if intervention scoring is open
    const interventionCheck = await query(
      supabase
        .from('interventions')
        .select('is_scoring_open, scoring_deadline, term_id')
        .eq('id', interventionId)
        .limit(1)
    );

    if (!interventionCheck.rows || interventionCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Intervention not found',
        timestamp: new Date().toISOString()
      });
    }

    const intervention = interventionCheck.rows[0];
    if (!intervention.is_scoring_open) {
      return res.status(400).json({
        success: false,
        error: 'Scoring is not open for this intervention',
        timestamp: new Date().toISOString()
      });
    }

    // Check scoring deadline
    if (intervention.scoring_deadline && new Date() > new Date(intervention.scoring_deadline)) {
      return res.status(400).json({
        success: false,
        error: 'Scoring deadline has passed',
        timestamp: new Date().toISOString()
      });
    }

    // Insert or update score
    const scoreData = {
      student_id: studentId,
      intervention_id: interventionId,
      microcompetency_id: microcompetencyId,
      obtained_score: parseFloat(obtained_score),
      max_score: parseFloat(maxScore),
      scored_by: teacher.id,
      feedback: feedback || null,
      status: status,
      term_id: intervention.term_id
    };

    const result = await query(
      supabase
        .from('microcompetency_scores')
        .upsert(scoreData, {
          onConflict: 'student_id,intervention_id,microcompetency_id'
        })
        .select(`
          id,
          obtained_score,
          max_score,
          percentage,
          feedback,
          status,
          scored_at,
          students:student_id(
            id,
            name,
            registration_no
          ),
          microcompetencies:microcompetency_id(
            id,
            name
          )
        `)
    );

    res.status(200).json({
      success: true,
      message: 'Student scored successfully',
      data: result.rows && result.rows.length > 0 ? result.rows[0] : null,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Score student microcompetency error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to score student',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Batch score multiple students on a microcompetency
const batchScoreStudents = async (req, res) => {
  try {
    const { teacherId, interventionId, microcompetencyId } = req.params;
    const { scores } = req.body;

    // Validate input
    if (!scores || !Array.isArray(scores) || scores.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Scores array is required and must not be empty',
        timestamp: new Date().toISOString()
      });
    }

    // Verify teacher can score this microcompetency
    const accessCheck = await query(
      supabase
        .from('teacher_microcompetency_assignments')
        .select('id, can_score')
        .eq('teacher_id', teacherId)
        .eq('intervention_id', interventionId)
        .eq('microcompetency_id', microcompetencyId)
        .eq('can_score', true)
        .eq('is_active', true)
        .limit(1)
    );

    if (!accessCheck.rows || accessCheck.rows.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'Teacher not authorized to score this microcompetency',
        timestamp: new Date().toISOString()
      });
    }

    // Get max score from intervention microcompetencies
    const interventionMicroResult = await query(
      supabase
        .from('intervention_microcompetencies')
        .select('max_score')
        .eq('intervention_id', interventionId)
        .eq('microcompetency_id', microcompetencyId)
        .eq('is_active', true)
        .limit(1)
    );

    const maxScore = (interventionMicroResult.rows && interventionMicroResult.rows.length > 0)
      ? interventionMicroResult.rows[0].max_score
      : 10;

    // Validate all scores
    for (const score of scores) {
      if (!score.student_id || score.obtained_score === undefined) {
        return res.status(400).json({
          success: false,
          error: 'Each score must have student_id and obtained_score',
          timestamp: new Date().toISOString()
        });
      }

      if (score.obtained_score < 0 || score.obtained_score > maxScore) {
        return res.status(400).json({
          success: false,
          error: `All scores must be between 0 and ${maxScore}`,
          timestamp: new Date().toISOString()
        });
      }
    }

    // Check intervention scoring status
    const interventionCheck = await query(
      supabase
        .from('interventions')
        .select('is_scoring_open, scoring_deadline, term_id')
        .eq('id', interventionId)
        .limit(1)
    );

    if (!interventionCheck.rows || interventionCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Intervention not found',
        timestamp: new Date().toISOString()
      });
    }

    const intervention = interventionCheck.rows[0];
    if (!intervention.is_scoring_open) {
      return res.status(400).json({
        success: false,
        error: 'Scoring is not open for this intervention',
        timestamp: new Date().toISOString()
      });
    }

    if (intervention.scoring_deadline && new Date() > new Date(intervention.scoring_deadline)) {
      return res.status(400).json({
        success: false,
        error: 'Scoring deadline has passed',
        timestamp: new Date().toISOString()
      });
    }

    // Prepare batch score data
    const scoreData = scores.map(score => ({
      student_id: score.student_id,
      intervention_id: interventionId,
      microcompetency_id: microcompetencyId,
      obtained_score: parseFloat(score.obtained_score),
      max_score: parseFloat(maxScore),
      scored_by: teacherId,
      feedback: score.feedback || null,
      status: score.status || 'Submitted',
      term_id: intervention.term_id
    }));

    // Insert/update scores
    const result = await query(
      supabase
        .from('microcompetency_scores')
        .upsert(scoreData, {
          onConflict: 'student_id,intervention_id,microcompetency_id'
        })
        .select(`
          id,
          obtained_score,
          max_score,
          percentage,
          feedback,
          status,
          scored_at,
          students:student_id(
            id,
            name,
            registration_no
          )
        `)
    );

    res.status(200).json({
      success: true,
      message: `${result.rows.length} students scored successfully`,
      data: {
        intervention_id: interventionId,
        microcompetency_id: microcompetencyId,
        scores: result.rows
      },
      count: result.rows.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Batch score students error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to batch score students',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Get all teacher's assigned microcompetencies across all interventions
const getAllTeacherMicrocompetencies = async (req, res) => {
  try {
    const { teacherId } = req.params;

    // Verify teacher exists - try both user_id and direct id lookup
    let teacherCheck = await query(
      supabase
        .from('teachers')
        .select('id, name, employee_id, user_id')
        .eq('user_id', teacherId)
        .eq('is_active', true)
    );

    // If not found by user_id, try direct id lookup (for backward compatibility)
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

    // Get all teacher's assigned microcompetencies across all interventions
    const result = await query(
      supabase
        .from('teacher_microcompetency_assignments')
        .select(`
          id,
          can_score,
          can_create_tasks,
          assigned_at,
          interventions:intervention_id(
            id,
            name,
            description,
            status,
            start_date,
            end_date,
            is_scoring_open,
            scoring_deadline
          ),
          microcompetencies:microcompetency_id(
            id,
            name,
            description,
            weightage,
            max_score,
            display_order,
            components:component_id(
              id,
              name,
              sub_categories:sub_category_id(
                id,
                name,
                quadrants:quadrant_id(id, name, display_order)
              )
            )
          )
        `)
        .eq('teacher_id', teacher.id)
        .eq('is_active', true)
        .order('assigned_at', { ascending: false })
    );

    // Transform the data to match the expected format
    const microcompetencies = result.rows.map(assignment => {
      const micro = assignment.microcompetencies;
      const component = micro.components;
      const subCategory = component.sub_categories;
      const quadrant = subCategory.quadrants;
      const intervention = assignment.interventions;

      return {
        id: micro.id,
        name: micro.name,
        description: micro.description,
        maxScore: micro.max_score,
        component: component.name,
        subCategory: subCategory.name,
        quadrant: quadrant.name,
        canScore: assignment.can_score,
        canCreateTasks: assignment.can_create_tasks,
        assignedAt: assignment.assigned_at,
        intervention: {
          id: intervention.id,
          name: intervention.name,
          status: intervention.status,
          startDate: intervention.start_date,
          endDate: intervention.end_date,
          isScoringOpen: intervention.is_scoring_open,
          scoringDeadline: intervention.scoring_deadline
        },
        // TODO: Add scoring stats and task stats
        scoringStats: {
          totalStudents: 0,
          scoredStudents: 0,
          averageScore: 0,
          completionPercentage: 0
        },
        taskStats: {
          totalTasks: 0,
          activeTasks: 0,
          completedTasks: 0
        }
      };
    });

    res.status(200).json({
      success: true,
      message: 'Teacher microcompetencies retrieved successfully',
      data: {
        teacher_id: teacherId,
        microcompetencies: microcompetencies,
        total_count: microcompetencies.length
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Get all teacher microcompetencies error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get teacher microcompetencies',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

module.exports = {
  getTeacherInterventions,
  getTeacherMicrocompetencies,
  getAllTeacherMicrocompetencies,
  getStudentsForScoring,
  scoreStudentMicrocompetency,
  batchScoreStudents
};
