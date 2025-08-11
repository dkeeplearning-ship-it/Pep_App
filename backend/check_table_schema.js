const { supabase, query } = require('./src/config/supabase');

async function checkTableSchema() {
  console.log('🔍 Checking Table Schema');
  console.log('=' .repeat(80));

  try {
    // Check intervention_enrollments table structure
    console.log('\n1. Checking intervention_enrollments table structure...');
    const enrollmentSample = await query(
      supabase
        .from('intervention_enrollments')
        .select('*')
        .limit(1)
    );

    if (enrollmentSample.rows.length > 0) {
      console.log('intervention_enrollments columns:');
      console.log(Object.keys(enrollmentSample.rows[0]));
      console.log('\nSample record:');
      console.log(JSON.stringify(enrollmentSample.rows[0], null, 2));
    } else {
      console.log('No records in intervention_enrollments table');
    }

    // Check student_terms table structure
    console.log('\n2. Checking student_terms table structure...');
    const studentTermSample = await query(
      supabase
        .from('student_terms')
        .select('*')
        .limit(1)
    );

    if (studentTermSample.rows.length > 0) {
      console.log('student_terms columns:');
      console.log(Object.keys(studentTermSample.rows[0]));
      console.log('\nSample record:');
      console.log(JSON.stringify(studentTermSample.rows[0], null, 2));
    } else {
      console.log('No records in student_terms table');
    }

    // Check students table structure
    console.log('\n3. Checking students table structure...');
    const studentSample = await query(
      supabase
        .from('students')
        .select('*')
        .limit(1)
    );

    if (studentSample.rows.length > 0) {
      console.log('students columns:');
      console.log(Object.keys(studentSample.rows[0]));
    }

  } catch (error) {
    console.error('❌ Error during schema check:', error);
  }
}

// Run the check
checkTableSchema().then(() => {
  console.log('\n🏁 Schema check complete');
  process.exit(0);
}).catch(error => {
  console.error('❌ Schema check failed:', error);
  process.exit(1);
});
