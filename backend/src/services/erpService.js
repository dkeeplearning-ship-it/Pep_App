const axios = require('axios');

/**
 * ERP Service for Vijaybhoomi College Authentication
 * Validates users against the college ERP system
 */
class ERPService {
  constructor() {
    this.erpBaseUrl = 'https://kos.vijaybhoomi.edu.in';
    this.authEndpoint = '/spring/user_verification/authenticate';
  }

  /**
   * Validate user credentials against ERP system
   * @param {string} email - User email (should be @vijaybhoomi.edu.in)
   * @param {string} password - User password
   * @returns {Promise<Object>} Validation result
   */
  async validateUser(email, password) {
    try {
      console.log('🔍 ERP Validation: Attempting to validate user:', email);

      // Validate email domain
      if (!email.endsWith('@vijaybhoomi.edu.in')) {
        return {
          success: false,
          error: 'INVALID_DOMAIN',
          message: 'Email must be from @vijaybhoumi.edu.in domain'
        };
      }

      const requestPayload = {
        user_name: email,
        secret_key: password
      };

      const response = await axios.post(
        `${this.erpBaseUrl}${this.authEndpoint}`,
        requestPayload,
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 10000 // 10 second timeout
        }
      );

      if (response.status === 200) {
        console.log('✅ ERP Validation: User validated successfully');
        return {
          success: true,
          message: 'User validated successfully',
          data: response.data
        };
      }

      return {
        success: false,
        error: 'UNEXPECTED_RESPONSE',
        message: 'Unexpected response from ERP system'
      };

    } catch (error) {
      console.error('❌ ERP Validation Error:', error.message);

      // Handle specific HTTP error codes
      if (error.response) {
        const { status, data } = error.response;
        
        if (status === 401) {
          return {
            success: false,
            error: 'UNAUTHORIZED',
            message: data?.message || 'Invalid credentials or user not found in ERP system'
          };
        }

        return {
          success: false,
          error: 'ERP_ERROR',
          message: data?.message || `ERP system error (${status})`
        };
      }

      // Handle network/timeout errors
      if (error.code === 'ECONNABORTED') {
        return {
          success: false,
          error: 'TIMEOUT',
          message: 'ERP system timeout. Please try again.'
        };
      }

      if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        return {
          success: false,
          error: 'NETWORK_ERROR',
          message: 'Unable to connect to ERP system. Please try again later.'
        };
      }

      return {
        success: false,
        error: 'UNKNOWN_ERROR',
        message: 'An unexpected error occurred during ERP validation'
      };
    }
  }

  /**
   * Validate user for SSO (without password)
   * This method validates that the user exists in the ERP system
   * @param {string} email - User email from Microsoft SSO
   * @returns {Promise<Object>} Validation result
   */
  async validateSSOUser(email) {
    try {
      console.log('🔍 ERP SSO Validation: Checking user existence:', email);

      // Validate email domain first
      if (!email.endsWith('@vijaybhoomi.edu.in')) {
        return {
          success: false,
          error: 'INVALID_DOMAIN',
          message: 'Email must be from @vijaybhoumi.edu.in domain'
        };
      }

      // Extract username from email for ERP validation
      const username = email.split('@')[0];

      // For SSO validation, we'll try to validate with a dummy password
      // to check if the user exists in ERP (this will fail authentication but confirm user existence)
      // In a production environment, you might have a dedicated ERP endpoint for user existence checks

      try {
        // Attempt ERP validation with dummy password to check user existence
        const erpResponse = await this.validateUser(email, 'dummy_password_for_existence_check');

        // If we get UNAUTHORIZED, it means user exists but password is wrong (which is expected)
        if (erpResponse.error === 'UNAUTHORIZED') {
          console.log('✅ ERP SSO Validation: User exists in ERP system (unauthorized as expected)');

          return {
            success: true,
            message: 'User exists in ERP system and is eligible for SSO',
            data: {
              email: email,
              username: username,
              domain_validated: true,
              erp_user_exists: true,
              sso_eligible: true
            }
          };
        }

        // If validation succeeds with dummy password, something is wrong
        if (erpResponse.success) {
          console.log('⚠️ ERP SSO Validation: Unexpected success with dummy password');
          return {
            success: true,
            message: 'User validated in ERP system',
            data: {
              email: email,
              username: username,
              domain_validated: true,
              erp_user_exists: true,
              sso_eligible: true
            }
          };
        }

        // Other errors might indicate user doesn't exist
        return {
          success: false,
          error: 'USER_NOT_FOUND_IN_ERP',
          message: 'User not found in ERP system. Please contact administrator.'
        };

      } catch (erpError) {
        // If ERP is unreachable, we'll allow SSO but mark as unverified
        console.log('⚠️ ERP SSO Validation: ERP system unreachable, allowing SSO with warning');

        return {
          success: true,
          message: 'Domain validated, ERP verification pending',
          data: {
            email: email,
            username: username,
            domain_validated: true,
            erp_user_exists: 'unknown',
            sso_eligible: true,
            erp_warning: 'ERP system unreachable during validation'
          }
        };
      }

    } catch (error) {
      console.error('❌ ERP SSO Validation Error:', error.message);

      return {
        success: false,
        error: 'SSO_VALIDATION_ERROR',
        message: 'Error validating SSO user against ERP system'
      };
    }
  }

  /**
   * Extract user role from email pattern
   * @param {string} email - User email
   * @returns {string} Predicted user role
   */
  extractUserRole(email) {
    // Basic role detection based on email patterns
    // You can customize this based on your college's email conventions
    
    if (email.includes('student') || /^\d+@/.test(email)) {
      return 'student';
    }
    
    if (email.includes('faculty') || email.includes('prof') || email.includes('teacher')) {
      return 'teacher';
    }
    
    if (email.includes('admin') || email.includes('staff')) {
      return 'admin';
    }
    
    // Default to student for @vijaybhoomi.edu.in emails
    return 'student';
  }
}

module.exports = new ERPService();
