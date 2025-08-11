import { Grade, StatusType, Student, QuadrantScore, Component, Leaderboard } from '@/types/api';

// Legacy types for backward compatibility
interface QuadrantData {
  id: string;
  name: string;
  score: number;
  maxScore: number;
  weightage: number;
  obtained: number;
  grade: Grade;
  status: StatusType;
  attendance?: number;
  eligibility?: string;
  components: Component[];
  sub_categories?: any[];
}

interface TermData {
  termId: string;
  termName: string;
  quadrants: QuadrantData[];
}

// NOTE: Grade and status calculations are now handled by the backend unified scoring system
// These helper functions are deprecated and should not be used for new calculations

// Legacy helper function - DO NOT USE for new calculations
// Use backend-calculated grades instead
const calculateGrade = (score: number): Grade => {
  console.warn('⚠️ Using deprecated frontend grade calculation. Use backend-calculated grades instead.');
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  if (score >= 50) return 'D';
  if (score >= 40) return 'E';
  return 'IC';
};

// Legacy helper function - DO NOT USE for new calculations
// Use backend-calculated status instead
const calculateStatus = (score: number, threshold: number): StatusType => {
  console.warn('⚠️ Using deprecated frontend status calculation. Use backend-calculated status instead.');
  if (score >= 70) return 'Good';
  if (score >= 40) return 'Progress';
  return 'Deteriorate';
};

// Transform API student performance data to UI format
export const transformStudentPerformanceData = (
  apiPerformance: any
): Student => {
  // Handle different API response structures
  const data = apiPerformance.data || apiPerformance;
  const { student, currentTerm, termHistory, batchStats } = data;

  // Debug logging to understand the data structure
  console.log('🔍 transformStudentPerformanceData - Raw API data:', data);
  console.log('🔍 currentTerm quadrants:', currentTerm?.quadrants);



  // Validate required data
  if (!student || !currentTerm) {
    throw new Error('Invalid API response: missing student or currentTerm data');
  }

  // Transform current term data with safety checks
  const currentTermData: TermData = {
    termId: currentTerm.termId || 'current',
    termName: currentTerm.termName || 'Current Term',
    quadrants: Array.isArray(currentTerm.quadrants) ? currentTerm.quadrants.map((q: any) => {
      // Transform sub-categories (NEW hierarchical structure)
      const subCategories = Array.isArray(q.sub_categories) ? q.sub_categories.map((sc: any) => ({
        id: sc.id || 'unknown',
        name: sc.name || 'Unknown Sub-category',
        description: sc.description || '',
        weightage: typeof sc.weightage === 'number' ? sc.weightage : 0,
        obtained: typeof sc.obtained === 'number' ? sc.obtained : 0,
        maxScore: typeof sc.maxScore === 'number' ? sc.maxScore : 0,
        components: Array.isArray(sc.components) ? sc.components.map((c: any) => ({
          id: c.id || 'unknown',
          name: c.name || 'Unknown Component',
          description: c.description || '',
          score: typeof c.score === 'number' ? c.score : 0,
          maxScore: typeof c.maxScore === 'number' ? c.maxScore : 100,
                      weightage: typeof c.weightage === 'number' ? c.weightage : 0,
            status: c.status as StatusType || 'Deteriorate',
            category: (c.category === 'SHL' || c.category === 'Professional' || c.category === 'Academic' || c.category === 'Physical' || c.category === 'Mental' || c.category === 'Social' || c.category === 'Conduct') ? c.category : undefined,
          microcompetencies: Array.isArray(c.microcompetencies) ? c.microcompetencies.map((m: any) => ({
            id: m.id || 'unknown',
            name: m.name || 'Unknown Microcompetency',
            description: m.description || '',
            score: typeof m.score === 'number' ? m.score : undefined,
            maxScore: typeof m.maxScore === 'number' ? m.maxScore : 10,
            weightage: typeof m.weightage === 'number' ? m.weightage : 0,
            feedback: m.feedback || '',
            status: m.status as StatusType || 'IC',
            scoredAt: m.scoredAt || null,
            scoredBy: m.scoredBy || null
          })) : []
        })) : []
      })) : [];

      // Transform flat components (for backward compatibility)
      const flatComponents = Array.isArray(q.components) ? q.components.map((c: any) => ({
        id: c.id || 'unknown',
        name: c.name || 'Unknown Component',
        score: typeof c.score === 'number' ? c.score : 0,
        maxScore: typeof c.maxScore === 'number' ? c.maxScore : 100,
          status: c.status as StatusType || 'Deteriorate',
          category: (c.category === 'SHL' || c.category === 'Professional' || c.category === 'Academic' || c.category === 'Physical' || c.category === 'Mental' || c.category === 'Social' || c.category === 'Conduct') ? c.category : undefined,
        microcompetencies: Array.isArray(c.microcompetencies) ? c.microcompetencies.map((m: any) => ({
          id: m.id || 'unknown',
          name: m.name || 'Unknown Microcompetency',
          description: m.description || '',
          score: typeof m.score === 'number' ? m.score : undefined,
          maxScore: typeof m.maxScore === 'number' ? m.maxScore : 10,
          weightage: typeof m.weightage === 'number' ? m.weightage : 0,
          feedback: m.feedback || '',
          status: m.status as StatusType || 'IC',
          scoredAt: m.scoredAt || null,
          scoredBy: m.scoredBy || null
        })) : []
      })) : [];

      return {
        id: q.id || 'unknown',
        name: q.name || 'Unknown Quadrant',
        description: q.description || '',
        weightage: typeof q.weightage === 'number' ? q.weightage : 0,
        obtained: typeof q.obtained === 'number' ? q.obtained : 0,
        maxScore: typeof q.maxScore === 'number' ? q.maxScore : (typeof q.weightage === 'number' ? q.weightage : 100), // Use maxScore from API or fallback to weightage
        status: q.status as StatusType || 'IC',
        attendance: typeof q.attendance === 'number' ? q.attendance : 0,
        eligibility: (q.eligibility === 'Eligible' || q.eligibility === 'Not Eligible') ? q.eligibility : 'Not Eligible',
        rank: typeof q.rank === 'number' ? q.rank : 0,
        sub_categories: subCategories, // NEW: Full hierarchical structure
        components: flatComponents // LEGACY: For backward compatibility
      };
    }) : [],
    tests: Array.isArray(currentTerm.tests) ? currentTerm.tests : [],
    totalScore: typeof currentTerm.totalScore === 'number' ? currentTerm.totalScore : 0,
    grade: currentTerm.grade as Grade || 'IC',
    overallStatus: currentTerm.overallStatus as StatusType || 'Deteriorate'
  };

  // Debug logging for quadrant data
  console.log('🔍 Transformed quadrants:', currentTermData.quadrants.map(q => ({
    name: q.name,
    obtained: q.obtained,
    maxScore: q.maxScore,
    weightage: q.weightage
  })));

  // Transform term history if available
  const allTerms = Array.isArray(termHistory) ?
    [currentTermData, ...termHistory
      .filter((term: any) => term.termId !== currentTermData.termId) // Avoid duplicates
      .map((term: any) => ({
        termId: term.termId || 'unknown',
        termName: term.termName || 'Unknown Term',
        quadrants: Array.isArray(term.quadrants) ? term.quadrants : [],
        tests: Array.isArray(term.tests) ? term.tests : [],
        totalScore: typeof term.totalScore === 'number' ? term.totalScore : 0,
        grade: term.grade as Grade || 'IC',
        overallStatus: term.overallStatus as StatusType || 'Deteriorate'
      }))] :
    [currentTermData];

  return {
    id: student.id || 'unknown',
    name: student.name || 'Unknown Student',
    registrationNo: student.registrationNo || 'Unknown',
    course: student.course || 'Unknown Course',
    batch: student.batch || 'Unknown Batch',
    section: student.section || 'Unknown Section',
    houseName: student.houseName || 'Unknown House',
    gender: (student.gender === 'Male' || student.gender === 'Female' || student.gender === 'Other') ? student.gender : 'Male',
    currentTerm: student.currentTerm || currentTermData.termId,
    terms: allTerms,
    totalScore: currentTermData.totalScore,
    grade: currentTermData.grade,
    overallStatus: currentTermData.overallStatus,
    quadrants: currentTermData.quadrants,
    tests: []
  };
};

// Legacy transform function for backward compatibility
export const transformStudentData = (
  apiStudent: any,
  apiScoreSummary: any,
  apiQuadrants: any[]
): Student => {
  const student = apiStudent.data;
  const summary = apiScoreSummary?.summary || {};

  // Get the actual overall score from API
  const actualOverallScore = summary.total_score || summary.weighted_score || 0;
  const actualGrade = summary.overall_grade || 'IC';

  // Transform quadrant scores to UI format
  const quadrants: QuadrantData[] = summary.quadrant_scores && summary.quadrant_scores.length > 0 ?
    summary.quadrant_scores.map((qs: any) => ({
      id: qs.quadrant_id,
      name: qs.quadrant_name,
      weightage: qs.weight_percentage,
      obtained: qs.total_score || 0, // Use total_score as obtained points
      maxScore: qs.weight_percentage, // Use weightage as max score (since scores are out of weightage)
      status: qs.status as StatusType,
      attendance: qs.attendance_percentage,
      eligibility: qs.is_attendance_met ? 'Eligible' : 'Not Eligible' as const,
      rank: 1, // Mock rank for now
      components: [] // Will be populated from detailed scores if needed
    })) :
    // When no scores exist, show quadrants with 0 scores
    apiQuadrants.map((q) => ({
      id: q.id,
      name: q.name,
      weightage: q.weightage,
      obtained: 0,
      maxScore: q.weightage, // Maximum points possible for this quadrant
      status: 'IC' as StatusType,
      attendance: 0,
      eligibility: 'Not Eligible' as const,
      rank: 0,
      components: []
    }));

  // Create term data
  const termData: TermData = {
    termId: summary.term?.id || student.current_term || 'term-1',
    termName: summary.term?.name || 'Current Term',
    quadrants,
    tests: [],
    totalScore: actualOverallScore,
    grade: actualGrade as Grade,
    overallStatus: summary.overall_status as StatusType || calculateStatus(actualOverallScore, 75) as StatusType
  };

  return {
    id: student.id,
    name: student.name,
    registrationNo: student.registration_no,
    course: student.course || 'PGDM',
    batch: student.batch_name || student.batches?.name || 'Unknown Batch',
    section: student.section_name || student.sections?.name || 'Unknown Section',
    houseName: student.house_name || student.houses?.name || 'Unknown House',
    gender: student.gender || 'Male',
    currentTerm: summary.term?.id || student.current_term || 'term-1',
    terms: [termData],
    totalScore: actualOverallScore,
    grade: actualGrade as Grade,
    overallStatus: termData.overallStatus,
    quadrants,
    tests: []
  };
};

// Transform detailed scores to components
export const transformScoresToComponents = (apiScores: any[]): Component[] => {
  return apiScores.map(score => ({
    id: score.component.id,
    name: score.component.name,
    score: score.obtained_score,
    maxScore: score.max_score,
    status: score.status as StatusType,
    category: score.component.category as 'SHL' | 'Professional'
  }));
};

// Transform API leaderboard data to UI format
export const transformLeaderboardData = (apiLeaderboard: any): Leaderboard => {
  return {
    overall: {
      topStudents: apiLeaderboard.data.overall.topStudents,
      userRank: apiLeaderboard.data.overall.userRank,
      batchAvg: apiLeaderboard.data.overall.batchAvg,
      batchBest: apiLeaderboard.data.overall.batchBest
    },
    quadrants: apiLeaderboard.data.quadrants
  };
};

// Fallback: Generate mock leaderboard data when API is not available
export const generateMockLeaderboard = (studentScore: number): Leaderboard => {
  const generateTopStudents = (baseScore: number) => [
    { id: '1', name: 'Student A', score: Math.min(100, Math.max(0, baseScore + 5)) },
    { id: '2', name: 'Student B', score: Math.min(100, Math.max(0, baseScore + 3)) },
    { id: '3', name: 'Student C', score: Math.min(100, Math.max(0, baseScore + 1)) },
  ];

  return {
    overall: {
      topStudents: generateTopStudents(studentScore),
      userRank: studentScore > 0 ? 4 : 0,
      batchAvg: Math.max(0, studentScore > 0 ? studentScore - 10 : 0),
      batchBest: Math.min(100, Math.max(0, studentScore + 5))
    },
    quadrants: {
      persona: {
        topStudents: generateTopStudents(studentScore),
        userRank: studentScore > 0 ? 3 : 0,
        batchAvg: Math.max(0, studentScore > 0 ? studentScore - 8 : 0),
        batchBest: Math.min(100, Math.max(0, studentScore + 3))
      },
      wellness: {
        topStudents: generateTopStudents(studentScore),
        userRank: studentScore > 0 ? 5 : 0,
        batchAvg: Math.max(0, studentScore > 0 ? studentScore - 12 : 0),
        batchBest: Math.min(100, Math.max(0, studentScore + 7))
      },
      behavior: {
        topStudents: generateTopStudents(studentScore),
        userRank: studentScore > 0 ? 2 : 0,
        batchAvg: Math.max(0, studentScore > 0 ? studentScore - 5 : 0),
        batchBest: Math.min(100, Math.max(0, studentScore + 2))
      },
      discipline: {
        topStudents: generateTopStudents(studentScore),
        userRank: studentScore > 0 ? 1 : 0,
        batchAvg: Math.max(0, studentScore > 0 ? studentScore - 3 : 0),
        batchBest: Math.min(100, Math.max(0, studentScore + 1))
      }
    }
  };
};

// DEPRECATED: Mock data generators have been removed
// Components should handle API errors gracefully instead of using fallback mock data

// REMOVED: Mock time series and term comparison generators
// These have been removed to prevent masking API issues

// Transform API attendance data to UI format
export const transformAttendanceData = (apiAttendance: any) => {
  const data = apiAttendance.data || apiAttendance;

  // Handle the actual API response structure
  const overallData = data.overall || {};
  const quadrants = data.quadrants || [];

  // Find wellness quadrant data
  const wellnessQuadrant = quadrants.find((q: any) =>
    q.id === 'wellness' || q.name?.toLowerCase().includes('wellness')
  );

  return {
    overall: typeof overallData.attendance === 'number' ? overallData.attendance : 0,
    wellness: wellnessQuadrant?.attendance || 0,
    eligibility: typeof overallData.eligibility === 'string' ? overallData.eligibility : 'Unknown',
    history: Array.isArray(data.history) ? data.history : [],
    quadrantAttendance: Array.isArray(quadrants) ? quadrants : []
  };
};

// REMOVED: Mock attendance data generator
// Components should handle API errors gracefully instead of using fallback mock data