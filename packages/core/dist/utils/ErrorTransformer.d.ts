/**
 * Error Transformer - User-friendly error message transformation
 * @description Transforms adapter-specific errors into user-friendly messages with context preservation
 */
/**
 * Error severity levels
 */
export type ErrorSeverity = 'critical' | 'error' | 'warning' | 'info';
/**
 * Error categories for classification
 */
export type ErrorCategory = 'connection' | 'authentication' | 'authorization' | 'validation' | 'transformation' | 'network' | 'timeout' | 'data' | 'configuration' | 'unknown';
/**
 * Transformed error result
 */
export interface TransformedError {
    /** User-friendly error message */
    message: string;
    /** Error severity level */
    severity: ErrorSeverity;
    /** Error category */
    category: ErrorCategory;
    /** Error code for programmatic handling */
    code: string;
    /** Technical details for debugging */
    technical?: {
        originalError: string;
        stack?: string;
        context?: Record<string, unknown>;
    };
    /** Suggested actions for resolution */
    suggestions?: string[];
    /** Whether error is recoverable */
    recoverable: boolean;
    /** Partial results if available */
    partialResults?: unknown[];
    /** Retry information */
    retryInfo?: {
        canRetry: boolean;
        maxAttempts?: number;
        backoffMs?: number;
    };
}
/**
 * Error transformation rule
 */
export interface ErrorTransformationRule {
    /** Rule name */
    name: string;
    /** Rule priority (higher runs first) */
    priority: number;
    /** Matcher function to identify applicable errors */
    matcher: (error: Error, context: ErrorContext) => boolean;
    /** Transformer function */
    transformer: (error: Error, context: ErrorContext) => Partial<TransformedError>;
}
/**
 * Error context for transformation
 */
export interface ErrorContext {
    /** Source adapter type */
    sourceType: string;
    /** Original query or operation */
    operation?: string;
    /** Timestamp when error occurred */
    timestamp: number;
    /** Additional context data */
    metadata?: Record<string, unknown>;
    /** Retry attempt number */
    retryAttempt?: number;
}
/**
 * Error recovery strategy
 */
export interface ErrorRecoveryStrategy {
    /** Strategy name */
    name: string;
    /** Error categories this strategy applies to */
    applicableCategories: ErrorCategory[];
    /** Recovery function */
    recover: (error: TransformedError, context: ErrorContext) => Promise<{
        recovered: boolean;
        partialResults?: unknown[];
        message?: string;
    }>;
}
/**
 * Advanced error transformer with categorization and recovery
 */
export declare class AdvancedErrorTransformer {
    private transformationRules;
    private recoveryStrategies;
    private errorStats;
    constructor();
    /**
     * Transform an error to user-friendly format
     */
    transformError(error: Error, context: ErrorContext): Promise<TransformedError>;
    /**
     * Transform multiple errors
     */
    transformErrors(errors: Array<{
        error: Error;
        context: ErrorContext;
    }>): Promise<TransformedError[]>;
    /**
     * Add custom transformation rule
     */
    addTransformationRule(rule: ErrorTransformationRule): void;
    /**
     * Add custom recovery strategy
     */
    addRecoveryStrategy(strategy: ErrorRecoveryStrategy): void;
    /**
     * Attempt error recovery
     */
    private attemptRecovery;
    /**
     * Initialize default transformation rules
     */
    private initializeDefaultRules;
    /**
     * Sort transformation rules by priority
     */
    private sortRulesByPriority;
    /**
     * Get error statistics
     */
    getStats(): {
        totalErrors: number;
        errorsByCategory: Record<ErrorCategory, number>;
        errorsBySeverity: Record<ErrorSeverity, number>;
        recoveryRate: number;
        mostCommonCategory: ErrorCategory | null;
    };
    /**
     * Reset error statistics
     */
    resetStats(): void;
    /**
     * Clear all custom rules and strategies
     */
    clear(): void;
    /**
     * Get configuration summary
     */
    getConfiguration(): {
        rulesCount: number;
        strategiesCount: number;
        categories: ErrorCategory[];
        severities: ErrorSeverity[];
    };
}
/**
 * Fluent error transformation rule builder
 */
export declare class ErrorTransformationRuleBuilder {
    private rule;
    name(name: string): ErrorTransformationRuleBuilder;
    priority(priority: number): ErrorTransformationRuleBuilder;
    matchMessage(pattern: string | RegExp): ErrorTransformationRuleBuilder;
    matchType(errorType: string): ErrorTransformationRuleBuilder;
    matchCustom(matcher: ErrorTransformationRule['matcher']): ErrorTransformationRuleBuilder;
    transform(transformer: ErrorTransformationRule['transformer']): ErrorTransformationRule;
}
/**
 * Utility function to create error transformation rule
 */
export declare function createErrorRule(): ErrorTransformationRuleBuilder;
/**
 * Predefined error recovery strategies
 */
export declare const DefaultRecoveryStrategies: {
    /**
     * Retry strategy for transient network errors
     */
    networkRetry: () => ErrorRecoveryStrategy;
    /**
     * Partial results recovery for data errors
     */
    partialResults: () => ErrorRecoveryStrategy;
};
/**
 * Utility functions for common error checks
 */
export declare const ErrorUtils: {
    /**
     * Check if error is retryable
     */
    isRetryable: (error: TransformedError) => boolean;
    /**
     * Get user-friendly error summary
     */
    getSummary: (errors: TransformedError[]) => string;
    /**
     * Get highest severity from error list
     */
    getHighestSeverity: (errors: TransformedError[]) => ErrorSeverity;
};
/**
 * Global error transformer instance
 */
export declare const errorTransformer: AdvancedErrorTransformer;
//# sourceMappingURL=ErrorTransformer.d.ts.map