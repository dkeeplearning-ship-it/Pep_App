const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://hxxjdvecnhvqkgkscnmv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4eGpkdmVjbmh2cWtna3Njbm12Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ5NjE1NzQsImV4cCI6MjA1MDUzNzU3NH0.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUsers() {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .limit(5);
    
    if (error) {
      console.error('Error:', error);
      return;
    }
    
    console.log('Users found:', data);
    
    // Check for admin users
    const adminUsers = data.filter(user => user.role === 'admin');
    console.log('Admin users:', adminUsers);
    
  } catch (err) {
    console.error('Exception:', err);
  }
}

checkUsers();
