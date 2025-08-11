const { supabase, query } = require('../config/supabase');

/**
 * Attendance Management Controller
 * 
 * Handles admin functionality for managing student attendance records
 * Implements 80% eligibility enforcement as per Excel system requirements
 */

/**
 * Create or update attendance record for a student
 * @route POST /api/v1/attendance
 * @access Admins, Teachers
 * @body { studentId, termId, quadrantId, attendanceDate, isPresent, reason? }
 */
const markAttendance = async (req, res) => {
  try {
    const { studentId, termId, quadrantId, attendanceDate, isPresent, reason } = req.body;

    // Validation
    if (!studentId || !termId || !quadrantId || !attendanceDate || isPresent === undefined) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_REQUIRED_FIELDS',
        message: 'Missing required fields: studentId, termId, quadrantId, attendanceDate, isPresent',
        timestamp: new Date().toISOString()
      });
    }

    // Verify student exists
    const studentResult = await query(
      supabase
        .from('students')
        .select('id, name, registration_no')
        .eq('id', studentId)
        .limit(1)
    );

    if (!studentResult.rows || studentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'STUDENT_NOT_FOUND',
        message: 'Student not found',
        timestamp: new Date().toISOString()
      });
    }

    // Verify quadrant exists
    const quadrantResult = await query(
      supabase
        .from('quadrants')
        .select('id, name, minimum_attendance')
        .eq('id', quadrantId)
        .limit(1)
    );

    if (!quadrantResult.rows || quadrantResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'QUADRANT_NOT_FOUND',
        message: 'Quadrant not found',
        timestamp: new Date().toISOString()
      });
    }

    // Insert or update attendance record
    const attendanceData = {
      student_id: studentId,
      term_id: termId,
      quadrant_id: quadrantId,
      attendance_date: attendanceDate,
      is_present: isPresent,
      reason: reason || null,
      marked_by: req.user.userId
    };

    const attendanceResult = await query(
      supabase
        .from('attendance')
        .upsert(attendanceData, { 
          onConflict: 'student_id,term_id,quadrant_id,attendance_date',
          returning: 'minimal'
        })
    );

    // Recalculate attendance summary
    await recalculateAttendanceSummary(studentId, termId, quadrantId);

    res.status(201).json({
      success: true,
      message: 'Attendance marked successfully',
      data: {
        studentId,
        studentName: studentResult.rows[0].name,
        quadrantName: quadrantResult.rows[0].name,
        attendanceDate,
        isPresent,
        markedAt: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Mark attendance error:', error);
    res.status(500).json({
      success: false,
      error: 'ATTENDANCE_MARKING_FAILED',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Bulk update attendance for multiple students
 * @route POST /api/v1/attendance/bulk
 * @access Admins, Teachers
 * @body { termId, quadrantId, attendanceDate, attendanceRecords: [{ studentId, isPresent, reason? }] }
 */
const bulkMarkAttendance = async (req, res) => {
  try {
    const { termId, quadrantId, attendanceDate, attendanceRecords } = req.body;

    // Validation
    if (!termId || !quadrantId || !attendanceDate || !attendanceRecords || !Array.isArray(attendanceRecords)) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_REQUIRED_FIELDS',
        message: 'Missing required fields: termId, quadrantId, attendanceDate, attendanceRecords',
        timestamp: new Date().toISOString()
      });
    }

    if (attendanceRecords.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'EMPTY_ATTENDANCE_RECORDS',
        message: 'Attendance records array cannot be empty',
        timestamp: new Date().toISOString()
      });
    }

    // Prepare bulk attendance data
    const bulkAttendanceData = attendanceRecords.map(record => ({
      student_id: record.studentId,
      term_id: termId,
      quadrant_id: quadrantId,
      attendance_date: attendanceDate,
      is_present: record.isPresent,
      reason: record.reason || null,
      marked_by: req.user.userId
    }));

    // Insert bulk attendance records
    const bulkResult = await query(
      supabase
        .from('attendance')
        .upsert(bulkAttendanceData, { 
          onConflict: 'student_id,term_id,quadrant_id,attendance_date',
          returning: 'minimal'
        })
    );

    // Recalculate attendance summary for all affected students
    const uniqueStudentIds = [...new Set(attendanceRecords.map(r => r.studentId))];
    for (const studentId of uniqueStudentIds) {
      await recalculateAttendanceSummary(studentId, termId, quadrantId);
    }

    res.status(201).json({
      success: true,
      message: 'Bulk attendance marked successfully',
      data: {
        recordsProcessed: attendanceRecords.length,
        studentsAffected: uniqueStudentIds.length,
        attendanceDate,
        quadrantId,
        termId
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Bulk mark attendance error:', error);
    res.status(500).json({
      success: false,
      error: 'BULK_ATTENDANCE_FAILED',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Update attendance summary for a student in a quadrant
 * @route PUT /api/v1/attendance/summary
 * @access Admins only
 * @body { studentId, termId, quadrantId, totalSessions, attendedSessions }
 */
const updateAttendanceSummary = async (req, res) => {
  try {
    const { studentId, termId, quadrantId, totalSessions, attendedSessions } = req.body;

    // Validation
    if (!studentId || !termId || !quadrantId || totalSessions === undefined || attendedSessions === undefined) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_REQUIRED_FIELDS',
        message: 'Missing required fields: studentId, termId, quadrantId, totalSessions, attendedSessions',
        timestamp: new Date().toISOString()
      });
    }

    if (attendedSessions > totalSessions || attendedSessions < 0 || totalSessions < 0) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_ATTENDANCE_VALUES',
        message: 'Attended sessions cannot exceed total sessions, and values cannot be negative',
        timestamp: new Date().toISOString()
      });
    }

    // Calculate percentage
    const percentage = totalSessions > 0 ? (attendedSessions / totalSessions) * 100 : 0;

    // Update attendance summary
    const summaryData = {
      student_id: studentId,
      term_id: termId,
      quadrant_id: quadrantId,
      total_sessions: totalSessions,
      attended_sessions: attendedSessions,
      percentage: Math.round(percentage * 100) / 100,
      last_updated: new Date().toISOString()
    };

    const summaryResult = await query(
      supabase
        .from('attendance_summary')
        .upsert(summaryData, { 
          onConflict: 'student_id,term_id,quadrant_id',
          returning: 'minimal'
        })
    );

    // Check 80% eligibility requirement
    const isEligible = percentage >= 80;

    res.status(200).json({
      success: true,
      message: 'Attendance summary updated successfully',
      data: {
        studentId,
        termId,
        quadrantId,
        totalSessions,
        attendedSessions,
        percentage: Math.round(percentage * 100) / 100,
        isEligible,
        eligibilityStatus: isEligible ? 'Eligible' : 'Not Eligible (Below 80%)'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Update attendance summary error:', error);
    res.status(500).json({
      success: false,
      error: 'ATTENDANCE_SUMMARY_UPDATE_FAILED',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Helper function to recalculate attendance summary
 * @param {string} studentId - Student UUID
 * @param {string} termId - Term UUID
 * @param {string} quadrantId - Quadrant ID
 */
async function recalculateAttendanceSummary(studentId, termId, quadrantId) {
  try {
    // Get all attendance records for this student, term, and quadrant
    const attendanceResult = await query(
      supabase
        .from('attendance')
        .select('is_present')
        .eq('student_id', studentId)
        .eq('term_id', termId)
        .eq('quadrant_id', quadrantId)
    );

    const attendanceRecords = attendanceResult.rows || [];
    const totalSessions = attendanceRecords.length;
    const attendedSessions = attendanceRecords.filter(record => record.is_present).length;
    const percentage = totalSessions > 0 ? (attendedSessions / totalSessions) * 100 : 0;

    // Update attendance summary
    const summaryData = {
      student_id: studentId,
      term_id: termId,
      quadrant_id: quadrantId,
      total_sessions: totalSessions,
      attended_sessions: attendedSessions,
      percentage: Math.round(percentage * 100) / 100,
      last_updated: new Date().toISOString()
    };

    await query(
      supabase
        .from('attendance_summary')
        .upsert(summaryData, { 
          onConflict: 'student_id,term_id,quadrant_id'
        })
    );

    console.log(`✅ Attendance summary recalculated for student ${studentId}, quadrant ${quadrantId}: ${percentage.toFixed(2)}%`);

  } catch (error) {
    console.error('❌ Recalculate attendance summary error:', error);
    throw error;
  }
}

module.exports = {
  markAttendance,
  bulkMarkAttendance,
  updateAttendanceSummary
};
