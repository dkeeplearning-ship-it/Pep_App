/**
 * API Type Definitions for PEP Score Nexus
 * 
 * These types match the actual API responses from the backend
 * and replace the mock data types for proper type safety.
 */

// Grade types based on Excel system
export type Grade = 'A+' | 'A' | 'B' | 'C' | 'D' | 'E' | 'IC' | 'NC';

// Status types for components and quadrants
export type StatusType = 'Good' | 'Progress' | 'Deteriorate' | 'Cleared' | 'Not Cleared' | 'Incomplete' | 'Attendance Shortage' | 'IC' | 'Not Scored';

// Component categories
export type ComponentCategory = 'SHL' | 'Professional' | 'Academic' | 'Physical' | 'Mental' | 'Social' | 'Conduct';

// API Response wrapper
export interface APIResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  timestamp?: string;
  error?: string;
}

// Student API Types
export interface Student {
  id: string;
  name: string;
  registration_no: string;
  course: string;
  batch: string;
  section: string;
  house_name?: string;
  gender: 'Male' | 'Female' | 'Other';
  phone?: string;
  email?: string;
  status: string;
  current_term_id: string;
  overall_score?: number;
  grade?: Grade;
  created_at: string;
  updated_at: string;
}

// Component API Types
export interface Component {
  id: string;
  sub_category_id: string;
  name: string;
  description: string;
  weightage: number;
  max_score: number;
  category: ComponentCategory;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
  sub_categories?: {
    id: string;
    name: string;
    quadrants: {
      id: string;
      name: string;
    };
  };
}

// SHL Competency API Types
export interface SHLCompetency {
  id: string;
  name: string;
  description: string;
  shortCode: string; // A&C, C, E, L, N, P, T
  rawScore: number;
  maxScore: number;
  percentage: number;
  rating: number; // 1-5 scale
  isAssessed: boolean;
  assessmentDate: string | null;
}

export interface SHLCompetencyAssessment {
  success: boolean;
  studentId: string;
  termId: string;
  competencyScores: SHLCompetency[];
  overallMetrics: {
    totalRawScore: number;
    totalMaxScore: number;
    overallPercentage: number;
    potentialLevel: string;
    topCompetencies: Array<{
      shortCode: string;
      name: string;
      percentage: number;
      rating: number;
    }>;
    bottomCompetencies: Array<{
      shortCode: string;
      name: string;
      percentage: number;
      rating: number;
    }>;
  };
  calculatedAt: string;
}

// Microcompetency API Types
export interface Microcompetency {
  id: string;
  component_id: string;
  name: string;
  description: string;
  weightage: number;
  max_score: number;
  display_order: number;
  is_active: boolean;
  components?: {
    id: string;
    name: string;
    category: ComponentCategory;
    sub_categories: {
      id: string;
      name: string;
      quadrants: {
        id: string;
        name: string;
      };
    };
  };
}

// Score API Types
export interface Score {
  id: string;
  student_id: string;
  component_id: string;
  microcompetency_id?: string;
  obtained_score: number;
  max_score: number;
  percentage: number;
  grade: Grade;
  status: StatusType;
  term_id: string;
  notes?: string;
  assessed_by: string;
  assessment_date: string;
}

export interface QuadrantScore {
  quadrant_id: string;
  quadrant_name: string;
  weight_percentage: number;
  total_score: number;
  weighted_score: number;
  grade: Grade;
  status: StatusType;
  attendance_percentage: number;
  attendance_required: boolean;
  min_attendance_percentage: number;
  is_attendance_met: boolean;
}

export interface StudentScoreSummary {
  student_id: string;
  term_id: string;
  total_score: number;
  weighted_score: number;
  overall_grade: Grade;
  overall_status: StatusType;
  quadrant_scores: QuadrantScore[];
  term: {
    id: string;
    name: string;
    academic_year: string;
    is_current: boolean;
  };
}

// Intervention API Types
export interface Intervention {
  id: string;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  status: string;
  max_students: number;
  enrolled_count: number;
  objectives: string[];
  prerequisites?: string[];
  is_scoring_open: boolean;
  scoring_deadline?: string;
  created_at: string;
  updated_at: string;
}

export interface InterventionStudent {
  id: string;
  name: string;
  registration_no: string;
  enrollment_status: string;
  enrollment_date: string;
  current_score?: number;
  completion_percentage?: number;
}

// Teacher API Types
export interface Teacher {
  id: string;
  name: string;
  employee_id: string;
  email: string;
  phone?: string;
  department?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

// Term API Types
export interface Term {
  id: string;
  name: string;
  academic_year: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  status: string;
  created_at: string;
  updated_at: string;
}

// Attendance API Types
export interface AttendanceRecord {
  id: string;
  student_id: string;
  term_id: string;
  quadrant_id: string;
  attendance_date: string;
  is_present: boolean;
  reason?: string;
  marked_by: string;
}

export interface AttendanceSummary {
  student_id: string;
  term_id: string;
  quadrant_id: string;
  total_sessions: number;
  attended_sessions: number;
  percentage: number;
  last_updated: string;
}

// Reports API Types
export interface ReportsData {
  overview: {
    totalInterventions: number;
    activeInterventions: number;
    totalStudents: number;
    totalTeachers: number;
    totalScores: number;
  };
  interventionStats: Array<{
    id: string;
    name: string;
    status: string;
    enrollmentCount: number;
    teacherCount: number;
    startDate: string;
    endDate: string;
  }>;
  studentPerformance: {
    gradeDistribution: Record<Grade, number>;
    scoreDistribution: Record<string, number>;
    averageScore: number;
    topPerformers: Array<{
      id: string;
      name: string;
      score: number;
      grade: Grade;
    }>;
  };
  attendanceAnalytics: {
    overallAttendance: number;
    quadrantAttendance: Record<string, number>;
    eligibilityStats: {
      eligible: number;
      notEligible: number;
    };
  };
}

// Leaderboard API Types
export interface LeaderboardEntry {
  id: string;
  name: string;
  score: number;
  rank?: number;
}

export interface Leaderboard {
  overall: {
    topStudents: LeaderboardEntry[];
    userRank: number;
    batchAvg: number;
    batchBest: number;
  };
  quadrants: Record<string, {
    topStudents: LeaderboardEntry[];
    userRank: number;
    batchAvg: number;
    batchBest: number;
  }>;
}

// Error types
export interface APIError {
  success: false;
  error: string;
  message: string;
  timestamp: string;
}
