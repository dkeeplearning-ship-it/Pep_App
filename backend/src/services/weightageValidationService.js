const { supabase, query } = require('../config/supabase');

/**
 * Weightage Validation Service
 * Ensures weightages across quadrants, sub-categories, components, and microcompetencies are valid
 */
class WeightageValidationService {
  constructor() {
    this.tolerance = 0.01; // Allow 0.01% tolerance for floating point precision
  }

  /**
   * Validate quadrant weightages (should total 100%)
   * @returns {Promise<Object>} Validation result
   */
  async validateQuadrantWeightages() {
    try {
      const result = await query(
        supabase
          .from('quadrants')
          .select('id, name, weightage, is_active')
          .eq('is_active', true)
      );

      const quadrants = result.rows || [];
      const totalWeightage = quadrants.reduce((sum, q) => sum + parseFloat(q.weightage), 0);
      const isValid = Math.abs(totalWeightage - 100) <= this.tolerance;

      return {
        success: true,
        isValid,
        totalWeightage,
        expectedTotal: 100,
        quadrants,
        message: isValid 
          ? 'Quadrant weightages are valid' 
          : `Quadrant weightages total ${totalWeightage}%, expected 100%`
      };
    } catch (error) {
      console.error('Error validating quadrant weightages:', error);
      return {
        success: false,
        error: 'VALIDATION_FAILED',
        message: 'Failed to validate quadrant weightages'
      };
    }
  }

  /**
   * Validate sub-category weightages within each quadrant
   * @param {string} quadrantId - Optional quadrant ID to validate specific quadrant
   * @returns {Promise<Object>} Validation result
   */
  async validateSubCategoryWeightages(quadrantId = null) {
    try {
      let queryBuilder = supabase
        .from('sub_categories')
        .select(`
          id, name, weightage, is_active, quadrant_id,
          quadrants:quadrant_id(id, name)
        `)
        .eq('is_active', true);

      if (quadrantId) {
        queryBuilder = queryBuilder.eq('quadrant_id', quadrantId);
      }

      const result = await query(queryBuilder);
      const subCategories = result.rows || [];

      // Group by quadrant
      const quadrantGroups = subCategories.reduce((groups, sc) => {
        const qId = sc.quadrant_id;
        if (!groups[qId]) {
          groups[qId] = {
            quadrant: sc.quadrants,
            subCategories: [],
            totalWeightage: 0
          };
        }
        groups[qId].subCategories.push(sc);
        groups[qId].totalWeightage += parseFloat(sc.weightage);
        return groups;
      }, {});

      // Validate each quadrant
      const validationResults = Object.entries(quadrantGroups).map(([qId, group]) => {
        const isValid = Math.abs(group.totalWeightage - 100) <= this.tolerance;
        return {
          quadrantId: qId,
          quadrantName: group.quadrant.name,
          totalWeightage: group.totalWeightage,
          expectedTotal: 100,
          isValid,
          subCategories: group.subCategories,
          message: isValid 
            ? `Sub-categories in ${group.quadrant.name} are valid`
            : `Sub-categories in ${group.quadrant.name} total ${group.totalWeightage}%, expected 100%`
        };
      });

      const allValid = validationResults.every(r => r.isValid);

      return {
        success: true,
        isValid: allValid,
        results: validationResults,
        message: allValid 
          ? 'All sub-category weightages are valid'
          : 'Some sub-category weightages are invalid'
      };
    } catch (error) {
      console.error('Error validating sub-category weightages:', error);
      return {
        success: false,
        error: 'VALIDATION_FAILED',
        message: 'Failed to validate sub-category weightages'
      };
    }
  }

  /**
   * Validate component weightages within each sub-category
   * @param {string} subCategoryId - Optional sub-category ID to validate specific sub-category
   * @returns {Promise<Object>} Validation result
   */
  async validateComponentWeightages(subCategoryId = null) {
    try {
      let queryBuilder = supabase
        .from('components')
        .select(`
          id, name, weightage, is_active, sub_category_id,
          sub_categories:sub_category_id(
            id, name,
            quadrants:quadrant_id(id, name)
          )
        `)
        .eq('is_active', true);

      if (subCategoryId) {
        queryBuilder = queryBuilder.eq('sub_category_id', subCategoryId);
      }

      const result = await query(queryBuilder);
      const components = result.rows || [];

      // Group by sub-category
      const subCategoryGroups = components.reduce((groups, comp) => {
        const scId = comp.sub_category_id;
        if (!groups[scId]) {
          groups[scId] = {
            subCategory: comp.sub_categories,
            components: [],
            totalWeightage: 0
          };
        }
        groups[scId].components.push(comp);
        groups[scId].totalWeightage += parseFloat(comp.weightage);
        return groups;
      }, {});

      // Validate each sub-category
      const validationResults = Object.entries(subCategoryGroups).map(([scId, group]) => {
        const isValid = Math.abs(group.totalWeightage - 100) <= this.tolerance;
        return {
          subCategoryId: scId,
          subCategoryName: group.subCategory.name,
          quadrantName: group.subCategory.quadrants.name,
          totalWeightage: group.totalWeightage,
          expectedTotal: 100,
          isValid,
          components: group.components,
          message: isValid 
            ? `Components in ${group.subCategory.name} are valid`
            : `Components in ${group.subCategory.name} total ${group.totalWeightage}%, expected 100%`
        };
      });

      const allValid = validationResults.every(r => r.isValid);

      return {
        success: true,
        isValid: allValid,
        results: validationResults,
        message: allValid 
          ? 'All component weightages are valid'
          : 'Some component weightages are invalid'
      };
    } catch (error) {
      console.error('Error validating component weightages:', error);
      return {
        success: false,
        error: 'VALIDATION_FAILED',
        message: 'Failed to validate component weightages'
      };
    }
  }

  /**
   * Validate microcompetency weightages within each component
   * @param {string} componentId - Optional component ID to validate specific component
   * @returns {Promise<Object>} Validation result
   */
  async validateMicrocompetencyWeightages(componentId = null) {
    try {
      let queryBuilder = supabase
        .from('microcompetencies')
        .select(`
          id, name, weightage, is_active, component_id,
          components:component_id(
            id, name,
            sub_categories:sub_category_id(
              id, name,
              quadrants:quadrant_id(id, name)
            )
          )
        `)
        .eq('is_active', true);

      if (componentId) {
        queryBuilder = queryBuilder.eq('component_id', componentId);
      }

      const result = await query(queryBuilder);
      const microcompetencies = result.rows || [];

      // Group by component
      const componentGroups = microcompetencies.reduce((groups, micro) => {
        const cId = micro.component_id;
        if (!groups[cId]) {
          groups[cId] = {
            component: micro.components,
            microcompetencies: [],
            totalWeightage: 0
          };
        }
        groups[cId].microcompetencies.push(micro);
        groups[cId].totalWeightage += parseFloat(micro.weightage);
        return groups;
      }, {});

      // Validate each component
      const validationResults = Object.entries(componentGroups).map(([cId, group]) => {
        const isValid = Math.abs(group.totalWeightage - 100) <= this.tolerance;
        return {
          componentId: cId,
          componentName: group.component.name,
          subCategoryName: group.component.sub_categories.name,
          quadrantName: group.component.sub_categories.quadrants.name,
          totalWeightage: group.totalWeightage,
          expectedTotal: 100,
          isValid,
          microcompetencies: group.microcompetencies,
          message: isValid 
            ? `Microcompetencies in ${group.component.name} are valid`
            : `Microcompetencies in ${group.component.name} total ${group.totalWeightage}%, expected 100%`
        };
      });

      const allValid = validationResults.every(r => r.isValid);

      return {
        success: true,
        isValid: allValid,
        results: validationResults,
        message: allValid 
          ? 'All microcompetency weightages are valid'
          : 'Some microcompetency weightages are invalid'
      };
    } catch (error) {
      console.error('Error validating microcompetency weightages:', error);
      return {
        success: false,
        error: 'VALIDATION_FAILED',
        message: 'Failed to validate microcompetency weightages'
      };
    }
  }

  /**
   * Comprehensive validation of all weightages
   * @returns {Promise<Object>} Complete validation result
   */
  async validateAllWeightages() {
    try {
      console.log('🔍 Starting comprehensive weightage validation...');

      const [
        quadrantValidation,
        subCategoryValidation,
        componentValidation,
        microcompetencyValidation
      ] = await Promise.all([
        this.validateQuadrantWeightages(),
        this.validateSubCategoryWeightages(),
        this.validateComponentWeightages(),
        this.validateMicrocompetencyWeightages()
      ]);

      const allValid = 
        quadrantValidation.isValid &&
        subCategoryValidation.isValid &&
        componentValidation.isValid &&
        microcompetencyValidation.isValid;

      const issues = [];
      if (!quadrantValidation.isValid) issues.push('Quadrant weightages');
      if (!subCategoryValidation.isValid) issues.push('Sub-category weightages');
      if (!componentValidation.isValid) issues.push('Component weightages');
      if (!microcompetencyValidation.isValid) issues.push('Microcompetency weightages');

      console.log(`✅ Weightage validation complete. Valid: ${allValid}`);

      return {
        success: true,
        isValid: allValid,
        summary: {
          quadrants: quadrantValidation,
          subCategories: subCategoryValidation,
          components: componentValidation,
          microcompetencies: microcompetencyValidation
        },
        issues,
        message: allValid 
          ? 'All weightages are valid across the system'
          : `Weightage issues found in: ${issues.join(', ')}`
      };
    } catch (error) {
      console.error('Error in comprehensive weightage validation:', error);
      return {
        success: false,
        error: 'VALIDATION_FAILED',
        message: 'Failed to perform comprehensive weightage validation'
      };
    }
  }

  /**
   * Get weightage usage for a specific level
   * @param {string} type - 'quadrant', 'sub_category', 'component'
   * @param {string} parentId - Parent ID
   * @returns {Promise<Object>} Weightage usage information
   */
  async getWeightageUsage(type, parentId) {
    try {
      let table, parentColumn, selectFields;

      switch (type) {
        case 'sub_category':
          table = 'sub_categories';
          parentColumn = 'quadrant_id';
          selectFields = 'id, name, weightage, is_active';
          break;
        case 'component':
          table = 'components';
          parentColumn = 'sub_category_id';
          selectFields = 'id, name, weightage, is_active';
          break;
        case 'microcompetency':
          table = 'microcompetencies';
          parentColumn = 'component_id';
          selectFields = 'id, name, weightage, is_active';
          break;
        default:
          throw new Error(`Invalid type: ${type}`);
      }

      const result = await query(
        supabase
          .from(table)
          .select(selectFields)
          .eq(parentColumn, parentId)
          .eq('is_active', true)
      );

      const items = result.rows || [];
      const totalUsed = items.reduce((sum, item) => sum + parseFloat(item.weightage), 0);
      const remaining = 100 - totalUsed;

      return {
        success: true,
        totalUsed,
        remaining,
        items,
        isValid: Math.abs(remaining) <= this.tolerance,
        message: `${totalUsed}% used, ${remaining}% remaining`
      };
    } catch (error) {
      console.error('Error getting weightage usage:', error);
      return {
        success: false,
        error: 'USAGE_CALCULATION_FAILED',
        message: 'Failed to calculate weightage usage'
      };
    }
  }
}

module.exports = new WeightageValidationService();
