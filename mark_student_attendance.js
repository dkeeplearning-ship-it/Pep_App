#!/usr/bin/env node

const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api/v1';
const ADMIN_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJmM2FkMmZiYi04ZjhmLTRiYTQtYWZiNi1iMTA2ZmE3MzFjNzYiLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3NTIxNzU1ODgsImV4cCI6MTc1MjI2MTk4OH0.bhf2XkQEG7riwRDP7cQ6qx3N9Rs3VCfRvD6WSGkAPAo';
const STUDENT_ID = '7a67a808-e8ec-4022-9a49-077a75b939fe';

const terms = [
  { id: '733c5378-7278-4a4d-a2c8-14855370b33f', name: 'Term 1 / Level 0' },
  { id: '03b35f5a-babc-4863-871c-471606daaa17', name: 'Term 1' },
  { id: '863bf5b0-c7c7-436f-9c9b-364ced18ed68', name: 'Term 2' },
  { id: '7c08f415-fa83-476f-936c-a4e0a2a6e10c', name: 'term 3' },
  { id: '6e697a94-4354-4961-8194-e76a45681f12', name: 'Term 4' },
  { id: 'b0d1e6de-6c75-4f9c-ae72-17c1b5dfa3bf', name: 'Term 3' }
];

const quadrants = [
  { id: 'persona', name: 'Persona', minAttendance: 80 },
  { id: 'wellness', name: 'Wellness', minAttendance: 80 },
  { id: 'behavior', name: 'Behavior', minAttendance: 0 },
  { id: 'discipline', name: 'Discipline', minAttendance: 0 }
];

async function markAttendance() {
  console.log('🎯 Starting attendance marking for student:', STUDENT_ID);
  
  for (const term of terms) {
    console.log(`\n📅 Processing ${term.name} (${term.id})`);
    
    for (const quadrant of quadrants) {
      // Set attendance to 85% for all quadrants (above minimum requirement)
      const attendancePercentage = 85;
      
      try {
        const attendanceData = {
          studentId: STUDENT_ID,
          termId: term.id,
          quadrantId: quadrant.id,
          attendancePercentage: attendancePercentage,
          totalClasses: 100,
          attendedClasses: 85,
          notes: `Marked for testing - ${attendancePercentage}% attendance`
        };

        console.log(`  📊 Marking ${quadrant.name}: ${attendancePercentage}%`);
        
        // Try to create attendance record
        const response = await axios.post(
          `${BASE_URL}/attendance`,
          attendanceData,
          {
            headers: {
              'Authorization': `Bearer ${ADMIN_TOKEN}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        console.log(`  ✅ ${quadrant.name} attendance marked successfully`);
        
      } catch (error) {
        if (error.response?.status === 409) {
          console.log(`  ⚠️  ${quadrant.name} attendance already exists, updating...`);
          
          // Try to update existing record
          try {
            const updateResponse = await axios.put(
              `${BASE_URL}/attendance/${STUDENT_ID}/${term.id}/${quadrant.id}`,
              {
                attendancePercentage: attendancePercentage,
                totalClasses: 100,
                attendedClasses: 85,
                notes: `Updated for testing - ${attendancePercentage}% attendance`
              },
              {
                headers: {
                  'Authorization': `Bearer ${ADMIN_TOKEN}`,
                  'Content-Type': 'application/json'
                }
              }
            );
            console.log(`  ✅ ${quadrant.name} attendance updated successfully`);
          } catch (updateError) {
            console.log(`  ❌ Failed to update ${quadrant.name}:`, updateError.response?.data?.message || updateError.message);
          }
        } else {
          console.log(`  ❌ Failed to mark ${quadrant.name}:`, error.response?.data?.message || error.message);
        }
      }
      
      // Small delay to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  console.log('\n🎉 Attendance marking completed!');
  console.log('\n📋 Summary:');
  console.log(`- Student ID: ${STUDENT_ID}`);
  console.log(`- Terms processed: ${terms.length}`);
  console.log(`- Quadrants per term: ${quadrants.length}`);
  console.log(`- Attendance percentage: 85% (above 80% requirement)`);
  
  console.log('\n🔍 Now testing student login...');
  
  // Test student login
  try {
    const loginResponse = await axios.post(
      `${BASE_URL}/auth/login`,
      {
        username: 's',
        password: '12345678'
      }
    );
    
    console.log('✅ Student login successful!');
    console.log('📱 Student can now access dashboard with proper attendance data');
    
  } catch (loginError) {
    console.log('❌ Student login failed:', loginError.response?.data?.message || loginError.message);
  }
}

// Run the script
markAttendance().catch(console.error);
