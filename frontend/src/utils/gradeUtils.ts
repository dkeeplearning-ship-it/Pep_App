/**
 * Grade Calculation Utilities
 * Implements Excel system grading scale for PEP Score Nexus
 */

export type GradeType = 'A+' | 'A' | 'B' | 'C' | 'D' | 'E' | 'IC' | 'NC';
export type StatusType = 'Cleared' | 'Not Cleared' | 'Incomplete';

/**
 * Calculate grade based on score percentage (Excel system requirements)
 * @param score - Score percentage (0-100)
 * @returns Grade (A+, A, B, C, D, E, IC, NC)
 */
export function calculateGrade(score: number): GradeType {
  // Excel system grading scale:
  // A+: Above 80 (Excellent)
  // A: 66-79 (Good)
  // B: 50-65 (Average)
  // C: 34-49 (Marginal)
  // D: Below 34 (Poor)
  // E: Incomplete/Failed
  // IC: Incomplete
  // NC: Not Cleared
  
  if (score >= 80) return 'A+';
  if (score >= 66) return 'A';
  if (score >= 50) return 'B';
  if (score >= 34) return 'C';
  if (score > 0) return 'D';
  return 'E'; // For 0 or null scores
}

/**
 * Calculate status based on score percentage (Excel system requirements)
 * @param score - Score percentage (0-100)
 * @returns Status (Cleared, Not Cleared, Incomplete)
 */
export function calculateStatus(score: number): StatusType {
  // Excel system status determination:
  // Cleared: Meets minimum thresholds in all quadrants + 80% attendance
  // Not Cleared: Fails to meet minimum requirements
  // Incomplete: Missing assessments
  
  if (score >= 50) return 'Cleared';
  if (score > 0) return 'Not Cleared';
  return 'Incomplete';
}

/**
 * Get grade color class for UI display
 * @param grade - Grade value
 * @returns CSS class string
 */
export function getGradeColor(grade: GradeType): string {
  switch (grade) {
    case 'A+':
      return 'text-green-600 bg-green-50 border-green-200';
    case 'A':
      return 'text-blue-600 bg-blue-50 border-blue-200';
    case 'B':
      return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    case 'C':
      return 'text-orange-600 bg-orange-50 border-orange-200';
    case 'D':
      return 'text-red-600 bg-red-50 border-red-200';
    case 'E':
    case 'IC':
    case 'NC':
      return 'text-gray-600 bg-gray-50 border-gray-200';
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200';
  }
}

/**
 * Get status color class for UI display
 * @param status - Status value
 * @returns CSS class string
 */
export function getStatusColor(status: StatusType): string {
  switch (status) {
    case 'Cleared':
      return 'text-green-600 bg-green-50 border-green-200';
    case 'Not Cleared':
      return 'text-red-600 bg-red-50 border-red-200';
    case 'Incomplete':
      return 'text-gray-600 bg-gray-50 border-gray-200';
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200';
  }
}

/**
 * Get grade description
 * @param grade - Grade value
 * @returns Description string
 */
export function getGradeDescription(grade: GradeType): string {
  switch (grade) {
    case 'A+':
      return 'Excellent (Above 80%)';
    case 'A':
      return 'Good (66-79%)';
    case 'B':
      return 'Average (50-65%)';
    case 'C':
      return 'Marginal (34-49%)';
    case 'D':
      return 'Poor (Below 34%)';
    case 'E':
      return 'Incomplete/Failed';
    case 'IC':
      return 'Incomplete';
    case 'NC':
      return 'Not Cleared';
    default:
      return 'Unknown';
  }
}

/**
 * Excel system grading scale data for UI display
 */
export const GRADING_SCALE = [
  { grade: 'A+' as GradeType, range: '80-100%', description: 'Excellent', status: 'Cleared' },
  { grade: 'A' as GradeType, range: '66-79%', description: 'Good', status: 'Cleared' },
  { grade: 'B' as GradeType, range: '50-65%', description: 'Average', status: 'Cleared' },
  { grade: 'C' as GradeType, range: '34-49%', description: 'Marginal', status: 'Cleared' },
  { grade: 'D' as GradeType, range: 'Below 34%', description: 'Poor', status: 'Not Cleared' },
  { grade: 'E' as GradeType, range: '0%', description: 'Incomplete/Failed', status: 'Not Cleared' },
  { grade: 'IC' as GradeType, range: '-', description: 'Incomplete', status: 'Incomplete' },
  { grade: 'NC' as GradeType, range: '-', description: 'Not Cleared', status: 'Not Cleared' }
];

/**
 * Quadrant weightage configuration (Excel system)
 */
export const QUADRANT_WEIGHTAGE = {
  Persona: 50,
  Wellness: 30,
  Behavior: 10,
  Discipline: 10
} as const;

/**
 * Calculate weighted HPS score
 * @param quadrantScores - Object with quadrant names as keys and scores as values
 * @returns Weighted HPS score
 */
export function calculateWeightedHPS(quadrantScores: Record<string, number>): number {
  const persona = quadrantScores['Persona'] || 0;
  const wellness = quadrantScores['Wellness'] || 0;
  const behavior = quadrantScores['Behavior'] || 0;
  const discipline = quadrantScores['Discipline'] || 0;

  // Calculate weighted HPS using Excel system weightages:
  // Persona: 50%, Wellness: 30%, Behavior: 10%, Discipline: 10%
  return (persona * 0.5) + (wellness * 0.3) + (behavior * 0.1) + (discipline * 0.1);
}
