const { supabase, query } = require('../config/supabase');

/**
 * Intervention Analytics Service
 * Provides comprehensive analytics and reporting for interventions
 */
class InterventionAnalyticsService {
  constructor() {
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes cache
    this.cache = new Map();
  }

  /**
   * Get comprehensive intervention analytics
   * @param {string} termId - Optional term ID filter
   * @returns {Promise<Object>} Analytics data
   */
  async getInterventionAnalytics(termId = null) {
    try {
      console.log('📊 Generating intervention analytics...');

      const cacheKey = `intervention_analytics_${termId || 'all'}`;
      const cached = this.cache.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        console.log('📋 Returning cached analytics');
        return cached.data;
      }

      const [
        overviewData,
        enrollmentData,
        performanceData,
        teacherData,
        taskData,
        trendData
      ] = await Promise.all([
        this.getInterventionOverview(termId),
        this.getEnrollmentAnalytics(termId),
        this.getPerformanceAnalytics(termId),
        this.getTeacherAnalytics(termId),
        this.getTaskAnalytics(termId),
        this.getTrendAnalytics(termId)
      ]);

      const analytics = {
        success: true,
        termId,
        generatedAt: new Date().toISOString(),
        overview: overviewData,
        enrollment: enrollmentData,
        performance: performanceData,
        teachers: teacherData,
        tasks: taskData,
        trends: trendData
      };

      // Cache the result
      this.cache.set(cacheKey, {
        data: analytics,
        timestamp: Date.now()
      });

      console.log('✅ Intervention analytics generated successfully');
      return analytics;

    } catch (error) {
      console.error('❌ Error generating intervention analytics:', error.message);
      return {
        success: false,
        error: 'ANALYTICS_FAILED',
        message: 'Failed to generate intervention analytics'
      };
    }
  }

  /**
   * Get intervention overview statistics
   * @param {string} termId - Optional term ID filter
   * @returns {Promise<Object>} Overview data
   */
  async getInterventionOverview(termId = null) {
    try {
      let interventionQuery = supabase
        .from('interventions')
        .select('id, status, created_at, start_date, end_date, max_students');

      if (termId) {
        interventionQuery = interventionQuery.eq('term_id', termId);
      }

      const interventionsResult = await query(interventionQuery);
      const interventions = interventionsResult.rows || [];

      // Count by status
      const statusCounts = interventions.reduce((counts, intervention) => {
        counts[intervention.status] = (counts[intervention.status] || 0) + 1;
        return counts;
      }, {});

      // Calculate capacity utilization
      const totalCapacity = interventions.reduce((sum, i) => sum + (i.max_students || 0), 0);
      
      // Get actual enrollments
      let enrollmentQuery = supabase
        .from('intervention_enrollments')
        .select('intervention_id')
        .eq('enrollment_status', 'enrolled');

      if (termId) {
        enrollmentQuery = enrollmentQuery.in('intervention_id', interventions.map(i => i.id));
      }

      const enrollmentsResult = await query(enrollmentQuery);
      const totalEnrollments = enrollmentsResult.rows ? enrollmentsResult.rows.length : 0;

      const utilizationRate = totalCapacity > 0 ? ((totalEnrollments / totalCapacity) * 100).toFixed(1) : 0;

      // Calculate average duration
      const interventionsWithDates = interventions.filter(i => i.start_date && i.end_date);
      const averageDuration = interventionsWithDates.length > 0
        ? interventionsWithDates.reduce((sum, i) => {
            const start = new Date(i.start_date);
            const end = new Date(i.end_date);
            return sum + (end - start) / (1000 * 60 * 60 * 24); // days
          }, 0) / interventionsWithDates.length
        : 0;

      return {
        totalInterventions: interventions.length,
        statusBreakdown: statusCounts,
        totalCapacity,
        totalEnrollments,
        utilizationRate: parseFloat(utilizationRate),
        averageDuration: Math.round(averageDuration),
        activeInterventions: statusCounts['Active'] || 0,
        completedInterventions: statusCounts['Completed'] || 0
      };

    } catch (error) {
      console.error('❌ Error getting intervention overview:', error.message);
      throw error;
    }
  }

  /**
   * Get enrollment analytics
   * @param {string} termId - Optional term ID filter
   * @returns {Promise<Object>} Enrollment data
   */
  async getEnrollmentAnalytics(termId = null) {
    try {
      let baseQuery = `
        SELECT 
          i.id, i.name, i.max_students, i.status,
          COUNT(ie.student_id) as enrolled_count,
          COUNT(CASE WHEN ie.enrollment_status = 'enrolled' THEN 1 END) as active_enrollments,
          COUNT(CASE WHEN ie.enrollment_status = 'completed' THEN 1 END) as completed_enrollments,
          COUNT(CASE WHEN ie.enrollment_status = 'dropped' THEN 1 END) as dropped_enrollments
        FROM interventions i
        LEFT JOIN intervention_enrollments ie ON i.id = ie.intervention_id
      `;

      if (termId) {
        baseQuery += ` WHERE i.term_id = '${termId}'`;
      }

      baseQuery += ` GROUP BY i.id, i.name, i.max_students, i.status ORDER BY enrolled_count DESC`;

      const result = await query(supabase.rpc('execute_sql', { sql: baseQuery }));
      const enrollmentData = result.rows || [];

      // Calculate enrollment metrics
      const totalStudentsEnrolled = enrollmentData.reduce((sum, i) => sum + parseInt(i.enrolled_count), 0);
      const averageEnrollmentPerIntervention = enrollmentData.length > 0 
        ? (totalStudentsEnrolled / enrollmentData.length).toFixed(1) 
        : 0;

      // Find over/under enrolled interventions
      const overEnrolled = enrollmentData.filter(i => parseInt(i.enrolled_count) > i.max_students);
      const underEnrolled = enrollmentData.filter(i => parseInt(i.enrolled_count) < i.max_students * 0.5);

      return {
        interventionEnrollments: enrollmentData,
        totalStudentsEnrolled,
        averageEnrollmentPerIntervention: parseFloat(averageEnrollmentPerIntervention),
        overEnrolledInterventions: overEnrolled.length,
        underEnrolledInterventions: underEnrolled.length,
        enrollmentEfficiency: enrollmentData.length > 0 
          ? ((enrollmentData.filter(i => parseInt(i.enrolled_count) >= i.max_students * 0.7).length / enrollmentData.length) * 100).toFixed(1)
          : 0
      };

    } catch (error) {
      console.error('❌ Error getting enrollment analytics:', error.message);
      throw error;
    }
  }

  /**
   * Get performance analytics
   * @param {string} termId - Optional term ID filter
   * @returns {Promise<Object>} Performance data
   */
  async getPerformanceAnalytics(termId = null) {
    try {
      // Get intervention scores and completion rates
      let scoreQuery = `
        SELECT 
          i.id, i.name,
          COUNT(DISTINCT ie.student_id) as total_students,
          COUNT(DISTINCT s.student_id) as students_with_scores,
          AVG(s.obtained_score) as average_score,
          MAX(s.obtained_score) as highest_score,
          MIN(s.obtained_score) as lowest_score,
          COUNT(s.id) as total_scores
        FROM interventions i
        LEFT JOIN intervention_enrollments ie ON i.id = ie.intervention_id AND ie.enrollment_status = 'enrolled'
        LEFT JOIN scores s ON ie.student_id = s.student_id
      `;

      if (termId) {
        scoreQuery += ` WHERE i.term_id = '${termId}'`;
      }

      scoreQuery += ` GROUP BY i.id, i.name ORDER BY average_score DESC`;

      const scoreResult = await query(supabase.rpc('execute_sql', { sql: scoreQuery }));
      const performanceData = scoreResult.rows || [];

      // Calculate performance metrics
      const totalStudentsWithScores = performanceData.reduce((sum, i) => sum + parseInt(i.students_with_scores || 0), 0);
      const totalStudentsEnrolled = performanceData.reduce((sum, i) => sum + parseInt(i.total_students || 0), 0);
      
      const scoringCompletionRate = totalStudentsEnrolled > 0 
        ? ((totalStudentsWithScores / totalStudentsEnrolled) * 100).toFixed(1)
        : 0;

      const overallAverageScore = performanceData.length > 0
        ? performanceData.reduce((sum, i) => sum + parseFloat(i.average_score || 0), 0) / performanceData.length
        : 0;

      return {
        interventionPerformance: performanceData,
        scoringCompletionRate: parseFloat(scoringCompletionRate),
        overallAverageScore: parseFloat(overallAverageScore.toFixed(2)),
        totalStudentsWithScores,
        totalStudentsEnrolled,
        highPerformingInterventions: performanceData.filter(i => parseFloat(i.average_score || 0) >= 8).length,
        lowPerformingInterventions: performanceData.filter(i => parseFloat(i.average_score || 0) < 6).length
      };

    } catch (error) {
      console.error('❌ Error getting performance analytics:', error.message);
      throw error;
    }
  }

  /**
   * Get teacher analytics
   * @param {string} termId - Optional term ID filter
   * @returns {Promise<Object>} Teacher data
   */
  async getTeacherAnalytics(termId = null) {
    try {
      let teacherQuery = `
        SELECT 
          t.id, t.name, t.department, t.specialization,
          COUNT(DISTINCT it.intervention_id) as interventions_assigned,
          COUNT(DISTINCT ie.student_id) as students_taught,
          AVG(s.obtained_score) as average_student_score
        FROM teachers t
        LEFT JOIN intervention_teachers it ON t.id = it.teacher_id AND it.is_active = true
        LEFT JOIN interventions i ON it.intervention_id = i.id
        LEFT JOIN intervention_enrollments ie ON i.id = ie.intervention_id AND ie.enrollment_status = 'enrolled'
        LEFT JOIN scores s ON ie.student_id = s.student_id
      `;

      if (termId) {
        teacherQuery += ` WHERE i.term_id = '${termId}' OR i.term_id IS NULL`;
      }

      teacherQuery += ` GROUP BY t.id, t.name, t.department, t.specialization ORDER BY interventions_assigned DESC`;

      const teacherResult = await query(supabase.rpc('execute_sql', { sql: teacherQuery }));
      const teacherData = teacherResult.rows || [];

      // Calculate teacher metrics
      const totalTeachers = teacherData.length;
      const assignedTeachers = teacherData.filter(t => parseInt(t.interventions_assigned) > 0).length;
      const unassignedTeachers = totalTeachers - assignedTeachers;

      const averageInterventionsPerTeacher = assignedTeachers > 0
        ? (teacherData.reduce((sum, t) => sum + parseInt(t.interventions_assigned || 0), 0) / assignedTeachers).toFixed(1)
        : 0;

      // Department distribution
      const departmentDistribution = teacherData.reduce((dist, teacher) => {
        const dept = teacher.department || 'Unknown';
        dist[dept] = (dist[dept] || 0) + 1;
        return dist;
      }, {});

      return {
        teacherPerformance: teacherData,
        totalTeachers,
        assignedTeachers,
        unassignedTeachers,
        assignmentRate: totalTeachers > 0 ? ((assignedTeachers / totalTeachers) * 100).toFixed(1) : 0,
        averageInterventionsPerTeacher: parseFloat(averageInterventionsPerTeacher),
        departmentDistribution,
        topPerformingTeachers: teacherData
          .filter(t => t.average_student_score && parseFloat(t.average_student_score) >= 8)
          .slice(0, 5)
      };

    } catch (error) {
      console.error('❌ Error getting teacher analytics:', error.message);
      throw error;
    }
  }

  /**
   * Get task analytics
   * @param {string} termId - Optional term ID filter
   * @returns {Promise<Object>} Task data
   */
  async getTaskAnalytics(termId = null) {
    try {
      let taskQuery = `
        SELECT 
          t.id, t.name, t.max_score, t.status, t.due_date,
          i.name as intervention_name,
          COUNT(DISTINCT ts.student_id) as submissions,
          AVG(ts.score) as average_score,
          COUNT(DISTINCT ie.student_id) as eligible_students
        FROM tasks t
        JOIN interventions i ON t.intervention_id = i.id
        LEFT JOIN intervention_enrollments ie ON i.id = ie.intervention_id AND ie.enrollment_status = 'enrolled'
        LEFT JOIN task_submissions ts ON t.id = ts.task_id
      `;

      if (termId) {
        taskQuery += ` WHERE i.term_id = '${termId}'`;
      }

      taskQuery += ` GROUP BY t.id, t.name, t.max_score, t.status, t.due_date, i.name ORDER BY submissions DESC`;

      const taskResult = await query(supabase.rpc('execute_sql', { sql: taskQuery }));
      const taskData = taskResult.rows || [];

      // Calculate task metrics
      const totalTasks = taskData.length;
      const activeTasks = taskData.filter(t => t.status === 'Active').length;
      const completedTasks = taskData.filter(t => t.status === 'Completed').length;

      const totalSubmissions = taskData.reduce((sum, t) => sum + parseInt(t.submissions || 0), 0);
      const totalEligibleStudents = taskData.reduce((sum, t) => sum + parseInt(t.eligible_students || 0), 0);

      const submissionRate = totalEligibleStudents > 0 
        ? ((totalSubmissions / totalEligibleStudents) * 100).toFixed(1)
        : 0;

      const averageTaskScore = taskData.length > 0
        ? taskData.reduce((sum, t) => sum + parseFloat(t.average_score || 0), 0) / taskData.length
        : 0;

      return {
        taskPerformance: taskData,
        totalTasks,
        activeTasks,
        completedTasks,
        totalSubmissions,
        submissionRate: parseFloat(submissionRate),
        averageTaskScore: parseFloat(averageTaskScore.toFixed(2)),
        highSubmissionTasks: taskData.filter(t => {
          const rate = parseInt(t.eligible_students) > 0 
            ? (parseInt(t.submissions) / parseInt(t.eligible_students)) * 100 
            : 0;
          return rate >= 80;
        }).length,
        lowSubmissionTasks: taskData.filter(t => {
          const rate = parseInt(t.eligible_students) > 0 
            ? (parseInt(t.submissions) / parseInt(t.eligible_students)) * 100 
            : 0;
          return rate < 50;
        }).length
      };

    } catch (error) {
      console.error('❌ Error getting task analytics:', error.message);
      throw error;
    }
  }

  /**
   * Get trend analytics
   * @param {string} termId - Optional term ID filter
   * @returns {Promise<Object>} Trend data
   */
  async getTrendAnalytics(termId = null) {
    try {
      // Get intervention creation trends over time
      let trendQuery = `
        SELECT 
          DATE_TRUNC('week', created_at) as week,
          COUNT(*) as interventions_created,
          COUNT(CASE WHEN status = 'Active' THEN 1 END) as active_interventions,
          COUNT(CASE WHEN status = 'Completed' THEN 1 END) as completed_interventions
        FROM interventions
      `;

      if (termId) {
        trendQuery += ` WHERE term_id = '${termId}'`;
      }

      trendQuery += ` GROUP BY DATE_TRUNC('week', created_at) ORDER BY week DESC LIMIT 12`;

      const trendResult = await query(supabase.rpc('execute_sql', { sql: trendQuery }));
      const trendData = trendResult.rows || [];

      // Get enrollment trends
      let enrollmentTrendQuery = `
        SELECT 
          DATE_TRUNC('week', enrolled_at) as week,
          COUNT(*) as new_enrollments
        FROM intervention_enrollments
        WHERE enrollment_status = 'enrolled'
      `;

      if (termId) {
        enrollmentTrendQuery += ` AND intervention_id IN (SELECT id FROM interventions WHERE term_id = '${termId}')`;
      }

      enrollmentTrendQuery += ` GROUP BY DATE_TRUNC('week', enrolled_at) ORDER BY week DESC LIMIT 12`;

      const enrollmentTrendResult = await query(supabase.rpc('execute_sql', { sql: enrollmentTrendQuery }));
      const enrollmentTrendData = enrollmentTrendResult.rows || [];

      return {
        interventionCreationTrend: trendData,
        enrollmentTrend: enrollmentTrendData,
        weeklyGrowthRate: this.calculateGrowthRate(trendData, 'interventions_created'),
        enrollmentGrowthRate: this.calculateGrowthRate(enrollmentTrendData, 'new_enrollments')
      };

    } catch (error) {
      console.error('❌ Error getting trend analytics:', error.message);
      throw error;
    }
  }

  /**
   * Calculate growth rate from trend data
   * @param {Array} trendData - Trend data array
   * @param {string} field - Field to calculate growth for
   * @returns {number} Growth rate percentage
   */
  calculateGrowthRate(trendData, field) {
    if (trendData.length < 2) return 0;

    const latest = parseInt(trendData[0][field] || 0);
    const previous = parseInt(trendData[1][field] || 0);

    if (previous === 0) return latest > 0 ? 100 : 0;

    return parseFloat(((latest - previous) / previous * 100).toFixed(1));
  }

  /**
   * Clear analytics cache
   */
  clearCache() {
    this.cache.clear();
    console.log('🗑️ Analytics cache cleared');
  }

  /**
   * Get intervention comparison analytics
   * @param {Array} interventionIds - Array of intervention IDs to compare
   * @returns {Promise<Object>} Comparison data
   */
  async compareInterventions(interventionIds) {
    try {
      console.log(`📊 Comparing ${interventionIds.length} interventions`);

      const comparisonData = await Promise.all(
        interventionIds.map(async (id) => {
          const [overview, enrollment, performance] = await Promise.all([
            this.getInterventionOverview(null, id),
            this.getEnrollmentAnalytics(null, id),
            this.getPerformanceAnalytics(null, id)
          ]);

          return {
            interventionId: id,
            overview,
            enrollment,
            performance
          };
        })
      );

      return {
        success: true,
        comparisonData,
        generatedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Error comparing interventions:', error.message);
      return {
        success: false,
        error: 'COMPARISON_FAILED',
        message: 'Failed to compare interventions'
      };
    }
  }
}

module.exports = new InterventionAnalyticsService();
