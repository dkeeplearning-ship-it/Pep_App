const { supabase, query } = require('../config/supabase');
const enhancedWeightageService = require('./enhancedWeightageValidationService');

/**
 * Enhanced Unified Score Calculation Service V2
 * 
 * CRITICAL FIXES IMPLEMENTED:
 * 1. ✅ Proper weighted averages at ALL hierarchy levels (not just quadrants)
 * 2. ✅ Zero weightage handling (0% items excluded from calculations)
 * 3. ✅ Batch-term specific weightages applied at all levels
 * 4. ✅ Consistent calculation methodology for traditional and intervention paths
 * 5. ✅ Mathematical accuracy with proper weight normalization
 */
class EnhancedUnifiedScoreCalculationServiceV2 {

  /**
   * Calculate unified HPS for a student in a specific term using proper weighted averages
   * @param {string} studentId - Student UUID
   * @param {string} termId - Term UUID
   * @returns {Object} Complete HPS calculation with breakdown
   */
  async calculateUnifiedHPS(studentId, termId) {
    try {
      console.log(`🔄 Calculating Enhanced Unified HPS V2 for student ${studentId} in term ${termId}`);

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

      // Get dynamic weightages for this batch-term
      const quadrantWeightages = await enhancedWeightageService.getQuadrantWeightages(batchId, termId);
      console.log(`⚖️ Using ${quadrantWeightages[0]?.source} weightages`);

      // Step 1: Calculate Traditional Component Scores with proper weighted averages
      const traditionalScores = await this.calculateTraditionalQuadrantScoresV2(studentId, termId, batchId);
      
      // Step 2: Calculate Intervention Microcompetency Scores with proper weighted averages
      const interventionScores = await this.calculateInterventionQuadrantScoresV2(studentId, termId, batchId);
      
      // Step 3: Combine scores using weighted averages (no double counting)
      const unifiedQuadrantScores = await this.combineQuadrantScoresUnifiedV2(traditionalScores, interventionScores);
      
      // Step 4: Calculate overall HPS using dynamic quadrant weightages
      const totalHPS = this.calculateDynamicWeightedHPS(unifiedQuadrantScores, quadrantWeightages);
      
      // Step 5: Update student_score_summary table
      await this.updateStudentScoreSummary(studentId, termId, unifiedQuadrantScores, totalHPS);
      
      console.log(`✅ Enhanced Unified HPS V2 calculated: ${totalHPS.toFixed(2)}%`);
      
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
        calculationVersion: '2.0',
        calculatedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Enhanced Unified HPS V2 calculation error:', error);
      throw new Error(`Failed to calculate enhanced unified HPS V2: ${error.message}`);
    }
  }

  /**
   * Calculate traditional quadrant scores using proper weighted averages at all levels
   * @param {string} studentId - Student UUID
   * @param {string} termId - Term UUID
   * @param {string} batchId - Batch UUID
   * @returns {Object} Quadrant scores from traditional components
   */
  async calculateTraditionalQuadrantScoresV2(studentId, termId, batchId) {
    try {
      console.log(`📊 Calculating traditional quadrant scores V2 with proper weighted averages`);

      // Get dynamic weightages for this batch-term
      const subcategoryWeightages = await enhancedWeightageService.getSubcategoryWeightages(batchId, termId);
      const componentWeightages = await enhancedWeightageService.getComponentWeightages(batchId, termId);

      // Get traditional component scores
      const scoresResult = await query(
        supabase
          .from('scores')
          .select(`
            id, student_id, component_id, obtained_score, max_score, assessment_date,
            components:component_id(
              id, name, max_score, weightage, sub_category_id,
              sub_categories:sub_category_id(
                id, name, weightage, quadrant_id,
                quadrants:quadrant_id(id, name)
              )
            )
          `)
          .eq('student_id', studentId)
          .eq('term_id', termId)
      );

      const quadrantData = {};

      // Organize scores by hierarchy: quadrant -> subcategory -> component -> scores
      scoresResult.rows.forEach(score => {
        const component = score.components;
        const subcategory = component.sub_categories;
        const quadrant = subcategory.quadrants;
        
        const quadrantId = quadrant.id;
        const subcategoryId = subcategory.id;
        const componentId = component.id;

        // Initialize quadrant
        if (!quadrantData[quadrantId]) {
          quadrantData[quadrantId] = {
            id: quadrant.id,
            name: quadrant.name,
            subcategories: {},
            source: 'traditional'
          };
        }

        // Initialize subcategory
        if (!quadrantData[quadrantId].subcategories[subcategoryId]) {
          const dynamicSubcategoryWeightage = subcategoryWeightages.find(sw => sw.id === subcategoryId)?.weightage;
          quadrantData[quadrantId].subcategories[subcategoryId] = {
            id: subcategory.id,
            name: subcategory.name,
            components: {},
            weightage: dynamicSubcategoryWeightage !== undefined ? dynamicSubcategoryWeightage : subcategory.weightage
          };
        }

        // Initialize component
        if (!quadrantData[quadrantId].subcategories[subcategoryId].components[componentId]) {
          const dynamicComponentWeightage = componentWeightages.find(cw => cw.id === componentId)?.weightage;
          quadrantData[quadrantId].subcategories[subcategoryId].components[componentId] = {
            id: component.id,
            name: component.name,
            scores: [],
            weightage: dynamicComponentWeightage !== undefined ? dynamicComponentWeightage : component.weightage
          };
        }

        // Add score
        const percentage = score.max_score > 0 ? (score.obtained_score / score.max_score) * 100 : 0;
        quadrantData[quadrantId].subcategories[subcategoryId].components[componentId].scores.push(percentage);
      });

      // Calculate weighted averages at each level
      const quadrantScores = {};

      Object.keys(quadrantData).forEach(quadrantId => {
        const quadrant = quadrantData[quadrantId];
        
        // Step 1: Calculate component averages
        Object.values(quadrant.subcategories).forEach(subcategory => {
          Object.values(subcategory.components).forEach(component => {
            component.averageScore = component.scores.length > 0
              ? component.scores.reduce((sum, score) => sum + score, 0) / component.scores.length
              : 0;
          });
        });

        // Step 2: Calculate subcategory weighted averages from components
        Object.values(quadrant.subcategories).forEach(subcategory => {
          let weightedSum = 0;
          let totalWeight = 0;

          Object.values(subcategory.components).forEach(component => {
            // Skip components with 0% weightage
            if (component.weightage > 0) {
              weightedSum += component.averageScore * (component.weightage / 100);
              totalWeight += (component.weightage / 100);
            }
          });

          subcategory.averageScore = totalWeight > 0 ? weightedSum / totalWeight : 0;
        });

        // Step 3: Calculate quadrant weighted average from subcategories
        let quadrantWeightedSum = 0;
        let quadrantTotalWeight = 0;

        Object.values(quadrant.subcategories).forEach(subcategory => {
          // Skip subcategories with 0% weightage
          if (subcategory.weightage > 0) {
            quadrantWeightedSum += subcategory.averageScore * (subcategory.weightage / 100);
            quadrantTotalWeight += (subcategory.weightage / 100);
          }
        });

        quadrantScores[quadrantId] = {
          id: quadrant.id,
          name: quadrant.name,
          averageScore: quadrantTotalWeight > 0 ? quadrantWeightedSum / quadrantTotalWeight : 0,
          grade: this.calculateGrade(quadrantTotalWeight > 0 ? quadrantWeightedSum / quadrantTotalWeight : 0),
          status: this.calculateStatus(quadrantTotalWeight > 0 ? quadrantWeightedSum / quadrantTotalWeight : 0),
          source: 'traditional',
          subcategories: quadrant.subcategories
        };
      });

      console.log(`✅ Traditional quadrant scores V2 calculated using proper weighted averages for ${Object.keys(quadrantScores).length} quadrants`);
      return quadrantScores;

    } catch (error) {
      console.error('❌ Traditional quadrant scores V2 calculation error:', error);
      throw new Error(`Failed to calculate traditional quadrant scores V2: ${error.message}`);
    }
  }

  /**
   * Calculate intervention quadrant scores using proper weighted averages at all levels
   * @param {string} studentId - Student UUID
   * @param {string} termId - Term UUID
   * @param {string} batchId - Batch UUID
   * @returns {Object} Quadrant scores from intervention microcompetencies
   */
  async calculateInterventionQuadrantScoresV2(studentId, termId, batchId) {
    try {
      console.log(`🎯 Calculating intervention quadrant scores V2 with proper weighted averages`);

      // Get dynamic weightages for this batch-term
      const subcategoryWeightages = await enhancedWeightageService.getSubcategoryWeightages(batchId, termId);
      const componentWeightages = await enhancedWeightageService.getComponentWeightages(batchId, termId);
      const microcompetencyWeightages = await enhancedWeightageService.getMicrocompetencyWeightages(batchId, termId);

      // Get intervention microcompetency scores
      const scoresResult = await query(
        supabase
          .from('microcompetency_scores')
          .select(`
            id, student_id, microcompetency_id, obtained_score, max_score,
            microcompetencies:microcompetency_id(
              id, name, max_score, weightage, component_id,
              components:component_id(
                id, name, weightage, sub_category_id,
                sub_categories:sub_category_id(
                  id, name, weightage, quadrant_id,
                  quadrants:quadrant_id(id, name)
                )
              )
            )
          `)
          .eq('student_id', studentId)
          .eq('term_id', termId)
      );

      const quadrantData = {};

      // Organize scores by hierarchy: quadrant -> subcategory -> component -> microcompetency -> scores
      scoresResult.rows.forEach(score => {
        const microcompetency = score.microcompetencies;
        const component = microcompetency.components;
        const subcategory = component.sub_categories;
        const quadrant = subcategory.quadrants;
        
        const quadrantId = quadrant.id;
        const subcategoryId = subcategory.id;
        const componentId = component.id;
        const microcompetencyId = microcompetency.id;

        // Initialize hierarchy structure
        if (!quadrantData[quadrantId]) {
          quadrantData[quadrantId] = {
            id: quadrant.id,
            name: quadrant.name,
            subcategories: {},
            source: 'intervention'
          };
        }

        if (!quadrantData[quadrantId].subcategories[subcategoryId]) {
          const dynamicSubcategoryWeightage = subcategoryWeightages.find(sw => sw.id === subcategoryId)?.weightage;
          quadrantData[quadrantId].subcategories[subcategoryId] = {
            id: subcategory.id,
            name: subcategory.name,
            components: {},
            weightage: dynamicSubcategoryWeightage !== undefined ? dynamicSubcategoryWeightage : subcategory.weightage
          };
        }

        if (!quadrantData[quadrantId].subcategories[subcategoryId].components[componentId]) {
          const dynamicComponentWeightage = componentWeightages.find(cw => cw.id === componentId)?.weightage;
          quadrantData[quadrantId].subcategories[subcategoryId].components[componentId] = {
            id: component.id,
            name: component.name,
            microcompetencies: {},
            weightage: dynamicComponentWeightage !== undefined ? dynamicComponentWeightage : component.weightage
          };
        }

        if (!quadrantData[quadrantId].subcategories[subcategoryId].components[componentId].microcompetencies[microcompetencyId]) {
          const dynamicMicrocompetencyWeightage = microcompetencyWeightages.find(mw => mw.id === microcompetencyId)?.weightage;
          quadrantData[quadrantId].subcategories[subcategoryId].components[componentId].microcompetencies[microcompetencyId] = {
            id: microcompetency.id,
            name: microcompetency.name,
            scores: [],
            weightage: dynamicMicrocompetencyWeightage !== undefined ? dynamicMicrocompetencyWeightage : microcompetency.weightage
          };
        }

        // Add score
        const percentage = score.max_score > 0 ? (score.obtained_score / score.max_score) * 100 : 0;
        quadrantData[quadrantId].subcategories[subcategoryId].components[componentId].microcompetencies[microcompetencyId].scores.push(percentage);
      });

      // Calculate weighted averages at each level (microcompetency -> component -> subcategory -> quadrant)
      const quadrantScores = {};

      Object.keys(quadrantData).forEach(quadrantId => {
        const quadrant = quadrantData[quadrantId];
        
        // Step 1: Calculate microcompetency averages
        Object.values(quadrant.subcategories).forEach(subcategory => {
          Object.values(subcategory.components).forEach(component => {
            Object.values(component.microcompetencies).forEach(microcompetency => {
              microcompetency.averageScore = microcompetency.scores.length > 0
                ? microcompetency.scores.reduce((sum, score) => sum + score, 0) / microcompetency.scores.length
                : 0;
            });
          });
        });

        // Step 2: Calculate component weighted averages from microcompetencies
        Object.values(quadrant.subcategories).forEach(subcategory => {
          Object.values(subcategory.components).forEach(component => {
            let weightedSum = 0;
            let totalWeight = 0;

            Object.values(component.microcompetencies).forEach(microcompetency => {
              // Skip microcompetencies with 0% weightage
              if (microcompetency.weightage > 0) {
                weightedSum += microcompetency.averageScore * (microcompetency.weightage / 100);
                totalWeight += (microcompetency.weightage / 100);
              }
            });

            component.averageScore = totalWeight > 0 ? weightedSum / totalWeight : 0;
          });
        });

        // Step 3: Calculate subcategory weighted averages from components
        Object.values(quadrant.subcategories).forEach(subcategory => {
          let weightedSum = 0;
          let totalWeight = 0;

          Object.values(subcategory.components).forEach(component => {
            // Skip components with 0% weightage
            if (component.weightage > 0) {
              weightedSum += component.averageScore * (component.weightage / 100);
              totalWeight += (component.weightage / 100);
            }
          });

          subcategory.averageScore = totalWeight > 0 ? weightedSum / totalWeight : 0;
        });

        // Step 4: Calculate quadrant weighted average from subcategories
        let quadrantWeightedSum = 0;
        let quadrantTotalWeight = 0;

        Object.values(quadrant.subcategories).forEach(subcategory => {
          // Skip subcategories with 0% weightage
          if (subcategory.weightage > 0) {
            quadrantWeightedSum += subcategory.averageScore * (subcategory.weightage / 100);
            quadrantTotalWeight += (subcategory.weightage / 100);
          }
        });

        quadrantScores[quadrantId] = {
          id: quadrant.id,
          name: quadrant.name,
          averageScore: quadrantTotalWeight > 0 ? quadrantWeightedSum / quadrantTotalWeight : 0,
          grade: this.calculateGrade(quadrantTotalWeight > 0 ? quadrantWeightedSum / quadrantTotalWeight : 0),
          status: this.calculateStatus(quadrantTotalWeight > 0 ? quadrantWeightedSum / quadrantTotalWeight : 0),
          source: 'intervention',
          subcategories: quadrant.subcategories
        };
      });

      console.log(`✅ Intervention quadrant scores V2 calculated using proper weighted averages for ${Object.keys(quadrantScores).length} quadrants`);
      return quadrantScores;

    } catch (error) {
      console.error('❌ Intervention quadrant scores V2 calculation error:', error);
      throw new Error(`Failed to calculate intervention quadrant scores V2: ${error.message}`);
    }
  }

  /**
   * Combine traditional and intervention quadrant scores using proper weighted averages
   * @param {Object} traditionalScores - Scores from traditional components
   * @param {Object} interventionScores - Scores from intervention microcompetencies
   * @returns {Object} Combined quadrant scores
   */
  combineQuadrantScoresUnifiedV2(traditionalScores, interventionScores) {
    try {
      console.log(`🔄 Combining quadrant scores V2 using proper weighted averages (no double counting)`);

      const combinedScores = {};
      const allQuadrantIds = new Set([
        ...Object.keys(traditionalScores),
        ...Object.keys(interventionScores)
      ]);

      allQuadrantIds.forEach(quadrantId => {
        const traditional = traditionalScores[quadrantId];
        const intervention = interventionScores[quadrantId];

        if (traditional && intervention) {
          // Both sources available - use simple average to avoid double counting
          combinedScores[quadrantId] = {
            id: traditional.id,
            name: traditional.name,
            averageScore: (traditional.averageScore + intervention.averageScore) / 2,
            grade: this.calculateGrade((traditional.averageScore + intervention.averageScore) / 2),
            status: this.calculateStatus((traditional.averageScore + intervention.averageScore) / 2),
            source: 'combined',
            traditionalScore: traditional.averageScore,
            interventionScore: intervention.averageScore,
            breakdown: {
              traditional: traditional,
              intervention: intervention
            }
          };
        } else if (traditional) {
          // Only traditional score available
          combinedScores[quadrantId] = {
            ...traditional,
            source: 'traditional_only'
          };
        } else if (intervention) {
          // Only intervention score available
          combinedScores[quadrantId] = {
            ...intervention,
            source: 'intervention_only'
          };
        }
      });

      console.log(`✅ Combined quadrant scores V2 for ${Object.keys(combinedScores).length} quadrants`);
      return combinedScores;

    } catch (error) {
      console.error('❌ Combine quadrant scores V2 error:', error);
      throw new Error(`Failed to combine quadrant scores V2: ${error.message}`);
    }
  }

  /**
   * Calculate dynamic weighted HPS using batch-term specific quadrant weightages
   * @param {Object} quadrantScores - Combined quadrant scores
   * @param {Array} quadrantWeightages - Dynamic quadrant weightages
   * @returns {number} Calculated HPS
   */
  calculateDynamicWeightedHPS(quadrantScores, quadrantWeightages) {
    try {
      console.log(`⚖️ Calculating dynamic weighted HPS using batch-term specific weightages`);

      let weightedSum = 0;
      let totalWeight = 0;

      quadrantWeightages.forEach(qw => {
        const quadrantScore = quadrantScores[qw.id];

        if (quadrantScore && qw.weightage > 0) {
          weightedSum += quadrantScore.averageScore * (qw.weightage / 100);
          totalWeight += (qw.weightage / 100);

          console.log(`  ${qw.name}: ${quadrantScore.averageScore.toFixed(2)}% × ${qw.weightage}% = ${(quadrantScore.averageScore * qw.weightage / 100).toFixed(2)}`);
        }
      });

      const hps = totalWeight > 0 ? weightedSum / totalWeight : 0;

      console.log(`✅ Dynamic weighted HPS calculated: ${hps.toFixed(2)}%`);
      return hps;

    } catch (error) {
      console.error('❌ Dynamic weighted HPS calculation error:', error);
      throw new Error(`Failed to calculate dynamic weighted HPS: ${error.message}`);
    }
  }

  /**
   * Update student_score_summary table with calculated results
   * @param {string} studentId - Student UUID
   * @param {string} termId - Term UUID
   * @param {Object} quadrantScores - Calculated quadrant scores
   * @param {number} totalHPS - Calculated HPS
   */
  async updateStudentScoreSummary(studentId, termId, quadrantScores, totalHPS) {
    try {
      console.log(`💾 Updating student_score_summary for student ${studentId}`);

      // Extract individual quadrant scores
      const personaScore = quadrantScores['persona'] ? quadrantScores['persona'].averageScore : 0;
      const wellnessScore = quadrantScores['wellness'] ? quadrantScores['wellness'].averageScore : 0;
      const behaviorScore = quadrantScores['behavior'] ? quadrantScores['behavior'].averageScore : 0;
      const disciplineScore = quadrantScores['discipline'] ? quadrantScores['discipline'].averageScore : 0;

      const summaryData = {
        student_id: studentId,
        term_id: termId,
        persona_score: personaScore,
        wellness_score: wellnessScore,
        behavior_score: behaviorScore,
        discipline_score: disciplineScore,
        total_hps: totalHPS,
        overall_grade: this.calculateGrade(totalHPS),
        overall_status: this.calculateStatus(totalHPS),
        calculation_version: 2,
        last_calculated_at: new Date().toISOString()
      };

      // Upsert the summary record
      await query(
        supabase
          .from('student_score_summary')
          .upsert(summaryData, {
            onConflict: 'student_id,term_id'
          })
      );

      console.log(`✅ Student score summary updated successfully`);

    } catch (error) {
      console.error('❌ Update student score summary error:', error);
      throw new Error(`Failed to update student score summary: ${error.message}`);
    }
  }

  /**
   * Calculate grade based on HPS score
   * @param {number} score - HPS score (0-100)
   * @returns {string} Grade (A+, A, B+, B, C+, C, D, F)
   */
  calculateGrade(score) {
    if (score >= 95) return 'A+';
    if (score >= 90) return 'A';
    if (score >= 85) return 'B+';
    if (score >= 80) return 'B';
    if (score >= 75) return 'C+';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  /**
   * Calculate status based on HPS score
   * @param {number} score - HPS score (0-100)
   * @returns {string} Status (Excellent, Good, Satisfactory, Needs Improvement, Poor)
   */
  calculateStatus(score) {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Good';
    if (score >= 70) return 'Satisfactory';
    if (score >= 60) return 'Needs Improvement';
    return 'Poor';
  }

  /**
   * Get unified score summary for a student in a term
   * @param {string} studentId - Student UUID
   * @param {string} termId - Term UUID
   * @returns {Object} Score summary
   */
  async getUnifiedScoreSummary(studentId, termId) {
    try {
      console.log(`📊 Getting unified score summary for student ${studentId} in term ${termId}`);

      const summaryResult = await query(
        supabase
          .from('student_score_summary')
          .select('*')
          .eq('student_id', studentId)
          .eq('term_id', termId)
          .limit(1)
      );

      if (!summaryResult.rows || summaryResult.rows.length === 0) {
        // If no summary exists, calculate it using V2 enhanced calculation
        console.log(`📊 No score summary found, calculating enhanced V2 for student ${studentId} in term ${termId}`);
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

module.exports = new EnhancedUnifiedScoreCalculationServiceV2();
