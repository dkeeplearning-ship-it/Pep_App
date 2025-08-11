const { supabase, query } = require('../config/supabase');

/**
 * Role Management Service
 * Handles user role management, promotions, and audit logging
 */
class RoleService {
  constructor() {
    this.validRoles = ['admin', 'teacher', 'student'];
    this.roleHierarchy = {
      admin: 3,
      teacher: 2,
      student: 1
    };
  }

  /**
   * Get user by ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} User data
   */
  async getUser(userId) {
    const result = await query(
      supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .limit(1)
    );

    return result.rows && result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Log admin action for audit trail
   * @param {string} adminId - Admin user ID
   * @param {string} action - Action performed
   * @param {string} targetUserId - Target user ID (optional)
   * @param {Object} details - Action details
   * @param {string} ipAddress - IP address
   * @param {string} userAgent - User agent
   * @returns {Promise<void>}
   */
  async logAdminAction(adminId, action, targetUserId = null, details = {}, ipAddress = null, userAgent = null) {
    try {
      await query(
        supabase
          .from('admin_audit_log')
          .insert({
            admin_id: adminId,
            action,
            target_user_id: targetUserId,
            old_value: details.oldValue || null,
            new_value: details.newValue || null,
            reason: details.reason || null,
            ip_address: ipAddress,
            user_agent: userAgent,
            created_at: new Date().toISOString()
          })
      );
    } catch (error) {
      console.error('❌ Error logging admin action:', error.message);
    }
  }

  /**
   * Promote or change user role
   * @param {string} adminId - Admin performing the action
   * @param {string} targetUserId - User to promote/change
   * @param {string} newRole - New role to assign
   * @param {string} reason - Reason for role change
   * @param {string} ipAddress - IP address
   * @param {string} userAgent - User agent
   * @returns {Promise<Object>} Role change result
   */
  async changeUserRole(adminId, targetUserId, newRole, reason, ipAddress = null, userAgent = null) {
    try {
      console.log(`🔄 RoleService: Changing user ${targetUserId} role to ${newRole}`);

      // Validate admin permissions
      const admin = await this.getUser(adminId);
      if (!admin || admin.role !== 'admin') {
        return {
          success: false,
          error: 'INSUFFICIENT_PERMISSIONS',
          message: 'Only admins can change user roles'
        };
      }

      // Validate new role
      if (!this.validRoles.includes(newRole)) {
        return {
          success: false,
          error: 'INVALID_ROLE',
          message: `Invalid role: ${newRole}. Valid roles are: ${this.validRoles.join(', ')}`
        };
      }

      // Get target user
      const targetUser = await this.getUser(targetUserId);
      if (!targetUser) {
        return {
          success: false,
          error: 'USER_NOT_FOUND',
          message: 'Target user not found'
        };
      }

      // Prevent self-demotion from admin
      if (adminId === targetUserId && targetUser.role === 'admin' && newRole !== 'admin') {
        return {
          success: false,
          error: 'SELF_DEMOTION_FORBIDDEN',
          message: 'Cannot demote yourself from admin role'
        };
      }

      const oldRole = targetUser.role;

      // Update user role
      const updateResult = await query(
        supabase
          .from('users')
          .update({
            role: newRole,
            promoted_by: adminId,
            promoted_at: new Date().toISOString(),
            promotion_reason: reason
          })
          .eq('id', targetUserId)
          .select('*')
      );

      if (!updateResult.rows || updateResult.rows.length === 0) {
        throw new Error('Failed to update user role in database');
      }

      const updatedUser = updateResult.rows[0];

      // Handle role-specific table entries
      const roleTableResult = await this.handleRoleSpecificTables(targetUserId, oldRole, newRole, updatedUser);

      // Log the action
      await this.logAdminAction(adminId, 'role_change', targetUserId, {
        oldValue: { role: oldRole },
        newValue: { role: newRole },
        reason,
        roleTableChanges: roleTableResult
      }, ipAddress, userAgent);

      console.log(`✅ RoleService: Successfully changed user ${targetUserId} role from ${oldRole} to ${newRole}`);
      if (roleTableResult.changes.length > 0) {
        console.log(`✅ RoleService: Role-specific table changes:`, roleTableResult.changes);
      }

      return {
        success: true,
        message: `User role changed from ${oldRole} to ${newRole}`,
        user: updatedUser,
        changes: {
          oldRole,
          newRole,
          changedBy: admin.username,
          reason,
          timestamp: new Date().toISOString(),
          roleTableChanges: roleTableResult
        }
      };

    } catch (error) {
      console.error('❌ RoleService Error:', error.message);
      return {
        success: false,
        error: 'ROLE_CHANGE_FAILED',
        message: 'Failed to change user role'
      };
    }
  }

  /**
   * Handle role-specific table entries when user role changes
   * @param {string} userId - User ID
   * @param {string} oldRole - Previous role
   * @param {string} newRole - New role
   * @param {Object} userData - User data
   * @returns {Promise<Object>} Role table changes result
   */
  async handleRoleSpecificTables(userId, oldRole, newRole, userData) {
    const changes = [];
    const errors = [];

    try {
      console.log(`🔄 RoleService: Handling role-specific tables for user ${userId}: ${oldRole} → ${newRole}`);

      // Get current term for students
      let currentTermId = null;
      if (newRole === 'student') {
        const currentTermResult = await query(
          supabase
            .from('terms')
            .select('id')
            .eq('is_current', true)
            .limit(1)
        );
        if (currentTermResult.rows && currentTermResult.rows.length > 0) {
          currentTermId = currentTermResult.rows[0].id;
        }
      }

      // Handle new role requirements
      if (newRole === 'student') {
        await this.ensureStudentRecord(userId, userData, currentTermId, changes, errors);
      } else if (newRole === 'teacher') {
        await this.ensureTeacherRecord(userId, userData, changes, errors);
      }

      // Handle old role cleanup (optional - you might want to keep historical data)
      // For now, we'll just deactivate rather than delete
      if (oldRole === 'teacher' && newRole !== 'teacher') {
        await this.deactivateTeacherRecord(userId, changes, errors);
      }

      return {
        success: errors.length === 0,
        changes,
        errors,
        message: `Role-specific table changes: ${changes.length} successful, ${errors.length} failed`
      };

    } catch (error) {
      console.error('❌ RoleService: Error handling role-specific tables:', error.message);
      return {
        success: false,
        changes,
        errors: [...errors, { action: 'role_table_handling', error: error.message }],
        message: 'Failed to handle role-specific table changes'
      };
    }
  }

  /**
   * Bulk role update
   * @param {string} adminId - Admin performing the action
   * @param {Array} userUpdates - Array of {userId, newRole, reason}
   * @param {string} ipAddress - IP address
   * @param {string} userAgent - User agent
   * @returns {Promise<Object>} Bulk update result
   */
  async bulkRoleUpdate(adminId, userUpdates, ipAddress = null, userAgent = null) {
    try {
      console.log(`🔄 RoleService: Bulk role update for ${userUpdates.length} users`);

      const results = [];
      const errors = [];

      for (const update of userUpdates) {
        const result = await this.changeUserRole(
          adminId, 
          update.userId, 
          update.newRole, 
          update.reason || 'Bulk role update',
          ipAddress,
          userAgent
        );

        if (result.success) {
          results.push(result);
        } else {
          errors.push({
            userId: update.userId,
            error: result.error,
            message: result.message
          });
        }
      }

      console.log(`✅ RoleService: Bulk update completed. ${results.length} successful, ${errors.length} failed`);

      return {
        success: true,
        message: `Bulk role update completed. ${results.length} successful, ${errors.length} failed`,
        successful: results,
        failed: errors,
        summary: {
          total: userUpdates.length,
          successful: results.length,
          failed: errors.length
        }
      };

    } catch (error) {
      console.error('❌ RoleService Bulk Update Error:', error.message);
      return {
        success: false,
        error: 'BULK_UPDATE_FAILED',
        message: 'Failed to perform bulk role update'
      };
    }
  }

  /**
   * Ensure student record exists and is properly configured
   */
  async ensureStudentRecord(userId, userData, currentTermId, changes, errors) {
    try {
      // Check if student record already exists
      const existingStudent = await query(
        supabase
          .from('students')
          .select('*')
          .eq('user_id', userId)
          .limit(1)
      );

      if (existingStudent.rows && existingStudent.rows.length > 0) {
        // Update existing student record
        const updateData = {
          name: `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || userData.username,
          status: 'Active',
          updated_at: new Date().toISOString()
        };

        // Add current_term_id if available
        if (currentTermId) {
          updateData.current_term_id = currentTermId;
        }

        const updateResult = await query(
          supabase
            .from('students')
            .update(updateData)
            .eq('user_id', userId)
            .select('*')
        );

        if (updateResult.rows && updateResult.rows.length > 0) {
          changes.push({
            action: 'student_updated',
            table: 'students',
            record_id: updateResult.rows[0].id,
            details: 'Updated existing student record'
          });
          console.log(`✅ RoleService: Updated existing student record for user ${userId}`);
        }
      } else {
        // Create new student record
        const newStudentData = {
          user_id: userId,
          registration_no: `REG-${Date.now()}`, // Generate temporary registration number
          name: `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || userData.username,
          course: 'PGDM', // Default course
          status: 'Active'
        };

        // Add current_term_id if available
        if (currentTermId) {
          newStudentData.current_term_id = currentTermId;
        }

        const insertResult = await query(
          supabase
            .from('students')
            .insert(newStudentData)
            .select('*')
        );

        if (insertResult.rows && insertResult.rows.length > 0) {
          changes.push({
            action: 'student_created',
            table: 'students',
            record_id: insertResult.rows[0].id,
            details: 'Created new student record'
          });
          console.log(`✅ RoleService: Created new student record for user ${userId}`);
        }
      }
    } catch (error) {
      console.error(`❌ RoleService: Error ensuring student record for user ${userId}:`, error.message);
      errors.push({
        action: 'ensure_student_record',
        user_id: userId,
        error: error.message
      });
    }
  }

  /**
   * Ensure teacher record exists and is properly configured
   */
  async ensureTeacherRecord(userId, userData, changes, errors) {
    try {
      // Check if teacher record already exists
      const existingTeacher = await query(
        supabase
          .from('teachers')
          .select('*')
          .eq('user_id', userId)
          .limit(1)
      );

      if (existingTeacher.rows && existingTeacher.rows.length > 0) {
        // Update existing teacher record
        const updateResult = await query(
          supabase
            .from('teachers')
            .update({
              name: `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || userData.username,
              is_active: true,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', userId)
            .select('*')
        );

        if (updateResult.rows && updateResult.rows.length > 0) {
          changes.push({
            action: 'teacher_updated',
            table: 'teachers',
            record_id: updateResult.rows[0].id,
            details: 'Updated existing teacher record and set as active'
          });
          console.log(`✅ RoleService: Updated existing teacher record for user ${userId}`);
        }
      } else {
        // Create new teacher record
        const insertResult = await query(
          supabase
            .from('teachers')
            .insert({
              user_id: userId,
              employee_id: `EMP-${Date.now()}`, // Generate temporary employee ID
              name: `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || userData.username,
              is_active: true
            })
            .select('*')
        );

        if (insertResult.rows && insertResult.rows.length > 0) {
          changes.push({
            action: 'teacher_created',
            table: 'teachers',
            record_id: insertResult.rows[0].id,
            details: 'Created new teacher record'
          });
          console.log(`✅ RoleService: Created new teacher record for user ${userId}`);
        }
      }
    } catch (error) {
      console.error(`❌ RoleService: Error ensuring teacher record for user ${userId}:`, error.message);
      errors.push({
        action: 'ensure_teacher_record',
        user_id: userId,
        error: error.message
      });
    }
  }

  /**
   * Deactivate teacher record when user is no longer a teacher
   */
  async deactivateTeacherRecord(userId, changes, errors) {
    try {
      const updateResult = await query(
        supabase
          .from('teachers')
          .update({
            is_active: false,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)
          .select('*')
      );

      if (updateResult.rows && updateResult.rows.length > 0) {
        changes.push({
          action: 'teacher_deactivated',
          table: 'teachers',
          record_id: updateResult.rows[0].id,
          details: 'Deactivated teacher record'
        });
        console.log(`✅ RoleService: Deactivated teacher record for user ${userId}`);
      }
    } catch (error) {
      console.error(`❌ RoleService: Error deactivating teacher record for user ${userId}:`, error.message);
      errors.push({
        action: 'deactivate_teacher_record',
        user_id: userId,
        error: error.message
      });
    }
  }

  /**
   * Get role change history for a user
   * @param {string} userId - User ID
   * @param {number} limit - Number of records to return
   * @returns {Promise<Object>} Role history
   */
  async getRoleHistory(userId, limit = 50) {
    try {
      const result = await query(
        supabase
          .from('admin_audit_log')
          .select(`
            id,
            action,
            old_value,
            new_value,
            reason,
            created_at,
            admin:admin_id (
              username,
              email
            )
          `)
          .eq('target_user_id', userId)
          .eq('action', 'role_change')
          .order('created_at', { ascending: false })
          .limit(limit)
      );

      return {
        success: true,
        history: result.rows || []
      };

    } catch (error) {
      console.error('❌ Error getting role history:', error.message);
      return {
        success: false,
        error: 'HISTORY_FETCH_FAILED',
        message: 'Failed to get role change history'
      };
    }
  }

  /**
   * Get admin audit log
   * @param {number} limit - Number of records to return
   * @param {string} adminId - Filter by admin ID (optional)
   * @returns {Promise<Object>} Audit log
   */
  async getAdminAuditLog(limit = 100, adminId = null) {
    try {
      let queryBuilder = supabase
        .from('admin_audit_log')
        .select(`
          id,
          action,
          old_value,
          new_value,
          reason,
          ip_address,
          created_at,
          admin:admin_id (
            username,
            email
          ),
          target_user:target_user_id (
            username,
            email
          )
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (adminId) {
        queryBuilder = queryBuilder.eq('admin_id', adminId);
      }

      const result = await query(queryBuilder);

      return {
        success: true,
        auditLog: result.rows || []
      };

    } catch (error) {
      console.error('❌ Error getting audit log:', error.message);
      return {
        success: false,
        error: 'AUDIT_LOG_FETCH_FAILED',
        message: 'Failed to get admin audit log'
      };
    }
  }

  /**
   * Get role statistics
   * @returns {Promise<Object>} Role distribution statistics
   */
  async getRoleStatistics() {
    try {
      const result = await query(
        supabase
          .from('users')
          .select('role, user_source')
          .eq('status', 'active')
      );

      const stats = {
        total: result.rows.length,
        byRole: {},
        bySource: {},
        byRoleAndSource: {}
      };

      result.rows.forEach(user => {
        // Count by role
        stats.byRole[user.role] = (stats.byRole[user.role] || 0) + 1;
        
        // Count by source
        stats.bySource[user.user_source] = (stats.bySource[user.user_source] || 0) + 1;
        
        // Count by role and source combination
        const key = `${user.role}_${user.user_source}`;
        stats.byRoleAndSource[key] = (stats.byRoleAndSource[key] || 0) + 1;
      });

      return {
        success: true,
        statistics: stats
      };

    } catch (error) {
      console.error('❌ Error getting role statistics:', error.message);
      return {
        success: false,
        error: 'STATS_FETCH_FAILED',
        message: 'Failed to get role statistics'
      };
    }
  }
}

module.exports = new RoleService();
