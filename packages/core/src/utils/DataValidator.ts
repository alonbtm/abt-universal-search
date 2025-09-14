/**
 * Data Validator - Comprehensive validation system with fallbacks
 * @description Provides data validation, type checking, and fallback value assignment
 */

import type { ValidationRule, ValidationContext } from '../types/Results';

/**
 * Validation severity levels
 */
export type ValidationSeverity = 'error' | 'warning' | 'info';

/**
 * Validation result for a single field
 */
export interface FieldValidationResult {
  /** Field name that was validated */
  field: string;
  /** Whether validation passed */
  valid: boolean;
  /** Validation error message */
  message?: string;
  /** Severity of validation issue */
  severity: ValidationSeverity;
  /** Applied fallback value */
  fallbackValue?: unknown;
  /** Whether fallback was used */
  usedFallback: boolean;
  /** Original value before validation */
  originalValue?: unknown;
  /** Final value after validation/fallback */
  finalValue: unknown;
}

/**
 * Complete validation result for an object
 */
export interface ObjectValidationResult {
  /** Overall validation success */
  valid: boolean;
  /** Individual field results */
  fieldResults: FieldValidationResult[];
  /** Count of errors by severity */
  errorCount: Record<ValidationSeverity, number>;
  /** Validated object with fallback values applied */
  validatedObject: Record<string, unknown>;
  /** Performance metrics */
  validationTime: number;
}

/**
 * Built-in validation functions
 */
export class ValidationFunctions {
  /**
   * Validate required field presence
   */
  static required(value: unknown, context: ValidationContext): { valid: boolean; message?: string } {
    const valid = value != null && value !== '' && value !== undefined;
    return {
      valid,
      message: valid ? undefined : `Field '${context.fieldName}' is required`
    };
  }

  /**
   * Validate string type and constraints
   */
  static string(
    minLength?: number, 
    maxLength?: number
  ): (value: unknown, context: ValidationContext) => { valid: boolean; message?: string } {
    return (value: unknown, context: ValidationContext) => {
      if (value == null) return { valid: true };
      
      if (typeof value !== 'string') {
        return {
          valid: false,
          message: `Field '${context.fieldName}' must be a string`
        };
      }

      if (minLength !== undefined && value.length < minLength) {
        return {
          valid: false,
          message: `Field '${context.fieldName}' must be at least ${minLength} characters`
        };
      }

      if (maxLength !== undefined && value.length > maxLength) {
        return {
          valid: false,
          message: `Field '${context.fieldName}' must be at most ${maxLength} characters`
        };
      }

      return { valid: true };
    };
  }

  /**
   * Validate number type and range
   */
  static number(
    min?: number, 
    max?: number
  ): (value: unknown, context: ValidationContext) => { valid: boolean; message?: string } {
    return (value: unknown, context: ValidationContext) => {
      if (value == null) return { valid: true };
      
      const num = Number(value);
      if (isNaN(num)) {
        return {
          valid: false,
          message: `Field '${context.fieldName}' must be a valid number`
        };
      }

      if (min !== undefined && num < min) {
        return {
          valid: false,
          message: `Field '${context.fieldName}' must be at least ${min}`
        };
      }

      if (max !== undefined && num > max) {
        return {
          valid: false,
          message: `Field '${context.fieldName}' must be at most ${max}`
        };
      }

      return { valid: true };
    };
  }

  /**
   * Validate email format
   */
  static email(value: unknown, context: ValidationContext): { valid: boolean; message?: string } {
    if (value == null) return { valid: true };
    
    if (typeof value !== 'string') {
      return {
        valid: false,
        message: `Field '${context.fieldName}' must be a string for email validation`
      };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const valid = emailRegex.test(value);
    
    return {
      valid,
      message: valid ? undefined : `Field '${context.fieldName}' must be a valid email address`
    };
  }

  /**
   * Validate URL format
   */
  static url(value: unknown, context: ValidationContext): { valid: boolean; message?: string } {
    if (value == null) return { valid: true };
    
    if (typeof value !== 'string') {
      return {
        valid: false,
        message: `Field '${context.fieldName}' must be a string for URL validation`
      };
    }

    try {
      new URL(value);
      return { valid: true };
    } catch {
      return {
        valid: false,
        message: `Field '${context.fieldName}' must be a valid URL`
      };
    }
  }

  /**
   * Validate array type and constraints
   */
  static array(
    minItems?: number, 
    maxItems?: number
  ): (value: unknown, context: ValidationContext) => { valid: boolean; message?: string } {
    return (value: unknown, context: ValidationContext) => {
      if (value == null) return { valid: true };
      
      if (!Array.isArray(value)) {
        return {
          valid: false,
          message: `Field '${context.fieldName}' must be an array`
        };
      }

      if (minItems !== undefined && value.length < minItems) {
        return {
          valid: false,
          message: `Field '${context.fieldName}' must have at least ${minItems} items`
        };
      }

      if (maxItems !== undefined && value.length > maxItems) {
        return {
          valid: false,
          message: `Field '${context.fieldName}' must have at most ${maxItems} items`
        };
      }

      return { valid: true };
    };
  }

  /**
   * Validate value is one of allowed options
   */
  static oneOf(allowedValues: unknown[]): (value: unknown, context: ValidationContext) => { valid: boolean; message?: string } {
    return (value: unknown, context: ValidationContext) => {
      if (value == null) return { valid: true };
      
      const valid = allowedValues.includes(value);
      return {
        valid,
        message: valid ? undefined : `Field '${context.fieldName}' must be one of: ${allowedValues.join(', ')}`
      };
    };
  }

  /**
   * Validate with custom regex pattern
   */
  static pattern(regex: RegExp, message?: string): (value: unknown, context: ValidationContext) => { valid: boolean; message?: string } {
    return (value: unknown, context: ValidationContext) => {
      if (value == null) return { valid: true };
      
      if (typeof value !== 'string') {
        return {
          valid: false,
          message: `Field '${context.fieldName}' must be a string for pattern validation`
        };
      }

      const valid = regex.test(value);
      return {
        valid,
        message: valid ? undefined : (message || `Field '${context.fieldName}' does not match required pattern`)
      };
    };
  }
}

/**
 * Advanced data validator with rule chaining and fallbacks
 */
export class AdvancedDataValidator {
  private validationRules = new Map<string, ValidationRule[]>();
  private fallbackValues = new Map<string, unknown>();
  private validationStats = {
    totalValidations: 0,
    successfulValidations: 0,
    fallbacksUsed: 0,
    totalValidationTime: 0
  };

  /**
   * Add validation rule for a field
   */
  public addRule(fieldName: string, rule: ValidationRule): void {
    if (!this.validationRules.has(fieldName)) {
      this.validationRules.set(fieldName, []);
    }
    this.validationRules.get(fieldName)!.push(rule);
  }

  /**
   * Add multiple validation rules for a field
   */
  public addRules(fieldName: string, rules: ValidationRule[]): void {
    if (!this.validationRules.has(fieldName)) {
      this.validationRules.set(fieldName, []);
    }
    this.validationRules.get(fieldName)!.push(...rules);
  }

  /**
   * Set fallback value for a field
   */
  public setFallback(fieldName: string, fallbackValue: unknown): void {
    this.fallbackValues.set(fieldName, fallbackValue);
  }

  /**
   * Validate a single field
   */
  public validateField(
    fieldName: string, 
    value: unknown, 
    context: Partial<ValidationContext> = {}
  ): FieldValidationResult {
    const rules = this.validationRules.get(fieldName) || [];
    const fallback = this.fallbackValues.get(fieldName);
    
    const validationContext: ValidationContext = {
      fieldName,
      objectIndex: context.objectIndex || 0,
      ...context
    };

    const result: FieldValidationResult = {
      field: fieldName,
      valid: true,
      severity: 'error',
      usedFallback: false,
      originalValue: value,
      finalValue: value
    };

    // Run validation rules
    for (const rule of rules) {
      const ruleResult = rule.validate(value, validationContext);
      
      if (!ruleResult.valid) {
        result.valid = false;
        result.message = ruleResult.message;
        result.severity = rule.severity || 'error';
        break;
      }
    }

    // Apply fallback if validation failed and fallback exists
    if (!result.valid && fallback !== undefined) {
      result.finalValue = fallback;
      result.fallbackValue = fallback;
      result.usedFallback = true;
      result.valid = true; // Consider it valid after applying fallback
      result.severity = 'warning'; // Downgrade severity since we recovered
    }

    return result;
  }

  /**
   * Validate entire object
   */
  public validateObject(
    obj: Record<string, unknown>,
    context: Partial<ValidationContext> = {}
  ): ObjectValidationResult {
    const startTime = performance.now();
    this.validationStats.totalValidations++;

    const fieldResults: FieldValidationResult[] = [];
    const validatedObject = { ...obj };
    const errorCount: Record<ValidationSeverity, number> = { error: 0, warning: 0, info: 0 };

    // Validate each field that has rules
    for (const fieldName of this.validationRules.keys()) {
      const fieldResult = this.validateField(fieldName, obj[fieldName], {
        ...context,
        fieldName
      });
      
      fieldResults.push(fieldResult);
      errorCount[fieldResult.severity]++;

      // Apply validated/fallback value to result object
      if (fieldResult.usedFallback) {
        validatedObject[fieldName] = fieldResult.fallbackValue;
        this.validationStats.fallbacksUsed++;
      }
    }

    const validationTime = performance.now() - startTime;
    this.validationStats.totalValidationTime += validationTime;

    const overallValid = fieldResults.every(r => r.valid) && errorCount.error === 0;
    
    if (overallValid) {
      this.validationStats.successfulValidations++;
    }

    return {
      valid: overallValid,
      fieldResults,
      errorCount,
      validatedObject,
      validationTime
    };
  }

  /**
   * Validate array of objects
   */
  public validateObjects(
    objects: Record<string, unknown>[],
    context: Partial<ValidationContext> = {}
  ): ObjectValidationResult[] {
    return objects.map((obj, index) => 
      this.validateObject(obj, { ...context, objectIndex: index })
    );
  }

  /**
   * Create validation schema fluent interface
   */
  public schema(): ValidationSchemaBuilder {
    return new ValidationSchemaBuilder(this);
  }

  /**
   * Clear all validation rules and fallbacks
   */
  public clear(): void {
    this.validationRules.clear();
    this.fallbackValues.clear();
  }

  /**
   * Get validation statistics
   */
  public getStats(): {
    totalValidations: number;
    successfulValidations: number;
    fallbacksUsed: number;
    averageValidationTime: number;
    successRate: number;
  } {
    const averageValidationTime = this.validationStats.totalValidations > 0
      ? this.validationStats.totalValidationTime / this.validationStats.totalValidations
      : 0;

    const successRate = this.validationStats.totalValidations > 0
      ? this.validationStats.successfulValidations / this.validationStats.totalValidations
      : 0;

    return {
      totalValidations: this.validationStats.totalValidations,
      successfulValidations: this.validationStats.successfulValidations,
      fallbacksUsed: this.validationStats.fallbacksUsed,
      averageValidationTime,
      successRate
    };
  }

  /**
   * Reset validation statistics
   */
  public resetStats(): void {
    this.validationStats = {
      totalValidations: 0,
      successfulValidations: 0,
      fallbacksUsed: 0,
      totalValidationTime: 0
    };
  }
}

/**
 * Fluent validation schema builder
 */
export class ValidationSchemaBuilder {
  constructor(private validator: AdvancedDataValidator) {}

  /**
   * Configure validation for a field
   */
  public field(name: string): FieldValidationBuilder {
    return new FieldValidationBuilder(this.validator, name);
  }

  /**
   * Build and return the validator
   */
  public build(): AdvancedDataValidator {
    return this.validator;
  }
}

/**
 * Fluent field validation builder
 */
export class FieldValidationBuilder {
  constructor(
    private validator: AdvancedDataValidator,
    private fieldName: string
  ) {}

  /**
   * Mark field as required
   */
  public required(message?: string): FieldValidationBuilder {
    const rule: ValidationRule = {
      validate: ValidationFunctions.required,
      severity: 'error',
      message
    };
    this.validator.addRule(this.fieldName, rule);
    return this;
  }

  /**
   * Add string validation
   */
  public string(minLength?: number, maxLength?: number): FieldValidationBuilder {
    const rule: ValidationRule = {
      validate: ValidationFunctions.string(minLength, maxLength),
      severity: 'error'
    };
    this.validator.addRule(this.fieldName, rule);
    return this;
  }

  /**
   * Add number validation
   */
  public number(min?: number, max?: number): FieldValidationBuilder {
    const rule: ValidationRule = {
      validate: ValidationFunctions.number(min, max),
      severity: 'error'
    };
    this.validator.addRule(this.fieldName, rule);
    return this;
  }

  /**
   * Add email validation
   */
  public email(): FieldValidationBuilder {
    const rule: ValidationRule = {
      validate: ValidationFunctions.email,
      severity: 'error'
    };
    this.validator.addRule(this.fieldName, rule);
    return this;
  }

  /**
   * Add URL validation
   */
  public url(): FieldValidationBuilder {
    const rule: ValidationRule = {
      validate: ValidationFunctions.url,
      severity: 'error'
    };
    this.validator.addRule(this.fieldName, rule);
    return this;
  }

  /**
   * Add array validation
   */
  public array(minItems?: number, maxItems?: number): FieldValidationBuilder {
    const rule: ValidationRule = {
      validate: ValidationFunctions.array(minItems, maxItems),
      severity: 'error'
    };
    this.validator.addRule(this.fieldName, rule);
    return this;
  }

  /**
   * Add enum validation
   */
  public oneOf(values: unknown[]): FieldValidationBuilder {
    const rule: ValidationRule = {
      validate: ValidationFunctions.oneOf(values),
      severity: 'error'
    };
    this.validator.addRule(this.fieldName, rule);
    return this;
  }

  /**
   * Add pattern validation
   */
  public pattern(regex: RegExp, message?: string): FieldValidationBuilder {
    const rule: ValidationRule = {
      validate: ValidationFunctions.pattern(regex, message),
      severity: 'error'
    };
    this.validator.addRule(this.fieldName, rule);
    return this;
  }

  /**
   * Add custom validation function
   */
  public custom(
    validate: (value: unknown, context: ValidationContext) => { valid: boolean; message?: string },
    severity: ValidationSeverity = 'error'
  ): FieldValidationBuilder {
    const rule: ValidationRule = {
      validate,
      severity
    };
    this.validator.addRule(this.fieldName, rule);
    return this;
  }

  /**
   * Set fallback value
   */
  public fallback(value: unknown): FieldValidationBuilder {
    this.validator.setFallback(this.fieldName, value);
    return this;
  }

  /**
   * Continue with another field
   */
  public field(name: string): FieldValidationBuilder {
    return new FieldValidationBuilder(this.validator, name);
  }

  /**
   * Build and return the validator
   */
  public build(): AdvancedDataValidator {
    return this.validator;
  }
}

/**
 * Utility functions for common validation patterns
 */
export const ValidationPatterns = {
  /** Phone number pattern */
  PHONE: /^[\+]?[1-9][\d]{0,15}$/,
  
  /** UUID pattern */
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  
  /** Credit card pattern */
  CREDIT_CARD: /^(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3[0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})$/,
  
  /** Postal code patterns by country */
  POSTAL_CODE_US: /^\d{5}(-\d{4})?$/,
  POSTAL_CODE_UK: /^[A-Z]{1,2}[0-9]{1,2}[A-Z]?\s?[0-9][A-Z]{2}$/i,
  POSTAL_CODE_CANADA: /^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/i
};

/**
 * Global data validator instance
 */
export const dataValidator = new AdvancedDataValidator();