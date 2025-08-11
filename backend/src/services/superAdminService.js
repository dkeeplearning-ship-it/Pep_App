const bcrypt = require('bcryptjs');
const { supabase, query } = require('../config/supabase');

/**
 * Super Admin Service
 * Handles super admin creation, authentication, and management
 */
class SuperAdminService {
  constructor() {
    this.superAdminUsername = 'superadmin';
    this.superAdminEmail = 'admin@pepscore.local';
  }

  /**
   * Check if super admin already exists
   * @returns {Promise<boolean>} True if super admin exists
   */
  async checkSuperAdminExists() {
    try {
      const result = await query(
        supabase
          .from('users')
          .select('id')
          .eq('user_source', 'super_admin')
          .eq('username', this.superAdminUsername)
          .limit(1)
      );

      return result.rows && result.rows.length > 0;
    } catch (error) {
      console.error('❌ Error checking super admin existence:', error.message);
      return false;
    }
  }

  /**
   * Create super admin account
   * @param {string} password - Super admin password (optional, uses env var)
   * @returns {Promise<Object>} Creation result
   */
  async createSuperAdmin(password = null) {
    try {
      console.log('🔧 SuperAdmin: Checking if super admin exists...');
      
      const exists = await this.checkSuperAdminExists();
      if (exists) {
        console.log('✅ SuperAdmin: Super admin already exists');
        return {
          success: true,
          message: 'Super admin already exists',
          created: false
        };
      }

      // Use provided password or environment variable or default
      const adminPassword = password || 
                           process.env.SUPER_ADMIN_PASSWORD || 
                           'PEP@Admin2024!';

      console.log('🔐 SuperAdmin: Creating super admin account...');

      const passwordHash = await bcrypt.hash(adminPassword, 12);

      const superAdmin = {
        username: this.superAdminUsername,
        email: this.superAdminEmail,
        password_hash: passwordHash,
        role: 'admin',
        user_source: 'super_admin',
        authenticated_via: 'local',
        status: 'active',
        first_name: 'Super',
        last_name: 'Administrator',
        created_at: new Date().toISOString()
      };

      const result = await query(
        supabase
          .from('users')
          .insert(superAdmin)
          .select('id, username, email, role, user_source')
      );

      if (result.rows && result.rows.length > 0) {
        console.log('✅ SuperAdmin: Super admin created successfully');
        console.log('📋 SuperAdmin: Username:', this.superAdminUsername);
        console.log('📋 SuperAdmin: Email:', this.superAdminEmail);
        
        return {
          success: true,
          message: 'Super admin created successfully',
          created: true,
          user: result.rows[0],
          credentials: {
            username: this.superAdminUsername,
            email: this.superAdminEmail,
            password: adminPassword
          }
        };
      } else {
        throw new Error('Failed to create super admin in database');
      }

    } catch (error) {
      console.error('❌ SuperAdmin Creation Error:', error.message);
      return {
        success: false,
        error: 'SUPER_ADMIN_CREATION_FAILED',
        message: 'Failed to create super admin account'
      };
    }
  }

  /**
   * Authenticate super admin
   * @param {string} username - Username
   * @param {string} password - Password
   * @returns {Promise<Object>} Authentication result
   */
  async authenticateSuperAdmin(username, password) {
    try {
      console.log('🔐 SuperAdmin: Authenticating super admin:', username);

      // Find super admin user
      const userResult = await query(
        supabase
          .from('users')
          .select('id, username, email, password_hash, role, status, user_source')
          .eq('username', username)
          .eq('user_source', 'super_admin')
          .eq('status', 'active')
          .limit(1)
      );

      if (!userResult.rows || userResult.rows.length === 0) {
        console.log('❌ SuperAdmin: Super admin not found');
        return {
          success: false,
          error: 'INVALID_CREDENTIALS',
          message: 'Invalid super admin credentials'
        };
      }

      const user = userResult.rows[0];

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        console.log('❌ SuperAdmin: Invalid password');
        return {
          success: false,
          error: 'INVALID_CREDENTIALS',
          message: 'Invalid super admin credentials'
        };
      }

      // Update last login
      await query(
        supabase
          .from('users')
          .update({ last_login: new Date().toISOString() })
          .eq('id', user.id)
      );

      console.log('✅ SuperAdmin: Authentication successful');

      return {
        success: true,
        message: 'Super admin authentication successful',
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          user_source: user.user_source,
          authenticated_via: 'local'
        }
      };

    } catch (error) {
      console.error('❌ SuperAdmin Authentication Error:', error.message);
      return {
        success: false,
        error: 'AUTHENTICATION_ERROR',
        message: 'Super admin authentication failed'
      };
    }
  }

  /**
   * Initialize super admin on system startup
   * @returns {Promise<Object>} Initialization result
   */
  async initializeSuperAdmin() {
    try {
      console.log('🚀 SuperAdmin: Initializing super admin system...');
      
      const result = await this.createSuperAdmin();
      
      if (result.success && result.created) {
        console.log('🎉 SuperAdmin: System initialized with new super admin');
        console.log('📋 SuperAdmin Credentials:');
        console.log('   Username:', result.credentials.username);
        console.log('   Email:', result.credentials.email);
        console.log('   Password:', result.credentials.password);
        console.log('⚠️  IMPORTANT: Change the default password after first login!');
      } else if (result.success && !result.created) {
        console.log('✅ SuperAdmin: System already initialized');
      }

      return result;
    } catch (error) {
      console.error('❌ SuperAdmin Initialization Error:', error.message);
      return {
        success: false,
        error: 'INITIALIZATION_FAILED',
        message: 'Failed to initialize super admin system'
      };
    }
  }

  /**
   * Get super admin info
   * @returns {Promise<Object>} Super admin information
   */
  async getSuperAdminInfo() {
    try {
      const result = await query(
        supabase
          .from('users')
          .select('id, username, email, role, user_source, created_at, last_login')
          .eq('user_source', 'super_admin')
          .limit(1)
      );

      if (result.rows && result.rows.length > 0) {
        return {
          success: true,
          superAdmin: result.rows[0]
        };
      } else {
        return {
          success: false,
          message: 'Super admin not found'
        };
      }
    } catch (error) {
      console.error('❌ Error getting super admin info:', error.message);
      return {
        success: false,
        error: 'FETCH_ERROR',
        message: 'Failed to get super admin information'
      };
    }
  }
}

module.exports = new SuperAdminService();
