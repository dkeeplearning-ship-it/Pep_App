const { supabase, query } = require('./src/config/supabase');

async function fixTeacherDataPart2() {
  console.log('🔧 Fixing Teacher Data Issues - Part 2');
  console.log('=' .repeat(80));

  // Correct IDs for Srikanth
  const teacherUserId = 'b0cde931-c687-42e5-9643-e36a15868f17';
  const teacherId = '71e3d945-4236-4d79-87d7-9f3e1979f83b';

  try {
    // 1. Add student assignments for the teacher (fixed query)
    console.log('\n1. Adding student assignments for the teacher...');
    
    // Get some students to assign (without is_active filter)
    const studentsResult = await query(
      supabase
        .from('students')
        .select('id, name, registration_no')
        .limit(3)
    );

    console.log(`Found ${studentsResult.rows.length} students to assign`);

    // Get current term for assignments
    const currentTermResult = await query(
      supabase
        .from('terms')
        .select('*')
        .eq('is_current', true)
    );

    if (currentTermResult.rows.length > 0 && studentsResult.rows.length > 0) {
      const currentTerm = currentTermResult.rows[0];
      
      for (let i = 0; i < studentsResult.rows.length; i++) {
        const student = studentsResult.rows[i];
        
        // Check if assignment already exists
        const existingAssignment = await query(
          supabase
            .from('teacher_assignments')
            .select('*')
            .eq('teacher_id', teacherId)
            .eq('student_id', student.id)
            .eq('term_id', currentTerm.id)
        );

        if (existingAssignment.rows.length === 0) {
          // Create new assignment
          const assignmentResult = await query(
            supabase
              .from('teacher_assignments')
              .insert({
                teacher_id: teacherId,
                student_id: student.id,
                term_id: currentTerm.id,
                quadrant_id: `Q${i + 1}`, // Assign different quadrants
                assigned_by: teacherUserId, // Use teacher's user ID as assigner
                is_active: true,
                notes: `Auto-assigned for testing - ${student.name}`
              })
              .select('*')
          );

          if (assignmentResult.rows.length > 0) {
            console.log(`✅ Assigned student: ${student.name} (${student.registration_no}) to quadrant Q${i + 1}`);
          } else {
            console.log(`❌ Failed to assign student: ${student.name}`);
          }
        } else {
          console.log(`⚠️  Student ${student.name} already assigned`);
        }
      }
    }

    // 2. Add more microcompetency assignments
    console.log('\n2. Adding more microcompetency assignments...');
    
    // Get available microcompetencies (without is_active filter)
    const microcompetenciesResult = await query(
      supabase
        .from('microcompetencies')
        .select('id, name')
        .limit(5)
    );

    // Get the Test 1 intervention ID
    const testInterventionResult = await query(
      supabase
        .from('interventions')
        .select('id')
        .eq('name', 'Test 1')
    );

    if (testInterventionResult.rows.length > 0 && microcompetenciesResult.rows.length > 0) {
      const interventionId = testInterventionResult.rows[0].id;
      
      for (const microcompetency of microcompetenciesResult.rows) {
        // Check if assignment already exists
        const existingAssignment = await query(
          supabase
            .from('teacher_microcompetency_assignments')
            .select('*')
            .eq('teacher_id', teacherId)
            .eq('intervention_id', interventionId)
            .eq('microcompetency_id', microcompetency.id)
        );

        if (existingAssignment.rows.length === 0) {
          // Create new assignment
          const assignmentResult = await query(
            supabase
              .from('teacher_microcompetency_assignments')
              .insert({
                intervention_id: interventionId,
                teacher_id: teacherId,
                microcompetency_id: microcompetency.id,
                can_score: true,
                can_create_tasks: true,
                assigned_by: teacherUserId,
                is_active: true
              })
              .select('*')
          );

          if (assignmentResult.rows.length > 0) {
            console.log(`✅ Added microcompetency assignment: ${microcompetency.name}`);
          } else {
            console.log(`❌ Failed to add microcompetency assignment: ${microcompetency.name}`);
          }
        } else {
          console.log(`⚠️  Microcompetency ${microcompetency.name} already assigned`);
        }
      }
    }

    // 3. Verify the fixes
    console.log('\n3. Verifying the fixes...');
    
    // Check microcompetency assignments
    const finalMicrocompetencies = await query(
      supabase
        .from('teacher_microcompetency_assignments')
        .select('count', { count: 'exact' })
        .eq('teacher_id', teacherId)
        .eq('is_active', true)
    );
    console.log(`✅ Total microcompetency assignments: ${finalMicrocompetencies.totalCount}`);

    // Check student assignments
    const finalStudents = await query(
      supabase
        .from('teacher_assignments')
        .select('count', { count: 'exact' })
        .eq('teacher_id', teacherId)
        .eq('is_active', true)
    );
    console.log(`✅ Total student assignments: ${finalStudents.totalCount}`);

    // Check intervention dates
    const finalIntervention = await query(
      supabase
        .from('interventions')
        .select('name, start_date, end_date, status')
        .eq('name', 'Test 1')
    );
    if (finalIntervention.rows.length > 0) {
      const intervention = finalIntervention.rows[0];
      console.log(`✅ Intervention "${intervention.name}": ${intervention.start_date} to ${intervention.end_date} (${intervention.status})`);
    }

    console.log('\n📊 SUMMARY OF FIXES:');
    console.log('=' .repeat(50));
    console.log('✅ Fixed intervention dates to overlap with current term');
    console.log(`✅ Teacher now has ${finalMicrocompetencies.totalCount} microcompetency assignments`);
    console.log(`✅ Teacher now has ${finalStudents.totalCount} student assignments`);
    console.log('✅ Data should now display correctly in teacher dashboard');

    console.log('\n🎯 NEXT STEPS:');
    console.log('1. Test the teacher dashboard with User ID: b0cde931-c687-42e5-9643-e36a15868f17');
    console.log('2. Login with username: q, email: q@e.com');
    console.log('3. Verify that interventions and microcompetencies now show up');

  } catch (error) {
    console.error('❌ Error during data fixing:', error);
  }
}

// Run the fix
fixTeacherDataPart2().then(() => {
  console.log('\n🏁 Fix complete');
  process.exit(0);
}).catch(error => {
  console.error('❌ Fix failed:', error);
  process.exit(1);
});
