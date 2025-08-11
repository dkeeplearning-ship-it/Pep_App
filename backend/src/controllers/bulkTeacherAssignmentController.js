const bulkTeacherAssignmentService = require('../services/bulkTeacherAssignmentService');

/**
 * Execute bulk teacher assignment
 * POST /api/v1/admin/bulk-teacher-assignment
 */
const bulkAssignTeachers = async (req, res) => {
  try {
    const { assignments } = req.body;
    const assignedBy = req.user.id;

    if (!assignments || !Array.isArray(assignments) || assignments.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_ASSIGNMENTS',
        message: 'Assignments array is required and must not be empty',
        timestamp: new Date().toISOString()
      });
    }

    // Validate assignment structure
    for (const assignment of assignments) {
      if (!assignment.interventionId || !assignment.teacherIds || !Array.isArray(assignment.teacherIds)) {
        return res.status(400).json({
          success: false,
          error: 'INVALID_ASSIGNMENT_STRUCTURE',
          message: 'Each assignment must have interventionId and teacherIds array',
          timestamp: new Date().toISOString()
        });
      }
    }

    const result = await bulkTeacherAssignmentService.bulkAssignTeachers(assignments, assignedBy);

    if (result.success) {
      res.status(200).json({
        ...result,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        ...result,
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('❌ Error in bulk teacher assignment:', error.message);
    res.status(500).json({
      success: false,
      error: 'BULK_ASSIGNMENT_FAILED',
      message: 'Failed to execute bulk teacher assignment',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Assign teachers by criteria
 * POST /api/v1/admin/assign-teachers-by-criteria
 */
const assignTeachersByCriteria = async (req, res) => {
  try {
    const { interventionIds, criteria } = req.body;
    const assignedBy = req.user.id;

    if (!interventionIds || !Array.isArray(interventionIds) || interventionIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_INTERVENTIONS',
        message: 'Intervention IDs array is required and must not be empty',
        timestamp: new Date().toISOString()
      });
    }

    if (!criteria || typeof criteria !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'INVALID_CRITERIA',
        message: 'Criteria object is required',
        timestamp: new Date().toISOString()
      });
    }

    const results = [];
    const errors = [];

    for (const interventionId of interventionIds) {
      try {
        const result = await bulkTeacherAssignmentService.assignTeachersByCriteria(
          interventionId,
          criteria,
          assignedBy
        );

        if (result.success) {
          results.push({
            interventionId,
            assignedTeachers: result.assignedTeachers,
            eligibleTeachers: result.eligibleTeachers,
            message: result.message
          });
        } else {
          errors.push({
            interventionId,
            error: result.error,
            message: result.message
          });
        }
      } catch (error) {
        errors.push({
          interventionId,
          error: 'ASSIGNMENT_FAILED',
          message: error.message
        });
      }
    }

    const successCount = results.length;
    const errorCount = errors.length;

    res.status(200).json({
      success: errorCount === 0,
      successCount,
      errorCount,
      results,
      errors,
      message: `Criteria assignment complete: ${successCount} successful, ${errorCount} failed`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error in criteria-based assignment:', error.message);
    res.status(500).json({
      success: false,
      error: 'CRITERIA_ASSIGNMENT_FAILED',
      message: 'Failed to assign teachers by criteria',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Bulk remove teachers
 * POST /api/v1/admin/bulk-remove-teachers
 */
const bulkRemoveTeachers = async (req, res) => {
  try {
    const { removals } = req.body;
    const removedBy = req.user.id;

    if (!removals || !Array.isArray(removals) || removals.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_REMOVALS',
        message: 'Removals array is required and must not be empty',
        timestamp: new Date().toISOString()
      });
    }

    // Validate removal structure
    for (const removal of removals) {
      if (!removal.interventionId || !removal.teacherIds || !Array.isArray(removal.teacherIds)) {
        return res.status(400).json({
          success: false,
          error: 'INVALID_REMOVAL_STRUCTURE',
          message: 'Each removal must have interventionId and teacherIds array',
          timestamp: new Date().toISOString()
        });
      }
    }

    const result = await bulkTeacherAssignmentService.bulkRemoveTeachers(removals, removedBy);

    if (result.success) {
      res.status(200).json({
        ...result,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        ...result,
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('❌ Error in bulk teacher removal:', error.message);
    res.status(500).json({
      success: false,
      error: 'BULK_REMOVAL_FAILED',
      message: 'Failed to execute bulk teacher removal',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Get assignment statistics
 * GET /api/v1/admin/teacher-assignment-stats
 */
const getAssignmentStatistics = async (req, res) => {
  try {
    const result = await bulkTeacherAssignmentService.getAssignmentStatistics();

    if (result.success) {
      res.status(200).json({
        ...result,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        ...result,
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('❌ Error getting assignment statistics:', error.message);
    res.status(500).json({
      success: false,
      error: 'STATISTICS_FAILED',
      message: 'Failed to get assignment statistics',
      timestamp: new Date().toISOString()
    });
  }
};

module.exports = {
  bulkAssignTeachers,
  assignTeachersByCriteria,
  bulkRemoveTeachers,
  getAssignmentStatistics
};
