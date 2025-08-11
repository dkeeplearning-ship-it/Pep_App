const { supabase, query } = require('./src/config/supabase');

async function createImprovementPlanCorrected() {
  console.log('🎯 Creating Accurate Improvement Plan Data for Sripathi (Corrected)');
  console.log('=' .repeat(80));

  try {
    // Student details
    const studentId = '1fd449cd-d3f6-4343-8298-f6e7392f2941';
    const currentTermId = '62cbc472-9175-4c95-b9f7-3fb0e2abca2f';
    
    console.log(`\nCreating improvement plan for: Sripathi Kanyaboina`);
    console.log(`Student ID: ${studentId}`);

    // 1. Check existing improvement goals table
    console.log('\n1. 📊 CHECKING EXISTING IMPROVEMENT GOALS');
    
    const existingGoals = await query(
      supabase
        .from('student_improvement_goals')
        .select('*')
        .eq('student_id', studentId)
    );

    console.log(`Found ${existingGoals.rows.length} existing improvement goals`);

    // 2. Create specific improvement goals based on actual performance
    console.log('\n2. 🎯 CREATING IMPROVEMENT GOALS');
    
    const improvementGoals = [
      {
        student_id: studentId,
        term_id: currentTermId,
        quadrant_id: 'persona',
        component_name: 'Industry Knowledge',
        current_score: 75.0,
        target_score: 85.0,
        priority: 'High',
        description: 'Improve industry knowledge through daily reading and professional engagement',
        action_plan: 'Read industry publications for 30 minutes daily, join professional networks, attend webinars',
        target_date: new Date(Date.now() + 42 * 24 * 60 * 60 * 1000).toISOString(), // 6 weeks
        status: 'Active',
        created_at: new Date().toISOString()
      },
      {
        student_id: studentId,
        term_id: currentTermId,
        quadrant_id: 'persona',
        component_name: 'Intervention Task Performance',
        current_score: 75.5,
        target_score: 85.0,
        priority: 'High',
        description: 'Enhance intervention task completion quality and consistency',
        action_plan: 'Focus on task quality over quantity, seek feedback, complete additional practice tasks',
        target_date: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000).toISOString(), // 5 weeks
        status: 'Active',
        created_at: new Date().toISOString()
      },
      {
        student_id: studentId,
        term_id: currentTermId,
        quadrant_id: 'discipline',
        component_name: 'Class Attendance',
        current_score: 79.0,
        target_score: 90.0,
        priority: 'Medium',
        description: 'Improve class attendance consistency and punctuality',
        action_plan: 'Set calendar reminders, create morning routine, communicate proactively about absences',
        target_date: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString(), // 4 weeks
        status: 'Active',
        created_at: new Date().toISOString()
      },
      {
        student_id: studentId,
        term_id: currentTermId,
        quadrant_id: 'discipline',
        component_name: 'Assignment Submission',
        current_score: 80.5,
        target_score: 90.0,
        priority: 'Medium',
        description: 'Improve assignment submission timeliness and quality',
        action_plan: 'Use task management app, submit 2 days early, review before submission',
        target_date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(), // 3 weeks
        status: 'Active',
        created_at: new Date().toISOString()
      },
      {
        student_id: studentId,
        term_id: currentTermId,
        quadrant_id: 'wellness',
        component_name: 'Stress Management',
        current_score: 83.5,
        target_score: 90.0,
        priority: 'Low',
        description: 'Enhance stress management techniques and resilience',
        action_plan: 'Practice daily mindfulness, regular exercise, develop healthy coping strategies',
        target_date: new Date(Date.now() + 49 * 24 * 60 * 60 * 1000).toISOString(), // 7 weeks
        status: 'Active',
        created_at: new Date().toISOString()
      }
    ];

    // Delete existing goals for this student and term
    await query(
      supabase
        .from('student_improvement_goals')
        .delete()
        .eq('student_id', studentId)
        .eq('term_id', currentTermId)
    );

    // Insert new improvement goals
    const goalsResult = await query(
      supabase
        .from('student_improvement_goals')
        .insert(improvementGoals)
        .select('*')
    );

    console.log(`✅ Created ${goalsResult.rows.length} improvement goals`);
    goalsResult.rows.forEach((goal, index) => {
      console.log(`  ${index + 1}. ${goal.component_name}: ${goal.current_score}% → ${goal.target_score}% (${goal.priority})`);
    });

    // 3. Update student record with improvement plan status
    console.log('\n3. 👤 UPDATING STUDENT RECORD');
    
    const updateStudentResult = await query(
      supabase
        .from('students')
        .update({
          has_improvement_plan: true,
          improvement_plan_updated: new Date().toISOString()
        })
        .eq('id', studentId)
        .select('*')
    );

    if (updateStudentResult.rows.length > 0) {
      console.log('✅ Updated student record with improvement plan status');
    }

    // 4. Create summary data for frontend
    console.log('\n4. 📊 CREATING SUMMARY DATA');
    
    const summaryData = {
      studentId: studentId,
      currentOverallScore: 82.3,
      targetOverallScore: 87.0,
      improvementAreas: [
        {
          quadrantId: 'persona',
          quadrantName: 'Persona',
          currentScore: 75.3,
          targetScore: 85.0,
          priority: 'high',
          components: [
            { name: 'Industry Knowledge', current: 75.0, target: 85.0 },
            { name: 'Intervention Task Performance', current: 75.5, target: 85.0 }
          ],
          recommendations: [
            'Dedicate 30 minutes daily to reading industry publications',
            'Join professional networks and attend webinars',
            'Focus on intervention task quality and seek feedback',
            'Create a personal learning plan for industry skills'
          ]
        },
        {
          quadrantId: 'discipline',
          quadrantName: 'Discipline',
          currentScore: 79.8,
          targetScore: 85.0,
          priority: 'medium',
          components: [
            { name: 'Class Attendance', current: 79.0, target: 90.0 },
            { name: 'Assignment Submission', current: 80.5, target: 90.0 }
          ],
          recommendations: [
            'Set up calendar reminders for all classes',
            'Create a consistent morning routine',
            'Use task management tools for assignments',
            'Submit work 2 days before deadlines'
          ]
        },
        {
          quadrantId: 'wellness',
          quadrantName: 'Wellness',
          currentScore: 83.5,
          targetScore: 90.0,
          priority: 'low',
          components: [
            { name: 'Stress Management', current: 83.5, target: 90.0 },
            { name: 'Social Skills', current: 83.5, target: 90.0 }
          ],
          recommendations: [
            'Practice daily mindfulness meditation',
            'Join student clubs for social interaction',
            'Develop regular exercise routine',
            'Learn active listening techniques'
          ]
        }
      ]
    };

    console.log('\n📊 IMPROVEMENT PLAN SUMMARY:');
    console.log('=' .repeat(50));
    console.log(`✅ Current Overall Score: ${summaryData.currentOverallScore}%`);
    console.log(`🎯 Target Overall Score: ${summaryData.targetOverallScore}%`);
    console.log(`📈 Expected Improvement: ${summaryData.targetOverallScore - summaryData.currentOverallScore} points`);
    console.log(`🎯 Focus Areas: ${summaryData.improvementAreas.length} quadrants`);
    console.log(`📋 Improvement Goals: ${goalsResult.rows.length} specific goals`);

    summaryData.improvementAreas.forEach((area, index) => {
      console.log(`  ${index + 1}. ${area.quadrantName}: ${area.currentScore}% → ${area.targetScore}% (${area.priority} priority)`);
    });

    console.log('\n🎯 EXPECTED FRONTEND RESULTS:');
    console.log('1. Improvement page shows accurate current scores ✅');
    console.log('2. Specific, actionable recommendations based on actual data ✅');
    console.log('3. Prioritized improvement areas with realistic targets ✅');
    console.log('4. Data-driven suggestions instead of generic advice ✅');

    console.log('\n🔧 FRONTEND TESTING:');
    console.log('1. Login with email: sripathi@e.com, password: Sri*1234');
    console.log('2. Navigate to Improvement Plan page');
    console.log('3. Verify recommendations are specific to Sripathi\'s performance');
    console.log('4. Check that priority areas match actual weak points');

  } catch (error) {
    console.error('❌ Error creating improvement plan:', error);
  }
}

// Run the function
createImprovementPlanCorrected().then(() => {
  console.log('\n🏁 Improvement plan creation complete');
  process.exit(0);
}).catch(error => {
  console.error('❌ Improvement plan creation failed:', error);
  process.exit(1);
});
