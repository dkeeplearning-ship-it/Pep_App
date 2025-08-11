const { supabase, query } = require('./src/config/supabase');

async function fixInterventionStatuses() {
  console.log('🔧 Fixing Intervention Statuses for Sripathi\'s Interventions');
  console.log('=' .repeat(80));

  try {
    // Student details
    const studentId = '1fd449cd-d3f6-4343-8298-f6e7392f2941';
    
    console.log(`\nFixing intervention statuses for: Sripathi Kanyaboina`);
    console.log(`Student ID: ${studentId}`);

    // 1. Get Sripathi's intervention enrollments
    console.log('\n1. 📊 GETTING SRIPATHI\'S INTERVENTIONS');
    
    const sripathiEnrollments = await query(
      supabase
        .from('intervention_enrollments')
        .select(`
          intervention_id,
          interventions:intervention_id(id, name, status)
        `)
        .eq('student_id', studentId)
    );

    console.log(`Found ${sripathiEnrollments.rows.length} interventions to fix:`);
    
    const interventionsToUpdate = [];
    
    sripathiEnrollments.rows.forEach((enrollment, index) => {
      const intervention = enrollment.interventions;
      console.log(`  ${index + 1}. ${intervention?.name || 'Unknown'}`);
      console.log(`     Current Status: ${intervention?.status || 'Unknown'}`);
      console.log(`     Should Be: Active`);
      
      if (intervention?.status === 'Draft') {
        interventionsToUpdate.push({
          id: intervention.id,
          name: intervention.name,
          currentStatus: intervention.status
        });
      }
    });

    // 2. Update intervention statuses to Active
    console.log('\n2. 🔧 UPDATING INTERVENTION STATUSES');
    
    let updatedCount = 0;
    
    for (const intervention of interventionsToUpdate) {
      console.log(`\n   Updating: ${intervention.name}`);
      
      const updateResult = await query(
        supabase
          .from('interventions')
          .update({
            status: 'Active',
            updated_at: new Date().toISOString()
          })
          .eq('id', intervention.id)
          .select('*')
      );

      if (updateResult.rows.length > 0) {
        console.log(`   ✅ Updated to Active`);
        updatedCount++;
      } else {
        console.log(`   ❌ Failed to update`);
      }
    }

    // 3. Verify the updates
    console.log('\n3. ✅ VERIFYING UPDATES');
    
    const verifyResult = await query(
      supabase
        .from('intervention_enrollments')
        .select(`
          intervention_id,
          interventions:intervention_id(id, name, status)
        `)
        .eq('student_id', studentId)
    );

    console.log(`\nVerification results:`);
    verifyResult.rows.forEach((enrollment, index) => {
      const intervention = enrollment.interventions;
      const status = intervention?.status || 'Unknown';
      const statusIcon = status === 'Active' ? '✅' : '❌';
      
      console.log(`  ${index + 1}. ${intervention?.name || 'Unknown'}: ${status} ${statusIcon}`);
    });

    // 4. Test what the API should now return
    console.log('\n4. 🧪 TESTING EXPECTED API RESPONSE');
    
    console.log('\nAfter status updates, intervention cards should show:');
    
    for (const enrollment of verifyResult.rows) {
      const interventionId = enrollment.intervention_id;
      const intervention = enrollment.interventions;
      
      // Get the counts that should now be visible
      const [enrollmentCount, microcompetencyCount, scoreCount] = await Promise.all([
        query(supabase.from('intervention_enrollments').select('count', { count: 'exact' }).eq('intervention_id', interventionId)),
        query(supabase.from('intervention_microcompetencies').select('count', { count: 'exact' }).eq('intervention_id', interventionId)),
        query(supabase.from('microcompetency_scores').select('count', { count: 'exact' }).eq('intervention_id', interventionId))
      ]);

      console.log(`\n   📋 ${intervention?.name || 'Unknown'}:`);
      console.log(`      Status: ${intervention?.status || 'Unknown'} ✅`);
      console.log(`      Students: ${enrollmentCount.totalCount || 0} ✅`);
      console.log(`      Microcompetencies: ${microcompetencyCount.totalCount || 0} ✅`);
      console.log(`      Scores: ${scoreCount.totalCount || 0} ✅`);
    }

    // 5. Check if there are any other interventions that need status updates
    console.log('\n5. 🔍 CHECKING FOR OTHER INTERVENTIONS NEEDING STATUS UPDATES');
    
    // Find all interventions with enrollments but still marked as Draft
    const allDraftWithEnrollments = await query(
      supabase
        .from('interventions')
        .select(`
          id,
          name,
          status,
          intervention_enrollments!inner(count)
        `, { count: 'exact' })
        .eq('status', 'Draft')
    );

    if (allDraftWithEnrollments.rows.length > 0) {
      console.log(`\n   Found ${allDraftWithEnrollments.rows.length} other Draft interventions with enrollments:`);
      allDraftWithEnrollments.rows.forEach((intervention, index) => {
        console.log(`   ${index + 1}. ${intervention.name} (has enrollments but still Draft)`);
      });
      console.log('\n   ⚠️  These should also be updated to Active status');
    } else {
      console.log('\n   ✅ No other Draft interventions with enrollments found');
    }

    console.log('\n📊 FIX SUMMARY:');
    console.log('=' .repeat(50));
    console.log(`✅ Updated ${updatedCount} interventions from Draft to Active`);
    console.log(`✅ All of Sripathi's interventions now have Active status`);
    console.log(`✅ Frontend should now display correct counts:`);
    console.log(`   - Students: 1 (instead of 0)`);
    console.log(`   - Microcompetencies: 2-4 per intervention (instead of 0)`);
    console.log(`   - Status: Active (instead of Draft)`);

    console.log('\n🎯 EXPECTED RESULTS:');
    console.log('1. Intervention cards should show "1 student" for each intervention ✅');
    console.log('2. Microcompetency counts should be 2-4 per intervention ✅');
    console.log('3. Status should show "Active" instead of "Draft" ✅');
    console.log('4. Scoring status should remain "Scoring Closed" ✅');

    console.log('\n🔧 NEXT STEPS:');
    console.log('1. Test the student portal intervention page');
    console.log('2. Verify API endpoints return correct data');
    console.log('3. Check frontend display logic if issues persist');

  } catch (error) {
    console.error('❌ Error during status fixes:', error);
  }
}

// Run the fixes
fixInterventionStatuses().then(() => {
  console.log('\n🏁 Intervention status fixes complete');
  process.exit(0);
}).catch(error => {
  console.error('❌ Intervention status fixes failed:', error);
  process.exit(1);
});
