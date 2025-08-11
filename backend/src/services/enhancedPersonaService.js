/**
 * Enhanced Persona Service
 * Implements Internal + Capstone split as per Excel system
 */

const { supabase, query } = require('../config/supabase');

class EnhancedPersonaService {

  /**
   * Calculate Persona score with Internal/Capstone split
   * @param {string} studentId - Student UUID
   * @param {string} termId - Term UUID
   */
  async calculatePersonaScore(studentId, termId) {
    try {
      console.log(`🎭 Calculating Persona score for student: ${studentId}, term: ${termId}`);

      // Calculate Internal Assessment score
      const internalScore = await this.calculateInternalScore(studentId, termId);
      
      // Calculate Capstone Assessment score
      const capstoneScore = await this.calculateCapstoneScore(studentId, termId);
      
      // Total Persona score = Internal + Capstone
      const totalScore = internalScore.score + capstoneScore.score;
      const maxScore = internalScore.maxScore + capstoneScore.maxScore;
      const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
      
      // Determine status based on Excel logic
      const status = percentage >= 40 ? 'Cleared' : 'Not Cleared';
      const grade = this.calculateGrade(percentage);

      const result = {
        internal_assessment: internalScore,
        capstone_assessment: capstoneScore,
        total_score: totalScore,
        max_score: maxScore,
        percentage: Math.round(percentage * 100) / 100,
        status: status,
        grade: grade,
        calculated_at: new Date().toISOString()
      };

      console.log(`✅ Persona score calculated: ${percentage}% (${status})`);
      return result;

    } catch (error) {
      console.error('❌ Calculate Persona score error:', error);
      throw new Error(`Failed to calculate Persona score: ${error.message}`);
    }
  }

  /**
   * Calculate Internal Assessment score
   * Currently returns 0 as per Excel data, but structure is ready for future use
   */
  async calculateInternalScore(studentId, termId) {
    try {
      // Get internal assessment components (if any)
      // Currently Excel shows 0 for internal, but we maintain the structure
      
      const internalComponents = await this.getInternalComponents();
      let totalScore = 0;
      let maxScore = 0;

      // For now, internal assessment is 0 as per Excel
      // But structure allows for future internal assessments
      for (const component of internalComponents) {
        const componentScore = await this.getComponentScore(studentId, termId, component.id);
        totalScore += componentScore.obtained_score || 0;
        maxScore += componentScore.max_score || 0;
      }

      return {
        score: totalScore,
        maxScore: maxScore,
        percentage: maxScore > 0 ? (totalScore / maxScore) * 100 : 0,
        components: internalComponents.map(comp => ({
          id: comp.id,
          name: comp.name,
          score: 0, // Currently 0 as per Excel
          maxScore: comp.max_score
        }))
      };

    } catch (error) {
      console.error('❌ Calculate internal score error:', error);
      return { score: 0, maxScore: 0, percentage: 0, components: [] };
    }
  }

  /**
   * Calculate Capstone Assessment score
   * This includes SHL Competencies (80%) + Professional Readiness (20%)
   */
  async calculateCapstoneScore(studentId, termId) {
    try {
      // Get SHL Competency scores (80% weightage)
      const shlScore = await this.calculateSHLCompetencyScore(studentId, termId);
      
      // Get Professional Readiness score (20% weightage)
      const professionalReadinessScore = await this.calculateProfessionalReadinessScore(studentId, termId);
      
      // Calculate weighted capstone score
      const shlWeightedScore = shlScore.score * 0.8;
      const professionalWeightedScore = professionalReadinessScore.score * 0.2;
      const totalCapstoneScore = shlWeightedScore + professionalWeightedScore;
      
      // Max score calculation
      const maxShlScore = shlScore.maxScore * 0.8;
      const maxProfessionalScore = professionalReadinessScore.maxScore * 0.2;
      const maxCapstoneScore = maxShlScore + maxProfessionalScore;
      
      const percentage = maxCapstoneScore > 0 ? (totalCapstoneScore / maxCapstoneScore) * 100 : 0;

      return {
        score: totalCapstoneScore,
        maxScore: maxCapstoneScore,
        percentage: Math.round(percentage * 100) / 100,
        shl_competencies: {
          ...shlScore,
          weightage: 80,
          weighted_score: shlWeightedScore
        },
        professional_readiness: {
          ...professionalReadinessScore,
          weightage: 20,
          weighted_score: professionalWeightedScore
        }
      };

    } catch (error) {
      console.error('❌ Calculate capstone score error:', error);
      return { score: 0, maxScore: 0, percentage: 0 };
    }
  }

  /**
   * Calculate SHL Competency score from 7 competencies
   */
  async calculateSHLCompetencyScore(studentId, termId) {
    try {
      const shlCompetencies = [
        'Analytical & Critical Thinking',
        'Communication',
        'Empathy',
        'Leadership',
        'Negotiation',
        'Problem Solving',
        'Teamwork'
      ];

      let totalScore = 0;
      let maxScore = 0;
      const competencyScores = [];

      for (const competencyName of shlCompetencies) {
        const competencyScore = await this.getSHLCompetencyScore(studentId, termId, competencyName);
        totalScore += competencyScore.score;
        maxScore += competencyScore.maxScore;
        competencyScores.push({
          name: competencyName,
          score: competencyScore.score,
          maxScore: competencyScore.maxScore,
          rating: competencyScore.rating, // 1-5 scale
          percentage: competencyScore.percentage
        });
      }

      const overallPercentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

      return {
        score: totalScore,
        maxScore: maxScore,
        percentage: Math.round(overallPercentage * 100) / 100,
        competencies: competencyScores,
        overall_rating: this.calculateOverallSHLRating(competencyScores)
      };

    } catch (error) {
      console.error('❌ Calculate SHL competency score error:', error);
      return { score: 0, maxScore: 0, percentage: 0, competencies: [] };
    }
  }

  /**
   * Get individual SHL competency score
   */
  async getSHLCompetencyScore(studentId, termId, competencyName) {
    try {
      // Get component ID for this competency
      const componentResult = await query(
        supabase
          .from('components')
          .select('id, max_score')
          .eq('name', competencyName)
          .eq('category', 'SHL')
          .limit(1)
      );

      const component = componentResult.rows?.[0];
      if (!component) {
        return { score: 0, maxScore: 0, rating: 0, percentage: 0 };
      }

      // Get score for this component
      const scoreResult = await query(
        supabase
          .from('scores')
          .select('obtained_score, max_score')
          .eq('student_id', studentId)
          .eq('term_id', termId)
          .eq('component_id', component.id)
          .limit(1)
      );

      const score = scoreResult.rows?.[0];
      const obtainedScore = score?.obtained_score || 0;
      const maxScoreValue = score?.max_score || component.max_score || 100;
      
      // Convert to 1-5 rating scale (Excel uses this)
      const percentage = maxScoreValue > 0 ? (obtainedScore / maxScoreValue) * 100 : 0;
      const rating = this.convertPercentageToRating(percentage);

      return {
        score: obtainedScore,
        maxScore: maxScoreValue,
        rating: rating,
        percentage: Math.round(percentage * 100) / 100
      };

    } catch (error) {
      console.error(`❌ Get SHL competency score error for ${competencyName}:`, error);
      return { score: 0, maxScore: 0, rating: 0, percentage: 0 };
    }
  }

  /**
   * Calculate Professional Readiness score
   */
  async calculateProfessionalReadinessScore(studentId, termId) {
    try {
      // Get Professional Readiness components
      const professionalComponents = await this.getProfessionalReadinessComponents();
      
      let totalScore = 0;
      let maxScore = 0;
      const componentScores = [];

      for (const component of professionalComponents) {
        const componentScore = await this.getComponentScore(studentId, termId, component.id);
        totalScore += componentScore.obtained_score || 0;
        maxScore += componentScore.max_score || 0;
        componentScores.push({
          id: component.id,
          name: component.name,
          score: componentScore.obtained_score || 0,
          maxScore: componentScore.max_score || 0
        });
      }

      const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

      return {
        score: totalScore,
        maxScore: maxScore,
        percentage: Math.round(percentage * 100) / 100,
        components: componentScores
      };

    } catch (error) {
      console.error('❌ Calculate professional readiness score error:', error);
      return { score: 0, maxScore: 0, percentage: 0, components: [] };
    }
  }

  /**
   * Get internal assessment components
   */
  async getInternalComponents() {
    try {
      // This would be components marked as "Internal" category
      // For now, return empty as Excel shows 0 for internal
      return [];
    } catch (error) {
      console.error('❌ Get internal components error:', error);
      return [];
    }
  }

  /**
   * Get Professional Readiness components
   */
  async getProfessionalReadinessComponents() {
    try {
      const result = await query(
        supabase
          .from('components')
          .select('id, name, max_score')
          .in('sub_category_id',
            supabase
              .from('sub_categories')
              .select('id')
              .eq('name', 'Professional Readiness')
          )
      );

      return result.rows || [];
    } catch (error) {
      console.error('❌ Get professional readiness components error:', error);
      return [];
    }
  }

  /**
   * Get component score for student
   */
  async getComponentScore(studentId, termId, componentId) {
    try {
      const result = await query(
        supabase
          .from('scores')
          .select('obtained_score, max_score')
          .eq('student_id', studentId)
          .eq('term_id', termId)
          .eq('component_id', componentId)
          .limit(1)
      );

      return result.rows?.[0] || { obtained_score: 0, max_score: 0 };
    } catch (error) {
      console.error('❌ Get component score error:', error);
      return { obtained_score: 0, max_score: 0 };
    }
  }

  /**
   * Convert percentage to 1-5 rating scale
   */
  convertPercentageToRating(percentage) {
    if (percentage >= 80) return 5;
    if (percentage >= 60) return 4;
    if (percentage >= 40) return 3;
    if (percentage >= 20) return 2;
    return 1;
  }

  /**
   * Calculate overall SHL rating
   */
  calculateOverallSHLRating(competencyScores) {
    if (competencyScores.length === 0) return 0;
    
    const totalRating = competencyScores.reduce((sum, comp) => sum + comp.rating, 0);
    return Math.round((totalRating / competencyScores.length) * 100) / 100;
  }

  /**
   * Calculate grade from percentage
   */
  calculateGrade(percentage) {
    if (percentage >= 80) return 'A+';
    if (percentage >= 66) return 'A';
    if (percentage >= 50) return 'B';
    if (percentage >= 34) return 'C';
    if (percentage > 0) return 'D';
    return 'E';
  }
}

module.exports = new EnhancedPersonaService();
