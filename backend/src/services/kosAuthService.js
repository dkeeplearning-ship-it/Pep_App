const axios = require('axios');

/**
 * KOS-Core Authentication Service
 * Handles authentication with Vijaybhoomi's KOS-Core system
 */
class KOSAuthService {
  constructor() {
    this.kosBaseUrl = 'https://kos.vijaybhoomi.edu.in';
    this.authEndpoint = '/spring/user_verification/authenticate';
    this.userInfoEndpoint = '/spring/user_verification/user_info';
    this.timeout = 15000; // 15 seconds
  }

  /**
   * Authenticate user with KOS-Core system
   * @param {string} email - User email (should be @vijaybhoomi.edu.in)
   * @param {string} password - User password
   * @returns {Promise<Object>} Authentication result
   */
  async authenticateUser(email, password) {
    try {
      console.log('🔍 KOS Auth: Attempting to authenticate user:', email);

      // Validate email domain
      if (!email.endsWith('@vijaybhoomi.edu.in')) {
        return {
          success: false,
          error: 'INVALID_DOMAIN',
          message: 'Email must be from @vijaybhoomi.edu.in domain'
        };
      }

      // Prepare authentication request - matching KOS-Core expected format
      const authPayload = {
        user_name: email,
        secret_key: password
      };

      console.log('📤 KOS Auth: Sending authentication request to KOS-Core');
      console.log('🔗 KOS Auth: URL:', `${this.kosBaseUrl}${this.authEndpoint}`);
      console.log('📋 KOS Auth: Payload:', JSON.stringify(authPayload, null, 2));

      const response = await axios.post(
        `${this.kosBaseUrl}${this.authEndpoint}`,
        authPayload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          timeout: this.timeout
        }
      );

      console.log('📥 KOS Auth: Received response from KOS-Core:', {
        status: response.status,
        success: response.data?.success,
        data: response.data
      });

      // KOS returns 200 with user data on success, no 'success' field
      if (response.status === 200 && response.data && response.data.data) {
        console.log('✅ KOS Auth: Authentication successful');

        return {
          success: true,
          data: {
            user: response.data.data,
            jwt_token: response.data.jwt_token,
            kos_session: response.data.KOS_SESSION,
            message: response.data.message,
            authenticated_via: 'kos-core'
          }
        };
      } else {
        console.log('❌ KOS Auth: Authentication failed - unexpected response format');
        return {
          success: false,
          error: 'INVALID_RESPONSE',
          message: 'Unexpected response from KOS-Core'
        };
      }

    } catch (error) {
      console.error('❌ KOS Auth Error:', error.message);

      if (error.response) {
        console.error('📥 KOS Auth Error Response:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
          headers: error.response.headers
        });
      }

      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        return {
          success: false,
          error: 'KOS_UNAVAILABLE',
          message: 'KOS-Core system is currently unavailable'
        };
      }

      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;

        if (status === 401 || status === 403) {
          return {
            success: false,
            error: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password'
          };
        }

        if (status >= 500) {
          return {
            success: false,
            error: 'KOS_SERVER_ERROR',
            message: 'KOS-Core system error'
          };
        }

        return {
          success: false,
          error: 'KOS_ERROR',
          message: data?.message || 'Authentication failed'
        };
      }

      return {
        success: false,
        error: 'NETWORK_ERROR',
        message: 'Network error connecting to KOS-Core system'
      };
    }
  }

  /**
   * Get additional user information from KOS-Core
   * @param {string} email - User email
   * @param {string} sessionToken - Session token from authentication
   * @returns {Promise<Object>} User information
   */
  async getUserInfo(email, sessionToken) {
    try {
      console.log('📋 KOS Auth: Fetching additional user information');

      const response = await axios.post(
        `${this.kosBaseUrl}${this.userInfoEndpoint}`,
        {
          user_name: email,
          session_token: sessionToken
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          timeout: this.timeout
        }
      );

      if (response.data && response.data.success) {
        console.log('✅ KOS Auth: User information retrieved successfully');
        return response.data.user_info || {};
      }

      return {};
    } catch (error) {
      console.log('⚠️ KOS Auth: Could not fetch additional user info:', error.message);
      return {};
    }
  }

  /**
   * Validate if email belongs to Vijaybhoomi domain
   * @param {string} email - Email to validate
   * @returns {boolean} True if valid domain
   */
  isValidDomain(email) {
    return email && email.endsWith('@vijaybhoomi.edu.in');
  }

  /**
   * Extract username from email
   * @param {string} email - Full email address
   * @returns {string} Username part before @
   */
  extractUsername(email) {
    return email.split('@')[0];
  }

  /**
   * Determine user role based on email pattern
   * @param {string} email - User email
   * @returns {string} Determined role (student, teacher, admin)
   */
  determineRole(email) {
    const emailLower = email.toLowerCase();
    
    if (emailLower.includes('admin') || emailLower.includes('administrator')) {
      return 'admin';
    }
    
    if (emailLower.includes('faculty') || 
        emailLower.includes('teacher') || 
        emailLower.includes('prof') || 
        emailLower.includes('instructor')) {
      return 'teacher';
    }
    
    return 'student';
  }

  /**
   * Extract user details from KOS response
   * @param {Object} kosUserData - User data from KOS-Core
   * @param {string} email - User email
   * @returns {Object} Formatted user details
   */
  extractUserDetails(kosUserData, email) {
    const username = this.extractUsername(email);

    // Extract role from KOS response with proper mapping
    let role = 'student'; // default

    if (kosUserData.roleType) {
      // Map KOS roleType to our role system
      const kosRole = kosUserData.roleType.toLowerCase();
      if (kosRole === 'student') {
        role = 'student';
      } else if (kosRole === 'faculty' || kosRole === 'teacher') {
        role = 'teacher';
      } else if (kosRole === 'admin' || kosRole === 'administrator') {
        role = 'admin';
      }
    } else if (kosUserData.role) {
      // Fallback to role field if roleType not available
      role = kosUserData.role.toLowerCase();
    } else {
      // Final fallback to email-based detection
      role = this.determineRole(email);
    }

    console.log(`🎯 KOS Role Mapping: roleType="${kosUserData.roleType}" → role="${role}"`);

    return {
      email: email,
      username: username,
      first_name: kosUserData.firstName || kosUserData.first_name || kosUserData.name?.split(' ')[0] || username,
      last_name: kosUserData.lastName || kosUserData.last_name || kosUserData.name?.split(' ').slice(1).join(' ') || '',
      role: role,
      kos_user_id: kosUserData.userId || kosUserData.user_id || kosUserData.id,
      department: kosUserData.department,
      designation: kosUserData.designation,
      employee_id: kosUserData.employee_id,
      student_id: kosUserData.student_id || kosUserData.id,
      admin_flag: kosUserData.adminUserFlag
    };
  }
}

module.exports = new KOSAuthService();
