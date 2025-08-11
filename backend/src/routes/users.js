const express = require('express');
const { 
  getAllUsers, 
  getUserById, 
  updateUserStatus, 
  updateUserRole, 
  resetUserPassword, 
  deleteUser, 
  getUserStats 
} = require('../controllers/userController');
const { authenticateToken, requireRole, requireOwnershipOrAdmin } = require('../middleware/auth');

const router = express.Router();

// All user management routes require authentication
router.use(authenticateToken);

// Get user statistics (Admin only)
router.get('/stats', requireRole('admin'), getUserStats);

// Get all users with pagination and filtering (Admin only)
router.get('/', requireRole('admin'), getAllUsers);

// Get user by ID (Admin or own profile)
router.get('/:id', requireOwnershipOrAdmin('id'), getUserById);

// Update user status (Admin only)
router.patch('/:id/status', requireRole('admin'), updateUserStatus);

// Update user role (Admin only)
router.patch('/:id/role', requireRole('admin'), updateUserRole);

// Reset user password (Admin only)
router.patch('/:id/password', requireRole('admin'), resetUserPassword);

// Delete user (Admin only)
router.delete('/:id', requireRole('admin'), deleteUser);

module.exports = router; 