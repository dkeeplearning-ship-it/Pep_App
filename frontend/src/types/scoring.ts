// Scoring-specific types
export interface ScoreEntry {
  id: string;
  student_id: string;
  intervention_id: string;
  microcompetency_id: string;
  obtained_score: number;
  max_score: number;
  percentage: number;
  feedback?: string;
  status: 'Draft' | 'Submitted' | 'Approved';
  scored_at: string;
  scored_by: string;
  created_at: string;
  updated_at: string;
}

export interface ScoreWithDetails extends ScoreEntry {
  students: {
    id: string;
    name: string;
    registration_no: string;
  };
  microcompetencies: {
    id: string;
    name: string;
    description: string;
    max_score: number;
    components: {
      id: string;
      name: string;
      category: string;
      sub_categories: {
        id: string;
        name: string;
        quadrants: {
          id: string;
          name: string;
        };
      };
    };
  };
  interventions: {
    id: string;
    name: string;
    status: string;
  };
}

export interface CompetencyScore {
  competency_id: string;
  competency_name: string;
  obtained_score: number;
  max_score: number;
  percentage: number;
  microcompetency_count: number;
  scored_microcompetencies: number;
  is_complete: boolean;
}

export interface QuadrantScore {
  quadrant_id: string;
  quadrant_name: string;
  obtained_score: number;
  max_score: number;
  percentage: number;
  competency_count: number;
  completed_competencies: number;
  is_complete: boolean;
}

export interface OverallScore {
  obtained_score: number;
  max_score: number;
  percentage: number;
  total_microcompetencies: number;
  scored_microcompetencies: number;
  completion_percentage: number;
  grade?: string;
  rank?: number;
}

export interface StudentScoreBreakdown {
  student: {
    id: string;
    name: string;
    registration_no: string;
  };
  intervention: {
    id: string;
    name: string;
    status: string;
    start_date: string;
    end_date: string;
  };
  microcompetency_scores: ScoreWithDetails[];
  competency_scores: CompetencyScore[];
  quadrant_scores: QuadrantScore[];
  overall_score: OverallScore;
  last_updated: string;
}

// Form Types for Scoring
export interface SingleScoreForm {
  obtained_score: number;
  feedback?: string;
  notes?: string;
}

export interface BatchScoreForm {
  scores: Array<{
    student_id: string;
    obtained_score: number;
    notes?: string;
  }>;
}

export interface ScoreValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// API Response Types
export interface StudentScoresResponse {
  success: boolean;
  data: StudentScoreBreakdown;
}

export interface ScoreCalculationResponse {
  success: boolean;
  data: {
    competency_scores: CompetencyScore[];
    quadrant_scores: QuadrantScore[];
    overall_score: OverallScore;
  };
}

export interface ScoreStatisticsResponse {
  success: boolean;
  data: {
    intervention: {
      id: string;
      name: string;
      status: string;
    };
    statistics: {
      total_students: number;
      scored_students: number;
      average_score: number;
      highest_score: number;
      lowest_score: number;
      score_distribution: Record<string, number>;
      quadrant_averages: Record<string, number>;
      completion_rate: number;
    };
  };
}

// Utility Types
export interface ScoreRange {
  min: number;
  max: number;
  step: number;
}

export interface GradingScale {
  grade: string;
  min_percentage: number;
  max_percentage: number;
  color: string;
  description: string;
}

export enum ScoreStatus {
  DRAFT = 'Draft',
  SUBMITTED = 'Submitted',
  APPROVED = 'Approved'
}

export enum ScoreValidationLevel {
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info'
}
