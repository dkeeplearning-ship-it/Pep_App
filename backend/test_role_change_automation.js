const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api/v1';
let authToken = '';

// Test configuration
const testConfig = {
  adminCredentials: {
    username: 'admin1',
    password: 'password123'
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
 * Test role change automation
 */
async function testRoleChangeAutomation() {
  console.log('🧪 Testing Role Change Automation System');
  console.log('=' .repeat(50));

  try {
    // Step 1: Login as admin
    console.log('\n1️⃣ Logging in as admin...');
    const loginResult = await apiRequest('POST', '/auth/login', testConfig.adminCredentials);
    
    if (loginResult.success) {
      authToken = loginResult.data.token;
      console.log('✅ Admin login successful');
    } else {
      throw new Error('Admin login failed');
    }

    // Step 2: Get list of users
    console.log('\n2️⃣ Getting user list...');
    const usersResult = await apiRequest('GET', '/admin/user-management/users?limit=5');
    
    if (usersResult.success && usersResult.data.users.length > 0) {
      console.log(`✅ Found ${usersResult.data.users.length} users`);
      
      // Find a user that's not an admin to test role change
      const testUser = usersResult.data.users.find(user => user.role !== 'admin');
      
      if (testUser) {
        console.log(`📋 Test user selected: ${testUser.username} (${testUser.email}) - Current role: ${testUser.role}`);
        
        // Step 3: Test role change from current role to teacher
        const newRole = testUser.role === 'teacher' ? 'student' : 'teacher';
        console.log(`\n3️⃣ Testing role change: ${testUser.role} → ${newRole}`);
        
        const roleChangeResult = await apiRequest('PUT', `/admin/user-management/users/${testUser.id}/role`, {
          newRole: newRole,
          reason: 'Testing automated role change system'
        });
        
        if (roleChangeResult.success) {
          console.log('✅ Role change successful!');
          console.log('📊 Role change details:', JSON.stringify(roleChangeResult.changes, null, 2));
          
          if (roleChangeResult.changes.roleTableChanges) {
            console.log('\n🔧 Role-specific table changes:');
            roleChangeResult.changes.roleTableChanges.changes.forEach(change => {
              console.log(`   ✅ ${change.action}: ${change.details} (${change.table})`);
            });
            
            if (roleChangeResult.changes.roleTableChanges.errors.length > 0) {
              console.log('\n❌ Errors during role table changes:');
              roleChangeResult.changes.roleTableChanges.errors.forEach(error => {
                console.log(`   ❌ ${error.action}: ${error.error}`);
              });
            }
          }
          
          // Step 4: Verify the role change by checking role-specific tables
          console.log(`\n4️⃣ Verifying role-specific table entries...`);
          
          if (newRole === 'student') {
            // Check if student record was created/updated
            const studentCheck = await apiRequest('GET', `/admin/students?user_id=${testUser.id}`);
            if (studentCheck.success && studentCheck.data.students.length > 0) {
              console.log('✅ Student record found in students table');
              console.log('📋 Student details:', JSON.stringify(studentCheck.data.students[0], null, 2));
            } else {
              console.log('❌ Student record not found in students table');
            }
          } else if (newRole === 'teacher') {
            // Check if teacher record was created/updated
            const teacherCheck = await apiRequest('GET', `/admin/teachers?user_id=${testUser.id}`);
            if (teacherCheck.success && teacherCheck.data.teachers.length > 0) {
              console.log('✅ Teacher record found in teachers table');
              console.log('📋 Teacher details:', JSON.stringify(teacherCheck.data.teachers[0], null, 2));
            } else {
              console.log('❌ Teacher record not found in teachers table');
            }
          }
          
          // Step 5: Test changing back to original role
          console.log(`\n5️⃣ Testing role change back: ${newRole} → ${testUser.role}`);
          
          const revertRoleResult = await apiRequest('PUT', `/admin/user-management/users/${testUser.id}/role`, {
            newRole: testUser.role,
            reason: 'Reverting test role change'
          });
          
          if (revertRoleResult.success) {
            console.log('✅ Role revert successful!');
            console.log('📊 Revert details:', JSON.stringify(revertRoleResult.changes, null, 2));
          } else {
            console.log('❌ Role revert failed:', revertRoleResult.message);
          }
          
        } else {
          console.log('❌ Role change failed:', roleChangeResult.message);
        }
        
      } else {
        console.log('❌ No suitable test user found (all users are admins)');
      }
    } else {
      console.log('❌ Failed to get user list');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testRoleChangeAutomation().then(() => {
  console.log('\n🏁 Role change automation test completed');
}).catch(error => {
  console.error('❌ Test execution failed:', error.message);
});
