const { supabase, query } = require('./src/config/supabase');

async function debugTeacherSrikanth() {
  console.log('🔍 Debugging Teacher Srikanth (ID: 51bf9fe3-570e-41f4-bc5d-01b9c28d1726)');
  console.log('=' .repeat(80));

  try {
    // 1. Check if teacher exists in users table
    console.log('\n1. Checking user record...');
    const userResult = await query(
      supabase
        .from('users')
        .select('*')
        .eq('id', '51bf9fe3-570e-41f4-bc5d-01b9c28d1726')
    );
    console.log('User record:', userResult.rows[0] || 'NOT FOUND');

    // 2. Check if teacher exists in teachers table
    console.log('\n2. Checking teacher record...');
    const teacherResult = await query(
      supabase
        .from('teachers')
        .select('*')
        .eq('user_id', '51bf9fe3-570e-41f4-bc5d-01b9c28d1726')
    );
    console.log('Teacher record:', teacherResult.rows[0] || 'NOT FOUND');

    if (teacherResult.rows.length === 0) {
      console.log('❌ Teacher record not found! This is the main issue.');
      return;
    }

    const teacher = teacherResult.rows[0];
    console.log('✅ Teacher found:', teacher.name, '(ID:', teacher.id, ')');

    // 3. Check teacher microcompetency assignments
    console.log('\n3. Checking teacher microcompetency assignments...');
    const microcompetencyAssignments = await query(
      supabase
        .from('teacher_microcompetency_assignments')
        .select(`
          *,
          interventions:intervention_id(id, name, status, start_date, end_date),
          microcompetencies:microcompetency_id(id, name, description)
        `)
        .eq('teacher_id', teacher.id)
        .eq('is_active', true)
    );
    console.log('Microcompetency assignments count:', microcompetencyAssignments.rows.length);
    microcompetencyAssignments.rows.forEach((assignment, index) => {
      console.log(`  ${index + 1}. Intervention: ${assignment.interventions?.name || 'Unknown'}`);
      console.log(`     Microcompetency: ${assignment.microcompetencies?.name || 'Unknown'}`);
      console.log(`     Status: ${assignment.interventions?.status || 'Unknown'}`);
    });

    // 4. Check intervention assignments
    console.log('\n4. Checking intervention assignments...');
    const interventionAssignments = await query(
      supabase
        .from('intervention_teachers')
        .select(`
          *,
          interventions:intervention_id(id, name, status, start_date, end_date)
        `)
        .eq('teacher_id', teacher.id)
        .eq('is_active', true)
    );
    console.log('Intervention assignments count:', interventionAssignments.rows.length);
    interventionAssignments.rows.forEach((assignment, index) => {
      console.log(`  ${index + 1}. Intervention: ${assignment.interventions?.name || 'Unknown'}`);
      console.log(`     Status: ${assignment.interventions?.status || 'Unknown'}`);
      console.log(`     Role: ${assignment.role || 'Unknown'}`);
    });

    // 5. Check student assignments
    console.log('\n5. Checking student assignments...');
    const studentAssignments = await query(
      supabase
        .from('teacher_assignments')
        .select(`
          *,
          students:student_id(id, name, registration_no),
          terms:term_id(id, name, is_current)
        `)
        .eq('teacher_id', teacher.id)
        .eq('is_active', true)
    );
    console.log('Student assignments count:', studentAssignments.rows.length);
    studentAssignments.rows.forEach((assignment, index) => {
      console.log(`  ${index + 1}. Student: ${assignment.students?.name || 'Unknown'} (${assignment.students?.registration_no || 'Unknown'})`);
      console.log(`     Term: ${assignment.terms?.name || 'Unknown'} (Current: ${assignment.terms?.is_current || false})`);
      console.log(`     Quadrant: ${assignment.quadrant_id || 'Unknown'}`);
    });

    // 6. Check current term
    console.log('\n6. Checking current term...');
    const currentTerm = await query(
      supabase
        .from('terms')
        .select('*')
        .eq('is_current', true)
    );
    console.log('Current term:', currentTerm.rows[0] || 'NOT FOUND');

    // 7. Check all terms
    console.log('\n7. Checking all terms...');
    const allTerms = await query(
      supabase
        .from('terms')
        .select('*')
        .order('created_at', { ascending: false })
    );
    console.log('All terms count:', allTerms.rows.length);
    allTerms.rows.forEach((term, index) => {
      console.log(`  ${index + 1}. ${term.name} (Current: ${term.is_current}, Active: ${term.is_active})`);
    });

    // 8. Check recent assessments
    console.log('\n8. Checking recent assessments...');
    const recentAssessments = await query(
      supabase
        .from('assessments')
        .select(`
          *,
          students:student_id(name, registration_no),
          microcompetencies:microcompetency_id(name)
        `)
        .eq('assessed_by_teacher_id', teacher.id)
        .order('assessment_date', { ascending: false })
        .limit(10)
    );
    console.log('Recent assessments count:', recentAssessments.rows.length);
    recentAssessments.rows.forEach((assessment, index) => {
      console.log(`  ${index + 1}. Student: ${assessment.students?.name || 'Unknown'}`);
      console.log(`     Microcompetency: ${assessment.microcompetencies?.name || 'Unknown'}`);
      console.log(`     Score: ${assessment.score || 'Unknown'}`);
      console.log(`     Date: ${assessment.assessment_date || 'Unknown'}`);
    });

  } catch (error) {
    console.error('❌ Error during debugging:', error);
  }
}

// Run the debug function
debugTeacherSrikanth().then(() => {
  console.log('\n🏁 Debug complete');
  process.exit(0);
}).catch(error => {
  console.error('❌ Debug failed:', error);
  process.exit(1);
});
