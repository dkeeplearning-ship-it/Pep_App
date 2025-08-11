const express = require('express');
const jwt = require('jsonwebtoken');
const { supabase, query } = require('../config/supabase');

const router = express.Router();

/**
 * Validate KOS-Core SSO response and create/link user
 * POST /api/v1/auth/kos-sso/validate
 */
router.post('/validate', async (req, res) => {
  try {
    console.log('🔍 KOS-SSO: Processing validation request');
    
    const { kosData, ssoParams } = req.body;
    
    if (!kosData || !ssoParams) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_DATA',
        message: 'Missing KOS data or SSO parameters'
      });
    }

    console.log('📋 KOS-SSO: Received data:', {
      kosData: kosData ? 'present' : 'missing',
      ssoParams: ssoParams ? 'present' : 'missing'
    });

    // Validate KOS response structure
    if (!kosData.success || !kosData.data || !kosData.data.email) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_KOS_RESPONSE',
        message: 'Invalid response from KOS-Core system'
      });
    }

    const userData = kosData.data;
    console.log('👤 KOS-SSO: User data from KOS:', {
      email: userData.email,
      name: userData.name || 'not provided',
      role: userData.role || 'not provided'
    });

    // Validate email domain
    if (!userData.email.endsWith('@vijaybhoomi.edu.in')) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_DOMAIN',
        message: 'Email must be from @vijaybhoomi.edu.in domain'
      });
    }

    // Extract user information
    const email = userData.email;
    const username = email.split('@')[0];
    const firstName = userData.first_name || userData.name?.split(' ')[0] || username;
    const lastName = userData.last_name || userData.name?.split(' ').slice(1).join(' ') || '';
    
    // Determine role from email or KOS data
    let userRole = userData.role || 'student';
    if (email.includes('faculty') || email.includes('teacher') || email.includes('prof')) {
      userRole = 'teacher';
    } else if (email.includes('admin')) {
      userRole = 'admin';
    }

    console.log('🔄 KOS-SSO: Processing user:', {
      email,
      username,
      firstName,
      lastName,
      userRole
    });

    // Find and link existing user
    const userResult = await findAndLinkKOSUser({
      email,
      username,
      firstName,
      lastName,
      role: userRole,
      kosData: userData
    });

    if (!userResult.success) {
      return res.status(500).json(userResult);
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: userResult.user.id,
        email: userResult.user.email,
        role: userResult.user.role,
        ssoProvider: 'kos-core'
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    console.log('✅ KOS-SSO: Authentication successful for:', userResult.user.email);

    res.json({
      success: true,
      message: 'KOS-Core SSO authentication successful',
      data: {
        token,
        user: {
          id: userResult.user.id,
          username: userResult.user.username,
          email: userResult.user.email,
          role: userResult.user.role,
          first_name: userResult.user.first_name,
          last_name: userResult.user.last_name,
          sso_provider: 'kos-core',
          erp_validated: true
        },
        action: userResult.action
      }
    });

  } catch (error) {
    console.error('❌ KOS-SSO Error:', error.message);
    
    res.status(500).json({
      success: false,
      error: 'KOS_SSO_ERROR',
      message: 'Error processing KOS-Core SSO authentication'
    });
  }
});

/**
 * Find existing user and link KOS-Core SSO account
 * @param {Object} userData - User data from KOS-Core
 * @returns {Promise<Object>} User linking result
 */
async function findAndLinkKOSUser(userData) {
  try {
    console.log('👤 KOS-SSO: Finding existing user to link KOS account:', userData.email);
    
    // Step 1: Find user by email (most reliable)
    let userResult = await query(
      supabase
        .from('users')
        .select('*')
        .eq('email', userData.email)
        .limit(1)
    );
    
    if (userResult.rows && userResult.rows.length > 0) {
      console.log('✅ KOS-SSO: Found existing user by email, updating with KOS details');
      
      const existingUser = userResult.rows[0];
      
      // Update existing user with KOS SSO details
      const updateResult = await query(
        supabase
          .from('users')
          .update({
            sso_provider: 'kos-core',
            erp_validated: true,
            // Update name fields if they were empty or if KOS provides better data
            first_name: existingUser.first_name || userData.firstName,
            last_name: existingUser.last_name || userData.lastName,
            last_login: new Date().toISOString()
          })
          .eq('id', existingUser.id)
          .select('*')
      );
      
      return {
        success: true,
        user: updateResult.rows[0],
        isNewUser: false,
        action: 'linked_existing_user_by_email'
      };
    }
    
    // Step 2: Find user by username (email prefix)
    userResult = await query(
      supabase
        .from('users')
        .select('*')
        .eq('username', userData.username)
        .limit(1)
    );
    
    if (userResult.rows && userResult.rows.length > 0) {
      console.log('✅ KOS-SSO: Found existing user by username, linking KOS account');
      
      const existingUser = userResult.rows[0];
      
      // Update existing user with KOS SSO details and email
      const updateResult = await query(
        supabase
          .from('users')
          .update({
            email: userData.email, // Update email to match KOS account
            sso_provider: 'kos-core',
            erp_validated: true,
            first_name: existingUser.first_name || userData.firstName,
            last_name: existingUser.last_name || userData.lastName,
            last_login: new Date().toISOString()
          })
          .eq('id', existingUser.id)
          .select('*')
      );
      
      return {
        success: true,
        user: updateResult.rows[0],
        isNewUser: false,
        action: 'linked_existing_user_by_username'
      };
    }
    
    // Step 3: No existing user found - create new user
    console.log('🆕 KOS-SSO: No existing user found, creating new user');
    
    const createResult = await query(
      supabase
        .from('users')
        .insert({
          username: userData.username,
          email: userData.email,
          password_hash: '$2b$10$dummy.hash.for.kos.sso.users.only', // Dummy hash for SSO users
          role: userData.role,
          sso_provider: 'kos-core',
          erp_validated: true,
          first_name: userData.firstName,
          last_name: userData.lastName,
          status: 'active',
          last_login: new Date().toISOString()
        })
        .select('*')
    );
    
    if (!createResult.rows || createResult.rows.length === 0) {
      throw new Error('Failed to create user in database');
    }
    
    console.log('✅ KOS-SSO: New user created successfully');
    
    return {
      success: true,
      user: createResult.rows[0],
      isNewUser: true,
      action: 'created_new_user'
    };
    
  } catch (error) {
    console.error('❌ KOS-SSO User Linking Error:', error.message);
    return {
      success: false,
      error: 'USER_LINKING_FAILED',
      message: 'Failed to find and link existing user to KOS-Core SSO account'
    };
  }
}

module.exports = router;
