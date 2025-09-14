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
import { SearchConfiguration, SearchResult, GenericSearchResult, ValidationErrorType } from '../types';
/**
 * Custom validation error class with detailed error information
 */
export declare class ValidationError extends Error {
    readonly type: ValidationErrorType;
    readonly path: string;
    readonly details: ValidationDetail[];
    readonly code: string;
    /**
     * Creates a new validation error
     * @param message - Error message
     * @param type - Type of validation error
     * @param path - Property path where error occurred
     * @param details - Detailed validation information
     * @param code - Error code for programmatic handling
     */
    constructor(message: string, type?: ValidationErrorType, path?: string, details?: ValidationDetail[], code?: string);
    /**
     * Converts error to JSON for serialization
     * @returns Serializable error object
     */
    toJSON(): Record<string, any>;
    /**
     * Creates a user-friendly error message
     * @returns Formatted error message
     */
    toUserString(): string;
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
export declare enum ValidationType {
    STRING = "string",
    NUMBER = "number",
    BOOLEAN = "boolean",
    OBJECT = "object",
    ARRAY = "array",
    FUNCTION = "function",
    DATE = "date",
    EMAIL = "email",
    URL = "url",
    UUID = "uuid",
    ENUM = "enum",
    OPTIONAL = "optional",
    ANY = "any"
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
export declare class TypeValidator {
    private rules;
    private schemas;
    constructor();
    /**
     * Registers a custom validation rule
     * @param rule - Validation rule to register
     */
    registerRule(rule: ValidationRule): void;
    /**
     * Registers a validation schema
     * @param name - Schema name
     * @param schema - Validation schema
     */
    registerSchema(name: string, schema: ValidationSchema): void;
    /**
     * Validates a value against a rule or schema
     * @param value - Value to validate
     * @param ruleOrSchema - Rule name, schema name, or inline schema
     * @param options - Validation options
     * @returns Validation result
     */
    validate<T = any>(value: any, ruleOrSchema: string | ValidationSchema | ValidationType, options?: ValidationOptions): ValidationResult<T>;
    /**
     * Creates a validator function from a schema
     * @param schema - Validation schema
     * @param options - Default validation options
     * @returns Validator function
     */
    createValidator<T = any>(schema: ValidationSchema | ValidationType, options?: ValidationOptions): (value: any) => ValidationResult<T>;
    /**
     * Validates a value against a specific rule or schema
     */
    private validateValue;
    /**
     * Validates built-in types
     */
    private validateBuiltInType;
    /**
     * Validates object against schema
     */
    private validateObject;
    /**
     * Creates a type error detail
     */
    private createTypeError;
    /**
     * Validates email format
     */
    private isValidEmail;
    /**
     * Validates URL format
     */
    private isValidURL;
    /**
     * Validates UUID format
     */
    private isValidUUID;
    /**
     * Gets current memory usage
     */
    private getMemoryUsage;
    /**
     * Initializes built-in validation rules
     */
    private initializeBuiltInRules;
}
declare const globalValidator: TypeValidator;
/**
 * Validates search configuration object
 * @param config - Configuration to validate
 * @param options - Validation options
 * @returns Validated configuration
 * @throws ValidationError if validation fails
 */
export declare function validateSearchConfiguration(config: any, options?: ValidationOptions): SearchConfiguration;
/**
 * Validates search result object
 * @param result - Result to validate
 * @param options - Validation options
 * @returns Validated result
 * @throws ValidationError if validation fails
 */
export declare function validateSearchResult<T = any>(result: any, options?: ValidationOptions): GenericSearchResult<T>;
/**
 * Creates a custom validator function
 * @param schema - Validation schema
 * @param options - Default validation options
 * @returns Validator function
 */
export declare function createValidator<T = any>(schema: ValidationSchema, options?: ValidationOptions): (value: any) => ValidationResult<T>;
/**
 * Registers a custom validation rule
 * @param rule - Validation rule to register
 */
export declare function registerValidationRule(rule: ValidationRule): void;
/**
 * Registers a validation schema
 * @param name - Schema name
 * @param schema - Validation schema
 */
export declare function registerValidationSchema(name: string, schema: ValidationSchema): void;
/**
 * Type guard functions for runtime type checking
 */
export declare const TypeGuards: {
    /**
     * Type guard for SearchConfiguration
     */
    isSearchConfiguration(value: any): value is SearchConfiguration;
    /**
     * Type guard for SearchResult
     */
    isSearchResult(value: any): value is SearchResult;
    /**
     * Type guard for string
     */
    isString(value: any): value is string;
    /**
     * Type guard for number
     */
    isNumber(value: any): value is number;
    /**
     * Type guard for boolean
     */
    isBoolean(value: any): value is boolean;
    /**
     * Type guard for object
     */
    isObject(value: any): value is object;
    /**
     * Type guard for array
     */
    isArray(value: any): value is any[];
    /**
     * Type guard for function
     */
    isFunction(value: any): value is Function;
};
export { globalValidator as typeValidator };
//# sourceMappingURL=typeValidation.d.ts.map