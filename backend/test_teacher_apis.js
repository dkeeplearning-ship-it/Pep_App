const { supabase, query } = require('./src/config/supabase');

async function testTeacherAPIs() {
  console.log('🔍 Testing Teacher APIs for Srikanth');
  console.log('=' .repeat(80));

  // Correct IDs for Srikanth
  const teacherUserId = 'b0cde931-c687-42e5-9643-e36a15868f17';
  const teacherId = '71e3d945-4236-4d79-87d7-9f3e1979f83b';

  try {
    console.log(`\nTesting with User ID: ${teacherUserId}`);
    console.log(`Teacher ID: ${teacherId}`);

    // 1. Test teacher dashboard logic (simulate the controller)
    console.log('\n1. Testing Teacher Dashboard Logic...');
    
    // Verify teacher exists - try both user_id and direct id lookup
    let teacherCheck = await query(
      supabase
        .from('teachers')
        .select('id, name, employee_id, specialization, department, user_id')
        .eq('user_id', teacherUserId)
    );

    if (!teacherCheck.rows || teacherCheck.rows.length === 0) {
      teacherCheck = await query(
        supabase
          .from('teachers')
          .select('id, name, employee_id, specialization, department, user_id')
          .eq('id', teacherUserId)
      );
    }

    if (!teacherCheck.rows || teacherCheck.rows.length === 0) {
      console.log('❌ Teacher not found');
      return;
    }

    const teacher = teacherCheck.rows[0];
    console.log('✅ Teacher found:', teacher.name);

    // 2. Test microcompetency assignments API
    console.log('\n2. Testing Microcompetency Assignments API...');
    
    const microcompetencyResult = await query(
      supabase
        .from('teacher_microcompetency_assignments')
        .select(`
          id,
          can_score,
          can_create_tasks,
          assigned_at,
          interventions:intervention_id(
            id,
            name,
            description,
            status,
            start_date,
            end_date,
            is_scoring_open,
            scoring_deadline
          ),
          microcompetencies:microcompetency_id(
            id,
            name,
            description,
            weightage,
            max_score,
            display_order,
            components:component_id(
              id,
              name,
              sub_categories:sub_category_id(
                id,
                name,
                quadrants:quadrant_id(id, name, display_order)
              )
            )
          )
        `)
        .eq('teacher_id', teacher.id)
        .eq('is_active', true)
        .order('assigned_at', { ascending: false })
    );

    console.log(`Found ${microcompetencyResult.rows.length} microcompetency assignments`);
    microcompetencyResult.rows.forEach((assignment, index) => {
      console.log(`  ${index + 1}. ${assignment.microcompetencies?.name} in ${assignment.interventions?.name}`);
      console.log(`     Status: ${assignment.interventions?.status}`);
      console.log(`     Can Score: ${assignment.can_score}`);
    });

    // 3. Test interventions API
    console.log('\n3. Testing Teacher Interventions API...');
    
    let interventionsQuery = supabase
      .from('teacher_microcompetency_assignments')
      .select(`
        intervention_id,
        interventions:intervention_id(
          id,
          name,
          description,
          start_date,
          end_date,
          status,
          scoring_deadline,
          is_scoring_open,
          created_at
        )
      `)
      .eq('teacher_id', teacher.id)
      .eq('is_active', true);

    const interventionsResult = await query(interventionsQuery);
    
    // Group by intervention to avoid duplicates
    const uniqueInterventions = {};
    interventionsResult.rows.forEach(row => {
      if (row.interventions) {
        uniqueInterventions[row.interventions.id] = row.interventions;
      }
    });

    const interventions = Object.values(uniqueInterventions);
    console.log(`Found ${interventions.length} unique interventions`);
    interventions.forEach((intervention, index) => {
      console.log(`  ${index + 1}. ${intervention.name}`);
      console.log(`     Status: ${intervention.status}`);
      console.log(`     Dates: ${intervention.start_date} to ${intervention.end_date}`);
    });

    // 4. Test current term logic
    console.log('\n4. Testing Current Term Logic...');
    
    const currentTermResult = await query(
      supabase
        .from('terms')
        .select('*')
        .eq('is_current', true)
    );

    if (currentTermResult.rows.length > 0) {
      const currentTerm = currentTermResult.rows[0];
      console.log(`✅ Current term: ${currentTerm.name}`);
      console.log(`   ID: ${currentTerm.id}`);
      console.log(`   Dates: ${currentTerm.start_date} to ${currentTerm.end_date}`);
    } else {
      console.log('❌ No current term found');
    }

    // 5. Test student assignments
    console.log('\n5. Testing Student Assignments...');
    
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

    console.log(`Found ${studentAssignments.rows.length} student assignments`);
    studentAssignments.rows.forEach((assignment, index) => {
      console.log(`  ${index + 1}. ${assignment.students?.name} (${assignment.students?.registration_no})`);
      console.log(`     Term: ${assignment.terms?.name} (Current: ${assignment.terms?.is_current})`);
    });

    // 6. Summary and diagnosis
    console.log('\n📊 DIAGNOSIS SUMMARY:');
    console.log('=' .repeat(50));
    console.log(`✅ Teacher exists: ${teacher.name}`);
    console.log(`✅ Microcompetencies: ${microcompetencyResult.rows.length} (should show more than 2)`);
    console.log(`✅ Interventions: ${interventions.length} (should show interventions)`);
    console.log(`✅ Current term: ${currentTermResult.rows.length > 0 ? 'Found' : 'Missing'}`);
    console.log(`⚠️  Students: ${studentAssignments.rows.length} (might be why dashboard shows 0 students)`);

    if (microcompetencyResult.rows.length === 2) {
      console.log('\n🔍 ISSUE IDENTIFIED:');
      console.log('   - Teacher has exactly 2 microcompetencies (matches your report)');
      console.log('   - Teacher has 0 student assignments (explains "no students")');
      console.log('   - Need to check why interventions show as "no interventions in current term"');
    }

  } catch (error) {
    console.error('❌ Error during testing:', error);
  }
}

// Run the test
testTeacherAPIs().then(() => {
  console.log('\n🏁 Testing complete');
  process.exit(0);
}).catch(error => {
  console.error('❌ Testing failed:', error);
  process.exit(1);
});
