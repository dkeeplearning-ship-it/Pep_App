/**
 * Enhanced Term Management Service
 * Manages term lifecycle: Upcoming → Active → Completed → Archived
 * Integrates with existing HPS calculation and eligibility systems
 */

const { supabase, query } = require('../config/supabase');
const smartBatchProgressionService = require('./smartBatchProgressionService');
const unifiedScoreService = require('./enhancedUnifiedScoreCalculationServiceV2');

class EnhancedTermManagementService {

  /**
   * Create a new term with proper lifecycle setup
   */
  async createTerm(termData) {
    try {
      console.log('🆕 Creating new term with lifecycle management');

      const {
        name,
        description,
        start_date,
        end_date,
        academic_year,
        term_number,
        level_name,
        attendance_threshold = 75,
        max_students
      } = termData;

      // Determine term status based on dates
      const currentDate = new Date();
      const startDate = new Date(start_date);
      const endDate = new Date(end_date);
      
      let term_status = 'upcoming';
      if (currentDate >= startDate && currentDate <= endDate) {
        term_status = 'active';
      } else if (currentDate > endDate) {
        term_status = 'completed';
      }

      // Set progression requirements based on term number
      const progression_requirements = this.getProgressionRequirements(term_number);
      const eligibility_rules = this.getEligibilityRules(term_number);

      const newTerm = {
        name,
        description,
        start_date,
        end_date,
        academic_year,
        term_number,
        level_name: level_name || `Level ${term_number - 1}`,
        term_status,
        attendance_threshold,
        progression_requirements: JSON.stringify(progression_requirements),
        eligibility_rules: JSON.stringify(eligibility_rules),
        max_students,
        is_active: true,
        is_current: term_status === 'active'
      };

      const result = await query(
        supabase
          .from('terms')
          .insert(newTerm)
          .select('*')
      );

      const createdTerm = result.rows?.[0];
      
      // Log term creation event
      await this.logTermLifecycleEvent(createdTerm.id, 'created', null, {
        term_data: newTerm
      });

      console.log(`✅ Term created: ${createdTerm.name} (${term_status})`);
      
      return {
        success: true,
        term: createdTerm,
        message: 'Term created successfully'
      };

    } catch (error) {
      console.error('❌ Create term error:', error);
      throw new Error(`Failed to create term: ${error.message}`);
    }
  }

  /**
   * Activate a term (transition from upcoming to active)
   */
  async activateTerm(termId, triggeredBy = null) {
    try {
      console.log(`🚀 Activating term: ${termId}`);

      // Get term details
      const termResult = await query(
        supabase
          .from('terms')
          .select('*')
          .eq('id', termId)
          .limit(1)
      );

      const term = termResult.rows?.[0];
      if (!term) {
        throw new Error('Term not found');
      }

      // Allow activation of upcoming terms or reactivation of completed terms
      if (term.term_status !== 'upcoming' && term.term_status !== 'completed') {
        throw new Error(`Cannot activate term with status: ${term.term_status}`);
      }

      // Deactivate any currently active terms of the same term_number
      await query(
        supabase
          .from('terms')
          .update({ 
            is_current: false,
            term_status: 'completed'
          })
          .eq('term_number', term.term_number)
          .eq('is_current', true)
      );

      // Activate the new term
      await query(
        supabase
          .from('terms')
          .update({
            term_status: 'active',
            is_current: true
          })
          .eq('id', termId)
      );

      // Initialize term for all relevant batches
      await this.initializeTermForBatches(termId, term.term_number);

      // Log activation event
      await this.logTermLifecycleEvent(termId, 'activated', triggeredBy, {
        activation_date: new Date().toISOString()
      });

      console.log(`✅ Term activated: ${term.name}`);

      return {
        success: true,
        termId,
        termName: term.name,
        message: 'Term activated successfully'
      };

    } catch (error) {
      console.error('❌ Activate term error:', error);
      throw new Error(`Failed to activate term: ${error.message}`);
    }
  }

  /**
   * Complete a term (transition from active to completed)
   */
  async completeTerm(termId, triggeredBy = null) {
    try {
      console.log(`🎯 Completing term: ${termId}`);

      // Get term details
      const termResult = await query(
        supabase
          .from('terms')
          .select('*')
          .eq('id', termId)
          .limit(1)
      );

      const term = termResult.rows?.[0];
      if (!term) {
        throw new Error('Term not found');
      }

      // Allow completion of active or upcoming terms
      if (term.term_status !== 'active' && term.term_status !== 'upcoming') {
        throw new Error(`Cannot complete term with status: ${term.term_status}`);
      }

      // Get all batches in this term
      const batchesResult = await query(
        supabase
          .from('batch_term_progression')
          .select('batch_id')
          .eq('term_id', termId)
          .eq('status', 'active')
      );

      const batches = batchesResult.rows || [];

      // Complete term for each batch
      const batchCompletionResults = [];
      for (const batch of batches) {
        try {
          const result = await smartBatchProgressionService.completeBatchTerm(
            batch.batch_id, 
            term.term_number
          );
          batchCompletionResults.push(result);
        } catch (error) {
          console.error(`❌ Error completing term for batch ${batch.batch_id}:`, error);
          batchCompletionResults.push({
            batchId: batch.batch_id,
            success: false,
            error: error.message
          });
        }
      }

      // Update term status
      await query(
        supabase
          .from('terms')
          .update({
            term_status: 'completed',
            is_current: false,
            completion_date: new Date().toISOString().split('T')[0]
          })
          .eq('id', termId)
      );

      // Preserve term data (create snapshot)
      await this.preserveTermData(termId);

      // Log completion event
      await this.logTermLifecycleEvent(termId, 'completed', triggeredBy, {
        completion_date: new Date().toISOString(),
        batch_results: batchCompletionResults
      });

      console.log(`✅ Term completed: ${term.name}`);

      return {
        success: true,
        termId,
        termName: term.name,
        batchResults: batchCompletionResults,
        message: 'Term completed successfully'
      };

    } catch (error) {
      console.error('❌ Complete term error:', error);
      throw new Error(`Failed to complete term: ${error.message}`);
    }
  }

  /**
   * Archive a completed term
   */
  async archiveTerm(termId, triggeredBy = null) {
    try {
      console.log(`📦 Archiving term: ${termId}`);

      // Get term details
      const termResult = await query(
        supabase
          .from('terms')
          .select('*')
          .eq('id', termId)
          .limit(1)
      );

      const term = termResult.rows?.[0];
      if (!term) {
        throw new Error('Term not found');
      }

      if (term.term_status !== 'completed') {
        throw new Error(`Cannot archive term with status: ${term.term_status}`);
      }

      // Update term status
      await query(
        supabase
          .from('terms')
          .update({
            term_status: 'archived',
            is_active: false
          })
          .eq('id', termId)
      );

      // Log archive event
      await this.logTermLifecycleEvent(termId, 'archived', triggeredBy, {
        archive_date: new Date().toISOString()
      });

      console.log(`✅ Term archived: ${term.name}`);

      return {
        success: true,
        termId,
        termName: term.name,
        message: 'Term archived successfully'
      };

    } catch (error) {
      console.error('❌ Archive term error:', error);
      throw new Error(`Failed to archive term: ${error.message}`);
    }
  }

  /**
   * Initialize term for all relevant batches
   */
  async initializeTermForBatches(termId, termNumber) {
    try {
      // Get batches that should be in this term number
      const batchesResult = await query(
        supabase
          .from('batches')
          .select('id, name')
          .eq('current_term_number', termNumber)
          .eq('batch_status', 'active')
      );

      const batches = batchesResult.rows || [];

      for (const batch of batches) {
        // Update batch term progression
        await query(
          supabase
            .from('batch_term_progression')
            .update({ 
              status: 'active',
              term_id: termId
            })
            .eq('batch_id', batch.id)
            .eq('term_number', termNumber)
        );

        // Enroll batch students in this term
        await smartBatchProgressionService.enrollBatchStudentsInTerm(batch.id, termNumber);
      }

      console.log(`📚 Initialized term for ${batches.length} batches`);

    } catch (error) {
      console.error('❌ Initialize term for batches error:', error);
      throw error;
    }
  }

  /**
   * Preserve term data for historical reference
   */
  async preserveTermData(termId) {
    try {
      // Get all student term progressions for this term
      const progressionsResult = await query(
        supabase
          .from('student_term_progression')
          .select('*')
          .eq('term_id', termId)
      );

      const progressions = progressionsResult.rows || [];

      // Calculate final statistics
      const stats = {
        total_students: progressions.length,
        completed_students: progressions.filter(p => p.status === 'completed').length,
        failed_students: progressions.filter(p => p.status === 'failed').length,
        average_hps: progressions.reduce((sum, p) => sum + (p.final_hps || 0), 0) / progressions.length,
        grade_distribution: this.calculateGradeDistribution(progressions)
      };

      // Store term summary
      await query(
        supabase
          .from('term_lifecycle_events')
          .insert({
            term_id: termId,
            event_type: 'data_preserved',
            event_date: new Date().toISOString(),
            event_data: JSON.stringify({
              statistics: stats,
              preservation_date: new Date().toISOString()
            })
          })
      );

      console.log(`💾 Term data preserved with ${stats.total_students} student records`);

    } catch (error) {
      console.error('❌ Preserve term data error:', error);
      throw error;
    }
  }

  /**
   * Calculate grade distribution
   */
  calculateGradeDistribution(progressions) {
    const distribution = { 'A+': 0, 'A': 0, 'B': 0, 'C': 0, 'D': 0, 'E': 0, 'IC': 0 };
    
    progressions.forEach(p => {
      if (p.final_grade && distribution.hasOwnProperty(p.final_grade)) {
        distribution[p.final_grade]++;
      }
    });

    return distribution;
  }

  /**
   * Get progression requirements for term number
   */
  getProgressionRequirements(termNumber) {
    const requirements = {
      1: { persona_threshold: 40, wellness_threshold: 40, behavior_threshold: 3, discipline_threshold: 3 },
      2: { persona_threshold: 45, wellness_threshold: 45, behavior_threshold: 3.5, discipline_threshold: 3.5 },
      3: { persona_threshold: 50, wellness_threshold: 50, behavior_threshold: 4, discipline_threshold: 4 },
      4: { persona_threshold: 55, wellness_threshold: 55, behavior_threshold: 4.5, discipline_threshold: 4.5 }
    };
    
    return requirements[termNumber] || requirements[1];
  }

  /**
   * Get eligibility rules for term number
   */
  getEligibilityRules(termNumber) {
    return {
      attendance_required: true,
      quadrant_clearance_required: ['Persona', 'Wellness'],
      behavior_rating_min: 3,
      use_existing_hps_calculation: true
    };
  }

  /**
   * Log term lifecycle event
   */
  async logTermLifecycleEvent(termId, eventType, triggeredBy, eventData) {
    try {
      await query(
        supabase
          .from('term_lifecycle_events')
          .insert({
            term_id: termId,
            event_type: eventType,
            event_date: new Date().toISOString(),
            triggered_by: triggeredBy,
            event_data: JSON.stringify(eventData || {}),
            notes: `Term ${eventType} automatically`
          })
      );
    } catch (error) {
      console.error('❌ Log term lifecycle event error:', error);
      // Don't throw - this is logging only
    }
  }

  /**
   * Get term lifecycle status
   */
  async getTermLifecycleStatus(termId) {
    try {
      // Get term details
      const termResult = await query(
        supabase
          .from('terms')
          .select('*')
          .eq('id', termId)
          .limit(1)
      );

      const term = termResult.rows?.[0];
      if (!term) {
        throw new Error('Term not found');
      }

      // Get lifecycle events
      const eventsResult = await query(
        supabase
          .from('term_lifecycle_events')
          .select('*')
          .eq('term_id', termId)
          .order('event_date', { ascending: false })
      );

      const events = eventsResult.rows || [];

      // Get student statistics
      const statsResult = await query(
        supabase
          .from('student_term_progression')
          .select('status, COUNT(*) as count')
          .eq('term_id', termId)
          .group('status')
      );

      const stats = statsResult.rows || [];

      return {
        term,
        lifecycle_events: events,
        student_statistics: stats,
        current_status: term.term_status
      };

    } catch (error) {
      console.error('❌ Get term lifecycle status error:', error);
      throw new Error(`Failed to get term lifecycle status: ${error.message}`);
    }
  }

  /**
   * Auto-transition terms based on dates
   */
  async autoTransitionTerms() {
    try {
      console.log('🔄 Checking for automatic term transitions...');

      const currentDate = new Date().toISOString().split('T')[0];

      // Find terms that should be activated
      const termsToActivateResult = await query(
        supabase
          .from('terms')
          .select('id, name, start_date')
          .eq('term_status', 'upcoming')
          .lte('start_date', currentDate)
      );

      const termsToActivate = termsToActivateResult.rows || [];

      // Find terms that should be completed
      const termsToCompleteResult = await query(
        supabase
          .from('terms')
          .select('id, name, end_date')
          .eq('term_status', 'active')
          .lt('end_date', currentDate)
      );

      const termsToComplete = termsToCompleteResult.rows || [];

      // Process activations
      for (const term of termsToActivate) {
        try {
          await this.activateTerm(term.id, 'system_auto');
          console.log(`✅ Auto-activated term: ${term.name}`);
        } catch (error) {
          console.error(`❌ Failed to auto-activate term ${term.name}:`, error);
        }
      }

      // Process completions
      for (const term of termsToComplete) {
        try {
          await this.completeTerm(term.id, 'system_auto');
          console.log(`✅ Auto-completed term: ${term.name}`);
        } catch (error) {
          console.error(`❌ Failed to auto-complete term ${term.name}:`, error);
        }
      }

      return {
        success: true,
        activated: termsToActivate.length,
        completed: termsToComplete.length,
        message: 'Auto-transition completed'
      };

    } catch (error) {
      console.error('❌ Auto-transition terms error:', error);
      throw new Error(`Failed to auto-transition terms: ${error.message}`);
    }
  }
}

module.exports = new EnhancedTermManagementService();
