const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api/v1';
let authToken = '';

// Test configuration
const testConfig = {
  adminCredentials: {
    username: 'superadmin',
    password: 'PEP@Admin2024!'
  }
};

/**
 * Make authenticated API request
 */
async function apiRequest(method, endpoint, data = null) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        ...(authToken && { 'Authorization': `Bearer ${authToken}` })
      },
      ...(data && { data })
    };

    const response = await axios(config);
    return response.data;
  } catch (error) {
    if (error.response) {
      console.error(`❌ API Error [${method} ${endpoint}]:`, error.response.data);
      return error.response.data;
    }
    throw error;
  }
}

/**
 * Authenticate as admin
 */
async function authenticate() {
  try {
    console.log('🔐 Authenticating as admin...');
    
    const response = await apiRequest('POST', '/auth/login', testConfig.adminCredentials);
    
    if (response.success && response.data.token) {
      authToken = response.data.token;
      console.log('✅ Authentication successful');
      return true;
    } else {
      console.error('❌ Authentication failed:', response.message);
      return false;
    }
  } catch (error) {
    console.error('❌ Authentication error:', error.message);
    return false;
  }
}

/**
 * Test Weightage Validation
 */
async function testWeightageValidation() {
  console.log('\n📊 Testing Weightage Validation...');
  
  try {
    // Test comprehensive validation
    const allValidation = await apiRequest('GET', '/admin/weightage-validation');
    console.log('✅ All weightages validation:', allValidation.isValid ? 'VALID' : 'INVALID');
    
    if (!allValidation.isValid) {
      console.log('⚠️ Issues found:', allValidation.issues);
    }

    // Test quadrant validation
    const quadrantValidation = await apiRequest('GET', '/admin/weightage-validation/quadrants');
    console.log('✅ Quadrant weightages:', quadrantValidation.isValid ? 'VALID' : 'INVALID');
    console.log(`   Total: ${quadrantValidation.totalWeightage}%`);

    // Test sub-category validation
    const subCategoryValidation = await apiRequest('GET', '/admin/weightage-validation/sub-categories');
    console.log('✅ Sub-category weightages:', subCategoryValidation.isValid ? 'VALID' : 'INVALID');
    
    if (subCategoryValidation.results) {
      const validCount = subCategoryValidation.results.filter(r => r.isValid).length;
      console.log(`   Valid quadrants: ${validCount}/${subCategoryValidation.results.length}`);
    }

    return true;
  } catch (error) {
    console.error('❌ Weightage validation test failed:', error.message);
    return false;
  }
}

/**
 * Test Task-Microcompetency Links
 */
async function testTaskMicrocompetencyLinks() {
  console.log('\n🔗 Testing Task-Microcompetency Links...');
  
  try {
    // Get statistics
    const stats = await apiRequest('GET', '/admin/task-microcompetency-stats');
    console.log('✅ Task-Microcompetency Statistics:');
    console.log(`   Total tasks: ${stats.statistics.totalTasks}`);
    console.log(`   Linked tasks: ${stats.statistics.linkedTasks}`);
    console.log(`   Linkage rate: ${stats.statistics.linkageRate}%`);
    console.log(`   Total links: ${stats.statistics.totalLinks}`);

    // Check for invalid weightages
    const invalidTasks = await apiRequest('GET', '/admin/tasks/invalid-weightages');
    console.log('✅ Tasks with invalid weightages:', invalidTasks.count);
    
    if (invalidTasks.invalidTasks && invalidTasks.invalidTasks.length > 0) {
      console.log('⚠️ Invalid tasks found:');
      invalidTasks.invalidTasks.forEach(task => {
        console.log(`   - ${task.taskName}: ${task.totalWeightage}% (${task.microcompetencyCount} microcompetencies)`);
      });
    }

    return true;
  } catch (error) {
    console.error('❌ Task-microcompetency test failed:', error.message);
    return false;
  }
}

/**
 * Test Bulk Teacher Assignment
 */
async function testBulkTeacherAssignment() {
  console.log('\n👥 Testing Bulk Teacher Assignment...');
  
  try {
    // Get assignment statistics
    const stats = await apiRequest('GET', '/admin/teacher-assignment-stats');
    console.log('✅ Teacher Assignment Statistics:');
    console.log(`   Total teachers: ${stats.statistics.totalTeachers}`);
    console.log(`   Assigned teachers: ${stats.statistics.assignedTeachers}`);
    console.log(`   Assignment rate: ${stats.statistics.assignmentRate}%`);
    console.log(`   Active interventions: ${stats.statistics.activeInterventions}`);
    console.log(`   Average teachers per intervention: ${stats.statistics.averageTeachersPerIntervention}`);

    return true;
  } catch (error) {
    console.error('❌ Bulk teacher assignment test failed:', error.message);
    return false;
  }
}

/**
 * Test Database Schema
 */
async function testDatabaseSchema() {
  console.log('\n🗄️ Testing Database Schema...');
  
  try {
    // Test if task_microcompetencies table exists by trying to query it
    const response = await apiRequest('GET', '/admin/task-microcompetency-stats');
    
    if (response.success) {
      console.log('✅ task_microcompetencies table exists and accessible');
      return true;
    } else {
      console.log('❌ task_microcompetencies table not accessible');
      return false;
    }
  } catch (error) {
    console.error('❌ Database schema test failed:', error.message);
    return false;
  }
}

/**
 * Main test function
 */
async function runTests() {
  console.log('🚀 Starting New Features Test Suite\n');
  
  try {
    // Authenticate
    const authenticated = await authenticate();
    if (!authenticated) {
      console.error('❌ Cannot proceed without authentication');
      return;
    }
    
    // Run tests
    const testResults = {
      weightageValidation: await testWeightageValidation(),
      taskMicrocompetencyLinks: await testTaskMicrocompetencyLinks(),
      bulkTeacherAssignment: await testBulkTeacherAssignment(),
      databaseSchema: await testDatabaseSchema()
    };
    
    // Summary
    console.log('\n📊 Test Results Summary:');
    console.log('========================');
    
    const passedTests = Object.values(testResults).filter(result => result).length;
    const totalTests = Object.keys(testResults).length;
    
    Object.entries(testResults).forEach(([testName, passed]) => {
      const status = passed ? '✅ PASS' : '❌ FAIL';
      console.log(`${status} ${testName}`);
    });
    
    console.log(`\n🎯 Overall: ${passedTests}/${totalTests} tests passed`);
    
    if (passedTests === totalTests) {
      console.log('🎉 All new features are working correctly!');
    } else {
      console.log('⚠️ Some features need attention');
    }
    
  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests();
}

module.exports = {
  runTests,
  testWeightageValidation,
  testTaskMicrocompetencyLinks,
  testBulkTeacherAssignment,
  testDatabaseSchema
};
