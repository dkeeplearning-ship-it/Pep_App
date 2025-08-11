const scoreCalculationService = require('../services/scoreCalculationService');
const { supabase, query } = require('../config/supabase');

// ==========================================
// SCORE CALCULATION API ENDPOINTS
// ==========================================

// Calculate and return competency scores for a student
const calculateCompetencyScores = async (req, res) => {
  try {
    const { studentId, interventionId } = req.params;

    // Verify student and intervention exist
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
        .select('id, name')
        .eq('id', interventionId)
    );

    if (!interventionCheck.rows || interventionCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Intervention not found',
        timestamp: new Date().toISOString()
      });
    }

    // Calculate competency scores
    const competencyScores = await scoreCalculationService.calculateCompetencyScores(
      studentId, 
      interventionId
    );

    res.status(200).json({
      success: true,
      message: 'Competency scores calculated successfully',
      data: {
        student: studentCheck.rows[0],
        intervention: interventionCheck.rows[0],
        ...competencyScores
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Calculate competency scores API error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate competency scores',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Calculate and return quadrant scores for a student
const calculateQuadrantScores = async (req, res) => {
  try {
    const { studentId, interventionId } = req.params;

    // Verify student and intervention exist
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
        .select('id, name')
        .eq('id', interventionId)
    );

    if (!interventionCheck.rows || interventionCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Intervention not found',
        timestamp: new Date().toISOString()
      });
    }

    // Calculate quadrant scores
    const quadrantScores = await scoreCalculationService.calculateQuadrantScores(
      studentId, 
      interventionId
    );

    res.status(200).json({
      success: true,
      message: 'Quadrant scores calculated successfully',
      data: {
        student: studentCheck.rows[0],
        intervention: interventionCheck.rows[0],
        ...quadrantScores
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Calculate quadrant scores API error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate quadrant scores',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Calculate and return overall intervention score for a student
const calculateInterventionScore = async (req, res) => {
  try {
    const { studentId, interventionId } = req.params;

    // Verify student and intervention exist
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
        .select('id, name')
        .eq('id', interventionId)
    );

    if (!interventionCheck.rows || interventionCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Intervention not found',
        timestamp: new Date().toISOString()
      });
    }

    // Calculate intervention score
    const interventionScore = await scoreCalculationService.calculateInterventionScore(
      studentId, 
      interventionId
    );

    res.status(200).json({
      success: true,
      message: 'Intervention score calculated successfully',
      data: {
        student: studentCheck.rows[0],
        intervention: interventionCheck.rows[0],
        ...interventionScore
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Calculate intervention score API error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate intervention score',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Recalculate all scores for a student in an intervention
const recalculateAllScores = async (req, res) => {
  try {
    const { studentId, interventionId } = req.params;

    // Verify student and intervention exist
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
        .select('id, name')
        .eq('id', interventionId)
    );

    if (!interventionCheck.rows || interventionCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Intervention not found',
        timestamp: new Date().toISOString()
      });
    }

    // Recalculate all scores
    const allScores = await scoreCalculationService.recalculateAllScores(
      studentId, 
      interventionId
    );

    res.status(200).json({
      success: true,
      message: 'All scores recalculated successfully',
      data: {
        student: studentCheck.rows[0],
        intervention: interventionCheck.rows[0],
        ...allScores
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Recalculate all scores API error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to recalculate scores',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Get intervention statistics
const getInterventionStatistics = async (req, res) => {
  try {
    const { interventionId } = req.params;

    // Verify intervention exists
    const interventionCheck = await query(
      supabase
        .from('interventions')
        .select('id, name, description, status')
        .eq('id', interventionId)
    );

    if (!interventionCheck.rows || interventionCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Intervention not found',
        timestamp: new Date().toISOString()
      });
    }

    // Get intervention statistics
    const statistics = await scoreCalculationService.getInterventionStatistics(interventionId);

    res.status(200).json({
      success: true,
      message: 'Intervention statistics retrieved successfully',
      data: {
        intervention: interventionCheck.rows[0],
        ...statistics
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Get intervention statistics API error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get intervention statistics',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Trigger score recalculation for all students in an intervention
const recalculateInterventionScores = async (req, res) => {
  try {
    const { interventionId } = req.params;

    // Verify intervention exists
    const interventionCheck = await query(
      supabase
        .from('interventions')
        .select('id, name')
        .eq('id', interventionId)
    );

    if (!interventionCheck.rows || interventionCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Intervention not found',
        timestamp: new Date().toISOString()
      });
    }

    // Get all enrolled students
    const enrolledStudents = await query(
      supabase
        .from('intervention_enrollments')
        .select('student_id, students:student_id(name, registration_no)')
        .eq('intervention_id', interventionId)
        .eq('enrollment_status', 'Enrolled')
    );

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    // Recalculate scores for each student
    for (const enrollment of enrolledStudents.rows) {
      try {
        const studentScores = await scoreCalculationService.recalculateAllScores(
          enrollment.student_id,
          interventionId
        );
        
        results.push({
          student_id: enrollment.student_id,
          student_name: enrollment.students.name,
          status: 'success',
          scores: studentScores.scores
        });
        successCount++;
      } catch (error) {
        results.push({
          student_id: enrollment.student_id,
          student_name: enrollment.students.name,
          status: 'error',
          error: error.message
        });
        errorCount++;
      }
    }

    res.status(200).json({
      success: true,
      message: `Score recalculation completed. ${successCount} successful, ${errorCount} errors.`,
      data: {
        intervention: interventionCheck.rows[0],
        summary: {
          total_students: enrolledStudents.rows.length,
          successful: successCount,
          errors: errorCount
        },
        results: results
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Recalculate intervention scores API error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to recalculate intervention scores',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

module.exports = {
  calculateCompetencyScores,
  calculateQuadrantScores,
  calculateInterventionScore,
  recalculateAllScores,
  getInterventionStatistics,
  recalculateInterventionScores
};
