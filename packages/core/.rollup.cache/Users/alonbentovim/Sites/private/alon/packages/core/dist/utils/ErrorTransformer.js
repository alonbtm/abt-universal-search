/**
 * Error Transformer - User-friendly error message transformation
 * @description Transforms adapter-specific errors into user-friendly messages with context preservation
 */
import { ValidationError } from './validation';
/**
 * Advanced error transformer with categorization and recovery
 */
export class AdvancedErrorTransformer {
    constructor() {
        this.transformationRules = [];
        this.recoveryStrategies = [];
        this.errorStats = {
            totalErrors: 0,
            errorsByCategory: {},
            errorsBySeverity: {},
            recoveryAttempts: 0,
            successfulRecoveries: 0
        };
        this.initializeDefaultRules();
    }
    /**
     * Transform an error to user-friendly format
     */
    async transformError(error, context) {
        this.errorStats.totalErrors++;
        const defaultTransformed = {
            message: 'An unexpected error occurred',
            severity: 'error',
            category: 'unknown',
            code: 'UNKNOWN_ERROR',
            recoverable: false,
            technical: {
                originalError: error.message,
                stack: error.stack,
                context: context.metadata
            }
        };
        // Apply transformation rules
        for (const rule of this.transformationRules) {
            if (rule.matcher(error, context)) {
                const ruleResult = rule.transformer(error, context);
                Object.assign(defaultTransformed, ruleResult);
                break; // Use first matching rule
            }
        }
        // Update statistics
        this.errorStats.errorsByCategory[defaultTransformed.category] =
            (this.errorStats.errorsByCategory[defaultTransformed.category] || 0) + 1;
        this.errorStats.errorsBySeverity[defaultTransformed.severity] =
            (this.errorStats.errorsBySeverity[defaultTransformed.severity] || 0) + 1;
        // Attempt recovery if applicable
        if (defaultTransformed.recoverable) {
            const recoveryResult = await this.attemptRecovery(defaultTransformed, context);
            if (recoveryResult.recovered) {
                defaultTransformed.partialResults = recoveryResult.partialResults;
                defaultTransformed.message = recoveryResult.message || defaultTransformed.message;
            }
        }
        return defaultTransformed;
    }
    /**
     * Transform multiple errors
     */
    async transformErrors(errors) {
        return Promise.all(errors.map(({ error, context }) => this.transformError(error, context)));
    }
    /**
     * Add custom transformation rule
     */
    addTransformationRule(rule) {
        this.transformationRules.push(rule);
        this.sortRulesByPriority();
    }
    /**
     * Add custom recovery strategy
     */
    addRecoveryStrategy(strategy) {
        this.recoveryStrategies.push(strategy);
    }
    /**
     * Attempt error recovery
     */
    async attemptRecovery(error, context) {
        this.errorStats.recoveryAttempts++;
        for (const strategy of this.recoveryStrategies) {
            if (strategy.applicableCategories.includes(error.category)) {
                try {
                    const result = await strategy.recover(error, context);
                    if (result.recovered) {
                        this.errorStats.successfulRecoveries++;
                        return result;
                    }
                }
                catch (recoveryError) {
                    console.warn(`Recovery strategy '${strategy.name}' failed:`, recoveryError);
                }
            }
        }
        return { recovered: false };
    }
    /**
     * Initialize default transformation rules
     */
    initializeDefaultRules() {
        // Network/Connection errors
        this.addTransformationRule({
            name: 'network_error',
            priority: 100,
            matcher: (error) => error.message.includes('ECONNREFUSED') ||
                error.message.includes('ENOTFOUND') ||
                error.message.includes('ETIMEDOUT') ||
                error.message.includes('network') ||
                error.name === 'NetworkError',
            transformer: (error, context) => ({
                message: 'Unable to connect to the data source. Please check your network connection.',
                severity: 'error',
                category: 'network',
                code: 'NETWORK_ERROR',
                recoverable: true,
                suggestions: [
                    'Check your internet connection',
                    'Verify the data source is accessible',
                    'Try again in a few moments'
                ],
                retryInfo: {
                    canRetry: true,
                    maxAttempts: 3,
                    backoffMs: 2000
                }
            })
        });
        // Authentication errors
        this.addTransformationRule({
            name: 'authentication_error',
            priority: 95,
            matcher: (error) => error.message.includes('401') ||
                error.message.includes('unauthorized') ||
                error.message.includes('authentication') ||
                error.message.includes('invalid credentials'),
            transformer: (error, context) => ({
                message: 'Authentication failed. Please check your credentials.',
                severity: 'error',
                category: 'authentication',
                code: 'AUTH_ERROR',
                recoverable: false,
                suggestions: [
                    'Verify your username and password',
                    'Check if your account is active',
                    'Contact your administrator if the issue persists'
                ]
            })
        });
        // Authorization errors
        this.addTransformationRule({
            name: 'authorization_error',
            priority: 90,
            matcher: (error) => error.message.includes('403') ||
                error.message.includes('forbidden') ||
                error.message.includes('access denied') ||
                error.message.includes('insufficient permissions'),
            transformer: (error, context) => ({
                message: 'You do not have permission to access this resource.',
                severity: 'error',
                category: 'authorization',
                code: 'ACCESS_DENIED',
                recoverable: false,
                suggestions: [
                    'Contact your administrator to request access',
                    'Check if you have the required permissions',
                    'Try accessing a different resource'
                ]
            })
        });
        // Validation errors
        this.addTransformationRule({
            name: 'validation_error',
            priority: 85,
            matcher: (error) => error instanceof ValidationError ||
                error.message.includes('validation') ||
                error.message.includes('invalid') ||
                error.message.includes('required field'),
            transformer: (error, context) => {
                const validationError = error;
                return {
                    message: validationError.field
                        ? `Invalid value for field '${validationError.field}': ${error.message}`
                        : `Validation error: ${error.message}`,
                    severity: 'warning',
                    category: 'validation',
                    code: 'VALIDATION_ERROR',
                    recoverable: true,
                    suggestions: [
                        'Check your input data format',
                        'Ensure all required fields are provided',
                        'Verify data types match expectations'
                    ]
                };
            }
        });
        // Timeout errors
        this.addTransformationRule({
            name: 'timeout_error',
            priority: 80,
            matcher: (error) => error.message.includes('timeout') ||
                error.message.includes('ETIMEDOUT') ||
                error.name === 'TimeoutError',
            transformer: (error, context) => ({
                message: 'The operation timed out. This might indicate a slow connection or server issue.',
                severity: 'warning',
                category: 'timeout',
                code: 'TIMEOUT_ERROR',
                recoverable: true,
                suggestions: [
                    'Try again with a longer timeout',
                    'Check if the server is responding slowly',
                    'Consider reducing the scope of your request'
                ],
                retryInfo: {
                    canRetry: true,
                    maxAttempts: 2,
                    backoffMs: 5000
                }
            })
        });
        // Data source errors
        this.addTransformationRule({
            name: 'data_source_error',
            priority: 75,
            matcher: (error) => error.message.includes('database') ||
                error.message.includes('query') ||
                error.message.includes('syntax error') ||
                error.message.includes('connection pool'),
            transformer: (error, context) => ({
                message: 'There was an issue with the data source.',
                severity: 'error',
                category: 'data',
                code: 'DATA_SOURCE_ERROR',
                recoverable: true,
                suggestions: [
                    'Check if the data source is available',
                    'Verify your query syntax',
                    'Try a simpler query if possible'
                ],
                retryInfo: {
                    canRetry: true,
                    maxAttempts: 2,
                    backoffMs: 1000
                }
            })
        });
        // Configuration errors
        this.addTransformationRule({
            name: 'configuration_error',
            priority: 70,
            matcher: (error) => error.message.includes('configuration') ||
                error.message.includes('config') ||
                error.message.includes('missing required') ||
                error.message.includes('invalid settings'),
            transformer: (error, context) => ({
                message: 'Configuration error detected. Please check your settings.',
                severity: 'error',
                category: 'configuration',
                code: 'CONFIG_ERROR',
                recoverable: false,
                suggestions: [
                    'Review your configuration settings',
                    'Ensure all required parameters are provided',
                    'Check the documentation for correct format'
                ]
            })
        });
        // Transformation errors
        this.addTransformationRule({
            name: 'transformation_error',
            priority: 65,
            matcher: (error, context) => context.sourceType === 'transformation' ||
                error.message.includes('transform') ||
                error.message.includes('mapping'),
            transformer: (error, context) => ({
                message: 'Error occurred while processing the results.',
                severity: 'warning',
                category: 'transformation',
                code: 'TRANSFORM_ERROR',
                recoverable: true,
                suggestions: [
                    'Check your field mapping configuration',
                    'Verify the data format matches expectations',
                    'Try with a smaller result set'
                ]
            })
        });
    }
    /**
     * Sort transformation rules by priority
     */
    sortRulesByPriority() {
        this.transformationRules.sort((a, b) => b.priority - a.priority);
    }
    /**
     * Get error statistics
     */
    getStats() {
        const mostCommonCategory = Object.entries(this.errorStats.errorsByCategory)
            .sort(([, a], [, b]) => b - a)[0]?.[0] || null;
        const recoveryRate = this.errorStats.recoveryAttempts > 0
            ? this.errorStats.successfulRecoveries / this.errorStats.recoveryAttempts
            : 0;
        return {
            totalErrors: this.errorStats.totalErrors,
            errorsByCategory: { ...this.errorStats.errorsByCategory },
            errorsBySeverity: { ...this.errorStats.errorsBySeverity },
            recoveryRate,
            mostCommonCategory
        };
    }
    /**
     * Reset error statistics
     */
    resetStats() {
        this.errorStats = {
            totalErrors: 0,
            errorsByCategory: {},
            errorsBySeverity: {},
            recoveryAttempts: 0,
            successfulRecoveries: 0
        };
    }
    /**
     * Clear all custom rules and strategies
     */
    clear() {
        this.transformationRules = [];
        this.recoveryStrategies = [];
        this.initializeDefaultRules();
    }
    /**
     * Get configuration summary
     */
    getConfiguration() {
        return {
            rulesCount: this.transformationRules.length,
            strategiesCount: this.recoveryStrategies.length,
            categories: ['connection', 'authentication', 'authorization', 'validation', 'transformation', 'network', 'timeout', 'data', 'configuration', 'unknown'],
            severities: ['critical', 'error', 'warning', 'info']
        };
    }
}
/**
 * Fluent error transformation rule builder
 */
export class ErrorTransformationRuleBuilder {
    constructor() {
        this.rule = { priority: 50 };
    }
    name(name) {
        this.rule.name = name;
        return this;
    }
    priority(priority) {
        this.rule.priority = priority;
        return this;
    }
    matchMessage(pattern) {
        this.rule.matcher = (error) => {
            if (typeof pattern === 'string') {
                return error.message.includes(pattern);
            }
            else {
                return pattern.test(error.message);
            }
        };
        return this;
    }
    matchType(errorType) {
        this.rule.matcher = (error) => error.name === errorType;
        return this;
    }
    matchCustom(matcher) {
        this.rule.matcher = matcher;
        return this;
    }
    transform(transformer) {
        this.rule.transformer = transformer;
        if (!this.rule.name) {
            this.rule.name = `custom_rule_${Date.now()}`;
        }
        return this.rule;
    }
}
/**
 * Utility function to create error transformation rule
 */
export function createErrorRule() {
    return new ErrorTransformationRuleBuilder();
}
/**
 * Predefined error recovery strategies
 */
export const DefaultRecoveryStrategies = {
    /**
     * Retry strategy for transient network errors
     */
    networkRetry: () => ({
        name: 'network_retry',
        applicableCategories: ['network', 'timeout'],
        recover: async (error, context) => {
            // Simple retry logic - in real implementation would have more sophisticated backoff
            if ((context.retryAttempt || 0) < (error.retryInfo?.maxAttempts || 3)) {
                return {
                    recovered: false, // Would trigger actual retry in calling code
                    message: `Retry attempt ${(context.retryAttempt || 0) + 1} of ${error.retryInfo?.maxAttempts || 3}`
                };
            }
            return { recovered: false };
        }
    }),
    /**
     * Partial results recovery for data errors
     */
    partialResults: () => ({
        name: 'partial_results',
        applicableCategories: ['data', 'transformation'],
        recover: async (error, context) => {
            // In real implementation, would attempt to salvage partial results
            return {
                recovered: true,
                partialResults: [], // Would contain successfully processed results
                message: 'Some results may be incomplete due to processing errors'
            };
        }
    })
};
/**
 * Utility functions for common error checks
 */
export const ErrorUtils = {
    /**
     * Check if error is retryable
     */
    isRetryable: (error) => {
        return error.recoverable && !!error.retryInfo?.canRetry;
    },
    /**
     * Get user-friendly error summary
     */
    getSummary: (errors) => {
        if (errors.length === 0)
            return 'No errors';
        if (errors.length === 1)
            return errors[0].message;
        const categoryCounts = errors.reduce((acc, error) => {
            acc[error.category] = (acc[error.category] || 0) + 1;
            return acc;
        }, {});
        const summaryParts = Object.entries(categoryCounts)
            .map(([category, count]) => `${count} ${category} error${count > 1 ? 's' : ''}`)
            .join(', ');
        return `Multiple errors occurred: ${summaryParts}`;
    },
    /**
     * Get highest severity from error list
     */
    getHighestSeverity: (errors) => {
        const severityOrder = ['critical', 'error', 'warning', 'info'];
        for (const severity of severityOrder) {
            if (errors.some(error => error.severity === severity)) {
                return severity;
            }
        }
        return 'info';
    }
};
/**
 * Global error transformer instance
 */
export const errorTransformer = new AdvancedErrorTransformer();
//# sourceMappingURL=ErrorTransformer.js.map