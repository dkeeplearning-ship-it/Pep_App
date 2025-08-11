const { supabase } = require('./src/config/supabase');

async function testStudentWorkflow() {
  console.log('🧪 Testing Complete Student Portal Workflow...\n');
  
  try {
    // 1. Test if we can get a student user
    const studentUsersResult = await supabase
      .from('users')
      .select('id, username, role')
      .eq('role', 'student')
      .limit(1);
    
    if (!studentUsersResult.data?.length) {
      console.log('❌ No student users found');
      return;
    }
    
    const studentUser = studentUsersResult.data[0];
    console.log('👤 Found student user:', studentUser.username);
    
    // 2. Test if student has a profile
    const studentProfileResult = await supabase
      .from('students')
      .select('id, name, registration_no')
      .eq('user_id', studentUser.id)
      .limit(1);
    
    if (!studentProfileResult.data?.length) {
      console.log('❌ No student profile found for user');
      return;
    }
    
    const studentProfile = studentProfileResult.data[0];
    console.log('📋 Found student profile:', studentProfile.name, '(' + studentProfile.registration_no + ')');
    
    // 3. Test if student is enrolled in interventions
    const enrollmentsResult = await supabase
      .from('intervention_enrollments')
      .select(`
        intervention_id,
        enrollment_status,
        interventions:intervention_id(id, name, status)
      `)
      .eq('student_id', studentProfile.id)
      .eq('enrollment_status', 'Enrolled');
    
    console.log('🎯 Student enrollments:', enrollmentsResult.data?.length || 0);
    
    if (enrollmentsResult.data?.length > 0) {
      enrollmentsResult.data.forEach((enrollment, i) => {
        console.log(`  ${i+1}. ${enrollment.interventions?.name} (${enrollment.interventions?.status})`);
      });
      
      // 4. Test if there are tasks for the first intervention
      const firstIntervention = enrollmentsResult.data[0].interventions;
      const tasksResult = await supabase
        .from('tasks')
        .select('id, name, status, due_date')
        .eq('intervention_id', firstIntervention.id)
        .limit(3);
      
      console.log(`\n📝 Tasks in ${firstIntervention.name}:`, tasksResult.data?.length || 0);
      
      if (tasksResult.data?.length > 0) {
        tasksResult.data.forEach((task, i) => {
          console.log(`  ${i+1}. ${task.name} (${task.status}) - Due: ${task.due_date}`);
        });
      }
    }
    
    console.log('\n✅ Student workflow test completed');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testStudentWorkflow();
