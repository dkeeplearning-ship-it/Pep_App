const bcrypt = require('bcrypt');
const { supabase, query } = require('./src/config/supabase');

async function checkAndFixStudentPassword() {
  try {
    console.log('🔐 Checking password for sripathi@e.com...');
    
    // Get user with password hash
    const userResult = await query(
      supabase
        .from('users')
        .select('id, username, email, password_hash')
        .eq('email', 'sripathi@e.com')
        .limit(1)
    );
    
    if (userResult.rows.length > 0) {
      const user = userResult.rows[0];
      console.log('👤 User found:', user.username);
      
      // Test the provided password
      const testPassword = 'Sri*1234';
      const isValid = await bcrypt.compare(testPassword, user.password_hash);
      
      console.log(`🔑 Password 'Sri*1234' is: ${isValid ? '✅ CORRECT' : '❌ INCORRECT'}`);
      
      if (!isValid) {
        console.log('\n🔧 Setting correct password...');
        const newPasswordHash = await bcrypt.hash('Sri*1234', 10);
        
        await query(
          supabase
            .from('users')
            .update({ password_hash: newPasswordHash })
            .eq('id', user.id)
        );
        
        console.log('✅ Password updated to: Sri*1234');
      }
    } else {
      console.log('❌ User not found');
    }
    
  } catch (err) {
    console.log('ERROR:', err.message);
  }
}

checkAndFixStudentPassword();
