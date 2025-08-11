const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3001/api/v1';
const ADMIN_CREDENTIALS = {
  email: 'admin@pepscores.com',
  password: 'admin123'
};

let authToken = '';
let testData = {
  interventionId: '',
  studentId: '',
  teacherId: '',
  microcompetencyId: ''
};

// Helper function to make authenticated requests
const apiRequest = async (method, endpoint, data = null) => {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error(`❌ API Error [${method} ${endpoint}]:`, error.response?.data || error.message);
    throw error;
  }
};

// Test functions
const testLogin = async () => {
  console.log('\n🔐 Testing Admin Login...');
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, ADMIN_CREDENTIALS);
    authToken = response.data.token;
    console.log('✅ Login successful');
    return true;
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data || error.message);
    return false;
  }
};

const testMicrocompetencyAPIs = async () => {
  console.log('\n🧩 Testing Microcompetency APIs...');
  
  try {
    // Get microcompetencies by quadrant
    console.log('📋 Getting microcompetencies by quadrant...');
    const quadrantMicros = await apiRequest('GET', '/microcompetencies/quadrant/persona');
    console.log(`✅ Found ${quadrantMicros.data.length} components with microcompetencies`);
    
    if (quadrantMicros.data.length > 0 && quadrantMicros.data[0].microcompetencies.length > 0) {
      testData.microcompetencyId = quadrantMicros.data[0].microcompetencies[0].id;
      console.log(`📝 Using microcompetency ID: ${testData.microcompetencyId}`);
    }
    
    // Get microcompetency by ID
    if (testData.microcompetencyId) {
      console.log('🔍 Getting microcompetency details...');
      const microDetails = await apiRequest('GET', `/microcompetencies/${testData.microcompetencyId}`);
      console.log(`✅ Microcompetency details: ${microDetails.data.name}`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Microcompetency API tests failed');
    return false;
  }
};

const testInterventionAPIs = async () => {
  console.log('\n🎯 Testing Intervention APIs...');
  
  try {
    // Get all interventions
    console.log('📋 Getting all interventions...');
    const interventions = await apiRequest('GET', '/interventions');
    console.log(`✅ Found ${interventions.data.interventions.length} interventions`);
    
    if (interventions.data.interventions.length > 0) {
      testData.interventionId = interventions.data.interventions[0].id;
      console.log(`📝 Using intervention ID: ${testData.interventionId}`);
      
      // Get intervention details
      console.log('🔍 Getting intervention details...');
      const interventionDetails = await apiRequest('GET', `/interventions/${testData.interventionId}`);
      console.log(`✅ Intervention details: ${interventionDetails.data.name}`);
      
      // Test microcompetencies for intervention
      if (testData.microcompetencyId) {
        console.log('🔗 Getting microcompetencies for intervention...');
        const interventionMicros = await apiRequest('GET', `/microcompetencies/intervention/${testData.interventionId}`);
        console.log(`✅ Found ${interventionMicros.data.length} quadrants with microcompetencies`);
      }
    }
    
    return true;
  } catch (error) {
    console.error('❌ Intervention API tests failed');
    return false;
  }
};

const testAdminAPIs = async () => {
  console.log('\n👨‍💼 Testing Admin APIs...');
  
  try {
    // Test intervention dashboard
    console.log('📊 Getting intervention dashboard...');
    const dashboard = await apiRequest('GET', '/admin/intervention-dashboard');
    console.log(`✅ Dashboard stats: ${dashboard.data.statistics.total_interventions} total interventions`);
    
    // Test admin interventions list
    console.log('📋 Getting admin interventions list...');
    const adminInterventions = await apiRequest('GET', '/admin/interventions');
    console.log(`✅ Admin interventions: ${adminInterventions.data.interventions.length} found`);
    
    // Test admin intervention details
    if (testData.interventionId) {
      console.log('🔍 Getting admin intervention details...');
      const adminDetails = await apiRequest('GET', `/admin/interventions/${testData.interventionId}`);
      console.log(`✅ Admin intervention details: ${adminDetails.data.intervention.name}`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Admin API tests failed');
    return false;
  }
};

const testTeacherAPIs = async () => {
  console.log('\n👩‍🏫 Testing Teacher APIs...');
  
  try {
    // Get teachers first
    console.log('👥 Getting teachers...');
    const teachers = await apiRequest('GET', '/admin/teachers');
    
    if (teachers.data.teachers.length > 0) {
      testData.teacherId = teachers.data.teachers[0].id;
      console.log(`📝 Using teacher ID: ${testData.teacherId}`);
      
      // Test teacher interventions
      console.log('📋 Getting teacher interventions...');
      const teacherInterventions = await apiRequest('GET', `/teacher-microcompetencies/${testData.teacherId}/interventions`);
      console.log(`✅ Teacher interventions: ${teacherInterventions.data.interventions.length} found`);
      
      // Test teacher microcompetencies for intervention
      if (testData.interventionId) {
        console.log('🧩 Getting teacher microcompetencies...');
        const teacherMicros = await apiRequest('GET', `/teacher-microcompetencies/${testData.teacherId}/interventions/${testData.interventionId}/microcompetencies`);
        console.log(`✅ Teacher microcompetencies: ${teacherMicros.data.microcompetencies.length} quadrants`);
        
        // Test students for scoring
        console.log('👨‍🎓 Getting students for scoring...');
        const studentsForScoring = await apiRequest('GET', `/teacher-microcompetencies/${testData.teacherId}/interventions/${testData.interventionId}/students`);
        console.log(`✅ Students for scoring: ${studentsForScoring.data.students.length} found`);
        
        if (studentsForScoring.data.students.length > 0) {
          testData.studentId = studentsForScoring.data.students[0].student.id;
          console.log(`📝 Using student ID: ${testData.studentId}`);
        }
      }
    }
    
    return true;
  } catch (error) {
    console.error('❌ Teacher API tests failed');
    return false;
  }
};

const testStudentAPIs = async () => {
  console.log('\n👨‍🎓 Testing Student APIs...');
  
  try {
    if (!testData.studentId) {
      console.log('⚠️ No student ID available, skipping student API tests');
      return true;
    }
    
    // Test student intervention scores
    console.log('📊 Getting student intervention scores...');
    const studentScores = await apiRequest('GET', `/student-interventions/${testData.studentId}/scores`);
    console.log(`✅ Student intervention scores: ${studentScores.data.interventions.length} interventions`);
    
    // Test intervention score breakdown
    if (testData.interventionId) {
      console.log('🔍 Getting intervention score breakdown...');
      const scoreBreakdown = await apiRequest('GET', `/student-interventions/${testData.studentId}/interventions/${testData.interventionId}/breakdown`);
      console.log(`✅ Score breakdown: ${scoreBreakdown.data.breakdown.length} quadrants`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Student API tests failed');
    return false;
  }
};

const testScoreCalculationAPIs = async () => {
  console.log('\n🧮 Testing Score Calculation APIs...');
  
  try {
    if (!testData.studentId || !testData.interventionId) {
      console.log('⚠️ Missing student or intervention ID, skipping score calculation tests');
      return true;
    }
    
    // Test competency score calculation
    console.log('📊 Calculating competency scores...');
    const competencyScores = await apiRequest('GET', `/score-calculation/students/${testData.studentId}/interventions/${testData.interventionId}/competencies`);
    console.log(`✅ Competency scores: ${competencyScores.data.competencies.length} competencies`);
    
    // Test quadrant score calculation
    console.log('📊 Calculating quadrant scores...');
    const quadrantScores = await apiRequest('GET', `/score-calculation/students/${testData.studentId}/interventions/${testData.interventionId}/quadrants`);
    console.log(`✅ Quadrant scores: ${quadrantScores.data.quadrants.length} quadrants`);
    
    // Test overall intervention score
    console.log('📊 Calculating overall intervention score...');
    const overallScore = await apiRequest('GET', `/score-calculation/students/${testData.studentId}/interventions/${testData.interventionId}/overall`);
    console.log(`✅ Overall score: ${overallScore.data.overall_score.percentage.toFixed(2)}%`);
    
    // Test intervention statistics
    console.log('📈 Getting intervention statistics...');
    const stats = await apiRequest('GET', `/score-calculation/interventions/${testData.interventionId}/statistics`);
    console.log(`✅ Intervention stats: ${stats.data.total_students} students, ${stats.data.average_percentage.toFixed(2)}% average`);
    
    return true;
  } catch (error) {
    console.error('❌ Score calculation API tests failed');
    return false;
  }
};

// Main test runner
const runAllTests = async () => {
  console.log('🚀 Starting Intervention-Centric API Tests...');
  console.log('=' .repeat(50));
  
  const tests = [
    { name: 'Login', fn: testLogin },
    { name: 'Microcompetency APIs', fn: testMicrocompetencyAPIs },
    { name: 'Intervention APIs', fn: testInterventionAPIs },
    { name: 'Admin APIs', fn: testAdminAPIs },
    { name: 'Teacher APIs', fn: testTeacherAPIs },
    { name: 'Student APIs', fn: testStudentAPIs },
    { name: 'Score Calculation APIs', fn: testScoreCalculationAPIs }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      const result = await test.fn();
      if (result) {
        passed++;
        console.log(`✅ ${test.name} - PASSED`);
      } else {
        failed++;
        console.log(`❌ ${test.name} - FAILED`);
      }
    } catch (error) {
      failed++;
      console.log(`❌ ${test.name} - FAILED`);
    }
  }
  
  console.log('\n' + '=' .repeat(50));
  console.log('🏁 Test Results:');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed! The intervention-centric system is working correctly.');
  } else {
    console.log('\n⚠️ Some tests failed. Please check the error messages above.');
  }
  
  console.log('\n📋 Test Data Used:');
  console.log(`- Intervention ID: ${testData.interventionId || 'N/A'}`);
  console.log(`- Student ID: ${testData.studentId || 'N/A'}`);
  console.log(`- Teacher ID: ${testData.teacherId || 'N/A'}`);
  console.log(`- Microcompetency ID: ${testData.microcompetencyId || 'N/A'}`);
};

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = { runAllTests };
