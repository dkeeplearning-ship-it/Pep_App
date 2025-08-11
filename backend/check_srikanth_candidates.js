const { supabase, query } = require('./src/config/supabase');

async function checkSrikanthCandidates() {
  console.log('🔍 Checking potential Srikanth teacher candidates');
  console.log('=' .repeat(80));

  // Potential Srikanth candidates based on names
  const candidates = [
    { name: 'Srikant qw', teacherId: '71e3d945-4236-4d79-87d7-9f3e1979f83b', userId: 'b0cde931-c687-42e5-9643-e36a15868f17' },
    { name: 'srihari.kanyaboina Kanyaboina', teacherId: 'd29f8788-2f77-4dbb-bbe9-fdb1c7c8a9f3', userId: '33fce9ad-6f48-4d6d-8115-67e751f75212' },
    { name: 'Srihari kanyaboina', teacherId: 'e288bd02-8185-493b-bad5-ed54acbb54c9', userId: 'df6e9d85-ed02-4097-af79-bb41f5cd75fa' }
  ];

  try {
    for (let i = 0; i < candidates.length; i++) {
      const candidate = candidates[i];
      console.log(`\n${i + 1}. Analyzing candidate: ${candidate.name}`);
      console.log('=' .repeat(50));
      console.log(`Teacher ID: ${candidate.teacherId}`);
      console.log(`User ID: ${candidate.userId}`);

      // Check teacher microcompetency assignments
      const microcompetencyAssignments = await query(
        supabase
          .from('teacher_microcompetency_assignments')
          .select(`
            *,
            interventions:intervention_id(id, name, status, start_date, end_date),
            microcompetencies:microcompetency_id(id, name, description)
          `)
          .eq('teacher_id', candidate.teacherId)
          .eq('is_active', true)
      );
      console.log(`Microcompetency assignments: ${microcompetencyAssignments.rows.length}`);
      microcompetencyAssignments.rows.forEach((assignment, index) => {
        console.log(`  ${index + 1}. Intervention: ${assignment.interventions?.name || 'Unknown'}`);
        console.log(`     Microcompetency: ${assignment.microcompetencies?.name || 'Unknown'}`);
        console.log(`     Status: ${assignment.interventions?.status || 'Unknown'}`);
      });

      // Check intervention assignments
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
      console.log(`Intervention assignments: ${interventionAssignments.rows.length}`);
      interventionAssignments.rows.forEach((assignment, index) => {
        console.log(`  ${index + 1}. Intervention: ${assignment.interventions?.name || 'Unknown'}`);
        console.log(`     Status: ${assignment.interventions?.status || 'Unknown'}`);
        console.log(`     Role: ${assignment.role || 'Unknown'}`);
      });

      // Check student assignments
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
      console.log(`Student assignments: ${studentAssignments.rows.length}`);
      studentAssignments.rows.forEach((assignment, index) => {
        console.log(`  ${index + 1}. Student: ${assignment.students?.name || 'Unknown'} (${assignment.students?.registration_no || 'Unknown'})`);
        console.log(`     Term: ${assignment.terms?.name || 'Unknown'} (Current: ${assignment.terms?.is_current || false})`);
        console.log(`     Quadrant: ${assignment.quadrant_id || 'Unknown'}`);
      });

      // Check recent assessments
      const recentAssessments = await query(
        supabase
          .from('assessments')
          .select(`
            *,
            students:student_id(name, registration_no),
            microcompetencies:microcompetency_id(name)
          `)
          .eq('assessed_by_teacher_id', candidate.teacherId)
          .order('assessment_date', { ascending: false })
          .limit(5)
      );
      console.log(`Recent assessments: ${recentAssessments.rows.length}`);
      recentAssessments.rows.forEach((assessment, index) => {
        console.log(`  ${index + 1}. Student: ${assessment.students?.name || 'Unknown'}`);
        console.log(`     Microcompetency: ${assessment.microcompetencies?.name || 'Unknown'}`);
        console.log(`     Score: ${assessment.score || 'Unknown'}`);
        console.log(`     Date: ${assessment.assessment_date || 'Unknown'}`);
      });

      // Summary for this candidate
      const totalData = microcompetencyAssignments.rows.length + interventionAssignments.rows.length + 
                       studentAssignments.rows.length + recentAssessments.rows.length;
      console.log(`\n📊 Summary for ${candidate.name}:`);
      console.log(`   Total data points: ${totalData}`);
      console.log(`   Microcompetencies: ${microcompetencyAssignments.rows.length}`);
      console.log(`   Interventions: ${interventionAssignments.rows.length}`);
      console.log(`   Students: ${studentAssignments.rows.length}`);
      console.log(`   Assessments: ${recentAssessments.rows.length}`);
    }

    // Also check the original ID as a teacher ID (not user ID)
    console.log('\n4. Checking original ID as Teacher ID (not User ID)');
    console.log('=' .repeat(50));
    const originalIdAsTeacher = await query(
      supabase
        .from('teachers')
        .select('*')
        .eq('id', '51bf9fe3-570e-41f4-bc5d-01b9c28d1726')
    );
    
    if (originalIdAsTeacher.rows.length > 0) {
      const teacher = originalIdAsTeacher.rows[0];
      console.log(`Found teacher: ${teacher.name} (Employee ID: ${teacher.employee_id})`);
      console.log(`User ID: ${teacher.user_id}`);
      
      // Check if this teacher has data
      const microcompetencyAssignments = await query(
        supabase
          .from('teacher_microcompetency_assignments')
          .select('count', { count: 'exact' })
          .eq('teacher_id', teacher.id)
          .eq('is_active', true)
      );
      console.log(`Microcompetency assignments: ${microcompetencyAssignments.totalCount || 0}`);
    } else {
      console.log('No teacher found with that ID');
    }

  } catch (error) {
    console.error('❌ Error during analysis:', error);
  }
}

// Run the analysis
checkSrikanthCandidates().then(() => {
  console.log('\n🏁 Analysis complete');
  process.exit(0);
}).catch(error => {
  console.error('❌ Analysis failed:', error);
  process.exit(1);
});
