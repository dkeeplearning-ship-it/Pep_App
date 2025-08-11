const { supabase, query } = require('./src/config/supabase');

async function investigateInterventionDisplayIssues() {
  console.log('🔍 Investigating Intervention Display Issues for Sripathi');
  console.log('=' .repeat(80));

  try {
    // Student details
    const userId = '5810adc8-17ee-461e-ba03-2336470daf80';
    const studentId = '1fd449cd-d3f6-4343-8298-f6e7392f2941';
    const currentTermId = '62cbc472-9175-4c95-b9f7-3fb0e2abca2f';
    
    console.log(`\nInvestigating for: Sripathi Kanyaboina`);
    console.log(`Student ID: ${studentId}`);
    console.log(`Current Term: ${currentTermId}`);

    // 1. Check intervention enrollments for Sripathi
    console.log('\n1. 📊 CHECKING SRIPATHI\'S INTERVENTION ENROLLMENTS');
    
    const sripathiEnrollments = await query(
      supabase
        .from('intervention_enrollments')
        .select(`
          *,
          interventions:intervention_id(id, name, status, start_date, end_date)
        `)
        .eq('student_id', studentId)
    );

    console.log(`Found ${sripathiEnrollments.rows.length} enrollments for Sripathi:`);
    sripathiEnrollments.rows.forEach((enrollment, index) => {
      console.log(`  ${index + 1}. ${enrollment.interventions?.name || 'Unknown'}`);
      console.log(`     Intervention ID: ${enrollment.intervention_id}`);
      console.log(`     Status: ${enrollment.enrollment_status}`);
      console.log(`     Intervention Status: ${enrollment.interventions?.status || 'Unknown'}`);
      console.log(`     Progress: ${enrollment.completion_percentage}%`);
    });

    // 2. Check each intervention's actual enrollment counts
    console.log('\n2. 🎯 CHECKING ACTUAL ENROLLMENT COUNTS FOR EACH INTERVENTION');
    
    const interventionIds = sripathiEnrollments.rows.map(e => e.intervention_id);
    
    for (const interventionId of interventionIds) {
      const intervention = sripathiEnrollments.rows.find(e => e.intervention_id === interventionId)?.interventions;
      console.log(`\n   Analyzing: ${intervention?.name || 'Unknown'}`);
      console.log(`   ID: ${interventionId}`);
      console.log(`   Status: ${intervention?.status || 'Unknown'}`);

      // Count total enrollments for this intervention
      const totalEnrollments = await query(
        supabase
          .from('intervention_enrollments')
          .select('count', { count: 'exact' })
          .eq('intervention_id', interventionId)
      );

      console.log(`   📊 Total Enrollments: ${totalEnrollments.totalCount || 0}`);

      // Count active enrollments
      const activeEnrollments = await query(
        supabase
          .from('intervention_enrollments')
          .select('count', { count: 'exact' })
          .eq('intervention_id', interventionId)
          .eq('enrollment_status', 'Enrolled')
      );

      console.log(`   📊 Active Enrollments: ${activeEnrollments.totalCount || 0}`);

      // Check microcompetencies assigned to this intervention
      const microcompetencies = await query(
        supabase
          .from('intervention_microcompetencies')
          .select(`
            count,
            microcompetencies:microcompetency_id(id, name)
          `, { count: 'exact' })
          .eq('intervention_id', interventionId)
      );

      console.log(`   🧩 Assigned Microcompetencies: ${microcompetencies.totalCount || 0}`);

      // Check if there are any microcompetency scores for this intervention
      const microScores = await query(
        supabase
          .from('microcompetency_scores')
          .select('count', { count: 'exact' })
          .eq('intervention_id', interventionId)
      );

      console.log(`   📈 Microcompetency Scores: ${microScores.totalCount || 0}`);

      // Check tasks for this intervention
      const tasks = await query(
        supabase
          .from('tasks')
          .select('count', { count: 'exact' })
          .eq('intervention_id', interventionId)
      );

      console.log(`   📋 Tasks: ${tasks.totalCount || 0}`);
    }

    // 3. Check intervention status logic
    console.log('\n3. 🔍 ANALYZING INTERVENTION STATUS LOGIC');
    
    for (const interventionId of interventionIds) {
      const intervention = sripathiEnrollments.rows.find(e => e.intervention_id === interventionId)?.interventions;
      
      // Check if intervention has scores (should not be Draft if it has scores)
      const hasScores = await query(
        supabase
          .from('microcompetency_scores')
          .select('count', { count: 'exact' })
          .eq('intervention_id', interventionId)
      );

      // Check if intervention has enrollments (should not be Draft if it has enrollments)
      const hasEnrollments = await query(
        supabase
          .from('intervention_enrollments')
          .select('count', { count: 'exact' })
          .eq('intervention_id', interventionId)
      );

      console.log(`\n   ${intervention?.name || 'Unknown'}:`);
      console.log(`   Current Status: ${intervention?.status || 'Unknown'}`);
      console.log(`   Has Scores: ${hasScores.totalCount > 0 ? 'Yes' : 'No'} (${hasScores.totalCount})`);
      console.log(`   Has Enrollments: ${hasEnrollments.totalCount > 0 ? 'Yes' : 'No'} (${hasEnrollments.totalCount})`);
      
      // Determine what status should be
      let expectedStatus = 'Draft';
      if (hasEnrollments.totalCount > 0 && hasScores.totalCount > 0) {
        expectedStatus = 'Active';
      } else if (hasEnrollments.totalCount > 0) {
        expectedStatus = 'Active';
      }
      
      console.log(`   Expected Status: ${expectedStatus}`);
      
      if (intervention?.status !== expectedStatus) {
        console.log(`   ❌ STATUS MISMATCH! Should be ${expectedStatus}, currently ${intervention?.status}`);
      } else {
        console.log(`   ✅ Status is correct`);
      }
    }

    // 4. Check the student intervention API data structure
    console.log('\n4. 📡 SIMULATING STUDENT INTERVENTION API RESPONSE');
    
    // This simulates what the frontend should receive
    const interventionData = [];
    
    for (const interventionId of interventionIds) {
      const intervention = sripathiEnrollments.rows.find(e => e.intervention_id === interventionId)?.interventions;
      
      // Get all the counts that should be displayed
      const [enrollmentCount, microcompetencyCount, taskCount, scoreCount] = await Promise.all([
        query(supabase.from('intervention_enrollments').select('count', { count: 'exact' }).eq('intervention_id', interventionId)),
        query(supabase.from('intervention_microcompetencies').select('count', { count: 'exact' }).eq('intervention_id', interventionId)),
        query(supabase.from('tasks').select('count', { count: 'exact' }).eq('intervention_id', interventionId)),
        query(supabase.from('microcompetency_scores').select('count', { count: 'exact' }).eq('intervention_id', interventionId))
      ]);

      const interventionInfo = {
        id: interventionId,
        name: intervention?.name || 'Unknown',
        status: intervention?.status || 'Unknown',
        enrolledStudents: enrollmentCount.totalCount || 0,
        microcompetencies: microcompetencyCount.totalCount || 0,
        tasks: taskCount.totalCount || 0,
        scores: scoreCount.totalCount || 0,
        startDate: intervention?.start_date,
        endDate: intervention?.end_date
      };

      interventionData.push(interventionInfo);
      
      console.log(`\n   ${interventionInfo.name}:`);
      console.log(`   📊 Students: ${interventionInfo.enrolledStudents} (should show on card)`);
      console.log(`   🧩 Microcompetencies: ${interventionInfo.microcompetencies} (should show on card)`);
      console.log(`   📋 Tasks: ${interventionInfo.tasks}`);
      console.log(`   📈 Scores: ${interventionInfo.scores}`);
      console.log(`   🏷️  Status: ${interventionInfo.status} (should show on card)`);
    }

    // 5. Identify specific issues
    console.log('\n5. ❌ IDENTIFIED ISSUES');
    
    const issues = [];
    
    interventionData.forEach(intervention => {
      if (intervention.enrolledStudents === 0 && intervention.scores > 0) {
        issues.push(`${intervention.name}: Shows 0 students but has ${intervention.scores} scores`);
      }
      
      if (intervention.status === 'Draft' && intervention.scores > 0) {
        issues.push(`${intervention.name}: Status is Draft but has ${intervention.scores} scores`);
      }
      
      if (intervention.microcompetencies === 0 && intervention.scores > 0) {
        issues.push(`${intervention.name}: Shows 0 microcompetencies but has ${intervention.scores} scores`);
      }
    });

    if (issues.length > 0) {
      console.log('   Found the following issues:');
      issues.forEach((issue, index) => {
        console.log(`   ${index + 1}. ${issue}`);
      });
    } else {
      console.log('   ✅ No issues found in data - problem might be in frontend display logic');
    }

    // 6. Check if the issue is in the API endpoint
    console.log('\n6. 🔍 CHECKING API ENDPOINT LOGIC');
    
    console.log('   The student intervention page likely calls one of these endpoints:');
    console.log('   - GET /api/v1/students/{studentId}/interventions');
    console.log('   - GET /api/v1/interventions (with student filtering)');
    console.log('   - GET /api/v1/students/{studentId}/intervention-performance');
    
    console.log('\n   Expected API response should include:');
    interventionData.forEach(intervention => {
      console.log(`   - ${intervention.name}: ${intervention.enrolledStudents} students, ${intervention.microcompetencies} microcompetencies, status: ${intervention.status}`);
    });

    console.log('\n📋 SUMMARY OF INVESTIGATION:');
    console.log('=' .repeat(50));
    console.log(`✅ Sripathi has ${sripathiEnrollments.rows.length} intervention enrollments`);
    console.log(`✅ Each intervention should show at least 1 enrolled student (Sripathi)`);
    console.log(`✅ Interventions with scores should not have "Draft" status`);
    console.log(`✅ Microcompetency counts should be > 0 for interventions with scores`);
    
    if (issues.length > 0) {
      console.log(`❌ Found ${issues.length} data consistency issues that need fixing`);
    } else {
      console.log(`✅ Data appears consistent - issue is likely in frontend API calls or display logic`);
    }

  } catch (error) {
    console.error('❌ Error during investigation:', error);
  }
}

// Run the investigation
investigateInterventionDisplayIssues().then(() => {
  console.log('\n🏁 Investigation complete');
  process.exit(0);
}).catch(error => {
  console.error('❌ Investigation failed:', error);
  process.exit(1);
});
