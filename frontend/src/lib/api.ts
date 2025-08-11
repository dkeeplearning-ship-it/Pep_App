import { toast } from 'sonner';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

// Make toast available globally for error handling
if (typeof window !== 'undefined') {
  (window as any).toast = toast;
}

// Get auth token from localStorage
const getAuthToken = (): string | null => {
  return localStorage.getItem('authToken');
};

// Create headers with auth token
const createHeaders = (): HeadersInit => {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

// Token refresh function
const refreshToken = async (): Promise<string | null> => {
  try {
    const refreshTokenValue = localStorage.getItem('refreshToken');
    if (!refreshTokenValue) {
      return null;
    }

    const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        refreshToken: refreshTokenValue
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.data.token) {
        localStorage.setItem('authToken', data.data.token);
        if (data.data.refreshToken) {
          localStorage.setItem('refreshToken', data.data.refreshToken);
        }
        return data.data.token;
      }
    }
    return null;
  } catch (error) {
    console.error('Token refresh failed:', error);
    return null;
  }
};

// Generic API request function with automatic token refresh
const apiRequest = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const url = `${API_BASE_URL}${endpoint}`;

  const makeRequest = async (headers: HeadersInit): Promise<Response> => {
    const config: RequestInit = {
      headers,
      ...options,
    };
    return await fetch(url, config);
  };

  try {
    // First attempt with current token
    let response = await makeRequest(createHeaders());

    // If unauthorized and we have a refresh token, try to refresh
    if (response.status === 401) {
      const newToken = await refreshToken();
      if (newToken) {
        // Retry with new token
        const newHeaders = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${newToken}`,
        };
        response = await makeRequest(newHeaders);
      } else {
        // Refresh failed, redirect to login
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('userData');

        // Show a toast notification
        toast.error('Your session has expired. Please log in again.');

        // Redirect to login with error message
        window.location.href = '/login?error=session_expired&message=Your%20session%20has%20expired.%20Please%20log%20in%20again.';
        throw new Error('Token expired');
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`API request failed for ${endpoint}:`, error);
    throw error;
  }
};

// Auth API calls
export const authAPI = {
  login: async (credentials: { username: string; password: string }) => {
    return apiRequest<{
      success: boolean;
      message: string;
      token: string;
      user: {
        id: string;
        username: string;
        email: string;
        role: string;
        name: string;
      };
    }>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  },

  getProfile: async () => {
    return apiRequest<{
      success: boolean;
      user: {
        id: string;
        username: string;
        email: string;
        role: string;
        name: string;
      };
    }>('/api/v1/auth/profile');
  },
};

// Batch Progression API calls
export const batchProgressionAPI = {
  getAllBatchesWithProgression: async () => {
    return apiRequest<{
      success: boolean;
      data: Array<{
        id: string;
        name: string;
        year: number;
        current_term_number: number;
        max_terms: number;
        batch_status: string;
        student_count: number;
        progressions: Array<{
          term_number: number;
          status: string;
          students_enrolled: number;
          students_completed: number;
          students_failed: number;
          start_date: string;
          end_date: string;
        }>;
        currentTermStats: {
          enrolled: number;
          active: number;
          completed: number;
          failed: number;
        };
      }>;
      timestamp: string;
    }>('/api/v1/level-progression/batches');
  },

  getBatchProgressionStatus: async (batchId: string) => {
    return apiRequest<{
      success: boolean;
      data: {
        batch: {
          id: string;
          name: string;
          current_term_number: number;
          max_terms: number;
          batch_status: string;
          student_count: number;
        };
        progressions: Array<{
          term_number: number;
          status: string;
          students_enrolled: number;
          students_completed: number;
          students_failed: number;
          start_date: string;
          end_date: string;
        }>;
        currentTermStats: {
          enrolled: number;
          active: number;
          completed: number;
          failed: number;
        };
      };
    }>(`/api/v1/level-progression/batches/${batchId}/progression-status`);
  },

  initializeBatchProgression: async (batchId: string, progressionPlan: any) => {
    return apiRequest<{
      success: boolean;
      data: any;
      message: string;
    }>(`/api/v1/level-progression/batches/${batchId}/initialize-progression`, {
      method: 'POST',
      body: JSON.stringify(progressionPlan),
    });
  },

  completeBatchTerm: async (batchId: string, termNumber: number) => {
    return apiRequest<{
      success: boolean;
      data: any;
      message: string;
    }>(`/api/v1/level-progression/batches/${batchId}/complete-term/${termNumber}`, {
      method: 'POST',
      body: JSON.stringify({ triggeredBy: 'admin' }),
    });
  },
};

// Level Progression API calls
export const levelProgressionAPI = {
  getStudentLevelProgression: async (studentId: string, termId: string) => {
    return apiRequest<{
      success: boolean;
      data: {
        current_level: number;
        level_name: string;
        eligibility_status: string;
        attendance_percentage: number;
        attendance_threshold: number;
        quadrant_clearance: {
          persona: boolean;
          wellness: boolean;
          behavior: boolean;
          discipline: boolean;
        };
        next_level_requirements: {
          attendance_required: number;
          quadrant_thresholds: Record<string, number>;
        };
        progression_history: Array<{
          level: number;
          completed_date: string;
          status: string;
        }>;
        can_progress: boolean;
      };
    }>(`/api/v1/level-progression/students/${studentId}/level-progression?termId=${termId}`);
  },

  getStudentRankings: async (studentId: string, termId: string) => {
    return apiRequest<{
      success: boolean;
      data: {
        overall_ranking: {
          rank_position: number;
          total_students: number;
          score: number;
          grade: string;
        };
        quadrant_rankings: Record<string, {
          rank_position: number;
          total_students: number;
          score: number;
        }>;
      };
    }>(`/api/v1/level-progression/students/${studentId}/rankings?termId=${termId}`);
  },

  updateAttendanceEligibility: async (studentId: string, attendanceData: any) => {
    return apiRequest<{
      success: boolean;
      data: any;
      message: string;
    }>(`/api/v1/level-progression/students/${studentId}/attendance-eligibility`, {
      method: 'POST',
      body: JSON.stringify(attendanceData),
    });
  },
};

// Term Management API calls
export const termManagementAPI = {
  createTerm: async (termData: any) => {
    return apiRequest<{
      success: boolean;
      data: any;
      message: string;
    }>('/api/v1/level-progression/terms/create', {
      method: 'POST',
      body: JSON.stringify(termData),
    });
  },

  activateTerm: async (termId: string, triggeredBy?: string) => {
    return apiRequest<{
      success: boolean;
      data: any;
      message: string;
    }>(`/api/v1/level-progression/terms/${termId}/activate`, {
      method: 'POST',
      body: JSON.stringify({ triggeredBy }),
    });
  },

  completeTerm: async (termId: string, triggeredBy?: string) => {
    return apiRequest<{
      success: boolean;
      data: any;
      message: string;
    }>(`/api/v1/level-progression/terms/${termId}/complete`, {
      method: 'POST',
      body: JSON.stringify({ triggeredBy }),
    });
  },

  archiveTerm: async (termId: string, triggeredBy?: string) => {
    return apiRequest<{
      success: boolean;
      data: any;
      message: string;
    }>(`/api/v1/level-progression/terms/${termId}/archive`, {
      method: 'POST',
      body: JSON.stringify({ triggeredBy }),
    });
  },

  getTermLifecycleStatus: async (termId: string) => {
    return apiRequest<{
      success: boolean;
      data: any;
    }>(`/api/v1/level-progression/terms/${termId}/lifecycle-status`);
  },

  autoTransitionTerms: async () => {
    return apiRequest<{
      success: boolean;
      data: any;
      message: string;
    }>('/api/v1/level-progression/terms/auto-transition', {
      method: 'POST',
    });
  },
};

// Student API calls
export const studentAPI = {
  getCurrentStudent: async () => {
    // First get the current user profile to get the student ID
    const profileResponse = await apiRequest<{
      success: boolean;
      data: {
        user: {
          id: string;
          email: string;
          role: string;
        };
        profile?: {
          id: string;
          registration_no: string;
          name: string;
          course: string;
          gender: string;
          phone: string;
          overall_score: number;
          grade: string;
          status: string;
          current_term: string;
          created_at: string;
          updated_at: string;
          batch_name: string;
          batch_year: number;
          section_name: string;
          house_name: string;
          house_color: string;
          batches: {
            name: string;
            year: number;
          };
          sections: {
            name: string;
          };
          houses: {
            name: string;
            color: string;
          };
        };
      };
    }>('/api/v1/auth/profile');

    if (!profileResponse.data.profile) {
      throw new Error('Student profile not found. Please contact your administrator to set up your student profile.');
    }

    return {
      success: true,
      message: 'Student profile retrieved successfully',
      data: profileResponse.data.profile,
      timestamp: new Date().toISOString()
    };
  },

  // Dashboard Performance API
  getStudentPerformance: async (studentId: string, termId?: string, includeHistory?: boolean) => {
    const params = new URLSearchParams();
    if (termId) params.append('termId', termId);
    if (includeHistory) params.append('includeHistory', 'true');

    return apiRequest<{
      success: boolean;
      data: {
        student: {
          id: string;
          name: string;
          registrationNo: string;
          course: string;
          batch: string;
          section: string;
          houseName: string;
          gender: string;
          currentTerm: string;
        };
        currentTerm: {
          termId: string;
          termName: string;
          totalScore: number;
          grade: string;
          overallStatus: string;
          quadrants: Array<{
            id: string;
            name: string;
            obtained: number;
            weightage: number;
            status: string;
            attendance: number;
            eligibility: string;
            rank: number;
            components: Array<{
              id: string;
              name: string;
              score: number;
              maxScore: number;
              status: string;
              category?: string;
            }>;
          }>;
        };
        termHistory?: Array<any>;
        batchStats: {
          averageScore: number;
          bestScore: number;
          totalStudents: number;
        };
      };
    }>(`/api/v1/students/${studentId}/performance${params.toString() ? '?' + params.toString() : ''}`);
  },

  // Leaderboard API
  getStudentLeaderboard: async (studentId: string, quadrantId?: string) => {
    const params = new URLSearchParams();
    if (quadrantId) params.append('quadrantId', quadrantId);

    return apiRequest<{
      success: boolean;
      data: {
        overall: {
          topStudents: Array<{ id: string; name: string; score: number }>;
          userRank: number;
          batchAvg: number;
          batchBest: number;
        };
        quadrants: Record<string, {
          topStudents: Array<{ id: string; name: string; score: number }>;
          userRank: number;
          batchAvg: number;
          batchBest: number;
        }>;
      };
    }>(`/api/v1/students/${studentId}/leaderboard${params.toString() ? '?' + params.toString() : ''}`);
  },

  // Attendance API
  getStudentAttendance: async (studentId: string, termId?: string) => {
    const params = new URLSearchParams();
    if (termId) params.append('termId', termId);

    return apiRequest<{
      success: boolean;
      data: {
        overall: {
          attendance: number;
          eligibility: string;
          required: number;
        };
        quadrants: Array<{
          id: string;
          name: string;
          attendance: number;
          eligibility: string;
          required: number;
          totalSessions: number;
          attendedSessions: number;
        }>;
        history: Array<{
          term: string;
          overall: number;
        }>;
      };
    }>(`/api/v1/students/${studentId}/attendance${params.toString() ? '?' + params.toString() : ''}`);
  },

  // Score Breakdown API
  getScoreBreakdown: async (studentId: string, termId?: string) => {
    const params = new URLSearchParams();
    if (termId) params.append('termId', termId);

    return apiRequest<{
      success: boolean;
      data: {
        termId: string;
        termName: string;
        totalScore: number;
        quadrants: Array<{
          id: string;
          name: string;
          weightage: number;
          obtainedScore: number;
          components: Array<{
            id: string;
            name: string;
            score: number;
            maxScore: number;
            percentage: number;
            grade: string;
            status: string;
            assessmentDate: string;
            assessedBy: string;
          }>;
        }>;
      };
    }>(`/api/v1/students/${studentId}/scores/breakdown${params.toString() ? '?' + params.toString() : ''}`);
  },

  // Quadrant Details API
  getQuadrantDetails: async (studentId: string, quadrantId: string, termId?: string) => {
    const params = new URLSearchParams();
    if (termId) params.append('termId', termId);

    return apiRequest<{
      success: boolean;
      data: {
        quadrant: {
          id: string;
          name: string;
          description: string;
          weightage: number;
          obtainedScore: number;
          status: string;
          attendance: number;
          eligibility: string;
          rank: number;
        };
        components: Array<{
          id: string;
          name: string;
          score: number;
          maxScore: number;
          percentage: number;
          grade: string;
          status: string;
          category: string;
          assessmentDate: string;
          assessedBy: string;
        }>;
        progressHistory: Array<{
          term: string;
          score: number;
        }>;
        batchComparison: {
          average: number;
          best: number;
          userRank: number;
        };
      };
    }>(`/api/v1/students/${studentId}/quadrants/${quadrantId}${params.toString() ? '?' + params.toString() : ''}`);
  },

  // Feedback APIs
  submitFeedback: async (studentId: string, feedbackData: {
    subject: string;
    category: string;
    message: string;
  }) => {
    return apiRequest<{
      success: boolean;
      message: string;
      data: {
        id: string;
        subject: string;
        category: string;
        message: string;
        status: string;
        submittedAt: string;
      };
    }>(`/api/v1/students/${studentId}/feedback`, {
      method: 'POST',
      body: JSON.stringify(feedbackData),
    });
  },

  getFeedbackHistory: async (studentId: string, page?: number, limit?: number) => {
    const params = new URLSearchParams();
    if (page) params.append('page', page.toString());
    if (limit) params.append('limit', limit.toString());

    return apiRequest<{
      success: boolean;
      data: {
        feedback: Array<{
          id: string;
          subject: string;
          category: string;
          message: string;
          status: string;
          submittedAt: string;
          response?: string;
          respondedAt?: string;
          respondedBy?: string;
        }>;
        pagination: {
          currentPage: number;
          totalPages: number;
          totalItems: number;
          itemsPerPage: number;
        };
      };
    }>(`/api/v1/students/${studentId}/feedback${params.toString() ? '?' + params.toString() : ''}`);
  },

  // Profile Management APIs
  getStudentProfile: async (studentId: string) => {
    return apiRequest<{
      success: boolean;
      data: {
        id: string;
        name: string;
        registrationNo: string;
        email: string;
        phone: string;
        course: string;
        batch: string;
        section: string;
        houseName: string;
        gender: string;
        preferences: any;
        createdAt: string;
        updatedAt: string;
      };
    }>(`/api/v1/students/${studentId}/profile`);
  },

  updateStudentProfile: async (studentId: string, profileData: {
    name?: string;
    email?: string;
    phone?: string;
    preferences?: any;
  }) => {
    return apiRequest<{
      success: boolean;
      message: string;
      data: {
        id: string;
        name: string;
        email: string;
        phone: string;
        preferences: any;
        updatedAt: string;
      };
    }>(`/api/v1/students/${studentId}/profile`, {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  },

  changePassword: async (studentId: string, passwordData: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) => {
    return apiRequest<{
      success: boolean;
      message: string;
    }>(`/api/v1/students/${studentId}/change-password`, {
      method: 'POST',
      body: JSON.stringify(passwordData),
    });
  },

  // Eligibility APIs
  getEligibilityRules: async () => {
    return apiRequest<{
      success: boolean;
      data: {
        quadrants: Array<{
          id: string;
          name: string;
          minimumAttendance: number;
          minimumScore: number;
          businessRules: any;
        }>;
        generalRules: Array<{
          rule: string;
          description: string;
        }>;
      };
    }>('/api/v1/students/eligibility-rules');
  },

  checkStudentEligibility: async (studentId: string, termId?: string) => {
    const params = new URLSearchParams();
    if (termId) params.append('termId', termId);

    return apiRequest<{
      success: boolean;
      data: {
        overallEligibility: boolean;
        quadrantEligibility: Array<{
          quadrantId: string;
          quadrantName: string;
          isEligible: boolean;
          attendanceStatus: boolean;
          scoreStatus: boolean;
          issues: Array<string>;
        }>;
        recommendations: Array<string>;
      };
    }>(`/api/v1/students/${studentId}/eligibility${params.toString() ? '?' + params.toString() : ''}`);
  },

  // Improvement Plan APIs
  getImprovementPlan: async (studentId: string, termId?: string) => {
    const params = new URLSearchParams();
    if (termId) params.append('termId', termId);

    return apiRequest<{
      success: boolean;
      data: {
        improvementAreas: Array<{
          quadrantId: string;
          quadrantName: string;
          currentScore: number;
          targetScore: number;
          priority: string;
          recommendations: Array<{
            action: string;
            description: string;
            timeframe: string;
            difficulty: string;
          }>;
        }>;
        overallGoals: Array<{
          goal: string;
          description: string;
          targetDate: string;
          progress: number;
        }>;
      };
    }>(`/api/v1/students/${studentId}/improvement-plan${params.toString() ? '?' + params.toString() : ''}`);
  },

  setImprovementGoals: async (studentId: string, goalsData: {
    goals: Array<{
      quadrantId: string;
      targetScore: number;
      targetDate: string;
      actions: Array<string>;
    }>;
  }) => {
    return apiRequest<{
      success: boolean;
      message: string;
      data: {
        goalsSet: number;
        targetDate: string;
      };
    }>(`/api/v1/students/${studentId}/improvement-goals`, {
      method: 'POST',
      body: JSON.stringify(goalsData),
    });
  },

  // Behavior Rating Scale API
  getBehaviorRatingScale: async (studentId: string, termId?: string) => {
    const params = new URLSearchParams();
    if (termId) params.append('termId', termId);

    return apiRequest<{
      success: boolean;
      data: {
        behaviorComponents: Array<{
          id: string;
          name: string;
          currentRating: number;
          maxRating: number;
          description: string;
          ratingScale: Array<{
            value: number;
            label: string;
            description: string;
          }>;
          history: Array<{
            term: string;
            rating: number;
          }>;
        }>;
        overallBehaviorScore: number;
        recommendations: Array<string>;
      };
    }>(`/api/v1/students/${studentId}/behavior-rating-scale${params.toString() ? '?' + params.toString() : ''}`);
  },

  // Get student intervention performance
  getStudentInterventionPerformance: async (studentId: string, termId?: string) => {
    const params = new URLSearchParams();
    if (termId) params.append('termId', termId);

    return apiRequest<{
      success: boolean;
      message: string;
      data: {
        interventions: Array<{
          id: string;
          name: string;
          status: string;
          enrollmentDate: string;
          currentScore: number;
          completionPercentage: number;
          microcompetencies: Array<{
            id: string;
            name: string;
            maxScore: number;
            obtainedScore: number;
            percentage: number;
            status: string;
            scoredAt: string;
          }>;
          progressData: {
            totalMicrocompetencies: number;
            completedMicrocompetencies: number;
            averageScore: number;
          };
        }>;
        summary: {
          totalInterventions: number;
          activeInterventions: number;
          completedInterventions: number;
          overallProgress: number;
          averageScore: number;
        };
      };
      timestamp: string;
    }>(`/api/v1/students/${studentId}/intervention-performance${params.toString() ? '?' + params.toString() : ''}`);
  },

  // Get student's enrolled interventions
  getStudentInterventions: async (studentId: string, termId?: string) => {
    const params = new URLSearchParams();
    if (termId) params.append('termId', termId);

    return apiRequest<{
      success: boolean;
      message: string;
      data: {
        student: {
          id: string;
          name: string;
          registration_no: string;
        };
        interventions: Array<{
          id: string;
          name: string;
          description: string;
          status: string;
          start_date: string;
          end_date: string;
          term_id: string;
          is_scoring_open: boolean;
          scoring_deadline?: string;
          max_students: number;
          objectives: string[];
          enrollment_status: string;
          enrolled_at: string;
          completion_percentage: number;
          current_score: number;
          enrolled_count: number;
        }>;
        totalCount: number;
        term?: {
          id: string;
          name: string;
          academic_year: string;
          is_current: boolean;
        };
        filters: {
          termId?: string;
        };
      };
      timestamp: string;
    }>(`/api/v1/students/${studentId}/interventions${params.toString() ? '?' + params.toString() : ''}`);
  },

  // Get specific intervention details for a student
  getStudentInterventionDetails: async (studentId: string, interventionId: string) => {
    return apiRequest<{
      success: boolean;
      data: {
        intervention: {
          id: string;
          name: string;
          description: string;
          startDate: string;
          endDate: string;
          status: string;
          objectives: string[];
          enrollmentDate: string;
        };
        progress: {
          completedTasks: number;
          totalTasks: number;
          completionPercentage: number;
          currentScore: number;
          maxScore: number;
          rank: number;
          totalStudents: number;
        };
        tasks: Array<{
          id: string;
          name: string;
          description: string;
          status: string;
          dueDate: string;
          maxScore: number;
          submission?: {
            id: string;
            status: string;
            score?: number;
            submittedAt: string;
            feedback?: string;
          };
        }>;
        leaderboard: Array<{
          studentId: string;
          studentName: string;
          score: number;
          rank: number;
        }>;
      };
      timestamp: string;
    }>(`/api/v1/students/${studentId}/interventions/${interventionId}`);
  },

  // Get intervention tasks for a student
  getStudentInterventionTasks: async (studentId: string, interventionId: string, params?: {
    status?: string;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.append('status', params.status);

    return apiRequest<{
      success: boolean;
      data: {
        tasks: Array<{
          id: string;
          name: string;
          description: string;
          status: string;
          dueDate: string;
          maxScore: number;
          isOverdue: boolean;
          submission?: {
            id: string;
            status: string;
            score?: number;
            submittedAt: string;
            feedback?: string;
          };
        }>;
        intervention: {
          id: string;
          name: string;
          status: string;
        };
      };
      timestamp: string;
    }>(`/api/v1/students/${studentId}/interventions/${interventionId}/tasks${searchParams.toString() ? '?' + searchParams.toString() : ''}`);
  },
};

// Score API calls
export const scoreAPI = {
  getStudentScoreSummary: async (studentId: string) => {
    return apiRequest<{
      success: boolean;
      summary: {
        student_id: string;
        term_id: string;
        total_score: number;
        weighted_score: number;
        overall_grade: string;
        overall_status: string;
        quadrant_scores: Array<{
          quadrant_id: string;
          quadrant_name: string;
          weight_percentage: number;
          total_score: number;
          weighted_score: number;
          grade: string;
          status: string;
          attendance_percentage: number;
          attendance_required: boolean;
          min_attendance_percentage: number;
          is_attendance_met: boolean;
        }>;
        term: {
          id: string;
          name: string;
          academic_year: string;
          is_current: boolean;
        };
      };
    }>(`/api/v1/scores/student/${studentId}/summary`);
  },

  getStudentScores: async (studentId: string) => {
    return apiRequest<{
      success: boolean;
      scores: Array<{
        id: string;
        student_id: string;
        component_id: string;
        term_id: string;
        obtained_score: number;
        max_score: number;
        grade: string;
        status: string;
        assessment_date: string;
        assessed_by: string;
        component: {
          id: string;
          name: string;
          max_score: number;
          category: string;
          sub_category: {
            id: string;
            name: string;
            quadrant: {
              id: string;
              name: string;
              weight_percentage: number;
            };
          };
        };
        assessor: {
          id: string;
          name: string;
          role: string;
        };
      }>;
    }>(`/api/v1/scores/student/${studentId}`);
  },
};

// Quadrant API calls
export const quadrantAPI = {
  getAllQuadrants: async () => {
    return apiRequest<{
      success: boolean;
      message: string;
      data: Array<{
        id: string;
        name: string;
        description: string;
        weightage: number;
        minimum_attendance: number;
        business_rules: any;
        is_active: boolean;
        display_order: number;
        created_at: string;
      }>;
      count: number;
      timestamp: string;
    }>('/api/v1/quadrants');
  },

  getQuadrantHierarchy: async (id: string, includeInactive = false) => {
    return apiRequest<{
      success: boolean;
      message: string;
      data: {
        id: string;
        name: string;
        description: string;
        weightage: number;
        minimum_attendance: number;
        business_rules: string;
        is_active: boolean;
        display_order: number;
        created_at: string;
        updated_at: string;
        sub_categories: Array<{
          id: string;
          name: string;
          description: string;
          weightage: number;
          is_active: boolean;
          display_order: number;
          created_at: string;
          updated_at: string;
          components: Array<{
            id: string;
            name: string;
            description: string;
            weightage: number;
            max_score: number;
            category: string;
            is_active: boolean;
            display_order: number;
            created_at: string;
            updated_at: string;
            microcompetencies: Array<{
              id: string;
              name: string;
              description: string;
              weightage: number;
              max_score: number;
              is_active: boolean;
              display_order: number;
              created_at: string;
              updated_at: string;
            }>;
          }>;
        }>;
      };
      timestamp: string;
    }>(`/api/v1/quadrants/${id}/hierarchy?includeInactive=${includeInactive}`);
  },

  createQuadrant: async (data: {
    name: string;
    description?: string;
    weightage?: number;
    minimum_attendance?: number;
    business_rules?: string;
    display_order?: number;
  }) => {
    return apiRequest<{
      success: boolean;
      message: string;
      data: any;
      timestamp: string;
    }>('/api/v1/quadrants', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateQuadrant: async (id: string, data: {
    name?: string;
    description?: string;
    weightage?: number;
    minimum_attendance?: number;
    business_rules?: string;
    is_active?: boolean;
    display_order?: number;
  }) => {
    return apiRequest<{
      success: boolean;
      message: string;
      data: any;
      timestamp: string;
    }>(`/api/v1/quadrants/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteQuadrant: async (id: string) => {
    return apiRequest<{
      success: boolean;
      message: string;
      data: any;
      timestamp: string;
    }>(`/api/v1/quadrants/${id}`, {
      method: 'DELETE',
    });
  },
};

// Sub-Category API calls
export const subCategoryAPI = {
  getAllSubCategories: async (params?: {
    quadrant_id?: string;
    include_inactive?: boolean;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.quadrant_id) searchParams.append('quadrant_id', params.quadrant_id);
    if (params?.include_inactive) searchParams.append('include_inactive', params.include_inactive.toString());

    const url = `/api/v1/sub-categories${searchParams.toString() ? '?' + searchParams.toString() : ''}`;

    return apiRequest<{
      success: boolean;
      message: string;
      data: Array<{
        id: string;
        quadrant_id: string;
        name: string;
        description: string;
        weightage: number;
        is_active: boolean;
        display_order: number;
        created_at: string;
        updated_at: string;
        quadrants: { id: string; name: string };
      }>;
      count: number;
      timestamp: string;
    }>(url);
  },

  getSubCategoryById: async (id: string) => {
    return apiRequest<{
      success: boolean;
      message: string;
      data: {
        id: string;
        quadrant_id: string;
        name: string;
        description: string;
        weightage: number;
        is_active: boolean;
        display_order: number;
        created_at: string;
        updated_at: string;
        quadrants: { id: string; name: string };
        components: Array<{
          id: string;
          name: string;
          description: string;
          weightage: number;
          max_score: number;
          category: string;
          is_active: boolean;
          display_order: number;
        }>;
      };
      timestamp: string;
    }>(`/api/v1/sub-categories/${id}`);
  },

  createSubCategory: async (data: {
    quadrant_id: string;
    name: string;
    description?: string;
    weightage?: number;
    display_order?: number;
  }) => {
    return apiRequest<{
      success: boolean;
      message: string;
      data: any;
      timestamp: string;
    }>('/api/v1/sub-categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateSubCategory: async (id: string, data: {
    name?: string;
    description?: string;
    weightage?: number;
    display_order?: number;
    is_active?: boolean;
  }) => {
    return apiRequest<{
      success: boolean;
      message: string;
      data: any;
      timestamp: string;
    }>(`/api/v1/sub-categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteSubCategory: async (id: string) => {
    return apiRequest<{
      success: boolean;
      message: string;
      data: any;
      timestamp: string;
    }>(`/api/v1/sub-categories/${id}`, {
      method: 'DELETE',
    });
  },
};

// Component API calls
export const componentAPI = {
  getAllComponents: async (params?: {
    sub_category_id?: string;
    quadrant_id?: string;
    include_inactive?: boolean;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.sub_category_id) searchParams.append('sub_category_id', params.sub_category_id);
    if (params?.quadrant_id) searchParams.append('quadrant_id', params.quadrant_id);
    if (params?.include_inactive) searchParams.append('include_inactive', params.include_inactive.toString());

    const url = `/api/v1/components${searchParams.toString() ? '?' + searchParams.toString() : ''}`;

    return apiRequest<{
      success: boolean;
      message: string;
      data: Array<{
        id: string;
        sub_category_id: string;
        name: string;
        description: string;
        weightage: number;
        max_score: number;
        category: string;
        is_active: boolean;
        display_order: number;
        created_at: string;
        updated_at: string;
        sub_categories: {
          id: string;
          name: string;
          quadrants: { id: string; name: string };
        };
      }>;
      count: number;
      timestamp: string;
    }>(url);
  },

  getComponentById: async (id: string) => {
    return apiRequest<{
      success: boolean;
      message: string;
      data: {
        id: string;
        sub_category_id: string;
        name: string;
        description: string;
        weightage: number;
        max_score: number;
        category: string;
        is_active: boolean;
        display_order: number;
        created_at: string;
        updated_at: string;
        sub_categories: {
          id: string;
          name: string;
          quadrants: { id: string; name: string };
        };
        microcompetencies: Array<{
          id: string;
          name: string;
          description: string;
          weightage: number;
          max_score: number;
          is_active: boolean;
          display_order: number;
        }>;
      };
      timestamp: string;
    }>(`/api/v1/components/${id}`);
  },

  createComponent: async (data: {
    sub_category_id: string;
    name: string;
    description?: string;
    weightage?: number;
    max_score?: number;
    category?: string;
    display_order?: number;
  }) => {
    return apiRequest<{
      success: boolean;
      message: string;
      data: any;
      timestamp: string;
    }>('/api/v1/components', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateComponent: async (id: string, data: {
    name?: string;
    description?: string;
    weightage?: number;
    max_score?: number;
    category?: string;
    display_order?: number;
    is_active?: boolean;
  }) => {
    return apiRequest<{
      success: boolean;
      message: string;
      data: any;
      timestamp: string;
    }>(`/api/v1/components/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteComponent: async (id: string) => {
    return apiRequest<{
      success: boolean;
      message: string;
      data: any;
      timestamp: string;
    }>(`/api/v1/components/${id}`, {
      method: 'DELETE',
    });
  },
};

// Admin API calls
export const adminAPI = {
  getDashboardOverview: async () => {
    return apiRequest<{
      success: boolean;
      message: string;
      data: {
        totalStudents: number;
        averageScore: number;
        highestScore: number;
        lowestScore: number;
        gradeDistribution: Array<{
          grade: string;
          count: number;
          percentage: number;
        }>;
        quadrantPerformance: Array<{
          quadrant_id: string;
          quadrant_name: string;
          average_score: number;
          max_score: number;
        }>;
        recentScores: Array<{
          student_name: string;
          score: number;
          date: string;
        }>;
        attendanceIssues: Array<{
          student_name: string;
          registration_no: string;
          attendance_percentage: number;
          quadrants_affected: string[];
        }>;
        redFlags: Array<{
          student_name: string;
          registration_no: string;
          issue_type: string;
          description: string;
        }>;
      };
      timestamp: string;
    }>('/api/v1/admin/dashboard');
  },

  searchStudents: async (query: string, limit: number = 10) => {
    return apiRequest<{
      success: boolean;
      message: string;
      data: {
        students: Array<{
          id: string;
          name: string;
          registration_no: string;
          overall_score: number;
          grade: string;
          status: string;
          batch_name: string;
          section_name: string;
        }>;
        total: number;
      };
      timestamp: string;
    }>(`/api/v1/admin/students/search?query=${encodeURIComponent(query)}&limit=${limit}`);
  },



  getAllTeachers: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.status) queryParams.append('status', params.status);
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);

    const url = `/api/v1/admin/teachers${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

    return apiRequest<{
      success: boolean;
      data: {
        teachers: Array<{
          id: string;
          name: string;
          employee_id: string;
          department: string;
          specialization: string;
          assigned_quadrants: string[];
          is_active: boolean;
          created_at: string;
          updated_at: string;
          user?: {
            email: string;
            username: string;
          };
        }>;
        pagination: {
          total: number;
          page: number;
          limit: number;
          totalPages: number;
        };
      };
    }>(url);
  },

  addTeacher: async (teacherData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    qualification: string;
    specialization: string;
    department: string;
    employeeId: string;
    phone: string;
    experience: number;
    assignedQuadrants: string[];
  }) => {
    return apiRequest<{
      success: boolean;
      message: string;
      data: any;
    }>('/api/v1/admin/teachers', {
      method: 'POST',
      body: JSON.stringify(teacherData),
    });
  },

  getAllStudents: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    batch?: string;
    section?: string;
    status?: string;
    course?: string;
    house?: string;
    batch_ids?: string[];
    batch_years?: number[];
    courses?: string[];
    sections?: string[];
    houses?: string[];
    exclude_enrolled?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    termId?: string;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.batch) queryParams.append('batch', params.batch);
    if (params?.section) queryParams.append('section', params.section);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.course) queryParams.append('course', params.course);
    if (params?.house) queryParams.append('house', params.house);
    if (params?.batch_ids?.length) queryParams.append('batch_ids', params.batch_ids.join(','));
    if (params?.batch_years?.length) queryParams.append('batch_years', params.batch_years.join(','));
    if (params?.courses?.length) queryParams.append('courses', params.courses.join(','));
    if (params?.sections?.length) queryParams.append('sections', params.sections.join(','));
    if (params?.houses?.length) queryParams.append('houses', params.houses.join(','));
    if (params?.exclude_enrolled) queryParams.append('exclude_enrolled', params.exclude_enrolled);
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);
    if (params?.termId) queryParams.append('termId', params.termId);

    const url = `/api/v1/admin/students${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

    return apiRequest<{
      success: boolean;
      data: {
        students: Array<{
          id: string;
          user_id: string;
          registration_no: string;
          name: string;
          course: string;
          batch_id: string;
          section_id: string;
          house_id?: string;
          gender: string;
          phone: string;
          preferences: any;
          overall_score: number;
          grade: string;
          status: string;
          current_term: string;
          created_at: string;
          updated_at: string;
          batch_name?: string;
          batch_year?: number;
          section_name?: string;
          house_name?: string;
          house_color?: string;
          user?: {
            email: string;
            username: string;
          };
          batch?: {
            id: string;
            name: string;
            year: number;
          };
          section?: {
            id: string;
            name: string;
          };
          house?: {
            id: string;
            name: string;
            color: string;
          };
        }>;
        pagination: {
          total: number;
          page: number;
          limit: number;
          totalPages: number;
        };
      };
    }>(url);
  },

  getStudentFilterOptions: async () => {
    return apiRequest<{
      success: boolean;
      message: string;
      data: {
        batches: Array<{
          id: string;
          name: string;
          year: number;
        }>;
        courses: string[];
        sections: Array<{
          id: string;
          name: string;
          batch_name: string;
          batch_year: number;
        }>;
        houses: Array<{
          id: string;
          name: string;
          color: string;
        }>;
        years: number[];
      };
    }>('/api/v1/students/filter-options');
  },

  addStudent: async (studentData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    registrationNo: string;
    course: string;
    batchId: string;
    sectionId: string;
    gender: string;
    phone: string;
  }) => {
    return apiRequest<{
      success: boolean;
      message: string;
      data: any;
    }>('/api/v1/admin/students', {
      method: 'POST',
      body: JSON.stringify(studentData),
    });
  },

  getAllInterventions: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    termId?: string;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.status) queryParams.append('status', params.status);
    if (params?.search) queryParams.append('search', params.search);
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);
    if (params?.termId) queryParams.append('termId', params.termId);

    const url = `/api/v1/admin/interventions${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

    return apiRequest<{
      success: boolean;
      message: string;
      data: {
        interventions: Array<{
          id: string;
          name: string;
          description: string;
          start_date: string;
          end_date: string;
          status: string;
          scoring_deadline?: string;
          is_scoring_open: boolean;
          created_at: string;
          intervention_microcompetencies: Array<{ count: number }>;
          intervention_enrollments: Array<{
            id: string;
            student_id: string;
            enrollment_date: string;
            enrollment_status: string;
            enrollment_type: string;
            current_score: number;
            completion_percentage: number;
            students: {
              name: string;
              registration_no: string;
            };
          }>;
          teacher_microcompetency_assignments: Array<{ count: number }>;
        }>;
        pagination: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
        };
      };
      timestamp: string;
    }>(url);
  },

  // Reports and Analytics
  getReportsAnalytics: async (params?: {
    reportType?: string;
    startDate?: string;
    endDate?: string;
    interventionId?: string;
    quadrantId?: string;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.reportType) searchParams.append('reportType', params.reportType);
    if (params?.startDate) searchParams.append('startDate', params.startDate);
    if (params?.endDate) searchParams.append('endDate', params.endDate);
    if (params?.interventionId) searchParams.append('interventionId', params.interventionId);
    if (params?.quadrantId) searchParams.append('quadrantId', params.quadrantId);

    const url = `/api/v1/admin/reports${searchParams.toString() ? '?' + searchParams.toString() : ''}`;

    return apiRequest<{
      success: boolean;
      message: string;
      data: {
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
          gradeDistribution: Record<string, number>;
          scoreDistribution: Record<string, number>;
          averageScore: number;
        };
        teacherPerformance: Array<{
          id: string;
          name: string;
          employee_id: string;
          specialization: string;
          assignmentCount: number;
          interventions: string[];
        }>;
        recentActivity: Array<{
          id: string;
          studentName: string;
          registrationNo: string;
          microcompetencyName: string;
          interventionName: string;
          score: string;
          percentage: number;
          scoredAt: string;
        }>;
      };
      timestamp: string;
    }>(url);
  },

  exportReports: async (params?: {
    format?: 'json' | 'csv';
    reportType?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.format) searchParams.append('format', params.format);
    if (params?.reportType) searchParams.append('reportType', params.reportType);
    if (params?.startDate) searchParams.append('startDate', params.startDate);
    if (params?.endDate) searchParams.append('endDate', params.endDate);

    const url = `/api/v1/admin/reports/export${searchParams.toString() ? '?' + searchParams.toString() : ''}`;

    // For file downloads, we need to handle the response differently
    const token = localStorage.getItem('authToken');
    const response = await fetch(`${API_BASE_URL}${url}`, {
      method: 'GET',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Create a blob from the response
    const blob = await response.blob();

    // Create a download link
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;

    // Get filename from Content-Disposition header or use default
    const contentDisposition = response.headers.get('Content-Disposition');
    const filename = contentDisposition
      ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
      : `reports_${new Date().toISOString().split('T')[0]}.${params?.format || 'json'}`;

    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);

    return { success: true, message: 'Report exported successfully' };
  },
};

// User API calls
export const userAPI = {
  getAllUsers: async (page: number = 1, limit: number = 10, search?: string, role?: string, status?: string) => {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    if (search) params.append('search', search);
    if (role) params.append('role', role);
    if (status) params.append('status', status);

    return apiRequest<{
      success: boolean;
      message: string;
      data: Array<{
        id: string;
        username: string;
        email: string;
        role: string;
        status: string;
        last_login: string;
        created_at: string;
        updated_at: string;
      }>;
      pagination: {
        currentPage: number;
        totalPages: number;
        totalUsers: number;
        usersPerPage: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
      };
      statistics: {
        totalUsers: number;
        students: number;
        teachers: number;
        admins: number;
      };
      filters: {
        search: string;
        role: string;
        status: string;
      };
      timestamp: string;
    }>(`/users?${params.toString()}`);
  },

  getUserStats: async () => {
    return apiRequest<{
      success: boolean;
      message: string;
      data: {
        totals: {
          total: number;
          active: number;
          inactive: number;
          suspended: number;
        };
        byRole: {
          students: number;
          teachers: number;
          admins: number;
        };
        recentUsers: Array<{
          id: string;
          username: string;
          email: string;
          role: string;
          status: string;
          created_at: string;
        }>;
      };
      timestamp: string;
    }>('/api/v1/users/stats');
  },

  createUser: async (userData: {
    username: string;
    email: string;
    password: string;
    name: string;
    role: string;
  }) => {
    return apiRequest<{
      success: boolean;
      message: string;
      user: {
        id: string;
        username: string;
        email: string;
        name: string;
        role: string;
        status: string;
      };
    }>('/api/v1/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  updateUser: async (userId: string, userData: {
    username?: string;
    email?: string;
    name?: string;
    role?: string;
    status?: string;
  }) => {
    return apiRequest<{
      success: boolean;
      message: string;
      user: {
        id: string;
        username: string;
        email: string;
        name: string;
        role: string;
        status: string;
      };
    }>(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  },

  deleteUser: async (userId: string) => {
    return apiRequest<{
      success: boolean;
      message: string;
    }>(`/users/${userId}`, {
      method: 'DELETE',
    });
  },
};

// Intervention API calls
export const interventionAPI = {
  // Admin Intervention APIs
  createIntervention: async (interventionData: {
    name: string;
    description: string;
    startDate: string;
    endDate: string;
    maxStudents: number;
    objectives: string[];
    prerequisites?: string[];
  }) => {
    return apiRequest<{
      success: boolean;
      message: string;
      data: {
        id: string;
        name: string;
        description: string;
        start_date: string;
        end_date: string;
        status: string;
        max_students: number;
        objectives: string[];
        prerequisites?: string[];
        is_scoring_open: boolean;
        scoring_deadline?: string;
        created_at: string;
      };
    }>('/api/v1/interventions', {
      method: 'POST',
      body: JSON.stringify(interventionData),
    });
  },



  getInterventionById: async (id: string) => {
    return apiRequest<{
      success: boolean;
      data: {
        id: string;
        name: string;
        description: string;
        start_date: string;
        end_date: string;
        status: string;
        quadrant_weightages: Record<string, number>;
        max_students: number;
        objectives: string[];
        prerequisites?: string[];
        created_at: string;
        updated_at: string;
        teachers: Array<{
          id: string;
          name: string;
          assigned_quadrants: string[];
          role: string;
        }>;
        enrolled_students: Array<{
          id: string;
          name: string;
          registration_no: string;
          enrollment_status: string;
        }>;
        tasks: Array<{
          id: string;
          name: string;
          quadrant_id: string;
          max_score: number;
          due_date: string;
          status: string;
        }>;
      };
    }>(`/api/v1/interventions/${id}`);
  },

  updateIntervention: async (id: string, updateData: {
    name?: string;
    description?: string;
    startDate?: string;
    endDate?: string;
    quadrantWeightages?: Record<string, number>;
    maxStudents?: number;
    objectives?: string[];
    prerequisites?: string[];
    // Scoring and settings fields
    scoring_deadline?: string;
    is_scoring_open?: boolean;
  }) => {
    return apiRequest<{
      success: boolean;
      message: string;
      data: any;
    }>(`/api/v1/interventions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  },

  updateInterventionStatus: async (id: string, status: string) => {
    return apiRequest<{
      success: boolean;
      message: string;
      data: any;
    }>(`/api/v1/interventions/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  },

  assignTeachers: async (id: string, teachers: Array<{
    teacherId: string;
    assignedQuadrants: string[];
    role: string;
    permissions: string[];
  }>) => {
    return apiRequest<{
      success: boolean;
      message: string;
      data: any;
    }>(`/api/v1/interventions/${id}/assign-teachers`, {
      method: 'POST',
      body: JSON.stringify({ teachers }),
    });
  },

  enrollStudents: async (id: string, students: string[], enrollmentType: string = 'Mandatory') => {
    return apiRequest<{
      success: boolean;
      message: string;
      data: any;
    }>(`/api/v1/interventions/${id}/enroll-students`, {
      method: 'POST',
      body: JSON.stringify({ students, enrollmentType }),
    });
  },

  enrollStudentsByBatch: async (id: string, params: {
    batch_ids: string[];
    section_ids?: string[];
    course_filters?: string[];
    enrollmentType?: string;
  }) => {
    return apiRequest<{
      success: boolean;
      message: string;
      data: {
        intervention_id: string;
        enrolled_students: any[];
        total_enrolled: number;
        criteria: any;
      };
    }>(`/api/v1/interventions/${id}/enroll-batch`, {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  enrollStudentsByCriteria: async (id: string, params: {
    criteria: {
      batch_years?: number[];
      courses?: string[];
      sections?: string[];
      houses?: string[];
    };
    enrollmentType?: string;
  }) => {
    return apiRequest<{
      success: boolean;
      message: string;
      data: {
        intervention_id: string;
        enrolled_students: any[];
        total_enrolled: number;
        criteria: any;
      };
    }>(`/api/v1/interventions/${id}/enroll-criteria`, {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  getInterventionAnalytics: async (id: string) => {
    return apiRequest<{
      success: boolean;
      data: {
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
      };
    }>(`/api/v1/interventions/${id}/analytics`);
  },

  // New Intervention-Centric APIs
  getInterventionMicrocompetencies: async (id: string, params?: {
    quadrantId?: string;
    includeInactive?: boolean;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.quadrantId) searchParams.append('quadrantId', params.quadrantId);
    if (params?.includeInactive) searchParams.append('includeInactive', 'true');

    return apiRequest<{
      success: boolean;
      data: {
        intervention: {
          id: string;
          name: string;
          status: string;
        };
        microcompetencies: Array<{
          id: string;
          weightage: number;
          maxScore: number;
          isActive: boolean;
          createdAt: string;
          microcompetency: {
            id: string;
            name: string;
            description: string;
            display_order: number;
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
          quadrant: {
            id: string;
            name: string;
          };
        }>;
        totalCount: number;
      };
      filters: {
        quadrantId?: string;
        includeInactive: boolean;
      };
    }>(`/api/v1/interventions/${id}/microcompetencies${searchParams.toString() ? '?' + searchParams.toString() : ''}`);
  },

  addMicrocompetenciesToIntervention: async (id: string, data: {
    microcompetencies: Array<{
      microcompetency_id: string;
      weightage: number;
      max_score?: number;
    }>;
  }) => {
    return apiRequest<{
      success: boolean;
      message: string;
      data: any;
    }>(`/api/v1/interventions/${id}/microcompetencies`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  assignTeachersToMicrocompetencies: async (id: string, data: {
    assignments: Array<{
      teacher_id: string;
      microcompetency_id: string;
      can_score?: boolean;
      can_create_tasks?: boolean;
    }>;
  }) => {
    return apiRequest<{
      success: boolean;
      message: string;
      data: any;
    }>(`/api/v1/interventions/${id}/assign-teachers-microcompetencies`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  setScoringDeadline: async (id: string, data: {
    scoring_deadline: string;
  }) => {
    return apiRequest<{
      success: boolean;
      message: string;
      data: any;
    }>(`/api/v1/interventions/${id}/scoring-deadline`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },



  deleteIntervention: async (id: string) => {
    return apiRequest<{
      success: boolean;
      message: string;
    }>(`/api/v1/interventions/${id}`, {
      method: 'DELETE',
    });
  },



  updateInterventionMicrocompetency: async (interventionId: string, microcompetencyId: string, data: {
    weightage: number;
    maxScore: number;
    isActive: boolean;
    notes?: string;
  }) => {
    return apiRequest<{
      success: boolean;
      message: string;
      data: any;
    }>(`/api/v1/interventions/${interventionId}/microcompetencies/${microcompetencyId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  removeInterventionMicrocompetency: async (interventionId: string, microcompetencyId: string) => {
    return apiRequest<{
      success: boolean;
      message: string;
    }>(`/api/v1/interventions/${interventionId}/microcompetencies/${microcompetencyId}`, {
      method: 'DELETE',
    });
  },

  bulkUpdateInterventionMicrocompetencies: async (interventionId: string, data: {
    microcompetencyIds: string[];
    updates: any;
  }) => {
    return apiRequest<{
      success: boolean;
      message: string;
      data: any;
    }>(`/api/v1/interventions/${interventionId}/microcompetencies/bulk-update`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  bulkRemoveInterventionMicrocompetencies: async (interventionId: string, microcompetencyIds: string[]) => {
    return apiRequest<{
      success: boolean;
      message: string;
    }>(`/api/v1/interventions/${interventionId}/microcompetencies/bulk-remove`, {
      method: 'DELETE',
      body: JSON.stringify({ microcompetencyIds }),
    });
  },

  getInterventionTeacherAssignments: async (interventionId: string) => {
    return apiRequest<{
      success: boolean;
      data: {
        assignments: any[];
      };
    }>(`/api/v1/interventions/${interventionId}/teacher-assignments`);
  },

  removeTeacherAssignment: async (interventionId: string, assignmentId: string) => {
    return apiRequest<{
      success: boolean;
      message: string;
    }>(`/api/v1/interventions/${interventionId}/teacher-assignments/${assignmentId}`, {
      method: 'DELETE',
    });
  },

  // Teacher Intervention APIs
  getTeacherInterventions: async (teacherId: string) => {
    return apiRequest<{
      success: boolean;
      message: string;
      data: {
        teacher: {
          id: string;
          name: string;
          employee_id: string;
        };
        interventions: Array<{
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
        }>;
      };
    }>(`/api/v1/teacher-microcompetencies/${teacherId}/interventions`);
  },

  getTeacherInterventionMicrocompetencies: async (teacherId: string, interventionId: string) => {
    return apiRequest<{
      success: boolean;
      data: {
        intervention: {
          id: string;
          name: string;
          description: string;
          start_date: string;
          end_date: string;
          status: string;
          is_scoring_open: boolean;
          scoring_deadline?: string;
        };
        microcompetencies: Array<{
          id: string;
          weightage: number;
          max_score: number;
          microcompetencies: {
            id: string;
            name: string;
            description: string;
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
        }>;
        assignment: {
          role: string;
          assigned_quadrants: string[];
          permissions: string[];
        };
      };
    }>(`/api/v1/teacher-microcompetencies/${teacherId}/interventions/${interventionId}/microcompetencies`);
  },

  getTeacherInterventionStudents: async (teacherId: string, interventionId: string, microcompetencyId?: string) => {
    const params = new URLSearchParams();
    if (microcompetencyId) {
      params.append('microcompetencyId', microcompetencyId);
    }

    const url = `/api/v1/teacher-microcompetencies/${teacherId}/interventions/${interventionId}/students${params.toString() ? '?' + params.toString() : ''}`;

    return apiRequest<{
      success: boolean;
      data: {
        students: Array<{
          id: string;
          name: string;
          registration_no: string;
          enrollment_status: string;
          enrolled_at: string;
          completion_percentage?: number;
          score?: {
            obtained_score: number;
            max_score: number;
            percentage: number;
            feedback?: string;
            status: string;
            scored_at: string;
          };
        }>;
        intervention: {
          id: string;
          name: string;
          status: string;
        };
      };
    }>(url);
  },

  // Scoring APIs
  scoreStudentMicrocompetency: async (
    teacherId: string,
    interventionId: string,
    studentId: string,
    microcompetencyId: string,
    scoreData: {
      obtained_score: number;
      feedback?: string;
    }
  ) => {
    return apiRequest<{
      success: boolean;
      message: string;
      data: {
        id: string;
        obtained_score: number;
        max_score: number;
        percentage: number;
        feedback?: string;
        status: string;
        scored_at: string;
        students: {
          id: string;
          name: string;
          registration_no: string;
        };
        microcompetencies: {
          id: string;
          name: string;
        };
      };
    }>(`/api/v1/teacher-microcompetencies/${teacherId}/interventions/${interventionId}/students/${studentId}/microcompetencies/${microcompetencyId}/score`, {
      method: 'POST',
      body: JSON.stringify(scoreData),
    });
  },

  batchScoreMicrocompetency: async (
    teacherId: string,
    interventionId: string,
    microcompetencyId: string,
    scoreData: {
      scores: Array<{
        student_id: string;
        obtained_score: number;
        notes?: string;
      }>;
    }
  ) => {
    return apiRequest<{
      success: boolean;
      message: string;
      data: any;
    }>(`/api/v1/teacher-microcompetencies/${teacherId}/interventions/${interventionId}/microcompetencies/${microcompetencyId}/batch-score`, {
      method: 'POST',
      body: JSON.stringify(scoreData),
    });
  },

  // Enhanced Task Creation API
  createMicrocompetencyTask: async (interventionId: string, taskData: {
    name: string;
    description: string;
    microcompetencies: Array<{
      microcompetencyId: string;
      weightage: number;
    }>;
    maxScore: number;
    dueDate: string;
    instructions: string;
    rubric?: any[];
    submissionType?: string;
    allowLateSubmission?: boolean;
    latePenalty?: number;
  }) => {
    return apiRequest<{
      success: boolean;
      message: string;
      data: {
        task: {
          id: string;
          name: string;
          description: string;
          max_score: number;
          due_date: string;
          status: string;
        };
        microcompetencies: Array<{
          id: string;
          microcompetency_id: string;
          weightage: number;
          microcompetencies: {
            id: string;
            name: string;
            components: {
              name: string;
              sub_categories: {
                quadrants: {
                  name: string;
                };
              };
            };
          };
        }>;
        totalMicrocompetencies: number;
      };
    }>(`/api/v1/interventions/${interventionId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(taskData),
    });
  },

  // Get All Tasks (Admin)
  getAllTasks: async (params?: {
    status?: string;
    interventionId?: string;
    teacherId?: string;
    termId?: string;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.append('status', params.status);
    if (params?.interventionId) searchParams.append('interventionId', params.interventionId);
    if (params?.teacherId) searchParams.append('teacherId', params.teacherId);
    if (params?.termId) searchParams.append('termId', params.termId);

    const url = `/api/v1/interventions/admin/tasks${searchParams.toString() ? '?' + searchParams.toString() : ''}`;

    return apiRequest<{
      success: boolean;
      message: string;
      data: {
        tasks: Array<{
          id: string;
          name: string;
          description: string;
          maxScore: number;
          dueDate: string;
          instructions: string;
          submissionType: string;
          allowLateSubmission: boolean;
          latePenalty: number;
          status: string;
          createdAt: string;
          interventionId: string;
          interventionName: string;
          interventionStatus: string;
          createdBy: string;
          createdByTeacherId: string;
          microcompetencies: Array<{
            id: string;
            name: string;
            maxScore: number;
            weightage: number;
            component: string;
            quadrant: string;
          }>;
          submissionCount: number;
          gradedCount: number;
        }>;
        totalCount: number;
        summary: {
          totalTasks: number;
          activeTasks: number;
          draftTasks: number;
          completedTasks: number;
        };
      };
      timestamp: string;
    }>(url);
  },

  // Create direct assessment (no submission required)
  createDirectAssessment: async (taskId: string, assessmentData: {
    studentId: string;
    score: number;
    feedback?: string;
    privateNotes?: string;
  }) => {
    return apiRequest<{
      success: boolean;
      message: string;
      data: {
        assessment: {
          id: string;
          task_id: string;
          student_id: string;
          score: number;
          feedback?: string;
          private_notes?: string;
          assessed_at: string;
          assessed_by: string;
        };
      };
    }>(`/api/v1/interventions/tasks/${taskId}/direct-assessment`, {
      method: 'POST',
      body: JSON.stringify(assessmentData),
    });
  },

  // Update direct assessment
  updateDirectAssessment: async (assessmentId: string, updateData: {
    score: number;
    feedback?: string;
    privateNotes?: string;
  }) => {
    return apiRequest<{
      success: boolean;
      message: string;
      data: {
        assessment: {
          id: string;
          task_id: string;
          student_id: string;
          score: number;
          feedback?: string;
          private_notes?: string;
          assessed_at: string;
          assessed_by: string;
        };
      };
    }>(`/api/v1/interventions/direct-assessments/${assessmentId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData)
    });
  },

  // Get direct assessments for a task
  getTaskDirectAssessments: async (taskId: string) => {
    return apiRequest<{
      success: boolean;
      data: {
        task: {
          id: string;
          name: string;
          requires_submission: boolean;
          max_score: number;
        };
        assessments: Array<{
          id: string;
          student: {
            id: string;
            name: string;
            registration_no: string;
          };
          score: number;
          feedback?: string;
          private_notes?: string;
          assessed_at: string;
          assessed_by: {
            id: string;
            name: string;
          };
        }>;
        enrolled_students: Array<{
          id: string;
          name: string;
          registration_no: string;
          has_assessment: boolean;
        }>;
      };
    }>(`/api/v1/interventions/tasks/${taskId}/direct-assessments`);
  },

  // Get enrolled students for an intervention
  getInterventionStudents: async (interventionId: string) => {
    return apiRequest<{
      success: boolean;
      data: Array<{
        id: string;
        name: string;
        registration_no: string;
        email: string;
        batch: string;
        year: number;
        course: string;
      }>;
      timestamp: string;
    }>(`/api/v1/interventions/${interventionId}/students`);
  },

  // Submit task (Student)
  submitTask: async (taskId: string, submissionData: {
    submissionText: string;
    attachments?: string[];
  }) => {
    return apiRequest<{
      success: boolean;
      message: string;
      data: any;
    }>(`/api/v1/interventions/tasks/${taskId}/submit`, {
      method: 'POST',
      body: JSON.stringify(submissionData),
    });
  },

  // Save task draft (Student)  
  saveTaskDraft: async (taskId: string, draftData: {
    submissionText: string;
    attachments?: string[];
  }) => {
    return apiRequest<{
      success: boolean;
      message: string;
      data: any;
    }>(`/api/v1/interventions/tasks/${taskId}/draft`, {
      method: 'POST',
      body: JSON.stringify(draftData),
    });
  },
};

// Teacher API calls
export const teacherAPI = {
  // Dashboard
  getDashboard: async (teacherId: string, termId?: string) => {
    const queryParams = new URLSearchParams();
    if (termId) queryParams.append('termId', termId);

    const url = `/api/v1/teachers/${teacherId}/dashboard${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

    return apiRequest<{
      success: boolean;
      message: string;
      data: {
        teacher: {
          id: string;
          name: string;
          employee_id: string;
          department: string;
          specialization: string;
        };
        overview: {
          total_students: number;
          total_interventions: number;
          pending_assessments: number;
          completed_assessments: number;
          average_score: number;
        };
        recent_activity: Array<{
          id: string;
          type: string;
          description: string;
          timestamp: string;
          student_name?: string;
          intervention_name?: string;
        }>;
        upcoming_deadlines: Array<{
          intervention_id: string;
          intervention_name: string;
          deadline: string;
          pending_count: number;
        }>;
        student_performance: Array<{
          student_id: string;
          student_name: string;
          registration_no: string;
          average_score: number;
          status: string;
        }>;
      };
      timestamp: string;
    }>(url);
  },

  // Students
  getAssignedStudents: async (teacherId: string, params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    interventionId?: string;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.interventionId) queryParams.append('interventionId', params.interventionId);

    const url = `/api/v1/teachers/${teacherId}/students${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

    return apiRequest<{
      success: boolean;
      message: string;
      data: {
        students: Array<{
          id: string;
          name: string;
          registration_no: string;
          course: string;
          batch: string;
          section: string;
          status: string;
          last_assessment?: string;
          average_score?: number;
          interventions: Array<{
            id: string;
            name: string;
            status: string;
            progress_percentage: number;
          }>;
        }>;
        pagination: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
        };
      };
      timestamp: string;
    }>(url);
  },

  // Student Assessment Details
  getStudentAssessmentDetails: async (teacherId: string, studentId: string, termId?: string) => {
    const queryParams = new URLSearchParams();
    if (termId) queryParams.append('termId', termId);

    const url = `/api/v1/teachers/${teacherId}/students/${studentId}/assessment${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

    return apiRequest<{
      success: boolean;
      data: {
        student: {
          id: string;
          name: string;
          registration_no: string;
          course: string;
          batch: string;
          section: string;
        };
        assessments: Array<{
          quadrant_id: string;
          quadrant_name: string;
          components: Array<{
            component_id: string;
            component_name: string;
            current_score?: number;
            max_score: number;
            last_assessed?: string;
            status: string;
          }>;
        }>;
        overall_progress: {
          total_components: number;
          assessed_components: number;
          average_score: number;
          completion_percentage: number;
        };
      };
    }>(url);
  },

  // Submit Assessment
  submitStudentAssessment: async (teacherId: string, studentId: string, assessmentData: {
    scores: Array<{
      component_id: string;
      obtained_score: number;
      max_score: number;
      notes?: string;
    }>;
    term_id?: string;
    overall_feedback?: string;
  }) => {
    return apiRequest<{
      success: boolean;
      message: string;
      data: {
        assessment_id: string;
        submitted_at: string;
        scores_count: number;
      };
    }>(`/api/v1/teachers/${teacherId}/students/${studentId}/assessment`, {
      method: 'POST',
      body: JSON.stringify(assessmentData),
    });
  },

  // Save Assessment Draft
  saveAssessmentDraft: async (teacherId: string, studentId: string, draftData: {
    scores: Array<{
      component_id: string;
      obtained_score: number;
      max_score: number;
      notes?: string;
    }>;
    term_id?: string;
    overall_feedback?: string;
  }) => {
    return apiRequest<{
      success: boolean;
      message: string;
      data: {
        draft_id: string;
        saved_at: string;
      };
    }>(`/api/v1/teachers/${teacherId}/students/${studentId}/assessment/draft`, {
      method: 'POST',
      body: JSON.stringify(draftData),
    });
  },

  // Feedback
  getFeedback: async (teacherId: string, params?: {
    page?: number;
    limit?: number;
    status?: string;
    studentId?: string;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.status) queryParams.append('status', params.status);
    if (params?.studentId) queryParams.append('studentId', params.studentId);

    const url = `/api/v1/teachers/${teacherId}/feedback${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

    return apiRequest<{
      success: boolean;
      data: {
        feedback: Array<{
          id: string;
          student_id: string;
          student_name: string;
          registration_no: string;
          subject: string;
          message: string;
          category: string;
          priority: string;
          status: string;
          submitted_at: string;
          read_at?: string;
        }>;
        pagination: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
        };
      };
    }>(url);
  },

  sendFeedback: async (teacherId: string, feedbackData: {
    studentId: string;
    subject: string;
    message: string;
    category: 'Academic' | 'Behavioral' | 'General';
    priority: 'Low' | 'Medium' | 'High';
  }) => {
    return apiRequest<{
      success: boolean;
      message: string;
      data: {
        feedback_id: string;
        submitted_at: string;
      };
    }>(`/api/v1/teachers/${teacherId}/feedback`, {
      method: 'POST',
      body: JSON.stringify(feedbackData),
    });
  },

  // Reports
  getReports: async (teacherId: string, params?: {
    termId?: string;
    reportType?: string;
    format?: 'json' | 'pdf' | 'excel';
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.termId) queryParams.append('termId', params.termId);
    if (params?.reportType) queryParams.append('reportType', params.reportType);
    if (params?.format) queryParams.append('format', params.format);

    const url = `/api/v1/teachers/${teacherId}/reports${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

    return apiRequest<{
      success: boolean;
      data: {
        reports: Array<{
          type: string;
          title: string;
          description: string;
          generated_at: string;
          download_url?: string;
          data?: any;
        }>;
      };
    }>(url);
  },
};

// Microcompetency API calls
export const microcompetencyAPI = {
  getAllMicrocompetencies: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    quadrantId?: string;
    componentId?: string;
    includeInactive?: boolean;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.search) searchParams.append('search', params.search);
    if (params?.quadrantId) searchParams.append('quadrantId', params.quadrantId);
    if (params?.componentId) searchParams.append('componentId', params.componentId);
    if (params?.includeInactive) searchParams.append('includeInactive', 'true');

    return apiRequest<{
      success: boolean;
      message: string;
      data: Array<{
        id: string;
        name: string;
        description: string;
        weightage: number;
        max_score: number;
        display_order: number;
        is_active: boolean;
        created_at: string;
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
      }>;
      pagination: {
        currentPage: number;
        totalPages: number;
        totalItems: number;
        itemsPerPage: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
      };
      filters: {
        search?: string;
        quadrantId?: string;
        componentId?: string;
        includeInactive: boolean;
      };
    }>(`/api/v1/microcompetencies${searchParams.toString() ? '?' + searchParams.toString() : ''}`);
  },

  getMicrocompetenciesByQuadrant: async (quadrantId: string) => {
    return apiRequest<{
      success: boolean;
      data: Array<{
        id: string;
        name: string;
        description: string;
        weightage: number;
        max_score: number;
        display_order: number;
        is_active: boolean;
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
      }>;
    }>(`/api/v1/microcompetencies/quadrant/${quadrantId}`);
  },

  getMicrocompetenciesByComponent: async (componentId: string) => {
    return apiRequest<{
      success: boolean;
      data: Array<{
        id: string;
        name: string;
        description: string;
        weightage: number;
        max_score: number;
        display_order: number;
        is_active: boolean;
      }>;
    }>(`/api/v1/microcompetencies/component/${componentId}`);
  },

  getMicrocompetenciesForIntervention: async (interventionId: string) => {
    return apiRequest<{
      success: boolean;
      data: Array<{
        id: string;
        name: string;
        description: string;
        weightage: number;
        max_score: number;
        display_order: number;
        is_active: boolean;
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
      }>;
    }>(`/api/v1/microcompetencies/intervention/${interventionId}`);
  },

  createMicrocompetency: async (microcompetencyData: {
    component_id: string;
    name: string;
    description: string;
    weightage: number;
    max_score: number;
    display_order: number;
  }) => {
    return apiRequest<{
      success: boolean;
      message: string;
      data: {
        id: string;
        component_id: string;
        name: string;
        description: string;
        weightage: number;
        max_score: number;
        display_order: number;
        is_active: boolean;
        created_at: string;
        updated_at: string;
      };
    }>('/api/v1/microcompetencies', {
      method: 'POST',
      body: JSON.stringify(microcompetencyData),
    });
  },

  updateMicrocompetency: async (id: string, microcompetencyData: {
    name?: string;
    description?: string;
    weightage?: number;
    max_score?: number;
    display_order?: number;
    is_active?: boolean;
  }) => {
    return apiRequest<{
      success: boolean;
      message: string;
      data: {
        id: string;
        component_id: string;
        name: string;
        description: string;
        weightage: number;
        max_score: number;
        display_order: number;
        is_active: boolean;
        created_at: string;
        updated_at: string;
      };
    }>(`/api/v1/microcompetencies/${id}`, {
      method: 'PUT',
      body: JSON.stringify(microcompetencyData),
    });
  },

  deleteMicrocompetency: async (id: string) => {
    return apiRequest<{
      success: boolean;
      message: string;
    }>(`/api/v1/microcompetencies/${id}`, {
      method: 'DELETE',
    });
  },

  getMicrocompetencyById: async (id: string) => {
    return apiRequest<{
      success: boolean;
      data: {
        id: string;
        component_id: string;
        name: string;
        description: string;
        weightage: number;
        max_score: number;
        display_order: number;
        is_active: boolean;
        created_at: string;
        updated_at: string;
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
    }>(`/api/v1/microcompetencies/${id}`);
  },

  getComponentWeightageUsage: async (componentId: string) => {
    return apiRequest<{
      success: boolean;
      message: string;
      data: {
        component: {
          id: string;
          name: string;
        };
        microcompetencies: Array<{
          id: string;
          name: string;
          weightage: number;
        }>;
        weightageUsage: {
          totalUsed: number;
          available: number;
          percentage: number;
        };
      };
    }>(`/api/v1/microcompetencies/component/${componentId}/weightage`);
  },
};

// Unified Score API calls (New System)
export const unifiedScoreAPI = {
  // Calculate unified HPS for a student in a term
  calculateStudentHPS: async (studentId: string, termId: string) => {
    return apiRequest<{
      success: boolean;
      message: string;
      data: {
        student: {
          id: string;
          name: string;
          registration_no: string;
        };
        term: {
          id: string;
          name: string;
          academic_year: string;
        };
        hps: {
          success: boolean;
          studentId: string;
          termId: string;
          quadrantScores: Record<string, {
            id: string;
            name: string;
            traditionalScore: number;
            interventionScore: number;
            finalScore: number;
            grade: string;
            status: string;
            sources: string[];
          }>;
          totalHPS: number;
          grade: string;
          status: string;
          calculatedAt: string;
        };
      };
    }>(`/api/v1/unified-scores/students/${studentId}/hps`, {
      method: 'POST',
      body: JSON.stringify({ termId }),
    });
  },

  // Get unified score summary for a student in a term
  getStudentScoreSummary: async (studentId: string, termId: string) => {
    return apiRequest<{
      success: boolean;
      message: string;
      data: {
        summary: {
          id: string;
          student_id: string;
          term_id: string;
          persona_score: number;
          wellness_score: number;
          behavior_score: number;
          discipline_score: number;
          total_hps: number;
          overall_grade: string;
          overall_status: string;
          last_calculated_at: string;
          calculation_version: number;
        };
      };
    }>(`/api/v1/unified-scores/students/${studentId}/summary?termId=${termId}`);
  },

  // Get detailed score breakdown by quadrants
  getScoreBreakdown: async (studentId: string, termId: string) => {
    return apiRequest<{
      success: boolean;
      message: string;
      data: {
        breakdown: {
          studentId: string;
          termId: string;
          totalHPS: number;
          grade: string;
          status: string;
          quadrants: Array<{
            id: string;
            name: string;
            finalScore: number;
            traditionalScore: number;
            interventionScore: number;
            sources: string[];
            grade: string;
            status: string;
          }>;
          calculatedAt: string;
        };
      };
    }>(`/api/v1/unified-scores/students/${studentId}/breakdown?termId=${termId}`);
  },

  // Recalculate scores after microcompetency update
  recalculateAfterMicrocompetencyUpdate: async (studentId: string, microcompetencyId: string) => {
    return apiRequest<{
      success: boolean;
      message: string;
      data: {
        recalculation: any;
      };
    }>(`/api/v1/unified-scores/recalculate/microcompetency`, {
      method: 'POST',
      body: JSON.stringify({ studentId, microcompetencyId }),
    });
  },

  // Recalculate scores after traditional score update
  recalculateAfterTraditionalUpdate: async (studentId: string, componentId: string, termId: string) => {
    return apiRequest<{
      success: boolean;
      message: string;
      data: {
        recalculation: any;
      };
    }>(`/api/v1/unified-scores/recalculate/traditional`, {
      method: 'POST',
      body: JSON.stringify({ studentId, componentId, termId }),
    });
  }
};

// Score Calculation API calls (Legacy - Deprecated)
export const scoreCalculationAPI = {
  getStudentCompetencyScores: async (studentId: string, interventionId: string) => {
    return apiRequest<{
      success: boolean;
      data: {
        competency_scores: Array<{
          competency_id: string;
          competency_name: string;
          obtained_score: number;
          max_score: number;
          percentage: number;
          microcompetency_count: number;
          scored_microcompetencies: number;
          is_complete: boolean;
        }>;
      };
    }>(`/api/v1/score-calculation/students/${studentId}/interventions/${interventionId}/competencies`);
  },

  getStudentQuadrantScores: async (studentId: string, interventionId: string) => {
    return apiRequest<{
      success: boolean;
      data: {
        quadrant_scores: Array<{
          quadrant_id: string;
          quadrant_name: string;
          obtained_score: number;
          max_score: number;
          percentage: number;
          competency_count: number;
          completed_competencies: number;
          is_complete: boolean;
        }>;
      };
    }>(`/api/v1/score-calculation/students/${studentId}/interventions/${interventionId}/quadrants`);
  },

  getStudentOverallScore: async (studentId: string, interventionId: string) => {
    return apiRequest<{
      success: boolean;
      data: {
        overall_score: {
          obtained_score: number;
          max_score: number;
          percentage: number;
          total_microcompetencies: number;
          scored_microcompetencies: number;
          completion_percentage: number;
          grade?: string;
          rank?: number;
        };
      };
    }>(`/api/v1/score-calculation/students/${studentId}/interventions/${interventionId}/overall`);
  },

  getInterventionStatistics: async (interventionId: string) => {
    return apiRequest<{
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
    }>(`/api/v1/score-calculation/interventions/${interventionId}/statistics`);
  },

  recalculateStudentScores: async (studentId: string, interventionId: string) => {
    return apiRequest<{
      success: boolean;
      message: string;
      data: any;
    }>(`/api/v1/score-calculation/students/${studentId}/interventions/${interventionId}/recalculate`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },

  // Teacher Microcompetency APIs
  getTeacherMicrocompetencies: async (teacherId: string) => {
    return apiRequest<{
      success: boolean;
      message: string;
      data: {
        teacher_id: string;
        microcompetencies: Array<{
          id: string;
          name: string;
          description: string;
          maxScore: number;
          component: string;
          subCategory: string;
          quadrant: string;
          canScore: boolean;
          canCreateTasks: boolean;
          assignedAt: string;
          intervention: {
            id: string;
            name: string;
            status: string;
            startDate: string;
            endDate: string;
            isScoringOpen: boolean;
            scoringDeadline?: string;
          };
          scoringStats: {
            totalStudents: number;
            scoredStudents: number;
            averageScore: number;
            completionPercentage: number;
          };
          taskStats: {
            totalTasks: number;
            activeTasks: number;
            completedTasks: number;
          };
        }>;
        total_count: number;
      };
    }>(`/api/v1/teacher-microcompetencies/${teacherId}/microcompetencies`);
  },

  getTeacherInterventionMicrocompetencies: async (teacherId: string, interventionId: string) => {
    return apiRequest<{
      success: boolean;
      message: string;
      data: {
        interventionId: string;
        teacherId: string;
        microcompetencies: Array<{
          id: string;
          name: string;
          maxScore: number;
          component: string;
          subCategory: string;
          quadrant: string;
          canScore: boolean;
          canCreateTasks: boolean;
          assignedAt: string;
        }>;
        totalCount: number;
      };
    }>(`/api/v1/teacher-microcompetencies/${teacherId}/interventions/${interventionId}/microcompetencies`);
  },



  // Enhanced Grading API
  gradeTaskSubmission: async (submissionId: string, gradeData: {
    score?: number;
    feedback?: string;
    privateNotes?: string;
  }) => {
    return apiRequest<{
      success: boolean;
      message: string;
      data: {
        submission: {
          id: string;
          score: number;
          feedback: string;
          status: string;
          graded_at: string;
        };
        microcompetencyUpdates?: Array<{
          microcompetencyId: string;
          microcompetencyName: string;
          previousScore?: number;
          addedScore?: number;
          newScore?: number;
          score?: number;
          percentage: number;
          action: 'created' | 'updated';
        }>;
        taskScore?: {
          obtained: number;
          maximum: number;
          percentage: number;
        };
      };
    }>(`/api/v1/interventions/submissions/${submissionId}/grade`, {
      method: 'POST',
      body: JSON.stringify(gradeData),
    });
  },

  // Get Teacher Tasks
  getTeacherTasks: async (params?: {
    status?: string;
    interventionId?: string;
    termId?: string;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.append('status', params.status);
    if (params?.interventionId) searchParams.append('interventionId', params.interventionId);
    if (params?.termId) searchParams.append('termId', params.termId);

    const url = `/api/v1/interventions/teacher/tasks${searchParams.toString() ? '?' + searchParams.toString() : ''}`;

    return apiRequest<{
      success: boolean;
      message: string;
      data: {
        tasks: Array<{
          id: string;
          name: string;
          description: string;
          maxScore: number;
          dueDate: string;
          instructions: string;
          submissionType: string;
          allowLateSubmission: boolean;
          latePenalty: number;
          status: string;
          createdAt: string;
          interventionId: string;
          interventionName: string;
          interventionStatus: string;
          microcompetencies: Array<{
            id: string;
            name: string;
            maxScore: number;
            weightage: number;
            component: string;
            quadrant: string;
          }>;
          submissionCount: number;
          gradedCount: number;
        }>;
        totalCount: number;
        summary: {
          totalTasks: number;
          activeTasks: number;
          draftTasks: number;
          completedTasks: number;
        };
      };
      timestamp: string;
    }>(url);
  },

  // Get Teacher Submissions for Review
  getTeacherSubmissions: async (interventionId: string, params?: {
    taskId?: string;
    status?: string;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.taskId) searchParams.append('taskId', params.taskId);
    if (params?.status) searchParams.append('status', params.status);

    const url = `/api/v1/interventions/teacher/${interventionId}/submissions${searchParams.toString() ? '?' + searchParams.toString() : ''}`;

    return apiRequest<{
      success: boolean;
      message: string;
      data: Array<{
        id: string;
        task_id: string;
        submitted_at: string;
        status: string;
        is_late: boolean;
        submission_text: string;
        score?: number;
        feedback?: string;
        graded_at?: string;
        tasks: {
          id: string;
          name: string;
          max_score: number;
          due_date: string;
          task_microcompetencies: Array<{
            microcompetency_id: string;
            weightage: number;
            microcompetencies: {
              name: string;
              components: {
                sub_categories: {
                  quadrants: {
                    name: string;
                  };
                };
              };
            };
          }>;
        };
        students: {
          id: string;
          name: string;
          registration_no: string;
        };
      }>;
      timestamp: string;
    }>(url);
  },

  // Update Task
  updateTask: async (taskId: string, taskData: {
    name?: string;
    description?: string;
    maxScore?: number;
    dueDate?: string;
    instructions?: string;
    status?: string;
    submissionType?: string;
    allowLateSubmission?: boolean;
    latePenalty?: number;
  }) => {
    return apiRequest<{
      success: boolean;
      message: string;
      data: {
        id: string;
        name: string;
        description: string;
        max_score: number;
        due_date: string;
        status: string;
        interventions: {
          name: string;
        };
        task_microcompetencies: Array<{
          microcompetency_id: string;
          weightage: number;
          microcompetencies: {
            name: string;
          };
        }>;
      };
      timestamp: string;
    }>(`/api/v1/interventions/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify(taskData),
    });
  },

  // Delete Task
  deleteTask: async (taskId: string) => {
    return apiRequest<{
      success: boolean;
      message: string;
      data: {
        taskId: string;
        taskName: string;
      };
      timestamp: string;
    }>(`/api/v1/interventions/tasks/${taskId}`, {
      method: 'DELETE',
    });
  },

  // Get Student Tasks
  getStudentTasks: async (interventionId: string, params?: {
    status?: string;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.append('status', params.status);

    const url = `/api/v1/interventions/student/${interventionId}/tasks${searchParams.toString() ? '?' + searchParams.toString() : ''}`;

    return apiRequest<{
      success: boolean;
      message: string;
      data: {
        tasks: Array<{
          id: string;
          name: string;
          description: string;
          maxScore: number;
          dueDate: string;
          instructions: string;
          submissionType: string;
          allowLateSubmission: boolean;
          latePenalty: number;
          status: string;
          createdAt: string;
          interventionName: string;
          microcompetencies: Array<{
            id: string;
            name: string;
            weightage: number;
            component: string;
            quadrant: string;
          }>;
          submission?: {
            id: string;
            status: string;
            score?: number;
            submittedAt: string;
            feedback?: string;
            isLate: boolean;
          };
          canSubmit: boolean;
          isOverdue: boolean;
        }>;
        totalCount: number;
        summary: {
          totalTasks: number;
          submittedTasks: number;
          draftTasks: number;
          pendingTasks: number;
          overdueTasks: number;
        };
      };
      timestamp: string;
    }>(url);
  },

  // Submit Task
  submitTask: async (taskId: string, submissionData: {
    submissionText: string;
    attachments?: string[];
  }) => {
    return apiRequest<{
      success: boolean;
      message: string;
      data: {
        id: string;
        student_id: string;
        task_id: string;
        submission_text: string;
        attachments: string[];
        status: string;
        submitted_at: string;
        is_late: boolean;
        tasks: {
          name: string;
          max_score: number;
        };
        students: {
          name: string;
          registration_no: string;
        };
      };
      timestamp: string;
    }>(`/api/v1/interventions/tasks/${taskId}/submit`, {
      method: 'POST',
      body: JSON.stringify(submissionData),
    });
  },

  // Save Task Draft
  saveTaskDraft: async (taskId: string, draftData: {
    submissionText: string;
    attachments?: string[];
  }) => {
    return apiRequest<{
      success: boolean;
      message: string;
      data: {
        id: string;
        student_id: string;
        task_id: string;
        submission_text: string;
        attachments: string[];
        status: string;
      };
      timestamp: string;
    }>(`/api/v1/interventions/tasks/${taskId}/draft`, {
      method: 'POST',
      body: JSON.stringify(draftData),
    });
  },
};

// Student Intervention API calls
export const studentInterventionAPI = {
  getStudentScores: async (studentId: string) => {
    return apiRequest<{
      success: boolean;
      data: {
        student: {
          id: string;
          name: string;
          registration_no: string;
        };
        scores: Array<{
          intervention: {
            id: string;
            name: string;
            status: string;
            start_date: string;
            end_date: string;
          };
          microcompetency_scores: Array<{
            id: string;
            obtained_score: number;
            max_score: number;
            percentage: number;
            feedback?: string;
            status: string;
            scored_at: string;
            microcompetencies: {
              id: string;
              name: string;
              description: string;
            };
          }>;
          competency_scores: Array<{
            competency_id: string;
            competency_name: string;
            obtained_score: number;
            max_score: number;
            percentage: number;
          }>;
          quadrant_scores: Array<{
            quadrant_id: string;
            quadrant_name: string;
            obtained_score: number;
            max_score: number;
            percentage: number;
          }>;
          overall_score: {
            obtained_score: number;
            max_score: number;
            percentage: number;
          };
        }>;
      };
    }>(`/api/v1/student-interventions/${studentId}/scores`);
  },

  getStudentInterventionBreakdown: async (studentId: string, interventionId: string) => {
    return apiRequest<{
      success: boolean;
      data: {
        student: {
          id: string;
          name: string;
          registration_no: string;
        };
        intervention: {
          id: string;
          name: string;
          description: string;
          status: string;
          start_date: string;
          end_date: string;
        };
        microcompetency_scores: Array<{
          id: string;
          obtained_score: number;
          max_score: number;
          percentage: number;
          feedback?: string;
          status: string;
          scored_at: string;
          microcompetencies: {
            id: string;
            name: string;
            description: string;
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
        }>;
        competency_scores: Array<{
          competency_id: string;
          competency_name: string;
          obtained_score: number;
          max_score: number;
          percentage: number;
        }>;
        quadrant_scores: Array<{
          quadrant_id: string;
          quadrant_name: string;
          obtained_score: number;
          max_score: number;
          percentage: number;
        }>;
        overall_score: {
          obtained_score: number;
          max_score: number;
          percentage: number;
        };
      };
    }>(`/api/v1/student-interventions/${studentId}/interventions/${interventionId}/breakdown`);
  },
};

// Upload API calls
export const uploadAPI = {
  // Upload single file
  uploadSingleFile: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    return apiRequest<{
      success: boolean;
      message: string;
      data: {
        id: string;
        originalName: string;
        filename: string;
        mimetype: string;
        size: number;
        uploadedBy: string;
        uploadedAt: string;
        url: string;
      };
      timestamp: string;
    }>('/api/v1/uploads/single', {
      method: 'POST',
      body: formData,
      headers: {
        // Don't set Content-Type, let browser set it with boundary for FormData
        Authorization: `Bearer ${localStorage.getItem('authToken')}`,
      },
    });
  },

  // Upload multiple files
  uploadMultipleFiles: async (files: File[]) => {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });

    return apiRequest<{
      success: boolean;
      message: string;
      data: Array<{
        id: string;
        originalName: string;
        filename: string;
        mimetype: string;
        size: number;
        uploadedBy: string;
        uploadedAt: string;
        url: string;
      }>;
      timestamp: string;
    }>('/api/v1/uploads/multiple', {
      method: 'POST',
      body: formData,
      headers: {
        // Don't set Content-Type, let browser set it with boundary for FormData
        Authorization: `Bearer ${localStorage.getItem('authToken')}`,
      },
    });
  },

  // Get file URL
  getFileUrl: (filename: string) => {
    return `${API_BASE_URL}/uploads/files/${filename}`;
  },

  // Delete file
  deleteFile: async (filename: string) => {
    return apiRequest<{
      success: boolean;
      message: string;
      data: {
        filename: string;
      };
      timestamp: string;
    }>(`/api/v1/uploads/files/${filename}`, {
      method: 'DELETE',
    });
  },

  // Import Excel data
  importExcelData: async (formData: FormData) => {
    const response = await fetch(`${API_BASE_URL}/api/v1/uploads/excel-import`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  },
};

// Term Management API
export const termAPI = {
  getAllTerms: async (includeInactive = false) => {
    const queryParams = new URLSearchParams();
    if (includeInactive) queryParams.append('includeInactive', 'true');

    const url = `/api/v1/terms${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return apiRequest<{
      success: boolean;
      data: Array<{
        id: string;
        name: string;
        description?: string;
        start_date: string;
        end_date: string;
        is_active: boolean;
        is_current: boolean;
        academic_year: string;
        created_at: string;
      }>;
    }>(url);
  },

  getCurrentTerm: async () => {
    return apiRequest<{
      success: boolean;
      data: {
        id: string;
        name: string;
        description?: string;
        start_date: string;
        end_date: string;
        is_active: boolean;
        is_current: boolean;
        academic_year: string;
        created_at: string;
      };
    }>('/api/v1/terms/current');
  },

  createTerm: async (termData: {
    name: string;
    description?: string;
    start_date: string;
    end_date: string;
    academic_year: string;
    is_active?: boolean;
    is_current?: boolean;
  }) => {
    return apiRequest<{
      success: boolean;
      data: any;
      message: string;
    }>('/api/v1/terms', {
      method: 'POST',
      body: JSON.stringify(termData),
    });
  },

  updateTerm: async (termId: string, updates: any) => {
    return apiRequest<{
      success: boolean;
      data: any;
      message: string;
    }>(`/api/v1/terms/${termId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  setCurrentTerm: async (termId: string) => {
    return apiRequest<{
      success: boolean;
      data: any;
      message: string;
    }>(`/api/v1/terms/${termId}/activate`, {
      method: 'POST',
    });
  },

  transitionStudents: async (termId: string, studentIds?: string[], resetScores = true) => {
    return apiRequest<{
      success: boolean;
      data: any;
      message: string;
    }>(`/api/v1/terms/${termId}/transition`, {
      method: 'POST',
      body: JSON.stringify({ studentIds, resetScores }),
    });
  },

  resetTermScores: async (termId: string, studentIds?: string[]) => {
    return apiRequest<{
      success: boolean;
      data: any;
      message: string;
    }>(`/api/v1/terms/${termId}/reset-scores`, {
      method: 'POST',
      body: JSON.stringify({ studentIds }),
    });
  },

  deleteTerm: async (termId: string) => {
    return apiRequest<{
      success: boolean;
      message: string;
    }>(`/api/v1/terms/${termId}`, {
      method: 'DELETE',
    });
  },
};

// Teacher Microcompetency API (alias for interventionAPI teacher functions)
export const teacherMicrocompetencyAPI = {
  getTeacherMicrocompetencies: interventionAPI.getTeacherMicrocompetencies,
  getTeacherInterventionMicrocompetencies: interventionAPI.getTeacherInterventionMicrocompetencies,
  getTeacherInterventionStudents: interventionAPI.getTeacherInterventionStudents,
  scoreStudentMicrocompetency: interventionAPI.scoreStudentMicrocompetency,
  batchScoreStudents: interventionAPI.batchScoreStudents,
};

// SHL Competency API calls
export const shlCompetencyAPI = {
  getSHLCompetencyComponents: async () => {
    return apiRequest<{
      success: boolean;
      message: string;
      data: {
        components: Array<{
          id: string;
          name: string;
          description: string;
          weightage: number;
          max_score: number;
          category: string;
          display_order: number;
          sub_categories: {
            id: string;
            name: string;
            quadrants: {
              id: string;
              name: string;
            };
          };
        }>;
        count: number;
      };
      timestamp: string;
    }>('/api/v1/shl-competencies/components');
  },

  calculateStudentSHLScores: async (studentId: string, termId: string) => {
    return apiRequest<{
      success: boolean;
      message: string;
      data: {
        student: {
          id: string;
          name: string;
          registration_no: string;
        };
        term: {
          id: string;
          name: string;
          academic_year: string;
        };
        shlAssessment: {
          success: boolean;
          studentId: string;
          termId: string;
          competencyScores: Array<{
            id: string;
            name: string;
            description: string;
            shortCode: string;
            rawScore: number;
            maxScore: number;
            percentage: number;
            rating: number;
            isAssessed: boolean;
            assessmentDate: string | null;
          }>;
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
        };
      };
      timestamp: string;
    }>(`/api/v1/shl-competencies/students/${studentId}/calculate`, {
      method: 'POST',
      body: JSON.stringify({ termId }),
    });
  },

  getStudentSHLSummary: async (studentId: string, termId: string) => {
    return apiRequest<{
      success: boolean;
      message: string;
      data: {
        success: boolean;
        summary: {
          studentId: string;
          termId: string;
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
          assessmentProgress: {
            assessed: number;
            total: number;
            percentage: number;
          };
        };
        detailedScores: Array<{
          id: string;
          name: string;
          description: string;
          shortCode: string;
          rawScore: number;
          maxScore: number;
          percentage: number;
          rating: number;
          isAssessed: boolean;
          assessmentDate: string | null;
        }>;
      };
      timestamp: string;
    }>(`/api/v1/shl-competencies/students/${studentId}/summary?termId=${termId}`);
  },

  submitSHLCompetencyScore: async (
    studentId: string,
    componentId: string,
    scoreData: {
      obtainedScore: number;
      maxScore: number;
      termId: string;
      notes?: string;
    }
  ) => {
    return apiRequest<{
      success: boolean;
      message: string;
      data: {
        studentId: string;
        componentId: string;
        componentName: string;
        obtainedScore: number;
        maxScore: number;
        percentage: number;
        termId: string;
        submittedAt: string;
      };
      timestamp: string;
    }>(`/api/v1/shl-competencies/students/${studentId}/components/${componentId}/score`, {
      method: 'POST',
      body: JSON.stringify(scoreData),
    });
  },
};

export default {
  auth: authAPI,
  student: studentAPI,
  score: scoreAPI,
  quadrant: quadrantAPI,
  subCategory: subCategoryAPI,
  component: componentAPI,
  admin: adminAPI,
  user: userAPI,
  intervention: interventionAPI,
  microcompetency: microcompetencyAPI,
  scoreCalculation: scoreCalculationAPI,
  studentIntervention: studentInterventionAPI,
  teacher: teacherAPI,
  teacherMicrocompetency: teacherMicrocompetencyAPI,
  upload: uploadAPI,
  term: termAPI,
  shlCompetency: shlCompetencyAPI,
};