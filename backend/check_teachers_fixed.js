const { supabase, query } = require('./src/config/supabase');

async function checkTeachersFixed() {
  console.log('🔍 Checking all teachers in the database (Fixed)');
  console.log('=' .repeat(80));

  try {
    // 1. Check all teacher records without join first
    console.log('\n1. Checking all teacher records...');
    const teachers = await query(
      supabase
        .from('teachers')
        .select('*')
        .order('created_at', { ascending: false })
    );
    console.log('Teacher records count:', teachers.rows.length);
    teachers.rows.forEach((teacher, index) => {
      console.log(`  ${index + 1}. ${teacher.name} (Employee ID: ${teacher.employee_id})`);
      console.log(`     Teacher ID: ${teacher.id}`);
      console.log(`     User ID: ${teacher.user_id}`);
      console.log(`     Active: ${teacher.is_active}`);
      console.log(`     Department: ${teacher.department || 'Not set'}`);
      console.log(`     Specialization: ${teacher.specialization || 'Not set'}`);
    });

    // 2. For each teacher, get their user info
    console.log('\n2. Getting user info for each teacher...');
    for (const teacher of teachers.rows) {
      const userInfo = await query(
        supabase
          .from('users')
          .select('*')
          .eq('id', teacher.user_id)
      );
      if (userInfo.rows.length > 0) {
        const user = userInfo.rows[0];
        console.log(`  Teacher: ${teacher.name} -> User: ${user.username} (${user.email})`);
      } else {
        console.log(`  Teacher: ${teacher.name} -> User: NOT FOUND`);
      }
    }

    // 3. Look for any teacher with "Srikanth" in the name
    console.log('\n3. Searching for "Srikanth" in teacher names...');
    const srikanthTeachers = await query(
      supabase
        .from('teachers')
        .select('*')
        .ilike('name', '%srikanth%')
    );
    console.log('Teachers with "Srikanth" in name:', srikanthTeachers.rows.length);
    srikanthTeachers.rows.forEach((teacher, index) => {
      console.log(`  ${index + 1}. ${teacher.name} - Teacher ID: ${teacher.id}, User ID: ${teacher.user_id}`);
    });

    // 4. Look for any user with "Srikanth" in the name or username
    console.log('\n4. Searching for "Srikanth" in user names/usernames...');
    const srikanthUsers = await query(
      supabase
        .from('users')
        .select('*')
        .or('username.ilike.%srikanth%,email.ilike.%srikanth%')
    );
    console.log('Users with "Srikanth" in username/email:', srikanthUsers.rows.length);
    srikanthUsers.rows.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.username} (${user.email}) - ID: ${user.id}`);
      console.log(`     Role: ${user.role}`);
    });

    // 5. Check if the specific ID exists in any table
    console.log('\n5. Checking if ID 51bf9fe3-570e-41f4-bc5d-01b9c28d1726 exists anywhere...');
    const specificUser = await query(
      supabase
        .from('users')
        .select('*')
        .eq('id', '51bf9fe3-570e-41f4-bc5d-01b9c28d1726')
    );
    console.log('User with specific ID:', specificUser.rows.length > 0 ? specificUser.rows[0] : 'NOT FOUND');

    // 6. Check sample data to understand the current state
    console.log('\n6. Sample of current data...');
    const sampleUsers = await query(
      supabase
        .from('users')
        .select('*')
        .eq('role', 'teacher')
        .limit(3)
    );
    console.log('Sample teacher users:');
    sampleUsers.rows.forEach((user, index) => {
      console.log(`  ${index + 1}. Username: ${user.username}, Email: ${user.email}, ID: ${user.id}`);
    });

  } catch (error) {
    console.error('❌ Error during check:', error);
  }
}

// Run the check function
checkTeachersFixed().then(() => {
  console.log('\n🏁 Check complete');
  process.exit(0);
}).catch(error => {
  console.error('❌ Check failed:', error);
  process.exit(1);
});
