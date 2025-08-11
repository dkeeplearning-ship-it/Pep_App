const { supabase, query } = require('./src/config/supabase');

async function debugStudentSripathiFixed() {
  console.log('🔍 Debugging Student Sripathi (email: sripathi@e.com) - Fixed');
  console.log('=' .repeat(80));

  try {
    // Student details from previous run
    const userId = '5810adc8-17ee-461e-ba03-2336470daf80';
    const studentId = '1fd449cd-d3f6-4343-8298-f6e7392f2941';
    
    console.log(`\nStudent: Sripathi Kanyaboina`);
    console.log(`User ID: ${userId}`);
    console.log(`Student ID: ${studentId}`);
    console.log(`Registration: 2022OCTVUGP0003`);

    // 1. Check scores table (corrected table name)
    console.log('\n1. Checking scores table...');
    const scoresResult = await query(
      supabase
        .from('scores')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
    );

    console.log(`Found ${scoresResult.rows.length} score records`);
    scoresResult.rows.forEach((score, index) => {
      console.log(`  ${index + 1}. Total Score: ${score.total_score || 'N/A'}`);
      console.log(`     Q1: ${score.q1_score || 0}, Q2: ${score.q2_score || 0}, Q3: ${score.q3_score || 0}, Q4: ${score.q4_score || 0}`);
      console.log(`     HPS Score: ${score.hps_score || 'N/A'}`);
      console.log(`     Created: ${score.created_at}`);
    });

    // 2. Check intervention enrollments
    console.log('\n2. Checking intervention enrollments...');
    const enrollmentResult = await query(
      supabase
        .from('student_intervention_enrollments')
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

    // 3. Check direct assessments
    console.log('\n3. Checking direct assessments...');
    const assessmentResult = await query(
      supabase
        .from('direct_assessments')
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
        .order('assessment_date', { ascending: false })
        .limit(10)
    );

    console.log(`Found ${assessmentResult.rows.length} direct assessments`);
    assessmentResult.rows.forEach((assessment, index) => {
      const quadrant = assessment.microcompetencies?.components?.sub_categories?.quadrants;
      console.log(`  ${index + 1}. ${assessment.microcompetencies?.name || 'Unknown'}`);
      console.log(`     Score: ${assessment.score}/${assessment.max_score}`);
      console.log(`     Quadrant: ${quadrant?.name || 'Unknown'} (${quadrant?.id || 'Unknown'})`);
      console.log(`     Date: ${assessment.assessment_date}`);
    });

    // 4. Check current term
    console.log('\n4. Checking current term...');
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

    // 5. Check quadrant-specific score calculations
    console.log('\n5. Checking quadrant-specific score calculations...');
    const quadrants = ['Q1', 'Q2', 'Q3', 'Q4'];
    
    for (const quadrantId of quadrants) {
      const quadrantAssessments = await query(
        supabase
          .from('direct_assessments')
          .select(`
            score,
            max_score,
            microcompetencies:microcompetency_id(
              components:component_id(
                sub_categories:sub_category_id(
                  quadrants:quadrant_id(id, name)
                )
              )
            )
          `)
          .eq('student_id', studentId)
      );

      const quadrantScores = quadrantAssessments.rows.filter(assessment => {
        const quadrant = assessment.microcompetencies?.components?.sub_categories?.quadrants;
        return quadrant?.id === quadrantId;
      });

      if (quadrantScores.length > 0) {
        const totalScore = quadrantScores.reduce((sum, assessment) => sum + assessment.score, 0);
        const totalMaxScore = quadrantScores.reduce((sum, assessment) => sum + assessment.max_score, 0);
        const percentage = totalMaxScore > 0 ? (totalScore / totalMaxScore * 100).toFixed(1) : 0;
        
        console.log(`   ${quadrantId}: ${quadrantScores.length} assessments, ${totalScore}/${totalMaxScore} (${percentage}%)`);
      } else {
        console.log(`   ${quadrantId}: No assessments found`);
      }
    }

    // 6. Check task submissions
    console.log('\n6. Checking task submissions...');
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

    // 7. Check student batch and section info
    console.log('\n7. Checking student batch and section info...');
    const studentDetails = await query(
      supabase
        .from('students')
        .select(`
          *,
          batches:batch_id(id, name, year),
          sections:section_id(id, name),
          houses:house_id(id, name, color)
        `)
        .eq('id', studentId)
    );

    if (studentDetails.rows.length > 0) {
      const student = studentDetails.rows[0];
      console.log(`   Batch: ${student.batches?.name || 'Not assigned'} (${student.batches?.year || 'N/A'})`);
      console.log(`   Section: ${student.sections?.name || 'Not assigned'}`);
      console.log(`   House: ${student.houses?.name || 'Not assigned'} (${student.houses?.color || 'N/A'})`);
    }

    // 8. Summary and issue identification
    console.log('\n📊 ISSUE ANALYSIS:');
    console.log('=' .repeat(50));
    
    const hasScores = scoresResult.rows.length > 0;
    const hasEnrollments = enrollmentResult.rows.length > 0;
    const hasAssessments = assessmentResult.rows.length > 0;
    const hasSubmissions = submissionResult.rows.length > 0;
    
    console.log(`✅ Student exists: Sripathi Kanyaboina`);
    console.log(`${hasScores ? '✅' : '❌'} HPS/Score records: ${scoresResult.rows.length}`);
    console.log(`${hasEnrollments ? '✅' : '❌'} Intervention enrollments: ${enrollmentResult.rows.length}`);
    console.log(`${hasAssessments ? '✅' : '❌'} Direct assessments: ${assessmentResult.rows.length}`);
    console.log(`${hasSubmissions ? '✅' : '❌'} Task submissions: ${submissionResult.rows.length}`);

    // Identify specific issues
    console.log('\n🔍 IDENTIFIED ISSUES:');
    if (hasScores && scoresResult.rows[0]?.hps_score) {
      console.log(`⚠️  HPS Score exists (${scoresResult.rows[0].hps_score}) but individual quadrant scores may be inconsistent`);
    }
    if (!hasEnrollments) {
      console.log('❌ No intervention enrollments found - explains "no intervention enrollment in current term"');
    }
    if (!hasAssessments) {
      console.log('❌ No direct assessments found - explains "0 scores" in quadrant pages');
    }
    if (hasScores && !hasAssessments) {
      console.log('⚠️  Score records exist without underlying assessment data - data inconsistency');
    }

  } catch (error) {
    console.error('❌ Error during debugging:', error);
  }
}

// Run the debug function
debugStudentSripathiFixed().then(() => {
  console.log('\n🏁 Debug complete');
  process.exit(0);
}).catch(error => {
  console.error('❌ Debug failed:', error);
  process.exit(1);
});
