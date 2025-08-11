const shlCompetencyService = require('../services/shlCompetencyService');
const { supabase, query } = require('../config/supabase');

/**
 * SHL Competency Controller
 * 
 * Handles API endpoints for the 7-core competency assessment system
 */

/**
 * Get all SHL competency components
 * @route GET /api/v1/shl-competencies/components
 * @access Teachers, Admins
 */
const getSHLCompetencyComponents = async (req, res) => {
  try {
    const components = await shlCompetencyService.getSHLCompetencyComponents();

    res.status(200).json({
      success: true,
      message: 'SHL competency components retrieved successfully',
      data: {
        components: components,
        count: components.length
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Get SHL competency components API error:', error);
    res.status(500).json({
      success: false,
      error: 'SHL_COMPONENTS_FETCH_FAILED',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Calculate SHL competency scores for a student
 * @route POST /api/v1/shl-competencies/students/:studentId/calculate
 * @access Teachers, Admins
 * @body { termId: string }
 */
const calculateStudentSHLScores = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { termId } = req.body;

    if (!termId) {
      return res.status(400).json({
        success: false,
        error: 'TERM_ID_REQUIRED',
        message: 'Term ID is required for SHL competency calculation',
        timestamp: new Date().toISOString()
      });
    }

    // Verify student exists
    const studentResult = await query(
      supabase
        .from('students')
        .select('id, name, registration_no')
        .eq('id', studentId)
        .limit(1)
    );

    if (!studentResult.rows || studentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'STUDENT_NOT_FOUND',
        message: 'Student not found',
        timestamp: new Date().toISOString()
      });
    }

    // Verify term exists
    const termResult = await query(
      supabase
        .from('terms')
        .select('id, name, academic_year')
        .eq('id', termId)
        .limit(1)
    );

    if (!termResult.rows || termResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'TERM_NOT_FOUND',
        message: 'Term not found',
        timestamp: new Date().toISOString()
      });
    }

    // Calculate SHL competency scores
    const shlResults = await shlCompetencyService.calculateSHLCompetencyScores(studentId, termId);

    res.status(200).json({
      success: true,
      message: 'SHL competency scores calculated successfully',
      data: {
        student: studentResult.rows[0],
        term: termResult.rows[0],
        shlAssessment: shlResults
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Calculate student SHL scores API error:', error);
    res.status(500).json({
      success: false,
      error: 'SHL_CALCULATION_FAILED',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Get SHL competency summary for a student
 * @route GET /api/v1/shl-competencies/students/:studentId/summary
 * @access Students (own data), Teachers, Admins
 * @query termId: string
 */
const getStudentSHLSummary = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { termId } = req.query;

    if (!termId) {
      return res.status(400).json({
        success: false,
        error: 'TERM_ID_REQUIRED',
        message: 'Term ID is required as query parameter',
        timestamp: new Date().toISOString()
      });
    }

    // Authorization check: students can only access their own data
    if (req.user.role === 'student' && req.user.userId !== studentId) {
      return res.status(403).json({
        success: false,
        error: 'ACCESS_DENIED',
        message: 'Students can only access their own SHL competency data',
        timestamp: new Date().toISOString()
      });
    }

    // Get SHL competency summary
    const shlSummary = await shlCompetencyService.getSHLCompetencySummary(studentId, termId);

    res.status(200).json({
      success: true,
      message: 'SHL competency summary retrieved successfully',
      data: shlSummary,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Get student SHL summary API error:', error);
    res.status(500).json({
      success: false,
      error: 'SHL_SUMMARY_FETCH_FAILED',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Submit SHL competency score for a student
 * @route POST /api/v1/shl-competencies/students/:studentId/components/:componentId/score
 * @access Teachers, Admins
 * @body { obtainedScore: number, maxScore: number, termId: string, notes?: string }
 */
const submitSHLCompetencyScore = async (req, res) => {
  try {
    const { studentId, componentId } = req.params;
    const { obtainedScore, maxScore, termId, notes } = req.body;

    // Validation
    if (obtainedScore === undefined || !maxScore || !termId) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_REQUIRED_FIELDS',
        message: 'Missing required fields: obtainedScore, maxScore, termId',
        timestamp: new Date().toISOString()
      });
    }

    if (obtainedScore < 0 || obtainedScore > maxScore) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_SCORE_RANGE',
        message: 'Obtained score must be between 0 and max score',
        timestamp: new Date().toISOString()
      });
    }

    // Verify component is an SHL competency
    const componentResult = await query(
      supabase
        .from('components')
        .select('id, name, category, max_score')
        .eq('id', componentId)
        .eq('category', 'SHL')
        .eq('is_active', true)
        .limit(1)
    );

    if (!componentResult.rows || componentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'SHL_COMPONENT_NOT_FOUND',
        message: 'SHL competency component not found',
        timestamp: new Date().toISOString()
      });
    }

    // Calculate percentage
    const percentage = (obtainedScore / maxScore) * 100;

    // Insert or update the score
    const scoreData = {
      student_id: studentId,
      component_id: componentId,
      obtained_score: obtainedScore,
      max_score: maxScore,
      percentage: percentage,
      term_id: termId,
      notes: notes || null,
      assessed_by: req.user.userId,
      assessment_date: new Date().toISOString()
    };

    const scoreResult = await query(
      supabase
        .from('scores')
        .upsert(scoreData, { 
          onConflict: 'student_id,component_id,term_id',
          returning: 'minimal'
        })
    );

    res.status(201).json({
      success: true,
      message: 'SHL competency score submitted successfully',
      data: {
        studentId,
        componentId,
        componentName: componentResult.rows[0].name,
        obtainedScore,
        maxScore,
        percentage: Math.round(percentage * 100) / 100,
        termId,
        submittedAt: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Submit SHL competency score API error:', error);
    res.status(500).json({
      success: false,
      error: 'SHL_SCORE_SUBMISSION_FAILED',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

module.exports = {
  getSHLCompetencyComponents,
  calculateStudentSHLScores,
  getStudentSHLSummary,
  submitSHLCompetencyScore
};
