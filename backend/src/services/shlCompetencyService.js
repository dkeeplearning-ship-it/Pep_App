const { supabase, query } = require('../config/supabase');

/**
 * SHL Competency Service
 * 
 * Handles the 7-core competency assessment system:
 * A&C: Analytical & Critical Thinking
 * C: Communication
 * E: Empathy
 * L: Leadership
 * N: Negotiation
 * P: Problem Solving
 * T: Teamwork
 */
class SHLCompetencyService {

  /**
   * Get all 7-core competency components
   * @returns {Array} Array of SHL competency components
   */
  async getSHLCompetencyComponents() {
    try {
      const result = await query(
        supabase
          .from('components')
          .select(`
            id,
            name,
            description,
            weightage,
            max_score,
            category,
            display_order,
            sub_categories:sub_category_id(
              id,
              name,
              quadrants:quadrant_id(id, name)
            )
          `)
          .eq('category', 'SHL')
          .eq('is_active', true)
          .order('display_order', { ascending: true })
      );

      return result.rows || [];
    } catch (error) {
      console.error('❌ Get SHL competency components error:', error);
      throw new Error(`Failed to get SHL competency components: ${error.message}`);
    }
  }

  /**
   * Calculate SHL competency scores for a student in a specific term
   * @param {string} studentId - Student UUID
   * @param {string} termId - Term UUID
   * @returns {Object} SHL competency assessment results
   */
  async calculateSHLCompetencyScores(studentId, termId) {
    try {
      console.log(`🧠 Calculating SHL competency scores for student ${studentId} in term ${termId}`);

      // Get SHL competency components
      const shlComponents = await this.getSHLCompetencyComponents();
      
      if (shlComponents.length === 0) {
        throw new Error('No SHL competency components found');
      }

      // Get scores for each SHL competency
      const competencyScores = [];
      let totalRawScore = 0;
      let totalMaxScore = 0;

      for (const component of shlComponents) {
        const scoresResult = await query(
          supabase
            .from('scores')
            .select('obtained_score, max_score, percentage, assessment_date')
            .eq('student_id', studentId)
            .eq('component_id', component.id)
            .eq('term_id', termId)
            .order('assessment_date', { ascending: false })
            .limit(1)
        );

        const latestScore = scoresResult.rows && scoresResult.rows.length > 0 
          ? scoresResult.rows[0] 
          : null;

        const competencyData = {
          id: component.id,
          name: component.name,
          description: component.description,
          shortCode: this.getCompetencyShortCode(component.name),
          rawScore: latestScore ? latestScore.obtained_score : 0,
          maxScore: component.max_score,
          percentage: latestScore ? latestScore.percentage : 0,
          rating: latestScore ? this.convertToRating(latestScore.percentage) : 0,
          isAssessed: !!latestScore,
          assessmentDate: latestScore ? latestScore.assessment_date : null
        };

        competencyScores.push(competencyData);
        
        if (latestScore) {
          totalRawScore += latestScore.obtained_score;
          totalMaxScore += component.max_score;
        }
      }

      // Calculate overall competency metrics
      const overallPercentage = totalMaxScore > 0 ? (totalRawScore / totalMaxScore) * 100 : 0;
      const potentialLevel = this.calculatePotentialLevel(competencyScores);
      const topCompetencies = this.identifyTopCompetencies(competencyScores);
      const bottomCompetencies = this.identifyBottomCompetencies(competencyScores);

      console.log(`✅ SHL competency calculation complete. Overall: ${overallPercentage.toFixed(2)}%`);

      return {
        success: true,
        studentId,
        termId,
        competencyScores,
        overallMetrics: {
          totalRawScore,
          totalMaxScore,
          overallPercentage,
          potentialLevel,
          topCompetencies,
          bottomCompetencies
        },
        calculatedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Calculate SHL competency scores error:', error);
      throw new Error(`Failed to calculate SHL competency scores: ${error.message}`);
    }
  }

  /**
   * Get competency short code for Excel system compatibility
   * @param {string} competencyName - Full competency name
   * @returns {string} Short code (A&C, C, E, L, N, P, T)
   */
  getCompetencyShortCode(competencyName) {
    const shortCodes = {
      'Analytical & Critical Thinking': 'A&C',
      'Communication': 'C',
      'Empathy': 'E',
      'Leadership': 'L',
      'Negotiation': 'N',
      'Problem Solving': 'P',
      'Teamwork': 'T'
    };
    return shortCodes[competencyName] || competencyName.charAt(0);
  }

  /**
   * Convert percentage score to 1-5 rating scale
   * @param {number} percentage - Score percentage (0-100)
   * @returns {number} Rating (1-5)
   */
  convertToRating(percentage) {
    if (percentage >= 90) return 5;
    if (percentage >= 80) return 4;
    if (percentage >= 60) return 3;
    if (percentage >= 40) return 2;
    return 1;
  }

  /**
   * Calculate potential level based on competency ratings
   * @param {Array} competencyScores - Array of competency score objects
   * @returns {string} Potential level (High, Medium, Low)
   */
  calculatePotentialLevel(competencyScores) {
    const assessedCompetencies = competencyScores.filter(c => c.isAssessed);
    
    if (assessedCompetencies.length === 0) {
      return 'Not Assessed';
    }

    const averageRating = assessedCompetencies.reduce((sum, c) => sum + c.rating, 0) / assessedCompetencies.length;
    
    if (averageRating >= 4) return 'High Potential';
    if (averageRating >= 3) return 'Medium Potential';
    return 'Low Potential';
  }

  /**
   * Identify top 2 competencies
   * @param {Array} competencyScores - Array of competency score objects
   * @returns {Array} Top 2 competencies
   */
  identifyTopCompetencies(competencyScores) {
    const assessedCompetencies = competencyScores
      .filter(c => c.isAssessed)
      .sort((a, b) => b.percentage - a.percentage);
    
    return assessedCompetencies.slice(0, 2).map(c => ({
      shortCode: c.shortCode,
      name: c.name,
      percentage: c.percentage,
      rating: c.rating
    }));
  }

  /**
   * Identify bottom 2 competencies
   * @param {Array} competencyScores - Array of competency score objects
   * @returns {Array} Bottom 2 competencies
   */
  identifyBottomCompetencies(competencyScores) {
    const assessedCompetencies = competencyScores
      .filter(c => c.isAssessed)
      .sort((a, b) => a.percentage - b.percentage);
    
    return assessedCompetencies.slice(0, 2).map(c => ({
      shortCode: c.shortCode,
      name: c.name,
      percentage: c.percentage,
      rating: c.rating
    }));
  }

  /**
   * Get SHL competency summary for a student
   * @param {string} studentId - Student UUID
   * @param {string} termId - Term UUID
   * @returns {Object} SHL competency summary
   */
  async getSHLCompetencySummary(studentId, termId) {
    try {
      const competencyData = await this.calculateSHLCompetencyScores(studentId, termId);
      
      return {
        success: true,
        summary: {
          studentId,
          termId,
          overallPercentage: competencyData.overallMetrics.overallPercentage,
          potentialLevel: competencyData.overallMetrics.potentialLevel,
          topCompetencies: competencyData.overallMetrics.topCompetencies,
          bottomCompetencies: competencyData.overallMetrics.bottomCompetencies,
          assessmentProgress: {
            assessed: competencyData.competencyScores.filter(c => c.isAssessed).length,
            total: competencyData.competencyScores.length,
            percentage: (competencyData.competencyScores.filter(c => c.isAssessed).length / competencyData.competencyScores.length) * 100
          }
        },
        detailedScores: competencyData.competencyScores
      };
    } catch (error) {
      console.error('❌ Get SHL competency summary error:', error);
      throw new Error(`Failed to get SHL competency summary: ${error.message}`);
    }
  }
}

module.exports = new SHLCompetencyService();
