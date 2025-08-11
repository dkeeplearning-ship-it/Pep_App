const { supabase, query } = require('./src/config/supabase');

async function analyzeStudentDataIssues() {
  console.log('🔍 Analyzing Student Data Issues - Root Cause Analysis');
  console.log('=' .repeat(80));

  try {
    // Student details
    const userId = '5810adc8-17ee-461e-ba03-2336470daf80';
    const studentId = '1fd449cd-d3f6-4343-8298-f6e7392f2941';
    
    console.log(`\nStudent: Sripathi Kanyaboina`);
    console.log(`User ID: ${userId}`);
    console.log(`Student ID: ${studentId}`);

    // 1. Analyze microcompetency scores in detail
    console.log('\n1. 🧩 MICROCOMPETENCY SCORES ANALYSIS');
    const microScoresResult = await query(
      supabase
        .from('microcompetency_scores')
        .select(`
          *,
          microcompetencies:microcompetency_id(
            id, name, max_score,
            components:component_id(
              id, name,
              sub_categories:sub_category_id(
                id, name,
                quadrants:quadrant_id(id, name)
              )
            )
          ),
          interventions:intervention_id(id, name, status)
        `)
        .eq('student_id', studentId)
        .order('scored_at', { ascending: false })
    );

    console.log(`Found ${microScoresResult.rows.length} microcompetency scores`);
    
    let totalMicroScore = 0;
    let totalMicroMax = 0;
    const quadrantMicroScores = { Q1: [], Q2: [], Q3: [], Q4: [] };
    
    microScoresResult.rows.forEach((score, index) => {
      const quadrant = score.microcompetencies?.components?.sub_categories?.quadrants;
      const quadrantId = quadrant?.id;
      
      console.log(`  ${index + 1}. ${score.microcompetencies?.name || 'Unknown'}`);
      console.log(`     Score: ${score.obtained_score}/${score.max_score} (${score.percentage}%)`);
      console.log(`     Quadrant: ${quadrant?.name || 'Unknown'} (${quadrantId || 'Unknown'})`);
      console.log(`     Intervention: ${score.interventions?.name || 'Unknown'}`);
      console.log(`     Date: ${score.scored_at}`);
      
      totalMicroScore += score.obtained_score;
      totalMicroMax += score.max_score;
      
      if (quadrantId && quadrantMicroScores[quadrantId]) {
        quadrantMicroScores[quadrantId].push(score);
      }
    });

    const overallMicroPercentage = totalMicroMax > 0 ? (totalMicroScore / totalMicroMax * 100).toFixed(1) : 0;
    console.log(`\n   📊 Overall Microcompetency Performance: ${totalMicroScore}/${totalMicroMax} (${overallMicroPercentage}%)`);

    // Analyze by quadrant
    Object.entries(quadrantMicroScores).forEach(([quadrantId, scores]) => {
      if (scores.length > 0) {
        const quadrantTotal = scores.reduce((sum, s) => sum + s.obtained_score, 0);
        const quadrantMax = scores.reduce((sum, s) => sum + s.max_score, 0);
        const quadrantPercentage = quadrantMax > 0 ? (quadrantTotal / quadrantMax * 100).toFixed(1) : 0;
        console.log(`   ${quadrantId}: ${scores.length} scores, ${quadrantTotal}/${quadrantMax} (${quadrantPercentage}%)`);
      } else {
        console.log(`   ${quadrantId}: No scores`);
      }
    });

    // 2. Analyze component scores in detail
    console.log('\n2. 🎯 COMPONENT SCORES ANALYSIS');
    const scoresResult = await query(
      supabase
        .from('scores')
        .select(`
          *,
          components:component_id(
            id, name, category,
            sub_categories:sub_category_id(
              id, name,
              quadrants:quadrant_id(id, name)
            )
          )
        `)
        .eq('student_id', studentId)
        .order('assessment_date', { ascending: false })
    );

    console.log(`Found ${scoresResult.rows.length} component scores`);
    
    let totalComponentScore = 0;
    let totalComponentMax = 0;
    const quadrantComponentScores = { Q1: [], Q2: [], Q3: [], Q4: [] };
    
    scoresResult.rows.forEach((score, index) => {
      const quadrant = score.components?.sub_categories?.quadrants;
      const quadrantId = quadrant?.id;
      
      console.log(`  ${index + 1}. ${score.components?.name || 'Unknown'}`);
      console.log(`     Score: ${score.obtained_score}/${score.max_score} (${score.percentage}%)`);
      console.log(`     Quadrant: ${quadrant?.name || 'Unknown'} (${quadrantId || 'Unknown'})`);
      console.log(`     Date: ${score.assessment_date}`);
      
      totalComponentScore += score.obtained_score;
      totalComponentMax += score.max_score;
      
      if (quadrantId && quadrantComponentScores[quadrantId]) {
        quadrantComponentScores[quadrantId].push(score);
      }
    });

    const overallComponentPercentage = totalComponentMax > 0 ? (totalComponentScore / totalComponentMax * 100).toFixed(1) : 0;
    console.log(`\n   📊 Overall Component Performance: ${totalComponentScore}/${totalComponentMax} (${overallComponentPercentage}%)`);

    // Analyze by quadrant
    Object.entries(quadrantComponentScores).forEach(([quadrantId, scores]) => {
      if (scores.length > 0) {
        const quadrantTotal = scores.reduce((sum, s) => sum + s.obtained_score, 0);
        const quadrantMax = scores.reduce((sum, s) => sum + s.max_score, 0);
        const quadrantPercentage = quadrantMax > 0 ? (quadrantTotal / quadrantMax * 100).toFixed(1) : 0;
        console.log(`   ${quadrantId}: ${scores.length} scores, ${quadrantTotal}/${quadrantMax} (${quadrantPercentage}%)`);
      } else {
        console.log(`   ${quadrantId}: No scores`);
      }
    });

    // 3. Check intervention enrollment issue
    console.log('\n3. 🎯 INTERVENTION ENROLLMENT ISSUE');
    
    // Check if student should be enrolled in interventions
    const interventionsWithScores = [...new Set(microScoresResult.rows.map(s => s.intervention_id))];
    console.log(`Student has scores in ${interventionsWithScores.length} interventions:`);
    
    for (const interventionId of interventionsWithScores) {
      const interventionScores = microScoresResult.rows.filter(s => s.intervention_id === interventionId);
      const intervention = interventionScores[0]?.interventions;
      
      console.log(`  - ${intervention?.name || 'Unknown'} (${interventionScores.length} scores)`);
      
      // Check if enrolled
      const enrollmentCheck = await query(
        supabase
          .from('intervention_enrollments')
          .select('*')
          .eq('student_id', studentId)
          .eq('intervention_id', interventionId)
      );
      
      if (enrollmentCheck.rows.length === 0) {
        console.log(`    ❌ NOT ENROLLED despite having scores!`);
      } else {
        console.log(`    ✅ Enrolled: ${enrollmentCheck.rows[0].enrollment_status}`);
      }
    }

    // 4. Check student term enrollment issue
    console.log('\n4. 📅 STUDENT TERM ENROLLMENT ISSUE');
    
    const currentTermResult = await query(
      supabase
        .from('terms')
        .select('*')
        .eq('is_current', true)
    );

    if (currentTermResult.rows.length > 0) {
      const currentTerm = currentTermResult.rows[0];
      console.log(`Current term: ${currentTerm.name} (${currentTerm.id})`);
      
      // Check if student is enrolled in current term
      const studentTermCheck = await query(
        supabase
          .from('student_terms')
          .select('*')
          .eq('student_id', studentId)
          .eq('term_id', currentTerm.id)
      );
      
      if (studentTermCheck.rows.length === 0) {
        console.log(`❌ Student NOT enrolled in current term despite having scores!`);
      } else {
        console.log(`✅ Student enrolled in current term`);
      }
    }

    // 5. Calculate what the HPS should be
    console.log('\n5. 🧮 HPS CALCULATION ANALYSIS');
    
    // Calculate HPS based on available data
    const quadrantPercentages = {};
    
    // Use microcompetency scores for HPS calculation
    Object.entries(quadrantMicroScores).forEach(([quadrantId, scores]) => {
      if (scores.length > 0) {
        const quadrantTotal = scores.reduce((sum, s) => sum + s.obtained_score, 0);
        const quadrantMax = scores.reduce((sum, s) => sum + s.max_score, 0);
        quadrantPercentages[quadrantId] = quadrantMax > 0 ? (quadrantTotal / quadrantMax * 100) : 0;
      } else {
        quadrantPercentages[quadrantId] = 0;
      }
    });

    const calculatedHPS = (
      quadrantPercentages.Q1 + 
      quadrantPercentages.Q2 + 
      quadrantPercentages.Q3 + 
      quadrantPercentages.Q4
    ) / 4;

    console.log(`Calculated HPS based on microcompetency scores:`);
    console.log(`  Q1: ${quadrantPercentages.Q1.toFixed(1)}%`);
    console.log(`  Q2: ${quadrantPercentages.Q2.toFixed(1)}%`);
    console.log(`  Q3: ${quadrantPercentages.Q3.toFixed(1)}%`);
    console.log(`  Q4: ${quadrantPercentages.Q4.toFixed(1)}%`);
    console.log(`  📊 Overall HPS: ${calculatedHPS.toFixed(1)}/100`);

    // 6. Summary of issues
    console.log('\n📋 ROOT CAUSE ANALYSIS SUMMARY');
    console.log('=' .repeat(50));
    
    console.log('\n✅ WHAT WORKS:');
    console.log(`  - Student has ${microScoresResult.rows.length} microcompetency scores`);
    console.log(`  - Student has ${scoresResult.rows.length} component scores`);
    console.log(`  - Calculated HPS should be ~${calculatedHPS.toFixed(1)}/100`);
    
    console.log('\n❌ IDENTIFIED ISSUES:');
    console.log('  1. Student NOT enrolled in interventions despite having scores');
    console.log('  2. Student NOT enrolled in current term');
    console.log('  3. Dashboard shows 82.3/100 but calculated HPS is different');
    console.log('  4. Individual quadrant pages show 0 scores (API/frontend issue)');
    
    console.log('\n🔧 REQUIRED FIXES:');
    console.log('  1. Create intervention enrollments for interventions with scores');
    console.log('  2. Create student term enrollment for current term');
    console.log('  3. Fix frontend APIs to properly aggregate scores by quadrant');
    console.log('  4. Ensure consistent HPS calculation across all views');

  } catch (error) {
    console.error('❌ Error during analysis:', error);
  }
}

// Run the analysis
analyzeStudentDataIssues().then(() => {
  console.log('\n🏁 Root cause analysis complete');
  process.exit(0);
}).catch(error => {
  console.error('❌ Root cause analysis failed:', error);
  process.exit(1);
});
