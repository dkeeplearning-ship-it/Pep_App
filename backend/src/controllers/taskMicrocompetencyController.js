const taskMicrocompetencyService = require('../services/taskMicrocompetencyService');

/**
 * Link microcompetencies to task
 * POST /api/v1/admin/tasks/:taskId/microcompetencies
 */
const linkMicrocompetenciesToTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { microcompetencies } = req.body;
    const createdBy = req.user.id;

    if (!microcompetencies || !Array.isArray(microcompetencies) || microcompetencies.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_MICROCOMPETENCIES',
        message: 'Microcompetencies array is required and must not be empty',
        timestamp: new Date().toISOString()
      });
    }

    // Validate microcompetency structure
    for (const mc of microcompetencies) {
      if (!mc.microcompetencyId || mc.weightage === undefined || mc.maxScore === undefined) {
        return res.status(400).json({
          success: false,
          error: 'INVALID_MICROCOMPETENCY_STRUCTURE',
          message: 'Each microcompetency must have microcompetencyId, weightage, and maxScore',
          timestamp: new Date().toISOString()
        });
      }
    }

    const result = await taskMicrocompetencyService.linkMicrocompetenciesToTask(
      taskId,
      microcompetencies,
      createdBy
    );

    if (result.success) {
      res.status(201).json({
        ...result,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(400).json({
        ...result,
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('❌ Error linking microcompetencies to task:', error.message);
    res.status(500).json({
      success: false,
      error: 'LINK_FAILED',
      message: 'Failed to link microcompetencies to task',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Get task microcompetencies
 * GET /api/v1/admin/tasks/:taskId/microcompetencies
 */
const getTaskMicrocompetencies = async (req, res) => {
  try {
    const { taskId } = req.params;

    const result = await taskMicrocompetencyService.getTaskMicrocompetencies(taskId);

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
    console.error('❌ Error getting task microcompetencies:', error.message);
    res.status(500).json({
      success: false,
      error: 'FETCH_FAILED',
      message: 'Failed to get task microcompetencies',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Update task microcompetency
 * PUT /api/v1/admin/task-microcompetencies/:id
 */
const updateTaskMicrocompetency = async (req, res) => {
  try {
    const { id } = req.params;
    const { weightage, maxScore } = req.body;

    if (weightage === undefined || maxScore === undefined) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_FIELDS',
        message: 'Weightage and maxScore are required',
        timestamp: new Date().toISOString()
      });
    }

    if (weightage < 0 || weightage > 100) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_WEIGHTAGE',
        message: 'Weightage must be between 0 and 100',
        timestamp: new Date().toISOString()
      });
    }

    if (maxScore < 0) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_MAX_SCORE',
        message: 'Max score must be greater than or equal to 0',
        timestamp: new Date().toISOString()
      });
    }

    const result = await taskMicrocompetencyService.updateTaskMicrocompetency(id, weightage, maxScore);

    if (result.success) {
      res.status(200).json({
        ...result,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(400).json({
        ...result,
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('❌ Error updating task microcompetency:', error.message);
    res.status(500).json({
      success: false,
      error: 'UPDATE_FAILED',
      message: 'Failed to update task microcompetency',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Remove microcompetency from task
 * DELETE /api/v1/admin/task-microcompetencies/:id
 */
const removeTaskMicrocompetency = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await taskMicrocompetencyService.removeTaskMicrocompetency(id);

    if (result.success) {
      res.status(200).json({
        ...result,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(404).json({
        ...result,
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('❌ Error removing task microcompetency:', error.message);
    res.status(500).json({
      success: false,
      error: 'REMOVAL_FAILED',
      message: 'Failed to remove task microcompetency',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Get tasks by microcompetency
 * GET /api/v1/admin/microcompetencies/:microcompetencyId/tasks
 */
const getTasksByMicrocompetency = async (req, res) => {
  try {
    const { microcompetencyId } = req.params;

    const result = await taskMicrocompetencyService.getTasksByMicrocompetency(microcompetencyId);

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
    console.error('❌ Error getting tasks by microcompetency:', error.message);
    res.status(500).json({
      success: false,
      error: 'FETCH_FAILED',
      message: 'Failed to get tasks by microcompetency',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Bulk link microcompetencies
 * POST /api/v1/admin/bulk-link-microcompetencies
 */
const bulkLinkMicrocompetencies = async (req, res) => {
  try {
    const { taskMicrocompetencyMappings } = req.body;
    const createdBy = req.user.id;

    if (!taskMicrocompetencyMappings || !Array.isArray(taskMicrocompetencyMappings) || taskMicrocompetencyMappings.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_MAPPINGS',
        message: 'Task microcompetency mappings array is required and must not be empty',
        timestamp: new Date().toISOString()
      });
    }

    // Validate mapping structure
    for (const mapping of taskMicrocompetencyMappings) {
      if (!mapping.taskId || !mapping.microcompetencies || !Array.isArray(mapping.microcompetencies)) {
        return res.status(400).json({
          success: false,
          error: 'INVALID_MAPPING_STRUCTURE',
          message: 'Each mapping must have taskId and microcompetencies array',
          timestamp: new Date().toISOString()
        });
      }
    }

    const result = await taskMicrocompetencyService.bulkLinkMicrocompetencies(
      taskMicrocompetencyMappings,
      createdBy
    );

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
    console.error('❌ Error in bulk microcompetency linking:', error.message);
    res.status(500).json({
      success: false,
      error: 'BULK_LINK_FAILED',
      message: 'Failed to execute bulk microcompetency linking',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Get task-microcompetency statistics
 * GET /api/v1/admin/task-microcompetency-stats
 */
const getTaskMicrocompetencyStatistics = async (req, res) => {
  try {
    const result = await taskMicrocompetencyService.getTaskMicrocompetencyStatistics();

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
    console.error('❌ Error getting task-microcompetency statistics:', error.message);
    res.status(500).json({
      success: false,
      error: 'STATISTICS_FAILED',
      message: 'Failed to get task-microcompetency statistics',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Get tasks with invalid weightages
 * GET /api/v1/admin/tasks/invalid-weightages
 */
const getTasksWithInvalidWeightages = async (req, res) => {
  try {
    const result = await taskMicrocompetencyService.getTasksWithInvalidWeightages();

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
    console.error('❌ Error getting tasks with invalid weightages:', error.message);
    res.status(500).json({
      success: false,
      error: 'VALIDATION_FAILED',
      message: 'Failed to get tasks with invalid weightages',
      timestamp: new Date().toISOString()
    });
  }
};

module.exports = {
  linkMicrocompetenciesToTask,
  getTaskMicrocompetencies,
  updateTaskMicrocompetency,
  removeTaskMicrocompetency,
  getTasksByMicrocompetency,
  bulkLinkMicrocompetencies,
  getTaskMicrocompetencyStatistics,
  getTasksWithInvalidWeightages
};
