const { ConfidentialClientApplication } = require('@azure/msal-node');
const jwt = require('jsonwebtoken');
const erpService = require('./erpService');

/**
 * Microsoft SSO Service
 * Handles Microsoft authentication and token validation
 */
class MicrosoftSSOService {
  constructor() {
    // MSAL configuration
    this.msalConfig = {
      auth: {
        clientId: process.env.MICROSOFT_CLIENT_ID || 'your-client-id',
        clientSecret: process.env.MICROSOFT_CLIENT_SECRET || 'your-client-secret',
        authority: process.env.MICROSOFT_AUTHORITY || 'https://login.microsoftonline.com/common'
      },
      system: {
        loggerOptions: {
          loggerCallback(loglevel, message, containsPii) {
            if (!containsPii) {
              console.log(`[MSAL] ${message}`);
            }
          },
          piiLoggingEnabled: false,
          logLevel: 'Info'
        }
      }
    };

    this.msalInstance = new ConfidentialClientApplication(this.msalConfig);
    this.redirectUri = process.env.MICROSOFT_REDIRECT_URI || 'http://localhost:3001/api/v1/auth/microsoft/callback';
  }

  /**
   * Get Microsoft login URL
   * @returns {string} Authorization URL
   */
  getAuthUrl() {
    const authCodeUrlParameters = {
      scopes: ['user.read', 'email', 'profile'],
      redirectUri: this.redirectUri,
      prompt: 'select_account'
    };

    return this.msalInstance.getAuthCodeUrl(authCodeUrlParameters);
  }

  /**
   * Handle Microsoft callback and exchange code for tokens
   * @param {string} code - Authorization code from Microsoft
   * @param {string} state - State parameter for security
   * @returns {Promise<Object>} Token response
   */
  async handleCallback(code, state) {
    try {
      console.log('🔄 Microsoft SSO: Processing callback with code');

      const tokenRequest = {
        code: code,
        scopes: ['user.read', 'email', 'profile'],
        redirectUri: this.redirectUri
      };

      const response = await this.msalInstance.acquireTokenByCode(tokenRequest);
      
      if (!response || !response.accessToken) {
        throw new Error('Failed to acquire access token');
      }

      console.log('✅ Microsoft SSO: Access token acquired successfully');
      return {
        success: true,
        accessToken: response.accessToken,
        idToken: response.idToken,
        account: response.account
      };

    } catch (error) {
      console.error('❌ Microsoft SSO Callback Error:', error.message);
      return {
        success: false,
        error: 'TOKEN_EXCHANGE_FAILED',
        message: 'Failed to exchange authorization code for tokens'
      };
    }
  }

  /**
   * Get user profile from Microsoft Graph API
   * @param {string} accessToken - Microsoft access token
   * @returns {Promise<Object>} User profile
   */
  async getUserProfile(accessToken) {
    try {
      console.log('👤 Microsoft SSO: Fetching user profile');

      const axios = require('axios');
      const response = await axios.get('https://graph.microsoft.com/v1.0/me', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      const profile = response.data;
      console.log('✅ Microsoft SSO: User profile retrieved:', profile.mail || profile.userPrincipalName);

      return {
        success: true,
        profile: {
          id: profile.id,
          email: profile.mail || profile.userPrincipalName,
          name: profile.displayName,
          firstName: profile.givenName,
          lastName: profile.surname,
          microsoftId: profile.id
        }
      };

    } catch (error) {
      console.error('❌ Microsoft SSO Profile Error:', error.message);
      return {
        success: false,
        error: 'PROFILE_FETCH_FAILED',
        message: 'Failed to fetch user profile from Microsoft'
      };
    }
  }

  /**
   * Validate Microsoft ID token
   * @param {string} idToken - Microsoft ID token
   * @returns {Promise<Object>} Validation result
   */
  async validateIdToken(idToken) {
    try {
      // Decode without verification for now (in production, you should verify the signature)
      const decoded = jwt.decode(idToken, { complete: true });
      
      if (!decoded) {
        throw new Error('Invalid token format');
      }

      const payload = decoded.payload;
      
      return {
        success: true,
        claims: {
          email: payload.email || payload.preferred_username,
          name: payload.name,
          microsoftId: payload.sub,
          tenantId: payload.tid
        }
      };

    } catch (error) {
      console.error('❌ Microsoft SSO Token Validation Error:', error.message);
      return {
        success: false,
        error: 'TOKEN_VALIDATION_FAILED',
        message: 'Failed to validate Microsoft ID token'
      };
    }
  }

  /**
   * Complete SSO authentication flow
   * @param {string} accessToken - Microsoft access token
   * @param {string} idToken - Microsoft ID token
   * @returns {Promise<Object>} Authentication result
   */
  async authenticateUser(accessToken, idToken) {
    try {
      console.log('🔐 Microsoft SSO: Starting complete authentication flow');

      // Get user profile from Microsoft
      const profileResult = await this.getUserProfile(accessToken);
      if (!profileResult.success) {
        return profileResult;
      }

      const { profile } = profileResult;
      
      // Validate against ERP system
      const erpValidation = await erpService.validateSSOUser(profile.email);
      if (!erpValidation.success) {
        return {
          success: false,
          error: 'ERP_VALIDATION_FAILED',
          message: erpValidation.message
        };
      }

      // Extract user role from email
      const userRole = erpService.extractUserRole(profile.email);

      console.log('✅ Microsoft SSO: Authentication completed successfully');

      return {
        success: true,
        user: {
          microsoftId: profile.microsoftId,
          email: profile.email,
          username: profile.email.split('@')[0], // Extract username from email
          name: profile.name,
          firstName: profile.firstName,
          lastName: profile.lastName,
          role: userRole,
          ssoProvider: 'microsoft',
          erpValidated: erpValidation.success,
          erpData: erpValidation.data
        },
        tokens: {
          accessToken: accessToken,
          idToken: idToken
        }
      };

    } catch (error) {
      console.error('❌ Microsoft SSO Authentication Error:', error.message);
      return {
        success: false,
        error: 'AUTHENTICATION_FAILED',
        message: 'Failed to complete Microsoft SSO authentication'
      };
    }
  }
}

module.exports = new MicrosoftSSOService();
