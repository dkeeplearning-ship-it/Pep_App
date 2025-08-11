const { supabase, query } = require('./src/config/supabase');

async function checkImprovementGoalsSchema() {
  console.log('🔍 Checking Student Improvement Goals Schema');
  console.log('=' .repeat(80));

  try {
    // Check student_improvement_goals table structure
    console.log('\n1. Checking student_improvement_goals table structure...');
    const goalsSample = await query(
      supabase
        .from('student_improvement_goals')
        .select('*')
        .limit(1)
    );

    if (goalsSample.rows.length > 0) {
      console.log('student_improvement_goals columns:');
      console.log(Object.keys(goalsSample.rows[0]));
      console.log('\nSample record:');
      console.log(JSON.stringify(goalsSample.rows[0], null, 2));
    } else {
      console.log('No records in student_improvement_goals table');
      
      // Try to insert a minimal record to see what columns are required
      console.log('\nTrying minimal insert to discover schema...');
      try {
        const testInsert = await query(
          supabase
            .from('student_improvement_goals')
            .insert({
              student_id: '1fd449cd-d3f6-4343-8298-f6e7392f2941',
              quadrant_id: 'persona',
              current_score: 75.0,
              target_score: 85.0
            })
            .select('*')
        );
        
        if (testInsert.rows.length > 0) {
          console.log('Test insert successful. Schema includes:');
          console.log(Object.keys(testInsert.rows[0]));
          
          // Clean up test record
          await query(
            supabase
              .from('student_improvement_goals')
              .delete()
              .eq('id', testInsert.rows[0].id)
          );
        }
      } catch (insertError) {
        console.log('Test insert failed:', insertError.message);
      }
    }

  } catch (error) {
    console.error('❌ Error during schema check:', error);
  }
}

// Run the check
checkImprovementGoalsSchema().then(() => {
  console.log('\n🏁 Schema check complete');
  process.exit(0);
}).catch(error => {
  console.error('❌ Schema check failed:', error);
  process.exit(1);
});
