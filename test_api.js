// Simple test script to check if the getAllTasks API is working
const fetch = require('node-fetch');

async function testGetAllTasks() {
  try {
    // First, let's try to login as admin to get a valid token
    const loginResponse = await fetch('http://localhost:3001/api/v1/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      })
    });

    const loginData = await loginResponse.json();
    console.log('Login response:', loginData);

    if (loginData.success && loginData.data.token) {
      // Now test the getAllTasks API
      const tasksResponse = await fetch('http://localhost:3001/api/v1/interventions/admin/tasks', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${loginData.data.token}`,
          'Content-Type': 'application/json',
        }
      });

      const tasksData = await tasksResponse.json();
      console.log('Tasks API response:', JSON.stringify(tasksData, null, 2));
    } else {
      console.log('Login failed');
    }
  } catch (error) {
    console.error('Error testing API:', error);
  }
}

testGetAllTasks();
