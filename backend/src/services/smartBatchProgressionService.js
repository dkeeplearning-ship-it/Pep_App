/**
 * Smart Batch Progression Service
 * Manages multiple student batches across different terms with proper progression tracking
 * Integrates with existing unified scoring system for eligibility calculations
 */

const { supabase, query } = require('../config/supabase');
const unifiedScoreService = require('./enhancedUnifiedScoreCalculationServiceV2');

class SmartBatchProgressionService {

  /**
   * Get all batches with progression status
   */
  async getAllBatchesWithProgression() {
    try {
      console.log('📊 Getting all batches with progression status');

      // Get all batches from database
      const batchesResult = await query(
        supabase
          .from('batches')
          .select(`
            id,
            name,
            year,
            current_term_number,
            max_terms,
            batch_status,
            batch_start_date,
            expected_graduation_date
          `)
          .order('name', { ascending: true })
      );

      const batches = batchesResult.rows || [];

      // For each batch, get student count and progression data
      const batchesWithProgression = await Promise.all(
        batches.map(async (batch) => {
          // Get student count for this batch
          const studentsResult = await query(
            supabase
              .from('students')
              .select('id', { count: 'exact' })
              .eq('batch_id', batch.id)
              .eq('status', 'Active')
          );

          const studentCount = studentsResult.count || 0;

          // Get progression data for this batch
          const progressionsResult = await query(
            supabase
              .from('batch_term_progression')
              .select(`
                term_number,
                status,
                students_enrolled,
                students_completed,
                students_failed,
                start_date,
                end_date
              `)
              .eq('batch_id', batch.id)
              .order('term_number', { ascending: true })
          );

          const progressions = progressionsResult.rows || [];

          // Get current term stats
          const currentTermStats = await this.getCurrentTermStats(batch.id, batch.current_term_number || 1);

          return {
            id: batch.id,
            name: batch.name,
            year: batch.year,
            current_term_number: batch.current_term_number || 1,
            max_terms: batch.max_terms || 4,
            batch_status: batch.batch_status || 'active',
            student_count: studentCount,
            progressions,
            currentTermStats
          };
        })
      );

      return batchesWithProgression;
    } catch (error) {
      console.error('❌ Get all batches with progression error:', error);
      throw error;
    }
  }

  /**
   * Get specific batch progression status
   */
  async getBatchProgressionStatus(batchId) {
    try {
      console.log(`📊 Getting batch progression status for: ${batchId}`);

      // Get batch details
      const batchResult = await query(
        supabase
          .from('batches')
          .select(`
            id,
            name,
            year,
            current_term_number,
            max_terms,
            batch_status,
            batch_start_date,
            expected_graduation_date
          `)
          .eq('id', batchId)
          .limit(1)
      );

      const batch = batchResult.rows?.[0];
      if (!batch) {
        throw new Error(`Batch not found: ${batchId}`);
      }

      // Get student count for this batch
      const studentsResult = await query(
        supabase
          .from('students')
          .select('id', { count: 'exact' })
          .eq('batch_id', batchId)
          .eq('status', 'Active')
      );

      const studentCount = studentsResult.count || 0;

      // Get progression data for this batch
      const progressionsResult = await query(
        supabase
          .from('batch_term_progression')
          .select(`
            term_number,
            status,
            students_enrolled,
            students_completed,
            students_failed,
            start_date,
            end_date
          `)
          .eq('batch_id', batchId)
          .order('term_number', { ascending: true })
      );

      const progressions = progressionsResult.rows || [];

      // Get current term stats
      const currentTermStats = await this.getCurrentTermStats(batchId, batch.current_term_number || 1);

      return {
        batch: {
          id: batch.id,
          name: batch.name,
          year: batch.year,
          current_term_number: batch.current_term_number || 1,
          max_terms: batch.max_terms || 4,
          batch_status: batch.batch_status || 'active',
          student_count: studentCount
        },
        progressions,
        currentTermStats
      };
    } catch (error) {
      console.error('❌ Get batch progression status error:', error);
      throw error;
    }
  }

  /**
   * Get current term statistics for a batch
   */
  async getCurrentTermStats(batchId, termNumber) {
    try {
      // Get student term progression stats
      const statsResult = await query(
        supabase
          .from('student_term_progression')
          .select('status')
          .eq('batch_id', batchId)
          .eq('term_number', termNumber)
      );

      const progressions = statsResult.rows || [];

      const stats = {
        enrolled: 0,
        active: 0,
        completed: 0,
        failed: 0
      };

      progressions.forEach(progression => {
        switch (progression.status) {
          case 'enrolled':
            stats.enrolled++;
            stats.active++; // enrolled students are considered active
            break;
          case 'active':
            stats.active++;
            break;
          case 'completed':
            stats.completed++;
            break;
          case 'failed':
            stats.failed++;
            break;
        }
      });

      // If no progression data, get student count from batch
      if (progressions.length === 0) {
        const studentsResult = await query(
          supabase
            .from('students')
            .select('id', { count: 'exact' })
            .eq('batch_id', batchId)
            .eq('status', 'Active')
        );

        stats.enrolled = studentsResult.count || 0;
        stats.active = stats.enrolled;
      }

      return stats;
    } catch (error) {
      console.error('❌ Get current term stats error:', error);
      return { enrolled: 0, active: 0, completed: 0, failed: 0 };
    }
  }

  /**
   * Initialize batch progression system for a new batch
   * @param {string} batchId - Batch UUID
   * @param {Object} progressionPlan - Batch progression configuration
   */
  async initializeBatchProgression(batchId, progressionPlan) {
    try {
      console.log(`🎓 Initializing batch progression for batch: ${batchId}`);

      const {
        startTermNumber = 1,
        maxTerms = 4,
        batchStartDate,
        expectedGraduationDate
      } = progressionPlan;

      // Update batch with progression info
      await query(
        supabase
          .from('batches')
          .update({
            current_term_number: startTermNumber,
            max_terms: maxTerms,
            batch_start_date: batchStartDate,
            expected_graduation_date: expectedGraduationDate,
            batch_status: 'active'
          })
          .eq('id', batchId)
      );

      // Create batch term progression plan
      await this.createBatchTermProgressionPlan(batchId, startTermNumber, maxTerms);

      // Enroll all students in the starting term
      await this.enrollBatchStudentsInTerm(batchId, startTermNumber);

      console.log(`✅ Batch progression initialized for ${maxTerms} terms`);
      
      return {
        success: true,
        batchId,
        startTermNumber,
        maxTerms,
        message: 'Batch progression initialized successfully'
      };

    } catch (error) {
      console.error('❌ Initialize batch progression error:', error);
      throw new Error(`Failed to initialize batch progression: ${error.message}`);
    }
  }

  /**
   * Create batch term progression plan
   */
  async createBatchTermProgressionPlan(batchId, startTermNumber, maxTerms) {
    try {
      // Get available terms for this progression
      const termsResult = await query(
        supabase
          .from('terms')
          .select('id, name, term_number, start_date, end_date')
          .gte('term_number', startTermNumber)
          .lte('term_number', startTermNumber + maxTerms - 1)
          .order('term_number', { ascending: true })
      );

      const availableTerms = termsResult.rows || [];
      
      if (availableTerms.length < maxTerms) {
        throw new Error(`Insufficient terms available. Need ${maxTerms}, found ${availableTerms.length}`);
      }

      // Create batch term progression records
      const progressionRecords = availableTerms.map((term, index) => ({
        batch_id: batchId,
        term_id: term.id,
        term_number: term.term_number,
        status: index === 0 ? 'active' : 'upcoming',
        start_date: term.start_date,
        end_date: term.end_date,
        students_enrolled: 0
      }));

      const result = await query(
        supabase
          .from('batch_term_progression')
          .upsert(progressionRecords, {
            onConflict: 'batch_id,term_number'
          })
      );

      return result;

    } catch (error) {
      console.error('❌ Create batch term progression plan error:', error);
      throw error;
    }
  }

  /**
   * Enroll all students from a batch into a specific term
   */
  async enrollBatchStudentsInTerm(batchId, termNumber) {
    try {
      // Get all students in the batch
      const studentsResult = await query(
        supabase
          .from('students')
          .select('id')
          .eq('batch_id', batchId)
      );

      const students = studentsResult.rows || [];
      
      // Get the term for this term number
      const termResult = await query(
        supabase
          .from('terms')
          .select('id')
          .eq('term_number', termNumber)
          .limit(1)
      );

      const term = termResult.rows?.[0];
      if (!term) {
        throw new Error(`Term ${termNumber} not found`);
      }

      // Update students' current_term_id
      await query(
        supabase
          .from('students')
          .update({ current_term_id: term.id })
          .eq('batch_id', batchId)
      );

      // Create student term progression records
      const progressionRecords = students.map(student => ({
        student_id: student.id,
        batch_id: batchId,
        term_id: term.id,
        term_number: termNumber,
        status: 'enrolled',
        enrollment_date: new Date().toISOString().split('T')[0]
      }));

      if (progressionRecords.length > 0) {
        await query(
          supabase
            .from('student_term_progression')
            .upsert(progressionRecords, {
              onConflict: 'student_id,term_id'
            })
        );
      }

      // Update batch term progression student count
      await query(
        supabase
          .from('batch_term_progression')
          .update({ students_enrolled: students.length })
          .eq('batch_id', batchId)
          .eq('term_number', termNumber)
      );

      console.log(`📚 Enrolled ${students.length} students in term ${termNumber}`);
      
      return {
        success: true,
        studentsEnrolled: students.length,
        termId: term.id,
        termNumber
      };

    } catch (error) {
      console.error('❌ Enroll batch students error:', error);
      throw error;
    }
  }

  /**
   * Complete a term for a batch and progress eligible students
   */
  async completeBatchTerm(batchId, termNumber) {
    try {
      console.log(`🎯 Completing term ${termNumber} for batch ${batchId}`);

      // Get all students in this batch-term
      const studentsResult = await query(
        supabase
          .from('student_term_progression')
          .select('student_id, term_id')
          .eq('batch_id', batchId)
          .eq('term_number', termNumber)
          .eq('status', 'enrolled')
      );

      const students = studentsResult.rows || [];
      let completedCount = 0;
      let failedCount = 0;
      let eligibleForNext = 0;

      // Process each student
      for (const student of students) {
        const completionResult = await this.completeStudentTerm(
          student.student_id, 
          student.term_id, 
          batchId, 
          termNumber
        );
        
        if (completionResult.status === 'completed') {
          completedCount++;
          if (completionResult.canProgressToNext) {
            eligibleForNext++;
          }
        } else {
          failedCount++;
        }
      }

      // Update batch term progression status
      await query(
        supabase
          .from('batch_term_progression')
          .update({
            status: 'completed',
            completion_date: new Date().toISOString().split('T')[0],
            students_completed: completedCount,
            students_failed: failedCount
          })
          .eq('batch_id', batchId)
          .eq('term_number', termNumber)
      );

      // Update batch current term number
      const nextTermNumber = termNumber + 1;
      const batchResult = await query(
        supabase
          .from('batches')
          .select('max_terms')
          .eq('id', batchId)
          .limit(1)
      );

      const batch = batchResult.rows?.[0];
      if (batch && nextTermNumber <= batch.max_terms) {
        await query(
          supabase
            .from('batches')
            .update({ current_term_number: nextTermNumber })
            .eq('id', batchId)
        );

        // Activate next term for this batch
        await this.activateNextTermForBatch(batchId, nextTermNumber);
      } else {
        // Batch completed all terms
        await query(
          supabase
            .from('batches')
            .update({ batch_status: 'graduated' })
            .eq('id', batchId)
        );
      }

      console.log(`✅ Term ${termNumber} completed: ${completedCount} passed, ${failedCount} failed`);

      return {
        success: true,
        termNumber,
        studentsProcessed: students.length,
        completedCount,
        failedCount,
        eligibleForNext,
        nextTermNumber: nextTermNumber <= (batch?.max_terms || 4) ? nextTermNumber : null
      };

    } catch (error) {
      console.error('❌ Complete batch term error:', error);
      throw new Error(`Failed to complete batch term: ${error.message}`);
    }
  }

  /**
   * Complete a term for an individual student
   */
  async completeStudentTerm(studentId, termId, batchId, termNumber) {
    try {
      console.log(`🎓 Completing term for student ${studentId} in term ${termId}`);

      // Calculate final HPS using existing unified scoring service
      const hpsResult = await unifiedScoreService.calculateUnifiedHPS(studentId, termId);

      // Get attendance data from attendance_eligibility table
      const attendanceResult = await this.getStudentAttendance(studentId, termId);

      // Determine eligibility for next term using existing HPS logic
      const eligibilityResult = await this.checkTermCompletionEligibility(
        hpsResult,
        attendanceResult,
        termNumber
      );

      // Update student term progression
      const updateData = {
        status: eligibilityResult.passed ? 'completed' : 'failed',
        completion_date: new Date().toISOString().split('T')[0],
        final_hps: hpsResult.totalHPS,
        final_grade: hpsResult.grade,
        attendance_percentage: attendanceResult.percentage,
        quadrant_scores: hpsResult.quadrantScores,
        can_progress_to_next: eligibilityResult.canProgress,
        eligibility_status: eligibilityResult.status,
        progression_notes: eligibilityResult.notes || null,
        updated_at: new Date().toISOString()
      };

      const result = await query(
        supabase
          .from('student_term_progression')
          .update(updateData)
          .eq('student_id', studentId)
          .eq('term_id', termId)
      );

      console.log(`✅ Student term completed: ${updateData.status} (HPS: ${hpsResult.totalHPS}%)`);

      return {
        studentId,
        termId,
        status: updateData.status,
        finalHPS: hpsResult.totalHPS,
        grade: hpsResult.grade,
        canProgressToNext: eligibilityResult.canProgress,
        eligibilityStatus: eligibilityResult.status
      };

    } catch (error) {
      console.error('❌ Complete student term error:', error);
      throw error;
    }
  }

  /**
   * Check term completion eligibility using existing HPS calculation
   */
  async checkTermCompletionEligibility(hpsResult, attendanceResult, termNumber) {
    try {
      const hpsScore = hpsResult.totalHPS;
      const attendancePercentage = attendanceResult.percentage;

      // Get term-specific requirements
      const requirements = this.getTermRequirements(termNumber);

      // Check HPS threshold (using existing grade calculation)
      const hpsPassed = hpsScore >= requirements.hpsThreshold;

      // Check attendance threshold
      const attendancePassed = attendancePercentage >= requirements.attendanceThreshold;

      // Check quadrant clearance (using existing status from unified scoring)
      const quadrantsPassed = hpsResult.status === 'Cleared';

      // Check individual quadrant scores for detailed analysis
      const quadrantDetails = {};
      let allQuadrantsCleared = true;

      if (hpsResult.quadrantScores) {
        Object.keys(hpsResult.quadrantScores).forEach(quadrantId => {
          const quadrant = hpsResult.quadrantScores[quadrantId];
          const quadrantPassed = quadrant.percentage >= 40; // Minimum 40% for each quadrant
          quadrantDetails[quadrant.name] = {
            score: quadrant.percentage,
            passed: quadrantPassed,
            threshold: 40
          };
          if (!quadrantPassed) allQuadrantsCleared = false;
        });
      }

      const passed = hpsPassed && attendancePassed && allQuadrantsCleared;
      const canProgress = passed; // Can progress if passed current term

      let status = 'eligible';
      let notes = [];

      if (!attendancePassed) {
        status = 'ict';
        notes.push(`Attendance ${attendancePercentage}% below threshold ${requirements.attendanceThreshold}%`);
      }
      if (!hpsPassed) {
        status = 'not_cleared';
        notes.push(`HPS ${hpsScore}% below threshold ${requirements.hpsThreshold}%`);
      }
      if (!allQuadrantsCleared) {
        status = 'not_cleared';
        const failedQuadrants = Object.keys(quadrantDetails)
          .filter(q => !quadrantDetails[q].passed)
          .join(', ');
        notes.push(`Failed quadrants: ${failedQuadrants}`);
      }

      return {
        passed,
        canProgress,
        status,
        hpsPassed,
        attendancePassed,
        quadrantsPassed: allQuadrantsCleared,
        quadrantDetails,
        requirements,
        notes: notes.join('; ') || null
      };

    } catch (error) {
      console.error('❌ Check term completion eligibility error:', error);
      return {
        passed: false,
        canProgress: false,
        status: 'not_cleared',
        notes: `Error checking eligibility: ${error.message}`
      };
    }
  }

  /**
   * Get term-specific requirements
   */
  getTermRequirements(termNumber) {
    const requirements = {
      1: { hpsThreshold: 40, attendanceThreshold: 75 }, // Level 0
      2: { hpsThreshold: 45, attendanceThreshold: 80 }, // Level 1
      3: { hpsThreshold: 50, attendanceThreshold: 85 }, // Level 2
      4: { hpsThreshold: 55, attendanceThreshold: 90 }  // Level 3
    };
    
    return requirements[termNumber] || requirements[1];
  }

  /**
   * Get student attendance from attendance_eligibility table
   */
  async getStudentAttendance(studentId, termId) {
    try {
      // Get attendance data from attendance_eligibility table
      const attendanceResult = await query(
        supabase
          .from('attendance_eligibility')
          .select('*')
          .eq('student_id', studentId)
          .eq('term_id', termId)
          .eq('attendance_type', 'overall')
          .limit(1)
      );

      const attendance = attendanceResult.rows?.[0];

      if (attendance) {
        return {
          percentage: attendance.percentage,
          totalSessions: attendance.total_sessions,
          attendedSessions: attendance.attended_sessions,
          eligibilityStatus: attendance.eligibility_status,
          threshold: attendance.threshold_required
        };
      } else {
        // If no attendance record exists, create a default one
        console.log(`⚠️ No attendance record found for student ${studentId} in term ${termId}, creating default`);

        const defaultAttendance = {
          student_id: studentId,
          term_id: termId,
          attendance_type: 'overall',
          percentage: 80, // Default 80% attendance
          total_sessions: 100,
          attended_sessions: 80,
          eligibility_status: 'eligible',
          threshold_required: 75.00
        };

        await query(
          supabase
            .from('attendance_eligibility')
            .insert(defaultAttendance)
        );

        return {
          percentage: defaultAttendance.percentage,
          totalSessions: defaultAttendance.total_sessions,
          attendedSessions: defaultAttendance.attended_sessions,
          eligibilityStatus: defaultAttendance.eligibility_status,
          threshold: defaultAttendance.threshold_required
        };
      }
    } catch (error) {
      console.error('❌ Get student attendance error:', error);
      return {
        percentage: 0,
        totalSessions: 0,
        attendedSessions: 0,
        eligibilityStatus: 'ict',
        threshold: 75
      };
    }
  }

  /**
   * Activate next term for a batch
   */
  async activateNextTermForBatch(batchId, nextTermNumber) {
    try {
      // Update batch term progression status
      await query(
        supabase
          .from('batch_term_progression')
          .update({ status: 'active' })
          .eq('batch_id', batchId)
          .eq('term_number', nextTermNumber)
      );

      // Enroll eligible students in next term
      await this.enrollEligibleStudentsInNextTerm(batchId, nextTermNumber);

      console.log(`🚀 Activated term ${nextTermNumber} for batch ${batchId}`);

    } catch (error) {
      console.error('❌ Activate next term error:', error);
      throw error;
    }
  }

  /**
   * Enroll eligible students in next term
   */
  async enrollEligibleStudentsInNextTerm(batchId, nextTermNumber) {
    try {
      const previousTermNumber = nextTermNumber - 1;
      
      // Get students who can progress
      const eligibleStudentsResult = await query(
        supabase
          .from('student_term_progression')
          .select('student_id')
          .eq('batch_id', batchId)
          .eq('term_number', previousTermNumber)
          .eq('can_progress_to_next', true)
      );

      const eligibleStudents = eligibleStudentsResult.rows || [];
      
      if (eligibleStudents.length === 0) {
        console.log('No eligible students for next term');
        return;
      }

      // Get next term
      const termResult = await query(
        supabase
          .from('terms')
          .select('id')
          .eq('term_number', nextTermNumber)
          .limit(1)
      );

      const nextTerm = termResult.rows?.[0];
      if (!nextTerm) {
        throw new Error(`Next term ${nextTermNumber} not found`);
      }

      // Update students' current term
      const studentIds = eligibleStudents.map(s => s.student_id);
      await query(
        supabase
          .from('students')
          .update({ current_term_id: nextTerm.id })
          .in('id', studentIds)
      );

      // Create new term progression records
      const progressionRecords = eligibleStudents.map(student => ({
        student_id: student.student_id,
        batch_id: batchId,
        term_id: nextTerm.id,
        term_number: nextTermNumber,
        status: 'enrolled',
        enrollment_date: new Date().toISOString().split('T')[0]
      }));

      await query(
        supabase
          .from('student_term_progression')
          .insert(progressionRecords)
      );

      console.log(`📚 Enrolled ${eligibleStudents.length} students in term ${nextTermNumber}`);

    } catch (error) {
      console.error('❌ Enroll eligible students error:', error);
      throw error;
    }
  }


}

module.exports = new SmartBatchProgressionService();
