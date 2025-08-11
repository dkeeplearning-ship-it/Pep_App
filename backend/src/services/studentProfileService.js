const { supabase, query } = require('../config/supabase');

/**
 * Student Profile Update Service
 * Handles student profile update requests and admin approval workflow
 */
class StudentProfileService {
  constructor() {
    this.allowedFields = [
      'batch_id',
      'section_id', 
      'house_id',
      'gender',
      'phone',
      'preferences'
    ];
  }

  /**
   * Submit profile update request
   * @param {string} studentId - Student ID
   * @param {string} userId - User ID making the request
   * @param {Object} requestedChanges - Fields to update
   * @param {string} reason - Reason for the update
   * @returns {Promise<Object>} Request result
   */
  async submitProfileUpdateRequest(studentId, userId, requestedChanges, reason) {
    try {
      console.log(`📝 Student ${studentId} submitting profile update request`);

      // Validate requested changes contain only allowed fields
      const invalidFields = Object.keys(requestedChanges).filter(
        field => !this.allowedFields.includes(field)
      );

      if (invalidFields.length > 0) {
        return {
          success: false,
          error: 'INVALID_FIELDS',
          message: `Invalid fields: ${invalidFields.join(', ')}. Allowed fields: ${this.allowedFields.join(', ')}`
        };
      }

      // Get current student data
      const studentResult = await query(
        supabase
          .from('students')
          .select('batch_id, section_id, house_id, gender, phone, preferences')
          .eq('id', studentId)
          .limit(1)
      );

      if (!studentResult.rows || studentResult.rows.length === 0) {
        return {
          success: false,
          error: 'STUDENT_NOT_FOUND',
          message: 'Student not found'
        };
      }

      const currentValues = studentResult.rows[0];

      // Check if there's already a pending request
      const pendingRequestResult = await query(
        supabase
          .from('student_profile_requests')
          .select('id')
          .eq('student_id', studentId)
          .eq('status', 'pending')
          .limit(1)
      );

      if (pendingRequestResult.rows && pendingRequestResult.rows.length > 0) {
        return {
          success: false,
          error: 'PENDING_REQUEST_EXISTS',
          message: 'You already have a pending profile update request. Please wait for admin approval.'
        };
      }

      // Create profile update request
      const requestResult = await query(
        supabase
          .from('student_profile_requests')
          .insert({
            student_id: studentId,
            requested_changes: requestedChanges,
            current_values: currentValues,
            request_reason: reason,
            requested_by: userId,
            status: 'pending',
            created_at: new Date().toISOString()
          })
          .select('*')
      );

      if (requestResult.rows && requestResult.rows.length > 0) {
        console.log('✅ Profile update request submitted successfully');
        return {
          success: true,
          message: 'Profile update request submitted successfully. Please wait for admin approval.',
          request: requestResult.rows[0]
        };
      } else {
        throw new Error('Failed to create profile update request');
      }

    } catch (error) {
      console.error('❌ Error submitting profile update request:', error.message);
      return {
        success: false,
        error: 'REQUEST_SUBMISSION_FAILED',
        message: 'Failed to submit profile update request'
      };
    }
  }

  /**
   * Get profile update requests for admin review
   * @param {string} status - Filter by status (optional)
   * @param {number} limit - Number of requests to return
   * @returns {Promise<Object>} Requests list
   */
  async getProfileUpdateRequests(status = null, limit = 50) {
    try {
      let queryBuilder = supabase
        .from('student_profile_requests')
        .select(`
          id,
          student_id,
          requested_changes,
          current_values,
          request_reason,
          status,
          created_at,
          reviewed_at,
          review_reason,
          student:student_id (
            id,
            name,
            registration_no,
            course
          ),
          requested_by_user:requested_by (
            username,
            email
          ),
          reviewed_by_user:reviewed_by (
            username,
            email
          )
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (status) {
        queryBuilder = queryBuilder.eq('status', status);
      }

      const result = await query(queryBuilder);

      return {
        success: true,
        requests: result.rows || []
      };

    } catch (error) {
      console.error('❌ Error getting profile update requests:', error.message);
      return {
        success: false,
        error: 'FETCH_REQUESTS_FAILED',
        message: 'Failed to fetch profile update requests'
      };
    }
  }

  /**
   * Approve or reject profile update request
   * @param {string} requestId - Request ID
   * @param {string} adminId - Admin user ID
   * @param {string} action - 'approve' or 'reject'
   * @param {string} reason - Reason for the decision
   * @returns {Promise<Object>} Review result
   */
  async reviewProfileUpdateRequest(requestId, adminId, action, reason) {
    try {
      console.log(`🔍 Admin ${adminId} reviewing request ${requestId}: ${action}`);

      if (!['approve', 'reject'].includes(action)) {
        return {
          success: false,
          error: 'INVALID_ACTION',
          message: 'Action must be either "approve" or "reject"'
        };
      }

      // Get the request
      const requestResult = await query(
        supabase
          .from('student_profile_requests')
          .select('*')
          .eq('id', requestId)
          .eq('status', 'pending')
          .limit(1)
      );

      if (!requestResult.rows || requestResult.rows.length === 0) {
        return {
          success: false,
          error: 'REQUEST_NOT_FOUND',
          message: 'Profile update request not found or already processed'
        };
      }

      const request = requestResult.rows[0];

      // Update request status
      const updateRequestResult = await query(
        supabase
          .from('student_profile_requests')
          .update({
            status: action === 'approve' ? 'approved' : 'rejected',
            reviewed_by: adminId,
            reviewed_at: new Date().toISOString(),
            review_reason: reason
          })
          .eq('id', requestId)
          .select('*')
      );

      if (action === 'approve') {
        // Apply the changes to the student profile
        const updateResult = await query(
          supabase
            .from('students')
            .update(request.requested_changes)
            .eq('id', request.student_id)
            .select('*')
        );

        if (!updateResult.rows || updateResult.rows.length === 0) {
          throw new Error('Failed to update student profile');
        }

        console.log('✅ Profile update request approved and applied');
        return {
          success: true,
          message: 'Profile update request approved and changes applied successfully',
          request: updateRequestResult.rows[0],
          updatedStudent: updateResult.rows[0]
        };
      } else {
        console.log('✅ Profile update request rejected');
        return {
          success: true,
          message: 'Profile update request rejected',
          request: updateRequestResult.rows[0]
        };
      }

    } catch (error) {
      console.error('❌ Error reviewing profile update request:', error.message);
      return {
        success: false,
        error: 'REVIEW_FAILED',
        message: 'Failed to review profile update request'
      };
    }
  }

  /**
   * Get student's own profile update requests
   * @param {string} studentId - Student ID
   * @returns {Promise<Object>} Student's requests
   */
  async getStudentRequests(studentId) {
    try {
      const result = await query(
        supabase
          .from('student_profile_requests')
          .select(`
            id,
            requested_changes,
            current_values,
            request_reason,
            status,
            created_at,
            reviewed_at,
            review_reason,
            reviewed_by_user:reviewed_by (
              username,
              email
            )
          `)
          .eq('student_id', studentId)
          .order('created_at', { ascending: false })
      );

      return {
        success: true,
        requests: result.rows || []
      };

    } catch (error) {
      console.error('❌ Error getting student requests:', error.message);
      return {
        success: false,
        error: 'FETCH_STUDENT_REQUESTS_FAILED',
        message: 'Failed to fetch your profile update requests'
      };
    }
  }

  /**
   * Sync all students to current term
   * @returns {Promise<Object>} Sync result
   */
  async syncStudentsToCurrentTerm() {
    try {
      console.log('🔄 Syncing all students to current term...');

      // Get current active term
      const currentTermResult = await query(
        supabase
          .from('terms')
          .select('id, name')
          .eq('is_current', true)
          .limit(1)
      );

      if (!currentTermResult.rows || currentTermResult.rows.length === 0) {
        return {
          success: false,
          error: 'NO_CURRENT_TERM',
          message: 'No current active term found'
        };
      }

      const currentTerm = currentTermResult.rows[0];

      // Update all students to current term
      const updateResult = await query(
        supabase
          .from('students')
          .update({ current_term_id: currentTerm.id })
          .neq('current_term_id', currentTerm.id)
          .select('id')
      );

      const updatedCount = updateResult.rows ? updateResult.rows.length : 0;

      console.log(`✅ Synced ${updatedCount} students to current term: ${currentTerm.name}`);

      return {
        success: true,
        message: `Successfully synced ${updatedCount} students to current term: ${currentTerm.name}`,
        currentTerm,
        updatedCount
      };

    } catch (error) {
      console.error('❌ Error syncing students to current term:', error.message);
      return {
        success: false,
        error: 'SYNC_FAILED',
        message: 'Failed to sync students to current term'
      };
    }
  }
}

module.exports = new StudentProfileService();
