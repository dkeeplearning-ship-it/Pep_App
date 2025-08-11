const { supabase, query } = require('../config/supabase');
const studentProfileService = require('../services/studentProfileService');

/**
 * Student Profile Update Controller
 * Handles student profile update requests and admin approval workflow
 */

/**
 * Submit profile update request (Student only)
 * POST /api/v1/student/profile/update-request
 */
const submitProfileUpdateRequest = async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({
        success: false,
        message: 'Only students can submit profile update requests',
        timestamp: new Date().toISOString()
      });
    }

    const { requestedChanges, reason } = req.body;

    if (!requestedChanges || Object.keys(requestedChanges).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Requested changes are required',
        timestamp: new Date().toISOString()
      });
    }

    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Reason for profile update is required',
        timestamp: new Date().toISOString()
      });
    }

    // Get student ID from user
    const studentResult = await query(
      supabase
        .from('students')
        .select('id')
        .eq('user_id', req.user.userId)
        .limit(1)
    );

    if (!studentResult.rows || studentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found',
        timestamp: new Date().toISOString()
      });
    }

    const studentId = studentResult.rows[0].id;

    const result = await studentProfileService.submitProfileUpdateRequest(
      studentId,
      req.user.userId,
      requestedChanges,
      reason
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
    console.error('❌ Error submitting profile update request:', error.message);
    res.status(500).json({
      success: false,
      error: 'REQUEST_SUBMISSION_FAILED',
      message: 'Failed to submit profile update request',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Get student's own profile update requests
 * GET /api/v1/student/profile/requests
 */
const getMyProfileRequests = async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({
        success: false,
        message: 'Only students can access this endpoint',
        timestamp: new Date().toISOString()
      });
    }

    // Get student ID from user
    const studentResult = await query(
      supabase
        .from('students')
        .select('id')
        .eq('user_id', req.user.userId)
        .limit(1)
    );

    if (!studentResult.rows || studentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found',
        timestamp: new Date().toISOString()
      });
    }

    const studentId = studentResult.rows[0].id;

    const result = await studentProfileService.getStudentRequests(studentId);

    if (result.success) {
      res.json({
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
    console.error('❌ Error getting student profile requests:', error.message);
    res.status(500).json({
      success: false,
      error: 'FETCH_REQUESTS_FAILED',
      message: 'Failed to fetch profile requests',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Get all profile update requests (Admin only)
 * GET /api/v1/admin/profile-requests
 */
const getAllProfileRequests = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required',
        timestamp: new Date().toISOString()
      });
    }

    const { status, limit = 50 } = req.query;

    const result = await studentProfileService.getProfileUpdateRequests(
      status,
      parseInt(limit)
    );

    if (result.success) {
      res.json({
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
    console.error('❌ Error getting profile update requests:', error.message);
    res.status(500).json({
      success: false,
      error: 'FETCH_REQUESTS_FAILED',
      message: 'Failed to fetch profile update requests',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Review profile update request (Admin only)
 * PUT /api/v1/admin/profile-requests/:id/review
 */
const reviewProfileRequest = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required',
        timestamp: new Date().toISOString()
      });
    }

    const { id: requestId } = req.params;
    const { action, reason } = req.body;

    if (!action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Action must be either "approve" or "reject"',
        timestamp: new Date().toISOString()
      });
    }

    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Review reason is required',
        timestamp: new Date().toISOString()
      });
    }

    const result = await studentProfileService.reviewProfileUpdateRequest(
      requestId,
      req.user.userId,
      action,
      reason
    );

    if (result.success) {
      res.json({
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
    console.error('❌ Error reviewing profile update request:', error.message);
    res.status(500).json({
      success: false,
      error: 'REVIEW_FAILED',
      message: 'Failed to review profile update request',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Sync all students to current term (Admin only)
 * POST /api/v1/admin/students/sync-current-term
 */
const syncStudentsToCurrentTerm = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required',
        timestamp: new Date().toISOString()
      });
    }

    const result = await studentProfileService.syncStudentsToCurrentTerm();

    if (result.success) {
      res.json({
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
    console.error('❌ Error syncing students to current term:', error.message);
    res.status(500).json({
      success: false,
      error: 'SYNC_FAILED',
      message: 'Failed to sync students to current term',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Get reference data for profile updates
 * GET /api/v1/student/profile/reference-data
 */
const getProfileReferenceData = async (req, res) => {
  try {
    // Get batches, sections, houses for dropdowns
    const [batchesResult, sectionsResult, housesResult] = await Promise.all([
      query(supabase.from('batches').select('id, name, year').order('year', { ascending: false })),
      query(supabase.from('sections').select('id, name').order('name')),
      query(supabase.from('houses').select('id, name, color').order('name'))
    ]);

    res.json({
      success: true,
      data: {
        batches: batchesResult.rows || [],
        sections: sectionsResult.rows || [],
        houses: housesResult.rows || [],
        genderOptions: ['Male', 'Female', 'Other']
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error getting reference data:', error.message);
    res.status(500).json({
      success: false,
      error: 'REFERENCE_DATA_FAILED',
      message: 'Failed to get reference data',
      timestamp: new Date().toISOString()
    });
  }
};

module.exports = {
  submitProfileUpdateRequest,
  getMyProfileRequests,
  getAllProfileRequests,
  reviewProfileRequest,
  syncStudentsToCurrentTerm,
  getProfileReferenceData
};
