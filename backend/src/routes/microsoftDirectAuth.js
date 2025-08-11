const express = require('express');
const jwt = require('jsonwebtoken');
const { supabase, query } = require('../config/supabase');

const router = express.Router();

/**
 * Validate direct Microsoft OAuth response and create/link user
 * POST /api/v1/auth/microsoft-direct/validate
 */
router.post('/validate', async (req, res) => {
  try {
    console.log('🔍 Microsoft Direct: Processing validation request');
    
    const { microsoftUser, tokens, authParams } = req.body;
    
    if (!microsoftUser || !tokens) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_DATA',
        message: 'Missing Microsoft user data or tokens'
      });
    }

    console.log('📋 Microsoft Direct: Received data:', {
      user: microsoftUser ? 'present' : 'missing',
      tokens: tokens ? 'present' : 'missing',
      email: microsoftUser?.mail || microsoftUser?.userPrincipalName
    });

    // Extract user information from Microsoft Graph response
    const email = microsoftUser.mail || microsoftUser.userPrincipalName;
    const displayName = microsoftUser.displayName || '';
    const givenName = microsoftUser.givenName || '';
    const surname = microsoftUser.surname || '';

    // Validate email domain
    if (!email || !email.endsWith('@vijaybhoomi.edu.in')) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_DOMAIN',
        message: 'Email must be from @vijaybhoomi.edu.in domain'
      });
    }

    // Extract user information
    const username = email.split('@')[0];
    const firstName = givenName || displayName.split(' ')[0] || username;
    const lastName = surname || displayName.split(' ').slice(1).join(' ') || '';
    
    // Determine role from email
    let userRole = 'student';
    if (email.includes('faculty') || email.includes('teacher') || email.includes('prof')) {
      userRole = 'teacher';
    } else if (email.includes('admin')) {
      userRole = 'admin';
    }

    console.log('🔄 Microsoft Direct: Processing user:', {
      email,
      username,
      firstName,
      lastName,
      userRole
    });

    // Find and link existing user
    const userResult = await findAndLinkMicrosoftUser({
      email,
      username,
      firstName,
      lastName,
      role: userRole,
      microsoftId: microsoftUser.id,
      microsoftData: microsoftUser
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
        ssoProvider: 'microsoft-direct'
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    console.log('✅ Microsoft Direct: Authentication successful for:', userResult.user.email);

    res.json({
      success: true,
      message: 'Microsoft Direct SSO authentication successful',
      data: {
        token,
        user: {
          id: userResult.user.id,
          username: userResult.user.username,
          email: userResult.user.email,
          role: userResult.user.role,
          first_name: userResult.user.first_name,
          last_name: userResult.user.last_name,
          sso_provider: 'microsoft-direct',
          erp_validated: true
        },
        action: userResult.action
      }
    });

  } catch (error) {
    console.error('❌ Microsoft Direct Error:', error.message);
    
    res.status(500).json({
      success: false,
      error: 'MICROSOFT_DIRECT_ERROR',
      message: 'Error processing Microsoft Direct SSO authentication'
    });
  }
});

/**
 * Find existing user and link Microsoft Direct SSO account
 * @param {Object} userData - User data from Microsoft
 * @returns {Promise<Object>} User linking result
 */
async function findAndLinkMicrosoftUser(userData) {
  try {
    console.log('👤 Microsoft Direct: Finding existing user to link Microsoft account:', userData.email);
    
    // Step 1: Check if user already has Microsoft ID linked
    let userResult = await query(
      supabase
        .from('users')
        .select('*')
        .eq('microsoft_id', userData.microsoftId)
        .limit(1)
    );
    
    if (userResult.rows && userResult.rows.length > 0) {
      console.log('✅ Microsoft Direct: Found existing user with Microsoft ID already linked');
      
      // Update last login
      const updateResult = await query(
        supabase
          .from('users')
          .update({
            last_login: new Date().toISOString()
          })
          .eq('id', userResult.rows[0].id)
          .select('*')
      );
      
      return {
        success: true,
        user: updateResult.rows[0],
        isNewUser: false,
        action: 'existing_microsoft_user'
      };
    }
    
    // Step 2: Find user by email (most reliable)
    userResult = await query(
      supabase
        .from('users')
        .select('*')
        .eq('email', userData.email)
        .limit(1)
    );
    
    if (userResult.rows && userResult.rows.length > 0) {
      console.log('✅ Microsoft Direct: Found existing user by email, linking Microsoft account');
      
      const existingUser = userResult.rows[0];
      
      // Update existing user with Microsoft SSO details
      const updateResult = await query(
        supabase
          .from('users')
          .update({
            microsoft_id: userData.microsoftId,
            sso_provider: 'microsoft-direct',
            erp_validated: true,
            // Update name fields if they were empty or if Microsoft provides better data
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
    
    // Step 3: Find user by username (email prefix)
    userResult = await query(
      supabase
        .from('users')
        .select('*')
        .eq('username', userData.username)
        .limit(1)
    );
    
    if (userResult.rows && userResult.rows.length > 0) {
      console.log('✅ Microsoft Direct: Found existing user by username, linking Microsoft account');
      
      const existingUser = userResult.rows[0];
      
      // Update existing user with Microsoft SSO details and email
      const updateResult = await query(
        supabase
          .from('users')
          .update({
            email: userData.email, // Update email to match Microsoft account
            microsoft_id: userData.microsoftId,
            sso_provider: 'microsoft-direct',
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
    
    // Step 4: No existing user found - create new user
    console.log('🆕 Microsoft Direct: No existing user found, creating new user');
    
    const createResult = await query(
      supabase
        .from('users')
        .insert({
          username: userData.username,
          email: userData.email,
          password_hash: '$2b$10$dummy.hash.for.microsoft.sso.users.only', // Dummy hash for SSO users
          role: userData.role,
          microsoft_id: userData.microsoftId,
          sso_provider: 'microsoft-direct',
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
    
    console.log('✅ Microsoft Direct: New user created successfully');
    
    return {
      success: true,
      user: createResult.rows[0],
      isNewUser: true,
      action: 'created_new_user'
    };
    
  } catch (error) {
    console.error('❌ Microsoft Direct User Linking Error:', error.message);
    return {
      success: false,
      error: 'USER_LINKING_FAILED',
      message: 'Failed to find and link existing user to Microsoft Direct SSO account'
    };
  }
}

module.exports = router;
