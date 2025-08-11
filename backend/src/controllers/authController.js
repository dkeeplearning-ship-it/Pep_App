const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { supabase, query } = require('../config/supabase');
const kosAuthService = require('../services/kosAuthService');
const superAdminService = require('../services/superAdminService');
const roleService = require('../services/roleService');

// JWT secret from environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key-change-this-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

// Helper function to generate JWT token
const generateToken = (userId, role) => {
  return jwt.sign(
    { userId, role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

// Helper function to generate refresh token
const generateRefreshToken = (userId, role) => {
  return jwt.sign(
    { userId, role, type: 'refresh' },
    JWT_REFRESH_SECRET,
    { expiresIn: JWT_REFRESH_EXPIRES_IN }
  );
};

/**
 * Ensure role-specific profile exists for user
 * @param {Object} user - User object from users table
 * @param {Object} kosUserDetails - KOS user details
 */
const ensureRoleSpecificProfile = async (user, kosUserDetails) => {
  try {
    console.log(`🔧 Ensuring role-specific profile for user ${user.id} with role ${user.role}`);

    if (user.role === 'student') {
      // Check if student profile exists
      const studentCheck = await query(
        supabase
          .from('students')
          .select('id')
          .eq('user_id', user.id)
          .limit(1)
      );

      if (!studentCheck.rows || studentCheck.rows.length === 0) {
        console.log('📝 Creating missing student profile');

        // Get current active term
        const currentTermResult = await query(
          supabase
            .from('terms')
            .select('id')
            .eq('is_current', true)
            .limit(1)
        );

        const currentTermId = currentTermResult.rows && currentTermResult.rows.length > 0
          ? currentTermResult.rows[0].id
          : null;

        // Create student profile with correct schema and nullable optional fields
        const studentProfile = {
          user_id: user.id,
          name: `${user.first_name} ${user.last_name}`.trim(),
          registration_no: kosUserDetails.student_id || `KOS_${user.id.substring(0, 8)}`,
          course: 'General',
          current_term_id: currentTermId,
          // Optional fields set to null - student can update later
          batch_id: null,
          section_id: null,
          house_id: null,
          gender: null,
          phone: null,
          status: 'Active'
        };

        await query(
          supabase
            .from('students')
            .insert(studentProfile)
        );

        console.log('✅ Student profile created successfully');
      } else {
        console.log('✅ Student profile already exists');
      }

    } else if (user.role === 'teacher') {
      // Check if teacher profile exists
      const teacherCheck = await query(
        supabase
          .from('teachers')
          .select('id')
          .eq('user_id', user.id)
          .limit(1)
      );

      if (!teacherCheck.rows || teacherCheck.rows.length === 0) {
        console.log('📝 Creating missing teacher profile');

        // Create teacher profile with correct schema
        const teacherProfile = {
          user_id: user.id,
          name: `${user.first_name} ${user.last_name}`.trim(),
          employee_id: kosUserDetails.employee_id || `KOS_${user.id.substring(0, 8)}`,
          department: kosUserDetails.department || 'General',
          specialization: kosUserDetails.designation || 'Faculty',
          is_active: true
        };

        await query(
          supabase
            .from('teachers')
            .insert(teacherProfile)
        );

        console.log('✅ Teacher profile created successfully');
      } else {
        console.log('✅ Teacher profile already exists');
      }
    }

    // Admin role doesn't need additional profile table
    if (user.role === 'admin') {
      console.log('✅ Admin role - no additional profile needed');
    }

  } catch (error) {
    console.error('❌ Error ensuring role-specific profile:', error.message);
    // Don't throw error - authentication should still succeed
  }
};

// Register new user
const register = async (req, res) => {
  try {
    const { username, email, password, role = 'student', name, additionalData = {} } = req.body;

    // Validation
    if (!username || !email || !password || !name) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: username, email, password, name',
        timestamp: new Date().toISOString()
      });
    }

    // Check if user already exists
    const existingUser = await query(
      supabase
        .from('users')
        .select('id, username, email')
        .or(`username.eq.${username},email.eq.${email}`)
        .limit(1)
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'User with this username or email already exists',
        timestamp: new Date().toISOString()
      });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const userResult = await query(
      supabase
        .from('users')
        .insert({
          username,
          email,
          password_hash: hashedPassword,
          role,
          status: 'active'
        })
        .select('id, username, email, role, status, created_at')
    );

    if (!userResult.rows || userResult.rows.length === 0) {
      throw new Error('Failed to create user');
    }

    const newUser = userResult.rows[0];

    // Create role-specific profile (student, teacher, admin)
    if (role === 'student' && additionalData.registration_no) {
      await query(
        supabase
          .from('students')
          .insert({
            user_id: newUser.id,
            registration_no: additionalData.registration_no,
            name,
            course: additionalData.course || 'PGDM',
            batch_id: additionalData.batch_id,
            section_id: additionalData.section_id,
            house_id: additionalData.house_id,
            gender: additionalData.gender,
            phone: additionalData.phone
          })
      );
    } else if (role === 'teacher' && additionalData.employee_id) {
      await query(
        supabase
          .from('teachers')
          .insert({
            user_id: newUser.id,
            employee_id: additionalData.employee_id,
            name,
            specialization: additionalData.specialization,
            department: additionalData.department
          })
      );
    } else if (role === 'admin') {
      await query(
        supabase
          .from('admins')
          .insert({
            user_id: newUser.id,
            name,
            access_level: additionalData.access_level || 'standard'
          })
      );
    }

    // Generate JWT tokens
    const token = generateToken(newUser.id, newUser.role);
    const refreshToken = generateRefreshToken(newUser.id, newUser.role);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          role: newUser.role,
          status: newUser.status,
          created_at: newUser.created_at
        },
        token,
        refreshToken
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to register user',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Login user
const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validation
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required',
        timestamp: new Date().toISOString()
      });
    }

    console.log('🔐 Login attempt for:', username);

    // 1. Super Admin Authentication Check
    if (username === 'superadmin') {
      console.log('🔑 Attempting super admin authentication');

      const superAdminResult = await superAdminService.authenticateSuperAdmin(username, password);

      if (superAdminResult.success) {
        console.log('✅ Super admin authentication successful');

        // Generate JWT tokens
        const token = generateToken(superAdminResult.user.id, superAdminResult.user.role);
        const refreshToken = generateRefreshToken(superAdminResult.user.id, superAdminResult.user.role);

        // Log admin action
        await roleService.logAdminAction(
          superAdminResult.user.id,
          'super_admin_login',
          null,
          { loginType: 'super_admin' },
          req.ip,
          req.get('User-Agent')
        );

        return res.status(200).json({
          success: true,
          message: 'Super admin authentication successful',
          data: {
            user: {
              id: superAdminResult.user.id,
              username: superAdminResult.user.username,
              email: superAdminResult.user.email,
              role: superAdminResult.user.role,
              status: 'active',
              user_source: superAdminResult.user.user_source,
              authenticated_via: 'local'
            },
            profile: null,
            token,
            refreshToken
          },
          timestamp: new Date().toISOString()
        });
      } else {
        console.log('❌ Super admin authentication failed');
        return res.status(401).json({
          success: false,
          message: 'Invalid super admin credentials',
          timestamp: new Date().toISOString()
        });
      }
    }

    // 2. Determine if this is an email or username for regular authentication
    const isEmail = username.includes('@');
    let email = username;

    // If it's not an email, try to find the user's email first
    if (!isEmail) {
      const userLookup = await query(
        supabase
          .from('users')
          .select('email')
          .eq('username', username)
          .eq('status', 'active')
          .limit(1)
      );

      if (userLookup.rows && userLookup.rows.length > 0) {
        email = userLookup.rows[0].email;
      } else {
        // If no user found locally, assume it's a Vijaybhoomi email
        email = `${username}@vijaybhoomi.edu.in`;
      }
    }

    // Try KOS-Core authentication first for @vijaybhoomi.edu.in emails
    if (kosAuthService.isValidDomain(email)) {
      console.log('🎓 Attempting KOS-Core authentication for:', email);

      const kosResult = await kosAuthService.authenticateUser(email, password);

      if (kosResult.success) {
        console.log('✅ KOS-Core authentication successful');

        // Extract user details from KOS response
        const kosUserDetails = kosAuthService.extractUserDetails(kosResult.data.user, email);

        // Find or create user in local database
        const localUser = await findOrCreateKOSUser(kosUserDetails, kosResult.data);

        if (!localUser.success) {
          return res.status(500).json({
            success: false,
            message: 'Failed to create local user account',
            timestamp: new Date().toISOString()
          });
        }

        // Generate JWT tokens
        const token = generateToken(localUser.user.id, localUser.user.role);
        const refreshToken = generateRefreshToken(localUser.user.id, localUser.user.role);

        // Update last login
        await query(
          supabase
            .from('users')
            .update({ last_login: new Date().toISOString() })
            .eq('id', localUser.user.id)
        );

        // Log KOS authentication if user is admin
        if (localUser.user.role === 'admin') {
          await roleService.logAdminAction(
            localUser.user.id,
            'kos_admin_login',
            null,
            { loginType: 'kos-core', email },
            req.ip,
            req.get('User-Agent')
          );
        }

        // Get profile data based on role
        let profileData = null;
        if (localUser.user.role === 'student') {
          const studentResult = await query(
            supabase
              .from('students')
              .select('id, name, registration_no, course, status')
              .eq('user_id', localUser.user.id)
              .limit(1)
          );
          profileData = studentResult.rows[0] || null;
        } else if (localUser.user.role === 'teacher') {
          const teacherResult = await query(
            supabase
              .from('teachers')
              .select('id, name, email, employee_id, department, designation, status')
              .eq('user_id', localUser.user.id)
              .limit(1)
          );
          profileData = teacherResult.rows[0] || null;
        } else if (localUser.user.role === 'admin') {
          const adminResult = await query(
            supabase
              .from('admins')
              .select('id, name, access_level, permissions')
              .eq('user_id', localUser.user.id)
              .limit(1)
          );
          profileData = adminResult.rows[0] || null;
        }

        return res.status(200).json({
          success: true,
          message: 'KOS-Core authentication successful',
          data: {
            user: {
              id: localUser.user.id,
              username: localUser.user.username,
              email: localUser.user.email,
              role: localUser.user.role,
              status: localUser.user.status,
              last_login: localUser.user.last_login,
              authenticated_via: 'kos-core'
            },
            profile: profileData,
            token,
            refreshToken
          },
          timestamp: new Date().toISOString()
        });
      } else {
        console.log('❌ KOS-Core authentication failed:', kosResult.message);

        // If KOS authentication fails, fall back to local authentication
        if (kosResult.error === 'KOS_UNAVAILABLE') {
          console.log('⚠️ KOS-Core unavailable, falling back to local authentication');
        } else {
          // For invalid credentials, return error immediately
          return res.status(401).json({
            success: false,
            message: kosResult.message || 'Invalid credentials',
            timestamp: new Date().toISOString()
          });
        }
      }
    }

    // Fallback to local authentication
    console.log('🔄 Falling back to local authentication');

    // Find user by username or email
    const userResult = await query(
      supabase
        .from('users')
        .select('id, username, email, password_hash, role, status, last_login')
        .or(`username.eq.${username},email.eq.${username}`)
        .eq('status', 'active')
        .limit(1)
    );

    if (!userResult.rows || userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
        timestamp: new Date().toISOString()
      });
    }

    const user = userResult.rows[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
        timestamp: new Date().toISOString()
      });
    }

    // Update last login
    await query(
      supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', user.id)
    );

    // Generate JWT tokens
    const token = generateToken(user.id, user.role);
    const refreshToken = generateRefreshToken(user.id, user.role);

    // Log local authentication if user is admin
    if (user.role === 'admin') {
      await roleService.logAdminAction(
        user.id,
        'local_admin_login',
        null,
        { loginType: 'local', username },
        req.ip,
        req.get('User-Agent')
      );
    }

    console.log('✅ Local authentication successful for user:', user.username);

    // Get role-specific profile data
    let profileData = null;
    if (user.role === 'student') {
      const studentResult = await query(
        supabase
          .from('students')
          .select(`
            id,
            registration_no,
            name,
            course,
            overall_score,
            grade,
            status,
            batches:batch_id(name, year),
            sections:section_id(name),
            houses:house_id(name, color)
          `)
          .eq('user_id', user.id)
          .limit(1)
      );
      profileData = studentResult.rows[0] || null;
    } else if (user.role === 'teacher') {
      const teacherResult = await query(
        supabase
          .from('teachers')
          .select('id, employee_id, name, specialization, department, is_active')
          .eq('user_id', user.id)
          .limit(1)
      );
      profileData = teacherResult.rows[0] || null;
    } else if (user.role === 'admin') {
      const adminResult = await query(
        supabase
          .from('admins')
          .select('id, name, access_level, permissions')
          .eq('user_id', user.id)
          .limit(1)
      );
      profileData = adminResult.rows[0] || null;
    }

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          status: user.status,
          last_login: user.last_login
        },
        profile: profileData,
        token,
        refreshToken
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to login',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Find or create user from KOS-Core authentication
 * @param {Object} kosUserDetails - User details from KOS
 * @param {Object} kosData - Full KOS response data
 * @returns {Promise<Object>} User creation/update result
 */
const findOrCreateKOSUser = async (kosUserDetails, kosData) => {
  try {
    console.log('👤 Finding or creating KOS user:', kosUserDetails.email);

    // Step 1: Check if user already exists by email
    let userResult = await query(
      supabase
        .from('users')
        .select('*')
        .eq('email', kosUserDetails.email)
        .limit(1)
    );

    if (userResult.rows && userResult.rows.length > 0) {
      console.log('✅ Found existing user by email, updating KOS details');

      const existingUser = userResult.rows[0];

      // Update existing user with KOS details and potentially new role from KOS
      const updateResult = await query(
        supabase
          .from('users')
          .update({
            kos_user_id: kosUserDetails.kos_user_id,
            authenticated_via: 'kos-core',
            role: kosUserDetails.role, // Update role from KOS
            first_name: existingUser.first_name || kosUserDetails.first_name,
            last_name: existingUser.last_name || kosUserDetails.last_name,
            last_login: new Date().toISOString()
          })
          .eq('id', existingUser.id)
          .select('*')
      );

      const updatedUser = updateResult.rows[0];

      // Ensure role-specific profile exists for existing user
      await ensureRoleSpecificProfile(updatedUser, kosUserDetails);

      return {
        success: true,
        user: updatedUser,
        isNewUser: false,
        action: 'updated_existing_user'
      };
    }

    // Step 2: Check if user exists by username
    userResult = await query(
      supabase
        .from('users')
        .select('*')
        .eq('username', kosUserDetails.username)
        .limit(1)
    );

    if (userResult.rows && userResult.rows.length > 0) {
      console.log('✅ Found existing user by username, updating with KOS details');

      const existingUser = userResult.rows[0];

      // Update existing user with KOS details and email
      const updateResult = await query(
        supabase
          .from('users')
          .update({
            email: kosUserDetails.email,
            kos_user_id: kosUserDetails.kos_user_id,
            authenticated_via: 'kos-core',
            role: kosUserDetails.role, // Update role from KOS
            first_name: existingUser.first_name || kosUserDetails.first_name,
            last_name: existingUser.last_name || kosUserDetails.last_name,
            last_login: new Date().toISOString()
          })
          .eq('id', existingUser.id)
          .select('*')
      );

      const updatedUser = updateResult.rows[0];

      // Ensure role-specific profile exists for existing user
      await ensureRoleSpecificProfile(updatedUser, kosUserDetails);

      return {
        success: true,
        user: updatedUser,
        isNewUser: false,
        action: 'linked_existing_user'
      };
    }

    // Step 3: Create new user
    console.log('🆕 Creating new user from KOS authentication');

    const createResult = await query(
      supabase
        .from('users')
        .insert({
          username: kosUserDetails.username,
          email: kosUserDetails.email,
          password_hash: '$2b$10$dummy.hash.for.kos.authenticated.users.only',
          role: kosUserDetails.role,
          kos_user_id: kosUserDetails.kos_user_id,
          authenticated_via: 'kos-core',
          first_name: kosUserDetails.first_name,
          last_name: kosUserDetails.last_name,
          status: 'active',
          last_login: new Date().toISOString()
        })
        .select('*')
    );

    if (!createResult.rows || createResult.rows.length === 0) {
      throw new Error('Failed to create user in database');
    }

    const newUser = createResult.rows[0];

    // Create role-specific profile
    if (newUser.role === 'student') {
      // Get default batch and section for new students
      const defaultBatch = await query(
        supabase
          .from('batches')
          .select('id')
          .limit(1)
      );

      const defaultSection = await query(
        supabase
          .from('sections')
          .select('id')
          .limit(1)
      );

      await query(
        supabase
          .from('students')
          .insert({
            user_id: newUser.id,
            name: `${kosUserDetails.first_name} ${kosUserDetails.last_name}`.trim(),
            registration_no: kosUserDetails.student_id || kosUserDetails.username,
            course: 'General',
            batch_id: defaultBatch.rows?.[0]?.id || '00000000-0000-0000-0000-000000000000',
            section_id: defaultSection.rows?.[0]?.id || '00000000-0000-0000-0000-000000000000',
            gender: 'other',
            status: 'active'
          })
      );
    } else if (newUser.role === 'teacher') {
      await query(
        supabase
          .from('teachers')
          .insert({
            user_id: newUser.id,
            name: `${kosUserDetails.first_name} ${kosUserDetails.last_name}`.trim(),
            employee_id: kosUserDetails.employee_id || kosUserDetails.username,
            department: kosUserDetails.department || 'General',
            designation: kosUserDetails.designation || 'Faculty',
            status: 'active'
          })
      );
    } else if (newUser.role === 'admin') {
      await query(
        supabase
          .from('admins')
          .insert({
            user_id: newUser.id,
            name: `${kosUserDetails.first_name} ${kosUserDetails.last_name}`.trim(),
            access_level: 'standard'
          })
      );
    }

    console.log('✅ New KOS user created successfully');

    return {
      success: true,
      user: newUser,
      isNewUser: true,
      action: 'created_new_user'
    };

  } catch (error) {
    console.error('❌ Error finding/creating KOS user:', error.message);
    return {
      success: false,
      error: 'USER_CREATION_FAILED',
      message: 'Failed to find or create user from KOS authentication'
    };
  }
};

// Get current user profile
const getProfile = async (req, res) => {
  try {
    const userId = req.user.userId; // From JWT middleware

    // Get user data
    const userResult = await query(
      supabase
        .from('users')
        .select('id, username, email, role, status, last_login, created_at')
        .eq('id', userId)
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

    // Get role-specific profile data
    let profileData = null;
    if (user.role === 'student') {
      const studentResult = await query(
        supabase
          .from('students')
          .select(`
            id,
            registration_no,
            name,
            course,
            gender,
            phone,
            overall_score,
            grade,
            status,
            current_term_id,
            preferences,
            created_at,
            batches:batch_id(name, year),
            sections:section_id(name),
            houses:house_id(name, color),
            terms:current_term_id(id, name, is_current)
          `)
          .eq('user_id', user.id)
          .limit(1)
      );
      profileData = studentResult.rows[0] || null;
    } else if (user.role === 'teacher') {
      const teacherResult = await query(
        supabase
          .from('teachers')
          .select('*')
          .eq('user_id', user.id)
          .limit(1)
      );
      profileData = teacherResult.rows[0] || null;
    } else if (user.role === 'admin') {
      const adminResult = await query(
        supabase
          .from('admins')
          .select('*')
          .eq('user_id', user.id)
          .limit(1)
      );
      profileData = adminResult.rows[0] || null;
    }

    res.status(200).json({
      success: true,
      message: 'Profile retrieved successfully',
      data: {
        user,
        profile: profileData
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get profile',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Refresh token
const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required',
        timestamp: new Date().toISOString()
      });
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token',
        timestamp: new Date().toISOString()
      });
    }

    // Check if it's a refresh token
    if (decoded.type !== 'refresh') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token type',
        timestamp: new Date().toISOString()
      });
    }

    // Verify user still exists and is active
    const userResult = await query(
      supabase
        .from('users')
        .select('id, username, email, role, status')
        .eq('id', decoded.userId)
        .eq('status', 'active')
        .limit(1)
    );

    if (!userResult.rows || userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'User not found or inactive',
        timestamp: new Date().toISOString()
      });
    }

    const user = userResult.rows[0];

    // Generate new tokens
    const newToken = generateToken(user.id, user.role);
    const newRefreshToken = generateRefreshToken(user.id, user.role);

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        token: newToken,
        refreshToken: newRefreshToken,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to refresh token',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Logout user (optional - mainly for token invalidation in future)
const logout = async (req, res) => {
  try {
    // In a more sophisticated setup, you might invalidate the token here
    // For now, we'll just return success
    res.status(200).json({
      success: true,
      message: 'Logout successful',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to logout',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

module.exports = {
  register,
  login,
  getProfile,
  refreshToken,
  logout
};