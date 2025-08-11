import { FormErrors } from './errorHandling';

// Validation rule types
export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | null;
  email?: boolean;
  phone?: boolean;
  password?: boolean;
  numeric?: boolean;
  min?: number;
  max?: number;
}

export interface ValidationSchema {
  [fieldName: string]: ValidationRule;
}

// Form validation utility class
export class FormValidator {
  // Validate a single field
  static validateField(value: any, rule: ValidationRule, fieldName: string): string | null {
    // Required validation
    if (rule.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
      return `${this.formatFieldName(fieldName)} is required`;
    }

    // Skip other validations if field is empty and not required
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      return null;
    }

    const stringValue = String(value).trim();

    // Length validations
    if (rule.minLength && stringValue.length < rule.minLength) {
      return `${this.formatFieldName(fieldName)} must be at least ${rule.minLength} characters long`;
    }

    if (rule.maxLength && stringValue.length > rule.maxLength) {
      return `${this.formatFieldName(fieldName)} must not exceed ${rule.maxLength} characters`;
    }

    // Pattern validation
    if (rule.pattern && !rule.pattern.test(stringValue)) {
      return `${this.formatFieldName(fieldName)} format is invalid`;
    }

    // Email validation
    if (rule.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(stringValue)) {
        return 'Please enter a valid email address';
      }
    }

    // Phone validation
    if (rule.phone) {
      const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
      const cleanPhone = stringValue.replace(/[\s\-\(\)]/g, '');
      if (!phoneRegex.test(cleanPhone)) {
        return 'Please enter a valid phone number';
      }
    }

    // Password validation
    if (rule.password) {
      if (stringValue.length < 8) {
        return 'Password must be at least 8 characters long';
      }
      if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(stringValue)) {
        return 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
      }
    }

    // Numeric validation
    if (rule.numeric) {
      const numValue = Number(value);
      if (isNaN(numValue)) {
        return `${this.formatFieldName(fieldName)} must be a valid number`;
      }

      if (rule.min !== undefined && numValue < rule.min) {
        return `${this.formatFieldName(fieldName)} must be at least ${rule.min}`;
      }

      if (rule.max !== undefined && numValue > rule.max) {
        return `${this.formatFieldName(fieldName)} must not exceed ${rule.max}`;
      }
    }

    // Custom validation
    if (rule.custom) {
      return rule.custom(value);
    }

    return null;
  }

  // Validate entire form
  static validateForm(data: Record<string, any>, schema: ValidationSchema): FormErrors {
    const errors: FormErrors = {};

    Object.keys(schema).forEach((fieldName) => {
      const rule = schema[fieldName];
      const value = data[fieldName];
      const error = this.validateField(value, rule, fieldName);
      
      if (error) {
        errors[fieldName] = error;
      }
    });

    return errors;
  }

  // Format field name for display
  private static formatFieldName(fieldName: string): string {
    return fieldName
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  // Validate student form
  static validateStudentForm(data: any): FormErrors {
    const schema: ValidationSchema = {
      firstName: { required: true, minLength: 2, maxLength: 50 },
      lastName: { required: true, minLength: 2, maxLength: 50 },
      email: { required: true, email: true },
      password: { required: true, password: true },
      registrationNo: { required: true, minLength: 3, maxLength: 20 },
      course: { required: true, minLength: 2, maxLength: 100 },
      batchId: { required: true },
      sectionId: { required: true },
      gender: { required: true },
      phone: { phone: true }, // Optional but validated if provided
    };

    return this.validateForm(data, schema);
  }

  // Validate teacher form
  static validateTeacherForm(data: any): FormErrors {
    const schema: ValidationSchema = {
      firstName: { required: true, minLength: 2, maxLength: 50 },
      lastName: { required: true, minLength: 2, maxLength: 50 },
      email: { required: true, email: true },
      password: { required: true, password: true },
      employeeId: { required: true, minLength: 3, maxLength: 20 },
      department: { required: true, minLength: 2, maxLength: 100 },
      specialization: { required: true, minLength: 2, maxLength: 100 },
      qualification: { required: true, minLength: 2, maxLength: 100 },
      experience: { required: true, numeric: true, min: 0, max: 50 },
      phone: { phone: true }, // Optional but validated if provided
    };

    return this.validateForm(data, schema);
  }

  // Validate intervention form
  static validateInterventionForm(data: any): FormErrors {
    const schema: ValidationSchema = {
      name: { required: true, minLength: 3, maxLength: 100 },
      description: { required: true, minLength: 10, maxLength: 500 },
      startDate: { required: true },
      endDate: { required: true },
      maxStudents: { required: true, numeric: true, min: 1, max: 1000 },
    };

    const errors = this.validateForm(data, schema);

    // Custom validation for date range
    if (data.startDate && data.endDate) {
      const startDate = new Date(data.startDate);
      const endDate = new Date(data.endDate);
      
      if (startDate >= endDate) {
        errors.endDate = 'End date must be after start date';
      }
      
      if (startDate < new Date()) {
        errors.startDate = 'Start date cannot be in the past';
      }
    }

    return errors;
  }

  // Validate term form
  static validateTermForm(data: any): FormErrors {
    const schema: ValidationSchema = {
      name: { required: true, minLength: 3, maxLength: 100 },
      description: { maxLength: 500 },
      startDate: { required: true },
      endDate: { required: true },
      academicYear: { required: true, minLength: 4, maxLength: 10 },
    };

    const errors = this.validateForm(data, schema);

    // Custom validation for date range
    if (data.startDate && data.endDate) {
      const startDate = new Date(data.startDate);
      const endDate = new Date(data.endDate);
      
      if (startDate >= endDate) {
        errors.endDate = 'End date must be after start date';
      }
    }

    return errors;
  }

  // Validate score input
  static validateScoreInput(data: any): FormErrors {
    const schema: ValidationSchema = {
      obtainedScore: { required: true, numeric: true, min: 0 },
      maxScore: { required: true, numeric: true, min: 1 },
      assessmentDate: { required: true },
      notes: { maxLength: 500 },
    };

    const errors = this.validateForm(data, schema);

    // Custom validation for score range
    if (data.obtainedScore && data.maxScore) {
      const obtained = Number(data.obtainedScore);
      const max = Number(data.maxScore);
      
      if (obtained > max) {
        errors.obtainedScore = 'Obtained score cannot exceed maximum score';
      }
    }

    return errors;
  }

  // Validate file upload
  static validateFileUpload(file: File, allowedTypes: string[], maxSize: number): string | null {
    if (!file) {
      return 'Please select a file';
    }

    if (!allowedTypes.includes(file.type)) {
      return `File type not supported. Allowed types: ${allowedTypes.join(', ')}`;
    }

    if (file.size > maxSize) {
      const maxSizeMB = Math.round(maxSize / (1024 * 1024));
      return `File size too large. Maximum size: ${maxSizeMB}MB`;
    }

    return null;
  }

  // Validate bulk operation selection
  static validateBulkSelection(selectedItems: string[], operation: string): string | null {
    if (selectedItems.length === 0) {
      return `Please select at least one item for ${operation}`;
    }

    if (selectedItems.length > 100) {
      return `Too many items selected. Maximum 100 items allowed for ${operation}`;
    }

    return null;
  }
}

// Export convenience functions
export const {
  validateField,
  validateForm,
  validateStudentForm,
  validateTeacherForm,
  validateInterventionForm,
  validateTermForm,
  validateScoreInput,
  validateFileUpload,
  validateBulkSelection,
} = FormValidator;

// Default export
export default FormValidator;
