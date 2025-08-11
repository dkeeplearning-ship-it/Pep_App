// Core Intervention Types
export interface Intervention {
  id: string;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  status: 'Draft' | 'Active' | 'Completed' | 'Cancelled';
  max_students: number;
  objectives: string[];
  prerequisites?: string[];
  is_scoring_open: boolean;
  scoring_deadline?: string;
  created_at: string;
  updated_at: string;
  enrolled_count?: number;
}

// Microcompetency Types
export interface Microcompetency {
  id: string;
  name: string;
  description: string;
  weightage: number;
  max_score: number;
  display_order: number;
  is_active: boolean;
  component_id: string;
  created_at: string;
  components?: {
    id: string;
    name: string;
    category: string;
    sub_categories?: {
      id: string;
      name: string;
      quadrants?: {
        id: string;
        name: string;
      };
    };
  };
}

export interface InterventionMicrocompetency {
  id: string;
  intervention_id: string;
  microcompetency_id: string;
  weightage: number;
  max_score: number;
  is_active: boolean;
  created_at: string;
  microcompetencies?: Microcompetency;
  quadrant?: {
    id: string;
    name: string;
  };
}

export interface InterventionDetails extends Intervention {
  microcompetencies: InterventionMicrocompetency[];
  teacher_assignments: TeacherMicrocompetencyAssignment[];
  enrolled_students: EnrolledStudent[];
}

export interface TeacherMicrocompetencyAssignment {
  id: string;
  teacher_id: string;
  intervention_id: string;
  microcompetency_id: string;
  can_score: boolean;
  can_view: boolean;
  assigned_at: string;
  is_active: boolean;
  teachers?: {
    id: string;
    name: string;
    employee_id: string;
  };
  microcompetencies?: Microcompetency;
}

// Student and Scoring Types
export interface EnrolledStudent {
  id: string;
  name: string;
  registration_no: string;
  enrollment_status: 'Enrolled' | 'Completed' | 'Dropped' | 'Pending';
  enrolled_at: string;
  completion_percentage?: number;
}

export interface MicrocompetencyScore {
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
  students?: {
    id: string;
    name: string;
    registration_no: string;
  };
  microcompetencies?: Microcompetency;
}

export interface StudentInterventionScore {
  student_id: string;
  intervention_id: string;
  microcompetency_scores: MicrocompetencyScore[];
  competency_scores: {
    competency_id: string;
    competency_name: string;
    obtained_score: number;
    max_score: number;
    percentage: number;
  }[];
  quadrant_scores: {
    quadrant_id: string;
    quadrant_name: string;
    obtained_score: number;
    max_score: number;
    percentage: number;
  }[];
  overall_score: {
    obtained_score: number;
    max_score: number;
    percentage: number;
  };
}

// Teacher Assignment Types
export interface TeacherInterventionAssignment {
  id: string;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  status: string;
  is_scoring_open: boolean;
  scoring_deadline?: string;
  created_at: string;
  assigned_microcompetencies_count: number;
}

export interface TeacherInterventionDetails {
  intervention: {
    id: string;
    name: string;
    description: string;
    start_date: string;
    end_date: string;
    status: string;
    max_students: number;
    objectives: string[];
    is_scoring_open: boolean;
    scoring_deadline?: string;
  };
  assignment: {
    role: string;
    assigned_quadrants: string[];
    permissions: string[];
  };
  microcompetencies: InterventionMicrocompetency[];
  enrolled_students: EnrolledStudent[];
}

// Analytics and Statistics Types
export interface InterventionStatistics {
  intervention: {
    id: string;
    name: string;
    status: string;
    duration_days: number;
  };
  enrollment: {
    total_enrolled: number;
    max_capacity: number;
    capacity_utilization: string;
    by_status: Record<string, number>;
  };
  scoring: {
    total_microcompetencies: number;
    scored_microcompetencies: number;
    scoring_progress: number;
    average_score: number;
    by_quadrant: Record<string, {
      total: number;
      scored: number;
      average_score: number;
    }>;
  };
  deadlines: {
    scoring_deadline?: string;
    days_remaining?: number;
    is_overdue: boolean;
  };
}

// Form Types for Admin Operations
export interface CreateInterventionForm {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  maxStudents: number;
  objectives: string[];
  prerequisites: string[];
}

export interface AddMicrocompetenciesToInterventionForm {
  microcompetencyIds: string[];
  quadrantId: string;
}

export interface AssignTeachersToMicrocompetenciesForm {
  assignments: Array<{
    teacherId: string;
    microcompetencyIds: string[];
    canScore: boolean;
    canView: boolean;
  }>;
}

export interface SetScoringDeadlineForm {
  scoring_deadline: string;
}

export interface ScoreMicrocompetencyForm {
  obtained_score: number;
  feedback?: string;
}

export interface BatchScoreMicrocompetencyForm {
  scores: Array<{
    student_id: string;
    obtained_score: number;
    notes?: string;
  }>;
}

// Filter and Search Types
export interface InterventionFilters {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface MicrocompetencyFilters {
  quadrantId?: string;
  componentId?: string;
  search?: string;
  includeInactive?: boolean;
  page?: number;
  limit?: number;
}

export interface StudentFilters {
  interventionId?: string;
  enrollmentStatus?: string;
  search?: string;
}

// API Response Types
export interface InterventionListResponse {
  success: boolean;
  data: {
    interventions: Intervention[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

export interface InterventionResponse {
  success: boolean;
  data: InterventionDetails;
}

export interface MicrocompetencyListResponse {
  success: boolean;
  data: Microcompetency[];
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  filters?: MicrocompetencyFilters;
}

export interface InterventionMicrocompetenciesResponse {
  success: boolean;
  data: {
    intervention: Intervention;
    microcompetencies: InterventionMicrocompetency[];
    totalCount: number;
  };
  filters?: {
    quadrantId?: string;
    includeInactive: boolean;
  };
}

export interface TeacherInterventionsResponse {
  success: boolean;
  message: string;
  data: {
    teacher: {
      id: string;
      name: string;
      employee_id: string;
    };
    interventions: TeacherInterventionAssignment[];
  };
}

export interface TeacherMicrocompetenciesResponse {
  success: boolean;
  data: {
    intervention: Intervention;
    microcompetencies: InterventionMicrocompetency[];
    assignment: TeacherMicrocompetencyAssignment;
  };
}

export interface StudentScoresResponse {
  success: boolean;
  data: {
    student: {
      id: string;
      name: string;
      registration_no: string;
    };
    scores: StudentInterventionScore[];
  };
}

export interface InterventionStatisticsResponse {
  success: boolean;
  data: InterventionStatistics;
}

// Utility Types
export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  timestamp?: string;
}

export interface ApiError {
  success: false;
  error: string;
  message?: string;
  timestamp: string;
}

// Enums for better type safety
export enum InterventionStatus {
  DRAFT = 'Draft',
  ACTIVE = 'Active',
  COMPLETED = 'Completed',
  CANCELLED = 'Cancelled'
}

export enum EnrollmentStatus {
  ENROLLED = 'Enrolled',
  COMPLETED = 'Completed',
  DROPPED = 'Dropped',
  PENDING = 'Pending'
}

export enum ScoreStatus {
  DRAFT = 'Draft',
  SUBMITTED = 'Submitted',
  APPROVED = 'Approved'
}

export enum TeacherRole {
  LEAD = 'Lead',
  ASSISTANT = 'Assistant',
  OBSERVER = 'Observer'
}
