const unifiedScoreService = require('../services/enhancedUnifiedScoreCalculationServiceV2');
const { supabase, query } = require('../config/supabase');

/**
 * Unified Score Controller
 * 
 * Provides standardized API endpoints for the new unified scoring system
 * All endpoints are term-aware and use simple average calculations
 */

/**
 * Calculate unified HPS for a student in a specific term
 * @route POST /api/v1/unified-scores/students/:studentId/hps
 * @param {string} studentId - Student UUID
 * @param {string} termId - Term UUID (from request body)
 */
const calculateStudentHPS = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { termId } = req.body;

    if (!termId) {
      return res.status(400).json({
        success: false,
        error: 'TERM_ID_REQUIRED',
        message: 'Term ID is required for HPS calculation',
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

    // Calculate unified HPS
    const hpsResult = await unifiedScoreService.calculateUnifiedHPS(studentId, termId);

    res.status(200).json({
      success: true,
      message: 'Unified HPS calculated successfully',
      data: {
        student: studentResult.rows[0],
        term: termResult.rows[0],
        hps: hpsResult
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Calculate student HPS error:', error);
    res.status(500).json({
      success: false,
      error: 'HPS_CALCULATION_FAILED',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Get unified score summary for a student in a term
 * @route GET /api/v1/unified-scores/students/:studentId/summary
 * @param {string} studentId - Student UUID
 * @param {string} termId - Term UUID (from query params)
 */
const getStudentScoreSummary = async (req, res) => {
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

    // Get unified score summary
    const summary = await unifiedScoreService.getUnifiedScoreSummary(studentId, termId);

    if (!summary) {
      return res.status(404).json({
        success: false,
        error: 'SCORE_SUMMARY_NOT_FOUND',
        message: 'Score summary not found for this student and term',
        timestamp: new Date().toISOString()
      });
    }

    res.status(200).json({
      success: true,
      message: 'Score summary retrieved successfully',
      data: {
        summary: summary
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Get student score summary error:', error);
    res.status(500).json({
      success: false,
      error: 'SCORE_SUMMARY_RETRIEVAL_FAILED',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Recalculate scores after microcompetency update
 * @route POST /api/v1/unified-scores/recalculate/microcompetency
 * @param {string} studentId - Student UUID (from request body)
 * @param {string} microcompetencyId - Microcompetency UUID (from request body)
 */
const recalculateAfterMicrocompetencyUpdate = async (req, res) => {
  try {
    const { studentId, microcompetencyId } = req.body;

    if (!studentId || !microcompetencyId) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_REQUIRED_FIELDS',
        message: 'Student ID and Microcompetency ID are required',
        timestamp: new Date().toISOString()
      });
    }

    // Recalculate scores
    const result = await unifiedScoreService.recalculateAfterMicrocompetencyUpdate(studentId, microcompetencyId);

    res.status(200).json({
      success: true,
      message: 'Scores recalculated successfully after microcompetency update',
      data: {
        recalculation: result
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Recalculate after microcompetency update error:', error);
    res.status(500).json({
      success: false,
      error: 'RECALCULATION_FAILED',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Recalculate scores after traditional score update
 * @route POST /api/v1/unified-scores/recalculate/traditional
 * @param {string} studentId - Student UUID (from request body)
 * @param {string} componentId - Component UUID (from request body)
 * @param {string} termId - Term UUID (from request body)
 */
const recalculateAfterTraditionalUpdate = async (req, res) => {
  try {
    const { studentId, componentId, termId } = req.body;

    if (!studentId || !componentId || !termId) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_REQUIRED_FIELDS',
        message: 'Student ID, Component ID, and Term ID are required',
        timestamp: new Date().toISOString()
      });
    }

    // Recalculate scores
    const result = await unifiedScoreService.recalculateAfterTraditionalScoreUpdate(studentId, componentId, termId);

    res.status(200).json({
      success: true,
      message: 'Scores recalculated successfully after traditional score update',
      data: {
        recalculation: result
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Recalculate after traditional update error:', error);
    res.status(500).json({
      success: false,
      error: 'RECALCULATION_FAILED',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Get score breakdown by quadrants for a student in a term
 * @route GET /api/v1/unified-scores/students/:studentId/breakdown
 * @param {string} studentId - Student UUID
 * @param {string} termId - Term UUID (from query params)
 */
const getScoreBreakdown = async (req, res) => {
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

    // Calculate unified HPS to get breakdown
    const hpsResult = await unifiedScoreService.calculateUnifiedHPS(studentId, termId);

    // Transform to breakdown format
    const breakdown = {
      studentId: studentId,
      termId: termId,
      totalHPS: hpsResult.totalHPS,
      grade: hpsResult.grade,
      status: hpsResult.status,
      quadrants: Object.values(hpsResult.quadrantScores).map(quadrant => ({
        id: quadrant.id,
        name: quadrant.name,
        finalScore: quadrant.finalScore,
        traditionalScore: quadrant.traditionalScore,
        interventionScore: quadrant.interventionScore,
        sources: quadrant.sources,
        grade: quadrant.grade,
        status: quadrant.status
      })),
      calculatedAt: hpsResult.calculatedAt
    };

    res.status(200).json({
      success: true,
      message: 'Score breakdown retrieved successfully',
      data: {
        breakdown: breakdown
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Get score breakdown error:', error);
    res.status(500).json({
      success: false,
      error: 'SCORE_BREAKDOWN_FAILED',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

module.exports = {
  calculateStudentHPS,
  getStudentScoreSummary,
  recalculateAfterMicrocompetencyUpdate,
  recalculateAfterTraditionalUpdate,
  getScoreBreakdown
};
