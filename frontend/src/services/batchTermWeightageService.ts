// Import the existing API request function from lib/api.ts
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

// Get auth token from localStorage
const getAuthToken = (): string | null => {
  return localStorage.getItem('authToken');
};

// Generic API request function
const apiRequest = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = getAuthToken();

  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    ...options,
  };

  const response = await fetch(url, config);

  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch {
      errorData = { message: `HTTP error! status: ${response.status}` };
    }
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }

  // Check if response is actually JSON
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    const text = await response.text();
    console.error('Non-JSON response:', text);
    throw new Error('Server returned non-JSON response');
  }

  const result = await response.json();
  return result.data || result; // Handle both {data: ...} and direct response formats
};

export interface Batch {
  id: string;
  name: string;
  year: number;
  is_active: boolean;
  current_term_number: number;
  max_terms: number;
}

export interface Term {
  id: string;
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  is_current: boolean;
  academic_year: string;
}

export interface Quadrant {
  id: string;
  name: string;
  description: string;
  default_weightage: number;
  minimum_attendance: number;
}

export interface WeightageConfiguration {
  id: string;
  batch_id: string;
  term_id: string;
  config_name: string;
  description: string;
  is_active: boolean;
  created_at: string;
  batches: { id: string; name: string };
  terms: { id: string; name: string };
}

export interface QuadrantWeightage {
  quadrant_id: string;
  weightage: number;
  minimum_attendance: number;
  business_rules: Record<string, any>;
}

export interface SubCategoryWeightage {
  id?: string;
  subcategory_id: string;
  weightage: number;
  is_active?: boolean;
  business_rules?: Record<string, any>;
  sub_categories?: {
    id: string;
    name: string;
    description: string;
    quadrant_id: string;
    quadrants: {
      id: string;
      name: string;
    };
  };
}

export interface ComponentWeightage {
  id?: string;
  component_id: string;
  weightage: number;
  is_active?: boolean;
  business_rules?: Record<string, any>;
  components?: {
    id: string;
    name: string;
    description: string;
    max_score: number;
    sub_category_id: string;
    sub_categories: {
      id: string;
      name: string;
      quadrant_id: string;
      quadrants: {
        id: string;
        name: string;
      };
    };
  };
}

export interface MicrocompetencyWeightage {
  id?: string;
  microcompetency_id: string;
  weightage: number;
  is_active?: boolean;
  business_rules?: Record<string, any>;
  microcompetencies?: {
    id: string;
    name: string;
    description: string;
    max_score: number;
    component_id: string;
    components: {
      id: string;
      name: string;
      sub_category_id: string;
      sub_categories: {
        id: string;
        name: string;
        quadrant_id: string;
        quadrants: {
          id: string;
          name: string;
        };
      };
    };
  };
}

export interface ConfigurationDetails {
  id: string;
  batch_id: string;
  term_id: string;
  config_name: string;
  description: string;
  is_active: boolean;
  created_at: string;
  quadrant_weightages: QuadrantWeightage[];
  batches: { id: string; name: string };
  terms: { id: string; name: string };
}

export interface CreateConfigurationRequest {
  batch_id: string;
  term_id: string;
  config_name: string;
  description: string;
  is_active: boolean;
}

export interface UpdateConfigurationRequest {
  quadrant_weightages: QuadrantWeightage[];
}

class BatchTermWeightageService {
  private baseUrl = '/api/v1/admin/batch-term-weightages';

  /**
   * Get all available batches
   */
  async getBatches(): Promise<Batch[]> {
    return apiRequest<Batch[]>(`${this.baseUrl}/batches`);
  }

  /**
   * Get all available terms
   */
  async getTerms(): Promise<Term[]> {
    return apiRequest<Term[]>(`${this.baseUrl}/terms`);
  }

  /**
   * Get all available quadrants
   */
  async getQuadrants(): Promise<Quadrant[]> {
    return apiRequest<Quadrant[]>(`${this.baseUrl}/quadrants`);
  }

  /**
   * Get all available sub-categories
   */
  async getSubCategories(): Promise<any[]> {
    return apiRequest<any[]>(`${this.baseUrl}/subcategories`);
  }

  /**
   * Get all available components
   */
  async getComponents(): Promise<any[]> {
    return apiRequest<any[]>(`${this.baseUrl}/components`);
  }

  /**
   * Get all available microcompetencies
   */
  async getMicrocompetencies(): Promise<any[]> {
    return apiRequest<any[]>(`${this.baseUrl}/microcompetencies`);
  }

  /**
   * Get all weightage configurations
   */
  async getConfigurations(filters?: {
    batch_id?: string;
    term_id?: string;
    is_active?: boolean;
  }): Promise<WeightageConfiguration[]> {
    const params = new URLSearchParams();
    if (filters?.batch_id) params.append('batch_id', filters.batch_id);
    if (filters?.term_id) params.append('term_id', filters.term_id);
    if (filters?.is_active !== undefined) params.append('is_active', filters.is_active.toString());

    const url = params.toString() ? `${this.baseUrl}?${params.toString()}` : this.baseUrl;
    return apiRequest<WeightageConfiguration[]>(url);
  }

  /**
   * Get configuration details including quadrant weightages
   */
  async getConfigurationDetails(configId: string): Promise<ConfigurationDetails> {
    return apiRequest<ConfigurationDetails>(`${this.baseUrl}/${configId}`);
  }

  /**
   * Create a new weightage configuration
   */
  async createConfiguration(config: CreateConfigurationRequest): Promise<WeightageConfiguration> {
    return apiRequest<WeightageConfiguration>(this.baseUrl, {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }

  /**
   * Update configuration quadrant weightages
   */
  async updateConfiguration(configId: string, update: UpdateConfigurationRequest): Promise<ConfigurationDetails> {
    return apiRequest<ConfigurationDetails>(`${this.baseUrl}/${configId}`, {
      method: 'PUT',
      body: JSON.stringify(update),
    });
  }

  /**
   * Delete a configuration
   */
  async deleteConfiguration(configId: string): Promise<void> {
    await apiClient.delete(`${this.baseUrl}/${configId}`);
  }

  /**
   * Activate/deactivate a configuration
   */
  async toggleConfiguration(configId: string, isActive: boolean): Promise<WeightageConfiguration> {
    const response = await apiClient.patch(`${this.baseUrl}/${configId}/toggle`, { is_active: isActive });
    return response.data;
  }

  /**
   * Validate weightage configuration
   */
  async validateConfiguration(quadrantWeightages: QuadrantWeightage[]): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const response = await apiClient.post(`${this.baseUrl}/validate`, { quadrant_weightages: quadrantWeightages });
    return response.data;
  }

  /**
   * Get weightage configuration for a specific batch and term
   */
  async getWeightageForBatchTerm(batchId: string, termId: string): Promise<ConfigurationDetails | null> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/batch/${batchId}/term/${termId}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null; // No configuration found
      }
      throw error;
    }
  }

  /**
   * Copy configuration from one batch-term to another
   */
  async copyConfiguration(
    sourceConfigId: string, 
    targetBatchId: string, 
    targetTermId: string,
    newConfigName: string
  ): Promise<WeightageConfiguration> {
    const response = await apiClient.post(`${this.baseUrl}/${sourceConfigId}/copy`, {
      target_batch_id: targetBatchId,
      target_term_id: targetTermId,
      config_name: newConfigName
    });
    return response.data;
  }

  /**
   * Get audit trail for a configuration
   */
  async getConfigurationAuditTrail(configId: string): Promise<any[]> {
    const response = await apiClient.get(`${this.baseUrl}/${configId}/audit`);
    return response.data;
  }

  /**
   * Bulk create configurations for multiple batch-term combinations
   */
  async bulkCreateConfigurations(configurations: CreateConfigurationRequest[]): Promise<{
    created: WeightageConfiguration[];
    errors: Array<{ config: CreateConfigurationRequest; error: string }>;
  }> {
    const response = await apiClient.post(`${this.baseUrl}/bulk`, { configurations });
    return response.data;
  }

  /**
   * Get summary statistics for weightage configurations
   */
  async getConfigurationSummary(): Promise<{
    total_configurations: number;
    active_configurations: number;
    batches_with_configs: number;
    terms_with_configs: number;
    recent_changes: number;
  }> {
    const response = await apiClient.get(`${this.baseUrl}/summary`);
    return response.data;
  }

  /**
   * Get subcategory weightages for a specific configuration
   */
  async getSubcategoryWeightages(configId: string): Promise<{
    configId: string;
    configName: string;
    subcategoryWeightages: SubCategoryWeightage[];
  }> {
    return apiRequest<{
      configId: string;
      configName: string;
      subcategoryWeightages: SubCategoryWeightage[];
    }>(`${this.baseUrl}/${configId}/subcategories`);
  }

  /**
   * Update subcategory weightages for a specific configuration
   */
  async updateSubcategoryWeightages(configId: string, weightages: SubCategoryWeightage[]): Promise<{
    configId: string;
    updatedCount: number;
  }> {
    return apiRequest<{
      configId: string;
      updatedCount: number;
    }>(`${this.baseUrl}/${configId}/subcategories`, {
      method: 'PUT',
      body: JSON.stringify({ subcategoryWeightages: weightages }),
    });
  }

  /**
   * Get component weightages for a specific configuration
   */
  async getComponentWeightages(configId: string): Promise<{
    configId: string;
    configName: string;
    componentWeightages: ComponentWeightage[];
  }> {
    return apiRequest<{
      configId: string;
      configName: string;
      componentWeightages: ComponentWeightage[];
    }>(`${this.baseUrl}/${configId}/components`);
  }

  /**
   * Update component weightages for a specific configuration
   */
  async updateComponentWeightages(configId: string, weightages: ComponentWeightage[]): Promise<{
    configId: string;
    updatedCount: number;
  }> {
    return apiRequest<{
      configId: string;
      updatedCount: number;
    }>(`${this.baseUrl}/${configId}/components`, {
      method: 'PUT',
      body: JSON.stringify({ componentWeightages: weightages }),
    });
  }

  /**
   * Get microcompetency weightages for a specific configuration
   */
  async getMicrocompetencyWeightages(configId: string): Promise<{
    configId: string;
    configName: string;
    microcompetencyWeightages: MicrocompetencyWeightage[];
  }> {
    return apiRequest<{
      configId: string;
      configName: string;
      microcompetencyWeightages: MicrocompetencyWeightage[];
    }>(`${this.baseUrl}/${configId}/microcompetencies`);
  }

  /**
   * Update microcompetency weightages for a specific configuration
   */
  async updateMicrocompetencyWeightages(configId: string, weightages: MicrocompetencyWeightage[]): Promise<{
    configId: string;
    updatedCount: number;
  }> {
    return apiRequest<{
      configId: string;
      updatedCount: number;
    }>(`${this.baseUrl}/${configId}/microcompetencies`, {
      method: 'PUT',
      body: JSON.stringify({ microcompetencyWeightages: weightages }),
    });
  }

  /**
   * Export configurations to CSV/JSON
   */
  async exportConfigurations(format: 'csv' | 'json' = 'json'): Promise<Blob> {
    const response = await apiClient.get(`${this.baseUrl}/export?format=${format}`, {
      responseType: 'blob'
    });
    return response.data;
  }

  /**
   * Import configurations from file
   */
  async importConfigurations(file: File): Promise<{
    imported: number;
    errors: Array<{ row: number; error: string }>;
  }> {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await apiClient.post(`${this.baseUrl}/import`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  }

  /**
   * Add a new quadrant weightage to a configuration
   */
  async addQuadrantWeightage(configId: string, quadrantId: string, weightage: number): Promise<void> {
    const currentConfig = await this.getConfigurationDetails(configId);
    const updatedWeightages = [
      ...currentConfig.quadrant_weightages,
      { quadrant_id: quadrantId, weightage, config_id: configId }
    ];

    return this.updateConfiguration(configId, { quadrant_weightages: updatedWeightages });
  }

  /**
   * Remove a quadrant weightage from a configuration
   */
  async removeQuadrantWeightage(configId: string, quadrantId: string): Promise<void> {
    const currentConfig = await this.getConfigurationDetails(configId);
    const updatedWeightages = currentConfig.quadrant_weightages.filter(
      q => q.quadrant_id !== quadrantId
    );

    return this.updateConfiguration(configId, { quadrant_weightages: updatedWeightages });
  }

  /**
   * Add a new subcategory weightage to a configuration
   */
  async addSubcategoryWeightage(configId: string, subcategoryId: string, weightage: number): Promise<void> {
    const currentData = await this.getSubcategoryWeightages(configId);
    const updatedWeightages = [
      ...currentData.subcategoryWeightages,
      { subcategory_id: subcategoryId, weightage, config_id: configId }
    ];

    return this.updateSubcategoryWeightages(configId, updatedWeightages);
  }

  /**
   * Remove a subcategory weightage from a configuration
   */
  async removeSubcategoryWeightage(configId: string, subcategoryId: string): Promise<void> {
    const currentData = await this.getSubcategoryWeightages(configId);
    const updatedWeightages = currentData.subcategoryWeightages.filter(
      s => s.subcategory_id !== subcategoryId
    );

    return this.updateSubcategoryWeightages(configId, updatedWeightages);
  }

  /**
   * Add a new component weightage to a configuration
   */
  async addComponentWeightage(configId: string, componentId: string, weightage: number): Promise<void> {
    const currentData = await this.getComponentWeightages(configId);
    const updatedWeightages = [
      ...currentData.componentWeightages,
      { component_id: componentId, weightage, config_id: configId }
    ];

    return this.updateComponentWeightages(configId, updatedWeightages);
  }

  /**
   * Remove a component weightage from a configuration
   */
  async removeComponentWeightage(configId: string, componentId: string): Promise<void> {
    const currentData = await this.getComponentWeightages(configId);
    const updatedWeightages = currentData.componentWeightages.filter(
      c => c.component_id !== componentId
    );

    return this.updateComponentWeightages(configId, updatedWeightages);
  }

  /**
   * Add a new microcompetency weightage to a configuration
   */
  async addMicrocompetencyWeightage(configId: string, microcompetencyId: string, weightage: number): Promise<void> {
    const currentData = await this.getMicrocompetencyWeightages(configId);
    const updatedWeightages = [
      ...currentData.microcompetencyWeightages,
      { microcompetency_id: microcompetencyId, weightage, config_id: configId }
    ];

    return this.updateMicrocompetencyWeightages(configId, updatedWeightages);
  }

  /**
   * Remove a microcompetency weightage from a configuration
   */
  async removeMicrocompetencyWeightage(configId: string, microcompetencyId: string): Promise<void> {
    const currentData = await this.getMicrocompetencyWeightages(configId);
    const updatedWeightages = currentData.microcompetencyWeightages.filter(
      m => m.microcompetency_id !== microcompetencyId
    );

    return this.updateMicrocompetencyWeightages(configId, updatedWeightages);
  }
}

export const batchTermWeightageService = new BatchTermWeightageService();
