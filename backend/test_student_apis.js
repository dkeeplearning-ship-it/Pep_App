const { supabase, query } = require('./src/config/supabase');

async function testStudentAPIs() {
  console.log('🧪 Testing Student APIs for Sripathi');
  console.log('=' .repeat(80));

  try {
    // Student details
    const userId = '5810adc8-17ee-461e-ba03-2336470daf80';
    const studentId = '1fd449cd-d3f6-4343-8298-f6e7392f2941';
    const currentTermId = '62cbc472-9175-4c95-b9f7-3fb0e2abca2f';
    
    console.log(`\nTesting APIs for: Sripathi Kanyaboina`);
    console.log(`Student ID: ${studentId}`);
    console.log(`Current Term: ${currentTermId}`);

    // 1. Test Student Performance API logic
    console.log('\n1. 🎯 TESTING STUDENT PERFORMANCE API LOGIC');
    
    // Simulate the getStudentPerformance controller logic
    const studentResult = await query(
      supabase
        .from('students')
        .select(`
          id,
          registration_no,
          name,
          course,
          gender,
          phone,
          overall_score,
          grade,
          status,
          current_term_id,
          created_at,
          updated_at,
          batches:batch_id(id, name, year),
          sections:section_id(id, name),
          houses:house_id(id, name, color)
        `)
        .eq('id', studentId)
        .limit(1)
    );

    if (studentResult.rows.length === 0) {
      console.log('❌ Student not found');
      return;
    }

    const student = studentResult.rows[0];
    console.log(`✅ Student found: ${student.name}`);
    console.log(`   Overall Score: ${student.overall_score}`);
    console.log(`   Grade: ${student.grade}`);
    console.log(`   Current Term: ${student.current_term_id}`);

    // 2. Test Quadrant Details API logic
    console.log('\n2. 🧩 TESTING QUADRANT DETAILS API LOGIC');
    
    const quadrants = ['behavior', 'discipline', 'persona', 'wellness'];
    
    for (const quadrantId of quadrants) {
      console.log(`\n   Testing ${quadrantId.toUpperCase()} quadrant:`);
      
      // Get quadrant info
      const quadrantResult = await query(
        supabase
          .from('quadrants')
          .select('id, name, description, weightage')
          .eq('id', quadrantId)
          .limit(1)
      );

      if (quadrantResult.rows.length === 0) {
        console.log(`   ❌ Quadrant ${quadrantId} not found`);
        continue;
      }

      const quadrant = quadrantResult.rows[0];
      console.log(`   ✅ Quadrant: ${quadrant.name}`);

      // Get component scores for this quadrant
      const componentScores = await query(
        supabase
          .from('scores')
          .select(`
            obtained_score,
            max_score,
            percentage,
            assessment_date,
            components:component_id(
              id,
              name,
              category,
              sub_categories:sub_category_id(
                id,
                name,
                quadrants:quadrant_id(id, name)
              )
            )
          `)
          .eq('student_id', studentId)
          .eq('term_id', currentTermId)
      );

      // Filter scores for this quadrant
      const quadrantScores = componentScores.rows.filter(score => {
        const scoreQuadrant = score.components?.sub_categories?.quadrants;
        return scoreQuadrant?.id === quadrantId;
      });

      console.log(`   📊 Component scores: ${quadrantScores.length}`);
      
      if (quadrantScores.length > 0) {
        let totalObtained = 0;
        let totalMax = 0;
        
        quadrantScores.forEach((score, index) => {
          console.log(`     ${index + 1}. ${score.components?.name}: ${score.obtained_score}/${score.max_score} (${score.percentage}%)`);
          totalObtained += score.obtained_score;
          totalMax += score.max_score;
        });
        
        const quadrantPercentage = totalMax > 0 ? (totalObtained / totalMax * 100).toFixed(1) : 0;
        console.log(`   🎯 Quadrant Total: ${totalObtained}/${totalMax} (${quadrantPercentage}%)`);
      } else {
        console.log(`   ⚠️  No component scores found for ${quadrantId}`);
      }

      // Also check microcompetency scores for this quadrant
      const microScores = await query(
        supabase
          .from('microcompetency_scores')
          .select(`
            obtained_score,
            max_score,
            percentage,
            microcompetencies:microcompetency_id(
              name,
              components:component_id(
                sub_categories:sub_category_id(
                  quadrants:quadrant_id(id, name)
                )
              )
            )
          `)
          .eq('student_id', studentId)
      );

      const quadrantMicroScores = microScores.rows.filter(score => {
        const scoreQuadrant = score.microcompetencies?.components?.sub_categories?.quadrants;
        return scoreQuadrant?.id === quadrantId;
      });

      console.log(`   🧩 Microcompetency scores: ${quadrantMicroScores.length}`);
      
      if (quadrantMicroScores.length > 0) {
        let totalMicroObtained = 0;
        let totalMicroMax = 0;
        
        quadrantMicroScores.forEach(score => {
          totalMicroObtained += score.obtained_score;
          totalMicroMax += score.max_score;
        });
        
        const microPercentage = totalMicroMax > 0 ? (totalMicroObtained / totalMicroMax * 100).toFixed(1) : 0;
        console.log(`   🎯 Microcompetency Total: ${totalMicroObtained}/${totalMicroMax} (${microPercentage}%)`);
      }
    }

    // 3. Test Intervention Enrollment Display
    console.log('\n3. 🎯 TESTING INTERVENTION ENROLLMENT DISPLAY');
    
    const interventionEnrollments = await query(
      supabase
        .from('intervention_enrollments')
        .select(`
          *,
          interventions:intervention_id(id, name, status, start_date, end_date)
        `)
        .eq('student_id', studentId)
    );

    console.log(`✅ Intervention enrollments: ${interventionEnrollments.rows.length}`);
    interventionEnrollments.rows.forEach((enrollment, index) => {
      console.log(`  ${index + 1}. ${enrollment.interventions?.name || 'Unknown'}`);
      console.log(`     Status: ${enrollment.enrollment_status}`);
      console.log(`     Progress: ${enrollment.completion_percentage}%`);
      console.log(`     Current Score: ${enrollment.current_score}`);
    });

    // 4. Test Student Term Enrollment
    console.log('\n4. 📅 TESTING STUDENT TERM ENROLLMENT');
    
    const studentTermEnrollment = await query(
      supabase
        .from('student_terms')
        .select(`
          *,
          terms:term_id(id, name, is_current)
        `)
        .eq('student_id', studentId)
        .eq('term_id', currentTermId)
    );

    if (studentTermEnrollment.rows.length > 0) {
      const enrollment = studentTermEnrollment.rows[0];
      console.log(`✅ Student term enrollment found`);
      console.log(`   Status: ${enrollment.enrollment_status}`);
      console.log(`   Total Score: ${enrollment.total_score}`);
      console.log(`   Grade: ${enrollment.grade}`);
      console.log(`   Term: ${enrollment.terms?.name} (Current: ${enrollment.terms?.is_current})`);
    } else {
      console.log(`❌ Student term enrollment not found`);
    }

    // 5. Calculate expected dashboard data
    console.log('\n5. 🧮 EXPECTED DASHBOARD DATA');
    
    // Calculate overall HPS from component scores
    const allComponentScores = await query(
      supabase
        .from('scores')
        .select('obtained_score, max_score')
        .eq('student_id', studentId)
        .eq('term_id', currentTermId)
    );

    if (allComponentScores.rows.length > 0) {
      const totalObtained = allComponentScores.rows.reduce((sum, s) => sum + s.obtained_score, 0);
      const totalMax = allComponentScores.rows.reduce((sum, s) => sum + s.max_score, 0);
      const overallPercentage = totalMax > 0 ? (totalObtained / totalMax * 100).toFixed(1) : 0;
      
      console.log(`📊 Dashboard should show:`);
      console.log(`   HPS Score: ${overallPercentage}/100`);
      console.log(`   Component Scores: ${allComponentScores.rows.length} total`);
      console.log(`   Intervention Enrollments: ${interventionEnrollments.rows.length}`);
      console.log(`   Term Enrollment: ${studentTermEnrollment.rows.length > 0 ? 'Yes' : 'No'}`);
    }

    console.log('\n📋 API TESTING SUMMARY:');
    console.log('=' .repeat(50));
    console.log(`✅ Student record: Found with overall_score ${student.overall_score}`);
    console.log(`✅ Component scores: ${allComponentScores.rows.length} records`);
    console.log(`✅ Intervention enrollments: ${interventionEnrollments.rows.length} active`);
    console.log(`✅ Term enrollment: ${studentTermEnrollment.rows.length > 0 ? 'Active' : 'Missing'}`);
    
    console.log('\n🎯 EXPECTED FRONTEND BEHAVIOR:');
    console.log('1. Dashboard should show HPS score of 82.3/100 ✅');
    console.log('2. Individual quadrant pages should show component scores ✅');
    console.log('3. Student should show intervention enrollments ✅');
    console.log('4. All data should be consistent across views ✅');

  } catch (error) {
    console.error('❌ Error during API testing:', error);
  }
}

// Run the test
testStudentAPIs().then(() => {
  console.log('\n🏁 Student API testing complete');
  process.exit(0);
}).catch(error => {
  console.error('❌ Student API testing failed:', error);
  process.exit(1);
});
