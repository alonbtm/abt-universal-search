/**
 * Error Transformer - User-friendly error message transformation
 * @description Transforms adapter-specific errors into user-friendly messages with context preservation
 */

import { ValidationError } from './validation';

/**
 * Error severity levels
 */
export type ErrorSeverity = 'critical' | 'error' | 'warning' | 'info';

/**
 * Error categories for classification
 */
export type ErrorCategory = 
  | 'connection'
  | 'authentication' 
  | 'authorization'
  | 'validation'
  | 'transformation'
  | 'network'
  | 'timeout'
  | 'data'
  | 'configuration'
  | 'unknown';

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
export class AdvancedErrorTransformer {
  private transformationRules: ErrorTransformationRule[] = [];
  private recoveryStrategies: ErrorRecoveryStrategy[] = [];
  private errorStats = {
    totalErrors: 0,
    errorsByCategory: {} as Record<ErrorCategory, number>,
    errorsBySeverity: {} as Record<ErrorSeverity, number>,
    recoveryAttempts: 0,
    successfulRecoveries: 0
  };

  constructor() {
    this.initializeDefaultRules();
  }

  /**
   * Transform an error to user-friendly format
   */
  public async transformError(error: Error, context: ErrorContext): Promise<TransformedError> {
    this.errorStats.totalErrors++;
    
    const defaultTransformed: TransformedError = {
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
  public async transformErrors(
    errors: Array<{ error: Error; context: ErrorContext }>
  ): Promise<TransformedError[]> {
    return Promise.all(
      errors.map(({ error, context }) => this.transformError(error, context))
    );
  }

  /**
   * Add custom transformation rule
   */
  public addTransformationRule(rule: ErrorTransformationRule): void {
    this.transformationRules.push(rule);
    this.sortRulesByPriority();
  }

  /**
   * Add custom recovery strategy
   */
  public addRecoveryStrategy(strategy: ErrorRecoveryStrategy): void {
    this.recoveryStrategies.push(strategy);
  }

  /**
   * Attempt error recovery
   */
  private async attemptRecovery(error: TransformedError, context: ErrorContext): Promise<{
    recovered: boolean;
    partialResults?: unknown[];
    message?: string;
  }> {
    this.errorStats.recoveryAttempts++;

    for (const strategy of this.recoveryStrategies) {
      if (strategy.applicableCategories.includes(error.category)) {
        try {
          const result = await strategy.recover(error, context);
          if (result.recovered) {
            this.errorStats.successfulRecoveries++;
            return result;
          }
        } catch (recoveryError) {
          console.warn(`Recovery strategy '${strategy.name}' failed:`, recoveryError);
        }
      }
    }

    return { recovered: false };
  }

  /**
   * Initialize default transformation rules
   */
  private initializeDefaultRules(): void {
    // Network/Connection errors
    this.addTransformationRule({
      name: 'network_error',
      priority: 100,
      matcher: (error) => 
        error.message.includes('ECONNREFUSED') ||
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
      matcher: (error) =>
        error.message.includes('401') ||
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
      matcher: (error) =>
        error.message.includes('403') ||
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
      matcher: (error) => 
        error instanceof ValidationError ||
        error.message.includes('validation') ||
        error.message.includes('invalid') ||
        error.message.includes('required field'),
      transformer: (error, context) => {
        const validationError = error as ValidationError;
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
      matcher: (error) =>
        error.message.includes('timeout') ||
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
      matcher: (error) =>
        error.message.includes('database') ||
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
      matcher: (error) =>
        error.message.includes('configuration') ||
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
      matcher: (error, context) =>
        context.sourceType === 'transformation' ||
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
  private sortRulesByPriority(): void {
    this.transformationRules.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Get error statistics
   */
  public getStats(): {
    totalErrors: number;
    errorsByCategory: Record<ErrorCategory, number>;
    errorsBySeverity: Record<ErrorSeverity, number>;
    recoveryRate: number;
    mostCommonCategory: ErrorCategory | null;
  } {
    const mostCommonCategory = Object.entries(this.errorStats.errorsByCategory)
      .sort(([,a], [,b]) => b - a)[0]?.[0] as ErrorCategory || null;

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
  public resetStats(): void {
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
  public clear(): void {
    this.transformationRules = [];
    this.recoveryStrategies = [];
    this.initializeDefaultRules();
  }

  /**
   * Get configuration summary
   */
  public getConfiguration(): {
    rulesCount: number;
    strategiesCount: number;
    categories: ErrorCategory[];
    severities: ErrorSeverity[];
  } {
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
  private rule: Partial<ErrorTransformationRule> = { priority: 50 };

  public name(name: string): ErrorTransformationRuleBuilder {
    this.rule.name = name;
    return this;
  }

  public priority(priority: number): ErrorTransformationRuleBuilder {
    this.rule.priority = priority;
    return this;
  }

  public matchMessage(pattern: string | RegExp): ErrorTransformationRuleBuilder {
    this.rule.matcher = (error) => {
      if (typeof pattern === 'string') {
        return error.message.includes(pattern);
      } else {
        return pattern.test(error.message);
      }
    };
    return this;
  }

  public matchType(errorType: string): ErrorTransformationRuleBuilder {
    this.rule.matcher = (error) => error.name === errorType;
    return this;
  }

  public matchCustom(matcher: ErrorTransformationRule['matcher']): ErrorTransformationRuleBuilder {
    this.rule.matcher = matcher;
    return this;
  }

  public transform(transformer: ErrorTransformationRule['transformer']): ErrorTransformationRule {
    this.rule.transformer = transformer;
    
    if (!this.rule.name) {
      this.rule.name = `custom_rule_${Date.now()}`;
    }
    
    return this.rule as ErrorTransformationRule;
  }
}

/**
 * Utility function to create error transformation rule
 */
export function createErrorRule(): ErrorTransformationRuleBuilder {
  return new ErrorTransformationRuleBuilder();
}

/**
 * Predefined error recovery strategies
 */
export const DefaultRecoveryStrategies = {
  /**
   * Retry strategy for transient network errors
   */
  networkRetry: (): ErrorRecoveryStrategy => ({
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
  partialResults: (): ErrorRecoveryStrategy => ({
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
  isRetryable: (error: TransformedError): boolean => {
    return error.recoverable && !!error.retryInfo?.canRetry;
  },

  /**
   * Get user-friendly error summary
   */
  getSummary: (errors: TransformedError[]): string => {
    if (errors.length === 0) return 'No errors';
    if (errors.length === 1) return errors[0].message;
    
    const categoryCounts = errors.reduce((acc, error) => {
      acc[error.category] = (acc[error.category] || 0) + 1;
      return acc;
    }, {} as Record<ErrorCategory, number>);

    const summaryParts = Object.entries(categoryCounts)
      .map(([category, count]) => `${count} ${category} error${count > 1 ? 's' : ''}`)
      .join(', ');

    return `Multiple errors occurred: ${summaryParts}`;
  },

  /**
   * Get highest severity from error list
   */
  getHighestSeverity: (errors: TransformedError[]): ErrorSeverity => {
    const severityOrder: ErrorSeverity[] = ['critical', 'error', 'warning', 'info'];
    
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