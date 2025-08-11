const { supabase, query } = require('./src/config/supabase');

async function debugStudentSripathi() {
  console.log('🔍 Debugging Student Sripathi (email: sripathi@e.com)');
  console.log('=' .repeat(80));

  try {
    // 1. Check if user exists with the email
    console.log('\n1. Checking user record...');
    const userResult = await query(
      supabase
        .from('users')
        .select('*')
        .eq('email', 'sripathi@e.com')
    );
    
    if (userResult.rows.length === 0) {
      console.log('❌ User not found with email sripathi@e.com');
      
      // Search for similar emails
      const similarUsers = await query(
        supabase
          .from('users')
          .select('*')
          .ilike('email', '%sripathi%')
      );
      
      console.log(`Found ${similarUsers.rows.length} users with similar emails:`);
      similarUsers.rows.forEach((user, index) => {
        console.log(`  ${index + 1}. ${user.email} (ID: ${user.id}, Role: ${user.role})`);
      });
      
      return;
    }

    const user = userResult.rows[0];
    console.log('✅ User found:', user.email);
    console.log(`   User ID: ${user.id}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Username: ${user.username}`);

    // 2. Check if student record exists
    console.log('\n2. Checking student record...');
    const studentResult = await query(
      supabase
        .from('students')
        .select('*')
        .eq('user_id', user.id)
    );

    if (studentResult.rows.length === 0) {
      console.log('❌ Student record not found!');
      return;
    }

    const student = studentResult.rows[0];
    console.log('✅ Student found:', student.name);
    console.log(`   Student ID: ${student.id}`);
    console.log(`   Registration No: ${student.registration_no}`);
    console.log(`   Course: ${student.course}`);
    console.log(`   Overall Score: ${student.overall_score}`);
    console.log(`   Grade: ${student.grade}`);
    console.log(`   Status: ${student.status}`);

    // 3. Check HPS scores
    console.log('\n3. Checking HPS scores...');
    const hpsResult = await query(
      supabase
        .from('hps_scores')
        .select('*')
        .eq('student_id', student.id)
        .order('calculated_at', { ascending: false })
    );

    console.log(`Found ${hpsResult.rows.length} HPS score records`);
    hpsResult.rows.forEach((hps, index) => {
      console.log(`  ${index + 1}. Total Score: ${hps.total_score}/100`);
      console.log(`     Q1: ${hps.q1_score}, Q2: ${hps.q2_score}, Q3: ${hps.q3_score}, Q4: ${hps.q4_score}`);
      console.log(`     Calculated: ${hps.calculated_at}`);
      console.log(`     Term: ${hps.term_id || 'Not specified'}`);
    });

    // 4. Check intervention enrollments
    console.log('\n4. Checking intervention enrollments...');
    const enrollmentResult = await query(
      supabase
        .from('student_intervention_enrollments')
        .select(`
          *,
          interventions:intervention_id(id, name, status, start_date, end_date, term_id),
          terms:term_id(id, name, is_current)
        `)
        .eq('student_id', student.id)
    );

    console.log(`Found ${enrollmentResult.rows.length} intervention enrollments`);
    enrollmentResult.rows.forEach((enrollment, index) => {
      console.log(`  ${index + 1}. Intervention: ${enrollment.interventions?.name || 'Unknown'}`);
      console.log(`     Status: ${enrollment.enrollment_status}`);
      console.log(`     Progress: ${enrollment.progress_percentage}%`);
      console.log(`     Enrolled: ${enrollment.enrolled_at}`);
      console.log(`     Term: ${enrollment.terms?.name || 'Unknown'} (Current: ${enrollment.terms?.is_current || false})`);
    });

    // 5. Check direct assessments
    console.log('\n5. Checking direct assessments...');
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
        .eq('student_id', student.id)
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

    // 6. Check current term
    console.log('\n6. Checking current term...');
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

    // 7. Check quadrant-specific scores
    console.log('\n7. Checking quadrant-specific score calculations...');
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
          .eq('student_id', student.id)
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

    // 8. Summary
    console.log('\n📊 SUMMARY:');
    console.log('=' .repeat(50));
    console.log(`✅ Student: ${student.name} (${student.registration_no})`);
    console.log(`✅ User ID: ${user.id}`);
    console.log(`✅ Student ID: ${student.id}`);
    console.log(`✅ HPS Records: ${hpsResult.rows.length}`);
    console.log(`✅ Intervention Enrollments: ${enrollmentResult.rows.length}`);
    console.log(`✅ Direct Assessments: ${assessmentResult.rows.length}`);
    
    if (hpsResult.rows.length > 0) {
      const latestHPS = hpsResult.rows[0];
      console.log(`✅ Latest HPS Score: ${latestHPS.total_score}/100`);
      console.log(`   Q1: ${latestHPS.q1_score}, Q2: ${latestHPS.q2_score}, Q3: ${latestHPS.q3_score}, Q4: ${latestHPS.q4_score}`);
    }

  } catch (error) {
    console.error('❌ Error during debugging:', error);
  }
}

// Run the debug function
debugStudentSripathi().then(() => {
  console.log('\n🏁 Debug complete');
  process.exit(0);
}).catch(error => {
  console.error('❌ Debug failed:', error);
  process.exit(1);
});
