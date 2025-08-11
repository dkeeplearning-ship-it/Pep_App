const { supabase, query } = require('./src/config/supabase');

async function checkSrikanthFinal() {
  console.log('🔍 Final analysis of Srikanth candidates');
  console.log('=' .repeat(80));

  // The most likely candidate based on previous results
  const candidate = {
    name: 'Srikant qw',
    teacherId: '71e3d945-4236-4d79-87d7-9f3e1979f83b',
    userId: 'b0cde931-c687-42e5-9643-e36a15868f17'
  };

  try {
    console.log(`\nAnalyzing: ${candidate.name}`);
    console.log('=' .repeat(50));
    console.log(`Teacher ID: ${candidate.teacherId}`);
    console.log(`User ID: ${candidate.userId}`);

    // 1. Get teacher details
    const teacherDetails = await query(
      supabase
        .from('teachers')
        .select('*')
        .eq('id', candidate.teacherId)
    );
    console.log('\n1. Teacher Details:');
    if (teacherDetails.rows.length > 0) {
      const teacher = teacherDetails.rows[0];
      console.log(`   Name: ${teacher.name}`);
      console.log(`   Employee ID: ${teacher.employee_id}`);
      console.log(`   Department: ${teacher.department}`);
      console.log(`   Specialization: ${teacher.specialization}`);
      console.log(`   Active: ${teacher.is_active}`);
    }

    // 2. Get user details
    const userDetails = await query(
      supabase
        .from('users')
        .select('*')
        .eq('id', candidate.userId)
    );
    console.log('\n2. User Details:');
    if (userDetails.rows.length > 0) {
      const user = userDetails.rows[0];
      console.log(`   Username: ${user.username}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role}`);
    }

    // 3. Check microcompetency assignments with full details
    const microcompetencyAssignments = await query(
      supabase
        .from('teacher_microcompetency_assignments')
        .select(`
          *,
          interventions:intervention_id(id, name, status, start_date, end_date),
          microcompetencies:microcompetency_id(id, name, description, max_score)
        `)
        .eq('teacher_id', candidate.teacherId)
        .eq('is_active', true)
    );
    console.log(`\n3. Microcompetency Assignments (${microcompetencyAssignments.rows.length}):`);
    microcompetencyAssignments.rows.forEach((assignment, index) => {
      console.log(`   ${index + 1}. Intervention: ${assignment.interventions?.name || 'Unknown'}`);
      console.log(`      Microcompetency: ${assignment.microcompetencies?.name || 'Unknown'}`);
      console.log(`      Status: ${assignment.interventions?.status || 'Unknown'}`);
      console.log(`      Can Score: ${assignment.can_score}`);
      console.log(`      Can Create Tasks: ${assignment.can_create_tasks}`);
      console.log(`      Assigned: ${assignment.assigned_at}`);
    });

    // 4. Check intervention assignments
    const interventionAssignments = await query(
      supabase
        .from('intervention_teachers')
        .select(`
          *,
          interventions:intervention_id(id, name, status, start_date, end_date)
        `)
        .eq('teacher_id', candidate.teacherId)
        .eq('is_active', true)
    );
    console.log(`\n4. Intervention Assignments (${interventionAssignments.rows.length}):`);
    interventionAssignments.rows.forEach((assignment, index) => {
      console.log(`   ${index + 1}. Intervention: ${assignment.interventions?.name || 'Unknown'}`);
      console.log(`      Status: ${assignment.interventions?.status || 'Unknown'}`);
      console.log(`      Role: ${assignment.role || 'Unknown'}`);
      console.log(`      Assigned Quadrants: ${JSON.stringify(assignment.assigned_quadrants)}`);
    });

    // 5. Check student assignments
    const studentAssignments = await query(
      supabase
        .from('teacher_assignments')
        .select(`
          *,
          students:student_id(id, name, registration_no),
          terms:term_id(id, name, is_current)
        `)
        .eq('teacher_id', candidate.teacherId)
        .eq('is_active', true)
    );
    console.log(`\n5. Student Assignments (${studentAssignments.rows.length}):`);
    studentAssignments.rows.forEach((assignment, index) => {
      console.log(`   ${index + 1}. Student: ${assignment.students?.name || 'Unknown'} (${assignment.students?.registration_no || 'Unknown'})`);
      console.log(`      Term: ${assignment.terms?.name || 'Unknown'} (Current: ${assignment.terms?.is_current || false})`);
      console.log(`      Quadrant: ${assignment.quadrant_id || 'Unknown'}`);
    });

    // 6. Check direct assessments (using correct table name)
    const directAssessments = await query(
      supabase
        .from('direct_assessments')
        .select(`
          *,
          students:student_id(name, registration_no),
          microcompetencies:microcompetency_id(name)
        `)
        .eq('assessed_by_teacher_id', candidate.teacherId)
        .order('assessment_date', { ascending: false })
        .limit(10)
    );
    console.log(`\n6. Direct Assessments (${directAssessments.rows.length}):`);
    directAssessments.rows.forEach((assessment, index) => {
      console.log(`   ${index + 1}. Student: ${assessment.students?.name || 'Unknown'}`);
      console.log(`      Microcompetency: ${assessment.microcompetencies?.name || 'Unknown'}`);
      console.log(`      Score: ${assessment.score || 'Unknown'}`);
      console.log(`      Date: ${assessment.assessment_date || 'Unknown'}`);
    });

    // 7. Test the teacher dashboard API call
    console.log('\n7. Testing Teacher Dashboard API...');
    console.log(`   Using User ID: ${candidate.userId}`);
    
    // This simulates what the frontend would call
    console.log('   API would be called with: /api/v1/teachers/' + candidate.userId + '/dashboard');

    // 8. Summary
    console.log('\n📊 SUMMARY:');
    console.log(`   Teacher: ${candidate.name}`);
    console.log(`   Teacher ID: ${candidate.teacherId}`);
    console.log(`   User ID: ${candidate.userId}`);
    console.log(`   Microcompetencies: ${microcompetencyAssignments.rows.length}`);
    console.log(`   Interventions: ${interventionAssignments.rows.length}`);
    console.log(`   Students: ${studentAssignments.rows.length}`);
    console.log(`   Assessments: ${directAssessments.rows.length}`);

    if (microcompetencyAssignments.rows.length > 0) {
      console.log('\n✅ This teacher has microcompetency assignments!');
      console.log('   The issue might be in the frontend API calls or data filtering.');
    } else {
      console.log('\n❌ This teacher has no microcompetency assignments.');
    }

  } catch (error) {
    console.error('❌ Error during analysis:', error);
  }
}

// Run the analysis
checkSrikanthFinal().then(() => {
  console.log('\n🏁 Analysis complete');
  process.exit(0);
}).catch(error => {
  console.error('❌ Analysis failed:', error);
  process.exit(1);
});
