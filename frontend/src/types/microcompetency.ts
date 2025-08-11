// Microcompetency-specific types
export interface Component {
  id: string;
  name: string;
  category: string;
  max_score: number;
  sub_category_id: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  sub_categories?: SubCategory;
}

export interface SubCategory {
  id: string;
  name: string;
  quadrant_id: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  quadrants?: Quadrant;
}

export interface Quadrant {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

export interface MicrocompetencyWithHierarchy {
  id: string;
  name: string;
  description: string;
  weightage: number;
  max_score: number;
  display_order: number;
  is_active: boolean;
  component_id: string;
  created_at: string;
  component: Component;
  sub_category: SubCategory;
  quadrant: Quadrant;
}

// API Response Types for Microcompetencies
export interface QuadrantMicrocompetenciesResponse {
  success: boolean;
  data: MicrocompetencyWithHierarchy[];
  quadrant: Quadrant;
}

export interface ComponentMicrocompetenciesResponse {
  success: boolean;
  data: MicrocompetencyWithHierarchy[];
  component: Component;
}

// Form Types
export interface CreateMicrocompetencyForm {
  name: string;
  description: string;
  componentId: string;
  weightage: number;
  maxScore: number;
  displayOrder: number;
}

export interface UpdateMicrocompetencyForm {
  name?: string;
  description?: string;
  weightage?: number;
  maxScore?: number;
  displayOrder?: number;
  isActive?: boolean;
}

// Filter Types
export interface MicrocompetencyFilters {
  quadrantId?: string;
  componentId?: string;
  subCategoryId?: string;
  search?: string;
  includeInactive?: boolean;
  page?: number;
  limit?: number;
}
