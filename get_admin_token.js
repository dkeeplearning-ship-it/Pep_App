const { supabase } = require('./backend/src/config/supabase');
const jwt = require('jsonwebtoken');

// Load environment variables
require('dotenv').config({ path: './backend/.env' });
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

async function getAdminToken() {
  try {
    // Get an admin user
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id, username, role')
      .eq('role', 'admin')
      .limit(1);

    if (userError) throw userError;
    if (!users || users.length === 0) {
      console.log('NO_ADMIN_USER_FOUND');
      return;
    }

    const adminUser = users[0];
    console.log('ADMIN_USER_ID=' + adminUser.id);
    console.log('ADMIN_USERNAME=' + adminUser.username);

    // Create a JWT token (this is what the API expects)
    const jwtPayload = {
      userId: adminUser.id,
      username: adminUser.username,
      role: adminUser.role
    };

    const jwtToken = jwt.sign(jwtPayload, JWT_SECRET, { expiresIn: '24h' });
    console.log('JWT_TOKEN_CREATED=' + jwtToken);

  } catch (err) {
    console.log('ERROR:', err.message);
  }
}

getAdminToken();
