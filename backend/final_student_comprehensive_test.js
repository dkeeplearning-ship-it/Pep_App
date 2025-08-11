const { supabase, query } = require('./src/config/supabase');

async function finalStudentComprehensiveTest() {
  console.log('🎯 Final Comprehensive Test - Student Sripathi');
  console.log('=' .repeat(80));

  // Student details
  const userId = '5810adc8-17ee-461e-ba03-2336470daf80';
  const studentId = '1fd449cd-d3f6-4343-8298-f6e7392f2941';
  const currentTermId = '62cbc472-9175-4c95-b9f7-3fb0e2abca2f';

  const testResults = {
    studentExists: false,
    hasCorrectHPSScore: false,
    hasInterventionEnrollments: false,
    hasTermEnrollment: false,
    hasQuadrantScores: false,
    improvementPlanWorks: false,
    dataConsistency: false
  };

  try {
    console.log(`\n🔍 Testing Student: Sripathi Kanyaboina`);
    console.log(`User ID: ${userId}`);
    console.log(`Student ID: ${studentId}`);

    // 1. Verify student exists and has correct HPS score
    console.log('\n1. ✅ STUDENT EXISTENCE & HPS SCORE TEST');
    const studentResult = await query(
      supabase
        .from('students')
        .select('*')
        .eq('id', studentId)
    );

    if (studentResult.rows.length > 0) {
      testResults.studentExists = true;
      const student = studentResult.rows[0];
      console.log(`   ✅ Student found: ${student.name}`);
      console.log(`   ✅ Overall Score: ${student.overall_score}`);
      console.log(`   ✅ Grade: ${student.grade}`);
      console.log(`   ✅ Current Term: ${student.current_term_id}`);
      
      if (student.overall_score === 82.3) {
        testResults.hasCorrectHPSScore = true;
        console.log(`   ✅ HPS Score is correct: 82.3/100`);
      } else {
        console.log(`   ❌ HPS Score mismatch: expected 82.3, got ${student.overall_score}`);
      }
    } else {
      console.log('   ❌ Student not found');
      return testResults;
    }

    // 2. Test intervention enrollments
    console.log('\n2. 🎯 INTERVENTION ENROLLMENTS TEST');
    const interventionEnrollments = await query(
      supabase
        .from('intervention_enrollments')
        .select(`
          *,
          interventions:intervention_id(id, name, status)
        `)
        .eq('student_id', studentId)
    );

    if (interventionEnrollments.rows.length > 0) {
      testResults.hasInterventionEnrollments = true;
      console.log(`   ✅ ${interventionEnrollments.rows.length} intervention enrollments found`);
      interventionEnrollments.rows.forEach((enrollment, index) => {
        console.log(`   ${index + 1}. ${enrollment.interventions?.name || 'Unknown'} (${enrollment.enrollment_status})`);
      });
    } else {
      console.log('   ❌ No intervention enrollments found');
    }

    // 3. Test student term enrollment
    console.log('\n3. 📅 STUDENT TERM ENROLLMENT TEST');
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
      testResults.hasTermEnrollment = true;
      const enrollment = studentTermEnrollment.rows[0];
      console.log(`   ✅ Student term enrollment found`);
      console.log(`   ✅ Status: ${enrollment.enrollment_status}`);
      console.log(`   ✅ Total Score: ${enrollment.total_score}`);
      console.log(`   ✅ Grade: ${enrollment.grade}`);
    } else {
      console.log('   ❌ Student term enrollment not found');
    }

    // 4. Test quadrant scores consistency
    console.log('\n4. 🧩 QUADRANT SCORES CONSISTENCY TEST');
    const quadrants = ['behavior', 'discipline', 'persona', 'wellness'];
    let quadrantScoresFound = 0;
    
    for (const quadrantId of quadrants) {
      const componentScores = await query(
        supabase
          .from('scores')
          .select(`
            obtained_score,
            max_score,
            components:component_id(
              name,
              sub_categories:sub_category_id(
                quadrants:quadrant_id(id, name)
              )
            )
          `)
          .eq('student_id', studentId)
          .eq('term_id', currentTermId)
      );

      const quadrantScores = componentScores.rows.filter(score => {
        const scoreQuadrant = score.components?.sub_categories?.quadrants;
        return scoreQuadrant?.id === quadrantId;
      });

      if (quadrantScores.length > 0) {
        quadrantScoresFound++;
        const totalObtained = quadrantScores.reduce((sum, s) => sum + s.obtained_score, 0);
        const totalMax = quadrantScores.reduce((sum, s) => sum + s.max_score, 0);
        const percentage = totalMax > 0 ? (totalObtained / totalMax * 100).toFixed(1) : 0;
        
        console.log(`   ✅ ${quadrantId.toUpperCase()}: ${quadrantScores.length} scores, ${percentage}%`);
      } else {
        console.log(`   ❌ ${quadrantId.toUpperCase()}: No scores found`);
      }
    }

    if (quadrantScoresFound === 4) {
      testResults.hasQuadrantScores = true;
      console.log(`   ✅ All 4 quadrants have scores`);
    }

    // 5. Test improvement plan API simulation
    console.log('\n5. 🎯 IMPROVEMENT PLAN API TEST');
    
    // Simulate the getImprovementPlan controller logic
    const componentsResult = await query(
      supabase
        .from('components')
        .select(`
          id,
          name,
          max_score,
          sub_categories:sub_category_id(
            id,
            name,
            quadrants:quadrant_id(id, name)
          )
        `)
        .eq('is_active', true)
    );

    const scoresResult = await query(
      supabase
        .from('scores')
        .select('component_id, obtained_score, max_score, percentage')
        .eq('student_id', studentId)
        .eq('term_id', currentTermId)
    );

    // Create scores map
    const scoresMap = {};
    if (scoresResult.rows) {
      scoresResult.rows.forEach(score => {
        scoresMap[score.component_id] = score;
      });
    }

    // Process improvement areas
    const improvementAreas = [];
    if (componentsResult.rows) {
      componentsResult.rows.forEach(comp => {
        const score = scoresMap[comp.id];
        const percentage = score?.percentage || 0;
        const quadrant = comp.sub_categories?.quadrants;

        // Only include components with low scores or no scores
        if (percentage < 85 || !score) {
          let priority = 'low';
          if (percentage < 60) priority = 'high';
          else if (percentage < 75) priority = 'medium';

          improvementAreas.push({
            quadrantId: quadrant?.id,
            quadrantName: quadrant?.name,
            componentName: comp.name,
            score: score?.obtained_score || 0,
            maxScore: comp.max_score,
            percentage: percentage,
            priority: priority
          });
        }
      });
    }

    if (improvementAreas.length > 0) {
      testResults.improvementPlanWorks = true;
      console.log(`   ✅ Improvement plan generated with ${improvementAreas.length} areas`);
      
      // Show top 3 improvement areas
      const topAreas = improvementAreas
        .sort((a, b) => a.percentage - b.percentage)
        .slice(0, 3);
        
      topAreas.forEach((area, index) => {
        console.log(`   ${index + 1}. ${area.componentName} (${area.quadrantName}): ${area.percentage}% - ${area.priority} priority`);
      });
    } else {
      console.log('   ❌ No improvement areas identified');
    }

    // 6. Data consistency check
    console.log('\n6. 🔍 DATA CONSISTENCY CHECK');
    let consistencyIssues = [];

    // Check if HPS score matches calculated score
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
      const calculatedPercentage = totalMax > 0 ? (totalObtained / totalMax * 100) : 0;
      
      const hpsDifference = Math.abs(calculatedPercentage - 82.3);
      if (hpsDifference > 1) { // Allow 1% tolerance
        consistencyIssues.push(`HPS score (82.3%) doesn't match calculated score (${calculatedPercentage.toFixed(1)}%)`);
      }
    }

    // Check if all enrolled interventions have scores
    const interventionsWithoutScores = [];
    for (const enrollment of interventionEnrollments.rows) {
      const interventionScores = await query(
        supabase
          .from('microcompetency_scores')
          .select('count', { count: 'exact' })
          .eq('student_id', studentId)
          .eq('intervention_id', enrollment.intervention_id)
      );
      
      if (interventionScores.totalCount === 0) {
        interventionsWithoutScores.push(enrollment.interventions?.name || 'Unknown');
      }
    }

    if (interventionsWithoutScores.length > 0) {
      consistencyIssues.push(`${interventionsWithoutScores.length} interventions have no scores`);
    }

    if (consistencyIssues.length === 0) {
      testResults.dataConsistency = true;
      console.log('   ✅ All data is consistent');
    } else {
      console.log('   ⚠️  Data consistency issues found:');
      consistencyIssues.forEach(issue => console.log(`      - ${issue}`));
    }

    // 7. Final summary
    console.log('\n📊 FINAL TEST RESULTS');
    console.log('=' .repeat(50));
    
    const passedTests = Object.values(testResults).filter(Boolean).length;
    const totalTests = Object.keys(testResults).length;
    
    console.log(`✅ Tests Passed: ${passedTests}/${totalTests}`);
    console.log(`📈 Success Rate: ${Math.round((passedTests/totalTests) * 100)}%`);
    
    Object.entries(testResults).forEach(([test, passed]) => {
      const status = passed ? '✅' : '❌';
      const testName = test.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
      console.log(`${status} ${testName}`);
    });

    if (passedTests === totalTests) {
      console.log('\n🎉 ALL TESTS PASSED! Student Sripathi data is fully consistent and functional.');
      console.log('\n🚀 READY FOR FRONTEND TESTING:');
      console.log('   1. Login with email: sripathi@e.com, password: Sri*1234');
      console.log('   2. Navigate to Student Dashboard');
      console.log('   3. Verify HPS score shows 82.3/100');
      console.log('   4. Check intervention enrollments are visible');
      console.log('   5. Test individual quadrant pages show correct scores');
      console.log('   6. Verify improvement plan shows relevant recommendations');
    } else {
      console.log('\n⚠️  Some tests failed. Review the issues above.');
    }

  } catch (error) {
    console.error('❌ Error during comprehensive testing:', error);
  }

  return testResults;
}

// Run the comprehensive test
finalStudentComprehensiveTest().then((results) => {
  console.log('\n🏁 Comprehensive testing complete');
  process.exit(0);
}).catch(error => {
  console.error('❌ Comprehensive testing failed:', error);
  process.exit(1);
});
