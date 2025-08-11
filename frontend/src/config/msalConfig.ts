import { Configuration, PopupRequest, RedirectRequest } from '@azure/msal-browser';

/**
 * Microsoft Authentication Library (MSAL) Configuration
 * For Vijaybhoomi College Microsoft SSO Integration
 */

// MSAL configuration object
export const msalConfig: Configuration = {
  auth: {
    clientId: import.meta.env.VITE_MICROSOFT_CLIENT_ID || 'your-client-id', // Application (client) ID from Azure portal
    authority: import.meta.env.VITE_MICROSOFT_AUTHORITY || 'https://login.microsoftonline.com/common', // Authority URL
    redirectUri: import.meta.env.VITE_MICROSOFT_REDIRECT_URI || 'http://localhost:8080/auth/callback', // Redirect URI
    postLogoutRedirectUri: import.meta.env.VITE_MICROSOFT_POST_LOGOUT_REDIRECT_URI || 'http://localhost:8080/login', // Post logout redirect URI
  },
  cache: {
    cacheLocation: 'sessionStorage', // This configures where your cache will be stored
    storeAuthStateInCookie: false, // Set this to "true" if you are having issues on IE11 or Edge
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) {
          return;
        }
        switch (level) {
          case 0: // LogLevel.Error
            console.error(`[MSAL Error] ${message}`);
            break;
          case 1: // LogLevel.Warning
            console.warn(`[MSAL Warning] ${message}`);
            break;
          case 2: // LogLevel.Info
            console.info(`[MSAL Info] ${message}`);
            break;
          case 3: // LogLevel.Verbose
            console.debug(`[MSAL Debug] ${message}`);
            break;
        }
      },
    },
  },
};

// Add scopes here for ID token to be used at Microsoft identity platform endpoints.
export const loginRequest: RedirectRequest = {
  scopes: ['User.Read', 'email', 'profile'],
  prompt: 'select_account', // Forces account selection
};

// Add scopes here for access token to be used at Microsoft Graph API endpoints.
export const graphConfig = {
  graphMeEndpoint: 'https://graph.microsoft.com/v1.0/me',
};

// Popup request configuration
export const popupRequest: PopupRequest = {
  scopes: ['User.Read', 'email', 'profile'],
  prompt: 'select_account',
};

// Silent request configuration
export const silentRequest = {
  scopes: ['User.Read', 'email', 'profile'],
  account: null as any, // Will be set dynamically
};

/**
 * Scopes you add here will be prompted for user consent during sign-in.
 * By default, MSAL.js will add OIDC scopes (openid, profile, email) to any login request.
 * For more information about OIDC scopes, visit:
 * https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-permissions-and-consent#openid-connect-scopes
 */
export const protectedResources = {
  graphMe: {
    endpoint: 'https://graph.microsoft.com/v1.0/me',
    scopes: ['User.Read'],
  },
  graphMail: {
    endpoint: 'https://graph.microsoft.com/v1.0/me/messages',
    scopes: ['Mail.Read'],
  },
};

/**
 * Helper function to determine if an email is from Vijaybhoomi domain
 */
export const isVijaybhoomiEmail = (email: string): boolean => {
  return email.toLowerCase().endsWith('@vijaybhoomi.edu.in');
};

/**
 * Helper function to extract user role from email
 */
export const extractUserRole = (email: string): 'student' | 'teacher' | 'admin' => {
  const emailLower = email.toLowerCase();
  
  if (emailLower.includes('student') || /^\d+@/.test(emailLower)) {
    return 'student';
  }
  
  if (emailLower.includes('faculty') || emailLower.includes('prof') || emailLower.includes('teacher')) {
    return 'teacher';
  }
  
  if (emailLower.includes('admin') || emailLower.includes('staff')) {
    return 'admin';
  }
  
  // Default to student for @vijaybhoomi.edu.in emails
  return 'student';
};

/**
 * Environment configuration validation
 */
export const validateMSALConfig = (): boolean => {
  const requiredEnvVars = [
    'VITE_MICROSOFT_CLIENT_ID',
    'VITE_MICROSOFT_AUTHORITY',
    'VITE_MICROSOFT_REDIRECT_URI'
  ];
  
  const missingVars = requiredEnvVars.filter(varName => !import.meta.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('Missing required environment variables for Microsoft SSO:', missingVars);
    return false;
  }
  
  return true;
};

/**
 * Check if Microsoft SSO is properly configured
 */
export const isMSALConfigured = (): boolean => {
  return msalConfig.auth.clientId !== 'your-client-id' && validateMSALConfig();
};
