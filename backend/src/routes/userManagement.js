const express = require('express');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const {
  getAllUsers,
  updateUserRole,
  bulkUpdateRoles,
  getUserRoleHistory,
  getAdminAuditLog,
  createLocalUser,
  getSystemStats
} = require('../controllers/userManagementController');

const router = express.Router();

// Apply authentication and admin requirement to all routes
router.use(authenticateToken);
router.use(requireAdmin);

/**
 * User Management Routes
 * All routes require admin authentication
 */

// Get all users with filtering and pagination
router.get('/users', getAllUsers);

// Create new local user
router.post('/users', createLocalUser);

// Update user role
router.put('/users/:id/role', updateUserRole);

// Bulk role updates
router.post('/users/bulk-update', bulkUpdateRoles);

// Get user role history
router.get('/users/:id/role-history', getUserRoleHistory);

// Get admin audit log
router.get('/audit-log', getAdminAuditLog);

// Get system statistics
router.get('/system-stats', getSystemStats);

module.exports = router;
