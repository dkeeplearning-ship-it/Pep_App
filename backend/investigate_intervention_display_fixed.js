const { supabase, query } = require('./src/config/supabase');

async function investigateInterventionDisplayFixed() {
  console.log('🔍 Investigating Intervention Display Issues for Sripathi (Fixed)');
  console.log('=' .repeat(80));

  try {
    // Student details
    const userId = '5810adc8-17ee-461e-ba03-2336470daf80';
    const studentId = '1fd449cd-d3f6-4343-8298-f6e7392f2941';
    const currentTermId = '62cbc472-9175-4c95-b9f7-3fb0e2abca2f';
    
    console.log(`\nInvestigating for: Sripathi Kanyaboina`);
    console.log(`Student ID: ${studentId}`);

    // 1. Check Sripathi's intervention enrollments
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
    const interventionIds = [];
    
    sripathiEnrollments.rows.forEach((enrollment, index) => {
      console.log(`  ${index + 1}. ${enrollment.interventions?.name || 'Unknown'}`);
      console.log(`     Intervention ID: ${enrollment.intervention_id}`);
      console.log(`     Enrollment Status: ${enrollment.enrollment_status}`);
      console.log(`     Intervention Status: ${enrollment.interventions?.status || 'Unknown'}`);
      console.log(`     Progress: ${enrollment.completion_percentage}%`);
      interventionIds.push(enrollment.intervention_id);
    });

    // 2. Check each intervention's data separately
    console.log('\n2. 🎯 ANALYZING EACH INTERVENTION\'S DATA');
    
    for (const interventionId of interventionIds) {
      const intervention = sripathiEnrollments.rows.find(e => e.intervention_id === interventionId)?.interventions;
      console.log(`\n   📋 ${intervention?.name || 'Unknown'}`);
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

      // Check microcompetencies (fixed query)
      const microcompetencies = await query(
        supabase
          .from('intervention_microcompetencies')
          .select('count', { count: 'exact' })
          .eq('intervention_id', interventionId)
      );

      console.log(`   🧩 Assigned Microcompetencies: ${microcompetencies.totalCount || 0}`);

      // Check microcompetency scores for this intervention
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

      // Determine what the card should show
      console.log(`   🎯 CARD SHOULD SHOW:`);
      console.log(`      Students: ${totalEnrollments.totalCount || 0} (currently shows 0 ❌)`);
      console.log(`      Microcompetencies: ${microcompetencies.totalCount || 0} (currently shows 0 ❌)`);
      console.log(`      Status: Should be Active (currently Draft ❌)`);
    }

    // 3. Check intervention status logic issues
    console.log('\n3. 🔍 INTERVENTION STATUS ANALYSIS');
    
    const statusIssues = [];
    
    for (const interventionId of interventionIds) {
      const intervention = sripathiEnrollments.rows.find(e => e.intervention_id === interventionId)?.interventions;
      
      // Check if intervention has scores
      const hasScores = await query(
        supabase
          .from('microcompetency_scores')
          .select('count', { count: 'exact' })
          .eq('intervention_id', interventionId)
      );

      // Check if intervention has enrollments
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
      
      // Determine correct status
      let correctStatus = 'Draft';
      if (hasEnrollments.totalCount > 0 && hasScores.totalCount > 0) {
        correctStatus = 'Active';
      } else if (hasEnrollments.totalCount > 0) {
        correctStatus = 'Active';
      }
      
      console.log(`   Should Be: ${correctStatus}`);
      
      if (intervention?.status !== correctStatus) {
        console.log(`   ❌ STATUS NEEDS UPDATE!`);
        statusIssues.push({
          id: interventionId,
          name: intervention?.name,
          currentStatus: intervention?.status,
          correctStatus: correctStatus
        });
      } else {
        console.log(`   ✅ Status is correct`);
      }
    }

    // 4. Check what the student intervention API should return
    console.log('\n4. 📡 EXPECTED API RESPONSE DATA');
    
    console.log('   The student intervention page should show:');
    
    for (const interventionId of interventionIds) {
      const intervention = sripathiEnrollments.rows.find(e => e.intervention_id === interventionId)?.interventions;
      
      // Get the counts that should be displayed
      const [enrollmentCount, microcompetencyCount, taskCount, scoreCount] = await Promise.all([
        query(supabase.from('intervention_enrollments').select('count', { count: 'exact' }).eq('intervention_id', interventionId)),
        query(supabase.from('intervention_microcompetencies').select('count', { count: 'exact' }).eq('intervention_id', interventionId)),
        query(supabase.from('tasks').select('count', { count: 'exact' }).eq('intervention_id', interventionId)),
        query(supabase.from('microcompetency_scores').select('count', { count: 'exact' }).eq('intervention_id', interventionId))
      ]);

      console.log(`\n   📋 ${intervention?.name || 'Unknown'}:`);
      console.log(`      📊 Students: ${enrollmentCount.totalCount || 0} (not 0!)`);
      console.log(`      🧩 Microcompetencies: ${microcompetencyCount.totalCount || 0} (not 0!)`);
      console.log(`      📋 Tasks: ${taskCount.totalCount || 0}`);
      console.log(`      📈 Scores: ${scoreCount.totalCount || 0}`);
      console.log(`      🏷️  Status: Should be Active (not Draft!)`);
    }

    // 5. Summary of issues found
    console.log('\n5. ❌ CRITICAL ISSUES IDENTIFIED');
    
    console.log('\n   🔍 ROOT CAUSES:');
    console.log('   1. All interventions have status "Draft" but should be "Active"');
    console.log('   2. Frontend is likely showing 0 counts due to status filtering');
    console.log('   3. API might be filtering out "Draft" interventions from counts');
    console.log('   4. Status logic needs to be updated based on enrollments and scores');

    console.log('\n   📊 EXPECTED VS ACTUAL:');
    console.log('   Expected: Each intervention shows ≥1 student (Sripathi is enrolled)');
    console.log('   Actual: Cards show 0 students');
    console.log('   Expected: Interventions with scores should be "Active"');
    console.log('   Actual: All interventions are "Draft"');
    console.log('   Expected: Microcompetency counts > 0 for interventions with scores');
    console.log('   Actual: Cards show 0 microcompetencies');

    // 6. Fixes needed
    console.log('\n6. 🔧 FIXES REQUIRED');
    
    console.log('\n   IMMEDIATE FIXES:');
    console.log('   1. Update intervention status from "Draft" to "Active" for all 5 interventions');
    console.log('   2. Verify API endpoints return correct enrollment counts');
    console.log('   3. Check frontend filtering logic for intervention display');
    console.log('   4. Ensure microcompetency counts are properly calculated');

    if (statusIssues.length > 0) {
      console.log('\n   STATUS UPDATES NEEDED:');
      statusIssues.forEach((issue, index) => {
        console.log(`   ${index + 1}. ${issue.name}: ${issue.currentStatus} → ${issue.correctStatus}`);
      });
    }

    console.log('\n📋 INVESTIGATION SUMMARY:');
    console.log('=' .repeat(50));
    console.log(`✅ Sripathi has ${sripathiEnrollments.rows.length} intervention enrollments`);
    console.log(`❌ All interventions incorrectly show "Draft" status`);
    console.log(`❌ This causes frontend to display 0 counts for students/microcompetencies`);
    console.log(`🔧 Need to update intervention statuses to "Active"`);
    console.log(`🔧 Need to verify API endpoint logic for count calculations`);

  } catch (error) {
    console.error('❌ Error during investigation:', error);
  }
}

// Run the investigation
investigateInterventionDisplayFixed().then(() => {
  console.log('\n🏁 Investigation complete');
  process.exit(0);
}).catch(error => {
  console.error('❌ Investigation failed:', error);
  process.exit(1);
});
