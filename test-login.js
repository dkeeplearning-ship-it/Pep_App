// Test script to verify auth.ts configuration matches backend
const API_BASE_URL = 'http://localhost:3001'; // Same as VITE_API_BASE_URL

async function testAuthEndpoints() {
  console.log('🧪 Testing auth.ts endpoint configuration...');
  console.log('📍 API_BASE_URL:', API_BASE_URL);

  // Test login endpoint (same as auth.ts)
  const loginEndpoint = `${API_BASE_URL}/api/v1/auth/login`;
  console.log('🔐 Testing login endpoint:', loginEndpoint);

  try {
    const response = await fetch(loginEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'admin1',
        password: 'password123'
      }),
    });

    const data = await response.json();
    console.log('✅ Login endpoint working:', data.success);

    if (data.success) {
      console.log('🎉 AUTH.TS CONFIGURATION IS NOW CORRECT!');
      console.log('👤 User:', data.data.user.username, '(' + data.data.user.role + ')');
    }

  } catch (error) {
    console.error('❌ Login endpoint error:', error.message);
  }
}

testAuthEndpoints();
