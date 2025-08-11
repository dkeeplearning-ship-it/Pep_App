const { supabase, query } = require('./src/config/supabase');

async function insertSampleData() {
  console.log('🚀 Starting sample data insertion...');

  try {
    // 1. First, let's get existing data to work with
    console.log('\n📋 Getting existing data...');
    
    // Get existing quadrants
    const quadrantsResult = await query(
      supabase.from('quadrants').select('*').order('display_order')
    );
    console.log(`✅ Found ${quadrantsResult.rows.length} quadrants`);

    // Get existing components
    const componentsResult = await query(
      supabase.from('components').select('*').order('display_order')
    );
    console.log(`✅ Found ${componentsResult.rows.length} components`);

    // Get existing microcompetencies
    const microcompetenciesResult = await query(
      supabase.from('microcompetencies').select('*').order('display_order')
    );
    console.log(`✅ Found ${microcompetenciesResult.rows.length} microcompetencies`);

    // Get existing students
    const studentsResult = await query(
      supabase.from('students').select('*').limit(5)
    );
    console.log(`✅ Found ${studentsResult.rows.length} students`);

    // Get existing teachers
    const teachersResult = await query(
      supabase.from('teachers').select('*').limit(3)
    );
    console.log(`✅ Found ${teachersResult.rows.length} teachers`);

    // Get existing users to use as created_by
    const usersResult = await query(
      supabase.from('users').select('*').eq('role', 'admin').limit(1)
    );
    console.log(`✅ Found ${usersResult.rows.length} admin users`);

    if (usersResult.rows.length === 0) {
      console.log('❌ No admin users found. Cannot create interventions without created_by field.');
      return;
    }

    const adminUser = usersResult.rows[0];

    // Check if we have microcompetencies, if not create some
    if (microcompetenciesResult.rows.length === 0) {
      console.log('\n🧩 No microcompetencies found. Creating sample microcompetencies...');

      if (componentsResult.rows.length > 0) {
        const sampleMicrocompetencies = [];

        componentsResult.rows.forEach((component, compIndex) => {
          // Create 4 microcompetencies per component
          for (let i = 1; i <= 4; i++) {
            sampleMicrocompetencies.push({
              component_id: component.id,
              name: `${component.name} Skill ${i}`,
              description: `Microcompetency ${i} for ${component.name}`,
              weightage: 25.0, // Equal weightage
              max_score: 10.0,
              display_order: i,
              is_active: true
            });
          }
        });

        const newMicrocompetenciesResult = await query(
          supabase
            .from('microcompetencies')
            .insert(sampleMicrocompetencies)
            .select('*')
        );
        console.log(`✅ Created ${newMicrocompetenciesResult.rows.length} microcompetencies`);

        // Update our microcompetencies result
        microcompetenciesResult.rows = newMicrocompetenciesResult.rows;
      }
    }

    // 2. Create sample interventions
    console.log('\n🎯 Creating sample interventions...');

    const sampleInterventions = [
      {
        name: 'Leadership Development Program',
        description: 'Comprehensive leadership skills development intervention focusing on communication, decision-making, and team management.',
        start_date: '2024-01-15',
        end_date: '2024-03-15',
        status: 'Active',
        scoring_deadline: '2024-03-10T23:59:59Z',
        is_scoring_open: true,
        total_weightage: 100.0,
        created_by: adminUser.id
      },
      {
        name: 'Professional Communication Workshop',
        description: 'Intensive workshop on professional communication skills including verbal, written, and presentation skills.',
        start_date: '2024-02-01',
        end_date: '2024-04-01',
        status: 'Active',
        scoring_deadline: '2024-03-25T23:59:59Z',
        is_scoring_open: true,
        total_weightage: 100.0,
        created_by: adminUser.id
      },
      {
        name: 'Wellness and Mindfulness Program',
        description: 'Holistic wellness program covering physical fitness, mental health, and stress management techniques.',
        start_date: '2024-01-01',
        end_date: '2024-06-01',
        status: 'Active',
        scoring_deadline: '2024-05-25T23:59:59Z',
        is_scoring_open: true,
        total_weightage: 100.0,
        created_by: adminUser.id
      }
    ];

    const interventionsResult = await query(
      supabase
        .from('interventions')
        .insert(sampleInterventions)
        .select('*')
    );
    console.log(`✅ Created ${interventionsResult.rows.length} interventions`);

    // 3. Add microcompetencies to interventions
    console.log('\n🧩 Adding microcompetencies to interventions...');
    
    if (microcompetenciesResult.rows.length > 0 && interventionsResult.rows.length > 0) {
      const intervention1 = interventionsResult.rows[0];
      const intervention2 = interventionsResult.rows[1];
      const intervention3 = interventionsResult.rows[2];

      // For Leadership Development Program - select diverse microcompetencies
      const leadership_microcompetencies = microcompetenciesResult.rows.slice(0, 6).map((micro, index) => ({
        intervention_id: intervention1.id,
        microcompetency_id: micro.id,
        weightage: index < 3 ? 20.0 : 13.33, // First 3 get 20%, rest get 13.33%
        max_score: 10.0,
        is_active: true
      }));

      // For Communication Workshop - focus on communication microcompetencies
      const communication_microcompetencies = microcompetenciesResult.rows.slice(2, 7).map((micro, index) => ({
        intervention_id: intervention2.id,
        microcompetency_id: micro.id,
        weightage: 20.0, // Equal weightage
        max_score: 10.0,
        is_active: true
      }));

      // For Wellness Program - focus on wellness microcompetencies
      const wellness_microcompetencies = microcompetenciesResult.rows.slice(4, 8).map((micro, index) => ({
        intervention_id: intervention3.id,
        microcompetency_id: micro.id,
        weightage: 25.0, // Equal weightage
        max_score: 10.0,
        is_active: true
      }));

      // Insert intervention microcompetencies
      const allInterventionMicros = [
        ...leadership_microcompetencies,
        ...communication_microcompetencies,
        ...wellness_microcompetencies
      ];

      const interventionMicrosResult = await query(
        supabase
          .from('intervention_microcompetencies')
          .insert(allInterventionMicros)
          .select('*')
      );
      console.log(`✅ Added ${interventionMicrosResult.rows.length} microcompetencies to interventions`);

      // 4. Assign teachers to microcompetencies
      console.log('\n👩‍🏫 Assigning teachers to microcompetencies...');
      
      if (teachersResult.rows.length > 0) {
        const teacher1 = teachersResult.rows[0];
        const teacher2 = teachersResult.rows.length > 1 ? teachersResult.rows[1] : teacher1;
        const teacher3 = teachersResult.rows.length > 2 ? teachersResult.rows[2] : teacher1;

        const teacherAssignments = [];

        // Assign teachers to Leadership Program microcompetencies
        leadership_microcompetencies.forEach((micro, index) => {
          const teacher = index % 2 === 0 ? teacher1 : teacher2;
          teacherAssignments.push({
            intervention_id: intervention1.id,
            teacher_id: teacher.id,
            microcompetency_id: micro.microcompetency_id,
            can_score: true,
            can_create_tasks: true,
            assigned_by: adminUser.id, // Using admin user
            is_active: true
          });
        });

        // Assign teachers to Communication Workshop microcompetencies
        communication_microcompetencies.forEach((micro, index) => {
          const teacher = index % 2 === 0 ? teacher2 : teacher3;
          teacherAssignments.push({
            intervention_id: intervention2.id,
            teacher_id: teacher.id,
            microcompetency_id: micro.microcompetency_id,
            can_score: true,
            can_create_tasks: true,
            assigned_by: adminUser.id,
            is_active: true
          });
        });

        // Assign teachers to Wellness Program microcompetencies
        wellness_microcompetencies.forEach((micro, index) => {
          const teacher = index % 2 === 0 ? teacher3 : teacher1;
          teacherAssignments.push({
            intervention_id: intervention3.id,
            teacher_id: teacher.id,
            microcompetency_id: micro.microcompetency_id,
            can_score: true,
            can_create_tasks: true,
            assigned_by: adminUser.id,
            is_active: true
          });
        });

        const teacherAssignmentsResult = await query(
          supabase
            .from('teacher_microcompetency_assignments')
            .insert(teacherAssignments)
            .select('*')
        );
        console.log(`✅ Created ${teacherAssignmentsResult.rows.length} teacher assignments`);

        // 5. Enroll students in interventions
        console.log('\n👨‍🎓 Enrolling students in interventions...');
        
        if (studentsResult.rows.length > 0) {
          const studentEnrollments = [];

          studentsResult.rows.forEach(student => {
            // Enroll each student in all interventions
            interventionsResult.rows.forEach(intervention => {
              studentEnrollments.push({
                student_id: student.id,
                intervention_id: intervention.id,
                enrollment_date: new Date().toISOString(),
                enrollment_status: 'Enrolled',
                enrolled_by: adminUser.id
              });
            });
          });

          const enrollmentsResult = await query(
            supabase
              .from('intervention_enrollments')
              .insert(studentEnrollments)
              .select('*')
          );
          console.log(`✅ Created ${enrollmentsResult.rows.length} student enrollments`);

          // 6. Create sample microcompetency scores
          console.log('\n📊 Creating sample microcompetency scores...');
          
          const sampleScores = [];
          
          // Create scores for first 2 students in first intervention
          const studentsToScore = studentsResult.rows.slice(0, 2);
          const microcompetenciesToScore = leadership_microcompetencies.slice(0, 3);

          studentsToScore.forEach(student => {
            microcompetenciesToScore.forEach(micro => {
              // Find the teacher assigned to this microcompetency
              const assignment = teacherAssignments.find(
                ta => ta.intervention_id === intervention1.id && 
                      ta.microcompetency_id === micro.microcompetency_id
              );
              
              if (assignment) {
                const randomScore = Math.floor(Math.random() * 3) + 7; // Random score between 7-10
                sampleScores.push({
                  student_id: student.id,
                  intervention_id: intervention1.id,
                  microcompetency_id: micro.microcompetency_id,
                  obtained_score: randomScore,
                  max_score: 10.0,
                  scored_by: assignment.teacher_id,
                  feedback: `Good performance in ${microcompetenciesResult.rows.find(m => m.id === micro.microcompetency_id)?.name || 'this area'}. Keep up the excellent work!`,
                  status: 'Submitted'
                });
              }
            });
          });

          if (sampleScores.length > 0) {
            const scoresResult = await query(
              supabase
                .from('microcompetency_scores')
                .insert(sampleScores)
                .select('*')
            );
            console.log(`✅ Created ${scoresResult.rows.length} sample scores`);
          }
        }
      }
    }

    console.log('\n🎉 Sample data insertion completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`- Interventions: ${interventionsResult.rows.length}`);
    console.log(`- Microcompetency assignments: ${interventionsResult.rows.length > 0 ? 'Created' : 'Skipped'}`);
    console.log(`- Teacher assignments: ${teachersResult.rows.length > 0 ? 'Created' : 'Skipped'}`);
    console.log(`- Student enrollments: ${studentsResult.rows.length > 0 ? 'Created' : 'Skipped'}`);
    console.log(`- Sample scores: Created for testing`);

    return {
      interventions: interventionsResult.rows,
      students: studentsResult.rows,
      teachers: teachersResult.rows,
      microcompetencies: microcompetenciesResult.rows
    };

  } catch (error) {
    console.error('❌ Error inserting sample data:', error);
    throw error;
  }
}

// Run the function if this file is executed directly
if (require.main === module) {
  insertSampleData()
    .then(() => {
      console.log('✅ Sample data insertion completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Sample data insertion failed:', error);
      process.exit(1);
    });
}

module.exports = { insertSampleData };
