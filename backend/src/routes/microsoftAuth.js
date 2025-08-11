const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { supabase, query } = require('../config/supabase');
const microsoftSSOService = require('../services/microsoftSSOService');
const erpService = require('../services/erpService');

/**
 * @route   GET /api/v1/auth/microsoft/login
 * @desc    Initiate Microsoft SSO login
 * @access  Public
 */
router.get('/login', async (req, res) => {
  try {
    console.log('🚀 Microsoft SSO: Initiating login flow');
    
    const authUrl = await microsoftSSOService.getAuthUrl();
    
    // Redirect to Microsoft login
    res.redirect(authUrl);
    
  } catch (error) {
    console.error('❌ Microsoft SSO Login Error:', error.message);
    res.status(500).json({
      success: false,
      error: 'SSO_INIT_FAILED',
      message: 'Failed to initiate Microsoft SSO login'
    });
  }
});

/**
 * @route   GET /api/v1/auth/microsoft/callback
 * @desc    Handle Microsoft SSO callback
 * @access  Public
 */
router.get('/callback', async (req, res) => {
  try {
    const { code, state, error, error_description } = req.query;
    
    console.log('📞 Microsoft SSO: Processing callback');
    
    // Handle OAuth errors
    if (error) {
      console.error('❌ Microsoft OAuth Error:', error, error_description);
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:8080'}/login?error=oauth_error&message=${encodeURIComponent(error_description || error)}`);
    }
    
    if (!code) {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:8080'}/login?error=missing_code`);
    }
    
    // Exchange code for tokens
    const tokenResult = await microsoftSSOService.handleCallback(code, state);
    if (!tokenResult.success) {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:8080'}/login?error=token_exchange_failed`);
    }
    
    // Authenticate user
    const authResult = await microsoftSSOService.authenticateUser(
      tokenResult.accessToken,
      tokenResult.idToken
    );
    
    if (!authResult.success) {
      const errorMessage = encodeURIComponent(authResult.message);
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:8080'}/login?error=auth_failed&message=${errorMessage}`);
    }
    
    // Find existing user and link Microsoft account
    const userResult = await findAndLinkSSOUser(authResult.user);
    if (!userResult.success) {
      const errorMessage = encodeURIComponent(userResult.message);
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:8080'}/login?error=user_creation_failed&message=${errorMessage}`);
    }
    
    // Generate JWT token
    const jwtToken = jwt.sign(
      {
        userId: userResult.user.id,
        role: userResult.user.role,
        ssoProvider: 'microsoft'
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );
    
    // Redirect to frontend with token
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
    res.redirect(`${frontendUrl}/auth/callback?token=${jwtToken}&user=${encodeURIComponent(JSON.stringify({
      id: userResult.user.id,
      email: userResult.user.email,
      role: userResult.user.role,
      name: userResult.user.first_name + ' ' + userResult.user.last_name
    }))}`);
    
  } catch (error) {
    console.error('❌ Microsoft SSO Callback Error:', error.message);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
    res.redirect(`${frontendUrl}/login?error=callback_error&message=${encodeURIComponent('Authentication failed')}`);
  }
});

/**
 * @route   POST /api/v1/auth/microsoft/validate
 * @desc    Validate Microsoft token from frontend
 * @access  Public
 */
router.post('/validate', async (req, res) => {
  try {
    const { accessToken, idToken } = req.body;
    
    if (!accessToken || !idToken) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_TOKENS',
        message: 'Access token and ID token are required'
      });
    }
    
    console.log('🔍 Microsoft SSO: Validating tokens from frontend');
    
    // Authenticate user with tokens
    const authResult = await microsoftSSOService.authenticateUser(accessToken, idToken);
    if (!authResult.success) {
      return res.status(401).json(authResult);
    }
    
    // Find existing user and link Microsoft account
    const userResult = await findAndLinkSSOUser(authResult.user);
    if (!userResult.success) {
      return res.status(500).json(userResult);
    }
    
    // Generate JWT token
    const jwtToken = jwt.sign(
      {
        userId: userResult.user.id,
        role: userResult.user.role,
        ssoProvider: 'microsoft'
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );
    
    res.status(200).json({
      success: true,
      message: 'Microsoft SSO authentication successful',
      data: {
        token: jwtToken,
        user: {
          id: userResult.user.id,
          username: userResult.user.username,
          email: userResult.user.email,
          role: userResult.user.role,
          name: `${userResult.user.first_name} ${userResult.user.last_name}`,
          ssoProvider: 'microsoft'
        }
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Microsoft SSO Validation Error:', error.message);
    res.status(500).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'Failed to validate Microsoft SSO tokens'
    });
  }
});

/**
 * Find existing user and link Microsoft SSO account
 * @param {Object} ssoUser - User data from SSO provider
 * @returns {Promise<Object>} User linking result
 */
async function findAndLinkSSOUser(ssoUser) {
  try {
    console.log('👤 SSO User: Finding existing user to link Microsoft account:', ssoUser.email);

    // Step 1: Check if user already has Microsoft ID linked
    let userResult = await query(
      supabase
        .from('users')
        .select('*')
        .eq('microsoft_id', ssoUser.microsoftId)
        .limit(1)
    );

    if (userResult.rows && userResult.rows.length > 0) {
      console.log('✅ SSO User: Found existing user with Microsoft ID already linked');

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

    // Step 2: Find user by email (existing user from regular registration)
    userResult = await query(
      supabase
        .from('users')
        .select('*')
        .eq('email', ssoUser.email)
        .limit(1)
    );

    if (userResult.rows && userResult.rows.length > 0) {
      console.log('✅ SSO User: Found existing user by email, linking Microsoft account');

      const existingUser = userResult.rows[0];

      // Update existing user with Microsoft SSO details
      const updateResult = await query(
        supabase
          .from('users')
          .update({
            microsoft_id: ssoUser.microsoftId,
            sso_provider: 'microsoft',
            erp_validated: true,
            // Update name fields if they were empty or if SSO provides better data
            first_name: existingUser.first_name || ssoUser.firstName,
            last_name: existingUser.last_name || ssoUser.lastName,
            last_login: new Date().toISOString()
          })
          .eq('id', existingUser.id)
          .select('*')
      );

      console.log('✅ SSO User: Successfully linked Microsoft account to existing user');

      return {
        success: true,
        user: updateResult.rows[0],
        isNewUser: false,
        action: 'linked_existing_user'
      };
    }

    // Step 3: Check if user exists by username (email prefix)
    const username = ssoUser.email.split('@')[0];
    userResult = await query(
      supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .limit(1)
    );

    if (userResult.rows && userResult.rows.length > 0) {
      console.log('✅ SSO User: Found existing user by username, linking Microsoft account');

      const existingUser = userResult.rows[0];

      // Update existing user with Microsoft SSO details and email
      const updateResult = await query(
        supabase
          .from('users')
          .update({
            email: ssoUser.email, // Update email to match Microsoft account
            microsoft_id: ssoUser.microsoftId,
            sso_provider: 'microsoft',
            erp_validated: true,
            first_name: existingUser.first_name || ssoUser.firstName,
            last_name: existingUser.last_name || ssoUser.lastName,
            last_login: new Date().toISOString()
          })
          .eq('id', existingUser.id)
          .select('*')
      );

      console.log('✅ SSO User: Successfully linked Microsoft account to existing user by username');

      return {
        success: true,
        user: updateResult.rows[0],
        isNewUser: false,
        action: 'linked_by_username'
      };
    }

    // Step 4: No existing user found - this should not happen if ERP validation passed
    // But we'll handle it gracefully
    console.log('⚠️ SSO User: No existing user found, but ERP validation passed. Creating new user.');

    const createResult = await query(
      supabase
        .from('users')
        .insert({
          username: username,
          email: ssoUser.email,
          role: ssoUser.role,
          microsoft_id: ssoUser.microsoftId,
          sso_provider: 'microsoft',
          erp_validated: true,
          first_name: ssoUser.firstName,
          last_name: ssoUser.lastName,
          status: 'active',
          last_login: new Date().toISOString()
        })
        .select('*')
    );

    if (!createResult.rows || createResult.rows.length === 0) {
      throw new Error('Failed to create user in database');
    }

    console.log('✅ SSO User: New user created successfully');

    return {
      success: true,
      user: createResult.rows[0],
      isNewUser: true,
      action: 'created_new_user'
    };

  } catch (error) {
    console.error('❌ SSO User Linking Error:', error.message);
    return {
      success: false,
      error: 'USER_LINKING_FAILED',
      message: 'Failed to find and link existing user to Microsoft SSO account'
    };
  }
}

module.exports = router;
