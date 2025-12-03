import { trackError, trackEvent } from '@/lib/api/sentry';

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
  code?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

export interface ValidationRule {
  field: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | null;
  message?: string;
}

class ValidationTracker {
  /**
   * Track validation errors
   */
  trackValidationErrors(errors: ValidationError[], context?: Record<string, any>) {
    errors.forEach(error => {
      trackError(`Validation Error: ${error.field}`, error.message, {
        field: error.field,
        value: error.value,
        code: error.code,
        ...context,
      });
    });
  }

  /**
   * Track form validation results
   */
  trackFormValidation(formName: string, result: ValidationResult, context?: Record<string, any>) {
    trackEvent('form_validation', {
      formName,
      isValid: result.isValid,
      errorCount: result.errors.length,
      warningCount: result.warnings.length,
      errors: result.errors.map(e => ({ field: e.field, message: e.message })),
      ...context,
    });

    if (!result.isValid && result.errors.length > 0) {
      this.trackValidationErrors(result.errors, { formName, ...context });
    }
  }

  /**
   * Validate a field against rules
   */
  validateField(value: any, rules: ValidationRule[]): ValidationError[] {
    const errors: ValidationError[] = [];

    rules.forEach(rule => {
      // Check required
      if (rule.required && (value === undefined || value === null || value === '')) {
        errors.push({
          field: rule.field,
          message: rule.message || `${rule.field} is required`,
          value,
          code: 'REQUIRED',
        });
        return;
      }

      // Skip other validations if field is empty and not required
      if (value === undefined || value === null || value === '') {
        return;
      }

      // Check min length
      if (rule.minLength && typeof value === 'string' && value.length < rule.minLength) {
        errors.push({
          field: rule.field,
          message: rule.message || `${rule.field} must be at least ${rule.minLength} characters`,
          value,
          code: 'MIN_LENGTH',
        });
      }

      // Check max length
      if (rule.maxLength && typeof value === 'string' && value.length > rule.maxLength) {
        errors.push({
          field: rule.field,
          message: rule.message || `${rule.field} must be no more than ${rule.maxLength} characters`,
          value,
          code: 'MAX_LENGTH',
        });
      }

      // Check pattern
      if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
        errors.push({
          field: rule.field,
          message: rule.message || `${rule.field} format is invalid`,
          value,
          code: 'PATTERN',
        });
      }

      // Check custom validation
      if (rule.custom) {
        const customError = rule.custom(value);
        if (customError) {
          errors.push({
            field: rule.field,
            message: customError,
            value,
            code: 'CUSTOM',
          });
        }
      }
    });

    return errors;
  }

  /**
   * Validate form data against field rules
   */
  validateForm(data: Record<string, any>, fieldRules: Record<string, ValidationRule[]>): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    Object.entries(fieldRules).forEach(([field, rules]) => {
      const fieldErrors = this.validateField(data[field], rules);
      errors.push(...fieldErrors);
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Track successful validation
   */
  trackSuccessfulValidation(formName: string, context?: Record<string, any>) {
    trackEvent('validation_success', {
      formName,
      ...context,
    });
  }
}

export const validationTracker = new ValidationTracker();

// Common validation rules
export const commonRules = {
  email: {
    field: 'email',
    required: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'Please enter a valid email address',
  },
  password: {
    field: 'password',
    required: true,
    minLength: 8,
    message: 'Password must be at least 8 characters long',
  },
  name: {
    field: 'name',
    required: true,
    minLength: 2,
    maxLength: 50,
    message: 'Name must be between 2 and 50 characters',
  },
  title: {
    field: 'title',
    required: true,
    minLength: 1,
    maxLength: 100,
    message: 'Title must be between 1 and 100 characters',
  },
  description: {
    field: 'description',
    maxLength: 1000,
    message: 'Description must be no more than 1000 characters',
  },
};

// Convenience functions
export const trackValidationErrors = (errors: ValidationError[], context?: Record<string, any>) => {
  validationTracker.trackValidationErrors(errors, context);
};

export const trackFormValidation = (formName: string, result: ValidationResult, context?: Record<string, any>) => {
  validationTracker.trackFormValidation(formName, result, context);
};

export const validateField = (value: any, rules: ValidationRule[]) => {
  return validationTracker.validateField(value, rules);
};

export const validateForm = (data: Record<string, any>, fieldRules: Record<string, ValidationRule[]>) => {
  return validationTracker.validateForm(data, fieldRules);
};

export const trackSuccessfulValidation = (formName: string, context?: Record<string, any>) => {
  validationTracker.trackSuccessfulValidation(formName, context);
};