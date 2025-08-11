const { supabase, query } = require('./src/config/supabase');

async function checkAllTeachers() {
  console.log('🔍 Checking all teachers in the database');
  console.log('=' .repeat(80));

  try {
    // 1. Check all users with teacher role
    console.log('\n1. Checking all users with teacher role...');
    const teacherUsers = await query(
      supabase
        .from('users')
        .select('*')
        .eq('role', 'teacher')
        .order('created_at', { ascending: false })
    );
    console.log('Teacher users count:', teacherUsers.rows.length);
    teacherUsers.rows.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.username} (${user.email}) - ID: ${user.id}`);
      console.log(`     Name: ${user.name || 'Not set'}`);
      console.log(`     Active: ${user.is_active}`);
    });

    // 2. Check all teacher records
    console.log('\n2. Checking all teacher records...');
    const teachers = await query(
      supabase
        .from('teachers')
        .select(`
          *,
          users:user_id(id, username, email, name, is_active)
        `)
        .order('created_at', { ascending: false })
    );
    console.log('Teacher records count:', teachers.rows.length);
    teachers.rows.forEach((teacher, index) => {
      console.log(`  ${index + 1}. ${teacher.name} (Employee ID: ${teacher.employee_id})`);
      console.log(`     Teacher ID: ${teacher.id}`);
      console.log(`     User ID: ${teacher.user_id}`);
      console.log(`     Username: ${teacher.users?.username || 'Unknown'}`);
      console.log(`     Email: ${teacher.users?.email || 'Unknown'}`);
      console.log(`     Active: ${teacher.is_active}`);
      console.log(`     Department: ${teacher.department || 'Not set'}`);
      console.log(`     Specialization: ${teacher.specialization || 'Not set'}`);
    });

    // 3. Look for any user/teacher with "Srikanth" in the name
    console.log('\n3. Searching for "Srikanth" in names...');
    const srikanthUsers = await query(
      supabase
        .from('users')
        .select('*')
        .ilike('name', '%srikanth%')
    );
    console.log('Users with "Srikanth" in name:', srikanthUsers.rows.length);
    srikanthUsers.rows.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.name} (${user.username}) - ID: ${user.id}`);
      console.log(`     Role: ${user.role}`);
      console.log(`     Email: ${user.email}`);
    });

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

    // 4. Check if there are any microcompetency assignments
    console.log('\n4. Checking total microcompetency assignments...');
    const totalAssignments = await query(
      supabase
        .from('teacher_microcompetency_assignments')
        .select('count', { count: 'exact' })
    );
    console.log('Total microcompetency assignments:', totalAssignments.totalCount);

    // 5. Check if there are any interventions
    console.log('\n5. Checking interventions...');
    const interventions = await query(
      supabase
        .from('interventions')
        .select('id, name, status, start_date, end_date')
        .order('created_at', { ascending: false })
        .limit(10)
    );
    console.log('Recent interventions count:', interventions.rows.length);
    interventions.rows.forEach((intervention, index) => {
      console.log(`  ${index + 1}. ${intervention.name} (Status: ${intervention.status})`);
      console.log(`     ID: ${intervention.id}`);
      console.log(`     Dates: ${intervention.start_date} to ${intervention.end_date}`);
    });

  } catch (error) {
    console.error('❌ Error during check:', error);
  }
}

// Run the check function
checkAllTeachers().then(() => {
  console.log('\n🏁 Check complete');
  process.exit(0);
}).catch(error => {
  console.error('❌ Check failed:', error);
  process.exit(1);
});
