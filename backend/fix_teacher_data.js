const { supabase, query } = require('./src/config/supabase');

async function fixTeacherData() {
  console.log('🔧 Fixing Teacher Data Issues');
  console.log('=' .repeat(80));

  // Correct IDs for Srikanth
  const teacherUserId = 'b0cde931-c687-42e5-9643-e36a15868f17';
  const teacherId = '71e3d945-4236-4d79-87d7-9f3e1979f83b';

  try {
    // 1. Fix the intervention term assignment
    console.log('\n1. Fixing intervention term assignment...');
    
    // Get the "Test 1" intervention
    const interventionResult = await query(
      supabase
        .from('interventions')
        .select('*')
        .eq('name', 'Test 1')
    );

    if (interventionResult.rows.length > 0) {
      const intervention = interventionResult.rows[0];
      console.log(`Found intervention: ${intervention.name}`);
      console.log(`Current dates: ${intervention.start_date} to ${intervention.end_date}`);
      console.log(`Current term_id: ${intervention.term_id}`);

      // Get current term
      const currentTermResult = await query(
        supabase
          .from('terms')
          .select('*')
          .eq('is_current', true)
      );

      if (currentTermResult.rows.length > 0) {
        const currentTerm = currentTermResult.rows[0];
        console.log(`Current term: ${currentTerm.name} (${currentTerm.start_date} to ${currentTerm.end_date})`);

        // Option 1: Update intervention dates to overlap with current term
        const newStartDate = '2025-10-15'; // Within current term
        const newEndDate = '2025-11-15';   // Within current term

        console.log(`\nUpdating intervention dates to: ${newStartDate} to ${newEndDate}`);
        
        const updateResult = await query(
          supabase
            .from('interventions')
            .update({
              start_date: newStartDate,
              end_date: newEndDate,
              term_id: currentTerm.id
            })
            .eq('id', intervention.id)
            .select('*')
        );

        if (updateResult.rows.length > 0) {
          console.log('✅ Intervention dates updated successfully');
        } else {
          console.log('❌ Failed to update intervention dates');
        }
      }
    }

    // 2. Add some student assignments for the teacher
    console.log('\n2. Adding student assignments for the teacher...');
    
    // Get some students to assign
    const studentsResult = await query(
      supabase
        .from('students')
        .select('id, name, registration_no')
        .eq('is_active', true)
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

    // 3. Add more microcompetency assignments
    console.log('\n3. Adding more microcompetency assignments...');
    
    // Get available microcompetencies
    const microcompetenciesResult = await query(
      supabase
        .from('microcompetencies')
        .select('id, name')
        .eq('is_active', true)
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

    // 4. Create some sample assessments
    console.log('\n4. Creating sample assessments...');
    
    // Get assigned students
    const assignedStudents = await query(
      supabase
        .from('teacher_assignments')
        .select(`
          students:student_id(id, name, registration_no)
        `)
        .eq('teacher_id', teacherId)
        .eq('is_active', true)
        .limit(2)
    );

    // Get assigned microcompetencies
    const assignedMicrocompetencies = await query(
      supabase
        .from('teacher_microcompetency_assignments')
        .select(`
          microcompetencies:microcompetency_id(id, name, max_score)
        `)
        .eq('teacher_id', teacherId)
        .eq('is_active', true)
        .limit(2)
    );

    if (assignedStudents.rows.length > 0 && assignedMicrocompetencies.rows.length > 0) {
      for (const studentAssignment of assignedStudents.rows) {
        for (const microcompetencyAssignment of assignedMicrocompetencies.rows) {
          const student = studentAssignment.students;
          const microcompetency = microcompetencyAssignment.microcompetencies;
          
          if (student && microcompetency) {
            // Check if assessment already exists
            const existingAssessment = await query(
              supabase
                .from('direct_assessments')
                .select('*')
                .eq('student_id', student.id)
                .eq('microcompetency_id', microcompetency.id)
                .eq('assessed_by_teacher_id', teacherId)
            );

            if (existingAssessment.rows.length === 0) {
              const score = Math.floor(Math.random() * (microcompetency.max_score || 10)) + 1;
              
              const assessmentResult = await query(
                supabase
                  .from('direct_assessments')
                  .insert({
                    student_id: student.id,
                    microcompetency_id: microcompetency.id,
                    assessed_by_teacher_id: teacherId,
                    score: score,
                    max_score: microcompetency.max_score || 10,
                    assessment_date: new Date().toISOString(),
                    notes: `Sample assessment for ${student.name} on ${microcompetency.name}`
                  })
                  .select('*')
              );

              if (assessmentResult.rows.length > 0) {
                console.log(`✅ Created assessment: ${student.name} - ${microcompetency.name} (Score: ${score})`);
              } else {
                console.log(`❌ Failed to create assessment for ${student.name} - ${microcompetency.name}`);
              }
            } else {
              console.log(`⚠️  Assessment already exists: ${student.name} - ${microcompetency.name}`);
            }
          }
        }
      }
    }

    console.log('\n✅ Data fixes completed!');

  } catch (error) {
    console.error('❌ Error during data fixing:', error);
  }
}

// Run the fix
fixTeacherData().then(() => {
  console.log('\n🏁 Fix complete');
  process.exit(0);
}).catch(error => {
  console.error('❌ Fix failed:', error);
  process.exit(1);
});
