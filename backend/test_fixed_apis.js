const { supabase, query } = require('./src/config/supabase');

async function testFixedAPIs() {
  console.log('🧪 Testing Fixed Teacher APIs');
  console.log('=' .repeat(80));

  // Correct IDs for Srikanth
  const teacherUserId = 'b0cde931-c687-42e5-9643-e36a15868f17';
  const teacherId = '71e3d945-4236-4d79-87d7-9f3e1979f83b';

  try {
    console.log(`\nTesting with User ID: ${teacherUserId}`);
    console.log(`Teacher ID: ${teacherId}`);

    // 1. Test Teacher Dashboard API
    console.log('\n1. Testing Teacher Dashboard API...');
    
    // Simulate the getTeacherDashboard controller logic
    let teacherCheck = await query(
      supabase
        .from('teachers')
        .select('id, name, employee_id, specialization, department, user_id')
        .eq('user_id', teacherUserId)
    );

    if (teacherCheck.rows.length === 0) {
      teacherCheck = await query(
        supabase
          .from('teachers')
          .select('id, name, employee_id, specialization, department, user_id')
          .eq('id', teacherUserId)
      );
    }

    if (teacherCheck.rows.length === 0) {
      console.log('❌ Teacher not found');
      return;
    }

    const teacher = teacherCheck.rows[0];
    console.log(`✅ Teacher found: ${teacher.name}`);

    // Get current term
    const currentTermResult = await query(
      supabase
        .from('terms')
        .select('id, name, start_date, end_date, is_current')
        .eq('is_current', true)
    );

    const currentTerm = currentTermResult.rows[0];
    console.log(`✅ Current term: ${currentTerm?.name || 'None'}`);

    // Get total students assigned to teacher
    const studentsResult = await query(
      supabase
        .from('teacher_assignments')
        .select('count', { count: 'exact' })
        .eq('teacher_id', teacher.id)
        .eq('is_active', true)
    );

    const totalStudents = studentsResult.totalCount || 0;
    console.log(`✅ Total students: ${totalStudents}`);

    // Get assigned quadrants
    const quadrantsResult = await query(
      supabase
        .from('teacher_assignments')
        .select('quadrant_id')
        .eq('teacher_id', teacher.id)
        .eq('is_active', true)
    );

    const uniqueQuadrants = [...new Set(quadrantsResult.rows.map(r => r.quadrant_id))];
    console.log(`✅ Assigned quadrants: ${uniqueQuadrants.length} (${uniqueQuadrants.join(', ')})`);

    // 2. Test Teacher Interventions API
    console.log('\n2. Testing Teacher Interventions API...');
    
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
    console.log(`✅ Found ${interventions.length} interventions`);
    
    interventions.forEach((intervention, index) => {
      console.log(`  ${index + 1}. ${intervention.name}`);
      console.log(`     Status: ${intervention.status}`);
      console.log(`     Dates: ${intervention.start_date} to ${intervention.end_date}`);
      
      // Check if intervention overlaps with current term
      if (currentTerm) {
        const termStart = new Date(currentTerm.start_date);
        const termEnd = new Date(currentTerm.end_date);
        const interventionStart = new Date(intervention.start_date);
        const interventionEnd = new Date(intervention.end_date);
        
        const overlaps = (interventionStart <= termEnd && interventionEnd >= termStart);
        console.log(`     Overlaps with current term: ${overlaps ? '✅ YES' : '❌ NO'}`);
      }
    });

    // 3. Test Teacher Microcompetencies API
    console.log('\n3. Testing Teacher Microcompetencies API...');
    
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
            display_order
          )
        `)
        .eq('teacher_id', teacher.id)
        .eq('is_active', true)
        .order('assigned_at', { ascending: false })
    );

    console.log(`✅ Found ${microcompetencyResult.rows.length} microcompetency assignments`);
    microcompetencyResult.rows.forEach((assignment, index) => {
      console.log(`  ${index + 1}. ${assignment.microcompetencies?.name || 'Unknown'}`);
      console.log(`     Intervention: ${assignment.interventions?.name || 'Unknown'}`);
      console.log(`     Can Score: ${assignment.can_score}`);
      console.log(`     Can Create Tasks: ${assignment.can_create_tasks}`);
    });

    // 4. Test Teacher Students API
    console.log('\n4. Testing Teacher Students API...');
    
    const studentAssignments = await query(
      supabase
        .from('teacher_assignments')
        .select(`
          *,
          students:student_id(
            id,
            name,
            registration_no,
            course,
            overall_score,
            grade,
            status
          ),
          terms:term_id(id, name, is_current)
        `)
        .eq('teacher_id', teacher.id)
        .eq('is_active', true)
    );

    console.log(`✅ Found ${studentAssignments.rows.length} student assignments`);
    studentAssignments.rows.forEach((assignment, index) => {
      const student = assignment.students;
      console.log(`  ${index + 1}. ${student?.name || 'Unknown'} (${student?.registration_no || 'Unknown'})`);
      console.log(`     Course: ${student?.course || 'Unknown'}`);
      console.log(`     Quadrant: ${assignment.quadrant_id}`);
      console.log(`     Term: ${assignment.terms?.name || 'Unknown'} (Current: ${assignment.terms?.is_current || false})`);
    });

    // 5. Summary
    console.log('\n📊 API TEST SUMMARY:');
    console.log('=' .repeat(50));
    console.log(`✅ Teacher Dashboard: ${teacher.name} found`);
    console.log(`✅ Students: ${totalStudents} assigned`);
    console.log(`✅ Quadrants: ${uniqueQuadrants.length} assigned`);
    console.log(`✅ Interventions: ${interventions.length} found`);
    console.log(`✅ Microcompetencies: ${microcompetencyResult.rows.length} assigned`);
    
    // Check if issues are resolved
    if (interventions.length > 0) {
      console.log('\n🎉 ISSUE RESOLVED: Teacher now has interventions!');
    }
    if (microcompetencyResult.rows.length > 2) {
      console.log('🎉 ISSUE RESOLVED: Teacher now has more than 2 microcompetencies!');
    }
    if (totalStudents > 0) {
      console.log('🎉 ISSUE RESOLVED: Teacher now has assigned students!');
    }

    console.log('\n🔧 FRONTEND TESTING:');
    console.log('1. Login with username: q, password: [check database]');
    console.log('2. Navigate to Teacher Dashboard');
    console.log('3. Check that interventions show up in current term');
    console.log('4. Check that microcompetencies page shows 7 assignments');
    console.log('5. Check that students page shows 3 students');

  } catch (error) {
    console.error('❌ Error during API testing:', error);
  }
}

// Run the test
testFixedAPIs().then(() => {
  console.log('\n🏁 API testing complete');
  process.exit(0);
}).catch(error => {
  console.error('❌ API testing failed:', error);
  process.exit(1);
});
