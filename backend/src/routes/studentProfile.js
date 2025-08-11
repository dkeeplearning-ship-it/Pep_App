const express = require('express');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const {
  submitProfileUpdateRequest,
  getMyProfileRequests,
  getAllProfileRequests,
  reviewProfileRequest,
  syncStudentsToCurrentTerm,
  getProfileReferenceData
} = require('../controllers/studentProfileController');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * Student Profile Update Routes
 */

// Student routes
router.post('/update-request', submitProfileUpdateRequest);
router.get('/requests', getMyProfileRequests);
router.get('/reference-data', getProfileReferenceData);

// Admin routes
router.get('/admin/requests', requireAdmin, getAllProfileRequests);
router.put('/admin/requests/:id/review', requireAdmin, reviewProfileRequest);
router.post('/admin/sync-current-term', requireAdmin, syncStudentsToCurrentTerm);

module.exports = router;
