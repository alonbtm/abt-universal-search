/**
 * @fileoverview TypeValidationManager - Runtime type checking and validation utilities
 * @version 1.0.0
 * @author Alon Search Team
 * @description Provides comprehensive runtime type validation, configuration object checking,
 * type guard functions, and validation error reporting with detailed debugging assistance.
 *
 * @example Basic Usage
 * ```typescript
 * const validator = new TypeValidationManager();
 * const isValid = validator.validateConfiguration(config);
 * const result = validator.validateSearchResult(searchResult);
 * ```
 *
 * @since 1.0.0
 */
import { GenericValidator, ValidationErrorType } from '../types/index';
/**
 * Interface for validation error details
 * @interface ValidationError
 */
export interface ValidationError {
    /** Error type classification */
    type: ValidationErrorType;
    /** Field or property path where error occurred */
    path: string;
    /** Human-readable error message */
    message: string;
    /** Current value that failed validation */
    actualValue: any;
    /** Expected type or value */
    expectedType: string;
    /** Severity level of the error */
    severity: 'error' | 'warning' | 'info';
    /** Suggested fix or correction */
    suggestion?: string;
    /** Additional context information */
    context?: Record<string, any>;
}
/**
 * Interface for validation result
 * @interface ValidationResult
 */
export interface ValidationResult {
    /** Whether validation passed */
    isValid: boolean;
    /** List of validation errors */
    errors: ValidationError[];
    /** List of warnings (non-blocking issues) */
    warnings: ValidationError[];
    /** Validation summary statistics */
    summary: {
        totalChecks: number;
        passedChecks: number;
        failedChecks: number;
        warningCount: number;
    };
    /** Performance metrics */
    performance: {
        validationTimeMs: number;
        checksPerSecond: number;
    };
}
/**
 * Interface for type guard configuration
 * @interface TypeGuardConfig
 */
export interface TypeGuardConfig {
    /** Whether to perform deep validation */
    deep: boolean;
    /** Whether to allow additional properties */
    strict: boolean;
    /** Custom validation rules */
    customRules?: Array<{
        name: string;
        validator: (value: any) => boolean;
        errorMessage: string;
    }>;
    /** Performance optimization settings */
    performance: {
        enableCaching: boolean;
        maxCacheSize: number;
        cacheTimeoutMs: number;
    };
}
/**
 * Interface for validation rule definition
 * @interface ValidationRule
 */
export interface ValidationRule {
    /** Rule identifier */
    id: string;
    /** Rule name */
    name: string;
    /** Rule description */
    description: string;
    /** Validation function */
    validator: (value: any, context?: any) => boolean;
    /** Error message template */
    errorMessage: string | ((value: any, context?: any) => string);
    /** Rule severity */
    severity: 'error' | 'warning' | 'info';
    /** Whether rule is required */
    required: boolean;
}
/**
 * Interface for validation context
 * @interface ValidationContext
 */
export interface ValidationContext {
    /** Current object path */
    path: string[];
    /** Parent object reference */
    parent?: any;
    /** Validation configuration */
    config: TypeGuardConfig;
    /** Validation start time */
    startTime: number;
    /** Accumulated errors */
    errors: ValidationError[];
    /** Accumulated warnings */
    warnings: ValidationError[];
}
/**
 * TypeValidationManager - Comprehensive runtime type validation system
 *
 * Provides advanced runtime type checking, configuration validation, type guard functions,
 * and detailed error reporting for robust application behavior and development debugging.
 *
 * @class TypeValidationManager
 * @example
 * ```typescript
 * // Initialize validation manager
 * const validator = new TypeValidationManager({
 *   deep: true,
 *   strict: false,
 *   performance: {
 *     enableCaching: true,
 *     maxCacheSize: 1000,
 *     cacheTimeoutMs: 300000
 *   }
 * });
 *
 * // Validate search configuration
 * const configResult = validator.validateConfiguration(searchConfig);
 * if (!configResult.isValid) {
 *   console.error('Configuration errors:', configResult.errors);
 * }
 *
 * // Validate search results
 * const results = await searchAPI.search(query);
 * const resultValidation = validator.validateSearchResults(results);
 *
 * // Create custom type guard
 * const isProductResult = validator.createTypeGuard<ProductResult>(
 *   (value): value is ProductResult => {
 *     return typeof value.price === 'number' &&
 *            typeof value.category === 'string';
 *   }
 * );
 * ```
 */
export declare class TypeValidationManager {
    private config;
    private validationRules;
    private validationCache;
    private performanceMetrics;
    constructor(config?: Partial<TypeGuardConfig>);
    /**
     * Initialize built-in validation rules
     * @private
     */
    private initializeValidationRules;
    /**
     * Validate SearchConfiguration object
     * @param config - Configuration to validate
     * @returns Validation result
     */
    validateConfiguration(config: any): ValidationResult;
    /**
     * Validate SearchResult object
     * @param result - Search result to validate
     * @returns Validation result
     */
    validateSearchResult(result: any): ValidationResult;
    /**
     * Validate array of SearchResults
     * @param results - Array of search results
     * @returns Validation result
     */
    validateSearchResults(results: any): ValidationResult;
    /**
     * Create type guard function for custom types
     * @template T - Type to validate
     * @param validator - Validation function
     * @param errorMessage - Custom error message
     * @returns Type guard function
     */
    createTypeGuard<T>(validator: GenericValidator<T>, errorMessage?: string): GenericValidator<T>;
    /**
     * Validate SearchConfiguration internal implementation
     * @param config - Configuration object
     * @param context - Validation context
     * @private
     */
    private validateSearchConfigurationInternal;
    /**
     * Validate SearchResult internal implementation
     * @param result - Search result object
     * @param context - Validation context
     * @private
     */
    private validateSearchResultInternal;
    /**
     * Validate data source configuration
     * @param dataSource - Data source configuration
     * @param context - Validation context
     * @private
     */
    private validateDataSource;
    /**
     * Validate UI configuration
     * @param ui - UI configuration
     * @param context - Validation context
     * @private
     */
    private validateUIConfig;
    /**
     * Validate query configuration
     * @param query - Query configuration
     * @param context - Validation context
     * @private
     */
    private validateQueryConfig;
    /**
     * Validate performance configuration
     * @param performance - Performance configuration
     * @param context - Validation context
     * @private
     */
    private validatePerformanceConfig;
    /**
     * Validate using a specific rule
     * @param ruleId - Rule identifier
     * @param value - Value to validate
     * @param context - Validation context
     * @returns Whether validation passed
     * @private
     */
    private validateRule;
    /**
     * Add validation error to context
     * @param context - Validation context
     * @param error - Validation error
     * @private
     */
    private addValidationError;
    /**
     * Build final validation result
     * @param context - Validation context
     * @param validationTimeMs - Validation time in milliseconds
     * @returns Validation result
     * @private
     */
    private buildValidationResult;
    /**
     * Clear old cache entries to maintain cache size limit
     * @private
     */
    private clearOldCacheEntries;
    /**
     * Get validation statistics
     * @returns Validation manager statistics
     */
    getStatistics(): {
        rules: number;
        cacheSize: number;
        cacheHitRate: number;
        averageValidationTime: number;
        totalValidations: number;
    };
    /**
     * Clear all caches and reset metrics
     */
    clearCaches(): void;
    /**
     * Add custom validation rule
     * @param rule - Validation rule to add
     */
    addValidationRule(rule: ValidationRule): void;
    /**
     * Remove validation rule
     * @param ruleId - Rule identifier to remove
     */
    removeValidationRule(ruleId: string): void;
    /**
     * Get all validation rules
     * @returns Array of validation rules
     */
    getAllValidationRules(): ValidationRule[];
}
//# sourceMappingURL=TypeValidationManager.d.ts.map