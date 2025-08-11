const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

const BASE_URL = 'http://localhost:3001/api/v1';
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI0ZmRlMzQxMS1mMzhiLTQ0ZDktYWU5Yi03ZTNhZjY1NzU1MzQiLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3NTA3NzM0MTIsImV4cCI6MTc1MDg1OTgxMn0.xZh25d8wYjIQYHVaccuwMOIAi7Gjja05RfbcEYD2VCo';
const INTERVENTION_ID = 'cb204938-4585-4a17-b8ad-834d2c857c7e';

async function curlGet(url) {
  const { stdout } = await execAsync(`curl -s -H "Authorization: Bearer ${TOKEN}" "${url}"`);
  return JSON.parse(stdout);
}

async function testTeacherAssignmentFix() {
  try {
    console.log('🧪 Testing Teacher Assignment Fix...\n');

    // 1. Get intervention microcompetencies
    console.log('1. Fetching intervention microcompetencies...');
    const microcompetenciesResponse = await curlGet(
      `${BASE_URL}/interventions/${INTERVENTION_ID}/microcompetencies`
    );
    const assignedMicrocompetencies = microcompetenciesResponse.data.microcompetencies;
    console.log(`   Found ${assignedMicrocompetencies.length} microcompetencies in intervention`);

    // 2. Get teacher assignments
    console.log('2. Fetching teacher assignments...');
    const teacherAssignmentsResponse = await curlGet(
      `${BASE_URL}/interventions/${INTERVENTION_ID}/teacher-assignments`
    );
    const teacherAssignments = teacherAssignmentsResponse.data.assignments;
    console.log(`   Found ${teacherAssignments.length} teacher assignments`);

    // 3. Calculate unassigned microcompetencies (simulate frontend logic)
    console.log('3. Calculating unassigned microcompetencies...');
    const assignedIds = new Set();
    teacherAssignments.forEach(assignment => {
      assignment.microcompetency_assignments.forEach(ma => {
        assignedIds.add(ma.microcompetency_id);
      });
    });

    const unassignedMicrocompetencies = assignedMicrocompetencies.filter(mc => {
      const microcompetencyId = mc.microcompetencies?.id || mc.microcompetency_id;
      return !assignedIds.has(microcompetencyId);
    });

    console.log(`   Assigned microcompetency IDs: [${Array.from(assignedIds).join(', ')}]`);
    console.log(`   Intervention microcompetency IDs: [${assignedMicrocompetencies.map(mc => mc.microcompetencies?.id || mc.microcompetency_id).join(', ')}]`);
    console.log(`   Unassigned microcompetencies: ${unassignedMicrocompetencies.length}`);

    // 4. Test result
    if (unassignedMicrocompetencies.length > 0) {
      console.log('\n✅ SUCCESS: Found unassigned microcompetencies!');
      console.log('   The "Assign First Teacher" button should now be visible.');
      unassignedMicrocompetencies.forEach((mc, index) => {
        console.log(`   ${index + 1}. ${mc.microcompetencies?.name || 'Unknown'} (ID: ${mc.microcompetencies?.id || mc.microcompetency_id})`);
      });
    } else {
      console.log('\n❌ ISSUE: All microcompetencies appear to be assigned.');
      console.log('   The dialog will show "All microcompetencies are already assigned"');
    }

    console.log('\n📊 Summary:');
    console.log(`   - Total microcompetencies in intervention: ${assignedMicrocompetencies.length}`);
    console.log(`   - Total teacher assignments: ${teacherAssignments.length}`);
    console.log(`   - Assigned microcompetencies: ${assignedIds.size}`);
    console.log(`   - Unassigned microcompetencies: ${unassignedMicrocompetencies.length}`);

  } catch (error) {
    console.error('❌ Error testing teacher assignment fix:', error.message);
  }
}

testTeacherAssignmentFix();
