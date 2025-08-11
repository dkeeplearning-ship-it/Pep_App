#!/usr/bin/env node

const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api/v1';

// Test credentials
const ADMIN_CREDENTIALS = { username: 'admin', password: 'admin123' };
const TEACHER_CREDENTIALS = { username: 'sri@e.com', password: '12345678' };
const STUDENT_CREDENTIALS = { username: 'test.student', password: 'password123' };

let adminToken = '';
let teacherToken = '';
let studentToken = '';
let teacherId = '';
let studentId = '';

// Helper function to make API calls
async function apiCall(method, endpoint, data = null, token = null) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` })
      },
      ...(data && { data })
    };

    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status || 500
    };
  }
}

// Test functions
async function testAdminLogin() {
  console.log('\n🔐 Testing Admin Authentication...');
  const result = await apiCall('POST', '/auth/login', ADMIN_CREDENTIALS);
  
  if (result.success && result.data.data.token) {
    adminToken = result.data.data.token;
    console.log('✅ Admin login successful');
    console.log(`   User: ${result.data.data.user.username} (${result.data.data.user.role})`);
    return true;
  } else {
    console.log('❌ Admin login failed:', result.error);
    return false;
  }
}

async function testTeacherLogin() {
  console.log('\n👩‍🏫 Testing Teacher Authentication...');
  const result = await apiCall('POST', '/auth/login', TEACHER_CREDENTIALS);
  
  if (result.success && result.data.data.token) {
    teacherToken = result.data.data.token;
    teacherId = result.data.data.user.id;
    console.log('✅ Teacher login successful');
    console.log(`   Teacher: ${result.data.data.profile.name} (${result.data.data.profile.specialization})`);
    console.log(`   Teacher ID: ${teacherId}`);
    return true;
  } else {
    console.log('❌ Teacher login failed:', result.error);
    return false;
  }
}

async function testStudentLogin() {
  console.log('\n👨‍🎓 Testing Student Authentication...');
  const result = await apiCall('POST', '/auth/login', STUDENT_CREDENTIALS);
  
  if (result.success && result.data.data.token) {
    studentToken = result.data.data.token;
    studentId = result.data.data.user.id;
    console.log('✅ Student login successful');
    console.log(`   Student: ${result.data.data.profile.name}`);
    console.log(`   Student ID: ${studentId}`);
    return true;
  } else {
    console.log('❌ Student login failed:', result.error);
    return false;
  }
}

async function testAdminAPIs() {
  console.log('\n📊 Testing Admin APIs...');
  
  // Test admin dashboard
  const dashboard = await apiCall('GET', '/admin/dashboard', null, adminToken);
  if (dashboard.success) {
    console.log('✅ Admin dashboard working');
    console.log(`   Total Students: ${dashboard.data.data.totalStudents}`);
    console.log(`   Total Teachers: ${dashboard.data.data.totalTeachers}`);
    console.log(`   Active Interventions: ${dashboard.data.data.activeInterventions}`);
  } else {
    console.log('❌ Admin dashboard failed:', dashboard.error);
  }

  // Test students list
  const students = await apiCall('GET', '/students?limit=5', null, adminToken);
  if (students.success) {
    console.log('✅ Students list working');
    console.log(`   Found ${students.data.data.length} students`);
    if (students.data.data.length > 0) {
      console.log(`   Sample: ${students.data.data[0].name} (HPS: ${students.data.data[0].overall_score})`);
    }
  } else {
    console.log('❌ Students list failed:', students.error);
  }

  // Test interventions list
  const interventions = await apiCall('GET', '/interventions', null, adminToken);
  if (interventions.success) {
    console.log('✅ Interventions list working');
    console.log(`   Found ${interventions.data.data.length} interventions`);
  } else {
    console.log('❌ Interventions list failed:', interventions.error);
  }
}

async function testTeacherAPIs() {
  console.log('\n🎯 Testing Teacher APIs...');
  
  // Test teacher's assigned interventions
  const interventions = await apiCall('GET', `/teacher-microcompetencies/${teacherId}/interventions`, null, teacherToken);
  if (interventions.success) {
    console.log('✅ Teacher interventions working');
    console.log(`   Assigned to ${interventions.data.data.length} interventions`);
    
    if (interventions.data.data.length > 0) {
      const intervention = interventions.data.data[0];
      console.log(`   Sample: ${intervention.intervention_name}`);
      
      // Test microcompetencies for this intervention
      const microcompetencies = await apiCall('GET', 
        `/teacher-microcompetencies/${teacherId}/interventions/${intervention.intervention_id}/microcompetencies`, 
        null, teacherToken);
      
      if (microcompetencies.success) {
        console.log('✅ Teacher microcompetencies working');
        console.log(`   Assigned to ${microcompetencies.data.data.length} microcompetencies`);
      } else {
        console.log('❌ Teacher microcompetencies failed:', microcompetencies.error);
      }
      
      // Test students for scoring
      const students = await apiCall('GET', 
        `/teacher-microcompetencies/${teacherId}/interventions/${intervention.intervention_id}/students`, 
        null, teacherToken);
      
      if (students.success) {
        console.log('✅ Teacher students list working');
        console.log(`   Can score ${students.data.data.length} students`);
      } else {
        console.log('❌ Teacher students list failed:', students.error);
      }
    }
  } else {
    console.log('❌ Teacher interventions failed:', interventions.error);
  }
}

async function testStudentAPIs() {
  console.log('\n📚 Testing Student APIs...');
  
  // Test student profile
  const profile = await apiCall('GET', '/students/me', null, studentToken);
  if (profile.success) {
    console.log('✅ Student profile working');
    console.log(`   Student: ${profile.data.data.name}`);
    console.log(`   HPS Score: ${profile.data.data.overall_score}`);
  } else {
    console.log('❌ Student profile failed:', profile.error);
  }

  // Test student interventions
  const interventions = await apiCall('GET', `/students/${studentId}/interventions`, null, studentToken);
  if (interventions.success) {
    console.log('✅ Student interventions working');
    console.log(`   Enrolled in ${interventions.data.data.length} interventions`);
  } else {
    console.log('❌ Student interventions failed:', interventions.error);
  }

  // Test student scores
  const scores = await apiCall('GET', `/student-interventions/${studentId}/scores`, null, studentToken);
  if (scores.success) {
    console.log('✅ Student scores working');
    console.log(`   HPS: ${scores.data.data.overallHPS}`);
    console.log(`   Interventions with scores: ${scores.data.data.interventions.length}`);
  } else {
    console.log('❌ Student scores failed:', scores.error);
  }
}

async function testScoringWorkflow() {
  console.log('\n🧮 Testing Scoring Workflow...');
  
  // Get teacher's interventions and students
  const interventions = await apiCall('GET', `/teacher-microcompetencies/${teacherId}/interventions`, null, teacherToken);
  
  if (interventions.success && interventions.data.data.length > 0) {
    const intervention = interventions.data.data[0];
    
    // Get microcompetencies
    const microcompetencies = await apiCall('GET', 
      `/teacher-microcompetencies/${teacherId}/interventions/${intervention.intervention_id}/microcompetencies`, 
      null, teacherToken);
    
    // Get students
    const students = await apiCall('GET', 
      `/teacher-microcompetencies/${teacherId}/interventions/${intervention.intervention_id}/students`, 
      null, teacherToken);
    
    if (microcompetencies.success && students.success && 
        microcompetencies.data.data.length > 0 && students.data.data.length > 0) {
      
      const microcompetency = microcompetencies.data.data[0];
      const student = students.data.data[0];
      
      // Test scoring a student
      const scoreData = {
        obtained_score: 8.5,
        feedback: 'Excellent performance in this assessment area'
      };
      
      const scoreResult = await apiCall('POST', 
        `/teacher-microcompetencies/${teacherId}/interventions/${intervention.intervention_id}/students/${student.student_id}/microcompetencies/${microcompetency.microcompetency_id}/score`,
        scoreData, teacherToken);
      
      if (scoreResult.success) {
        console.log('✅ Scoring workflow working');
        console.log(`   Scored ${student.student_name} on ${microcompetency.microcompetency_name}`);
        console.log(`   Score: ${scoreData.obtained_score}/${microcompetency.max_score}`);
      } else {
        console.log('❌ Scoring workflow failed:', scoreResult.error);
      }
    } else {
      console.log('⚠️ No microcompetencies or students available for scoring test');
    }
  } else {
    console.log('⚠️ No teacher interventions available for scoring test');
  }
}

async function testTaskWorkflow() {
  console.log('\n📝 Testing Task Workflow...');
  
  // Get teacher's interventions
  const interventions = await apiCall('GET', `/teacher-microcompetencies/${teacherId}/interventions`, null, teacherToken);
  
  if (interventions.success && interventions.data.data.length > 0) {
    const intervention = interventions.data.data[0];
    
    // Get microcompetencies for task creation
    const microcompetencies = await apiCall('GET', 
      `/teacher-microcompetencies/${teacherId}/interventions/${intervention.intervention_id}/microcompetencies`, 
      null, teacherToken);
    
    if (microcompetencies.success && microcompetencies.data.data.length > 0) {
      const taskData = {
        name: 'Comprehensive Assessment Task',
        description: 'Testing task creation and submission workflow',
        microcompetencies: [
          {
            microcompetencyId: microcompetencies.data.data[0].microcompetency_id,
            weightage: 100
          }
        ],
        maxScore: 10,
        dueDate: '2025-07-20',
        instructions: 'Complete this assessment to demonstrate your skills',
        submissionType: 'text',
        allowLateSubmission: true
      };
      
      // Create task
      const taskResult = await apiCall('POST', 
        `/interventions/${intervention.intervention_id}/tasks`,
        taskData, teacherToken);
      
      if (taskResult.success) {
        console.log('✅ Task creation working');
        console.log(`   Created task: ${taskData.name}`);
        console.log(`   Task ID: ${taskResult.data.data.id}`);
      } else {
        console.log('❌ Task creation failed:', taskResult.error);
      }
    } else {
      console.log('⚠️ No microcompetencies available for task creation');
    }
  } else {
    console.log('⚠️ No teacher interventions available for task creation');
  }
}

// Main test runner
async function runComprehensiveTests() {
  console.log('🚀 Starting Comprehensive PEP Score Nexus API Testing...\n');
  
  const startTime = Date.now();
  let passedTests = 0;
  let totalTests = 0;
  
  // Authentication Tests
  totalTests++;
  if (await testAdminLogin()) passedTests++;
  
  totalTests++;
  if (await testTeacherLogin()) passedTests++;
  
  totalTests++;
  if (await testStudentLogin()) passedTests++;
  
  // API Tests
  if (adminToken) {
    totalTests++;
    try {
      await testAdminAPIs();
      passedTests++;
    } catch (error) {
      console.log('❌ Admin APIs test failed:', error.message);
    }
  }
  
  if (teacherToken) {
    totalTests++;
    try {
      await testTeacherAPIs();
      passedTests++;
    } catch (error) {
      console.log('❌ Teacher APIs test failed:', error.message);
    }
  }
  
  if (studentToken) {
    totalTests++;
    try {
      await testStudentAPIs();
      passedTests++;
    } catch (error) {
      console.log('❌ Student APIs test failed:', error.message);
    }
  }
  
  // Workflow Tests
  if (teacherToken) {
    totalTests++;
    try {
      await testScoringWorkflow();
      passedTests++;
    } catch (error) {
      console.log('❌ Scoring workflow test failed:', error.message);
    }
    
    totalTests++;
    try {
      await testTaskWorkflow();
      passedTests++;
    } catch (error) {
      console.log('❌ Task workflow test failed:', error.message);
    }
  }
  
  // Summary
  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000;
  const successRate = ((passedTests / totalTests) * 100).toFixed(1);
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 COMPREHENSIVE TEST RESULTS');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${passedTests}/${totalTests} tests (${successRate}%)`);
  console.log(`⏱️  Duration: ${duration}s`);
  console.log(`🎯 Overall Status: ${successRate >= 80 ? 'EXCELLENT' : successRate >= 60 ? 'GOOD' : 'NEEDS IMPROVEMENT'}`);
  
  if (successRate >= 90) {
    console.log('🚀 System is PRODUCTION READY!');
  } else if (successRate >= 70) {
    console.log('⚠️  System is mostly functional with minor issues');
  } else {
    console.log('❌ System needs significant improvements');
  }
  
  console.log('='.repeat(60));
}

// Run the tests
runComprehensiveTests().catch(console.error);
