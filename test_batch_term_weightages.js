/**
 * Test Script for Batch-Term Specific Weightages
 * 
 * This script tests the new batch-term specific weightage system
 * including API endpoints, database functions, and score calculations.
 */

const axios = require('axios');
require('dotenv').config();

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001/api/v1';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'your-admin-token-here';

// Enhanced error logging
const DEBUG_MODE = process.env.DEBUG_MODE === 'true';

// Test configuration
const TEST_CONFIG = {
  batch_id: null, // Will be set from API
  term_id: null,  // Will be set from API
  student_id: null, // Will be set from API
  config_id: null  // Will be set after creation
};

// API client with authentication
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Authorization': `Bearer ${ADMIN_TOKEN}`,
    'Content-Type': 'application/json'
  }
});

/**
 * Test helper functions
 */
const testHelpers = {
  async makeRequest(method, url, data = null) {
    try {
      const response = await apiClient({
        method,
        url,
        data
      });
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data || error.message,
        status: error.response?.status
      };
    }
  },

  logTest(testName, result) {
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${testName}`);
    if (!result.success) {
      console.log(`   Error: ${JSON.stringify(result.error, null, 2)}`);
      if (DEBUG_MODE && result.error.response) {
        console.log(`   Response Status: ${result.status}`);
        console.log(`   Response Headers: ${JSON.stringify(result.error.response?.headers, null, 2)}`);
      }
    }
    return result.success;
  },

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
};

/**
 * Test Suite 1: Setup and Data Retrieval
 */
async function testSetupAndDataRetrieval() {
  console.log('\n🔧 Test Suite 1: Setup and Data Retrieval');
  
  let passCount = 0;
  let totalTests = 0;

  // Test 1.1: Get available batches
  totalTests++;
  const batchesResult = await testHelpers.makeRequest('GET', '/admin/batch-term-weightages/batches');
  if (testHelpers.logTest('Get available batches', batchesResult)) {
    passCount++;
    if (batchesResult.data.data.length > 0) {
      TEST_CONFIG.batch_id = batchesResult.data.data[0].id;
      console.log(`   Using batch: ${batchesResult.data.data[0].name} (${TEST_CONFIG.batch_id})`);
    }
  }

  // Test 1.2: Get available terms
  totalTests++;
  const termsResult = await testHelpers.makeRequest('GET', '/admin/batch-term-weightages/terms');
  if (testHelpers.logTest('Get available terms', termsResult)) {
    passCount++;
    if (termsResult.data.data.length > 0) {
      TEST_CONFIG.term_id = termsResult.data.data[0].id;
      console.log(`   Using term: ${termsResult.data.data[0].name} (${TEST_CONFIG.term_id})`);
    }
  }

  // Test 1.3: Get available quadrants
  totalTests++;
  const quadrantsResult = await testHelpers.makeRequest('GET', '/admin/batch-term-weightages/quadrants');
  if (testHelpers.logTest('Get available quadrants', quadrantsResult)) {
    passCount++;
    console.log(`   Found ${quadrantsResult.data.data.length} quadrants`);
  }

  // Test 1.4: Get available subcategories
  totalTests++;
  const subcategoriesResult = await testHelpers.makeRequest('GET', '/admin/batch-term-weightages/subcategories');
  if (testHelpers.logTest('Get available subcategories', subcategoriesResult)) {
    passCount++;
    console.log(`   Found ${subcategoriesResult.data.data.length} subcategories`);
  }

  // Test 1.5: Get a test student
  totalTests++;
  const studentsResult = await testHelpers.makeRequest('GET', '/students');
  if (testHelpers.logTest('Get available students', studentsResult)) {
    passCount++;
    if (studentsResult.data.data.length > 0) {
      TEST_CONFIG.student_id = studentsResult.data.data[0].id;
      console.log(`   Using student: ${studentsResult.data.data[0].name} (${TEST_CONFIG.student_id})`);
    }
  }

  console.log(`\n📊 Suite 1 Results: ${passCount}/${totalTests} tests passed`);
  return { passCount, totalTests };
}

/**
 * Test Suite 2: Configuration Management
 */
async function testConfigurationManagement() {
  console.log('\n⚙️ Test Suite 2: Configuration Management');
  
  let passCount = 0;
  let totalTests = 0;

  if (!TEST_CONFIG.batch_id || !TEST_CONFIG.term_id) {
    console.log('❌ Skipping configuration tests - missing batch or term ID');
    return { passCount: 0, totalTests: 0 };
  }

  // Test 2.1: Check if configuration already exists
  totalTests++;
  const existingConfigResult = await testHelpers.makeRequest(
    'GET', 
    `/admin/batch-term-weightages/${TEST_CONFIG.batch_id}/${TEST_CONFIG.term_id}`
  );
  
  if (existingConfigResult.success) {
    testHelpers.logTest('Get existing configuration', existingConfigResult);
    passCount++;
    TEST_CONFIG.config_id = existingConfigResult.data.data.config.id;
    console.log(`   Using existing config: ${TEST_CONFIG.config_id}`);
  } else if (existingConfigResult.status === 404) {
    // Test 2.2: Create new configuration
    totalTests++;
    const createConfigResult = await testHelpers.makeRequest('POST', '/admin/batch-term-weightages', {
      batch_id: TEST_CONFIG.batch_id,
      term_id: TEST_CONFIG.term_id,
      config_name: `Test Config - ${new Date().toISOString()}`,
      description: 'Test configuration for batch-term weightages'
    });
    
    if (testHelpers.logTest('Create new configuration', createConfigResult)) {
      passCount++;
      TEST_CONFIG.config_id = createConfigResult.data.data.config_id;
      console.log(`   Created config: ${TEST_CONFIG.config_id}`);
    }
  }

  // Test 2.3: Validate configuration
  totalTests++;
  const validateResult = await testHelpers.makeRequest(
    'GET', 
    `/admin/batch-term-weightages/${TEST_CONFIG.batch_id}/${TEST_CONFIG.term_id}/validate`
  );
  if (testHelpers.logTest('Validate configuration', validateResult)) {
    passCount++;
    console.log(`   Validation result: ${validateResult.data.data.success ? 'Valid' : 'Invalid'}`);
  }

  // Test 2.4: Get all configurations
  totalTests++;
  const allConfigsResult = await testHelpers.makeRequest('GET', '/admin/batch-term-weightages');
  if (testHelpers.logTest('Get all configurations', allConfigsResult)) {
    passCount++;
    console.log(`   Found ${allConfigsResult.data.data.length} configurations`);
  }

  console.log(`\n📊 Suite 2 Results: ${passCount}/${totalTests} tests passed`);
  return { passCount, totalTests };
}

/**
 * Test Suite 3: Weightage Updates
 */
async function testWeightageUpdates() {
  console.log('\n🔄 Test Suite 3: Weightage Updates');
  
  let passCount = 0;
  let totalTests = 0;

  if (!TEST_CONFIG.batch_id || !TEST_CONFIG.term_id) {
    console.log('❌ Skipping weightage update tests - missing batch or term ID');
    return { passCount: 0, totalTests: 0 };
  }

  // Test 3.1: Update quadrant weightages
  totalTests++;
  const quadrantWeightages = [
    { quadrant_id: 'persona', weightage: 60.0, minimum_attendance: 75.0 },
    { quadrant_id: 'wellness', weightage: 25.0, minimum_attendance: 80.0 },
    { quadrant_id: 'behavior', weightage: 10.0, minimum_attendance: 75.0 },
    { quadrant_id: 'discipline', weightage: 5.0, minimum_attendance: 90.0 }
  ];

  const updateQuadrantsResult = await testHelpers.makeRequest(
    'PUT',
    `/admin/batch-term-weightages/${TEST_CONFIG.batch_id}/${TEST_CONFIG.term_id}/quadrants`,
    { weightages: quadrantWeightages }
  );
  
  if (testHelpers.logTest('Update quadrant weightages', updateQuadrantsResult)) {
    passCount++;
    console.log('   Updated quadrant weightages: Persona 60%, Wellness 25%, Behavior 10%, Discipline 5%');
  }

  // Test 3.2: Validate updated configuration
  totalTests++;
  await testHelpers.sleep(1000); // Wait for database update
  const validateUpdatedResult = await testHelpers.makeRequest(
    'GET', 
    `/admin/batch-term-weightages/${TEST_CONFIG.batch_id}/${TEST_CONFIG.term_id}/validate`
  );
  if (testHelpers.logTest('Validate updated configuration', validateUpdatedResult)) {
    passCount++;
    console.log(`   Validation after update: ${validateUpdatedResult.data.data.success ? 'Valid' : 'Invalid'}`);
  }

  // Test 3.3: Test invalid weightage update (should fail)
  totalTests++;
  const invalidWeightages = [
    { quadrant_id: 'persona', weightage: 60.0 },
    { quadrant_id: 'wellness', weightage: 60.0 }, // Total > 100%
    { quadrant_id: 'behavior', weightage: 10.0 },
    { quadrant_id: 'discipline', weightage: 5.0 }
  ];

  const invalidUpdateResult = await testHelpers.makeRequest(
    'PUT',
    `/admin/batch-term-weightages/${TEST_CONFIG.batch_id}/${TEST_CONFIG.term_id}/quadrants`,
    { weightages: invalidWeightages }
  );
  
  if (!invalidUpdateResult.success && invalidUpdateResult.status === 400) {
    testHelpers.logTest('Reject invalid weightages (expected failure)', { success: true });
    passCount++;
    console.log('   Correctly rejected invalid weightages');
  } else {
    testHelpers.logTest('Reject invalid weightages (expected failure)', { success: false });
  }

  console.log(`\n📊 Suite 3 Results: ${passCount}/${totalTests} tests passed`);
  return { passCount, totalTests };
}

/**
 * Test Suite 4: Score Calculation
 */
async function testScoreCalculation() {
  console.log('\n🧮 Test Suite 4: Score Calculation');
  
  let passCount = 0;
  let totalTests = 0;

  if (!TEST_CONFIG.student_id || !TEST_CONFIG.term_id) {
    console.log('❌ Skipping score calculation tests - missing student or term ID');
    return { passCount: 0, totalTests: 0 };
  }

  // Test 4.1: Calculate unified HPS with dynamic weightages
  totalTests++;
  const calculateScoreResult = await testHelpers.makeRequest(
    'POST',
    `/unified-scores/calculate/${TEST_CONFIG.student_id}/${TEST_CONFIG.term_id}`
  );
  
  if (testHelpers.logTest('Calculate unified HPS with dynamic weightages', calculateScoreResult)) {
    passCount++;
    const hps = calculateScoreResult.data.data.totalHPS;
    const source = calculateScoreResult.data.data.weightageSource;
    console.log(`   Calculated HPS: ${hps.toFixed(2)}% using ${source} weightages`);
  }

  // Test 4.2: Recalculate scores for batch-term
  if (TEST_CONFIG.batch_id && TEST_CONFIG.term_id) {
    totalTests++;
    const recalculateResult = await testHelpers.makeRequest(
      'POST',
      `/admin/batch-term-weightages/${TEST_CONFIG.batch_id}/${TEST_CONFIG.term_id}/recalculate`
    );
    
    if (testHelpers.logTest('Recalculate scores for batch-term', recalculateResult)) {
      passCount++;
      const stats = recalculateResult.data.data;
      console.log(`   Recalculated ${stats.total_students} students: ${stats.successful_calculations} successful, ${stats.failed_calculations} failed`);
    }
  }

  console.log(`\n📊 Suite 4 Results: ${passCount}/${totalTests} tests passed`);
  return { passCount, totalTests };
}

/**
 * Main test runner
 */
async function runAllTests() {
  console.log('🚀 Starting Batch-Term Specific Weightages Test Suite');
  console.log('=' .repeat(60));

  const results = [];

  try {
    // Run all test suites
    results.push(await testSetupAndDataRetrieval());
    results.push(await testConfigurationManagement());
    results.push(await testWeightageUpdates());
    results.push(await testScoreCalculation());

    // Calculate overall results
    const totalPassed = results.reduce((sum, result) => sum + result.passCount, 0);
    const totalTests = results.reduce((sum, result) => sum + result.totalTests, 0);
    const passRate = totalTests > 0 ? (totalPassed / totalTests * 100).toFixed(1) : 0;

    console.log('\n' + '=' .repeat(60));
    console.log('🏁 Test Suite Complete');
    console.log(`📊 Overall Results: ${totalPassed}/${totalTests} tests passed (${passRate}%)`);
    
    if (totalPassed === totalTests) {
      console.log('🎉 All tests passed! The batch-term weightage system is working correctly.');
    } else {
      console.log('⚠️  Some tests failed. Please review the errors above.');
    }

  } catch (error) {
    console.error('❌ Test suite failed with error:', error.message);
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  runAllTests,
  testHelpers,
  TEST_CONFIG
};
