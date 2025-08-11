const { supabase, query } = require('./src/config/supabase');

async function finalComprehensiveTest() {
  console.log('🎯 Final Comprehensive Test - Teacher Srikanth');
  console.log('=' .repeat(80));

  // Correct IDs for Srikanth
  const teacherUserId = 'b0cde931-c687-42e5-9643-e36a15868f17';
  const teacherId = '71e3d945-4236-4d79-87d7-9f3e1979f83b';

  const testResults = {
    teacherExists: false,
    hasStudents: false,
    hasInterventions: false,
    hasMicrocompetencies: false,
    interventionInCurrentTerm: false,
    apiEndpointsWork: false,
    dataConsistency: false
  };

  try {
    console.log(`\n🔍 Testing Teacher: Srikant qw`);
    console.log(`User ID: ${teacherUserId}`);
    console.log(`Teacher ID: ${teacherId}`);

    // 1. Verify teacher exists and is accessible
    console.log('\n1. ✅ TEACHER EXISTENCE TEST');
    const teacherResult = await query(
      supabase
        .from('teachers')
        .select('*')
        .eq('user_id', teacherUserId)
    );

    if (teacherResult.rows.length > 0) {
      testResults.teacherExists = true;
      const teacher = teacherResult.rows[0];
      console.log(`   ✅ Teacher found: ${teacher.name}`);
      console.log(`   ✅ Employee ID: ${teacher.employee_id}`);
      console.log(`   ✅ Active: ${teacher.is_active}`);
    } else {
      console.log('   ❌ Teacher not found');
      return testResults;
    }

    // 2. Test student assignments
    console.log('\n2. 👥 STUDENT ASSIGNMENTS TEST');
    const studentsResult = await query(
      supabase
        .from('teacher_assignments')
        .select(`
          *,
          students:student_id(id, name, registration_no, course),
          terms:term_id(id, name, is_current)
        `)
        .eq('teacher_id', teacherId)
        .eq('is_active', true)
    );

    if (studentsResult.rows.length > 0) {
      testResults.hasStudents = true;
      console.log(`   ✅ ${studentsResult.rows.length} students assigned`);
      studentsResult.rows.forEach((assignment, index) => {
        const student = assignment.students;
        console.log(`   ${index + 1}. ${student?.name} (${student?.registration_no}) - Quadrant: ${assignment.quadrant_id}`);
      });
    } else {
      console.log('   ❌ No students assigned');
    }

    // 3. Test intervention assignments
    console.log('\n3. 🎯 INTERVENTION ASSIGNMENTS TEST');
    const interventionsResult = await query(
      supabase
        .from('teacher_microcompetency_assignments')
        .select(`
          intervention_id,
          interventions:intervention_id(
            id, name, status, start_date, end_date, term_id,
            terms:term_id(id, name, is_current, start_date, end_date)
          )
        `)
        .eq('teacher_id', teacherId)
        .eq('is_active', true)
    );

    const uniqueInterventions = {};
    interventionsResult.rows.forEach(row => {
      if (row.interventions) {
        uniqueInterventions[row.interventions.id] = row.interventions;
      }
    });

    const interventions = Object.values(uniqueInterventions);
    if (interventions.length > 0) {
      testResults.hasInterventions = true;
      console.log(`   ✅ ${interventions.length} interventions assigned`);
      
      interventions.forEach((intervention, index) => {
        console.log(`   ${index + 1}. ${intervention.name} (${intervention.status})`);
        console.log(`      Dates: ${intervention.start_date} to ${intervention.end_date}`);
        
        // Check if intervention overlaps with current term
        if (intervention.terms && intervention.terms.is_current) {
          const termStart = new Date(intervention.terms.start_date);
          const termEnd = new Date(intervention.terms.end_date);
          const interventionStart = new Date(intervention.start_date);
          const interventionEnd = new Date(intervention.end_date);
          
          const overlaps = (interventionStart <= termEnd && interventionEnd >= termStart);
          if (overlaps) {
            testResults.interventionInCurrentTerm = true;
            console.log(`      ✅ Overlaps with current term: ${intervention.terms.name}`);
          } else {
            console.log(`      ❌ Does NOT overlap with current term: ${intervention.terms.name}`);
          }
        }
      });
    } else {
      console.log('   ❌ No interventions assigned');
    }

    // 4. Test microcompetency assignments
    console.log('\n4. 🧩 MICROCOMPETENCY ASSIGNMENTS TEST');
    const microcompetenciesResult = await query(
      supabase
        .from('teacher_microcompetency_assignments')
        .select(`
          id,
          can_score,
          can_create_tasks,
          microcompetencies:microcompetency_id(id, name, max_score),
          interventions:intervention_id(id, name, status)
        `)
        .eq('teacher_id', teacherId)
        .eq('is_active', true)
    );

    if (microcompetenciesResult.rows.length > 0) {
      testResults.hasMicrocompetencies = true;
      console.log(`   ✅ ${microcompetenciesResult.rows.length} microcompetency assignments`);
      microcompetenciesResult.rows.forEach((assignment, index) => {
        console.log(`   ${index + 1}. ${assignment.microcompetencies?.name || 'Unknown'}`);
        console.log(`      Intervention: ${assignment.interventions?.name || 'Unknown'}`);
        console.log(`      Can Score: ${assignment.can_score}, Can Create Tasks: ${assignment.can_create_tasks}`);
      });
    } else {
      console.log('   ❌ No microcompetency assignments');
    }

    // 5. Test API endpoint simulation
    console.log('\n5. 🔌 API ENDPOINTS SIMULATION TEST');
    
    // Simulate teacher dashboard API
    const dashboardData = {
      teacher: teacherResult.rows[0],
      overview: {
        totalStudents: studentsResult.rows.length,
        assignedQuadrants: [...new Set(studentsResult.rows.map(s => s.quadrant_id))].length,
        totalInterventions: interventions.length,
        totalMicrocompetencies: microcompetenciesResult.rows.length
      },
      interventions: interventions,
      microcompetencies: microcompetenciesResult.rows,
      students: studentsResult.rows
    };

    if (dashboardData.overview.totalStudents > 0 && 
        dashboardData.overview.totalInterventions > 0 && 
        dashboardData.overview.totalMicrocompetencies > 0) {
      testResults.apiEndpointsWork = true;
      console.log('   ✅ API endpoints would return complete data');
      console.log(`      Students: ${dashboardData.overview.totalStudents}`);
      console.log(`      Quadrants: ${dashboardData.overview.assignedQuadrants}`);
      console.log(`      Interventions: ${dashboardData.overview.totalInterventions}`);
      console.log(`      Microcompetencies: ${dashboardData.overview.totalMicrocompetencies}`);
    } else {
      console.log('   ❌ API endpoints would return incomplete data');
    }

    // 6. Data consistency check
    console.log('\n6. 🔍 DATA CONSISTENCY CHECK');
    let consistencyIssues = [];

    // Check if all microcompetency assignments have valid interventions
    const invalidMicrocompetencies = microcompetenciesResult.rows.filter(m => !m.interventions);
    if (invalidMicrocompetencies.length > 0) {
      consistencyIssues.push(`${invalidMicrocompetencies.length} microcompetencies without valid interventions`);
    }

    // Check if all student assignments are in current term
    const studentsNotInCurrentTerm = studentsResult.rows.filter(s => !s.terms?.is_current);
    if (studentsNotInCurrentTerm.length > 0) {
      consistencyIssues.push(`${studentsNotInCurrentTerm.length} students not in current term`);
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
      console.log('\n🎉 ALL TESTS PASSED! Teacher Srikanth is fully functional.');
      console.log('\n🚀 READY FOR FRONTEND TESTING:');
      console.log('   1. Login with username: q');
      console.log('   2. Navigate to Teacher Dashboard');
      console.log('   3. Verify all data displays correctly');
      console.log('   4. Test all teacher page functionalities');
    } else {
      console.log('\n⚠️  Some tests failed. Review the issues above.');
    }

  } catch (error) {
    console.error('❌ Error during comprehensive testing:', error);
  }

  return testResults;
}

// Run the comprehensive test
finalComprehensiveTest().then((results) => {
  console.log('\n🏁 Comprehensive testing complete');
  process.exit(0);
}).catch(error => {
  console.error('❌ Comprehensive testing failed:', error);
  process.exit(1);
});
