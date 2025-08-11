const { supabase, query } = require('./src/config/supabase');

async function debugAPITermFiltering() {
  console.log('🔍 Debugging API Term Filtering Issue');
  console.log('=' .repeat(80));

  try {
    // Student details
    const studentId = '1fd449cd-d3f6-4343-8298-f6e7392f2941';
    const currentTermId = '62cbc472-9175-4c95-b9f7-3fb0e2abca2f';
    
    console.log(`\nDebugging for: Sripathi Kanyaboina`);
    console.log(`Student ID: ${studentId}`);
    console.log(`Expected Current Term: ${currentTermId}`);

    // 1. Check all intervention enrollments for Sripathi (no filtering)
    console.log('\n1. 📊 ALL INTERVENTION ENROLLMENTS FOR SRIPATHI');
    
    const allEnrollments = await query(
      supabase
        .from('intervention_enrollments')
        .select(`
          *,
          interventions:intervention_id(id, name, status, term_id)
        `)
        .eq('student_id', studentId)
    );

    console.log(`Found ${allEnrollments.rows.length} total enrollments:`);
    allEnrollments.rows.forEach((enrollment, index) => {
      console.log(`  ${index + 1}. ${enrollment.interventions?.name || 'Unknown'}`);
      console.log(`     Intervention ID: ${enrollment.intervention_id}`);
      console.log(`     Enrollment Status: ${enrollment.enrollment_status}`);
      console.log(`     Intervention Status: ${enrollment.interventions?.status}`);
      console.log(`     Term ID: ${enrollment.interventions?.term_id || 'NULL'}`);
      console.log(`     Expected Term: ${currentTermId}`);
      console.log(`     Term Match: ${enrollment.interventions?.term_id === currentTermId ? '✅' : '❌'}`);
    });

    // 2. Check what the current term actually is
    console.log('\n2. 🗓️ CHECKING CURRENT TERM');
    
    const currentTermResult = await query(
      supabase
        .from('terms')
        .select('*')
        .eq('is_current', true)
    );

    if (currentTermResult.rows.length > 0) {
      const actualCurrentTerm = currentTermResult.rows[0];
      console.log(`✅ Current term found: ${actualCurrentTerm.name}`);
      console.log(`   ID: ${actualCurrentTerm.id}`);
      console.log(`   Expected ID: ${currentTermId}`);
      console.log(`   Match: ${actualCurrentTerm.id === currentTermId ? '✅' : '❌'}`);
      
      if (actualCurrentTerm.id !== currentTermId) {
        console.log(`   ⚠️  MISMATCH! Using wrong term ID in tests`);
      }
    } else {
      console.log(`❌ No current term found`);
    }

    // 3. Check intervention term assignments
    console.log('\n3. 🎯 CHECKING INTERVENTION TERM ASSIGNMENTS');
    
    const interventionIds = allEnrollments.rows.map(e => e.intervention_id);
    
    for (const interventionId of interventionIds) {
      const intervention = allEnrollments.rows.find(e => e.intervention_id === interventionId)?.interventions;
      
      console.log(`\n   ${intervention?.name || 'Unknown'}:`);
      console.log(`   Intervention Term ID: ${intervention?.term_id || 'NULL'}`);
      console.log(`   Current Term ID: ${currentTermId}`);
      
      if (!intervention?.term_id) {
        console.log(`   ❌ Intervention has no term assigned!`);
      } else if (intervention.term_id !== currentTermId) {
        console.log(`   ❌ Intervention is in different term`);
        
        // Get the actual term name
        const termResult = await query(
          supabase
            .from('terms')
            .select('name, is_current')
            .eq('id', intervention.term_id)
        );
        
        if (termResult.rows.length > 0) {
          const term = termResult.rows[0];
          console.log(`   Intervention is in: ${term.name} (Current: ${term.is_current})`);
        }
      } else {
        console.log(`   ✅ Intervention is in current term`);
      }
    }

    // 4. Test API query without term filtering
    console.log('\n4. 🧪 TESTING API QUERY WITHOUT TERM FILTERING');
    
    const noTermFilterQuery = supabase
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

    const noTermFilterResult = await query(noTermFilterQuery);
    
    console.log(`Without term filtering: ${noTermFilterResult.rows.length} results`);
    
    // 5. Test API query with term filtering
    console.log('\n5. 🧪 TESTING API QUERY WITH TERM FILTERING');
    
    const withTermFilterQuery = supabase
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
      .in('enrollment_status', ['Enrolled', 'Completed'])
      .eq('interventions.term_id', currentTermId);

    const withTermFilterResult = await query(withTermFilterQuery);
    
    console.log(`With term filtering: ${withTermFilterResult.rows.length} results`);

    // 6. Fix the term assignment if needed
    console.log('\n6. 🔧 CHECKING IF INTERVENTIONS NEED TERM ASSIGNMENT');
    
    const interventionsNeedingTermUpdate = [];
    
    for (const enrollment of allEnrollments.rows) {
      const intervention = enrollment.interventions;
      if (!intervention?.term_id || intervention.term_id !== currentTermId) {
        interventionsNeedingTermUpdate.push({
          id: intervention?.id,
          name: intervention?.name,
          currentTermId: intervention?.term_id,
          needsTermId: currentTermId
        });
      }
    }

    if (interventionsNeedingTermUpdate.length > 0) {
      console.log(`\n   Found ${interventionsNeedingTermUpdate.length} interventions needing term update:`);
      interventionsNeedingTermUpdate.forEach((intervention, index) => {
        console.log(`   ${index + 1}. ${intervention.name}`);
        console.log(`      Current Term: ${intervention.currentTermId || 'NULL'}`);
        console.log(`      Needs Term: ${intervention.needsTermId}`);
      });
      
      console.log('\n   🔧 UPDATING INTERVENTION TERM ASSIGNMENTS');
      
      for (const intervention of interventionsNeedingTermUpdate) {
        const updateResult = await query(
          supabase
            .from('interventions')
            .update({
              term_id: currentTermId,
              updated_at: new Date().toISOString()
            })
            .eq('id', intervention.id)
            .select('*')
        );

        if (updateResult.rows.length > 0) {
          console.log(`   ✅ Updated ${intervention.name} to current term`);
        } else {
          console.log(`   ❌ Failed to update ${intervention.name}`);
        }
      }
    } else {
      console.log(`   ✅ All interventions are already in the current term`);
    }

    // 7. Test API again after fixes
    console.log('\n7. 🧪 TESTING API AFTER TERM FIXES');
    
    const finalTestQuery = supabase
      .from('intervention_enrollments')
      .select(`
        enrollment_date,
        completion_percentage,
        current_score,
        enrollment_status,
        interventions!inner(
          id,
          name,
          status,
          term_id
        )
      `)
      .eq('student_id', studentId)
      .in('enrollment_status', ['Enrolled', 'Completed'])
      .eq('interventions.term_id', currentTermId);

    const finalTestResult = await query(finalTestQuery);
    
    console.log(`Final API test: ${finalTestResult.rows.length} results`);
    
    if (finalTestResult.rows.length > 0) {
      console.log('✅ API should now return intervention data');
      finalTestResult.rows.forEach((enrollment, index) => {
        console.log(`  ${index + 1}. ${enrollment.interventions?.name} (${enrollment.interventions?.status})`);
      });
    } else {
      console.log('❌ API still returns no results - further investigation needed');
    }

    console.log('\n📊 DEBUGGING SUMMARY:');
    console.log('=' .repeat(50));
    console.log(`✅ Found ${allEnrollments.rows.length} total enrollments for Sripathi`);
    console.log(`🔧 ${interventionsNeedingTermUpdate.length} interventions needed term assignment updates`);
    console.log(`📡 API should now return ${finalTestResult.rows.length} interventions`);

  } catch (error) {
    console.error('❌ Error during debugging:', error);
  }
}

// Run the debugging
debugAPITermFiltering().then(() => {
  console.log('\n🏁 API term filtering debug complete');
  process.exit(0);
}).catch(error => {
  console.error('❌ API term filtering debug failed:', error);
  process.exit(1);
});
