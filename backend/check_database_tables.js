const { supabase, query } = require('./src/config/supabase');

async function checkDatabaseTables() {
  console.log('🔍 Checking Database Tables and Schema');
  console.log('=' .repeat(80));

  try {
    // Student details
    const userId = '5810adc8-17ee-461e-ba03-2336470daf80';
    const studentId = '1fd449cd-d3f6-4343-8298-f6e7392f2941';
    
    console.log(`\nStudent: Sripathi Kanyaboina`);
    console.log(`User ID: ${userId}`);
    console.log(`Student ID: ${studentId}`);

    // 1. Check intervention_enrollments table structure
    console.log('\n1. Checking intervention_enrollments table...');
    const enrollmentResult = await query(
      supabase
        .from('intervention_enrollments')
        .select('*')
        .eq('student_id', studentId)
        .limit(5)
    );

    console.log(`Found ${enrollmentResult.rows.length} intervention enrollments`);
    if (enrollmentResult.rows.length > 0) {
      console.log('Sample enrollment record:');
      console.log(JSON.stringify(enrollmentResult.rows[0], null, 2));
    }

    // 2. Check microcompetency_scores table
    console.log('\n2. Checking microcompetency_scores table...');
    try {
      const microScoresResult = await query(
        supabase
          .from('microcompetency_scores')
          .select('*')
          .eq('student_id', studentId)
          .limit(5)
      );

      console.log(`Found ${microScoresResult.rows.length} microcompetency scores`);
      if (microScoresResult.rows.length > 0) {
        console.log('Sample microcompetency score:');
        console.log(JSON.stringify(microScoresResult.rows[0], null, 2));
      }
    } catch (error) {
      console.log('   microcompetency_scores table not found or accessible');
    }

    // 3. Check direct_assessments table
    console.log('\n3. Checking direct_assessments table...');
    try {
      const assessmentResult = await query(
        supabase
          .from('direct_assessments')
          .select('*')
          .eq('student_id', studentId)
          .limit(5)
      );

      console.log(`Found ${assessmentResult.rows.length} direct assessments`);
      if (assessmentResult.rows.length > 0) {
        console.log('Sample direct assessment:');
        console.log(JSON.stringify(assessmentResult.rows[0], null, 2));
      }
    } catch (error) {
      console.log('   direct_assessments table not found or accessible');
    }

    // 4. Check task_submissions table
    console.log('\n4. Checking task_submissions table...');
    const submissionResult = await query(
      supabase
        .from('task_submissions')
        .select('*')
        .eq('student_id', studentId)
        .limit(5)
    );

    console.log(`Found ${submissionResult.rows.length} task submissions`);
    if (submissionResult.rows.length > 0) {
      console.log('Sample task submission:');
      console.log(JSON.stringify(submissionResult.rows[0], null, 2));
    }

    // 5. Check scores table in detail
    console.log('\n5. Checking scores table in detail...');
    const scoresResult = await query(
      supabase
        .from('scores')
        .select('*')
        .eq('student_id', studentId)
        .limit(3)
    );

    console.log(`Found ${scoresResult.rows.length} score records`);
    if (scoresResult.rows.length > 0) {
      console.log('Sample score record:');
      console.log(JSON.stringify(scoresResult.rows[0], null, 2));
    }

    // 6. Check student_terms table
    console.log('\n6. Checking student_terms table...');
    try {
      const studentTermsResult = await query(
        supabase
          .from('student_terms')
          .select('*')
          .eq('student_id', studentId)
      );

      console.log(`Found ${studentTermsResult.rows.length} student term records`);
      if (studentTermsResult.rows.length > 0) {
        console.log('Sample student term record:');
        console.log(JSON.stringify(studentTermsResult.rows[0], null, 2));
      }
    } catch (error) {
      console.log('   student_terms table not found or accessible');
    }

    // 7. Check current term
    console.log('\n7. Checking current term...');
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

    // 8. Check if there are any other score-related tables
    console.log('\n8. Checking for other potential score tables...');
    
    // Try different possible table names
    const possibleTables = [
      'hps_scores',
      'student_scores', 
      'calculated_scores',
      'performance_scores',
      'unified_scores'
    ];

    for (const tableName of possibleTables) {
      try {
        const result = await query(
          supabase
            .from(tableName)
            .select('*')
            .eq('student_id', studentId)
            .limit(1)
        );
        
        if (result.rows.length > 0) {
          console.log(`   ✅ Found data in ${tableName}:`);
          console.log(JSON.stringify(result.rows[0], null, 2));
        } else {
          console.log(`   📋 ${tableName} exists but no data for this student`);
        }
      } catch (error) {
        console.log(`   ❌ ${tableName} not found`);
      }
    }

    // 9. Check interventions table to see available interventions
    console.log('\n9. Checking available interventions...');
    const interventionsResult = await query(
      supabase
        .from('interventions')
        .select('id, name, status, start_date, end_date')
        .eq('status', 'Active')
        .limit(5)
    );

    console.log(`Found ${interventionsResult.rows.length} active interventions`);
    interventionsResult.rows.forEach((intervention, index) => {
      console.log(`  ${index + 1}. ${intervention.name} (${intervention.status})`);
      console.log(`     Dates: ${intervention.start_date} to ${intervention.end_date}`);
    });

  } catch (error) {
    console.error('❌ Error during table checking:', error);
  }
}

// Run the function
checkDatabaseTables().then(() => {
  console.log('\n🏁 Database table check complete');
  process.exit(0);
}).catch(error => {
  console.error('❌ Database table check failed:', error);
  process.exit(1);
});
