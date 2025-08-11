const { supabase, query } = require('../config/supabase');

/**
 * Unified Score Calculation Service
 * 
 * This service implements a unified scoring system with the following principles:
 * 1. Simple Average Weightage: All scores are calculated using simple averages
 * 2. Single Source of Truth: All scores flow through this service
 * 3. Term-Aware: All calculations are term-specific
 * 4. Hierarchical: Microcompetencies → Components → Sub-categories → Quadrants → HPS
 * 5. No Double Counting: Each score source contributes only once
 */
class UnifiedScoreCalculationService {

  /**
   * Calculate unified HPS for a student in a specific term
   * This is the main entry point for all score calculations
   * @param {string} studentId - Student UUID
   * @param {string} termId - Term UUID
   * @returns {Object} Complete HPS calculation with breakdown
   */
  async calculateUnifiedHPS(studentId, termId) {
    try {
      console.log(`🔄 Calculating Unified HPS for student ${studentId} in term ${termId}`);

      // Step 1: Calculate Traditional Component Scores (from scores table)
      const traditionalScores = await this.calculateTraditionalQuadrantScores(studentId, termId);
      
      // Step 2: Calculate Intervention Microcompetency Scores (from microcompetency_scores table)
      const interventionScores = await this.calculateInterventionQuadrantScores(studentId, termId);
      
      // Step 3: Combine scores using simple averages (no double counting)
      const unifiedQuadrantScores = await this.combineQuadrantScoresUnified(traditionalScores, interventionScores);
      
      // Step 4: Calculate overall HPS using weighted calculation based on quadrant weightages
      const totalHPS = this.calculateWeightedHPS(unifiedQuadrantScores);
      
      // Step 5: Update student_score_summary table
      await this.updateStudentScoreSummary(studentId, termId, unifiedQuadrantScores, totalHPS);
      
      console.log(`✅ Unified HPS calculated: ${totalHPS.toFixed(2)}%`);
      
      return {
        success: true,
        studentId,
        termId,
        quadrantScores: unifiedQuadrantScores,
        totalHPS: totalHPS,
        grade: this.calculateGrade(totalHPS),
        status: this.calculateStatus(totalHPS),
        calculatedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Calculate Unified HPS error:', error);
      throw new Error(`Failed to calculate unified HPS: ${error.message}`);
    }
  }

  /**
   * Calculate traditional quadrant scores from the scores table
   * @param {string} studentId - Student UUID
   * @param {string} termId - Term UUID
   * @returns {Object} Quadrant scores from traditional components
   */
  async calculateTraditionalQuadrantScores(studentId, termId) {
    try {
      console.log(`📊 Calculating traditional quadrant scores for student ${studentId} in term ${termId}`);

      const scoresResult = await query(
        supabase
          .from('scores')
          .select(`
            obtained_score,
            max_score,
            components:component_id(
              id,
              name,
              sub_categories:sub_category_id(
                id,
                name,
                quadrants:quadrant_id(id, name, weightage)
              )
            )
          `)
          .eq('student_id', studentId)
          .eq('term_id', termId)
      );

      const quadrantScores = {};

      // Group scores by quadrant and calculate simple averages
      scoresResult.rows.forEach(score => {
        const quadrant = score.components.sub_categories.quadrants;
        const quadrantId = quadrant.id;

        if (!quadrantScores[quadrantId]) {
          quadrantScores[quadrantId] = {
            id: quadrant.id,
            name: quadrant.name,
            scores: [],
            totalObtained: 0,
            totalMax: 0,
            source: 'traditional'
          };
        }

        const percentage = score.max_score > 0 ? (score.obtained_score / score.max_score) * 100 : 0;
        quadrantScores[quadrantId].scores.push(percentage);
        quadrantScores[quadrantId].totalObtained += score.obtained_score;
        quadrantScores[quadrantId].totalMax += score.max_score;
      });

      // Calculate simple averages for each quadrant
      Object.values(quadrantScores).forEach(quadrant => {
        quadrant.averageScore = quadrant.scores.length > 0 
          ? quadrant.scores.reduce((sum, score) => sum + score, 0) / quadrant.scores.length
          : 0;
      });

      console.log(`✅ Traditional quadrant scores calculated for ${Object.keys(quadrantScores).length} quadrants`);
      return quadrantScores;

    } catch (error) {
      console.error('❌ Calculate traditional quadrant scores error:', error);
      throw new Error(`Failed to calculate traditional quadrant scores: ${error.message}`);
    }
  }

  /**
   * Calculate intervention quadrant scores from microcompetency_scores table
   * @param {string} studentId - Student UUID
   * @param {string} termId - Term UUID
   * @returns {Object} Quadrant scores from intervention microcompetencies
   */
  async calculateInterventionQuadrantScores(studentId, termId) {
    try {
      console.log(`🎯 Calculating intervention quadrant scores for student ${studentId} in term ${termId}`);

      const microScoresResult = await query(
        supabase
          .from('microcompetency_scores')
          .select(`
            obtained_score,
            max_score,
            microcompetencies:microcompetency_id(
              id,
              name,
              components:component_id(
                id,
                name,
                sub_categories:sub_category_id(
                  id,
                  name,
                  quadrants:quadrant_id(id, name, weightage)
                )
              )
            )
          `)
          .eq('student_id', studentId)
          .eq('term_id', termId)
      );

      const quadrantScores = {};

      // Group microcompetency scores by quadrant and calculate simple averages
      microScoresResult.rows.forEach(score => {
        const quadrant = score.microcompetencies.components.sub_categories.quadrants;
        const quadrantId = quadrant.id;

        if (!quadrantScores[quadrantId]) {
          quadrantScores[quadrantId] = {
            id: quadrant.id,
            name: quadrant.name,
            scores: [],
            totalObtained: 0,
            totalMax: 0,
            source: 'intervention'
          };
        }

        const percentage = score.max_score > 0 ? (score.obtained_score / score.max_score) * 100 : 0;
        quadrantScores[quadrantId].scores.push(percentage);
        quadrantScores[quadrantId].totalObtained += score.obtained_score;
        quadrantScores[quadrantId].totalMax += score.max_score;
      });

      // Calculate simple averages for each quadrant
      Object.values(quadrantScores).forEach(quadrant => {
        quadrant.averageScore = quadrant.scores.length > 0 
          ? quadrant.scores.reduce((sum, score) => sum + score, 0) / quadrant.scores.length
          : 0;
      });

      console.log(`✅ Intervention quadrant scores calculated for ${Object.keys(quadrantScores).length} quadrants`);
      return quadrantScores;

    } catch (error) {
      console.error('❌ Calculate intervention quadrant scores error:', error);
      throw new Error(`Failed to calculate intervention quadrant scores: ${error.message}`);
    }
  }

  /**
   * Combine traditional and intervention quadrant scores using simple averages
   * Prevents double counting by averaging scores from different sources
   * @param {Object} traditionalScores - Scores from traditional components
   * @param {Object} interventionScores - Scores from intervention microcompetencies
   * @returns {Object} Combined quadrant scores
   */
  async combineQuadrantScoresUnified(traditionalScores, interventionScores) {
    try {
      console.log(`🔗 Combining quadrant scores from traditional and intervention sources`);

      // Get all unique quadrant IDs
      const allQuadrantIds = new Set([
        ...Object.keys(traditionalScores),
        ...Object.keys(interventionScores)
      ]);

      const combinedScores = {};

      for (const quadrantId of allQuadrantIds) {
        const traditional = traditionalScores[quadrantId];
        const intervention = interventionScores[quadrantId];

        // Get quadrant info from either source
        const quadrantInfo = traditional || intervention;

        combinedScores[quadrantId] = {
          id: quadrantInfo.id,
          name: quadrantInfo.name,
          traditionalScore: traditional ? traditional.averageScore : 0,
          interventionScore: intervention ? intervention.averageScore : 0,
          hasTraditional: !!traditional,
          hasIntervention: !!intervention,
          sources: []
        };

        // Calculate simple average of available scores
        const availableScores = [];
        if (traditional && traditional.averageScore > 0) {
          availableScores.push(traditional.averageScore);
          combinedScores[quadrantId].sources.push('traditional');
        }
        if (intervention && intervention.averageScore > 0) {
          availableScores.push(intervention.averageScore);
          combinedScores[quadrantId].sources.push('intervention');
        }

        // Simple average of all available scores (no double counting)
        combinedScores[quadrantId].finalScore = availableScores.length > 0
          ? availableScores.reduce((sum, score) => sum + score, 0) / availableScores.length
          : 0;

        combinedScores[quadrantId].grade = this.calculateGrade(combinedScores[quadrantId].finalScore);
        combinedScores[quadrantId].status = this.calculateStatus(combinedScores[quadrantId].finalScore);
      }

      console.log(`✅ Combined scores for ${allQuadrantIds.size} quadrants`);
      return combinedScores;

    } catch (error) {
      console.error('❌ Combine quadrant scores error:', error);
      throw new Error(`Failed to combine quadrant scores: ${error.message}`);
    }
  }

  /**
   * Calculate overall HPS using weighted calculation based on quadrant weightages
   * @param {Object} quadrantScores - Combined quadrant scores
   * @returns {number} Total HPS percentage
   */
  calculateWeightedHPS(quadrantScores) {
    const quadrantValues = Object.values(quadrantScores);

    if (quadrantValues.length === 0) {
      return 0;
    }

    // Create a map for easy lookup by quadrant name
    const quadrantMap = {};
    quadrantValues.forEach(quadrant => {
      quadrantMap[quadrant.name] = quadrant;
    });

    // Get scores for each quadrant (default to 0 if not found)
    const personaScore = quadrantMap['Persona']?.finalScore || 0;
    const wellnessScore = quadrantMap['Wellness']?.finalScore || 0;
    const behaviorScore = quadrantMap['Behavior']?.finalScore || 0;
    const disciplineScore = quadrantMap['Discipline']?.finalScore || 0;

    // Calculate weighted HPS using Excel system weightages:
    // Persona: 50%, Wellness: 30%, Behavior: 10%, Discipline: 10%
    const weightedHPS = (personaScore * 0.5) + (wellnessScore * 0.3) + (behaviorScore * 0.1) + (disciplineScore * 0.1);

    console.log(`🧮 Weighted HPS Calculation:
      Persona: ${personaScore.toFixed(2)} × 0.5 = ${(personaScore * 0.5).toFixed(2)}
      Wellness: ${wellnessScore.toFixed(2)} × 0.3 = ${(wellnessScore * 0.3).toFixed(2)}
      Behavior: ${behaviorScore.toFixed(2)} × 0.1 = ${(behaviorScore * 0.1).toFixed(2)}
      Discipline: ${disciplineScore.toFixed(2)} × 0.1 = ${(disciplineScore * 0.1).toFixed(2)}
      Total Weighted HPS: ${weightedHPS.toFixed(2)}`);

    return weightedHPS;
  }

  /**
   * Update student_score_summary table with calculated scores
   * @param {string} studentId - Student UUID
   * @param {string} termId - Term UUID
   * @param {Object} quadrantScores - Calculated quadrant scores
   * @param {number} totalHPS - Total HPS score
   */
  async updateStudentScoreSummary(studentId, termId, quadrantScores, totalHPS) {
    try {
      // Extract individual quadrant scores
      const personaScore = quadrantScores['persona']?.finalScore || 0;
      const wellnessScore = quadrantScores['wellness']?.finalScore || 0;
      const behaviorScore = quadrantScores['behavior']?.finalScore || 0;
      const disciplineScore = quadrantScores['discipline']?.finalScore || 0;

      const summaryData = {
        student_id: studentId,
        term_id: termId,
        persona_score: Math.round(personaScore * 100) / 100,
        wellness_score: Math.round(wellnessScore * 100) / 100,
        behavior_score: Math.round(behaviorScore * 100) / 100,
        discipline_score: Math.round(disciplineScore * 100) / 100,
        total_hps: Math.round(totalHPS * 100) / 100,
        overall_grade: this.calculateGrade(totalHPS),
        overall_status: this.calculateStatus(totalHPS),
        last_calculated_at: new Date().toISOString(),
        calculation_version: 2 // Version 2 = Unified calculation
      };

      await query(
        supabase
          .from('student_score_summary')
          .upsert(summaryData, { onConflict: 'student_id,term_id' })
      );

      console.log(`✅ Student score summary updated for student ${studentId} in term ${termId}`);

    } catch (error) {
      console.error('❌ Update student score summary error:', error);
      throw new Error(`Failed to update student score summary: ${error.message}`);
    }
  }

  /**
   * Calculate grade based on score percentage (Excel system requirements)
   * @param {number} score - Score percentage (0-100)
   * @returns {string} Grade (A+, A, B, C, D, E, IC, NC)
   */
  calculateGrade(score) {
    // Excel system grading scale:
    // A+: Above 80 (Excellent)
    // A: 66-79 (Good)
    // B: 50-65 (Average)
    // C: 34-49 (Marginal)
    // D: Below 34 (Poor)
    // E: Incomplete/Failed
    // IC: Incomplete
    // NC: Not Cleared

    if (score >= 80) return 'A+';
    if (score >= 66) return 'A';
    if (score >= 50) return 'B';
    if (score >= 34) return 'C';
    if (score > 0) return 'D';
    return 'E'; // For 0 or null scores
  }

  /**
   * Calculate status based on score percentage (Excel system requirements)
   * @param {number} score - Score percentage (0-100)
   * @returns {string} Status (Cleared, Not Cleared, Incomplete)
   */
  calculateStatus(score) {
    // Excel system status determination:
    // Cleared: Meets minimum thresholds in all quadrants + 80% attendance
    // Not Cleared: Fails to meet minimum requirements
    // Incomplete: Missing assessments

    if (score >= 50) return 'Cleared';
    if (score > 0) return 'Not Cleared';
    return 'Incomplete';
  }

  /**
   * Recalculate scores for a student after microcompetency score update
   * @param {string} studentId - Student UUID
   * @param {string} microcompetencyId - Microcompetency UUID
   * @returns {Object} Recalculation result
   */
  async recalculateAfterMicrocompetencyUpdate(studentId, microcompetencyId) {
    try {
      console.log(`🔄 Recalculating scores after microcompetency update for student ${studentId}`);

      // Get the term for this microcompetency score
      const microScoreResult = await query(
        supabase
          .from('microcompetency_scores')
          .select('term_id')
          .eq('student_id', studentId)
          .eq('microcompetency_id', microcompetencyId)
          .limit(1)
      );

      if (!microScoreResult.rows || microScoreResult.rows.length === 0) {
        throw new Error('Microcompetency score not found');
      }

      const termId = microScoreResult.rows[0].term_id;

      // Recalculate unified HPS for this term
      const result = await this.calculateUnifiedHPS(studentId, termId);

      console.log(`✅ Scores recalculated successfully for student ${studentId} in term ${termId}`);
      return result;

    } catch (error) {
      console.error('❌ Recalculate after microcompetency update error:', error);
      throw new Error(`Failed to recalculate scores: ${error.message}`);
    }
  }

  /**
   * Recalculate scores for a student after traditional score update
   * @param {string} studentId - Student UUID
   * @param {string} componentId - Component UUID
   * @param {string} termId - Term UUID
   * @returns {Object} Recalculation result
   */
  async recalculateAfterTraditionalScoreUpdate(studentId, componentId, termId) {
    try {
      console.log(`🔄 Recalculating scores after traditional score update for student ${studentId}`);

      // Recalculate unified HPS for this term
      const result = await this.calculateUnifiedHPS(studentId, termId);

      console.log(`✅ Scores recalculated successfully for student ${studentId} in term ${termId}`);
      return result;

    } catch (error) {
      console.error('❌ Recalculate after traditional score update error:', error);
      throw new Error(`Failed to recalculate scores: ${error.message}`);
    }
  }

  /**
   * Get unified score summary for a student in a term
   * @param {string} studentId - Student UUID
   * @param {string} termId - Term UUID
   * @returns {Object} Score summary
   */
  async getUnifiedScoreSummary(studentId, termId) {
    try {
      const summaryResult = await query(
        supabase
          .from('student_score_summary')
          .select('*')
          .eq('student_id', studentId)
          .eq('term_id', termId)
          .limit(1)
      );

      if (!summaryResult.rows || summaryResult.rows.length === 0) {
        // If no summary exists, calculate it
        console.log(`📊 No score summary found, calculating for student ${studentId} in term ${termId}`);
        const calculationResult = await this.calculateUnifiedHPS(studentId, termId);

        // Fetch the newly created summary
        const newSummaryResult = await query(
          supabase
            .from('student_score_summary')
            .select('*')
            .eq('student_id', studentId)
            .eq('term_id', termId)
            .limit(1)
        );

        return newSummaryResult.rows[0];
      }

      return summaryResult.rows[0];

    } catch (error) {
      console.error('❌ Get unified score summary error:', error);
      throw new Error(`Failed to get unified score summary: ${error.message}`);
    }
  }
}

module.exports = new UnifiedScoreCalculationService();
