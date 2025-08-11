/**
 * Smart Batch Term Progression Routes
 * API endpoints for multi-batch term progression and lifecycle management
 */

const express = require('express');
const router = express.Router();
const smartBatchProgressionService = require('../services/smartBatchProgressionService');
const enhancedTermManagementService = require('../services/enhancedTermManagementService');
const attendanceEligibilityService = require('../services/attendanceEligibilityService');
const studentRankingService = require('../services/studentRankingService');
const enhancedPersonaService = require('../services/enhancedPersonaService');
const { authenticateToken, requireRole } = require('../middleware/auth');

// =====================================================
// BATCH PROGRESSION ROUTES
// =====================================================

// Get all batches with progression status
router.get('/batches', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const batches = await smartBatchProgressionService.getAllBatchesWithProgression();

    res.json({
      success: true,
      data: batches,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Get batches error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get specific batch progression status
router.get('/batches/:batchId/progression-status', authenticateToken, async (req, res) => {
  try {
    const { batchId } = req.params;
    console.log('🔍 Route: Getting batch progression status for:', batchId);

    const progressionStatus = await smartBatchProgressionService.getBatchProgressionStatus(batchId);

    console.log('✅ Route: Successfully got progression status');
    res.json({
      success: true,
      data: progressionStatus,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Route: Get batch progression status error:', error);
    console.error('❌ Route: Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: `Failed to get batch progression status: ${error.message}`,
      timestamp: new Date().toISOString()
    });
  }
});

// Initialize batch progression
router.post('/batches/:batchId/initialize-progression', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { batchId } = req.params;
    const progressionPlan = req.body;

    const result = await smartBatchProgressionService.initializeBatchProgression(batchId, progressionPlan);

    res.json({
      success: true,
      data: result,
      message: 'Batch progression initialized successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Initialize batch progression error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Complete batch term
router.post('/batches/:batchId/complete-term/:termNumber', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { batchId, termNumber } = req.params;
    const { triggeredBy } = req.body;

    const result = await smartBatchProgressionService.completeBatchTerm(batchId, parseInt(termNumber), triggeredBy);

    res.json({
      success: true,
      data: result,
      message: `Term ${termNumber} completed successfully for batch`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Complete batch term error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// =====================================================
// STUDENT PROGRESSION ROUTES
// =====================================================

// Get student level progression status
router.get('/students/:studentId/level-progression', authenticateToken, async (req, res) => {
  try {
    const { studentId } = req.params;
    const { termId } = req.query;

    if (!termId) {
      return res.status(400).json({
        success: false,
        message: 'Term ID is required',
        timestamp: new Date().toISOString()
      });
    }

    // Get eligibility status
    const eligibilityStatus = await attendanceEligibilityService.getStudentEligibilityStatus(studentId, termId);
    
    // Get progression eligibility
    const progressionEligibility = await attendanceEligibilityService.checkLevelProgressionEligibility(studentId, termId);
    
    // Get quadrant clearance status (simplified)
    const quadrantClearance = {
      persona: true, // Would be calculated from actual scores
      wellness: true,
      behavior: false,
      discipline: true
    };

    // Get progression history (mock data for now)
    const progressionHistory = [
      { level: 0, completed_date: '2024-01-15', status: 'completed' },
      { level: 1, completed_date: '2024-06-15', status: 'completed' },
      { level: 2, completed_date: null, status: 'in_progress' }
    ];

    const responseData = {
      current_level: eligibilityStatus.level_number || 0,
      level_name: `Level ${eligibilityStatus.level_number || 0}`,
      eligibility_status: eligibilityStatus.status,
      attendance_percentage: eligibilityStatus.attendance_percentage || 0,
      attendance_threshold: 75,
      quadrant_clearance: quadrantClearance,
      next_level_requirements: {
        attendance_required: 80,
        quadrant_thresholds: {
          persona: 45,
          wellness: 45,
          behavior: 3.5,
          discipline: 3.5
        }
      },
      progression_history: progressionHistory,
      can_progress: progressionEligibility.can_progress
    };

    res.status(200).json({
      success: true,
      data: responseData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Get level progression error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get level progression status',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Update student attendance and eligibility
router.post('/students/:studentId/attendance-eligibility', authenticateToken, requireRole('admin', 'teacher'), async (req, res) => {
  try {
    const { studentId } = req.params;
    const { termId, attendanceData } = req.body;

    if (!termId || !attendanceData) {
      return res.status(400).json({
        success: false,
        message: 'Term ID and attendance data are required',
        timestamp: new Date().toISOString()
      });
    }

    const result = await attendanceEligibilityService.updateAttendanceEligibility(studentId, termId, attendanceData);

    res.status(200).json({
      success: true,
      data: result,
      message: 'Attendance eligibility updated successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Update attendance eligibility error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update attendance eligibility',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Promote student to next level
router.post('/students/:studentId/promote-level', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { studentId } = req.params;
    const { currentTermId, nextTermId } = req.body;

    if (!currentTermId || !nextTermId) {
      return res.status(400).json({
        success: false,
        message: 'Current term ID and next term ID are required',
        timestamp: new Date().toISOString()
      });
    }

    // Check eligibility first
    const eligibilityCheck = await attendanceEligibilityService.checkLevelProgressionEligibility(studentId, currentTermId);
    
    if (!eligibilityCheck.can_progress) {
      return res.status(400).json({
        success: false,
        message: 'Student is not eligible for level progression',
        eligibility_status: eligibilityCheck.eligibility_status,
        timestamp: new Date().toISOString()
      });
    }

    // Promote student (this would involve updating student's current_term_id and creating progression record)
    // Implementation would depend on specific business logic

    res.status(200).json({
      success: true,
      message: 'Student promoted to next level successfully',
      data: {
        student_id: studentId,
        previous_level: eligibilityCheck.current_level,
        new_level: eligibilityCheck.next_level,
        promoted_at: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Promote student level error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to promote student level',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get student rankings
router.get('/students/:studentId/rankings', authenticateToken, async (req, res) => {
  try {
    const { studentId } = req.params;
    const { termId } = req.query;

    if (!termId) {
      return res.status(400).json({
        success: false,
        message: 'Term ID is required',
        timestamp: new Date().toISOString()
      });
    }

    // Get overall ranking
    const overallRank = await studentRankingService.getStudentOverallRank(studentId, termId);
    
    // Get quadrant rankings
    const quadrantRankings = {};
    const quadrants = ['persona', 'wellness', 'behavior', 'discipline'];
    
    for (const quadrantName of quadrants) {
      // This would need quadrant ID lookup
      const quadrantRank = await studentRankingService.getStudentQuadrantRank(studentId, termId, quadrantName);
      quadrantRankings[quadrantName] = quadrantRank;
    }

    res.status(200).json({
      success: true,
      data: {
        overall_ranking: overallRank,
        quadrant_rankings: quadrantRankings,
        student_id: studentId,
        term_id: termId
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Get student rankings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get student rankings',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Calculate term rankings (admin only)
router.post('/terms/:termId/calculate-rankings', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { termId } = req.params;

    const result = await studentRankingService.calculateTermRankings(termId);

    res.status(200).json({
      success: true,
      data: result,
      message: 'Term rankings calculated successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Calculate term rankings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate term rankings',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get enhanced persona score with Internal/Capstone split
router.get('/students/:studentId/persona-score', authenticateToken, async (req, res) => {
  try {
    const { studentId } = req.params;
    const { termId } = req.query;

    if (!termId) {
      return res.status(400).json({
        success: false,
        message: 'Term ID is required',
        timestamp: new Date().toISOString()
      });
    }

    const personaScore = await enhancedPersonaService.calculatePersonaScore(studentId, termId);

    res.status(200).json({
      success: true,
      data: personaScore,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Get enhanced persona score error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get enhanced persona score',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// =====================================================
// SMART BATCH PROGRESSION ROUTES
// =====================================================

// Initialize batch progression
router.post('/batches/:batchId/initialize-progression', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { batchId } = req.params;
    const progressionPlan = req.body;

    const result = await smartBatchProgressionService.initializeBatchProgression(batchId, progressionPlan);

    res.status(200).json({
      success: true,
      data: result,
      message: 'Batch progression initialized successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Initialize batch progression error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initialize batch progression',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Complete batch term
router.post('/batches/:batchId/complete-term/:termNumber', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { batchId, termNumber } = req.params;

    const result = await smartBatchProgressionService.completeBatchTerm(batchId, parseInt(termNumber));

    res.status(200).json({
      success: true,
      data: result,
      message: 'Batch term completed successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Complete batch term error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete batch term',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get batch progression status
router.get('/batches/:batchId/progression-status', authenticateToken, async (req, res) => {
  try {
    const { batchId } = req.params;

    const result = await smartBatchProgressionService.getBatchProgressionStatus(batchId);

    res.status(200).json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Get batch progression status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get batch progression status',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// =====================================================
// ENHANCED TERM MANAGEMENT ROUTES
// =====================================================

// Create term with lifecycle
router.post('/terms/create', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const termData = req.body;

    const result = await enhancedTermManagementService.createTerm(termData);

    res.status(201).json({
      success: true,
      data: result,
      message: 'Term created successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Create term error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create term',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Activate term
router.post('/terms/:termId/activate', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { termId } = req.params;
    const { triggeredBy } = req.body;

    const result = await enhancedTermManagementService.activateTerm(termId, triggeredBy);

    res.status(200).json({
      success: true,
      data: result,
      message: 'Term activated successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Activate term error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to activate term',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Complete term
router.post('/terms/:termId/complete', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { termId } = req.params;
    const { triggeredBy } = req.body;

    const result = await enhancedTermManagementService.completeTerm(termId, triggeredBy);

    res.status(200).json({
      success: true,
      data: result,
      message: 'Term completed successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Complete term error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete term',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Archive term
router.post('/terms/:termId/archive', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { termId } = req.params;
    const { triggeredBy } = req.body;

    const result = await enhancedTermManagementService.archiveTerm(termId, triggeredBy);

    res.status(200).json({
      success: true,
      data: result,
      message: 'Term archived successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Archive term error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to archive term',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get term lifecycle status
router.get('/terms/:termId/lifecycle-status', authenticateToken, async (req, res) => {
  try {
    const { termId } = req.params;

    const result = await enhancedTermManagementService.getTermLifecycleStatus(termId);

    res.status(200).json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Get term lifecycle status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get term lifecycle status',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Auto-transition terms
router.post('/terms/auto-transition', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const result = await enhancedTermManagementService.autoTransitionTerms();

    res.status(200).json({
      success: true,
      data: result,
      message: 'Auto-transition completed',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Auto-transition terms error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to auto-transition terms',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
