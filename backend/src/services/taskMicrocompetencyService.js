const { supabase, query } = require('../config/supabase');

/**
 * Task-Microcompetency Service
 * Manages direct relationships between tasks and microcompetencies
 */
class TaskMicrocompetencyService {
  constructor() {
    this.tolerance = 0.01; // Allow 0.01% tolerance for floating point precision
  }

  /**
   * Link microcompetencies to a task
   * @param {string} taskId - Task ID
   * @param {Array} microcompetencies - Array of {microcompetencyId, weightage, maxScore}
   * @param {string} createdBy - User ID
   * @returns {Promise<Object>} Link result
   */
  async linkMicrocompetenciesToTask(taskId, microcompetencies, createdBy) {
    try {
      console.log(`📝 Linking ${microcompetencies.length} microcompetencies to task ${taskId}`);

      // Validate task exists
      const taskCheck = await query(
        supabase
          .from('tasks')
          .select('id, name, intervention_id')
          .eq('id', taskId)
          .limit(1)
      );

      if (!taskCheck.rows || taskCheck.rows.length === 0) {
        return {
          success: false,
          error: 'TASK_NOT_FOUND',
          message: 'Task not found'
        };
      }

      const task = taskCheck.rows[0];

      // Validate weightages total 100%
      const totalWeightage = microcompetencies.reduce((sum, mc) => sum + parseFloat(mc.weightage), 0);
      if (Math.abs(totalWeightage - 100) > this.tolerance) {
        return {
          success: false,
          error: 'INVALID_WEIGHTAGE',
          message: `Microcompetency weightages must total 100%, got ${totalWeightage}%`
        };
      }

      // Validate microcompetencies exist
      const microcompetencyIds = microcompetencies.map(mc => mc.microcompetencyId);
      const microcompetencyCheck = await query(
        supabase
          .from('microcompetencies')
          .select('id, name, is_active')
          .in('id', microcompetencyIds)
          .eq('is_active', true)
      );

      const validMicrocompetencies = microcompetencyCheck.rows || [];
      const validIds = validMicrocompetencies.map(mc => mc.id);
      const invalidIds = microcompetencyIds.filter(id => !validIds.includes(id));

      if (invalidIds.length > 0) {
        return {
          success: false,
          error: 'INVALID_MICROCOMPETENCIES',
          message: `Invalid or inactive microcompetency IDs: ${invalidIds.join(', ')}`
        };
      }

      // Remove existing links
      await query(
        supabase
          .from('task_microcompetencies')
          .delete()
          .eq('task_id', taskId)
      );

      // Create new links
      const links = microcompetencies.map(mc => ({
        task_id: taskId,
        microcompetency_id: mc.microcompetencyId,
        weightage: parseFloat(mc.weightage),
        max_score: parseFloat(mc.maxScore || 10),
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      const linkResult = await query(
        supabase
          .from('task_microcompetencies')
          .insert(links)
          .select(`
            id, weightage, max_score,
            microcompetencies:microcompetency_id(
              id, name, description,
              components:component_id(
                id, name,
                sub_categories:sub_category_id(
                  id, name,
                  quadrants:quadrant_id(id, name)
                )
              )
            )
          `)
      );

      const createdLinks = linkResult.rows || [];

      console.log(`✅ Successfully linked ${createdLinks.length} microcompetencies to task ${task.name}`);

      return {
        success: true,
        task,
        linkedMicrocompetencies: createdLinks,
        message: `Successfully linked ${createdLinks.length} microcompetencies to task`
      };

    } catch (error) {
      console.error('❌ Error linking microcompetencies to task:', error.message);
      return {
        success: false,
        error: 'LINK_FAILED',
        message: 'Failed to link microcompetencies to task'
      };
    }
  }

  /**
   * Get task microcompetencies
   * @param {string} taskId - Task ID
   * @returns {Promise<Object>} Task microcompetencies
   */
  async getTaskMicrocompetencies(taskId) {
    try {
      const result = await query(
        supabase
          .from('task_microcompetencies')
          .select(`
            id, weightage, max_score, is_active,
            microcompetencies:microcompetency_id(
              id, name, description, weightage as micro_weightage, max_score as micro_max_score,
              components:component_id(
                id, name, category,
                sub_categories:sub_category_id(
                  id, name,
                  quadrants:quadrant_id(id, name, weightage as quadrant_weightage)
                )
              )
            )
          `)
          .eq('task_id', taskId)
          .eq('is_active', true)
          .order('weightage', { ascending: false })
      );

      const taskMicrocompetencies = result.rows || [];

      // Calculate total weightage
      const totalWeightage = taskMicrocompetencies.reduce((sum, tm) => sum + parseFloat(tm.weightage), 0);
      const isValidWeightage = Math.abs(totalWeightage - 100) <= this.tolerance;

      return {
        success: true,
        taskMicrocompetencies,
        totalWeightage,
        isValidWeightage,
        count: taskMicrocompetencies.length
      };

    } catch (error) {
      console.error('❌ Error getting task microcompetencies:', error.message);
      return {
        success: false,
        error: 'FETCH_FAILED',
        message: 'Failed to get task microcompetencies'
      };
    }
  }

  /**
   * Update task microcompetency weightage
   * @param {string} taskMicrocompetencyId - Task microcompetency ID
   * @param {number} weightage - New weightage
   * @param {number} maxScore - New max score
   * @returns {Promise<Object>} Update result
   */
  async updateTaskMicrocompetency(taskMicrocompetencyId, weightage, maxScore) {
    try {
      const updateResult = await query(
        supabase
          .from('task_microcompetencies')
          .update({
            weightage: parseFloat(weightage),
            max_score: parseFloat(maxScore),
            updated_at: new Date().toISOString()
          })
          .eq('id', taskMicrocompetencyId)
          .select(`
            id, task_id, weightage, max_score,
            microcompetencies:microcompetency_id(id, name)
          `)
      );

      if (!updateResult.rows || updateResult.rows.length === 0) {
        return {
          success: false,
          error: 'NOT_FOUND',
          message: 'Task microcompetency not found'
        };
      }

      const updated = updateResult.rows[0];

      // Validate total weightage for the task
      const taskWeightageCheck = await this.getTaskMicrocompetencies(updated.task_id);
      
      console.log(`✅ Updated task microcompetency weightage: ${updated.microcompetencies.name} = ${weightage}%`);

      return {
        success: true,
        updated,
        taskWeightageValid: taskWeightageCheck.isValidWeightage,
        taskTotalWeightage: taskWeightageCheck.totalWeightage,
        message: 'Task microcompetency updated successfully'
      };

    } catch (error) {
      console.error('❌ Error updating task microcompetency:', error.message);
      return {
        success: false,
        error: 'UPDATE_FAILED',
        message: 'Failed to update task microcompetency'
      };
    }
  }

  /**
   * Remove microcompetency from task
   * @param {string} taskMicrocompetencyId - Task microcompetency ID
   * @returns {Promise<Object>} Removal result
   */
  async removeTaskMicrocompetency(taskMicrocompetencyId) {
    try {
      const deleteResult = await query(
        supabase
          .from('task_microcompetencies')
          .delete()
          .eq('id', taskMicrocompetencyId)
          .select(`
            id, task_id,
            microcompetencies:microcompetency_id(id, name)
          `)
      );

      if (!deleteResult.rows || deleteResult.rows.length === 0) {
        return {
          success: false,
          error: 'NOT_FOUND',
          message: 'Task microcompetency not found'
        };
      }

      const removed = deleteResult.rows[0];

      console.log(`✅ Removed microcompetency ${removed.microcompetencies.name} from task`);

      return {
        success: true,
        removed,
        message: 'Microcompetency removed from task successfully'
      };

    } catch (error) {
      console.error('❌ Error removing task microcompetency:', error.message);
      return {
        success: false,
        error: 'REMOVAL_FAILED',
        message: 'Failed to remove task microcompetency'
      };
    }
  }

  /**
   * Get tasks by microcompetency
   * @param {string} microcompetencyId - Microcompetency ID
   * @returns {Promise<Object>} Tasks using this microcompetency
   */
  async getTasksByMicrocompetency(microcompetencyId) {
    try {
      const result = await query(
        supabase
          .from('task_microcompetencies')
          .select(`
            id, weightage, max_score,
            tasks:task_id(
              id, name, description, max_score, due_date, status,
              interventions:intervention_id(
                id, name, status,
                terms:term_id(id, name, is_current)
              )
            )
          `)
          .eq('microcompetency_id', microcompetencyId)
          .eq('is_active', true)
      );

      const taskLinks = result.rows || [];

      return {
        success: true,
        taskLinks,
        count: taskLinks.length
      };

    } catch (error) {
      console.error('❌ Error getting tasks by microcompetency:', error.message);
      return {
        success: false,
        error: 'FETCH_FAILED',
        message: 'Failed to get tasks by microcompetency'
      };
    }
  }

  /**
   * Bulk link microcompetencies to multiple tasks
   * @param {Array} taskMicrocompetencyMappings - Array of {taskId, microcompetencies}
   * @param {string} createdBy - User ID
   * @returns {Promise<Object>} Bulk link result
   */
  async bulkLinkMicrocompetencies(taskMicrocompetencyMappings, createdBy) {
    try {
      console.log(`📝 Bulk linking microcompetencies to ${taskMicrocompetencyMappings.length} tasks`);

      const results = [];
      const errors = [];

      for (const mapping of taskMicrocompetencyMappings) {
        try {
          const result = await this.linkMicrocompetenciesToTask(
            mapping.taskId,
            mapping.microcompetencies,
            createdBy
          );

          if (result.success) {
            results.push({
              taskId: mapping.taskId,
              linkedCount: result.linkedMicrocompetencies.length,
              message: result.message
            });
          } else {
            errors.push({
              taskId: mapping.taskId,
              error: result.error,
              message: result.message
            });
          }
        } catch (error) {
          errors.push({
            taskId: mapping.taskId,
            error: 'LINK_FAILED',
            message: error.message
          });
        }
      }

      const successCount = results.length;
      const errorCount = errors.length;

      console.log(`✅ Bulk linking complete: ${successCount} successful, ${errorCount} failed`);

      return {
        success: errorCount === 0,
        successCount,
        errorCount,
        results,
        errors,
        message: `Bulk linking complete: ${successCount} successful, ${errorCount} failed`
      };

    } catch (error) {
      console.error('❌ Error in bulk microcompetency linking:', error.message);
      return {
        success: false,
        error: 'BULK_LINK_FAILED',
        message: 'Failed to process bulk microcompetency linking'
      };
    }
  }

  /**
   * Get task-microcompetency statistics
   * @returns {Promise<Object>} Statistics
   */
  async getTaskMicrocompetencyStatistics() {
    try {
      const [
        totalTasksResult,
        linkedTasksResult,
        totalLinksResult,
        invalidWeightageTasksResult
      ] = await Promise.all([
        query(supabase.from('tasks').select('id').eq('status', 'Active')),
        query(supabase.from('task_microcompetencies').select('task_id').eq('is_active', true)),
        query(supabase.from('task_microcompetencies').select('id').eq('is_active', true)),
        this.getTasksWithInvalidWeightages()
      ]);

      const totalTasks = totalTasksResult.rows ? totalTasksResult.rows.length : 0;
      const uniqueLinkedTasks = linkedTasksResult.rows 
        ? new Set(linkedTasksResult.rows.map(l => l.task_id)).size 
        : 0;
      const totalLinks = totalLinksResult.rows ? totalLinksResult.rows.length : 0;
      const unlinkedTasks = totalTasks - uniqueLinkedTasks;
      const invalidWeightageTasks = invalidWeightageTasksResult.success 
        ? invalidWeightageTasksResult.invalidTasks.length 
        : 0;

      const linkageRate = totalTasks > 0 ? ((uniqueLinkedTasks / totalTasks) * 100).toFixed(1) : 0;
      const averageLinksPerTask = uniqueLinkedTasks > 0 ? (totalLinks / uniqueLinkedTasks).toFixed(2) : 0;

      return {
        success: true,
        statistics: {
          totalTasks,
          linkedTasks: uniqueLinkedTasks,
          unlinkedTasks,
          totalLinks,
          invalidWeightageTasks,
          linkageRate: parseFloat(linkageRate),
          averageLinksPerTask: parseFloat(averageLinksPerTask)
        }
      };

    } catch (error) {
      console.error('❌ Error getting task-microcompetency statistics:', error.message);
      return {
        success: false,
        error: 'STATISTICS_FAILED',
        message: 'Failed to get task-microcompetency statistics'
      };
    }
  }

  /**
   * Get tasks with invalid weightages
   * @returns {Promise<Object>} Tasks with invalid weightages
   */
  async getTasksWithInvalidWeightages() {
    try {
      // Get all tasks with their microcompetency weightages
      const result = await query(
        supabase
          .from('tasks')
          .select(`
            id, name,
            task_microcompetencies:task_microcompetencies!task_id(
              weightage
            )
          `)
          .eq('status', 'Active')
      );

      const tasks = result.rows || [];
      const invalidTasks = [];

      for (const task of tasks) {
        const microcompetencies = task.task_microcompetencies || [];
        if (microcompetencies.length > 0) {
          const totalWeightage = microcompetencies.reduce((sum, tm) => sum + parseFloat(tm.weightage), 0);
          if (Math.abs(totalWeightage - 100) > this.tolerance) {
            invalidTasks.push({
              taskId: task.id,
              taskName: task.name,
              totalWeightage,
              microcompetencyCount: microcompetencies.length
            });
          }
        }
      }

      return {
        success: true,
        invalidTasks,
        count: invalidTasks.length
      };

    } catch (error) {
      console.error('❌ Error getting tasks with invalid weightages:', error.message);
      return {
        success: false,
        error: 'VALIDATION_FAILED',
        message: 'Failed to get tasks with invalid weightages'
      };
    }
  }
}

module.exports = new TaskMicrocompetencyService();
