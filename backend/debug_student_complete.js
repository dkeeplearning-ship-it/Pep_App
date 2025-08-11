const { supabase, query } = require('./src/config/supabase');

async function debugStudentComplete() {
  console.log('🔍 Complete Student Sripathi Analysis');
  console.log('=' .repeat(80));

  try {
    // Student details
    const userId = '5810adc8-17ee-461e-ba03-2336470daf80';
    const studentId = '1fd449cd-d3f6-4343-8298-f6e7392f2941';
    
    console.log(`\nStudent: Sripathi Kanyaboina`);
    console.log(`User ID: ${userId}`);
    console.log(`Student ID: ${studentId}`);
    console.log(`Registration: 2022OCTVUGP0003`);

    // 1. Check scores table with detailed analysis
    console.log('\n1. Analyzing scores table...');
    const scoresResult = await query(
      supabase
        .from('scores')
        .select(`
          *,
          components:component_id(
            id, name, category,
            sub_categories:sub_category_id(
              name,
              quadrants:quadrant_id(id, name)
            )
          )
        `)
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
    );

    console.log(`Found ${scoresResult.rows.length} score records`);
    
    // Group scores by quadrant
    const quadrantScores = { Q1: [], Q2: [], Q3: [], Q4: [] };
    scoresResult.rows.forEach(score => {
      const quadrant = score.components?.sub_categories?.quadrants;
      if (quadrant && quadrantScores[quadrant.id]) {
        quadrantScores[quadrant.id].push(score);
      }
    });

    Object.entries(quadrantScores).forEach(([quadrantId, scores]) => {
      console.log(`   ${quadrantId}: ${scores.length} scores`);
      if (scores.length > 0) {
        const totalObtained = scores.reduce((sum, s) => sum + (s.obtained_score || 0), 0);
        const totalMax = scores.reduce((sum, s) => sum + (s.max_score || 0), 0);
        const percentage = totalMax > 0 ? (totalObtained / totalMax * 100).toFixed(1) : 0;
        console.log(`      Total: ${totalObtained}/${totalMax} (${percentage}%)`);
      }
    });

    // 2. Check intervention enrollments (correct table name)
    console.log('\n2. Checking intervention enrollments...');
    const enrollmentResult = await query(
      supabase
        .from('intervention_enrollments')
        .select(`
          *,
          interventions:intervention_id(id, name, status, start_date, end_date, term_id),
          terms:term_id(id, name, is_current)
        `)
        .eq('student_id', studentId)
    );

    console.log(`Found ${enrollmentResult.rows.length} intervention enrollments`);
    enrollmentResult.rows.forEach((enrollment, index) => {
      console.log(`  ${index + 1}. Intervention: ${enrollment.interventions?.name || 'Unknown'}`);
      console.log(`     Status: ${enrollment.enrollment_status}`);
      console.log(`     Progress: ${enrollment.progress_percentage}%`);
      console.log(`     Enrolled: ${enrollment.enrolled_at}`);
      console.log(`     Term: ${enrollment.terms?.name || 'Unknown'} (Current: ${enrollment.terms?.is_current || false})`);
    });

    // 3. Check microcompetency scores
    console.log('\n3. Checking microcompetency scores...');
    const microScoresResult = await query(
      supabase
        .from('microcompetency_scores')
        .select(`
          *,
          microcompetencies:microcompetency_id(
            id, name, max_score,
            components:component_id(
              name,
              sub_categories:sub_category_id(
                name,
                quadrants:quadrant_id(id, name)
              )
            )
          )
        `)
        .eq('student_id', studentId)
        .order('scored_at', { ascending: false })
        .limit(10)
    );

    console.log(`Found ${microScoresResult.rows.length} microcompetency scores`);
    microScoresResult.rows.forEach((score, index) => {
      const quadrant = score.microcompetencies?.components?.sub_categories?.quadrants;
      console.log(`  ${index + 1}. ${score.microcompetencies?.name || 'Unknown'}`);
      console.log(`     Score: ${score.obtained_score}/${score.max_score} (${score.percentage}%)`);
      console.log(`     Quadrant: ${quadrant?.name || 'Unknown'} (${quadrant?.id || 'Unknown'})`);
      console.log(`     Date: ${score.scored_at}`);
    });

    // 4. Check task submissions
    console.log('\n4. Checking task submissions...');
    const submissionResult = await query(
      supabase
        .from('task_submissions')
        .select(`
          *,
          tasks:task_id(
            id, name, max_score,
            interventions:intervention_id(name)
          )
        `)
        .eq('student_id', studentId)
        .order('submitted_at', { ascending: false })
        .limit(10)
    );

    console.log(`Found ${submissionResult.rows.length} task submissions`);
    submissionResult.rows.forEach((submission, index) => {
      console.log(`  ${index + 1}. Task: ${submission.tasks?.name || 'Unknown'}`);
      console.log(`     Score: ${submission.score || 'Not graded'}/${submission.tasks?.max_score || 'Unknown'}`);
      console.log(`     Status: ${submission.status}`);
      console.log(`     Intervention: ${submission.tasks?.interventions?.name || 'Unknown'}`);
      console.log(`     Submitted: ${submission.submitted_at}`);
    });

    // 5. Check current term and student term enrollment
    console.log('\n5. Checking current term and student enrollment...');
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

      // Check if student is enrolled in current term
      const studentTermResult = await query(
        supabase
          .from('student_terms')
          .select('*')
          .eq('student_id', studentId)
          .eq('term_id', currentTerm.id)
      );

      if (studentTermResult.rows.length > 0) {
        const studentTerm = studentTermResult.rows[0];
        console.log(`✅ Student enrolled in current term`);
        console.log(`   Status: ${studentTerm.enrollment_status}`);
        console.log(`   Total Score: ${studentTerm.total_score}`);
        console.log(`   Grade: ${studentTerm.grade}`);
      } else {
        console.log(`❌ Student NOT enrolled in current term`);
      }
    } else {
      console.log('❌ No current term found');
    }

    // 6. Check if there's any HPS calculation data
    console.log('\n6. Checking for HPS calculation data...');
    
    // Check if there are any calculated HPS scores in a separate table
    try {
      const hpsCalculationResult = await query(
        supabase
          .from('hps_calculations')
          .select('*')
          .eq('student_id', studentId)
          .order('calculated_at', { ascending: false })
          .limit(5)
      );
      
      console.log(`Found ${hpsCalculationResult.rows.length} HPS calculations`);
      hpsCalculationResult.rows.forEach((calc, index) => {
        console.log(`  ${index + 1}. HPS Score: ${calc.total_hps || calc.hps_score || 'N/A'}`);
        console.log(`     Q1: ${calc.q1_score || 0}, Q2: ${calc.q2_score || 0}, Q3: ${calc.q3_score || 0}, Q4: ${calc.q4_score || 0}`);
        console.log(`     Calculated: ${calc.calculated_at}`);
      });
    } catch (error) {
      console.log('   No HPS calculations table found or accessible');
    }

    // 7. Check student's current term assignment
    console.log('\n7. Checking student current term assignment...');
    const studentDetailsResult = await query(
      supabase
        .from('students')
        .select(`
          *,
          terms:current_term_id(id, name, is_current)
        `)
        .eq('id', studentId)
    );

    if (studentDetailsResult.rows.length > 0) {
      const student = studentDetailsResult.rows[0];
      console.log(`   Student current term: ${student.terms?.name || 'Not assigned'}`);
      console.log(`   Is current: ${student.terms?.is_current || false}`);
      console.log(`   Overall score: ${student.overall_score}`);
    }

    // 8. Summary and issue identification
    console.log('\n📊 COMPREHENSIVE ISSUE ANALYSIS:');
    console.log('=' .repeat(50));
    
    const hasScores = scoresResult.rows.length > 0;
    const hasEnrollments = enrollmentResult.rows.length > 0;
    const hasMicroScores = microScoresResult.rows.length > 0;
    const hasSubmissions = submissionResult.rows.length > 0;
    
    console.log(`✅ Student exists: Sripathi Kanyaboina`);
    console.log(`${hasScores ? '✅' : '❌'} Score records: ${scoresResult.rows.length}`);
    console.log(`${hasEnrollments ? '✅' : '❌'} Intervention enrollments: ${enrollmentResult.rows.length}`);
    console.log(`${hasMicroScores ? '✅' : '❌'} Microcompetency scores: ${microScoresResult.rows.length}`);
    console.log(`${hasSubmissions ? '✅' : '❌'} Task submissions: ${submissionResult.rows.length}`);

    // Identify specific issues based on your report
    console.log('\n🔍 SPECIFIC ISSUES IDENTIFIED:');
    
    if (hasScores) {
      const nonZeroScores = scoresResult.rows.filter(s => s.obtained_score > 0);
      if (nonZeroScores.length === 0) {
        console.log('❌ All score records show 0 - explains "individual quadrant pages show 0 scores"');
      } else {
        console.log(`⚠️  ${nonZeroScores.length}/${scoresResult.rows.length} scores are non-zero`);
      }
    }
    
    if (!hasEnrollments) {
      console.log('❌ No intervention enrollments - explains "no intervention enrollment in current term"');
    }
    
    if (hasScores && !hasMicroScores) {
      console.log('⚠️  Has score records but no microcompetency scores - potential data inconsistency');
    }

    console.log('\n🎯 DASHBOARD DISCREPANCY:');
    console.log('   You reported: Dashboard shows HPS score of 82.3/100');
    console.log('   Database shows: All scores are 0');
    console.log('   → This suggests the dashboard is either:');
    console.log('     1. Reading from a different data source');
    console.log('     2. Using cached/calculated data not in these tables');
    console.log('     3. Showing sample/demo data');

  } catch (error) {
    console.error('❌ Error during complete analysis:', error);
  }
}

// Run the debug function
debugStudentComplete().then(() => {
  console.log('\n🏁 Complete analysis finished');
  process.exit(0);
}).catch(error => {
  console.error('❌ Complete analysis failed:', error);
  process.exit(1);
});
