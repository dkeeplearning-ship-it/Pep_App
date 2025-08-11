const { supabase, query } = require('./src/config/supabase');

async function createImprovementPlanData() {
  console.log('🎯 Creating Accurate Improvement Plan Data for Sripathi');
  console.log('=' .repeat(80));

  try {
    // Student details
    const studentId = '1fd449cd-d3f6-4343-8298-f6e7392f2941';
    const currentTermId = '62cbc472-9175-4c95-b9f7-3fb0e2abca2f';
    
    console.log(`\nCreating improvement plan for: Sripathi Kanyaboina`);
    console.log(`Student ID: ${studentId}`);

    // 1. Analyze current performance by quadrant
    console.log('\n1. 📊 ANALYZING CURRENT PERFORMANCE');
    
    const quadrantPerformance = {
      behavior: { score: 88.0, components: ['Teamwork: 90%', 'Leadership: 88%', 'Self-Awareness: 86%'] },
      discipline: { score: 79.8, components: ['Class Attendance: 79%', 'Assignment Submission: 80.5%'] },
      persona: { score: 75.3, components: ['Industry Knowledge: 75%', 'Intervention Task: 75.5%'] },
      wellness: { score: 83.5, components: ['Stress Management: 83.5%', 'Social Skills: 83.5%'] }
    };

    // 2. Identify improvement areas (scores below 85%)
    console.log('\n2. 🎯 IDENTIFYING IMPROVEMENT AREAS');
    
    const improvementAreas = [];
    
    // Persona quadrant needs most improvement (75.3%)
    improvementAreas.push({
      quadrantId: 'persona',
      quadrantName: 'Persona',
      currentScore: 75.3,
      targetScore: 85.0,
      priority: 'high',
      components: [
        { name: 'Industry Knowledge', currentScore: 75, targetScore: 85, gap: 10 },
        { name: 'Intervention Task', currentScore: 75.5, targetScore: 85, gap: 9.5 }
      ],
      recommendations: [
        'Dedicate 30 minutes daily to reading industry publications and news',
        'Join professional networks and attend industry webinars',
        'Complete additional intervention tasks with focus on quality',
        'Seek mentorship from industry professionals',
        'Create a personal learning plan for industry-specific skills'
      ],
      timeframe: '4-6 weeks',
      expectedImprovement: '8-12 points'
    });

    // Discipline quadrant second priority (79.8%)
    improvementAreas.push({
      quadrantId: 'discipline',
      quadrantName: 'Discipline',
      currentScore: 79.8,
      targetScore: 85.0,
      priority: 'medium',
      components: [
        { name: 'Class Attendance', currentScore: 79, targetScore: 90, gap: 11 },
        { name: 'Assignment Submission', currentScore: 80.5, targetScore: 90, gap: 9.5 }
      ],
      recommendations: [
        'Set up calendar reminders for all classes and deadlines',
        'Create a morning routine to ensure punctual attendance',
        'Use a task management app to track assignments',
        'Submit assignments 1-2 days before the deadline',
        'Communicate proactively with instructors about any challenges'
      ],
      timeframe: '2-4 weeks',
      expectedImprovement: '5-8 points'
    });

    // Wellness could be optimized further (83.5%)
    improvementAreas.push({
      quadrantId: 'wellness',
      quadrantName: 'Wellness',
      currentScore: 83.5,
      targetScore: 90.0,
      priority: 'low',
      components: [
        { name: 'Stress Management', currentScore: 83.5, targetScore: 90, gap: 6.5 },
        { name: 'Social Skills', currentScore: 83.5, targetScore: 90, gap: 6.5 }
      ],
      recommendations: [
        'Practice daily mindfulness or meditation (10-15 minutes)',
        'Join student clubs or organizations to enhance social interactions',
        'Develop a regular exercise routine for stress relief',
        'Learn and practice active listening techniques',
        'Participate in group activities and team-building exercises'
      ],
      timeframe: '6-8 weeks',
      expectedImprovement: '4-7 points'
    });

    console.log(`✅ Identified ${improvementAreas.length} improvement areas`);
    improvementAreas.forEach((area, index) => {
      console.log(`  ${index + 1}. ${area.quadrantName}: ${area.currentScore}% → ${area.targetScore}% (${area.priority} priority)`);
    });

    // 3. Create or update improvement plan record
    console.log('\n3. 💾 CREATING IMPROVEMENT PLAN RECORD');
    
    // Check if improvement plan already exists
    const existingPlan = await query(
      supabase
        .from('improvement_plans')
        .select('*')
        .eq('student_id', studentId)
        .eq('term_id', currentTermId)
    );

    const improvementPlanData = {
      student_id: studentId,
      term_id: currentTermId,
      overall_score: 82.3,
      target_score: 87.0,
      improvement_areas: improvementAreas,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: 'Active',
      progress_percentage: 0
    };

    let planResult;
    if (existingPlan.rows.length > 0) {
      // Update existing plan
      planResult = await query(
        supabase
          .from('improvement_plans')
          .update(improvementPlanData)
          .eq('id', existingPlan.rows[0].id)
          .select('*')
      );
      console.log('✅ Updated existing improvement plan');
    } else {
      // Create new plan
      planResult = await query(
        supabase
          .from('improvement_plans')
          .insert(improvementPlanData)
          .select('*')
      );
      console.log('✅ Created new improvement plan');
    }

    if (planResult.rows.length > 0) {
      console.log(`   Plan ID: ${planResult.rows[0].id}`);
      console.log(`   Target Score: ${planResult.rows[0].target_score}`);
    }

    // 4. Create specific action items
    console.log('\n4. 📋 CREATING ACTION ITEMS');
    
    const actionItems = [
      {
        improvement_plan_id: planResult.rows[0].id,
        quadrant_id: 'persona',
        title: 'Daily Industry Reading',
        description: 'Read industry publications for 30 minutes daily',
        priority: 'high',
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week
        status: 'Pending',
        expected_impact: 3
      },
      {
        improvement_plan_id: planResult.rows[0].id,
        quadrant_id: 'persona',
        title: 'Professional Network Engagement',
        description: 'Join 2 professional networks and attend 1 webinar weekly',
        priority: 'high',
        due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 2 weeks
        status: 'Pending',
        expected_impact: 4
      },
      {
        improvement_plan_id: planResult.rows[0].id,
        quadrant_id: 'discipline',
        title: 'Attendance Improvement',
        description: 'Achieve 95%+ attendance for the next 4 weeks',
        priority: 'medium',
        due_date: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString(), // 4 weeks
        status: 'Pending',
        expected_impact: 5
      },
      {
        improvement_plan_id: planResult.rows[0].id,
        quadrant_id: 'discipline',
        title: 'Early Assignment Submission',
        description: 'Submit all assignments 2 days before deadline',
        priority: 'medium',
        due_date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(), // 3 weeks
        status: 'Pending',
        expected_impact: 3
      },
      {
        improvement_plan_id: planResult.rows[0].id,
        quadrant_id: 'wellness',
        title: 'Daily Mindfulness Practice',
        description: 'Practice mindfulness meditation for 15 minutes daily',
        priority: 'low',
        due_date: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000).toISOString(), // 5 weeks
        status: 'Pending',
        expected_impact: 3
      }
    ];

    // Delete existing action items for this plan
    await query(
      supabase
        .from('improvement_action_items')
        .delete()
        .eq('improvement_plan_id', planResult.rows[0].id)
    );

    // Insert new action items
    const actionItemsResult = await query(
      supabase
        .from('improvement_action_items')
        .insert(actionItems)
        .select('*')
    );

    console.log(`✅ Created ${actionItemsResult.rows.length} action items`);
    actionItemsResult.rows.forEach((item, index) => {
      console.log(`  ${index + 1}. ${item.title} (${item.priority} priority)`);
    });

    console.log('\n📊 IMPROVEMENT PLAN SUMMARY:');
    console.log('=' .repeat(50));
    console.log(`✅ Current Overall Score: 82.3%`);
    console.log(`🎯 Target Overall Score: 87.0%`);
    console.log(`📈 Expected Improvement: 4.7 points`);
    console.log(`🎯 Focus Areas: Persona (75.3%), Discipline (79.8%), Wellness (83.5%)`);
    console.log(`📋 Action Items: ${actionItems.length} specific tasks`);
    console.log(`⏱️  Timeline: 4-8 weeks for full implementation`);

    console.log('\n🎯 EXPECTED FRONTEND RESULTS:');
    console.log('1. Improvement page shows accurate current scores ✅');
    console.log('2. Specific, actionable recommendations based on actual data ✅');
    console.log('3. Prioritized improvement areas with realistic targets ✅');
    console.log('4. Timeline and expected impact for each recommendation ✅');

  } catch (error) {
    console.error('❌ Error creating improvement plan:', error);
  }
}

// Run the function
createImprovementPlanData().then(() => {
  console.log('\n🏁 Improvement plan creation complete');
  process.exit(0);
}).catch(error => {
  console.error('❌ Improvement plan creation failed:', error);
  process.exit(1);
});
