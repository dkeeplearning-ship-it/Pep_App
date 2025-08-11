const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api/v1';
const TEST_CREDENTIALS = {
  username: 'test_student',
  password: 'test123'
};

let authToken = '';
let studentId = '';

// Test configuration
const testConfig = {
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
};

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, colors.green);
}

function logError(message) {
  log(`❌ ${message}`, colors.red);
}

function logInfo(message) {
  log(`ℹ️  ${message}`, colors.blue);
}

function logWarning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

async function testEndpoint(method, endpoint, data = null, expectedStatus = 200, description = '') {
  try {
    const config = {
      ...testConfig,
      method: method.toLowerCase(),
      url: `${BASE_URL}${endpoint}`,
      headers: {
        ...testConfig.headers,
        ...(authToken && { 'Authorization': `Bearer ${authToken}` })
      }
    };

    if (data && (method.toLowerCase() === 'post' || method.toLowerCase() === 'put')) {
      config.data = data;
    }

    const response = await axios(config);
    
    if (response.status === expectedStatus) {
      logSuccess(`${method} ${endpoint} - ${description || 'Success'}`);
      return { success: true, data: response.data };
    } else {
      logWarning(`${method} ${endpoint} - Unexpected status: ${response.status}`);
      return { success: false, data: response.data };
    }
  } catch (error) {
    if (error.response) {
      logError(`${method} ${endpoint} - ${error.response.status}: ${error.response.data?.message || error.message}`);
      return { success: false, error: error.response.data };
    } else {
      logError(`${method} ${endpoint} - Network Error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}

async function authenticateStudent() {
  log('\n🔐 AUTHENTICATION TEST', colors.bold);
  
  const result = await testEndpoint('POST', '/auth/login', TEST_CREDENTIALS, 200, 'Student Login');
  
  if (result.success && result.data.data?.token) {
    authToken = result.data.data.token;
    studentId = result.data.data.profile?.id || result.data.data.user?.id;
    logSuccess(`Authentication successful. Student ID: ${studentId}`);
    return true;
  } else {
    logError('Authentication failed. Cannot proceed with API tests.');
    return false;
  }
}

async function testDashboardAPIs() {
  log('\n📊 DASHBOARD & PERFORMANCE APIs (3 endpoints)', colors.bold);
  
  // Test performance endpoint
  await testEndpoint('GET', `/students/${studentId}/performance`, null, 200, 'Get Student Performance');
  await testEndpoint('GET', `/students/${studentId}/performance?includeHistory=true`, null, 200, 'Get Performance with History');
  
  // Test leaderboard endpoint
  await testEndpoint('GET', `/students/${studentId}/leaderboard`, null, 200, 'Get Student Leaderboard');
  
  // Test quadrant details (we'll use a sample quadrant ID)
  await testEndpoint('GET', `/students/${studentId}/quadrants/persona`, null, 200, 'Get Quadrant Details');
}

async function testFeedbackAPIs() {
  log('\n💬 FEEDBACK MANAGEMENT APIs (2 endpoints)', colors.bold);
  
  // Test submit feedback
  const feedbackData = {
    subject: 'Test Feedback',
    category: 'general',
    message: 'This is a test feedback message',
    priority: 'medium'
  };
  
  await testEndpoint('POST', `/students/${studentId}/feedback`, feedbackData, 201, 'Submit Feedback');
  
  // Test get feedback history
  await testEndpoint('GET', `/students/${studentId}/feedback`, null, 200, 'Get Feedback History');
  await testEndpoint('GET', `/students/${studentId}/feedback?page=1&limit=5`, null, 200, 'Get Feedback with Pagination');
}

async function testProfileAPIs() {
  log('\n👤 PROFILE MANAGEMENT APIs (3 endpoints)', colors.bold);
  
  // Test get profile
  await testEndpoint('GET', `/students/${studentId}/profile`, null, 200, 'Get Student Profile');
  
  // Test update profile
  const profileUpdateData = {
    phone: '+1234567890',
    preferences: {
      notifyScores: true,
      darkMode: false
    }
  };
  
  await testEndpoint('PUT', `/students/${studentId}/profile`, profileUpdateData, 200, 'Update Student Profile');
  
  // Test change password (this might fail if current password is wrong, but we'll test the endpoint)
  const passwordData = {
    currentPassword: 'test123',
    newPassword: 'newtest123',
    confirmPassword: 'newtest123'
  };
  
  await testEndpoint('POST', `/students/${studentId}/change-password`, passwordData, 200, 'Change Password');
}

async function testEligibilityAPIs() {
  log('\n🎯 ELIGIBILITY & ASSESSMENT APIs (4 endpoints)', colors.bold);
  
  // Test eligibility rules
  await testEndpoint('GET', '/students/eligibility-rules', null, 200, 'Get Eligibility Rules');
  
  // Test student eligibility
  await testEndpoint('GET', `/students/${studentId}/eligibility`, null, 200, 'Check Student Eligibility');
  
  // Test improvement plan
  await testEndpoint('GET', `/students/${studentId}/improvement-plan`, null, 200, 'Get Improvement Plan');
  
  // Test set improvement goals
  const goalsData = {
    goals: [
      {
        componentId: 'sample-component-id',
        targetScore: 4.5,
        targetDate: '2024-03-15',
        actions: ['Practice daily', 'Seek feedback']
      }
    ]
  };
  
  await testEndpoint('POST', `/students/${studentId}/improvement-goals`, goalsData, 201, 'Set Improvement Goals');
}

async function testAttendanceAnalyticsAPIs() {
  log('\n📈 ATTENDANCE & ANALYTICS APIs (3 endpoints)', colors.bold);
  
  // Test attendance
  await testEndpoint('GET', `/students/${studentId}/attendance`, null, 200, 'Get Student Attendance');
  
  // Test score breakdown
  await testEndpoint('GET', `/students/${studentId}/scores/breakdown`, null, 200, 'Get Score Breakdown');
  
  // Test behavior rating scale
  await testEndpoint('GET', `/students/${studentId}/behavior-rating-scale`, null, 200, 'Get Behavior Rating Scale');
}

async function testInterventionAPIs() {
  log('\n🎓 INTERVENTION MANAGEMENT APIs (5 endpoints)', colors.bold);
  
  // Test get interventions
  await testEndpoint('GET', `/students/${studentId}/interventions`, null, 200, 'Get Student Interventions');
  
  // Test intervention details (using sample intervention ID)
  await testEndpoint('GET', `/students/${studentId}/interventions/sample-intervention-id`, null, 200, 'Get Intervention Details');
  
  // Test intervention tasks
  await testEndpoint('GET', `/students/${studentId}/interventions/sample-intervention-id/tasks`, null, 200, 'Get Intervention Tasks');
  
  // Test task submission
  const taskSubmissionData = {
    notes: 'This is my task submission'
  };
  
  await testEndpoint('POST', `/students/${studentId}/interventions/sample-intervention-id/tasks/sample-task-id/submit`, 
    taskSubmissionData, 201, 'Submit Intervention Task');
  
  // Test quadrant impact
  await testEndpoint('GET', `/students/${studentId}/interventions/quadrant-impact`, null, 200, 'Get Intervention Quadrant Impact');
}

async function testAdministrativeAPIs() {
  log('\n👨‍💼 ADMINISTRATIVE APIs (2 endpoints)', colors.bold);
  
  // These might fail due to role restrictions, but we'll test them
  await testEndpoint('GET', '/students', null, 200, 'Get All Students (may fail due to role)');
  
  const newStudentData = {
    name: 'Test Student 2',
    email: 'test2@example.com',
    registrationNo: '12346',
    course: 'PGDM',
    batchId: 'sample-batch-id'
  };
  
  await testEndpoint('POST', '/students', newStudentData, 201, 'Create New Student (may fail due to role)');
}

async function testHealthAndUtility() {
  log('\n🏥 HEALTH & UTILITY ENDPOINTS', colors.bold);
  
  // Test health endpoint (not under /api/v1)
  try {
    const response = await axios.get('http://localhost:3001/health');
    logSuccess('GET /health - Health Check');
  } catch (error) {
    logError('GET /health - Health Check Failed');
  }
  
  // Test sample data initialization (admin only)
  await testEndpoint('POST', '/students/init-sample-data', null, 200, 'Initialize Sample Data (may fail due to role)');
}

async function runAllTests() {
  log('🧪 STARTING COMPREHENSIVE STUDENT API TESTS', colors.bold);
  log('='.repeat(60), colors.blue);
  
  // Check if server is running
  try {
    await axios.get('http://localhost:3001/health', { timeout: 5000 });
    logSuccess('Server is running and responsive');
  } catch (error) {
    logError('Server is not running or not responsive. Please start the server first.');
    return;
  }
  
  // Authenticate first
  const authSuccess = await authenticateStudent();
  if (!authSuccess) {
    return;
  }
  
  // Run all API tests
  await testDashboardAPIs();
  await testFeedbackAPIs();
  await testProfileAPIs();
  await testEligibilityAPIs();
  await testAttendanceAnalyticsAPIs();
  await testInterventionAPIs();
  await testAdministrativeAPIs();
  await testHealthAndUtility();
  
  log('\n🎉 API TESTING COMPLETED', colors.bold);
  log('='.repeat(60), colors.blue);
  logInfo('Check the results above to see which endpoints are working correctly.');
  logInfo('Some endpoints may fail due to missing sample data or role restrictions.');
  logInfo('This is expected and can be resolved by initializing sample data.');
}

// Run the tests
runAllTests().catch(error => {
  logError(`Test execution failed: ${error.message}`);
  process.exit(1);
}); 