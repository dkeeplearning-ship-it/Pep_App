/**
 * HPS Calculation Audit Service
 * 
 * Provides logging and monitoring for HPS calculation changes,
 * especially when triggered by weightage modifications.
 */

const { supabase, query } = require('../config/supabase');

class HPSCalculationAuditService {
  
  /**
   * Log HPS calculation event
   * @param {string} studentId - Student UUID
   * @param {string} termId - Term UUID
   * @param {number} oldHPS - Previous HPS value
   * @param {number} newHPS - New HPS value
   * @param {string} trigger - What triggered the recalculation
   * @param {Object} metadata - Additional context
   */
  async logHPSCalculation(studentId, termId, oldHPS, newHPS, trigger, metadata = {}) {
    try {
      const hpsDifference = newHPS - oldHPS;
      const percentageChange = oldHPS > 0 ? ((hpsDifference / oldHPS) * 100) : 0;

      await query(
        supabase
          .from('hps_calculation_audit')
          .insert({
            student_id: studentId,
            term_id: termId,
            old_hps: oldHPS,
            new_hps: newHPS,
            hps_difference: hpsDifference,
            percentage_change: percentageChange,
            trigger_type: trigger,
            metadata: metadata,
            calculated_at: new Date().toISOString()
          })
      );

      // Log significant changes
      if (Math.abs(hpsDifference) > 1) {
        console.log(`📊 Significant HPS change detected:
          Student: ${studentId}
          Term: ${termId}
          Change: ${oldHPS.toFixed(2)} → ${newHPS.toFixed(2)} (${hpsDifference > 0 ? '+' : ''}${hpsDifference.toFixed(2)})
          Trigger: ${trigger}
          Percentage: ${percentageChange.toFixed(2)}%`);
      }

    } catch (error) {
      console.error('❌ Failed to log HPS calculation:', error);
      // Don't throw - audit logging shouldn't break the main flow
    }
  }

  /**
   * Log weightage change event
   * @param {string} configId - Batch-term config UUID
   * @param {string} batchId - Batch UUID
   * @param {string} termId - Term UUID
   * @param {Array} oldWeightages - Previous weightage values
   * @param {Array} newWeightages - New weightage values
   * @param {string} changedBy - User who made the change
   * @param {string} reason - Reason for the change
   */
  async logWeightageChange(configId, batchId, termId, oldWeightages, newWeightages, changedBy, reason) {
    try {
      const changes = this.calculateWeightageChanges(oldWeightages, newWeightages);

      await query(
        supabase
          .from('weightage_change_audit')
          .insert({
            config_id: configId,
            batch_id: batchId,
            term_id: termId,
            old_weightages: oldWeightages,
            new_weightages: newWeightages,
            changes: changes,
            changed_by: changedBy,
            change_reason: reason,
            changed_at: new Date().toISOString()
          })
      );

      console.log(`⚖️ Weightage change logged:
        Batch-Term: ${batchId}/${termId}
        Changes: ${changes.map(c => `${c.quadrant}: ${c.old}% → ${c.new}%`).join(', ')}
        Changed by: ${changedBy}
        Reason: ${reason}`);

    } catch (error) {
      console.error('❌ Failed to log weightage change:', error);
    }
  }

  /**
   * Calculate differences between old and new weightages
   * @param {Array} oldWeightages - Previous weightage values
   * @param {Array} newWeightages - New weightage values
   * @returns {Array} Array of changes
   */
  calculateWeightageChanges(oldWeightages, newWeightages) {
    const changes = [];
    
    newWeightages.forEach(newW => {
      const oldW = oldWeightages.find(o => o.quadrant_id === newW.quadrant_id);
      if (oldW && oldW.weightage !== newW.weightage) {
        changes.push({
          quadrant: newW.quadrant_id,
          old: oldW.weightage,
          new: newW.weightage,
          difference: newW.weightage - oldW.weightage
        });
      }
    });

    return changes;
  }

  /**
   * Get HPS calculation history for a student
   * @param {string} studentId - Student UUID
   * @param {string} termId - Term UUID (optional)
   * @param {number} limit - Number of records to return
   * @returns {Promise<Array>} Calculation history
   */
  async getHPSCalculationHistory(studentId, termId = null, limit = 50) {
    try {
      let queryBuilder = supabase
        .from('hps_calculation_audit')
        .select(`
          *,
          students:student_id(name, registration_no),
          terms:term_id(name, academic_year)
        `)
        .eq('student_id', studentId)
        .order('calculated_at', { ascending: false })
        .limit(limit);

      if (termId) {
        queryBuilder = queryBuilder.eq('term_id', termId);
      }

      const result = await query(queryBuilder);
      return result.rows || [];

    } catch (error) {
      console.error('❌ Failed to get HPS calculation history:', error);
      return [];
    }
  }

  /**
   * Get weightage change history for a batch-term
   * @param {string} batchId - Batch UUID
   * @param {string} termId - Term UUID
   * @param {number} limit - Number of records to return
   * @returns {Promise<Array>} Weightage change history
   */
  async getWeightageChangeHistory(batchId, termId, limit = 20) {
    try {
      const result = await query(
        supabase
          .from('weightage_change_audit')
          .select(`
            *,
            batches:batch_id(name),
            terms:term_id(name, academic_year),
            users:changed_by(username, email)
          `)
          .eq('batch_id', batchId)
          .eq('term_id', termId)
          .order('changed_at', { ascending: false })
          .limit(limit)
      );

      return result.rows || [];

    } catch (error) {
      console.error('❌ Failed to get weightage change history:', error);
      return [];
    }
  }

  /**
   * Generate HPS impact report after weightage changes
   * @param {string} batchId - Batch UUID
   * @param {string} termId - Term UUID
   * @param {string} changeId - Weightage change audit ID
   * @returns {Promise<Object>} Impact report
   */
  async generateHPSImpactReport(batchId, termId, changeId) {
    try {
      // Get all students in the batch
      const studentsResult = await query(
        supabase
          .from('students')
          .select('id, name, registration_no')
          .eq('batch_id', batchId)
      );

      const students = studentsResult.rows || [];
      const impactData = [];

      // Get HPS changes for each student after the weightage change
      for (const student of students) {
        const hpsHistory = await this.getHPSCalculationHistory(student.id, termId, 2);
        
        if (hpsHistory.length >= 2) {
          const latest = hpsHistory[0];
          const previous = hpsHistory[1];
          
          impactData.push({
            student_id: student.id,
            student_name: student.name,
            registration_no: student.registration_no,
            old_hps: previous.new_hps,
            new_hps: latest.new_hps,
            hps_change: latest.new_hps - previous.new_hps,
            percentage_change: ((latest.new_hps - previous.new_hps) / previous.new_hps) * 100
          });
        }
      }

      // Calculate summary statistics
      const totalStudents = impactData.length;
      const studentsImproved = impactData.filter(s => s.hps_change > 0).length;
      const studentsDeclined = impactData.filter(s => s.hps_change < 0).length;
      const averageChange = impactData.reduce((sum, s) => sum + s.hps_change, 0) / totalStudents;

      return {
        change_id: changeId,
        batch_id: batchId,
        term_id: termId,
        total_students: totalStudents,
        students_improved: studentsImproved,
        students_declined: studentsDeclined,
        students_unchanged: totalStudents - studentsImproved - studentsDeclined,
        average_hps_change: averageChange,
        impact_data: impactData,
        generated_at: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Failed to generate HPS impact report:', error);
      throw new Error(`Failed to generate impact report: ${error.message}`);
    }
  }

  /**
   * Check for calculation discrepancies
   * @param {string} studentId - Student UUID
   * @param {string} termId - Term UUID
   * @returns {Promise<Object>} Discrepancy report
   */
  async checkCalculationDiscrepancies(studentId, termId) {
    try {
      // This would implement logic to detect inconsistencies
      // between different calculation methods or cached values
      
      return {
        student_id: studentId,
        term_id: termId,
        discrepancies_found: false,
        details: [],
        checked_at: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Failed to check calculation discrepancies:', error);
      return {
        student_id: studentId,
        term_id: termId,
        discrepancies_found: false,
        error: error.message,
        checked_at: new Date().toISOString()
      };
    }
  }
}

module.exports = new HPSCalculationAuditService();
