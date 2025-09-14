/**
 * @fileoverview Theming Error Definitions
 * @description Custom error classes for theming and TypeScript validation
 * with comprehensive error handling and debugging support.
 */
/**
 * Base validation error class for theming system
 */
export class ValidationError extends Error {
    constructor(message, code = 'VALIDATION_ERROR', context) {
        super(message);
        this.name = 'ValidationError';
        this.code = code;
        this.context = context;
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, ValidationError);
        }
    }
}
/**
 * Theme configuration error
 */
export class ThemeConfigurationError extends ValidationError {
    constructor(message, context) {
        super(message, 'THEME_CONFIG_ERROR', context);
        this.name = 'ThemeConfigurationError';
    }
}
/**
 * Type definition error for IDE integration
 */
export class TypeDefinitionError extends ValidationError {
    constructor(message, context) {
        super(message, 'TYPE_DEFINITION_ERROR', context);
        this.name = 'TypeDefinitionError';
    }
}
/**
 * Runtime type validation error
 */
export class TypeValidationError extends ValidationError {
    constructor(message, context) {
        super(message, 'TYPE_VALIDATION_ERROR', context);
        this.name = 'TypeValidationError';
    }
}
//# sourceMappingURL=ThemingErrors.js.map