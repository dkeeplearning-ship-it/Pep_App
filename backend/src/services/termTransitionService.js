const { supabase, query } = require('../config/supabase');
const cron = require('node-cron');

/**
 * Term Transition Service
 * Handles automated term transitions and related operations
 */
class TermTransitionService {
  constructor() {
    this.isSchedulerRunning = false;
    this.transitionJobs = new Map();
  }

  /**
   * Initialize automated term transition scheduler
   */
  initializeScheduler() {
    if (this.isSchedulerRunning) {
      console.log('⚠️ Term transition scheduler already running');
      return;
    }

    // Check for term transitions every day at 2 AM
    cron.schedule('0 2 * * *', async () => {
      console.log('🕐 Running daily term transition check...');
      await this.checkAndExecuteTermTransitions();
    });

    // Check for upcoming transitions every hour
    cron.schedule('0 * * * *', async () => {
      console.log('🕐 Checking for upcoming term transitions...');
      await this.checkUpcomingTransitions();
    });

    this.isSchedulerRunning = true;
    console.log('✅ Term transition scheduler initialized');
  }

  /**
   * Check and execute any pending term transitions
   * @returns {Promise<Object>} Transition result
   */
  async checkAndExecuteTermTransitions() {
    try {
      console.log('🔍 Checking for pending term transitions...');

      // Get terms that should be current based on dates
      const currentDate = new Date().toISOString().split('T')[0];
      
      const termsToActivateResult = await query(
        supabase
          .from('terms')
          .select('id, name, start_date, end_date, is_current, is_active')
          .lte('start_date', currentDate)
          .gte('end_date', currentDate)
          .eq('is_active', true)
          .eq('is_current', false)
      );

      const termsToActivate = termsToActivateResult.rows || [];

      // Get terms that should no longer be current
      const termsToDeactivateResult = await query(
        supabase
          .from('terms')
          .select('id, name, start_date, end_date, is_current')
          .eq('is_current', true)
          .or(`end_date.lt.${currentDate},start_date.gt.${currentDate}`)
      );

      const termsToDeactivate = termsToDeactivateResult.rows || [];

      const transitions = [];

      // Process deactivations first
      for (const term of termsToDeactivate) {
        const result = await this.deactivateTerm(term.id, 'Automated transition - term ended');
        transitions.push({
          type: 'deactivation',
          termId: term.id,
          termName: term.name,
          result
        });
      }

      // Process activations
      for (const term of termsToActivate) {
        const result = await this.activateTerm(term.id, 'Automated transition - term started');
        transitions.push({
          type: 'activation',
          termId: term.id,
          termName: term.name,
          result
        });
      }

      if (transitions.length > 0) {
        console.log(`✅ Executed ${transitions.length} term transitions`);
        
        // Send notifications about transitions
        await this.notifyTermTransitions(transitions);
      } else {
        console.log('📋 No term transitions needed');
      }

      return {
        success: true,
        transitions,
        message: `Processed ${transitions.length} term transitions`
      };

    } catch (error) {
      console.error('❌ Error checking term transitions:', error.message);
      return {
        success: false,
        error: 'TRANSITION_CHECK_FAILED',
        message: 'Failed to check term transitions'
      };
    }
  }

  /**
   * Check for upcoming term transitions and send notifications
   * @returns {Promise<Object>} Check result
   */
  async checkUpcomingTransitions() {
    try {
      const currentDate = new Date();
      const threeDaysFromNow = new Date(currentDate.getTime() + (3 * 24 * 60 * 60 * 1000));
      const oneWeekFromNow = new Date(currentDate.getTime() + (7 * 24 * 60 * 60 * 1000));

      // Check for terms starting in 3 days
      const upcomingStartsResult = await query(
        supabase
          .from('terms')
          .select('id, name, start_date, end_date')
          .gte('start_date', currentDate.toISOString().split('T')[0])
          .lte('start_date', threeDaysFromNow.toISOString().split('T')[0])
          .eq('is_active', true)
          .eq('is_current', false)
      );

      // Check for terms ending in 1 week
      const upcomingEndsResult = await query(
        supabase
          .from('terms')
          .select('id, name, start_date, end_date')
          .gte('end_date', currentDate.toISOString().split('T')[0])
          .lte('end_date', oneWeekFromNow.toISOString().split('T')[0])
          .eq('is_current', true)
      );

      const upcomingStarts = upcomingStartsResult.rows || [];
      const upcomingEnds = upcomingEndsResult.rows || [];

      if (upcomingStarts.length > 0 || upcomingEnds.length > 0) {
        await this.notifyUpcomingTransitions(upcomingStarts, upcomingEnds);
      }

      return {
        success: true,
        upcomingStarts: upcomingStarts.length,
        upcomingEnds: upcomingEnds.length
      };

    } catch (error) {
      console.error('❌ Error checking upcoming transitions:', error.message);
      return {
        success: false,
        error: 'UPCOMING_CHECK_FAILED',
        message: 'Failed to check upcoming transitions'
      };
    }
  }

  /**
   * Activate a term and transition students
   * @param {string} termId - Term ID to activate
   * @param {string} reason - Reason for activation
   * @returns {Promise<Object>} Activation result
   */
  async activateTerm(termId, reason = 'Manual activation') {
    try {
      console.log(`🔄 Activating term ${termId}...`);

      // Deactivate current term first
      await query(
        supabase
          .from('terms')
          .update({ is_current: false })
          .eq('is_current', true)
      );

      // Activate new term
      const activationResult = await query(
        supabase
          .from('terms')
          .update({ 
            is_current: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', termId)
          .select('id, name, start_date, end_date')
      );

      if (!activationResult.rows || activationResult.rows.length === 0) {
        throw new Error('Failed to activate term');
      }

      const activatedTerm = activationResult.rows[0];

      // Transition all students to new term
      const studentTransitionResult = await this.transitionAllStudentsToTerm(termId);

      // Initialize scores for new term
      const scoreInitResult = await this.initializeTermScores(termId);

      // Archive previous term data
      const archiveResult = await this.archivePreviousTermData();

      console.log(`✅ Successfully activated term ${activatedTerm.name}`);

      return {
        success: true,
        activatedTerm,
        studentTransitions: studentTransitionResult,
        scoreInitialization: scoreInitResult,
        archiveResult,
        reason,
        message: `Successfully activated term ${activatedTerm.name}`
      };

    } catch (error) {
      console.error('❌ Error activating term:', error.message);
      return {
        success: false,
        error: 'ACTIVATION_FAILED',
        message: 'Failed to activate term'
      };
    }
  }

  /**
   * Deactivate a term
   * @param {string} termId - Term ID to deactivate
   * @param {string} reason - Reason for deactivation
   * @returns {Promise<Object>} Deactivation result
   */
  async deactivateTerm(termId, reason = 'Manual deactivation') {
    try {
      console.log(`🔄 Deactivating term ${termId}...`);

      const deactivationResult = await query(
        supabase
          .from('terms')
          .update({ 
            is_current: false,
            updated_at: new Date().toISOString()
          })
          .eq('id', termId)
          .select('id, name, start_date, end_date')
      );

      if (!deactivationResult.rows || deactivationResult.rows.length === 0) {
        throw new Error('Failed to deactivate term');
      }

      const deactivatedTerm = deactivationResult.rows[0];

      // Finalize term data
      const finalizationResult = await this.finalizeTermData(termId);

      console.log(`✅ Successfully deactivated term ${deactivatedTerm.name}`);

      return {
        success: true,
        deactivatedTerm,
        finalizationResult,
        reason,
        message: `Successfully deactivated term ${deactivatedTerm.name}`
      };

    } catch (error) {
      console.error('❌ Error deactivating term:', error.message);
      return {
        success: false,
        error: 'DEACTIVATION_FAILED',
        message: 'Failed to deactivate term'
      };
    }
  }

  /**
   * Transition all students to a new term
   * @param {string} termId - New term ID
   * @returns {Promise<Object>} Transition result
   */
  async transitionAllStudentsToTerm(termId) {
    try {
      const updateResult = await query(
        supabase
          .from('students')
          .update({ 
            current_term_id: termId,
            updated_at: new Date().toISOString()
          })
          .select('id')
      );

      const transitionedCount = updateResult.rows ? updateResult.rows.length : 0;

      console.log(`✅ Transitioned ${transitionedCount} students to new term`);

      return {
        success: true,
        transitionedCount,
        message: `Transitioned ${transitionedCount} students to new term`
      };

    } catch (error) {
      console.error('❌ Error transitioning students:', error.message);
      return {
        success: false,
        error: 'STUDENT_TRANSITION_FAILED',
        message: 'Failed to transition students'
      };
    }
  }

  /**
   * Initialize scores for a new term
   * @param {string} termId - Term ID
   * @returns {Promise<Object>} Initialization result
   */
  async initializeTermScores(termId) {
    try {
      // Get all students and microcompetencies
      const [studentsResult, microcompetenciesResult] = await Promise.all([
        query(supabase.from('students').select('id').eq('current_term_id', termId)),
        query(supabase.from('microcompetencies').select('id').eq('is_active', true))
      ]);

      const students = studentsResult.rows || [];
      const microcompetencies = microcompetenciesResult.rows || [];

      // Create initial score records (0 scores)
      const initialScores = [];
      for (const student of students) {
        for (const microcompetency of microcompetencies) {
          initialScores.push({
            student_id: student.id,
            microcompetency_id: microcompetency.id,
            term_id: termId,
            obtained_score: 0,
            max_score: 10,
            created_at: new Date().toISOString()
          });
        }
      }

      if (initialScores.length > 0) {
        // Insert in batches to avoid timeout
        const batchSize = 1000;
        let insertedCount = 0;

        for (let i = 0; i < initialScores.length; i += batchSize) {
          const batch = initialScores.slice(i, i + batchSize);
          await query(
            supabase
              .from('scores')
              .insert(batch)
          );
          insertedCount += batch.length;
        }

        console.log(`✅ Initialized ${insertedCount} score records for new term`);

        return {
          success: true,
          initializedScores: insertedCount,
          message: `Initialized ${insertedCount} score records`
        };
      }

      return {
        success: true,
        initializedScores: 0,
        message: 'No scores to initialize'
      };

    } catch (error) {
      console.error('❌ Error initializing term scores:', error.message);
      return {
        success: false,
        error: 'SCORE_INIT_FAILED',
        message: 'Failed to initialize term scores'
      };
    }
  }

  /**
   * Archive previous term data
   * @returns {Promise<Object>} Archive result
   */
  async archivePreviousTermData() {
    try {
      // This would typically move data to archive tables
      // For now, we'll just mark interventions as completed
      const archiveResult = await query(
        supabase
          .from('interventions')
          .update({ 
            status: 'Completed',
            updated_at: new Date().toISOString()
          })
          .eq('status', 'Active')
          .neq('term_id', await this.getCurrentTermId())
      );

      const archivedCount = archiveResult.rows ? archiveResult.rows.length : 0;

      console.log(`✅ Archived ${archivedCount} interventions from previous terms`);

      return {
        success: true,
        archivedInterventions: archivedCount,
        message: `Archived ${archivedCount} interventions`
      };

    } catch (error) {
      console.error('❌ Error archiving previous term data:', error.message);
      return {
        success: false,
        error: 'ARCHIVE_FAILED',
        message: 'Failed to archive previous term data'
      };
    }
  }

  /**
   * Finalize term data
   * @param {string} termId - Term ID to finalize
   * @returns {Promise<Object>} Finalization result
   */
  async finalizeTermData(termId) {
    try {
      // Calculate final grades and statistics
      const finalizationTasks = [
        this.calculateFinalGrades(termId),
        this.generateTermReport(termId),
        this.updateInterventionStatuses(termId)
      ];

      const results = await Promise.all(finalizationTasks);

      return {
        success: true,
        finalGrades: results[0],
        termReport: results[1],
        interventionUpdates: results[2],
        message: 'Term data finalized successfully'
      };

    } catch (error) {
      console.error('❌ Error finalizing term data:', error.message);
      return {
        success: false,
        error: 'FINALIZATION_FAILED',
        message: 'Failed to finalize term data'
      };
    }
  }

  /**
   * Calculate final grades for a term
   * @param {string} termId - Term ID
   * @returns {Promise<Object>} Calculation result
   */
  async calculateFinalGrades(termId) {
    try {
      // This would implement final grade calculation logic
      console.log(`📊 Calculating final grades for term ${termId}`);
      
      return {
        success: true,
        message: 'Final grades calculated'
      };

    } catch (error) {
      console.error('❌ Error calculating final grades:', error.message);
      return {
        success: false,
        error: 'GRADE_CALCULATION_FAILED',
        message: 'Failed to calculate final grades'
      };
    }
  }

  /**
   * Generate term report
   * @param {string} termId - Term ID
   * @returns {Promise<Object>} Report result
   */
  async generateTermReport(termId) {
    try {
      console.log(`📋 Generating term report for ${termId}`);
      
      return {
        success: true,
        message: 'Term report generated'
      };

    } catch (error) {
      console.error('❌ Error generating term report:', error.message);
      return {
        success: false,
        error: 'REPORT_GENERATION_FAILED',
        message: 'Failed to generate term report'
      };
    }
  }

  /**
   * Update intervention statuses for a term
   * @param {string} termId - Term ID
   * @returns {Promise<Object>} Update result
   */
  async updateInterventionStatuses(termId) {
    try {
      const updateResult = await query(
        supabase
          .from('interventions')
          .update({ 
            status: 'Completed',
            updated_at: new Date().toISOString()
          })
          .eq('term_id', termId)
          .eq('status', 'Active')
      );

      const updatedCount = updateResult.rows ? updateResult.rows.length : 0;

      return {
        success: true,
        updatedInterventions: updatedCount,
        message: `Updated ${updatedCount} interventions to completed status`
      };

    } catch (error) {
      console.error('❌ Error updating intervention statuses:', error.message);
      return {
        success: false,
        error: 'STATUS_UPDATE_FAILED',
        message: 'Failed to update intervention statuses'
      };
    }
  }

  /**
   * Get current term ID
   * @returns {Promise<string>} Current term ID
   */
  async getCurrentTermId() {
    try {
      const result = await query(
        supabase
          .from('terms')
          .select('id')
          .eq('is_current', true)
          .limit(1)
      );

      return result.rows && result.rows.length > 0 ? result.rows[0].id : null;

    } catch (error) {
      console.error('❌ Error getting current term ID:', error.message);
      return null;
    }
  }

  /**
   * Send notifications about term transitions
   * @param {Array} transitions - Array of transition results
   */
  async notifyTermTransitions(transitions) {
    try {
      console.log(`📧 Sending notifications for ${transitions.length} term transitions`);
      
      // This would implement notification logic (email, in-app, etc.)
      for (const transition of transitions) {
        console.log(`📧 Notification: Term ${transition.termName} ${transition.type}`);
      }

    } catch (error) {
      console.error('❌ Error sending transition notifications:', error.message);
    }
  }

  /**
   * Send notifications about upcoming transitions
   * @param {Array} upcomingStarts - Terms starting soon
   * @param {Array} upcomingEnds - Terms ending soon
   */
  async notifyUpcomingTransitions(upcomingStarts, upcomingEnds) {
    try {
      console.log(`📧 Sending upcoming transition notifications`);
      
      for (const term of upcomingStarts) {
        console.log(`📧 Upcoming: Term ${term.name} starts on ${term.start_date}`);
      }

      for (const term of upcomingEnds) {
        console.log(`📧 Upcoming: Term ${term.name} ends on ${term.end_date}`);
      }

    } catch (error) {
      console.error('❌ Error sending upcoming transition notifications:', error.message);
    }
  }

  /**
   * Schedule a specific term transition
   * @param {string} termId - Term ID
   * @param {Date} transitionDate - Date to execute transition
   * @returns {Promise<Object>} Schedule result
   */
  async scheduleTermTransition(termId, transitionDate) {
    try {
      const cronExpression = this.dateToCronExpression(transitionDate);
      
      const job = cron.schedule(cronExpression, async () => {
        console.log(`🕐 Executing scheduled transition for term ${termId}`);
        await this.activateTerm(termId, 'Scheduled transition');
        
        // Remove the job after execution
        this.transitionJobs.delete(termId);
        job.destroy();
      }, {
        scheduled: false
      });

      this.transitionJobs.set(termId, job);
      job.start();

      console.log(`⏰ Scheduled transition for term ${termId} at ${transitionDate}`);

      return {
        success: true,
        termId,
        transitionDate,
        cronExpression,
        message: 'Term transition scheduled successfully'
      };

    } catch (error) {
      console.error('❌ Error scheduling term transition:', error.message);
      return {
        success: false,
        error: 'SCHEDULE_FAILED',
        message: 'Failed to schedule term transition'
      };
    }
  }

  /**
   * Convert date to cron expression
   * @param {Date} date - Date to convert
   * @returns {string} Cron expression
   */
  dateToCronExpression(date) {
    const minute = date.getMinutes();
    const hour = date.getHours();
    const day = date.getDate();
    const month = date.getMonth() + 1;
    
    return `${minute} ${hour} ${day} ${month} *`;
  }

  /**
   * Stop the scheduler
   */
  stopScheduler() {
    // Stop all scheduled jobs
    this.transitionJobs.forEach((job, termId) => {
      job.destroy();
      console.log(`⏹️ Stopped scheduled transition for term ${termId}`);
    });
    
    this.transitionJobs.clear();
    this.isSchedulerRunning = false;
    console.log('⏹️ Term transition scheduler stopped');
  }
}

module.exports = new TermTransitionService();
