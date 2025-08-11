const { supabase, query } = require('../config/supabase');
const roleService = require('../services/roleService');
const superAdminService = require('../services/superAdminService');
const bcrypt = require('bcryptjs');

/**
 * User Management Controller
 * Handles admin-only operations like user management, role changes, and system administration
 */

/**
 * Get all users with pagination and filtering
 * GET /api/v1/admin/user-management/users
 */
const getAllUsers = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      role = null, 
      user_source = null, 
      search = null,
      sort_by = 'created_at',
      sort_order = 'desc'
    } = req.query;

    const offset = (page - 1) * limit;

    // Build query
    let queryBuilder = supabase
      .from('users')
      .select(`
        id,
        username,
        email,
        role,
        user_source,
        authenticated_via,
        status,
        first_name,
        last_name,
        created_at,
        last_login,
        promoted_by,
        promoted_at,
        promotion_reason
      `)
      .eq('status', 'active')
      .order(sort_by, { ascending: sort_order === 'asc' })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (role) {
      queryBuilder = queryBuilder.eq('role', role);
    }
    
    if (user_source) {
      queryBuilder = queryBuilder.eq('user_source', user_source);
    }

    if (search) {
      queryBuilder = queryBuilder.or(
        `username.ilike.%${search}%,email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`
      );
    }

    const result = await query(queryBuilder);

    // Get total count for pagination
    let countQuery = supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active');

    if (role) countQuery = countQuery.eq('role', role);
    if (user_source) countQuery = countQuery.eq('user_source', user_source);
    if (search) {
      countQuery = countQuery.or(
        `username.ilike.%${search}%,email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`
      );
    }

    const countResult = await query(countQuery);
    const totalUsers = countResult.count || 0;

    res.json({
      success: true,
      data: {
        users: result.rows || [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalUsers,
          totalPages: Math.ceil(totalUsers / limit)
        },
        filters: {
          role,
          user_source,
          search,
          sort_by,
          sort_order
        }
      }
    });

  } catch (error) {
    console.error('❌ Error getting all users:', error.message);
    res.status(500).json({
      success: false,
      error: 'FETCH_USERS_FAILED',
      message: 'Failed to fetch users'
    });
  }
};

/**
 * Update user role
 * PUT /api/v1/admin/user-management/users/:id/role
 */
const updateUserRole = async (req, res) => {
  try {
    const { id: targetUserId } = req.params;
    const { newRole, reason } = req.body;
    const adminId = req.user.userId;

    if (!newRole || !reason) {
      return res.status(400).json({
        success: false,
        message: 'New role and reason are required'
      });
    }

    const result = await roleService.changeUserRole(
      adminId,
      targetUserId,
      newRole,
      reason,
      req.ip,
      req.get('User-Agent')
    );

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }

  } catch (error) {
    console.error('❌ Error updating user role:', error.message);
    res.status(500).json({
      success: false,
      error: 'ROLE_UPDATE_FAILED',
      message: 'Failed to update user role'
    });
  }
};

/**
 * Bulk role update
 * POST /api/v1/admin/user-management/users/bulk-update
 */
const bulkUpdateRoles = async (req, res) => {
  try {
    const { userUpdates } = req.body;
    const adminId = req.user.userId;

    if (!userUpdates || !Array.isArray(userUpdates) || userUpdates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'User updates array is required'
      });
    }

    const result = await roleService.bulkRoleUpdate(
      adminId,
      userUpdates,
      req.ip,
      req.get('User-Agent')
    );

    res.json(result);

  } catch (error) {
    console.error('❌ Error bulk updating roles:', error.message);
    res.status(500).json({
      success: false,
      error: 'BULK_UPDATE_FAILED',
      message: 'Failed to perform bulk role update'
    });
  }
};

/**
 * Get user role history
 * GET /api/v1/admin/user-management/users/:id/role-history
 */
const getUserRoleHistory = async (req, res) => {
  try {
    const { id: userId } = req.params;
    const { limit = 50 } = req.query;

    const result = await roleService.getRoleHistory(userId, parseInt(limit));

    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }

  } catch (error) {
    console.error('❌ Error getting role history:', error.message);
    res.status(500).json({
      success: false,
      error: 'HISTORY_FETCH_FAILED',
      message: 'Failed to get role history'
    });
  }
};

/**
 * Get admin audit log
 * GET /api/v1/admin/user-management/audit-log
 */
const getAdminAuditLog = async (req, res) => {
  try {
    const { limit = 100, admin_id = null } = req.query;

    const result = await roleService.getAdminAuditLog(parseInt(limit), admin_id);

    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }

  } catch (error) {
    console.error('❌ Error getting audit log:', error.message);
    res.status(500).json({
      success: false,
      error: 'AUDIT_LOG_FETCH_FAILED',
      message: 'Failed to get audit log'
    });
  }
};

/**
 * Create local user
 * POST /api/v1/admin/user-management/users
 */
const createLocalUser = async (req, res) => {
  try {
    const { username, email, password, role, first_name, last_name, reason } = req.body;
    const adminId = req.user.userId;

    // Validation
    if (!username || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Username, email, password, and role are required'
      });
    }

    // Check if user already exists
    const existingUser = await query(
      supabase
        .from('users')
        .select('id')
        .or(`username.eq.${username},email.eq.${email}`)
        .limit(1)
    );

    if (existingUser.rows && existingUser.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'User with this username or email already exists'
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const newUser = {
      username,
      email,
      password_hash: passwordHash,
      role,
      user_source: 'local',
      authenticated_via: 'local',
      status: 'active',
      first_name: first_name || '',
      last_name: last_name || '',
      promoted_by: adminId,
      promoted_at: new Date().toISOString(),
      promotion_reason: reason || 'Created by admin'
    };

    const result = await query(
      supabase
        .from('users')
        .insert(newUser)
        .select('id, username, email, role, user_source, created_at')
    );

    if (result.rows && result.rows.length > 0) {
      // Log the action
      await roleService.logAdminAction(
        adminId,
        'user_created',
        result.rows[0].id,
        { 
          newUser: { username, email, role },
          reason 
        },
        req.ip,
        req.get('User-Agent')
      );

      res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: {
          user: result.rows[0]
        }
      });
    } else {
      throw new Error('Failed to create user');
    }

  } catch (error) {
    console.error('❌ Error creating user:', error.message);
    res.status(500).json({
      success: false,
      error: 'USER_CREATION_FAILED',
      message: 'Failed to create user'
    });
  }
};

/**
 * Get system statistics
 * GET /api/v1/admin/user-management/system-stats
 */
const getSystemStats = async (req, res) => {
  try {
    const roleStats = await roleService.getRoleStatistics();
    
    // Get recent activity
    const recentActivity = await roleService.getAdminAuditLog(10);

    // Get super admin info
    const superAdminInfo = await superAdminService.getSuperAdminInfo();

    res.json({
      success: true,
      data: {
        roleStatistics: roleStats.success ? roleStats.statistics : null,
        recentActivity: recentActivity.success ? recentActivity.auditLog : [],
        superAdmin: superAdminInfo.success ? superAdminInfo.superAdmin : null,
        systemInfo: {
          timestamp: new Date().toISOString(),
          version: process.env.APP_VERSION || '1.0.0'
        }
      }
    });

  } catch (error) {
    console.error('❌ Error getting system stats:', error.message);
    res.status(500).json({
      success: false,
      error: 'STATS_FETCH_FAILED',
      message: 'Failed to get system statistics'
    });
  }
};

module.exports = {
  getAllUsers,
  updateUserRole,
  bulkUpdateRoles,
  getUserRoleHistory,
  getAdminAuditLog,
  createLocalUser,
  getSystemStats
};
