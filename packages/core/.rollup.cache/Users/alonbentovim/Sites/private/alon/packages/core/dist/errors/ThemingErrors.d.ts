/**
 * @fileoverview Theming Error Definitions
 * @description Custom error classes for theming and TypeScript validation
 * with comprehensive error handling and debugging support.
 */
/**
 * Base validation error class for theming system
 */
export declare class ValidationError extends Error {
    readonly code: string;
    readonly context?: Record<string, any>;
    constructor(message: string, code?: string, context?: Record<string, any>);
}
/**
 * Theme configuration error
 */
export declare class ThemeConfigurationError extends ValidationError {
    constructor(message: string, context?: Record<string, any>);
}
/**
 * Type definition error for IDE integration
 */
export declare class TypeDefinitionError extends ValidationError {
    constructor(message: string, context?: Record<string, any>);
}
/**
 * Runtime type validation error
 */
export declare class TypeValidationError extends ValidationError {
    constructor(message: string, context?: Record<string, any>);
}
//# sourceMappingURL=ThemingErrors.d.ts.map