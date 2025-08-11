import { toast } from 'sonner';

// Standard error types
export interface ApiError {
  message: string;
  code?: string;
  field?: string;
  details?: any;
}

export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

export interface FormErrors {
  [key: string]: string;
}

// Error handling utility class
export class ErrorHandler {
  // Handle API errors and show appropriate toast messages
  static handleApiError(error: any, context?: string): ApiError {
    console.error(`API Error${context ? ` in ${context}` : ''}:`, error);

    let apiError: ApiError = {
      message: 'An unexpected error occurred. Please try again.',
    };

    if (error?.response?.data) {
      // Axios error with response
      const responseData = error.response.data;
      apiError = {
        message: responseData.message || responseData.error || 'Server error occurred',
        code: responseData.code,
        details: responseData.details,
      };
    } else if (error?.message) {
      // Standard Error object
      apiError.message = error.message;
    } else if (typeof error === 'string') {
      // String error
      apiError.message = error;
    }

    // Show toast notification
    toast.error(apiError.message);

    return apiError;
  }

  // Handle validation errors and convert to form errors
  static handleValidationErrors(errors: ValidationError[]): FormErrors {
    const formErrors: FormErrors = {};
    
    errors.forEach((error) => {
      formErrors[error.field] = error.message;
    });

    return formErrors;
  }

  // Handle form submission errors
  static handleFormError(error: any, context?: string): FormErrors {
    const apiError = this.handleApiError(error, context);
    
    // If the error contains validation details, extract them
    if (apiError.details?.validationErrors) {
      return this.handleValidationErrors(apiError.details.validationErrors);
    }

    // If it's a field-specific error, return it as form error
    if (apiError.field) {
      return { [apiError.field]: apiError.message };
    }

    // Generic form error
    return { _general: apiError.message };
  }

  // Handle network errors
  static handleNetworkError(error: any): void {
    console.error('Network Error:', error);
    
    if (!navigator.onLine) {
      toast.error('No internet connection. Please check your network and try again.');
    } else if (error?.code === 'NETWORK_ERROR' || error?.message?.includes('Network Error')) {
      toast.error('Network error. Please check your connection and try again.');
    } else {
      toast.error('Unable to connect to the server. Please try again later.');
    }
  }

  // Handle authentication errors
  static handleAuthError(error: any): void {
    console.error('Authentication Error:', error);
    
    if (error?.response?.status === 401) {
      toast.error('Your session has expired. Please log in again.');
      // Redirect to login page
      window.location.href = '/login';
    } else if (error?.response?.status === 403) {
      toast.error('You do not have permission to perform this action.');
    } else {
      toast.error('Authentication error. Please log in again.');
    }
  }

  // Handle file upload errors
  static handleFileUploadError(error: any, fileName?: string): void {
    console.error('File Upload Error:', error);
    
    const fileContext = fileName ? ` for file "${fileName}"` : '';
    
    if (error?.response?.status === 413) {
      toast.error(`File is too large${fileContext}. Please choose a smaller file.`);
    } else if (error?.response?.status === 415) {
      toast.error(`File type not supported${fileContext}. Please choose a different file.`);
    } else if (error?.message?.includes('file')) {
      toast.error(error.message);
    } else {
      toast.error(`Failed to upload file${fileContext}. Please try again.`);
    }
  }

  // Clear form errors
  static clearFormErrors(): FormErrors {
    return {};
  }

  // Clear specific form field error
  static clearFieldError(formErrors: FormErrors, fieldName: string): FormErrors {
    const newErrors = { ...formErrors };
    delete newErrors[fieldName];
    return newErrors;
  }

  // Validate required fields
  static validateRequiredFields(data: Record<string, any>, requiredFields: string[]): FormErrors {
    const errors: FormErrors = {};
    
    requiredFields.forEach((field) => {
      if (!data[field] || (typeof data[field] === 'string' && data[field].trim() === '')) {
        errors[field] = `${field.charAt(0).toUpperCase() + field.slice(1)} is required`;
      }
    });

    return errors;
  }

  // Validate email format
  static validateEmail(email: string): string | null {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return 'Please enter a valid email address';
    }
    return null;
  }

  // Validate phone number format
  static validatePhone(phone: string): string | null {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    if (!phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''))) {
      return 'Please enter a valid phone number';
    }
    return null;
  }

  // Validate password strength
  static validatePassword(password: string): string | null {
    if (password.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
    }
    return null;
  }

  // Show success message
  static showSuccess(message: string): void {
    toast.success(message);
  }

  // Show warning message
  static showWarning(message: string): void {
    toast.warning(message);
  }

  // Show info message
  static showInfo(message: string): void {
    toast.info(message);
  }
}

// Export convenience functions
export const {
  handleApiError,
  handleValidationErrors,
  handleFormError,
  handleNetworkError,
  handleAuthError,
  handleFileUploadError,
  clearFormErrors,
  clearFieldError,
  validateRequiredFields,
  validateEmail,
  validatePhone,
  validatePassword,
  showSuccess,
  showWarning,
  showInfo,
} = ErrorHandler;

// Default export
export default ErrorHandler;
