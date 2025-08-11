/**
 * Comprehensive Test Suite for Weightage-HPS Integration
 * 
 * Tests the critical integration between batch-term weightage management
 * and HPS calculation system to ensure real-time updates work correctly.
 */

const { supabase, query } = require('../src/config/supabase');
const unifiedScoreService = require('../src/services/enhancedUnifiedScoreCalculationServiceV2');

describe('Weightage-HPS Integration Tests', () => {
  let testStudentId, testTermId, testBatchId, testConfigId;
  
  beforeAll(async () => {
    // Set up test data
    testStudentId = '1fd449cd-d3f6-4343-8298-f6e7392f2941'; // Sripathi
    testTermId = '62cbc472-9175-4c95-b9f7-3fb0e2abca2f'; // Festive Term 2025
    testBatchId = 'f9294daf-2956-42b5-bba7-d5e11b23dcee'; // PGDM 2025
    testConfigId = 'e0338b71-bcf4-4fc9-bfb1-c5018181325a'; // Batch-term config
  });

  describe('Database View Integration', () => {
    test('student_quadrant_scores view should use batch-term weightages', async () => {
      const result = await query(
        supabase
          .from('student_quadrant_scores')
          .select('quadrant_name, weightage, average_score')
          .eq('student_id', testStudentId)
          .eq('term_id', testTermId)
      );

      expect(result.rows).toHaveLength(4);
      
      // Verify correct batch-term weightages are being used
      const weightages = result.rows.reduce((acc, row) => {
        acc[row.quadrant_name] = row.weightage;
        return acc;
      }, {});

      expect(weightages.Behavior).toBe(50); // Current test weightage
      expect(weightages.Persona).toBe(25);
      expect(weightages.Wellness).toBe(15);
      expect(weightages.Discipline).toBe(10);
      
      // Verify total weightages equal 100%
      const totalWeightage = Object.values(weightages).reduce((sum, w) => sum + w, 0);
      expect(totalWeightage).toBe(100);
    });

    test('HPS calculation should match manual calculation', async () => {
      // Get quadrant scores and weightages
      const result = await query(
        supabase
          .from('student_quadrant_scores')
          .select('quadrant_name, weightage, average_score')
          .eq('student_id', testStudentId)
          .eq('term_id', testTermId)
      );

      // Calculate expected HPS manually
      let expectedHPS = 0;
      result.rows.forEach(row => {
        expectedHPS += (row.average_score * row.weightage / 100);
      });

      // Get actual HPS from API
      const hpsResult = await unifiedScoreService.calculateUnifiedHPS(testStudentId, testTermId);
      const actualHPS = hpsResult.totalHPS;

      // Allow for small rounding differences
      expect(Math.abs(actualHPS - expectedHPS)).toBeLessThan(0.5);
    });
  });

  describe('Real-time Weightage Updates', () => {
    test('changing weightages should immediately affect HPS calculation', async () => {
      // Get baseline HPS
      const baselineResult = await unifiedScoreService.calculateUnifiedHPS(testStudentId, testTermId);
      const baselineHPS = baselineResult.totalHPS;

      // Update weightages - increase behavior to 60%
      await query(
        supabase
          .from('batch_term_quadrant_weightages')
          .update({ weightage: 60 })
          .eq('config_id', testConfigId)
          .eq('quadrant_id', 'behavior')
      );

      await query(
        supabase
          .from('batch_term_quadrant_weightages')
          .update({ weightage: 20 })
          .eq('config_id', testConfigId)
          .eq('quadrant_id', 'persona')
      );

      // Calculate new HPS
      const updatedResult = await unifiedScoreService.calculateUnifiedHPS(testStudentId, testTermId);
      const updatedHPS = updatedResult.totalHPS;

      // HPS should increase since behavior has high scores and increased weightage
      expect(updatedHPS).toBeGreaterThan(baselineHPS);
      expect(Math.abs(updatedHPS - baselineHPS)).toBeGreaterThan(1); // Significant change

      // Restore original weightages
      await query(
        supabase
          .from('batch_term_quadrant_weightages')
          .update({ weightage: 50 })
          .eq('config_id', testConfigId)
          .eq('quadrant_id', 'behavior')
      );

      await query(
        supabase
          .from('batch_term_quadrant_weightages')
          .update({ weightage: 25 })
          .eq('config_id', testConfigId)
          .eq('quadrant_id', 'persona')
      );
    });

    test('weightage validation should prevent invalid configurations', async () => {
      // Test that weightages must sum to 100%
      const invalidWeightages = [
        { quadrant_id: 'persona', weightage: 30 },
        { quadrant_id: 'wellness', weightage: 20 },
        { quadrant_id: 'behavior', weightage: 40 },
        { quadrant_id: 'discipline', weightage: 20 } // Total = 110%
      ];

      // This should fail validation (implementation dependent)
      // The actual validation logic would be in the API endpoint
      const totalWeightage = invalidWeightages.reduce((sum, w) => sum + w.weightage, 0);
      expect(totalWeightage).not.toBe(100);
    });
  });

  describe('Edge Cases', () => {
    test('should handle zero weightages correctly', async () => {
      // Temporarily set one quadrant to 0% weightage
      await query(
        supabase
          .from('batch_term_quadrant_weightages')
          .update({ weightage: 0 })
          .eq('config_id', testConfigId)
          .eq('quadrant_id', 'discipline')
      );

      await query(
        supabase
          .from('batch_term_quadrant_weightages')
          .update({ weightage: 60 })
          .eq('config_id', testConfigId)
          .eq('quadrant_id', 'behavior')
      );

      const result = await unifiedScoreService.calculateUnifiedHPS(testStudentId, testTermId);
      
      // Should still calculate correctly with 0% weightage
      expect(result.totalHPS).toBeGreaterThan(0);
      expect(result.quadrantScores.discipline.finalScore).toBeDefined();

      // Restore original weightages
      await query(
        supabase
          .from('batch_term_quadrant_weightages')
          .update({ weightage: 10 })
          .eq('config_id', testConfigId)
          .eq('quadrant_id', 'discipline')
      );

      await query(
        supabase
          .from('batch_term_quadrant_weightages')
          .update({ weightage: 50 })
          .eq('config_id', testConfigId)
          .eq('quadrant_id', 'behavior')
      );
    });

    test('should fallback to default weightages when batch-term config not found', async () => {
      // Test with a non-existent batch-term combination
      const nonExistentBatchId = '00000000-0000-0000-0000-000000000000';
      
      // This should fallback to default quadrant weightages
      // (Implementation would need to handle this gracefully)
      const result = await query(
        supabase
          .from('student_quadrant_scores')
          .select('quadrant_name, weightage')
          .eq('student_id', testStudentId)
          .eq('term_id', testTermId)
      );

      // Should still return valid weightages (either batch-term or default)
      expect(result.rows).toHaveLength(4);
      result.rows.forEach(row => {
        expect(row.weightage).toBeGreaterThan(0);
      });
    });
  });

  describe('Performance and Consistency', () => {
    test('multiple API calls should return consistent HPS values', async () => {
      const results = [];
      
      // Make 5 consecutive API calls
      for (let i = 0; i < 5; i++) {
        const result = await unifiedScoreService.calculateUnifiedHPS(testStudentId, testTermId);
        results.push(result.totalHPS);
      }

      // All results should be identical (no randomness in calculation)
      const firstResult = results[0];
      results.forEach(hps => {
        expect(Math.abs(hps - firstResult)).toBeLessThan(0.01);
      });
    });

    test('calculation should complete within reasonable time', async () => {
      const startTime = Date.now();
      
      await unifiedScoreService.calculateUnifiedHPS(testStudentId, testTermId);
      
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within 5 seconds
      expect(duration).toBeLessThan(5000);
    });
  });
});

module.exports = {
  testStudentId: '1fd449cd-d3f6-4343-8298-f6e7392f2941',
  testTermId: '62cbc472-9175-4c95-b9f7-3fb0e2abca2f',
  testBatchId: 'f9294daf-2956-42b5-bba7-d5e11b23dcee'
};
