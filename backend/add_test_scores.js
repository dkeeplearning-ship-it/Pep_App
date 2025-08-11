const { supabase, query } = require('./src/config/supabase');

async function addTestScores() {
  try {
    console.log('🧪 Adding test scores for student...');
    
    // Get the test student
    const studentResult = await query(
      supabase
        .from('students')
        .select('id, name')
        .eq('id', '085339af-ae22-4516-bb7e-3710c747b292')
    );
    
    if (!studentResult.rows.length) {
      console.log('❌ Student not found');
      return;
    }
    
    console.log('✅ Found student:', studentResult.rows[0].name);
    
    // Get current term
    const termResult = await query(
      supabase
        .from('terms')
        .select('id, name')
        .eq('is_current', true)
        .limit(1)
    );
    
    if (!termResult.rows.length) {
      console.log('❌ No current term found');
      return;
    }
    
    console.log('✅ Found term:', termResult.rows[0].name);
    
    // Get some components to score
    const componentsResult = await query(
      supabase
        .from('components')
        .select(`
          id, 
          name, 
          max_score, 
          sub_categories:sub_category_id(
            name,
            quadrants:quadrant_id(id, name)
          )
        `)
        .eq('is_active', true)
        .limit(10)
    );
    
    console.log('✅ Found', componentsResult.rows.length, 'components');
    
    // Get a teacher to assign as assessor
    const teacherResult = await query(
      supabase
        .from('users')
        .select('id')
        .eq('role', 'teacher')
        .limit(1)
    );
    
    if (!teacherResult.rows.length) {
      console.log('❌ No teacher found');
      return;
    }
    
    // Create sample scores for different quadrants
    const sampleScores = [];
    
    componentsResult.rows.forEach(comp => {
      const quadrantName = comp.sub_categories?.quadrants?.name;
      if (quadrantName) {
        const randomScore = Math.floor(Math.random() * comp.max_score * 0.6) + comp.max_score * 0.4; // 40-100% of max
        sampleScores.push({
          student_id: '085339af-ae22-4516-bb7e-3710c747b292',
          component_id: comp.id,
          term_id: termResult.rows[0].id,
          obtained_score: randomScore,
          max_score: comp.max_score,
          assessed_by: teacherResult.rows[0].id,
          assessment_type: 'Teacher',
          notes: `Sample test score for ${comp.name}`,
          status: 'Approved'
        });
        console.log(`  - ${comp.name} (${quadrantName}): ${randomScore}/${comp.max_score}`);
      }
    });
    
    if (sampleScores.length > 0) {
      const scoresResult = await query(
        supabase
          .from('scores')
          .insert(sampleScores)
          .select('*')
      );
      
      console.log('✅ Created', scoresResult.rows.length, 'sample scores');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

addTestScores().then(() => {
  console.log('✨ Test scores added successfully!');
  process.exit(0);
}).catch(error => {
  console.error('💥 Failed to add test scores:', error);
  process.exit(1);
});
