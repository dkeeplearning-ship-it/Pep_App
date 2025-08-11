const { supabase, query } = require('./src/config/supabase');

async function testStudentInterventionsAPI() {
  console.log('🧪 Testing Student Interventions API Response');
  console.log('=' .repeat(80));

  try {
    // Student details
    const studentId = '1fd449cd-d3f6-4343-8298-f6e7392f2941';
    const currentTermId = '62cbc472-9175-4c95-b9f7-3fb0e2abca2f';
    
    console.log(`\nTesting API for: Sripathi Kanyaboina`);
    console.log(`Student ID: ${studentId}`);
    console.log(`Current Term: ${currentTermId}`);

    // 1. Simulate the getStudentInterventions API call
    console.log('\n1. 🎯 SIMULATING API CALL: GET /api/v1/students/{studentId}/interventions');
    
    // Build the same query as the API
    let enrollmentsQuery = supabase
      .from('intervention_enrollments')
      .select(`
        enrollment_date,
        completion_percentage,
        current_score,
        enrollment_status,
        interventions!inner(
          id,
          name,
          description,
          start_date,
          end_date,
          status,
          term_id,
          is_scoring_open,
          scoring_deadline,
          max_students,
          objectives
        )
      `)
      .eq('student_id', studentId)
      .in('enrollment_status', ['Enrolled', 'Completed']);

    // Apply term filtering
    if (currentTermId) {
      enrollmentsQuery = enrollmentsQuery.eq('interventions.term_id', currentTermId);
    }

    const enrollmentsResult = await query(enrollmentsQuery.order('enrollment_date', { ascending: false }));

    console.log(`Found ${enrollmentsResult.rows.length} intervention enrollments`);

    // 2. Process the data as the API does
    console.log('\n2. 📊 PROCESSING API RESPONSE DATA');
    
    let interventions = [];
    if (enrollmentsResult.rows) {
      interventions = enrollmentsResult.rows
        .map(enrollment => ({
          id: enrollment.interventions.id,
          name: enrollment.interventions.name,
          description: enrollment.interventions.description,
          start_date: enrollment.interventions.start_date,
          end_date: enrollment.interventions.end_date,
          status: enrollment.interventions.status,
          term_id: enrollment.interventions.term_id,
          is_scoring_open: enrollment.interventions.is_scoring_open,
          scoring_deadline: enrollment.interventions.scoring_deadline,
          max_students: enrollment.interventions.max_students,
          objectives: enrollment.interventions.objectives || [],
          enrollment_status: enrollment.enrollment_status,
          enrollment_date: enrollment.enrollment_date,
          enrolled_at: enrollment.enrollment_date,
          progress_percentage: enrollment.completion_percentage || 0,
          current_score: enrollment.current_score || 0,
          completion_percentage: enrollment.completion_percentage || 0,
          enrolled_count: 0 // This is the problem - it's hardcoded to 0!
        }));
    }

    console.log('\nCurrent API Response (problematic):');
    interventions.forEach((intervention, index) => {
      console.log(`  ${index + 1}. ${intervention.name}`);
      console.log(`     Status: ${intervention.status}`);
      console.log(`     Enrolled Count: ${intervention.enrolled_count} ❌ (shows 0 on frontend)`);
      console.log(`     Progress: ${intervention.progress_percentage}%`);
    });

    // 3. Fix the API response by adding correct counts
    console.log('\n3. 🔧 FIXING API RESPONSE WITH CORRECT COUNTS');
    
    const fixedInterventions = [];
    
    for (const intervention of interventions) {
      // Get actual enrollment count for this intervention
      const enrollmentCount = await query(
        supabase
          .from('intervention_enrollments')
          .select('count', { count: 'exact' })
          .eq('intervention_id', intervention.id)
          .in('enrollment_status', ['Enrolled', 'Completed'])
      );

      // Get microcompetency count for this intervention
      const microcompetencyCount = await query(
        supabase
          .from('intervention_microcompetencies')
          .select('count', { count: 'exact' })
          .eq('intervention_id', intervention.id)
      );

      // Get task count for this intervention
      const taskCount = await query(
        supabase
          .from('tasks')
          .select('count', { count: 'exact' })
          .eq('intervention_id', intervention.id)
      );

      // Create fixed intervention object
      const fixedIntervention = {
        ...intervention,
        enrolled_count: enrollmentCount.totalCount || 0,
        microcompetencies_count: microcompetencyCount.totalCount || 0,
        tasks_count: taskCount.totalCount || 0,
        // Add objectives count
        objectives_count: Array.isArray(intervention.objectives) ? intervention.objectives.length : 0
      };

      fixedInterventions.push(fixedIntervention);
    }

    console.log('\nFixed API Response (correct):');
    fixedInterventions.forEach((intervention, index) => {
      console.log(`  ${index + 1}. ${intervention.name}`);
      console.log(`     Status: ${intervention.status} ✅`);
      console.log(`     Enrolled Count: ${intervention.enrolled_count} ✅ (should show on frontend)`);
      console.log(`     Microcompetencies: ${intervention.microcompetencies_count} ✅ (should show on frontend)`);
      console.log(`     Tasks: ${intervention.tasks_count}`);
      console.log(`     Objectives: ${intervention.objectives_count} ✅ (should show on frontend)`);
    });

    // 4. Show what the frontend should display
    console.log('\n4. 🎨 EXPECTED FRONTEND DISPLAY');
    
    console.log('\nIntervention cards should show:');
    fixedInterventions.forEach((intervention, index) => {
      console.log(`\n  📋 ${intervention.name}:`);
      console.log(`     🏷️  Status: Active (not Draft)`);
      console.log(`     👥 Students: ${intervention.enrolled_count} (not 0)`);
      console.log(`     🧩 Microcompetencies: ${intervention.microcompetencies_count} (not 0)`);
      console.log(`     🎯 Objectives: ${intervention.objectives_count} (not 0)`);
      console.log(`     📊 Progress: ${intervention.progress_percentage}%`);
      console.log(`     📈 Score: ${intervention.current_score}`);
    });

    // 5. Identify the specific fix needed
    console.log('\n5. 🔧 REQUIRED API FIX');
    
    console.log('\nThe getStudentInterventions API needs to be updated to:');
    console.log('1. Calculate actual enrolled_count for each intervention');
    console.log('2. Add microcompetencies_count field');
    console.log('3. Add objectives_count field');
    console.log('4. Ensure status is "Active" (already fixed)');
    
    console.log('\nSpecific changes needed in studentController.js:');
    console.log('- Replace hardcoded enrolled_count: 0 with actual count query');
    console.log('- Add microcompetency count query');
    console.log('- Add objectives count calculation');
    console.log('- Return these counts in the API response');

    console.log('\n📊 SUMMARY:');
    console.log('=' .repeat(50));
    console.log(`✅ Intervention statuses fixed (all now Active)`);
    console.log(`❌ API still returns enrolled_count: 0 (needs fix)`);
    console.log(`❌ API missing microcompetencies_count field`);
    console.log(`❌ API missing objectives_count field`);
    console.log(`🔧 Need to update getStudentInterventions API to include correct counts`);

  } catch (error) {
    console.error('❌ Error during API testing:', error);
  }
}

// Run the test
testStudentInterventionsAPI().then(() => {
  console.log('\n🏁 API testing complete');
  process.exit(0);
}).catch(error => {
  console.error('❌ API testing failed:', error);
  process.exit(1);
});
