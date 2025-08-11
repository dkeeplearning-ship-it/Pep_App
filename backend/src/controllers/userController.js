const bcrypt = require('bcryptjs');
const { supabase, query } = require('../config/supabase');

// Get all users (Admin only)
const getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const role = req.query.role || '';
    const status = req.query.status || '';

    // Build query
    let usersQuery = supabase
      .from('users')
      .select(`
        id,
        username,
        email,
        role,
        status,
        last_login,
        created_at,
        updated_at
      `);

    // Apply filters
    if (search) {
      usersQuery = usersQuery.or(`username.ilike.%${search}%,email.ilike.%${search}%`);
    }

    if (role) {
      usersQuery = usersQuery.eq('role', role);
    }

    if (status) {
      usersQuery = usersQuery.eq('status', status);
    }

    // Get total count
    const countQuery = supabase
      .from('users')
      .select('*', { count: 'exact', head: true });
    
    let finalCountQuery = countQuery;
    if (search) {
      finalCountQuery = finalCountQuery.or(`username.ilike.%${search}%,email.ilike.%${search}%`);
    }
    if (role) {
      finalCountQuery = finalCountQuery.eq('role', role);
    }
    if (status) {
      finalCountQuery = finalCountQuery.eq('status', status);
    }

    const { count: totalUsers } = await finalCountQuery;

    // Get users with pagination
    const result = await query(
      usersQuery
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)
    );

    const totalPages = Math.ceil((totalUsers || 0) / limit);

    // Get role-specific counts
    const roleCounts = await Promise.all([
      query(supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'student')),
      query(supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'teacher')),
      query(supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'admin'))
    ]);

    res.status(200).json({
      success: true,
      message: 'Users retrieved successfully',
      data: result.rows,
      pagination: {
        currentPage: page,
        totalPages,
        totalUsers: totalUsers || 0,
        usersPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      },
      statistics: {
        totalUsers: totalUsers || 0,
        students: roleCounts[0].totalCount || 0,
        teachers: roleCounts[1].totalCount || 0,
        admins: roleCounts[2].totalCount || 0
      },
      filters: {
        search,
        role,
        status
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve users',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Get user by ID with full profile
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    // Get user data
    const userResult = await query(
      supabase
        .from('users')
        .select('id, username, email, role, status, last_login, created_at, updated_at')
        .eq('id', id)
        .limit(1)
    );

    if (!userResult.rows || userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        timestamp: new Date().toISOString()
      });
    }

    const user = userResult.rows[0];

    // Get role-specific profile data (simplified to avoid hanging)
    let profileData = null;
    try {
      if (user.role === 'student') {
        const studentResult = await query(
          supabase
            .from('students')
            .select('id, registration_no, name, course, gender, phone, overall_score, grade, status')
            .eq('user_id', user.id)
            .limit(1)
        );
        profileData = studentResult.rows[0] || null;
      } else if (user.role === 'teacher') {
        const teacherResult = await query(
          supabase
            .from('teachers')
            .select('id, name, employee_id, department')
            .eq('user_id', user.id)
            .limit(1)
        );
        profileData = teacherResult.rows[0] || null;
      } else if (user.role === 'admin') {
        const adminResult = await query(
          supabase
            .from('admins')
            .select('id, name, access_level')
            .eq('user_id', user.id)
            .limit(1)
        );
        profileData = adminResult.rows[0] || null;
      }
    } catch (profileError) {
      console.warn('Profile data fetch failed:', profileError.message);
      profileData = null;
    }

    res.status(200).json({
      success: true,
      message: 'User details retrieved successfully',
      data: {
        user,
        profile: profileData
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching user details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user details',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Update user status (activate/deactivate/suspend)
const updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['active', 'inactive', 'suspended'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be: active, inactive, or suspended',
        timestamp: new Date().toISOString()
      });
    }

    const result = await query(
      supabase
        .from('users')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('id, username, email, role, status, updated_at')
    );

    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        timestamp: new Date().toISOString()
      });
    }

    res.status(200).json({
      success: true,
      message: `User status updated to ${status}`,
      data: result.rows[0],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating user status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user status',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Update user role
const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role || !['student', 'teacher', 'admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be: student, teacher, or admin',
        timestamp: new Date().toISOString()
      });
    }

    const result = await query(
      supabase
        .from('users')
        .update({ role, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('id, username, email, role, status, updated_at')
    );

    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        timestamp: new Date().toISOString()
      });
    }

    res.status(200).json({
      success: true,
      message: `User role updated to ${role}`,
      data: result.rows[0],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user role',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Reset user password (Admin only)
const resetUserPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long',
        timestamp: new Date().toISOString()
      });
    }

    // Hash new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    const result = await query(
      supabase
        .from('users')
        .update({ 
          password_hash: hashedPassword, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', id)
        .select('id, username, email, role, updated_at')
    );

    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        timestamp: new Date().toISOString()
      });
    }

    res.status(200).json({
      success: true,
      message: 'Password reset successfully',
      data: result.rows[0],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset password',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Delete user (Admin only - soft delete by setting status to inactive)
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { permanent = false } = req.query;

    if (permanent === 'true') {
      // Hard delete (use with caution)
      const result = await query(
        supabase
          .from('users')
          .delete()
          .eq('id', id)
          .select('id, username, email')
      );

      if (!result.rows || result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
          timestamp: new Date().toISOString()
        });
      }

      res.status(200).json({
        success: true,
        message: 'User permanently deleted',
        data: result.rows[0],
        timestamp: new Date().toISOString()
      });
    } else {
      // Soft delete - set status to inactive
      const result = await query(
        supabase
          .from('users')
          .update({ 
            status: 'inactive', 
            updated_at: new Date().toISOString() 
          })
          .eq('id', id)
          .select('id, username, email, status, updated_at')
      );

      if (!result.rows || result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
          timestamp: new Date().toISOString()
        });
      }

      res.status(200).json({
        success: true,
        message: 'User deactivated successfully',
        data: result.rows[0],
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Get user statistics
const getUserStats = async (req, res) => {
  try {
    // Get basic user counts (simplified approach)
    const totalUsersResult = await query(
      supabase.from('users').select('id', { count: 'exact' })
    );

    const activeUsersResult = await query(
      supabase.from('users').select('id', { count: 'exact' }).eq('status', 'active')
    );

    const studentsResult = await query(
      supabase.from('users').select('id', { count: 'exact' }).eq('role', 'student')
    );

    const teachersResult = await query(
      supabase.from('users').select('id', { count: 'exact' }).eq('role', 'teacher')
    );

    const adminsResult = await query(
      supabase.from('users').select('id', { count: 'exact' }).eq('role', 'admin')
    );

    // Get recent users
    const recentUsersResult = await query(
      supabase
        .from('users')
        .select('id, username, email, role, status, created_at')
        .order('created_at', { ascending: false })
        .limit(5)
    );

    res.status(200).json({
      success: true,
      message: 'User statistics retrieved successfully',
      data: {
        totals: {
          total: totalUsersResult.count || 0,
          active: activeUsersResult.count || 0,
          inactive: 0, // Will calculate if needed
          suspended: 0 // Will calculate if needed
        },
        byRole: {
          students: studentsResult.count || 0,
          teachers: teachersResult.count || 0,
          admins: adminsResult.count || 0
        },
        recentUsers: recentUsersResult.rows || []
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching user statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user statistics',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  updateUserStatus,
  updateUserRole,
  resetUserPassword,
  deleteUser,
  getUserStats
}; 