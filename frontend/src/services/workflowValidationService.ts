interface WorkflowValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  missingSteps: string[];
  completionPercentage: number;
}

interface InterventionWorkflowState {
  hasBasicInfo: boolean;
  hasMicrocompetencies: boolean;
  hasTeacherAssignments: boolean;
  hasStudentEnrollments: boolean;
  isActive: boolean;
  canStartTasks: boolean;
  canReceiveSubmissions: boolean;
}

class WorkflowValidationService {
  /**
   * Validates the complete intervention workflow from admin setup to student readiness
   */
  async validateInterventionWorkflow(interventionId: string): Promise<WorkflowValidationResult> {
    const result: WorkflowValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      missingSteps: [],
      completionPercentage: 0
    };

    try {
      // Step 1: Validate basic intervention info
      const basicInfoValid = await this.validateBasicInterventionInfo(interventionId);
      if (!basicInfoValid.isValid) {
        result.errors.push(...basicInfoValid.errors);
        result.missingSteps.push('Complete basic intervention information');
      }

      // Step 2: Validate microcompetency assignments
      const microcompetenciesValid = await this.validateMicrocompetencyAssignments(interventionId);
      if (!microcompetenciesValid.isValid) {
        result.errors.push(...microcompetenciesValid.errors);
        result.missingSteps.push('Assign microcompetencies to intervention');
      }

      // Step 3: Validate teacher assignments
      const teachersValid = await this.validateTeacherAssignments(interventionId);
      if (!teachersValid.isValid) {
        result.errors.push(...teachersValid.errors);
        result.missingSteps.push('Assign teachers to microcompetencies');
      }

      // Step 4: Validate student enrollments
      const studentsValid = await this.validateStudentEnrollments(interventionId);
      if (!studentsValid.isValid) {
        result.warnings.push(...studentsValid.errors);
        result.missingSteps.push('Enroll students in intervention');
      }

      // Step 5: Validate workflow readiness
      const workflowReady = await this.validateWorkflowReadiness(interventionId);
      if (!workflowReady.isValid) {
        result.warnings.push(...workflowReady.errors);
      }

      // Calculate completion percentage
      const totalSteps = 5;
      const completedSteps = totalSteps - result.missingSteps.length;
      result.completionPercentage = (completedSteps / totalSteps) * 100;

      // Overall validation
      result.isValid = result.errors.length === 0 && result.missingSteps.length === 0;

      return result;

    } catch (error) {
      result.isValid = false;
      result.errors.push(`Workflow validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return result;
    }
  }

  /**
   * Validates basic intervention information
   */
  private async validateBasicInterventionInfo(interventionId: string): Promise<WorkflowValidationResult> {
    const result: WorkflowValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      missingSteps: [],
      completionPercentage: 0
    };

    try {
      // This would call the actual API in a real implementation
      // For now, we'll simulate the validation
      const intervention = await this.fetchInterventionInfo(interventionId);
      
      if (!intervention.name || intervention.name.trim().length === 0) {
        result.errors.push('Intervention name is required');
      }

      if (!intervention.description || intervention.description.trim().length === 0) {
        result.errors.push('Intervention description is required');
      }

      if (!intervention.start_date) {
        result.errors.push('Start date is required');
      }

      if (!intervention.end_date) {
        result.errors.push('End date is required');
      }

      if (intervention.start_date && intervention.end_date && 
          new Date(intervention.start_date) >= new Date(intervention.end_date)) {
        result.errors.push('End date must be after start date');
      }

      if (!intervention.max_students || intervention.max_students <= 0) {
        result.warnings.push('Maximum students should be set to a positive number');
      }

      result.isValid = result.errors.length === 0;
      return result;

    } catch (error) {
      result.isValid = false;
      result.errors.push(`Failed to validate basic intervention info: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return result;
    }
  }

  /**
   * Validates microcompetency assignments
   */
  private async validateMicrocompetencyAssignments(interventionId: string): Promise<WorkflowValidationResult> {
    const result: WorkflowValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      missingSteps: [],
      completionPercentage: 0
    };

    try {
      const microcompetencies = await this.fetchInterventionMicrocompetencies(interventionId);
      
      if (microcompetencies.length === 0) {
        result.errors.push('No microcompetencies assigned to intervention');
        result.isValid = false;
        return result;
      }

      // Validate weightage distribution
      const totalWeightage = microcompetencies.reduce((sum, mc) => sum + (mc.weightage || 0), 0);
      if (Math.abs(totalWeightage - 100) > 0.01) {
        result.warnings.push(`Total weightage is ${totalWeightage}% (should be 100%)`);
      }

      // Validate quadrant coverage
      const quadrants = [...new Set(microcompetencies.map(mc => mc.quadrant?.id).filter(Boolean))];
      if (quadrants.length < 2) {
        result.warnings.push('Intervention covers only one quadrant - consider adding microcompetencies from other quadrants');
      }

      // Validate microcompetency status
      const inactiveMicrocompetencies = microcompetencies.filter(mc => !mc.is_active);
      if (inactiveMicrocompetencies.length > 0) {
        result.warnings.push(`${inactiveMicrocompetencies.length} microcompetencies are inactive`);
      }

      result.isValid = result.errors.length === 0;
      return result;

    } catch (error) {
      result.isValid = false;
      result.errors.push(`Failed to validate microcompetency assignments: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return result;
    }
  }

  /**
   * Validates teacher assignments
   */
  private async validateTeacherAssignments(interventionId: string): Promise<WorkflowValidationResult> {
    const result: WorkflowValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      missingSteps: [],
      completionPercentage: 0
    };

    try {
      const teacherAssignments = await this.fetchTeacherAssignments(interventionId);
      const microcompetencies = await this.fetchInterventionMicrocompetencies(interventionId);
      
      if (teacherAssignments.length === 0) {
        result.errors.push('No teachers assigned to intervention');
        result.isValid = false;
        return result;
      }

      // Check for unassigned microcompetencies
      const assignedMicrocompetencyIds = new Set(
        teacherAssignments.flatMap(ta => ta.microcompetency_assignments?.map(ma => ma.microcompetency_id) || [])
      );
      
      const unassignedMicrocompetencies = microcompetencies.filter(mc => !assignedMicrocompetencyIds.has(mc.id));
      if (unassignedMicrocompetencies.length > 0) {
        result.errors.push(`${unassignedMicrocompetencies.length} microcompetencies have no teacher assigned`);
      }

      // Check for teachers without scoring permission
      const teachersWithoutScoring = teacherAssignments.filter(ta => 
        ta.microcompetency_assignments?.every(ma => !ma.can_score)
      );
      if (teachersWithoutScoring.length > 0) {
        result.warnings.push(`${teachersWithoutScoring.length} teachers cannot score any microcompetencies`);
      }

      // Check for teachers without task creation permission
      const teachersWithoutTaskCreation = teacherAssignments.filter(ta => 
        ta.microcompetency_assignments?.every(ma => !ma.can_create_tasks)
      );
      if (teachersWithoutTaskCreation.length > 0) {
        result.warnings.push(`${teachersWithoutTaskCreation.length} teachers cannot create tasks`);
      }

      result.isValid = result.errors.length === 0;
      return result;

    } catch (error) {
      result.isValid = false;
      result.errors.push(`Failed to validate teacher assignments: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return result;
    }
  }

  /**
   * Validates student enrollments
   */
  private async validateStudentEnrollments(interventionId: string): Promise<WorkflowValidationResult> {
    const result: WorkflowValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      missingSteps: [],
      completionPercentage: 0
    };

    try {
      const enrollments = await this.fetchStudentEnrollments(interventionId);
      const intervention = await this.fetchInterventionInfo(interventionId);
      
      if (enrollments.length === 0) {
        result.errors.push('No students enrolled in intervention');
        result.isValid = false;
        return result;
      }

      // Check enrollment capacity
      if (enrollments.length > intervention.max_students) {
        result.warnings.push(`${enrollments.length} students enrolled exceeds maximum capacity of ${intervention.max_students}`);
      }

      // Check for inactive enrollments
      const inactiveEnrollments = enrollments.filter(e => e.enrollment_status !== 'Enrolled');
      if (inactiveEnrollments.length > 0) {
        result.warnings.push(`${inactiveEnrollments.length} students have inactive enrollment status`);
      }

      result.isValid = result.errors.length === 0;
      return result;

    } catch (error) {
      result.isValid = false;
      result.errors.push(`Failed to validate student enrollments: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return result;
    }
  }

  /**
   * Validates overall workflow readiness
   */
  private async validateWorkflowReadiness(interventionId: string): Promise<WorkflowValidationResult> {
    const result: WorkflowValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      missingSteps: [],
      completionPercentage: 0
    };

    try {
      const intervention = await this.fetchInterventionInfo(interventionId);
      
      // Check intervention status
      if (intervention.status !== 'Active') {
        result.warnings.push(`Intervention status is '${intervention.status}' - should be 'Active' for full functionality`);
      }

      // Check scoring settings
      if (!intervention.is_scoring_open) {
        result.warnings.push('Scoring is not open - students cannot receive scores');
      }

      // Check dates
      const now = new Date();
      const startDate = new Date(intervention.start_date);
      const endDate = new Date(intervention.end_date);

      if (now < startDate) {
        result.warnings.push('Intervention has not started yet');
      }

      if (now > endDate) {
        result.warnings.push('Intervention has ended');
      }

      result.isValid = result.errors.length === 0;
      return result;

    } catch (error) {
      result.isValid = false;
      result.errors.push(`Failed to validate workflow readiness: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return result;
    }
  }

  /**
   * Get workflow state summary
   */
  async getWorkflowState(interventionId: string): Promise<InterventionWorkflowState> {
    try {
      const validation = await this.validateInterventionWorkflow(interventionId);
      
      return {
        hasBasicInfo: !validation.missingSteps.includes('Complete basic intervention information'),
        hasMicrocompetencies: !validation.missingSteps.includes('Assign microcompetencies to intervention'),
        hasTeacherAssignments: !validation.missingSteps.includes('Assign teachers to microcompetencies'),
        hasStudentEnrollments: !validation.missingSteps.includes('Enroll students in intervention'),
        isActive: validation.completionPercentage === 100,
        canStartTasks: validation.completionPercentage >= 75,
        canReceiveSubmissions: validation.isValid
      };
    } catch (error) {
      return {
        hasBasicInfo: false,
        hasMicrocompetencies: false,
        hasTeacherAssignments: false,
        hasStudentEnrollments: false,
        isActive: false,
        canStartTasks: false,
        canReceiveSubmissions: false
      };
    }
  }

  // Real API methods
  private async fetchInterventionInfo(interventionId: string): Promise<any> {
    try {
      const { interventionAPI } = await import('../lib/api');
      const response = await interventionAPI.getInterventionById(interventionId);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch intervention info:', error);
      throw new Error(`Failed to fetch intervention: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async fetchInterventionMicrocompetencies(interventionId: string): Promise<any[]> {
    try {
      const { interventionAPI } = await import('../lib/api');
      const response = await interventionAPI.getInterventionMicrocompetencies(interventionId);
      return response.data?.microcompetencies || [];
    } catch (error) {
      console.error('Failed to fetch intervention microcompetencies:', error);
      return []; // Return empty array if API fails, but log the error
    }
  }

  private async fetchTeacherAssignments(interventionId: string): Promise<any[]> {
    try {
      const { interventionAPI } = await import('../lib/api');
      const response = await interventionAPI.getInterventionTeacherAssignments(interventionId);
      return response.data?.assignments || [];
    } catch (error) {
      console.error('Failed to fetch teacher assignments:', error);
      return []; // Return empty array if API fails
    }
  }

  private async fetchStudentEnrollments(interventionId: string): Promise<any[]> {
    try {
      const { interventionAPI } = await import('../lib/api');
      const response = await interventionAPI.getInterventionStudents(interventionId);
      return response.data || [];
    } catch (error) {
      console.error('Failed to fetch student enrollments:', error);
      return []; // Return empty array if API fails
    }
  }
}

export const workflowValidationService = new WorkflowValidationService();
export type { WorkflowValidationResult, InterventionWorkflowState }; 