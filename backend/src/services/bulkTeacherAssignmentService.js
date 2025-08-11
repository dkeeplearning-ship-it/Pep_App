const { supabase, query } = require('../config/supabase');

/**
 * Bulk Teacher Assignment Service
 * Handles bulk assignment of teachers to interventions with various criteria
 */
class BulkTeacherAssignmentService {
  constructor() {
    this.maxTeachersPerIntervention = 10; // Configurable limit
  }

  /**
   * Assign multiple teachers to multiple interventions
   * @param {Array} assignments - Array of {interventionId, teacherIds, role, microcompetencyIds}
   * @param {string} assignedBy - Admin user ID
   * @returns {Promise<Object>} Assignment result
   */
  async bulkAssignTeachers(assignments, assignedBy) {
    try {
      console.log(`📝 Processing bulk teacher assignments for ${assignments.length} interventions`);

      const results = [];
      const errors = [];

      for (const assignment of assignments) {
        try {
          const result = await this.assignTeachersToIntervention(
            assignment.interventionId,
            assignment.teacherIds,
            assignedBy,
            assignment.role || 'Assistant',
            assignment.microcompetencyIds || []
          );

          if (result.success) {
            results.push({
              interventionId: assignment.interventionId,
              assignedTeachers: result.assignedTeachers,
              message: result.message
            });
          } else {
            errors.push({
              interventionId: assignment.interventionId,
              error: result.error,
              message: result.message
            });
          }
        } catch (error) {
          errors.push({
            interventionId: assignment.interventionId,
            error: 'ASSIGNMENT_FAILED',
            message: error.message
          });
        }
      }

      const successCount = results.length;
      const errorCount = errors.length;

      console.log(`✅ Bulk assignment complete: ${successCount} successful, ${errorCount} failed`);

      return {
        success: errorCount === 0,
        successCount,
        errorCount,
        results,
        errors,
        message: `Bulk assignment complete: ${successCount} successful, ${errorCount} failed`
      };

    } catch (error) {
      console.error('❌ Error in bulk teacher assignment:', error.message);
      return {
        success: false,
        error: 'BULK_ASSIGNMENT_FAILED',
        message: 'Failed to process bulk teacher assignments'
      };
    }
  }

  /**
   * Assign teachers to a single intervention
   * @param {string} interventionId - Intervention ID
   * @param {Array} teacherIds - Array of teacher IDs
   * @param {string} assignedBy - Admin user ID
   * @param {string} role - Teacher role (Lead, Assistant, Observer)
   * @param {Array} microcompetencyIds - Array of microcompetency IDs
   * @returns {Promise<Object>} Assignment result
   */
  async assignTeachersToIntervention(interventionId, teacherIds, assignedBy, role = 'Assistant', microcompetencyIds = []) {
    try {
      // Validate intervention exists
      const interventionCheck = await query(
        supabase
          .from('interventions')
          .select('id, name, status')
          .eq('id', interventionId)
          .limit(1)
      );

      if (!interventionCheck.rows || interventionCheck.rows.length === 0) {
        return {
          success: false,
          error: 'INTERVENTION_NOT_FOUND',
          message: 'Intervention not found'
        };
      }

      const intervention = interventionCheck.rows[0];

      // Check current teacher count
      const currentTeachersResult = await query(
        supabase
          .from('intervention_teachers')
          .select('teacher_id')
          .eq('intervention_id', interventionId)
          .eq('is_active', true)
      );

      const currentTeacherCount = currentTeachersResult.rows ? currentTeachersResult.rows.length : 0;
      const newTeacherCount = teacherIds.length;

      if (currentTeacherCount + newTeacherCount > this.maxTeachersPerIntervention) {
        return {
          success: false,
          error: 'TOO_MANY_TEACHERS',
          message: `Cannot assign ${newTeacherCount} teachers. Current: ${currentTeacherCount}, Max: ${this.maxTeachersPerIntervention}`
        };
      }

      // Validate teachers exist and are active
      const teachersCheck = await query(
        supabase
          .from('teachers')
          .select('id, name, is_active')
          .in('id', teacherIds)
          .eq('is_active', true)
      );

      const validTeachers = teachersCheck.rows || [];
      const validTeacherIds = validTeachers.map(t => t.id);
      const invalidTeacherIds = teacherIds.filter(id => !validTeacherIds.includes(id));

      if (invalidTeacherIds.length > 0) {
        return {
          success: false,
          error: 'INVALID_TEACHERS',
          message: `Invalid or inactive teacher IDs: ${invalidTeacherIds.join(', ')}`
        };
      }

      // Check for existing assignments
      const existingAssignmentsResult = await query(
        supabase
          .from('intervention_teachers')
          .select('teacher_id')
          .eq('intervention_id', interventionId)
          .in('teacher_id', teacherIds)
          .eq('is_active', true)
      );

      const existingTeacherIds = existingAssignmentsResult.rows 
        ? existingAssignmentsResult.rows.map(a => a.teacher_id)
        : [];

      const newTeacherIds = teacherIds.filter(id => !existingTeacherIds.includes(id));

      if (newTeacherIds.length === 0) {
        return {
          success: false,
          error: 'ALREADY_ASSIGNED',
          message: 'All specified teachers are already assigned to this intervention'
        };
      }

      // Create assignments
      const assignments = newTeacherIds.map(teacherId => ({
        intervention_id: interventionId,
        teacher_id: teacherId,
        role: role,
        microcompetency_ids: microcompetencyIds,
        assigned_by: assignedBy,
        assigned_at: new Date().toISOString(),
        is_active: true
      }));

      const assignmentResult = await query(
        supabase
          .from('intervention_teachers')
          .insert(assignments)
          .select(`
            id, teacher_id, role,
            teachers:teacher_id(id, name)
          `)
      );

      const assignedTeachers = assignmentResult.rows || [];

      console.log(`✅ Assigned ${assignedTeachers.length} teachers to intervention ${intervention.name}`);

      return {
        success: true,
        assignedTeachers,
        skippedTeachers: existingTeacherIds,
        message: `Successfully assigned ${assignedTeachers.length} teachers to ${intervention.name}`
      };

    } catch (error) {
      console.error('❌ Error assigning teachers to intervention:', error.message);
      return {
        success: false,
        error: 'ASSIGNMENT_FAILED',
        message: 'Failed to assign teachers to intervention'
      };
    }
  }

  /**
   * Assign teachers by criteria (department, specialization, etc.)
   * @param {string} interventionId - Intervention ID
   * @param {Object} criteria - Assignment criteria
   * @param {string} assignedBy - Admin user ID
   * @returns {Promise<Object>} Assignment result
   */
  async assignTeachersByCriteria(interventionId, criteria, assignedBy) {
    try {
      console.log(`📝 Assigning teachers by criteria to intervention ${interventionId}`);

      // Build teacher query based on criteria
      let teacherQuery = supabase
        .from('teachers')
        .select('id, name, department, specialization, is_active')
        .eq('is_active', true);

      if (criteria.department) {
        teacherQuery = teacherQuery.eq('department', criteria.department);
      }

      if (criteria.specialization) {
        teacherQuery = teacherQuery.eq('specialization', criteria.specialization);
      }

      if (criteria.excludeTeacherIds && criteria.excludeTeacherIds.length > 0) {
        teacherQuery = teacherQuery.not('id', 'in', `(${criteria.excludeTeacherIds.join(',')})`);
      }

      if (criteria.limit) {
        teacherQuery = teacherQuery.limit(criteria.limit);
      }

      const teachersResult = await query(teacherQuery);
      const eligibleTeachers = teachersResult.rows || [];

      if (eligibleTeachers.length === 0) {
        return {
          success: false,
          error: 'NO_ELIGIBLE_TEACHERS',
          message: 'No teachers found matching the specified criteria'
        };
      }

      const teacherIds = eligibleTeachers.map(t => t.id);

      // Assign the teachers
      const result = await this.assignTeachersToIntervention(
        interventionId,
        teacherIds,
        assignedBy,
        criteria.role || 'Assistant',
        criteria.microcompetencyIds || []
      );

      return {
        ...result,
        eligibleTeachers,
        criteria
      };

    } catch (error) {
      console.error('❌ Error assigning teachers by criteria:', error.message);
      return {
        success: false,
        error: 'CRITERIA_ASSIGNMENT_FAILED',
        message: 'Failed to assign teachers by criteria'
      };
    }
  }

  /**
   * Remove teachers from interventions in bulk
   * @param {Array} removals - Array of {interventionId, teacherIds}
   * @param {string} removedBy - Admin user ID
   * @returns {Promise<Object>} Removal result
   */
  async bulkRemoveTeachers(removals, removedBy) {
    try {
      console.log(`📝 Processing bulk teacher removals for ${removals.length} interventions`);

      const results = [];
      const errors = [];

      for (const removal of removals) {
        try {
          const result = await this.removeTeachersFromIntervention(
            removal.interventionId,
            removal.teacherIds,
            removedBy
          );

          if (result.success) {
            results.push({
              interventionId: removal.interventionId,
              removedTeachers: result.removedTeachers,
              message: result.message
            });
          } else {
            errors.push({
              interventionId: removal.interventionId,
              error: result.error,
              message: result.message
            });
          }
        } catch (error) {
          errors.push({
            interventionId: removal.interventionId,
            error: 'REMOVAL_FAILED',
            message: error.message
          });
        }
      }

      const successCount = results.length;
      const errorCount = errors.length;

      console.log(`✅ Bulk removal complete: ${successCount} successful, ${errorCount} failed`);

      return {
        success: errorCount === 0,
        successCount,
        errorCount,
        results,
        errors,
        message: `Bulk removal complete: ${successCount} successful, ${errorCount} failed`
      };

    } catch (error) {
      console.error('❌ Error in bulk teacher removal:', error.message);
      return {
        success: false,
        error: 'BULK_REMOVAL_FAILED',
        message: 'Failed to process bulk teacher removals'
      };
    }
  }

  /**
   * Remove teachers from a single intervention
   * @param {string} interventionId - Intervention ID
   * @param {Array} teacherIds - Array of teacher IDs
   * @param {string} removedBy - Admin user ID
   * @returns {Promise<Object>} Removal result
   */
  async removeTeachersFromIntervention(interventionId, teacherIds, removedBy) {
    try {
      // Deactivate assignments
      const removalResult = await query(
        supabase
          .from('intervention_teachers')
          .update({
            is_active: false,
            removed_by: removedBy,
            removed_at: new Date().toISOString()
          })
          .eq('intervention_id', interventionId)
          .in('teacher_id', teacherIds)
          .eq('is_active', true)
          .select(`
            id, teacher_id,
            teachers:teacher_id(id, name)
          `)
      );

      const removedTeachers = removalResult.rows || [];

      console.log(`✅ Removed ${removedTeachers.length} teachers from intervention`);

      return {
        success: true,
        removedTeachers,
        message: `Successfully removed ${removedTeachers.length} teachers from intervention`
      };

    } catch (error) {
      console.error('❌ Error removing teachers from intervention:', error.message);
      return {
        success: false,
        error: 'REMOVAL_FAILED',
        message: 'Failed to remove teachers from intervention'
      };
    }
  }

  /**
   * Get assignment statistics
   * @returns {Promise<Object>} Assignment statistics
   */
  async getAssignmentStatistics() {
    try {
      const [
        totalTeachersResult,
        assignedTeachersResult,
        interventionsResult,
        assignmentsResult
      ] = await Promise.all([
        query(supabase.from('teachers').select('id').eq('is_active', true)),
        query(supabase.from('intervention_teachers').select('teacher_id').eq('is_active', true)),
        query(supabase.from('interventions').select('id').eq('status', 'Active')),
        query(supabase.from('intervention_teachers').select('*').eq('is_active', true))
      ]);

      const totalTeachers = totalTeachersResult.rows ? totalTeachersResult.rows.length : 0;
      const uniqueAssignedTeachers = assignedTeachersResult.rows 
        ? new Set(assignedTeachersResult.rows.map(a => a.teacher_id)).size 
        : 0;
      const activeInterventions = interventionsResult.rows ? interventionsResult.rows.length : 0;
      const totalAssignments = assignmentsResult.rows ? assignmentsResult.rows.length : 0;

      const unassignedTeachers = totalTeachers - uniqueAssignedTeachers;
      const averageTeachersPerIntervention = activeInterventions > 0 
        ? (totalAssignments / activeInterventions).toFixed(2) 
        : 0;

      return {
        success: true,
        statistics: {
          totalTeachers,
          assignedTeachers: uniqueAssignedTeachers,
          unassignedTeachers,
          activeInterventions,
          totalAssignments,
          averageTeachersPerIntervention: parseFloat(averageTeachersPerIntervention),
          assignmentRate: totalTeachers > 0 ? ((uniqueAssignedTeachers / totalTeachers) * 100).toFixed(1) : 0
        }
      };

    } catch (error) {
      console.error('❌ Error getting assignment statistics:', error.message);
      return {
        success: false,
        error: 'STATISTICS_FAILED',
        message: 'Failed to get assignment statistics'
      };
    }
  }
}

module.exports = new BulkTeacherAssignmentService();
