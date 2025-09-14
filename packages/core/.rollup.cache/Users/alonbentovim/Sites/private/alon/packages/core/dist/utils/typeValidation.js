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
import { ValidationErrorType } from '../types';
/**
 * Custom validation error class with detailed error information
 */
export class ValidationError extends Error {
    /**
     * Creates a new validation error
     * @param message - Error message
     * @param type - Type of validation error
     * @param path - Property path where error occurred
     * @param details - Detailed validation information
     * @param code - Error code for programmatic handling
     */
    constructor(message, type = ValidationErrorType.VALIDATION_FAILED, path = '', details = [], code = 'VALIDATION_ERROR') {
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
    toJSON() {
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
    toUserString() {
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
 * Built-in validation types
 */
export var ValidationType;
(function (ValidationType) {
    ValidationType["STRING"] = "string";
    ValidationType["NUMBER"] = "number";
    ValidationType["BOOLEAN"] = "boolean";
    ValidationType["OBJECT"] = "object";
    ValidationType["ARRAY"] = "array";
    ValidationType["FUNCTION"] = "function";
    ValidationType["DATE"] = "date";
    ValidationType["EMAIL"] = "email";
    ValidationType["URL"] = "url";
    ValidationType["UUID"] = "uuid";
    ValidationType["ENUM"] = "enum";
    ValidationType["OPTIONAL"] = "optional";
    ValidationType["ANY"] = "any";
})(ValidationType || (ValidationType = {}));
/**
 * Type validator class for creating custom validators
 */
export class TypeValidator {
    constructor() {
        this.rules = new Map();
        this.schemas = new Map();
        this.initializeBuiltInRules();
    }
    /**
     * Registers a custom validation rule
     * @param rule - Validation rule to register
     */
    registerRule(rule) {
        this.rules.set(rule.name, rule);
    }
    /**
     * Registers a validation schema
     * @param name - Schema name
     * @param schema - Validation schema
     */
    registerSchema(name, schema) {
        this.schemas.set(name, schema);
    }
    /**
     * Validates a value against a rule or schema
     * @param value - Value to validate
     * @param ruleOrSchema - Rule name, schema name, or inline schema
     * @param options - Validation options
     * @returns Validation result
     */
    validate(value, ruleOrSchema, options = {}) {
        const startTime = performance.now();
        const context = {
            path: '',
            root: value,
            options: { stopOnError: false, allowAdditional: true, strict: false, ...options }
        };
        const errors = [];
        const warnings = [];
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
        }
        catch (error) {
            const endTime = performance.now();
            return {
                valid: false,
                errors: [{
                        path: context.path,
                        expected: 'valid value',
                        actual: typeof value,
                        message: error.message,
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
    createValidator(schema, options = {}) {
        return (value) => this.validate(value, schema, options);
    }
    /**
     * Validates a value against a specific rule or schema
     */
    validateValue(value, ruleOrSchema, context, errors, warnings) {
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
        if (typeof ruleOrSchema === 'string' && Object.values(ValidationType).includes(ruleOrSchema)) {
            return this.validateBuiltInType(value, ruleOrSchema, context, errors);
        }
        // Handle registered rule names
        if (typeof ruleOrSchema === 'string' && this.rules.has(ruleOrSchema)) {
            const rule = this.rules.get(ruleOrSchema);
            const error = rule.validate(value, context.path, context);
            if (error) {
                errors.push(error);
            }
            return value;
        }
        // Handle registered schema names
        if (typeof ruleOrSchema === 'string' && this.schemas.has(ruleOrSchema)) {
            const schema = this.schemas.get(ruleOrSchema);
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
    validateBuiltInType(value, type, context, errors) {
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
    validateObject(value, schema, context, errors, warnings) {
        if (typeof value !== 'object' || Array.isArray(value) || value === null) {
            errors.push(this.createTypeError(context.path, 'object', Array.isArray(value) ? 'array' : typeof value));
            return value;
        }
        const result = context.options.removeAdditional ? {} : { ...value };
        // Validate schema properties
        for (const [key, rule] of Object.entries(schema)) {
            const propertyPath = context.path ? `${context.path}.${key}` : key;
            const propertyContext = { ...context, path: propertyPath, parent: value };
            if (key in value) {
                result[key] = this.validateValue(value[key], rule, propertyContext, errors, warnings);
            }
            else if (rule instanceof Object && 'required' in rule && rule.required) {
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
    createTypeError(path, expected, actual) {
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
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    /**
     * Validates URL format
     */
    isValidURL(url) {
        try {
            new URL(url);
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * Validates UUID format
     */
    isValidUUID(uuid) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidRegex.test(uuid);
    }
    /**
     * Gets current memory usage
     */
    getMemoryUsage() {
        if (typeof window !== 'undefined' && 'performance' in window && 'memory' in performance) {
            return performance.memory.usedJSHeapSize;
        }
        return 0;
    }
    /**
     * Initializes built-in validation rules
     */
    initializeBuiltInRules() {
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
export function validateSearchConfiguration(config, options = { stopOnError: true }) {
    const schema = {
        dataSources: ValidationType.ARRAY,
        ui: ValidationType.OPTIONAL,
        search: ValidationType.OPTIONAL,
        performance: ValidationType.OPTIONAL,
        accessibility: ValidationType.OPTIONAL,
        internationalization: ValidationType.OPTIONAL,
        theming: ValidationType.OPTIONAL
    };
    const result = globalValidator.validate(config, schema, options);
    if (!result.valid) {
        throw new ValidationError('Invalid search configuration', ValidationErrorType.INVALID_CONFIG, '', result.errors, 'CONFIG_VALIDATION_FAILED');
    }
    return result.data;
}
/**
 * Validates search result object
 * @param result - Result to validate
 * @param options - Validation options
 * @returns Validated result
 * @throws ValidationError if validation fails
 */
export function validateSearchResult(result, options = {}) {
    const schema = {
        id: ValidationType.STRING,
        title: ValidationType.STRING,
        description: ValidationType.OPTIONAL,
        url: ValidationType.OPTIONAL,
        type: ValidationType.OPTIONAL,
        score: ValidationType.OPTIONAL,
        data: ValidationType.ANY,
        metadata: ValidationType.OPTIONAL
    };
    const validationResult = globalValidator.validate(result, schema, options);
    if (!validationResult.valid) {
        throw new ValidationError('Invalid search result', ValidationErrorType.INVALID_FORMAT, '', validationResult.errors, 'RESULT_VALIDATION_FAILED');
    }
    return validationResult.data;
}
/**
 * Creates a custom validator function
 * @param schema - Validation schema
 * @param options - Default validation options
 * @returns Validator function
 */
export function createValidator(schema, options = {}) {
    return globalValidator.createValidator(schema, options);
}
/**
 * Registers a custom validation rule
 * @param rule - Validation rule to register
 */
export function registerValidationRule(rule) {
    globalValidator.registerRule(rule);
}
/**
 * Registers a validation schema
 * @param name - Schema name
 * @param schema - Validation schema
 */
export function registerValidationSchema(name, schema) {
    globalValidator.registerSchema(name, schema);
}
/**
 * Type guard functions for runtime type checking
 */
export const TypeGuards = {
    /**
     * Type guard for SearchConfiguration
     */
    isSearchConfiguration(value) {
        try {
            validateSearchConfiguration(value);
            return true;
        }
        catch {
            return false;
        }
    },
    /**
     * Type guard for SearchResult
     */
    isSearchResult(value) {
        try {
            validateSearchResult(value);
            return true;
        }
        catch {
            return false;
        }
    },
    /**
     * Type guard for string
     */
    isString(value) {
        return typeof value === 'string';
    },
    /**
     * Type guard for number
     */
    isNumber(value) {
        return typeof value === 'number' && !isNaN(value);
    },
    /**
     * Type guard for boolean
     */
    isBoolean(value) {
        return typeof value === 'boolean';
    },
    /**
     * Type guard for object
     */
    isObject(value) {
        return typeof value === 'object' && value !== null && !Array.isArray(value);
    },
    /**
     * Type guard for array
     */
    isArray(value) {
        return Array.isArray(value);
    },
    /**
     * Type guard for function
     */
    isFunction(value) {
        return typeof value === 'function';
    }
};
// Export the global validator instance
export { globalValidator as typeValidator };
//# sourceMappingURL=typeValidation.js.map