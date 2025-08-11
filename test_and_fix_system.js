#!/usr/bin/env node

/**
 * Comprehensive Test and Fix Script for Batch-Term Weightages
 * This script tests the system step by step and provides fixes for common issues
 */

const axios = require('axios');
const { execSync } = require('child_process');
require('dotenv').config();

// Configuration
const CONFIG = {
  API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:3001/api/v1',
  ADMIN_TOKEN: process.env.ADMIN_TOKEN || null,
  SERVER_PORT: process.env.PORT || 3001,
  DEBUG: process.env.DEBUG === 'true'
};

console.log('🚀 Starting Comprehensive System Test and Fix');
console.log('=' .repeat(60));
console.log(`API Base URL: ${CONFIG.API_BASE_URL}`);
console.log(`Debug Mode: ${CONFIG.DEBUG}`);
console.log('=' .repeat(60));

/**
 * Test Helper Functions
 */
class TestRunner {
  constructor() {
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      errors: []
    };
    
    this.apiClient = axios.create({
      baseURL: CONFIG.API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  async makeRequest(method, url, data = null, requireAuth = true) {
    try {
      const config = {
        method: method.toUpperCase(),
        url,
        headers: {}
      };

      // Only add data for POST/PUT requests
      if (data && (method.toUpperCase() === 'POST' || method.toUpperCase() === 'PUT')) {
        config.data = data;
        config.headers['Content-Type'] = 'application/json';
      }

      if (requireAuth && CONFIG.ADMIN_TOKEN) {
        config.headers['Authorization'] = `Bearer ${CONFIG.ADMIN_TOKEN}`;
      }

      const response = await this.apiClient(config);
      return { success: true, data: response.data, status: response.status };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data || error.message,
        status: error.response?.status || 0,
        code: error.code
      };
    }
  }

  logTest(testName, result, fix = null) {
    this.results.total++;
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${testName}`);
    
    if (result.success) {
      this.results.passed++;
    } else {
      this.results.failed++;
      this.results.errors.push({ test: testName, error: result.error, fix });
      
      console.log(`   Error: ${JSON.stringify(result.error, null, 2)}`);
      if (result.status) {
        console.log(`   Status: ${result.status}`);
      }
      if (fix) {
        console.log(`   💡 Suggested Fix: ${fix}`);
      }
    }
    
    return result.success;
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Step 1: Pre-flight Checks
 */
async function preflightChecks(runner) {
  console.log('\n🔍 Step 1: Pre-flight Checks');
  
  // Check if server is running (health endpoint is not under /api/v1)
  try {
    const healthResponse = await axios.get('http://localhost:3001/health');
    const healthCheck = { success: true, data: healthResponse.data };
    runner.logTest('Server Health Check', healthCheck);
  } catch (error) {
    const healthCheck = {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status || 0
    };
    runner.logTest(
      'Server Health Check',
      healthCheck,
      'Make sure your backend server is running on the correct port'
    );
    return false;
  }
  // This was moved above

  // Check if admin token is provided
  if (!CONFIG.ADMIN_TOKEN) {
    runner.logTest(
      'Admin Token Check',
      { success: false, error: 'No admin token provided' },
      'Set ADMIN_TOKEN environment variable with a valid admin token'
    );
    return false;
  } else {
    runner.logTest('Admin Token Check', { success: true });
  }

  return true; // Health check passed if we reach here
}

/**
 * Step 2: Test New API Endpoints
 */
async function testNewEndpoints(runner) {
  console.log('\n🔗 Step 2: Testing New API Endpoints');

  // Test batches endpoint
  const batchesResult = await runner.makeRequest('GET', '/admin/batch-term-weightages/batches');
  runner.logTest(
    'Get Batches Endpoint',
    batchesResult,
    'Check if the new routes are properly added to server.js and the server is restarted'
  );

  // Test terms endpoint
  const termsResult = await runner.makeRequest('GET', '/admin/batch-term-weightages/terms');
  runner.logTest('Get Terms Endpoint', termsResult);

  // Test quadrants endpoint
  const quadrantsResult = await runner.makeRequest('GET', '/admin/batch-term-weightages/quadrants');
  runner.logTest('Get Quadrants Endpoint', quadrantsResult);

  // Test configurations endpoint
  const configsResult = await runner.makeRequest('GET', '/admin/batch-term-weightages/');
  runner.logTest(
    'Get Configurations Endpoint',
    configsResult,
    'Check if database migration completed successfully'
  );

  return batchesResult.success && termsResult.success && configsResult.success;
}

/**
 * Step 3: Test Database Functions
 */
async function testDatabaseFunctions(runner) {
  console.log('\n🗄️ Step 3: Testing Database Functions');
  
  // This would require database access, so we'll test through API
  const configsResult = await runner.makeRequest('GET', '/admin/batch-term-weightages/');
  
  if (configsResult.success && configsResult.data.data.length > 0) {
    runner.logTest('Database Migration Verification', { success: true });
    console.log(`   Found ${configsResult.data.data.length} weightage configurations`);
    return true;
  } else {
    runner.logTest(
      'Database Migration Verification',
      { success: false, error: 'No configurations found' },
      'Run the database migration script and migrate_existing_weightages() function'
    );
    return false;
  }
}

/**
 * Step 4: Test Configuration Management
 */
async function testConfigurationManagement(runner) {
  console.log('\n⚙️ Step 4: Testing Configuration Management');

  // Get available batches and terms
  const batchesResult = await runner.makeRequest('GET', '/admin/batch-term-weightages/batches');
  const termsResult = await runner.makeRequest('GET', '/admin/batch-term-weightages/terms');

  if (!batchesResult.success || !termsResult.success) {
    console.log('❌ Cannot test configuration management without batches and terms');
    return false;
  }

  const batches = batchesResult.data.data;
  const terms = termsResult.data.data;

  if (batches.length === 0 || terms.length === 0) {
    runner.logTest(
      'Configuration Management Prerequisites',
      { success: false, error: 'No active batches or terms found' },
      'Ensure you have active batches and terms in your database'
    );
    return false;
  }

  const testBatch = batches[0];
  const testTerm = terms[0];

  console.log(`   Using batch: ${testBatch.name} (${testBatch.id})`);
  console.log(`   Using term: ${testTerm.name} (${testTerm.id})`);

  // Test getting specific configuration
  const configResult = await runner.makeRequest(
    'GET', 
    `/admin/batch-term-weightages/${testBatch.id}/${testTerm.id}`
  );
  
  if (configResult.success) {
    runner.logTest('Get Specific Configuration', configResult);
    
    // Test validation
    const validateResult = await runner.makeRequest(
      'GET',
      `/admin/batch-term-weightages/${testBatch.id}/${testTerm.id}/validate`
    );
    runner.logTest('Validate Configuration', validateResult);
    
    return true;
  } else if (configResult.status === 404) {
    // Configuration doesn't exist, try to create one
    const createResult = await runner.makeRequest('POST', '/admin/batch-term-weightages/', {
      batch_id: testBatch.id,
      term_id: testTerm.id,
      config_name: `Test Config - ${new Date().toISOString()}`,
      description: 'Test configuration created by automated test'
    });
    
    runner.logTest('Create New Configuration', createResult);
    return createResult.success;
  } else {
    runner.logTest('Get Specific Configuration', configResult);
    return false;
  }
}

/**
 * Step 5: Test Score Calculation
 */
async function testScoreCalculation(runner) {
  console.log('\n🧮 Step 5: Testing Score Calculation');

  // Get a test student
  const studentsResult = await runner.makeRequest('GET', '/students');
  
  if (!studentsResult.success || studentsResult.data.data.length === 0) {
    runner.logTest(
      'Score Calculation Prerequisites',
      { success: false, error: 'No students found' },
      'Ensure you have students in your database'
    );
    return false;
  }

  const testStudent = studentsResult.data.data[0];
  const termId = testStudent.current_term_id;

  console.log(`   Using student: ${testStudent.name} (${testStudent.id})`);
  console.log(`   Using term: ${termId}`);

  // Test enhanced score calculation
  const scoreResult = await runner.makeRequest(
    'POST',
    `/unified-scores/calculate/${testStudent.id}/${termId}`
  );

  if (scoreResult.success) {
    runner.logTest('Enhanced Score Calculation', scoreResult);
    const hps = scoreResult.data.data?.totalHPS;
    const source = scoreResult.data.data?.weightageSource;
    console.log(`   Calculated HPS: ${hps?.toFixed(2)}% using ${source} weightages`);
    return true;
  } else {
    runner.logTest(
      'Enhanced Score Calculation',
      scoreResult,
      'Check if the enhanced score calculation service is properly deployed'
    );
    return false;
  }
}

/**
 * Main Test Runner
 */
async function runAllTests() {
  const runner = new TestRunner();

  try {
    console.log('Starting comprehensive system test...\n');

    // Run all test phases
    const preflightOk = await preflightChecks(runner);
    if (!preflightOk) {
      console.log('\n❌ Pre-flight checks failed. Please fix the issues above before continuing.');
      return;
    }

    const endpointsOk = await testNewEndpoints(runner);
    const databaseOk = await testDatabaseFunctions(runner);
    const configOk = await testConfigurationManagement(runner);
    const scoreOk = await testScoreCalculation(runner);

    // Summary
    console.log('\n' + '=' .repeat(60));
    console.log('🏁 Test Summary');
    console.log('=' .repeat(60));
    console.log(`Total Tests: ${runner.results.total}`);
    console.log(`Passed: ${runner.results.passed} ✅`);
    console.log(`Failed: ${runner.results.failed} ❌`);
    console.log(`Success Rate: ${((runner.results.passed / runner.results.total) * 100).toFixed(1)}%`);

    if (runner.results.failed > 0) {
      console.log('\n🔧 Issues Found and Suggested Fixes:');
      runner.results.errors.forEach((error, index) => {
        console.log(`\n${index + 1}. ${error.test}`);
        console.log(`   Error: ${JSON.stringify(error.error, null, 2)}`);
        if (error.fix) {
          console.log(`   💡 Fix: ${error.fix}`);
        }
      });
    }

    // Overall status
    const allCriticalTestsPassed = endpointsOk && databaseOk;
    
    if (allCriticalTestsPassed) {
      console.log('\n🎉 Core system is working! Ready for next steps.');
      console.log('\n📋 Next Steps:');
      console.log('1. ✅ Database migration completed');
      console.log('2. ✅ Backend APIs are working');
      console.log('3. 🔄 Ready for frontend development');
      console.log('4. 🔄 Ready for user training');
      console.log('5. 🔄 Ready for production deployment');
    } else {
      console.log('\n⚠️ Critical issues found. Please fix them before proceeding.');
    }

  } catch (error) {
    console.error('\n❌ Test suite failed with error:', error.message);
    if (CONFIG.DEBUG) {
      console.error(error.stack);
    }
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = { runAllTests };
