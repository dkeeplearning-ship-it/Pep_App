/**
 * Attendance Eligibility Service
 * Implements ICT (Insufficient for Clearing Threshold) system from Excel
 */

const { supabase, query } = require('../config/supabase');

class AttendanceEligibilityService {
  
  /**
   * Update student attendance and calculate eligibility status
   * @param {string} studentId - Student UUID
   * @param {string} termId - Term UUID
   * @param {Object} attendanceData - Attendance data
   */
  async updateAttendanceEligibility(studentId, termId, attendanceData) {
    try {
      const {
        overall_attendance,
        wellness_attendance,
        component_attendances = []
      } = attendanceData;

      // Update overall attendance
      await this.updateAttendanceRecord(studentId, termId, 'overall', {
        attended_sessions: overall_attendance.attended,
        total_sessions: overall_attendance.total,
        percentage: overall_attendance.percentage
      });

      // Update wellness-specific attendance
      if (wellness_attendance) {
        await this.updateAttendanceRecord(studentId, termId, 'wellness', {
          attended_sessions: wellness_attendance.attended,
          total_sessions: wellness_attendance.total,
          percentage: wellness_attendance.percentage
        });
      }

      // Update component-specific attendances
      for (const compAttendance of component_attendances) {
        await this.updateAttendanceRecord(studentId, termId, 'component_specific', {
          component_id: compAttendance.component_id,
          attended_sessions: compAttendance.attended,
          total_sessions: compAttendance.total,
          percentage: compAttendance.percentage
        });
      }

      // Calculate and update eligibility status
      const eligibilityStatus = await this.calculateEligibilityStatus(studentId, termId);
      
      // Update student level progression
      await this.updateStudentLevelProgression(studentId, termId, eligibilityStatus);

      return {
        success: true,
        eligibility_status: eligibilityStatus,
        message: 'Attendance eligibility updated successfully'
      };

    } catch (error) {
      console.error('❌ Update attendance eligibility error:', error);
      throw new Error(`Failed to update attendance eligibility: ${error.message}`);
    }
  }

  /**
   * Update attendance record for specific type
   */
  async updateAttendanceRecord(studentId, termId, attendanceType, data) {
    const attendanceRecord = {
      student_id: studentId,
      term_id: termId,
      attendance_type: attendanceType,
      component_id: data.component_id || null,
      total_sessions: data.total_sessions,
      attended_sessions: data.attended_sessions,
      percentage: data.percentage,
      updated_at: new Date().toISOString()
    };

    // Calculate eligibility status based on thresholds
    const threshold = this.getAttendanceThreshold(attendanceType);
    attendanceRecord.eligibility_status = data.percentage >= threshold ? 'eligible' : 'ict';
    attendanceRecord.threshold_required = threshold;

    // Upsert attendance record
    const result = await query(
      supabase
        .from('attendance_eligibility')
        .upsert(attendanceRecord, {
          onConflict: 'student_id,term_id,attendance_type,component_id'
        })
    );

    return result;
  }

  /**
   * Calculate overall eligibility status for student
   */
  async calculateEligibilityStatus(studentId, termId) {
    try {
      // Get all attendance records for student in term
      const attendanceResult = await query(
        supabase
          .from('attendance_eligibility')
          .select('*')
          .eq('student_id', studentId)
          .eq('term_id', termId)
      );

      const attendanceRecords = attendanceResult.rows || [];
      
      // Get term requirements
      const termResult = await query(
        supabase
          .from('terms')
          .select('level_number, attendance_threshold, eligibility_rules')
          .eq('id', termId)
          .limit(1)
      );

      const term = termResult.rows?.[0];
      if (!term) {
        throw new Error('Term not found');
      }

      // Check overall attendance
      const overallAttendance = attendanceRecords.find(r => r.attendance_type === 'overall');
      const overallPercentage = overallAttendance?.percentage || 0;
      
      // Check wellness attendance
      const wellnessAttendance = attendanceRecords.find(r => r.attendance_type === 'wellness');
      const wellnessPercentage = wellnessAttendance?.percentage || 0;

      // Determine eligibility status based on Excel logic
      let eligibilityStatus = 'eligible';
      let statusReason = [];

      // Overall attendance check
      if (overallPercentage < term.attendance_threshold) {
        eligibilityStatus = 'ict';
        statusReason.push(`Overall attendance ${overallPercentage}% below threshold ${term.attendance_threshold}%`);
      }

      // Wellness attendance check (if applicable)
      if (wellnessPercentage > 0 && wellnessPercentage < 70) {
        eligibilityStatus = 'ict';
        statusReason.push(`Wellness attendance ${wellnessPercentage}% below threshold 70%`);
      }

      // Component-specific checks
      const componentAttendances = attendanceRecords.filter(r => r.attendance_type === 'component_specific');
      for (const compAttendance of componentAttendances) {
        if (compAttendance.percentage < 75) {
          eligibilityStatus = 'ict';
          statusReason.push(`Component attendance ${compAttendance.percentage}% below threshold 75%`);
        }
      }

      return {
        status: eligibilityStatus,
        overall_attendance: overallPercentage,
        wellness_attendance: wellnessPercentage,
        reasons: statusReason,
        level_number: term.level_number,
        calculated_at: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Calculate eligibility status error:', error);
      throw new Error(`Failed to calculate eligibility status: ${error.message}`);
    }
  }

  /**
   * Update student level progression based on eligibility
   */
  async updateStudentLevelProgression(studentId, termId, eligibilityStatus) {
    const progressionData = {
      student_id: studentId,
      term_id: termId,
      level_number: eligibilityStatus.level_number,
      eligibility_status: eligibilityStatus.status,
      attendance_percentage: eligibilityStatus.overall_attendance,
      updated_at: new Date().toISOString()
    };

    // Determine progression status
    if (eligibilityStatus.status === 'eligible') {
      progressionData.status = 'active';
    } else if (eligibilityStatus.status === 'ict') {
      progressionData.status = 'ict';
    } else {
      progressionData.status = 'not_cleared';
    }

    const result = await query(
      supabase
        .from('student_level_progression')
        .upsert(progressionData, {
          onConflict: 'student_id,term_id'
        })
    );

    return result;
  }

  /**
   * Get attendance threshold for specific type
   */
  getAttendanceThreshold(attendanceType) {
    const thresholds = {
      'overall': 75,
      'wellness': 70,
      'component_specific': 75
    };
    return thresholds[attendanceType] || 75;
  }

  /**
   * Get student eligibility status for term
   */
  async getStudentEligibilityStatus(studentId, termId) {
    try {
      const progressionResult = await query(
        supabase
          .from('student_level_progression')
          .select('*')
          .eq('student_id', studentId)
          .eq('term_id', termId)
          .limit(1)
      );

      const progression = progressionResult.rows?.[0];
      
      if (!progression) {
        // Calculate if not exists
        return await this.calculateEligibilityStatus(studentId, termId);
      }

      return {
        status: progression.eligibility_status,
        level_number: progression.level_number,
        attendance_percentage: progression.attendance_percentage,
        progression_status: progression.status,
        last_updated: progression.updated_at
      };

    } catch (error) {
      console.error('❌ Get student eligibility status error:', error);
      throw new Error(`Failed to get student eligibility status: ${error.message}`);
    }
  }

  /**
   * Check if student can progress to next level
   */
  async checkLevelProgressionEligibility(studentId, currentTermId) {
    try {
      const eligibilityStatus = await this.getStudentEligibilityStatus(studentId, currentTermId);
      
      // Get quadrant scores (would integrate with scoring service)
      // For now, simplified check
      const canProgress = eligibilityStatus.status === 'eligible' && 
                         eligibilityStatus.attendance_percentage >= 75;

      return {
        can_progress: canProgress,
        current_level: eligibilityStatus.level_number,
        next_level: eligibilityStatus.level_number + 1,
        eligibility_status: eligibilityStatus,
        requirements_met: {
          attendance: eligibilityStatus.attendance_percentage >= 75,
          quadrant_clearance: true // Would be calculated from actual scores
        }
      };

    } catch (error) {
      console.error('❌ Check level progression eligibility error:', error);
      throw new Error(`Failed to check level progression eligibility: ${error.message}`);
    }
  }
}

module.exports = new AttendanceEligibilityService();
