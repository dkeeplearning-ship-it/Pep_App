#!/usr/bin/env node

const EnhancedUnifiedScoreCalculationServiceV2 = require('./src/services/enhancedUnifiedScoreCalculationServiceV2');
const { supabase } = require('./src/config/supabase');

async function testScoreCalculation() {
  try {
    console.log('🧮 Testing Enhanced Unified Score Calculation Service V2...');
    
    // Get a test student
    const { data: students } = await supabase
      .from('students')
      .select('id, batch_id')
      .limit(1);
      
    if (!students || students.length === 0) {
      console.log('❌ No test student available');
      return;
    }
    
    const testStudentId = students[0].id;
    
    // Get a test term
    const { data: terms } = await supabase
      .from('terms')
      .select('id')
      .eq('is_active', true)
      .limit(1);
      
    if (!terms || terms.length === 0) {
      console.log('❌ No active term available');
      return;
    }
    
    const testTermId = terms[0].id;
    
    console.log(`📊 Testing score calculation for student ${testStudentId} in term ${testTermId}`);
    
    const result = await EnhancedUnifiedScoreCalculationServiceV2.calculateUnifiedHPS(testStudentId, testTermId);
    
    console.log('✅ Enhanced Score Calculation Service V2 SUCCESS!');
    console.log(`   📈 Calculated HPS: ${result.totalHPS?.toFixed(2)}%`);
    console.log(`   📊 Calculation Version: ${result.calculationVersion}`);
    console.log(`   ⚖️  Weightage Source: ${result.weightageSource}`);
    console.log(`   🎯 Grade: ${result.grade}`);
    console.log(`   📋 Status: ${result.status}`);
    console.log(`   🔢 Quadrants: ${Object.keys(result.quadrantScores).length}`);
    
    // Show quadrant breakdown
    console.log('\n📊 Quadrant Breakdown:');
    Object.values(result.quadrantScores).forEach(quadrant => {
      console.log(`   ${quadrant.name}: ${quadrant.averageScore?.toFixed(2)}% (${quadrant.source})`);
    });
    
  } catch (error) {
    console.error('❌ Score calculation test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

if (require.main === module) {
  testScoreCalculation()
    .then(() => {
      console.log('\n✨ Score calculation test complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Score calculation test failed:', error);
      process.exit(1);
    });
}
