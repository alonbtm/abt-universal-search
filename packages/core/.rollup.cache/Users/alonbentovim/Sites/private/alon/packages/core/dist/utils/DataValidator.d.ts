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
export declare class ValidationFunctions {
    /**
     * Validate required field presence
     */
    static required(value: unknown, context: ValidationContext): {
        valid: boolean;
        message?: string;
    };
    /**
     * Validate string type and constraints
     */
    static string(minLength?: number, maxLength?: number): (value: unknown, context: ValidationContext) => {
        valid: boolean;
        message?: string;
    };
    /**
     * Validate number type and range
     */
    static number(min?: number, max?: number): (value: unknown, context: ValidationContext) => {
        valid: boolean;
        message?: string;
    };
    /**
     * Validate email format
     */
    static email(value: unknown, context: ValidationContext): {
        valid: boolean;
        message?: string;
    };
    /**
     * Validate URL format
     */
    static url(value: unknown, context: ValidationContext): {
        valid: boolean;
        message?: string;
    };
    /**
     * Validate array type and constraints
     */
    static array(minItems?: number, maxItems?: number): (value: unknown, context: ValidationContext) => {
        valid: boolean;
        message?: string;
    };
    /**
     * Validate value is one of allowed options
     */
    static oneOf(allowedValues: unknown[]): (value: unknown, context: ValidationContext) => {
        valid: boolean;
        message?: string;
    };
    /**
     * Validate with custom regex pattern
     */
    static pattern(regex: RegExp, message?: string): (value: unknown, context: ValidationContext) => {
        valid: boolean;
        message?: string;
    };
}
/**
 * Advanced data validator with rule chaining and fallbacks
 */
export declare class AdvancedDataValidator {
    private validationRules;
    private fallbackValues;
    private validationStats;
    /**
     * Add validation rule for a field
     */
    addRule(fieldName: string, rule: ValidationRule): void;
    /**
     * Add multiple validation rules for a field
     */
    addRules(fieldName: string, rules: ValidationRule[]): void;
    /**
     * Set fallback value for a field
     */
    setFallback(fieldName: string, fallbackValue: unknown): void;
    /**
     * Validate a single field
     */
    validateField(fieldName: string, value: unknown, context?: Partial<ValidationContext>): FieldValidationResult;
    /**
     * Validate entire object
     */
    validateObject(obj: Record<string, unknown>, context?: Partial<ValidationContext>): ObjectValidationResult;
    /**
     * Validate array of objects
     */
    validateObjects(objects: Record<string, unknown>[], context?: Partial<ValidationContext>): ObjectValidationResult[];
    /**
     * Create validation schema fluent interface
     */
    schema(): ValidationSchemaBuilder;
    /**
     * Clear all validation rules and fallbacks
     */
    clear(): void;
    /**
     * Get validation statistics
     */
    getStats(): {
        totalValidations: number;
        successfulValidations: number;
        fallbacksUsed: number;
        averageValidationTime: number;
        successRate: number;
    };
    /**
     * Reset validation statistics
     */
    resetStats(): void;
}
/**
 * Fluent validation schema builder
 */
export declare class ValidationSchemaBuilder {
    private validator;
    constructor(validator: AdvancedDataValidator);
    /**
     * Configure validation for a field
     */
    field(name: string): FieldValidationBuilder;
    /**
     * Build and return the validator
     */
    build(): AdvancedDataValidator;
}
/**
 * Fluent field validation builder
 */
export declare class FieldValidationBuilder {
    private validator;
    private fieldName;
    constructor(validator: AdvancedDataValidator, fieldName: string);
    /**
     * Mark field as required
     */
    required(message?: string): FieldValidationBuilder;
    /**
     * Add string validation
     */
    string(minLength?: number, maxLength?: number): FieldValidationBuilder;
    /**
     * Add number validation
     */
    number(min?: number, max?: number): FieldValidationBuilder;
    /**
     * Add email validation
     */
    email(): FieldValidationBuilder;
    /**
     * Add URL validation
     */
    url(): FieldValidationBuilder;
    /**
     * Add array validation
     */
    array(minItems?: number, maxItems?: number): FieldValidationBuilder;
    /**
     * Add enum validation
     */
    oneOf(values: unknown[]): FieldValidationBuilder;
    /**
     * Add pattern validation
     */
    pattern(regex: RegExp, message?: string): FieldValidationBuilder;
    /**
     * Add custom validation function
     */
    custom(validate: (value: unknown, context: ValidationContext) => {
        valid: boolean;
        message?: string;
    }, severity?: ValidationSeverity): FieldValidationBuilder;
    /**
     * Set fallback value
     */
    fallback(value: unknown): FieldValidationBuilder;
    /**
     * Continue with another field
     */
    field(name: string): FieldValidationBuilder;
    /**
     * Build and return the validator
     */
    build(): AdvancedDataValidator;
}
/**
 * Utility functions for common validation patterns
 */
export declare const ValidationPatterns: {
    /** Phone number pattern */
    PHONE: RegExp;
    /** UUID pattern */
    UUID: RegExp;
    /** Credit card pattern */
    CREDIT_CARD: RegExp;
    /** Postal code patterns by country */
    POSTAL_CODE_US: RegExp;
    POSTAL_CODE_UK: RegExp;
    POSTAL_CODE_CANADA: RegExp;
};
/**
 * Global data validator instance
 */
export declare const dataValidator: AdvancedDataValidator;
//# sourceMappingURL=DataValidator.d.ts.map