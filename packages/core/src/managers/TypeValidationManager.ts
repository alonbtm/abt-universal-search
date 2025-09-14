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

import {
  SearchConfiguration,
  SearchResult,
  GenericSearchResult,
  GenericValidator,
  ValidationErrorType,
  SearchResultType,
  DataSourceType,
  ThemeVariant,
  SearchEventType,
} from '../types/index';

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
export class TypeValidationManager {
  private config: TypeGuardConfig;
  private validationRules: Map<string, ValidationRule> = new Map();
  private validationCache: Map<string, { result: boolean; timestamp: number }> = new Map();
  private performanceMetrics: Map<string, number[]> = new Map();

  constructor(config?: Partial<TypeGuardConfig>) {
    this.config = {
      deep: true,
      strict: false,
      performance: {
        enableCaching: true,
        maxCacheSize: 1000,
        cacheTimeoutMs: 300000,
      },
      ...config,
    };

    this.initializeValidationRules();
  }

  /**
   * Initialize built-in validation rules
   * @private
   */
  private initializeValidationRules(): void {
    // String validation rules
    this.validationRules.set('string-required', {
      id: 'string-required',
      name: 'String Required',
      description: 'Value must be a non-empty string',
      validator: value => typeof value === 'string' && value.length > 0,
      errorMessage: 'Expected non-empty string',
      severity: 'error',
      required: true,
    });

    this.validationRules.set('string-optional', {
      id: 'string-optional',
      name: 'String Optional',
      description: 'Value must be a string or undefined',
      validator: value => value === undefined || typeof value === 'string',
      errorMessage: 'Expected string or undefined',
      severity: 'error',
      required: false,
    });

    // Number validation rules
    this.validationRules.set('number-required', {
      id: 'number-required',
      name: 'Number Required',
      description: 'Value must be a valid number',
      validator: value => typeof value === 'number' && !isNaN(value),
      errorMessage: 'Expected valid number',
      severity: 'error',
      required: true,
    });

    this.validationRules.set('number-positive', {
      id: 'number-positive',
      name: 'Positive Number',
      description: 'Value must be a positive number',
      validator: value => typeof value === 'number' && value > 0,
      errorMessage: 'Expected positive number',
      severity: 'error',
      required: true,
    });

    // Array validation rules
    this.validationRules.set('array-required', {
      id: 'array-required',
      name: 'Array Required',
      description: 'Value must be a non-empty array',
      validator: value => Array.isArray(value) && value.length > 0,
      errorMessage: 'Expected non-empty array',
      severity: 'error',
      required: true,
    });

    // Object validation rules
    this.validationRules.set('object-required', {
      id: 'object-required',
      name: 'Object Required',
      description: 'Value must be a valid object',
      validator: value => typeof value === 'object' && value !== null && !Array.isArray(value),
      errorMessage: 'Expected object',
      severity: 'error',
      required: true,
    });

    // URL validation rule
    this.validationRules.set('url-valid', {
      id: 'url-valid',
      name: 'Valid URL',
      description: 'Value must be a valid URL',
      validator: value => {
        if (typeof value !== 'string') return false;
        try {
          new URL(value);
          return true;
        } catch {
          return false;
        }
      },
      errorMessage: 'Expected valid URL',
      severity: 'error',
      required: true,
    });

    // Enum validation rules
    this.validationRules.set('search-result-type', {
      id: 'search-result-type',
      name: 'Search Result Type',
      description: 'Value must be a valid SearchResultType',
      validator: value => Object.values(SearchResultType).includes(value),
      errorMessage: value => `Expected SearchResultType, got: ${value}`,
      severity: 'error',
      required: true,
    });

    this.validationRules.set('data-source-type', {
      id: 'data-source-type',
      name: 'Data Source Type',
      description: 'Value must be a valid DataSourceType',
      validator: value => Object.values(DataSourceType).includes(value),
      errorMessage: value => `Expected DataSourceType, got: ${value}`,
      severity: 'error',
      required: true,
    });
  }

  /**
   * Validate SearchConfiguration object
   * @param config - Configuration to validate
   * @returns Validation result
   */
  public validateConfiguration(config: any): ValidationResult {
    const startTime = Date.now();
    const context: ValidationContext = {
      path: ['SearchConfiguration'],
      config: this.config,
      startTime,
      errors: [],
      warnings: [],
    };

    this.validateSearchConfigurationInternal(config, context);

    const endTime = Date.now();
    const validationTimeMs = endTime - startTime;

    return this.buildValidationResult(context, validationTimeMs);
  }

  /**
   * Validate SearchResult object
   * @param result - Search result to validate
   * @returns Validation result
   */
  public validateSearchResult(result: any): ValidationResult {
    const startTime = Date.now();
    const context: ValidationContext = {
      path: ['SearchResult'],
      config: this.config,
      startTime,
      errors: [],
      warnings: [],
    };

    this.validateSearchResultInternal(result, context);

    const endTime = Date.now();
    const validationTimeMs = endTime - startTime;

    return this.buildValidationResult(context, validationTimeMs);
  }

  /**
   * Validate array of SearchResults
   * @param results - Array of search results
   * @returns Validation result
   */
  public validateSearchResults(results: any): ValidationResult {
    const startTime = Date.now();
    const context: ValidationContext = {
      path: ['SearchResult[]'],
      config: this.config,
      startTime,
      errors: [],
      warnings: [],
    };

    if (!Array.isArray(results)) {
      this.addValidationError(context, {
        type: ValidationErrorType.INVALID_TYPE,
        path: context.path.join('.'),
        message: 'Expected array of SearchResults',
        actualValue: results,
        expectedType: 'SearchResult[]',
        severity: 'error',
      });
    } else {
      results.forEach((result, index) => {
        const resultContext = { ...context, path: [...context.path, index.toString()] };
        this.validateSearchResultInternal(result, resultContext);
      });
    }

    const endTime = Date.now();
    const validationTimeMs = endTime - startTime;

    return this.buildValidationResult(context, validationTimeMs);
  }

  /**
   * Create type guard function for custom types
   * @template T - Type to validate
   * @param validator - Validation function
   * @param errorMessage - Custom error message
   * @returns Type guard function
   */
  public createTypeGuard<T>(
    validator: GenericValidator<T>,
    errorMessage?: string
  ): GenericValidator<T> {
    return (value: any): value is T => {
      if (this.config.performance.enableCaching) {
        const cacheKey = `${validator.toString()}-${JSON.stringify(value)}`;
        const cached = this.validationCache.get(cacheKey);

        if (cached && Date.now() - cached.timestamp < this.config.performance.cacheTimeoutMs) {
          return cached.result;
        }

        const result = validator(value);

        if (this.validationCache.size >= this.config.performance.maxCacheSize) {
          this.clearOldCacheEntries();
        }

        this.validationCache.set(cacheKey, { result, timestamp: Date.now() });
        return result;
      }

      return validator(value);
    };
  }

  /**
   * Validate SearchConfiguration internal implementation
   * @param config - Configuration object
   * @param context - Validation context
   * @private
   */
  private validateSearchConfigurationInternal(config: any, context: ValidationContext): void {
    if (!this.validateRule('object-required', config, context)) return;

    // Validate dataSources
    const dataSourcesPath = [...context.path, 'dataSources'];
    if (
      !this.validateRule('array-required', config.dataSources, {
        ...context,
        path: dataSourcesPath,
      })
    ) {
      this.addValidationError(context, {
        type: ValidationErrorType.MISSING_REQUIRED,
        path: dataSourcesPath.join('.'),
        message: 'dataSources is required and must be a non-empty array',
        actualValue: config.dataSources,
        expectedType: 'DataSourceConfig[]',
        severity: 'error',
        suggestion: 'Add at least one data source configuration',
      });
    } else {
      config.dataSources.forEach((dataSource: any, index: number) => {
        this.validateDataSource(dataSource, {
          ...context,
          path: [...dataSourcesPath, index.toString()],
        });
      });
    }

    // Validate UI configuration (optional)
    if (config.ui !== undefined) {
      this.validateUIConfig(config.ui, {
        ...context,
        path: [...context.path, 'ui'],
      });
    }

    // Validate search configuration (optional)
    if (config.search !== undefined) {
      this.validateQueryConfig(config.search, {
        ...context,
        path: [...context.path, 'search'],
      });
    }

    // Validate performance configuration (optional)
    if (config.performance !== undefined) {
      this.validatePerformanceConfig(config.performance, {
        ...context,
        path: [...context.path, 'performance'],
      });
    }
  }

  /**
   * Validate SearchResult internal implementation
   * @param result - Search result object
   * @param context - Validation context
   * @private
   */
  private validateSearchResultInternal(result: any, context: ValidationContext): void {
    if (!this.validateRule('object-required', result, context)) return;

    // Validate required fields
    this.validateRule('string-required', result.id, {
      ...context,
      path: [...context.path, 'id'],
    });

    this.validateRule('string-required', result.title, {
      ...context,
      path: [...context.path, 'title'],
    });

    // Validate optional fields
    if (result.description !== undefined) {
      this.validateRule('string-optional', result.description, {
        ...context,
        path: [...context.path, 'description'],
      });
    }

    if (result.url !== undefined) {
      this.validateRule('url-valid', result.url, {
        ...context,
        path: [...context.path, 'url'],
      });
    }

    if (result.type !== undefined) {
      this.validateRule('search-result-type', result.type, {
        ...context,
        path: [...context.path, 'type'],
      });
    }

    if (result.score !== undefined) {
      const isValidScore =
        typeof result.score === 'number' && result.score >= 0 && result.score <= 1;

      if (!isValidScore) {
        this.addValidationError(context, {
          type: ValidationErrorType.OUT_OF_RANGE,
          path: [...context.path, 'score'].join('.'),
          message: 'Score must be a number between 0 and 1',
          actualValue: result.score,
          expectedType: 'number (0-1)',
          severity: 'error',
          suggestion: 'Provide a relevance score between 0.0 and 1.0',
        });
      }
    }
  }

  /**
   * Validate data source configuration
   * @param dataSource - Data source configuration
   * @param context - Validation context
   * @private
   */
  private validateDataSource(dataSource: any, context: ValidationContext): void {
    if (!this.validateRule('object-required', dataSource, context)) return;

    // Validate type field
    this.validateRule('data-source-type', dataSource.type, {
      ...context,
      path: [...context.path, 'type'],
    });

    // Type-specific validations
    if (dataSource.type === DataSourceType.API) {
      if (!dataSource.url) {
        this.addValidationError(context, {
          type: ValidationErrorType.MISSING_REQUIRED,
          path: [...context.path, 'url'].join('.'),
          message: 'URL is required for API data source',
          actualValue: dataSource.url,
          expectedType: 'string',
          severity: 'error',
          suggestion: 'Provide a valid API endpoint URL',
        });
      } else {
        this.validateRule('url-valid', dataSource.url, {
          ...context,
          path: [...context.path, 'url'],
        });
      }
    }

    if (dataSource.type === DataSourceType.STATIC && !dataSource.data) {
      this.addValidationError(context, {
        type: ValidationErrorType.MISSING_REQUIRED,
        path: [...context.path, 'data'].join('.'),
        message: 'Data is required for static data source',
        actualValue: dataSource.data,
        expectedType: 'any[]',
        severity: 'error',
        suggestion: 'Provide static data array',
      });
    }
  }

  /**
   * Validate UI configuration
   * @param ui - UI configuration
   * @param context - Validation context
   * @private
   */
  private validateUIConfig(ui: any, context: ValidationContext): void {
    if (!this.validateRule('object-required', ui, context)) return;

    if (ui.theme !== undefined) {
      const validThemes = Object.values(ThemeVariant);
      if (!validThemes.includes(ui.theme)) {
        this.addValidationError(context, {
          type: ValidationErrorType.INVALID_FORMAT,
          path: [...context.path, 'theme'].join('.'),
          message: `Invalid theme variant: ${ui.theme}`,
          actualValue: ui.theme,
          expectedType: `ThemeVariant (${validThemes.join(', ')})`,
          severity: 'error',
          suggestion: `Use one of: ${validThemes.join(', ')}`,
        });
      }
    }

    if (ui.maxResults !== undefined) {
      this.validateRule('number-positive', ui.maxResults, {
        ...context,
        path: [...context.path, 'maxResults'],
      });
    }
  }

  /**
   * Validate query configuration
   * @param query - Query configuration
   * @param context - Validation context
   * @private
   */
  private validateQueryConfig(query: any, context: ValidationContext): void {
    if (!this.validateRule('object-required', query, context)) return;

    if (query.minLength !== undefined) {
      if (
        !this.validateRule('number-positive', query.minLength, {
          ...context,
          path: [...context.path, 'minLength'],
        })
      ) {
        this.addValidationError(context, {
          type: ValidationErrorType.OUT_OF_RANGE,
          path: [...context.path, 'minLength'].join('.'),
          message: 'minLength must be a positive number',
          actualValue: query.minLength,
          expectedType: 'number > 0',
          severity: 'error',
          suggestion: 'Set minLength to a positive integer (e.g., 2)',
        });
      }
    }

    if (query.debounceDelay !== undefined) {
      if (
        !this.validateRule('number-required', query.debounceDelay, {
          ...context,
          path: [...context.path, 'debounceDelay'],
        }) ||
        query.debounceDelay < 0
      ) {
        this.addValidationError(context, {
          type: ValidationErrorType.OUT_OF_RANGE,
          path: [...context.path, 'debounceDelay'].join('.'),
          message: 'debounceDelay must be a non-negative number',
          actualValue: query.debounceDelay,
          expectedType: 'number >= 0',
          severity: 'error',
          suggestion: 'Set debounceDelay to 0 or higher (e.g., 300ms)',
        });
      }
    }
  }

  /**
   * Validate performance configuration
   * @param performance - Performance configuration
   * @param context - Validation context
   * @private
   */
  private validatePerformanceConfig(performance: any, context: ValidationContext): void {
    if (!this.validateRule('object-required', performance, context)) return;

    // All performance options are boolean and optional
    const booleanFields = ['cacheEnabled', 'virtualScrolling', 'lazy'];

    for (const field of booleanFields) {
      if (performance[field] !== undefined && typeof performance[field] !== 'boolean') {
        this.addValidationError(context, {
          type: ValidationErrorType.INVALID_TYPE,
          path: [...context.path, field].join('.'),
          message: `${field} must be a boolean`,
          actualValue: performance[field],
          expectedType: 'boolean',
          severity: 'error',
          suggestion: `Set ${field} to true or false`,
        });
      }
    }
  }

  /**
   * Validate using a specific rule
   * @param ruleId - Rule identifier
   * @param value - Value to validate
   * @param context - Validation context
   * @returns Whether validation passed
   * @private
   */
  private validateRule(ruleId: string, value: any, context: ValidationContext): boolean {
    const rule = this.validationRules.get(ruleId);
    if (!rule) {
      console.warn(`Unknown validation rule: ${ruleId}`);
      return true;
    }

    const isValid = rule.validator(value, context);

    if (!isValid) {
      const errorMessage =
        typeof rule.errorMessage === 'function'
          ? rule.errorMessage(value, context)
          : rule.errorMessage;

      this.addValidationError(context, {
        type: ValidationErrorType.VALIDATION_FAILED,
        path: context.path.join('.'),
        message: errorMessage,
        actualValue: value,
        expectedType: rule.description,
        severity: rule.severity,
        suggestion: rule.name,
      });
    }

    return isValid;
  }

  /**
   * Add validation error to context
   * @param context - Validation context
   * @param error - Validation error
   * @private
   */
  private addValidationError(context: ValidationContext, error: ValidationError): void {
    if (error.severity === 'error') {
      context.errors.push(error);
    } else {
      context.warnings.push(error);
    }
  }

  /**
   * Build final validation result
   * @param context - Validation context
   * @param validationTimeMs - Validation time in milliseconds
   * @returns Validation result
   * @private
   */
  private buildValidationResult(
    context: ValidationContext,
    validationTimeMs: number
  ): ValidationResult {
    const totalChecks =
      context.errors.length +
      context.warnings.length +
      Math.max(1, context.errors.length + context.warnings.length);
    const passedChecks = totalChecks - context.errors.length;
    const failedChecks = context.errors.length;

    return {
      isValid: context.errors.length === 0,
      errors: context.errors,
      warnings: context.warnings,
      summary: {
        totalChecks,
        passedChecks,
        failedChecks,
        warningCount: context.warnings.length,
      },
      performance: {
        validationTimeMs,
        checksPerSecond:
          validationTimeMs > 0 ? Math.round((totalChecks / validationTimeMs) * 1000) : 0,
      },
    };
  }

  /**
   * Clear old cache entries to maintain cache size limit
   * @private
   */
  private clearOldCacheEntries(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.validationCache.entries()) {
      if (now - entry.timestamp > this.config.performance.cacheTimeoutMs) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.validationCache.delete(key));

    // If still at capacity, remove oldest entries
    if (this.validationCache.size >= this.config.performance.maxCacheSize) {
      const sortedEntries = Array.from(this.validationCache.entries()).sort(
        (a, b) => a[1].timestamp - b[1].timestamp
      );

      const toRemove = sortedEntries.slice(
        0,
        Math.floor(this.config.performance.maxCacheSize * 0.2)
      );
      toRemove.forEach(([key]) => this.validationCache.delete(key));
    }
  }

  /**
   * Get validation statistics
   * @returns Validation manager statistics
   */
  public getStatistics(): {
    rules: number;
    cacheSize: number;
    cacheHitRate: number;
    averageValidationTime: number;
    totalValidations: number;
  } {
    const totalValidations = Array.from(this.performanceMetrics.values()).reduce(
      (sum, times) => sum + times.length,
      0
    );

    const allTimes = Array.from(this.performanceMetrics.values()).flat();

    const averageValidationTime =
      allTimes.length > 0 ? allTimes.reduce((sum, time) => sum + time, 0) / allTimes.length : 0;

    return {
      rules: this.validationRules.size,
      cacheSize: this.validationCache.size,
      cacheHitRate: 0, // Would need to track cache hits vs misses
      averageValidationTime,
      totalValidations,
    };
  }

  /**
   * Clear all caches and reset metrics
   */
  public clearCaches(): void {
    this.validationCache.clear();
    this.performanceMetrics.clear();
  }

  /**
   * Add custom validation rule
   * @param rule - Validation rule to add
   */
  public addValidationRule(rule: ValidationRule): void {
    this.validationRules.set(rule.id, rule);
  }

  /**
   * Remove validation rule
   * @param ruleId - Rule identifier to remove
   */
  public removeValidationRule(ruleId: string): void {
    this.validationRules.delete(ruleId);
  }

  /**
   * Get all validation rules
   * @returns Array of validation rules
   */
  public getAllValidationRules(): ValidationRule[] {
    return Array.from(this.validationRules.values());
  }
}
