const { supabase, query } = require('../config/supabase');
const unifiedScoreService = require('./enhancedUnifiedScoreCalculationServiceV2');

/**
 * Score Calculation Service (Legacy Wrapper)
 *
 * This service now wraps the new UnifiedScoreCalculationService
 * while maintaining backward compatibility with existing APIs
 */
class ScoreCalculationService {
  
  /**
   * Calculate unified HPS for a student in a specific term
   * This is the main entry point for all score calculations
   * @param {string} studentId - Student UUID
   * @param {string} termId - Term UUID
   * @returns {Object} Complete HPS calculation with breakdown
   */
  async calculateUnifiedHPS(studentId, termId) {
    // Delegate to the new unified service
    return await unifiedScoreService.calculateUnifiedHPS(studentId, termId);
  }

  /**
   * Calculate student HPS (Legacy method - now uses unified service)
   * @param {string} studentId - Student UUID
   * @param {string} termId - Term UUID
   * @returns {Object} HPS calculation result
   */
  async calculateStudentHPS(studentId, termId) {
    return await this.calculateUnifiedHPS(studentId, termId);
  }

  /**
   * Recalculate scores after microcompetency update (Legacy wrapper)
   * @param {string} studentId - Student UUID
   * @param {string} interventionId - Intervention UUID (not used in new system)
   * @returns {Object} Recalculation result
   */
  async recalculateScoresAfterMicrocompetencyUpdate(studentId, interventionId) {
    // Get current term for the student
    const studentResult = await query(
      supabase
        .from('students')
        .select('current_term_id')
        .eq('id', studentId)
        .limit(1)
    );

    if (!studentResult.rows || studentResult.rows.length === 0) {
      throw new Error('Student not found');
    }

    const termId = studentResult.rows[0].current_term_id;
    return await unifiedScoreService.calculateUnifiedHPS(studentId, termId);
  }

  /**
   * Get score summary (Legacy wrapper)
   * @param {string} studentId - Student UUID
   * @param {string} termId - Term UUID
   * @returns {Object} Score summary
   */
  async getScoreSummary(studentId, termId) {
    return await unifiedScoreService.getUnifiedScoreSummary(studentId, termId);
  }

  /**
   * Calculate grade (Legacy method)
   * @param {number} score - Score percentage
   * @returns {string} Grade
   */
  calculateGrade(score) {
    return unifiedScoreService.calculateGrade(score);
  }

  /**
   * Calculate status (Legacy method)
   * @param {number} score - Score percentage
   * @returns {string} Status
   */
  calculateStatus(score) {
    return unifiedScoreService.calculateStatus(score);
  }

  /**
   * Calculate competency scores (Legacy method - simplified)
   * @param {string} studentId - Student UUID
   * @param {string} interventionId - Intervention UUID
   * @returns {Object} Competency scores
   */
  async calculateCompetencyScores(studentId, interventionId) {
    try {
      // Get the term for this intervention
      const interventionResult = await query(
        supabase
          .from('interventions')
          .select('term_id')
          .eq('id', interventionId)
          .limit(1)
      );

      if (!interventionResult.rows || interventionResult.rows.length === 0) {
        throw new Error('Intervention not found');
      }

      const termId = interventionResult.rows[0].term_id;
      
      // Use unified service to get scores
      const unifiedResult = await unifiedScoreService.calculateUnifiedHPS(studentId, termId);
      
      // Transform to legacy format
      return {
        success: true,
        student_id: studentId,
        intervention_id: interventionId,
        competencies: [], // Simplified - no longer needed in unified system
        calculated_at: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Calculate competency scores error:', error);
      throw new Error(`Failed to calculate competency scores: ${error.message}`);
    }
  }

  /**
   * Calculate quadrant scores (Legacy method - simplified)
   * @param {string} studentId - Student UUID
   * @param {string} interventionId - Intervention UUID
   * @returns {Object} Quadrant scores
   */
  async calculateQuadrantScores(studentId, interventionId) {
    try {
      // Get the term for this intervention
      const interventionResult = await query(
        supabase
          .from('interventions')
          .select('term_id')
          .eq('id', interventionId)
          .limit(1)
      );

      if (!interventionResult.rows || interventionResult.rows.length === 0) {
        throw new Error('Intervention not found');
      }

      const termId = interventionResult.rows[0].term_id;
      
      // Use unified service to get scores
      const unifiedResult = await unifiedScoreService.calculateUnifiedHPS(studentId, termId);
      
      // Transform to legacy format
      const quadrants = Object.values(unifiedResult.quadrantScores).map(quadrant => ({
        quadrant: {
          id: quadrant.id,
          name: quadrant.name
        },
        percentage: quadrant.finalScore,
        grade: quadrant.grade,
        final_contribution: quadrant.finalScore / 4 // Simple average contribution
      }));

      return {
        success: true,
        student_id: studentId,
        intervention_id: interventionId,
        quadrants: quadrants,
        calculated_at: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Calculate quadrant scores error:', error);
      throw new Error(`Failed to calculate quadrant scores: ${error.message}`);
    }
  }

  /**
   * Calculate intervention score (Legacy method - simplified)
   * @param {string} studentId - Student UUID
   * @param {string} interventionId - Intervention UUID
   * @returns {Object} Intervention score
   */
  async calculateInterventionScore(studentId, interventionId) {
    try {
      // Get the term for this intervention
      const interventionResult = await query(
        supabase
          .from('interventions')
          .select('term_id')
          .eq('id', interventionId)
          .limit(1)
      );

      if (!interventionResult.rows || interventionResult.rows.length === 0) {
        throw new Error('Intervention not found');
      }

      const termId = interventionResult.rows[0].term_id;
      
      // Use unified service to get scores
      const unifiedResult = await unifiedScoreService.calculateUnifiedHPS(studentId, termId);
      
      return {
        success: true,
        student_id: studentId,
        intervention_id: interventionId,
        overall_score: {
          percentage: unifiedResult.totalHPS,
          grade: unifiedResult.grade,
          total_weightage: 100
        },
        quadrant_breakdown: Object.values(unifiedResult.quadrantScores),
        calculated_at: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Calculate intervention score error:', error);
      throw new Error(`Failed to calculate intervention score: ${error.message}`);
    }
  }

  /**
   * Recalculate all scores (Legacy method)
   * @param {string} studentId - Student UUID
   * @param {string} interventionId - Intervention UUID
   * @returns {Object} Recalculation result
   */
  async recalculateAllScores(studentId, interventionId) {
    return await this.recalculateScoresAfterMicrocompetencyUpdate(studentId, interventionId);
  }

  /**
   * Recalculate student scores (Legacy method)
   * @param {string} studentId - Student UUID
   * @param {string} interventionId - Intervention UUID
   * @returns {Object} Recalculation result
   */
  async recalculateStudentScores(studentId, interventionId) {
    return await this.recalculateScoresAfterMicrocompetencyUpdate(studentId, interventionId);
  }

  /**
   * Get intervention statistics (Legacy method - simplified)
   * @param {string} interventionId - Intervention UUID
   * @returns {Object} Statistics
   */
  async getInterventionStatistics(interventionId) {
    try {
      return {
        intervention_id: interventionId,
        total_students: 0,
        scores_calculated: 0,
        average_percentage: 0,
        grade_distribution: {
          'A+': 0, 'A': 0, 'B': 0, 'C': 0, 'D': 0, 'E': 0, 'IC': 0
        },
        calculated_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Get intervention statistics error:', error);
      throw new Error(`Failed to get intervention statistics: ${error.message}`);
    }
  }
}

module.exports = new ScoreCalculationService();
