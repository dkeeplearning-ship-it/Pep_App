const { supabase, query } = require('../config/supabase');

// ==========================================
// STUDENT INTERVENTION-CENTRIC FUNCTIONS
// ==========================================

// Get student's intervention-based scores with hierarchical breakdown
const getStudentInterventionScores = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { interventionId } = req.query;

    // Verify student exists
    const studentCheck = await query(
      supabase
        .from('students')
        .select('id, name, registration_no')
        .eq('id', studentId)
    );

    if (!studentCheck.rows || studentCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Student not found',
        timestamp: new Date().toISOString()
      });
    }

    // Build query for intervention scores
    let interventionsQuery = supabase
      .from('intervention_enrollments')
      .select(`
        intervention_id,
        enrollment_date,
        enrollment_status,
        interventions:intervention_id(
          id,
          name,
          description,
          start_date,
          end_date,
          status,
          term_id
        )
      `)
      .eq('student_id', studentId)
      .eq('enrollment_status', 'Enrolled');

    if (interventionId) {
      interventionsQuery = interventionsQuery.eq('intervention_id', interventionId);
    }

    const interventionsResult = await query(interventionsQuery);

    if (!interventionsResult.rows.length) {
      return res.status(200).json({
        success: true,
        message: 'No interventions found for student',
        data: {
          student: studentCheck.rows[0],
          interventions: []
        },
        timestamp: new Date().toISOString()
      });
    }

    // Get scores for each intervention using the calculated views
    const interventionScores = [];
    
    for (const enrollment of interventionsResult.rows) {
      const intervention = enrollment.interventions;
      
      // Get total intervention score (using term_id in unified system)
      const totalScoreResult = await query(
        supabase
          .from('student_intervention_scores')
          .select('*')
          .eq('student_id', studentId)
          .eq('term_id', intervention.term_id)
      );

      // Get quadrant scores (using term_id instead of intervention_id in unified system)
      const quadrantScoresResult = await query(
        supabase
          .from('student_quadrant_scores')
          .select('*')
          .eq('student_id', studentId)
          .eq('term_id', intervention.term_id)
          .order('quadrant_name', { ascending: true })
      );

      // Get competency scores (using term_id instead of intervention_id in unified system)
      const competencyScoresResult = await query(
        supabase
          .from('student_competency_scores')
          .select('*')
          .eq('student_id', studentId)
          .eq('term_id', intervention.term_id)
          .order('component_name', { ascending: true })
      );

      // Get microcompetency scores
      const microcompetencyScoresResult = await query(
        supabase
          .from('microcompetency_scores')
          .select(`
            id,
            obtained_score,
            max_score,
            percentage,
            feedback,
            status,
            scored_at,
            microcompetencies:microcompetency_id(
              id,
              name,
              description,
              components:component_id(
                id,
                name,
                sub_categories:sub_category_id(
                  id,
                  name,
                  quadrants:quadrant_id(id, name)
                )
              )
            ),
            teachers:scored_by(
              id,
              name,
              employee_id
            )
          `)
          .eq('student_id', studentId)
          .eq('term_id', intervention.term_id)
          .order('scored_at', { ascending: false })
      );

      interventionScores.push({
        intervention: intervention,
        enrollment: {
          enrollment_date: enrollment.enrollment_date,
          enrollment_status: enrollment.enrollment_status
        },
        scores: {
          total: totalScoreResult.rows[0] || null,
          quadrants: quadrantScoresResult.rows || [],
          competencies: competencyScoresResult.rows || [],
          microcompetencies: microcompetencyScoresResult.rows || []
        }
      });
    }

    res.status(200).json({
      success: true,
      message: 'Student intervention scores retrieved successfully',
      data: {
        student: studentCheck.rows[0],
        interventions: interventionScores
      },
      count: interventionScores.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Get student intervention scores error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve student intervention scores',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Get detailed hierarchical score breakdown for a specific intervention
const getInterventionScoreBreakdown = async (req, res) => {
  try {
    const { studentId, interventionId } = req.params;

    // Verify student and intervention
    const studentCheck = await query(
      supabase
        .from('students')
        .select('id, name, registration_no')
        .eq('id', studentId)
    );

    if (!studentCheck.rows || studentCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Student not found',
        timestamp: new Date().toISOString()
      });
    }

    const interventionCheck = await query(
      supabase
        .from('interventions')
        .select('id, name, description, start_date, end_date, status, term_id')
        .eq('id', interventionId)
    );

    if (!interventionCheck.rows || interventionCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Intervention not found',
        timestamp: new Date().toISOString()
      });
    }

    // Verify student is enrolled in intervention
    const enrollmentCheck = await query(
      supabase
        .from('intervention_enrollments')
        .select('enrollment_date, enrollment_status')
        .eq('student_id', studentId)
        .eq('intervention_id', interventionId)
        .eq('enrollment_status', 'Enrolled')
    );

    if (!enrollmentCheck.rows || enrollmentCheck.rows.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'Student not enrolled in this intervention',
        timestamp: new Date().toISOString()
      });
    }

    // Get microcompetency scores with full hierarchy
    const microcompetencyScoresResult = await query(
      supabase
        .from('microcompetency_scores')
        .select(`
          id,
          obtained_score,
          max_score,
          percentage,
          feedback,
          status,
          scored_at,
          microcompetencies:microcompetency_id(
            id,
            name,
            description,
            weightage,
            display_order,
            components:component_id(
              id,
              name,
              display_order,
              sub_categories:sub_category_id(
                id,
                name,
                display_order,
                quadrants:quadrant_id(
                  id,
                  name,
                  weightage,
                  display_order
                )
              )
            )
          ),

          teachers:scored_by(
            id,
            name,
            employee_id
          )
        `)
        .eq('student_id', studentId)
        .eq('intervention_id', interventionId)
    );

    // Get intervention microcompetency weightages separately
    const interventionMicrosResult = await query(
      supabase
        .from('intervention_microcompetencies')
        .select('microcompetency_id, weightage')
        .eq('intervention_id', interventionId)
        .eq('is_active', true)
    );

    // Create a map for quick lookup
    const interventionMicrosMap = interventionMicrosResult.rows.reduce((acc, item) => {
      acc[item.microcompetency_id] = item;
      return acc;
    }, {});

    // Build hierarchical structure
    const hierarchicalData = microcompetencyScoresResult.rows.reduce((acc, score) => {
      const micro = score.microcompetencies;
      const component = micro.components;
      const subCategory = component.sub_categories;
      const quadrant = subCategory.quadrants;

      if (!acc[quadrant.id]) {
        acc[quadrant.id] = {
          quadrant: {
            id: quadrant.id,
            name: quadrant.name,
            weightage: quadrant.weightage,
            display_order: quadrant.display_order
          },
          components: {},
          quadrant_total_obtained: 0,
          quadrant_total_max: 0
        };
      }

      if (!acc[quadrant.id].components[component.id]) {
        acc[quadrant.id].components[component.id] = {
          component: {
            id: component.id,
            name: component.name,
            display_order: component.display_order
          },
          microcompetencies: [],
          component_total_obtained: 0,
          component_total_max: 0
        };
      }

      const interventionWeightage = interventionMicrosMap[micro.id]?.weightage || 0;
      const weightedScore = score.obtained_score * interventionWeightage / 100;
      const weightedMaxScore = score.max_score * interventionWeightage / 100;

      acc[quadrant.id].components[component.id].microcompetencies.push({
        id: micro.id,
        name: micro.name,
        description: micro.description,
        component_weightage: micro.weightage,
        intervention_weightage: interventionWeightage,
        display_order: micro.display_order,
        score: {
          obtained_score: score.obtained_score,
          max_score: score.max_score,
          percentage: score.percentage,
          weighted_obtained: weightedScore,
          weighted_max: weightedMaxScore,
          feedback: score.feedback,
          status: score.status,
          scored_at: score.scored_at,
          scored_by: score.teachers
        }
      });

      acc[quadrant.id].components[component.id].component_total_obtained += weightedScore;
      acc[quadrant.id].components[component.id].component_total_max += weightedMaxScore;
      acc[quadrant.id].quadrant_total_obtained += weightedScore;
      acc[quadrant.id].quadrant_total_max += weightedMaxScore;

      return acc;
    }, {});

    // Convert to array and calculate percentages
    const formattedData = Object.values(hierarchicalData).map(quadrantData => {
      const components = Object.values(quadrantData.components).map(componentData => ({
        ...componentData,
        component_percentage: componentData.component_total_max > 0 
          ? (componentData.component_total_obtained / componentData.component_total_max) * 100 
          : 0
      }));

      return {
        ...quadrantData,
        components,
        quadrant_percentage: quadrantData.quadrant_total_max > 0 
          ? (quadrantData.quadrant_total_obtained / quadrantData.quadrant_total_max) * 100 
          : 0
      };
    });

    // Calculate overall intervention score
    const totalObtained = formattedData.reduce((sum, q) => sum + q.quadrant_total_obtained, 0);
    const totalMax = formattedData.reduce((sum, q) => sum + q.quadrant_total_max, 0);
    const overallPercentage = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;

    res.status(200).json({
      success: true,
      message: 'Intervention score breakdown retrieved successfully',
      data: {
        student: studentCheck.rows[0],
        intervention: interventionCheck.rows[0],
        enrollment: enrollmentCheck.rows[0],
        overall_score: {
          total_obtained: totalObtained,
          total_max: totalMax,
          percentage: overallPercentage,
          grade: calculateGradeFromPercentage(overallPercentage)
        },
        breakdown: formattedData
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Get intervention score breakdown error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve intervention score breakdown',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Helper function to calculate grade from percentage
const calculateGradeFromPercentage = (percentage) => {
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B';
  if (percentage >= 60) return 'C';
  if (percentage >= 50) return 'D';
  if (percentage >= 40) return 'E';
  return 'IC';
};

module.exports = {
  getStudentInterventionScores,
  getInterventionScoreBreakdown
};
