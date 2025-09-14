/**
 * @fileoverview Runtime Type Validation System
 * @description Comprehensive runtime type checking and validation utilities
 * with detailed error messages and debugging support for TypeScript developers.
 * 
 * @example Basic Validation
 * ```typescript
 * import { validateSearchConfiguration, ValidationError } from '@alon/core';
 * 
 * try {
 *   const config = validateSearchConfiguration(userInput);
 *   // config is now type-safe
 * } catch (error) {
 *   if (error instanceof ValidationError) {
 *     console.error('Configuration error:', error.details);
 *   }
 * }
 * ```
 * 
 * @example Custom Validation
 * ```typescript
 * import { createValidator, ValidationType } from '@alon/core';
 * 
 * const validateCustomData = createValidator({
 *   name: ValidationType.STRING,
 *   age: ValidationType.NUMBER,
 *   email: ValidationType.EMAIL
 * });
 * 
 * const result = validateCustomData(userData);
 * if (!result.valid) {
 *   console.error('Validation errors:', result.errors);
 * }
 * ```
 */

import {
  SearchConfiguration,
  SearchResult,
  GenericSearchResult,
  SearchEventType,
  ValidationErrorType,
  DataSourceType
} from '../types';

/**
 * Custom validation error class with detailed error information
 */
export class ValidationError extends Error {
  public readonly type: ValidationErrorType;
  public readonly path: string;
  public readonly details: ValidationDetail[];
  public readonly code: string;

  /**
   * Creates a new validation error
   * @param message - Error message
   * @param type - Type of validation error
   * @param path - Property path where error occurred
   * @param details - Detailed validation information
   * @param code - Error code for programmatic handling
   */
  constructor(
    message: string,
    type: ValidationErrorType = ValidationErrorType.VALIDATION_FAILED,
    path: string = '',
    details: ValidationDetail[] = [],
    code: string = 'VALIDATION_ERROR'
  ) {
    super(message);
    this.name = 'ValidationError';
    this.type = type;
    this.path = path;
    this.details = details;
    this.code = code;

    // Maintain proper stack trace for V8 engines
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ValidationError);
    }
  }

  /**
   * Converts error to JSON for serialization
   * @returns Serializable error object
   */
  public toJSON(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      type: this.type,
      path: this.path,
      details: this.details,
      code: this.code,
      stack: this.stack
    };
  }

  /**
   * Creates a user-friendly error message
   * @returns Formatted error message
   */
  public toUserString(): string {
    let message = this.message;
    
    if (this.path) {
      message += ` at path: ${this.path}`;
    }

    if (this.details.length > 0) {
      message += '\nDetails:\n';
      message += this.details.map(detail => `  - ${detail.message}`).join('\n');
    }

    return message;
  }
}

/**
 * Detailed validation information
 */
export interface ValidationDetail {
  /** Property path */
  path: string;
  /** Expected type or format */
  expected: string;
  /** Actual value or type received */
  actual: string;
  /** Error message */
  message: string;
  /** Error code */
  code: string;
  /** Additional context */
  context?: Record<string, any>;
}

/**
 * Validation result interface
 */
export interface ValidationResult<T = any> {
  /** Whether validation passed */
  valid: boolean;
  /** Validated data (if valid) */
  data?: T;
  /** Validation errors */
  errors: ValidationDetail[];
  /** Non-critical warnings */
  warnings: ValidationDetail[];
  /** Performance metrics */
  metrics?: {
    duration: number;
    rulesEvaluated: number;
    memoryUsed?: number;
  };
}

/**
 * Validation rule interface
 */
export interface ValidationRule {
  /** Rule name */
  name: string;
  /** Validation function */
  validate: (value: any, path: string, context?: any) => ValidationDetail | null;
  /** Whether rule is required */
  required?: boolean;
  /** Rule description */
  description?: string;
  /** Rule category */
  category?: string;
}

/**
 * Validation schema for object validation
 */
export interface ValidationSchema {
  [key: string]: ValidationRule | ValidationSchema | ValidationType;
}

/**
 * Built-in validation types
 */
export enum ValidationType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  OBJECT = 'object',
  ARRAY = 'array',
  FUNCTION = 'function',
  DATE = 'date',
  EMAIL = 'email',
  URL = 'url',
  UUID = 'uuid',
  ENUM = 'enum',
  OPTIONAL = 'optional',
  ANY = 'any'
}

/**
 * Validation context for advanced validation scenarios
 */
export interface ValidationContext {
  /** Current validation path */
  path: string;
  /** Parent object being validated */
  parent?: any;
  /** Root object being validated */
  root?: any;
  /** Validation options */
  options: ValidationOptions;
  /** Custom context data */
  custom?: Record<string, any>;
}

/**
 * Validation options
 */
export interface ValidationOptions {
  /** Stop on first error */
  stopOnError?: boolean;
  /** Allow additional properties not in schema */
  allowAdditional?: boolean;
  /** Remove additional properties */
  removeAdditional?: boolean;
  /** Strict mode - no type coercion */
  strict?: boolean;
  /** Custom error messages */
  messages?: Record<string, string>;
  /** Debug mode - collect performance metrics */
  debug?: boolean;
}

/**
 * Type validator class for creating custom validators
 */
export class TypeValidator {
  private rules: Map<string, ValidationRule> = new Map();
  private schemas: Map<string, ValidationSchema> = new Map();

  constructor() {
    this.initializeBuiltInRules();
  }

  /**
   * Registers a custom validation rule
   * @param rule - Validation rule to register
   */
  public registerRule(rule: ValidationRule): void {
    this.rules.set(rule.name, rule);
  }

  /**
   * Registers a validation schema
   * @param name - Schema name
   * @param schema - Validation schema
   */
  public registerSchema(name: string, schema: ValidationSchema): void {
    this.schemas.set(name, schema);
  }

  /**
   * Validates a value against a rule or schema
   * @param value - Value to validate
   * @param ruleOrSchema - Rule name, schema name, or inline schema
   * @param options - Validation options
   * @returns Validation result
   */
  public validate<T = any>(
    value: any,
    ruleOrSchema: string | ValidationSchema | ValidationType,
    options: ValidationOptions = {}
  ): ValidationResult<T> {
    const startTime = performance.now();
    const context: ValidationContext = {
      path: '',
      root: value,
      options: { stopOnError: false, allowAdditional: true, strict: false, ...options }
    };

    const errors: ValidationDetail[] = [];
    const warnings: ValidationDetail[] = [];

    try {
      const validatedData = this.validateValue(value, ruleOrSchema, context, errors, warnings);
      const endTime = performance.now();

      return {
        valid: errors.length === 0,
        data: validatedData,
        errors,
        warnings,
        metrics: options.debug ? {
          duration: endTime - startTime,
          rulesEvaluated: this.rules.size,
          memoryUsed: this.getMemoryUsage()
        } : undefined
      };
    } catch (error) {
      const endTime = performance.now();
      
      return {
        valid: false,
        errors: [{
          path: context.path,
          expected: 'valid value',
          actual: typeof value,
          message: (error as Error).message,
          code: 'VALIDATION_EXCEPTION'
        }],
        warnings,
        metrics: options.debug ? {
          duration: endTime - startTime,
          rulesEvaluated: this.rules.size
        } : undefined
      };
    }
  }

  /**
   * Creates a validator function from a schema
   * @param schema - Validation schema
   * @param options - Default validation options
   * @returns Validator function
   */
  public createValidator<T = any>(
    schema: ValidationSchema | ValidationType,
    options: ValidationOptions = {}
  ): (value: any) => ValidationResult<T> {
    return (value: any) => this.validate<T>(value, schema, options);
  }

  /**
   * Validates a value against a specific rule or schema
   */
  private validateValue(
    value: any,
    ruleOrSchema: string | ValidationSchema | ValidationType,
    context: ValidationContext,
    errors: ValidationDetail[],
    warnings: ValidationDetail[]
  ): any {
    // Handle null/undefined
    if (value === null || value === undefined) {
      if (ruleOrSchema === ValidationType.OPTIONAL || ruleOrSchema === ValidationType.ANY) {
        return value;
      }
      
      errors.push({
        path: context.path,
        expected: 'non-null value',
        actual: value === null ? 'null' : 'undefined',
        message: `Expected non-null value at ${context.path || 'root'}`,
        code: 'NULL_VALUE'
      });
      return value;
    }

    // Handle built-in validation types
    if (typeof ruleOrSchema === 'string' && Object.values(ValidationType).includes(ruleOrSchema as ValidationType)) {
      return this.validateBuiltInType(value, ruleOrSchema as ValidationType, context, errors);
    }

    // Handle registered rule names
    if (typeof ruleOrSchema === 'string' && this.rules.has(ruleOrSchema)) {
      const rule = this.rules.get(ruleOrSchema)!;
      const error = rule.validate(value, context.path, context);
      if (error) {
        errors.push(error);
      }
      return value;
    }

    // Handle registered schema names
    if (typeof ruleOrSchema === 'string' && this.schemas.has(ruleOrSchema)) {
      const schema = this.schemas.get(ruleOrSchema)!;
      return this.validateObject(value, schema, context, errors, warnings);
    }

    // Handle inline schemas
    if (typeof ruleOrSchema === 'object' && ruleOrSchema !== null) {
      return this.validateObject(value, ruleOrSchema, context, errors, warnings);
    }

    // Unknown rule or schema
    errors.push({
      path: context.path,
      expected: 'valid rule or schema',
      actual: typeof ruleOrSchema,
      message: `Unknown validation rule or schema: ${ruleOrSchema}`,
      code: 'UNKNOWN_RULE'
    });

    return value;
  }

  /**
   * Validates built-in types
   */
  private validateBuiltInType(
    value: any,
    type: ValidationType,
    context: ValidationContext,
    errors: ValidationDetail[]
  ): any {
    switch (type) {
      case ValidationType.STRING:
        if (typeof value !== 'string') {
          errors.push(this.createTypeError(context.path, 'string', typeof value));
        }
        break;

      case ValidationType.NUMBER:
        if (typeof value !== 'number' || isNaN(value)) {
          errors.push(this.createTypeError(context.path, 'number', typeof value));
        }
        break;

      case ValidationType.BOOLEAN:
        if (typeof value !== 'boolean') {
          errors.push(this.createTypeError(context.path, 'boolean', typeof value));
        }
        break;

      case ValidationType.OBJECT:
        if (typeof value !== 'object' || Array.isArray(value)) {
          errors.push(this.createTypeError(context.path, 'object', Array.isArray(value) ? 'array' : typeof value));
        }
        break;

      case ValidationType.ARRAY:
        if (!Array.isArray(value)) {
          errors.push(this.createTypeError(context.path, 'array', typeof value));
        }
        break;

      case ValidationType.FUNCTION:
        if (typeof value !== 'function') {
          errors.push(this.createTypeError(context.path, 'function', typeof value));
        }
        break;

      case ValidationType.DATE:
        if (!(value instanceof Date) || isNaN(value.getTime())) {
          errors.push(this.createTypeError(context.path, 'Date', typeof value));
        }
        break;

      case ValidationType.EMAIL:
        if (typeof value !== 'string' || !this.isValidEmail(value)) {
          errors.push({
            path: context.path,
            expected: 'valid email address',
            actual: typeof value === 'string' ? value : typeof value,
            message: `Invalid email format at ${context.path || 'root'}`,
            code: 'INVALID_EMAIL'
          });
        }
        break;

      case ValidationType.URL:
        if (typeof value !== 'string' || !this.isValidURL(value)) {
          errors.push({
            path: context.path,
            expected: 'valid URL',
            actual: typeof value === 'string' ? value : typeof value,
            message: `Invalid URL format at ${context.path || 'root'}`,
            code: 'INVALID_URL'
          });
        }
        break;

      case ValidationType.UUID:
        if (typeof value !== 'string' || !this.isValidUUID(value)) {
          errors.push({
            path: context.path,
            expected: 'valid UUID',
            actual: typeof value === 'string' ? value : typeof value,
            message: `Invalid UUID format at ${context.path || 'root'}`,
            code: 'INVALID_UUID'
          });
        }
        break;

      case ValidationType.ANY:
        // Always valid
        break;

      case ValidationType.OPTIONAL:
        // Always valid (handled earlier for null/undefined)
        break;
    }

    return value;
  }

  /**
   * Validates object against schema
   */
  private validateObject(
    value: any,
    schema: ValidationSchema,
    context: ValidationContext,
    errors: ValidationDetail[],
    warnings: ValidationDetail[]
  ): any {
    if (typeof value !== 'object' || Array.isArray(value) || value === null) {
      errors.push(this.createTypeError(context.path, 'object', Array.isArray(value) ? 'array' : typeof value));
      return value;
    }

    const result: any = context.options.removeAdditional ? {} : { ...value };

    // Validate schema properties
    for (const [key, rule] of Object.entries(schema)) {
      const propertyPath = context.path ? `${context.path}.${key}` : key;
      const propertyContext: ValidationContext = { ...context, path: propertyPath, parent: value };

      if (key in value) {
        result[key] = this.validateValue(value[key], rule, propertyContext, errors, warnings);
      } else if (rule instanceof Object && 'required' in rule && rule.required) {
        errors.push({
          path: propertyPath,
          expected: 'required property',
          actual: 'missing',
          message: `Missing required property '${key}' at ${context.path || 'root'}`,
          code: 'MISSING_REQUIRED'
        });
      }
    }

    // Check for additional properties
    if (!context.options.allowAdditional) {
      for (const key of Object.keys(value)) {
        if (!(key in schema)) {
          warnings.push({
            path: `${context.path}.${key}`,
            expected: 'defined property',
            actual: 'additional property',
            message: `Additional property '${key}' not defined in schema`,
            code: 'ADDITIONAL_PROPERTY'
          });

          if (context.options.removeAdditional) {
            delete result[key];
          }
        }
      }
    }

    return result;
  }

  /**
   * Creates a type error detail
   */
  private createTypeError(path: string, expected: string, actual: string): ValidationDetail {
    return {
      path,
      expected,
      actual,
      message: `Expected ${expected} but received ${actual} at ${path || 'root'}`,
      code: 'TYPE_MISMATCH'
    };
  }

  /**
   * Validates email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validates URL format
   */
  private isValidURL(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validates UUID format
   */
  private isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * Gets current memory usage
   */
  private getMemoryUsage(): number {
    if (typeof window !== 'undefined' && 'performance' in window && 'memory' in performance) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return 0;
  }

  /**
   * Initializes built-in validation rules
   */
  private initializeBuiltInRules(): void {
    // Add built-in rules here if needed
  }
}

// Global validator instance
const globalValidator = new TypeValidator();

/**
 * Validates search configuration object
 * @param config - Configuration to validate
 * @param options - Validation options
 * @returns Validated configuration
 * @throws ValidationError if validation fails
 */
export function validateSearchConfiguration(
  config: any,
  options: ValidationOptions = { stopOnError: true }
): SearchConfiguration {
  const schema: ValidationSchema = {
    dataSources: ValidationType.ARRAY,
    ui: ValidationType.OPTIONAL,
    search: ValidationType.OPTIONAL,
    performance: ValidationType.OPTIONAL,
    accessibility: ValidationType.OPTIONAL,
    internationalization: ValidationType.OPTIONAL,
    theming: ValidationType.OPTIONAL
  };

  const result = globalValidator.validate<SearchConfiguration>(config, schema, options);
  
  if (!result.valid) {
    throw new ValidationError(
      'Invalid search configuration',
      ValidationErrorType.INVALID_CONFIG,
      '',
      result.errors,
      'CONFIG_VALIDATION_FAILED'
    );
  }

  return result.data!;
}

/**
 * Validates search result object
 * @param result - Result to validate
 * @param options - Validation options
 * @returns Validated result
 * @throws ValidationError if validation fails
 */
export function validateSearchResult<T = any>(
  result: any,
  options: ValidationOptions = {}
): GenericSearchResult<T> {
  const schema: ValidationSchema = {
    id: ValidationType.STRING,
    title: ValidationType.STRING,
    description: ValidationType.OPTIONAL,
    url: ValidationType.OPTIONAL,
    type: ValidationType.OPTIONAL,
    score: ValidationType.OPTIONAL,
    data: ValidationType.ANY,
    metadata: ValidationType.OPTIONAL
  };

  const validationResult = globalValidator.validate<GenericSearchResult<T>>(result, schema, options);
  
  if (!validationResult.valid) {
    throw new ValidationError(
      'Invalid search result',
      ValidationErrorType.INVALID_FORMAT,
      '',
      validationResult.errors,
      'RESULT_VALIDATION_FAILED'
    );
  }

  return validationResult.data!;
}

/**
 * Creates a custom validator function
 * @param schema - Validation schema
 * @param options - Default validation options
 * @returns Validator function
 */
export function createValidator<T = any>(
  schema: ValidationSchema,
  options: ValidationOptions = {}
) {
  return globalValidator.createValidator<T>(schema, options);
}

/**
 * Registers a custom validation rule
 * @param rule - Validation rule to register
 */
export function registerValidationRule(rule: ValidationRule): void {
  globalValidator.registerRule(rule);
}

/**
 * Registers a validation schema
 * @param name - Schema name
 * @param schema - Validation schema
 */
export function registerValidationSchema(name: string, schema: ValidationSchema): void {
  globalValidator.registerSchema(name, schema);
}

/**
 * Type guard functions for runtime type checking
 */
export const TypeGuards = {
  /**
   * Type guard for SearchConfiguration
   */
  isSearchConfiguration(value: any): value is SearchConfiguration {
    try {
      validateSearchConfiguration(value);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Type guard for SearchResult
   */
  isSearchResult(value: any): value is SearchResult {
    try {
      validateSearchResult(value);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Type guard for string
   */
  isString(value: any): value is string {
    return typeof value === 'string';
  },

  /**
   * Type guard for number
   */
  isNumber(value: any): value is number {
    return typeof value === 'number' && !isNaN(value);
  },

  /**
   * Type guard for boolean
   */
  isBoolean(value: any): value is boolean {
    return typeof value === 'boolean';
  },

  /**
   * Type guard for object
   */
  isObject(value: any): value is object {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  },

  /**
   * Type guard for array
   */
  isArray(value: any): value is any[] {
    return Array.isArray(value);
  },

  /**
   * Type guard for function
   */
  isFunction(value: any): value is Function {
    return typeof value === 'function';
  }
};

// Export the global validator instance
export { globalValidator as typeValidator };