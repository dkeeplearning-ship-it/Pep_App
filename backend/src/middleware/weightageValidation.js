/**
 * Weightage Validation Middleware
 * Provides comprehensive validation for weightage-related operations
 */

/**
 * Validate individual weightage value
 */
const validateWeightageValue = (weightage, fieldName = 'weightage') => {
  const errors = [];
  
  // Check if weightage is a number
  if (typeof weightage !== 'number' && !Number.isFinite(parseFloat(weightage))) {
    errors.push(`${fieldName} must be a valid number`);
    return errors;
  }
  
  const numWeightage = parseFloat(weightage);
  
  // Check range (0-100)
  if (numWeightage < 0) {
    errors.push(`${fieldName} cannot be negative (got ${numWeightage})`);
  }
  
  if (numWeightage > 100) {
    errors.push(`${fieldName} cannot exceed 100% (got ${numWeightage})`);
  }
  
  // Check decimal precision (max 2 decimal places)
  if (numWeightage % 0.01 !== 0) {
    errors.push(`${fieldName} can have at most 2 decimal places (got ${numWeightage})`);
  }
  
  return errors;
};

/**
 * Validate array of weightages sum to 100%
 */
const validateWeightageSum = (weightages, tolerance = 0.01, context = 'weightages') => {
  const errors = [];
  
  if (!Array.isArray(weightages) || weightages.length === 0) {
    errors.push(`${context} must be a non-empty array`);
    return errors;
  }
  
  const total = weightages.reduce((sum, w) => {
    const weightage = typeof w === 'object' ? w.weightage : w;
    return sum + parseFloat(weightage || 0);
  }, 0);
  
  if (Math.abs(total - 100) > tolerance) {
    errors.push(`${context} must sum to 100% (got ${total.toFixed(2)}%)`);
  }
  
  return errors;
};

/**
 * Validate quadrant weightages
 */
const validateQuadrantWeightages = (req, res, next) => {
  const { weightages } = req.body;
  const errors = [];
  
  if (!Array.isArray(weightages)) {
    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'weightages must be an array',
      timestamp: new Date().toISOString()
    });
  }
  
  // Validate individual weightages
  weightages.forEach((w, index) => {
    if (!w.quadrant_id) {
      errors.push(`weightages[${index}].quadrant_id is required`);
    }
    
    const weightageErrors = validateWeightageValue(w.weightage, `weightages[${index}].weightage`);
    errors.push(...weightageErrors);
    
    // Validate minimum_attendance if provided
    if (w.minimum_attendance !== undefined) {
      const attendanceErrors = validateWeightageValue(w.minimum_attendance, `weightages[${index}].minimum_attendance`);
      errors.push(...attendanceErrors);
    }
  });
  
  // Validate sum to 100%
  const sumErrors = validateWeightageSum(weightages, 0.01, 'Quadrant weightages');
  errors.push(...sumErrors);
  
  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'Weightage validation failed',
      details: errors,
      timestamp: new Date().toISOString()
    });
  }
  
  next();
};

/**
 * Validate subcategory weightages
 */
const validateSubcategoryWeightages = (req, res, next) => {
  const { subcategoryWeightages } = req.body;
  const errors = [];
  
  if (!Array.isArray(subcategoryWeightages)) {
    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'subcategoryWeightages must be an array',
      timestamp: new Date().toISOString()
    });
  }
  
  // Group by quadrant for validation
  const byQuadrant = {};
  
  subcategoryWeightages.forEach((w, index) => {
    if (!w.subcategory_id) {
      errors.push(`subcategoryWeightages[${index}].subcategory_id is required`);
    }
    
    const weightageErrors = validateWeightageValue(w.weightage, `subcategoryWeightages[${index}].weightage`);
    errors.push(...weightageErrors);
    
    // Group by quadrant (assuming we have quadrant info in the subcategory)
    if (w.sub_categories?.quadrant_id) {
      const quadrantId = w.sub_categories.quadrant_id;
      if (!byQuadrant[quadrantId]) {
        byQuadrant[quadrantId] = [];
      }
      byQuadrant[quadrantId].push(w);
    }
  });
  
  // Validate sum to 100% per quadrant
  Object.entries(byQuadrant).forEach(([quadrantId, quadrantWeightages]) => {
    const sumErrors = validateWeightageSum(
      quadrantWeightages, 
      0.01, 
      `Subcategory weightages for quadrant ${quadrantId}`
    );
    errors.push(...sumErrors);
  });
  
  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'Subcategory weightage validation failed',
      details: errors,
      timestamp: new Date().toISOString()
    });
  }
  
  next();
};

/**
 * Validate component weightages
 */
const validateComponentWeightages = (req, res, next) => {
  const { componentWeightages } = req.body;
  const errors = [];
  
  if (!Array.isArray(componentWeightages)) {
    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'componentWeightages must be an array',
      timestamp: new Date().toISOString()
    });
  }
  
  // Group by subcategory for validation
  const bySubcategory = {};
  
  componentWeightages.forEach((w, index) => {
    if (!w.component_id) {
      errors.push(`componentWeightages[${index}].component_id is required`);
    }
    
    const weightageErrors = validateWeightageValue(w.weightage, `componentWeightages[${index}].weightage`);
    errors.push(...weightageErrors);
    
    // Group by subcategory
    if (w.components?.sub_category_id) {
      const subcategoryId = w.components.sub_category_id;
      if (!bySubcategory[subcategoryId]) {
        bySubcategory[subcategoryId] = [];
      }
      bySubcategory[subcategoryId].push(w);
    }
  });
  
  // Validate sum to 100% per subcategory
  Object.entries(bySubcategory).forEach(([subcategoryId, subcategoryWeightages]) => {
    const sumErrors = validateWeightageSum(
      subcategoryWeightages, 
      0.01, 
      `Component weightages for subcategory ${subcategoryId}`
    );
    errors.push(...sumErrors);
  });
  
  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'Component weightage validation failed',
      details: errors,
      timestamp: new Date().toISOString()
    });
  }
  
  next();
};

/**
 * Validate microcompetency weightages
 */
const validateMicrocompetencyWeightages = (req, res, next) => {
  const { microcompetencyWeightages } = req.body;
  const errors = [];
  
  if (!Array.isArray(microcompetencyWeightages)) {
    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'microcompetencyWeightages must be an array',
      timestamp: new Date().toISOString()
    });
  }
  
  // Group by component for validation
  const byComponent = {};
  
  microcompetencyWeightages.forEach((w, index) => {
    if (!w.microcompetency_id) {
      errors.push(`microcompetencyWeightages[${index}].microcompetency_id is required`);
    }
    
    const weightageErrors = validateWeightageValue(w.weightage, `microcompetencyWeightages[${index}].weightage`);
    errors.push(...weightageErrors);
    
    // Group by component
    if (w.microcompetencies?.component_id) {
      const componentId = w.microcompetencies.component_id;
      if (!byComponent[componentId]) {
        byComponent[componentId] = [];
      }
      byComponent[componentId].push(w);
    }
  });
  
  // Validate sum to 100% per component
  Object.entries(byComponent).forEach(([componentId, componentWeightages]) => {
    const sumErrors = validateWeightageSum(
      componentWeightages, 
      0.01, 
      `Microcompetency weightages for component ${componentId}`
    );
    errors.push(...sumErrors);
  });
  
  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'Microcompetency weightage validation failed',
      details: errors,
      timestamp: new Date().toISOString()
    });
  }
  
  next();
};

/**
 * Generic input validation middleware
 */
const validateInput = (schema) => {
  return (req, res, next) => {
    const errors = [];

    // Validate required fields
    if (schema.required) {
      schema.required.forEach(field => {
        const value = req.body[field];
        if (value === undefined || value === null || value === '') {
          errors.push(`${field} is required`);
        }
      });
    }

    // Validate field types and constraints
    if (schema.fields) {
      Object.entries(schema.fields).forEach(([field, rules]) => {
        const value = req.body[field];

        if (value !== undefined && value !== null) {
          // Type validation
          if (rules.type === 'string' && typeof value !== 'string') {
            errors.push(`${field} must be a string`);
          } else if (rules.type === 'number' && typeof value !== 'number') {
            errors.push(`${field} must be a number`);
          } else if (rules.type === 'boolean' && typeof value !== 'boolean') {
            errors.push(`${field} must be a boolean`);
          } else if (rules.type === 'array' && !Array.isArray(value)) {
            errors.push(`${field} must be an array`);
          }

          // String length validation
          if (rules.type === 'string' && rules.maxLength && value.length > rules.maxLength) {
            errors.push(`${field} must be at most ${rules.maxLength} characters`);
          }
          if (rules.type === 'string' && rules.minLength && value.length < rules.minLength) {
            errors.push(`${field} must be at least ${rules.minLength} characters`);
          }

          // Number range validation
          if (rules.type === 'number') {
            if (rules.min !== undefined && value < rules.min) {
              errors.push(`${field} must be at least ${rules.min}`);
            }
            if (rules.max !== undefined && value > rules.max) {
              errors.push(`${field} must be at most ${rules.max}`);
            }
          }

          // Custom validation
          if (rules.validate && typeof rules.validate === 'function') {
            const customError = rules.validate(value);
            if (customError) {
              errors.push(`${field}: ${customError}`);
            }
          }
        }
      });
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Input validation failed',
        details: errors,
        timestamp: new Date().toISOString()
      });
    }

    next();
  };
};

/**
 * Validate UUID format
 */
const validateUUID = (value) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value) ? null : 'must be a valid UUID';
};

/**
 * Validate email format
 */
const validateEmail = (value) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value) ? null : 'must be a valid email address';
};

/**
 * Validate score range (0-100)
 */
const validateScore = (value) => {
  if (typeof value !== 'number') return 'must be a number';
  if (value < 0) return 'cannot be negative';
  if (value > 100) return 'cannot exceed 100';
  if (value % 0.01 !== 0) return 'can have at most 2 decimal places';
  return null;
};

/**
 * Common validation schemas
 */
const validationSchemas = {
  createStudent: {
    required: ['registration_no', 'name', 'course', 'user_id'],
    fields: {
      registration_no: { type: 'string', maxLength: 20 },
      name: { type: 'string', maxLength: 255, minLength: 2 },
      course: { type: 'string', maxLength: 100 },
      user_id: { type: 'string', validate: validateUUID },
      batch_id: { type: 'string', validate: validateUUID },
      section_id: { type: 'string', validate: validateUUID },
      house_id: { type: 'string', validate: validateUUID },
      phone: { type: 'string', maxLength: 20 },
      gender: { type: 'string', validate: (v) => ['Male', 'Female', 'Other'].includes(v) ? null : 'must be Male, Female, or Other' }
    }
  },

  createQuadrant: {
    required: ['name', 'weightage'],
    fields: {
      name: { type: 'string', maxLength: 100, minLength: 2 },
      description: { type: 'string', maxLength: 500 },
      weightage: { type: 'number', validate: validateScore },
      minimum_attendance: { type: 'number', min: 0, max: 100 },
      display_order: { type: 'number', min: 0 }
    }
  },

  createComponent: {
    required: ['sub_category_id', 'name', 'weightage'],
    fields: {
      sub_category_id: { type: 'string', validate: validateUUID },
      name: { type: 'string', maxLength: 255, minLength: 2 },
      description: { type: 'string', maxLength: 500 },
      weightage: { type: 'number', validate: validateScore },
      max_score: { type: 'number', min: 0 },
      minimum_score: { type: 'number', min: 0 },
      display_order: { type: 'number', min: 0 }
    }
  },

  createMicrocompetency: {
    required: ['component_id', 'name', 'weightage'],
    fields: {
      component_id: { type: 'string', validate: validateUUID },
      name: { type: 'string', maxLength: 255, minLength: 2 },
      description: { type: 'string', maxLength: 500 },
      weightage: { type: 'number', validate: validateScore },
      max_score: { type: 'number', min: 0 },
      display_order: { type: 'number', min: 0 }
    }
  },

  scoreStudent: {
    required: ['obtained_score'],
    fields: {
      obtained_score: { type: 'number', validate: validateScore },
      feedback: { type: 'string', maxLength: 1000 },
      status: { type: 'string', validate: (v) => ['Draft', 'Submitted', 'Reviewed'].includes(v) ? null : 'must be Draft, Submitted, or Reviewed' }
    }
  }
};

module.exports = {
  validateWeightageValue,
  validateWeightageSum,
  validateQuadrantWeightages,
  validateSubcategoryWeightages,
  validateComponentWeightages,
  validateMicrocompetencyWeightages,
  validateInput,
  validateUUID,
  validateEmail,
  validateScore,
  validationSchemas
};
