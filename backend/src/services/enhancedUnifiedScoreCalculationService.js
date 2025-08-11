const { supabase, query } = require('../config/supabase');
const enhancedWeightageService = require('./enhancedWeightageValidationService');

/**
 * Enhanced Unified Score Calculation Service
 * 
 * This service implements term-batch specific scoring with the following principles:
 * 1. Dynamic Weightages: Uses term-batch specific weightages with fallback to defaults
 * 2. Single Source of Truth: All scores flow through this service
 * 3. Term-Batch Aware: All calculations consider student's batch and term
 * 4. Hierarchical: Microcompetencies → Components → Sub-categories → Quadrants → HPS
 * 5. Backward Compatible: Falls back to default system when no specific config exists
 */
class EnhancedUnifiedScoreCalculationService {

  /**
   * Calculate unified HPS for a student in a specific term using dynamic weightages
   * @param {string} studentId - Student UUID
   * @param {string} termId - Term UUID
   * @returns {Object} Complete HPS calculation with breakdown
   */
  async calculateUnifiedHPS(studentId, termId) {
    try {
      console.log(`🔄 Calculating Enhanced Unified HPS for student ${studentId} in term ${termId}`);

      // Get student's batch information
      const studentResult = await query(
        supabase
          .from('students')
          .select('id, batch_id, batches:batch_id(id, name)')
          .eq('id', studentId)
          .limit(1)
      );

      if (!studentResult.rows || studentResult.rows.length === 0) {
        throw new Error('Student not found');
      }

      const student = studentResult.rows[0];
      const batchId = student.batch_id;

      console.log(`📚 Student batch: ${student.batches.name} (${batchId})`);

      // Get dynamic quadrant weightages for this batch-term
      const quadrantWeightages = await enhancedWeightageService.getQuadrantWeightages(batchId, termId);
      console.log(`⚖️ Using ${quadrantWeightages[0]?.source} weightages`);

      // Step 1: Calculate Traditional Component Scores
      const traditionalScores = await this.calculateTraditionalQuadrantScores(studentId, termId, batchId);
      
      // Step 2: Calculate Intervention Microcompetency Scores
      const interventionScores = await this.calculateInterventionQuadrantScores(studentId, termId, batchId);
      
      // Step 3: Combine scores using simple averages (no double counting)
      const unifiedQuadrantScores = await this.combineQuadrantScoresUnified(traditionalScores, interventionScores);
      
      // Step 4: Calculate overall HPS using dynamic weightages
      const totalHPS = this.calculateDynamicWeightedHPS(unifiedQuadrantScores, quadrantWeightages);
      
      // Step 5: Update student_score_summary table
      await this.updateStudentScoreSummary(studentId, termId, unifiedQuadrantScores, totalHPS);
      
      console.log(`✅ Enhanced Unified HPS calculated: ${totalHPS.toFixed(2)}%`);
      
      return {
        success: true,
        studentId,
        termId,
        batchId,
        quadrantScores: unifiedQuadrantScores,
        quadrantWeightages: quadrantWeightages,
        totalHPS: totalHPS,
        grade: this.calculateGrade(totalHPS),
        status: this.calculateStatus(totalHPS),
        weightageSource: quadrantWeightages[0]?.source || 'default_system',
        calculatedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Enhanced Unified HPS calculation error:', error);
      throw new Error(`Failed to calculate enhanced unified HPS: ${error.message}`);
    }
  }

  /**
   * Calculate traditional quadrant scores with dynamic weightages
   * @param {string} studentId - Student UUID
   * @param {string} termId - Term UUID
   * @param {string} batchId - Batch UUID
   * @returns {Object} Quadrant scores from traditional components
   */
  async calculateTraditionalQuadrantScores(studentId, termId, batchId) {
    try {
      console.log(`📊 Calculating traditional quadrant scores with dynamic weightages`);

      // Get component and subcategory weightages for this batch-term
      const subcategoryWeightages = await enhancedWeightageService.getSubcategoryWeightages(batchId, termId);
      
      const scoresResult = await query(
        supabase
          .from('scores')
          .select(`
            obtained_score,
            max_score,
            components:component_id(
              id,
              name,
              weightage,
              sub_categories:sub_category_id(
                id,
                name,
                weightage,
                quadrants:quadrant_id(id, name)
              )
            )
          `)
          .eq('student_id', studentId)
          .eq('term_id', termId)
      );

      const quadrantScores = {};

      // Group scores by quadrant and apply dynamic weightages
      scoresResult.rows.forEach(score => {
        const component = score.components;
        const subcategory = component.sub_categories;
        const quadrant = subcategory.quadrants;
        const quadrantId = quadrant.id;

        if (!quadrantScores[quadrantId]) {
          quadrantScores[quadrantId] = {
            id: quadrant.id,
            name: quadrant.name,
            scores: [],
            weightedScores: [],
            totalObtained: 0,
            totalMax: 0,
            source: 'traditional'
          };
        }

        // Get dynamic subcategory weightage
        const subcategoryWeightage = subcategoryWeightages.find(
          sw => sw.id === subcategory.id
        )?.weightage || subcategory.weightage;

        const percentage = score.max_score > 0 ? (score.obtained_score / score.max_score) * 100 : 0;
        
        // Apply subcategory weightage to the score
        const weightedScore = (percentage * subcategoryWeightage) / 100;
        
        quadrantScores[quadrantId].scores.push(percentage);
        quadrantScores[quadrantId].weightedScores.push(weightedScore);
        quadrantScores[quadrantId].totalObtained += score.obtained_score;
        quadrantScores[quadrantId].totalMax += score.max_score;
      });

      // Calculate weighted averages for each quadrant
      Object.values(quadrantScores).forEach(quadrant => {
        if (quadrant.weightedScores.length > 0) {
          quadrant.averageScore = quadrant.weightedScores.reduce((sum, score) => sum + score, 0);
        } else {
          quadrant.averageScore = 0;
        }
      });

      console.log(`✅ Traditional quadrant scores calculated for ${Object.keys(quadrantScores).length} quadrants`);
      return quadrantScores;

    } catch (error) {
      console.error('❌ Calculate traditional quadrant scores error:', error);
      throw new Error(`Failed to calculate traditional quadrant scores: ${error.message}`);
    }
  }

  /**
   * Calculate intervention quadrant scores with dynamic weightages
   * @param {string} studentId - Student UUID
   * @param {string} termId - Term UUID
   * @param {string} batchId - Batch UUID
   * @returns {Object} Quadrant scores from intervention microcompetencies
   */
  async calculateInterventionQuadrantScores(studentId, termId, batchId) {
    try {
      console.log(`🎯 Calculating intervention quadrant scores with dynamic weightages`);

      const microScoresResult = await query(
        supabase
          .from('microcompetency_scores')
          .select(`
            obtained_score,
            max_score,
            microcompetencies:microcompetency_id(
              id,
              name,
              weightage,
              components:component_id(
                id,
                name,
                weightage,
                sub_categories:sub_category_id(
                  id,
                  name,
                  weightage,
                  quadrants:quadrant_id(id, name)
                )
              )
            )
          `)
          .eq('student_id', studentId)
          .eq('term_id', termId)
      );

      const quadrantScores = {};

      // Group microcompetency scores by quadrant and apply dynamic weightages
      microScoresResult.rows.forEach(score => {
        const microcompetency = score.microcompetencies;
        const component = microcompetency.components;
        const subcategory = component.sub_categories;
        const quadrant = subcategory.quadrants;
        const quadrantId = quadrant.id;

        if (!quadrantScores[quadrantId]) {
          quadrantScores[quadrantId] = {
            id: quadrant.id,
            name: quadrant.name,
            scores: [],
            weightedScores: [],
            totalObtained: 0,
            totalMax: 0,
            source: 'intervention'
          };
        }

        const percentage = score.max_score > 0 ? (score.obtained_score / score.max_score) * 100 : 0;
        
        // Apply hierarchical weightages: microcompetency -> component -> subcategory
        const microWeightage = microcompetency.weightage / 100;
        const componentWeightage = component.weightage / 100;
        const subcategoryWeightage = subcategory.weightage / 100;
        
        const weightedScore = percentage * microWeightage * componentWeightage * subcategoryWeightage;
        
        quadrantScores[quadrantId].scores.push(percentage);
        quadrantScores[quadrantId].weightedScores.push(weightedScore);
        quadrantScores[quadrantId].totalObtained += score.obtained_score;
        quadrantScores[quadrantId].totalMax += score.max_score;
      });

      // Calculate weighted averages for each quadrant
      Object.values(quadrantScores).forEach(quadrant => {
        if (quadrant.weightedScores.length > 0) {
          quadrant.averageScore = quadrant.weightedScores.reduce((sum, score) => sum + score, 0);
        } else {
          quadrant.averageScore = 0;
        }
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
   * Calculate overall HPS using dynamic quadrant weightages
   * @param {Object} quadrantScores - Combined quadrant scores
   * @param {Array} quadrantWeightages - Dynamic quadrant weightages
   * @returns {number} Total HPS percentage
   */
  calculateDynamicWeightedHPS(quadrantScores, quadrantWeightages) {
    const quadrantValues = Object.values(quadrantScores);

    if (quadrantValues.length === 0) {
      return 0;
    }

    let totalWeightedScore = 0;
    let totalWeightage = 0;

    // Apply dynamic weightages
    quadrantWeightages.forEach(weightageConfig => {
      const quadrantScore = quadrantScores[weightageConfig.id];
      if (quadrantScore) {
        const score = quadrantScore.finalScore || 0;
        const weightage = weightageConfig.weightage / 100; // Convert to decimal
        
        totalWeightedScore += score * weightage;
        totalWeightage += weightage;
        
        console.log(`🧮 ${weightageConfig.name}: ${score.toFixed(2)} × ${weightage.toFixed(3)} = ${(score * weightage).toFixed(2)}`);
      }
    });

    const weightedHPS = totalWeightage > 0 ? totalWeightedScore : 0;

    console.log(`🧮 Dynamic Weighted HPS Calculation:
      Total Weighted Score: ${totalWeightedScore.toFixed(2)}
      Total Weightage: ${totalWeightage.toFixed(3)}
      Final Weighted HPS: ${weightedHPS.toFixed(2)}`);

    return weightedHPS;
  }

  /**
   * Calculate grade based on HPS score
   * @param {number} score - HPS score
   * @returns {string} Grade
   */
  calculateGrade(score) {
    if (score >= 90) return 'A+';
    if (score >= 80) return 'A';
    if (score >= 70) return 'B+';
    if (score >= 60) return 'B';
    if (score >= 50) return 'C+';
    if (score >= 40) return 'C';
    if (score >= 30) return 'D';
    return 'F';
  }

  /**
   * Calculate status based on HPS score
   * @param {number} score - HPS score
   * @returns {string} Status
   */
  calculateStatus(score) {
    if (score >= 75) return 'Cleared';
    if (score >= 50) return 'Progress';
    if (score >= 40) return 'ICT';
    return 'Not Cleared';
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
        calculation_version: 3 // Version 3 = Enhanced calculation with dynamic weightages
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
}

module.exports = new EnhancedUnifiedScoreCalculationService();
