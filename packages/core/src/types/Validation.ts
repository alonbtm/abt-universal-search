/**
 * Validation Types - Type definitions for input validation and rules
 * @description TypeScript interfaces for validation rules, results, and configuration
 */

/**
 * Validation severity levels
 */
export type ValidationSeverity = 'error' | 'warning' | 'info';

/**
 * Validation result interface
 */
export interface ValidationResult {
  /** Whether validation passed */
  isValid: boolean;
  /** Validation errors */
  errors: ValidationError[];
  /** Validation warnings */
  warnings: ValidationWarning[];
  /** Processing time in milliseconds */
  processingTime: number;
  /** Validation context */
  context?: ValidationContext;
}

/**
 * Validation error interface
 */
export interface ValidationError {
  /** Error code */
  code: string;
  /** Error message */
  message: string;
  /** Field that failed validation */
  field?: string;
  /** Position in input where error occurred */
  position?: number;
  /** Length of invalid content */
  length?: number;
  /** Suggested fix */
  suggestion?: string;
  /** Validation rule that failed */
  rule?: string;
}

/**
 * Validation warning interface
 */
export interface ValidationWarning {
  /** Warning code */
  code: string;
  /** Warning message */
  message: string;
  /** Field that triggered warning */
  field?: string;
  /** Recommendation */
  recommendation?: string;
}

/**
 * Validation context interface
 */
export interface ValidationContext {
  /** Field name being validated */
  fieldName: string;
  /** Input type */
  inputType: 'query' | 'url' | 'email' | 'text' | 'custom';
  /** Validation timestamp */
  timestamp: number;
  /** Additional context data */
  metadata: Record<string, unknown>;
}

/**
 * Base validation rule interface
 */
export interface ValidationRule {
  /** Rule name/identifier */
  name: string;
  /** Rule description */
  description: string;
  /** Validation function */
  validate: (value: unknown, context?: ValidationContext) => Promise<ValidationRuleResult> | ValidationRuleResult;
  /** Rule severity */
  severity: ValidationSeverity;
  /** Whether rule is enabled */
  enabled: boolean;
  /** Rule configuration */
  config?: Record<string, unknown>;
}

/**
 * Validation rule result
 */
export interface ValidationRuleResult {
  /** Whether rule passed */
  passed: boolean;
  /** Error message if failed */
  message?: string;
  /** Suggestion for fixing */
  suggestion?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Regex-based validation rule
 */
export interface RegexValidationRule extends ValidationRule {
  /** Regular expression pattern */
  pattern: RegExp;
  /** Flags for regex */
  flags?: string;
  /** Whether to allow partial matches */
  allowPartialMatch?: boolean;
}

/**
 * Length validation rule
 */
export interface LengthValidationRule extends ValidationRule {
  /** Minimum length */
  minLength?: number;
  /** Maximum length */
  maxLength?: number;
  /** Trim before validation */
  trimWhitespace?: boolean;
}

/**
 * Custom validation rule
 */
export interface CustomValidationRule extends ValidationRule {
  /** Custom validation function */
  customValidator: (value: unknown, context?: ValidationContext) => Promise<boolean> | boolean;
  /** Custom error message generator */
  errorMessageGenerator?: (value: unknown) => string;
}

/**
 * Validation rule set
 */
export interface ValidationRuleSet {
  /** Rule set name */
  name: string;
  /** Rule set description */
  description: string;
  /** List of validation rules */
  rules: ValidationRule[];
  /** Whether to stop on first error */
  stopOnFirstError: boolean;
  /** Rule execution order */
  executionOrder: 'parallel' | 'sequential';
}

/**
 * Input validation configuration
 */
export interface InputValidationConfig {
  /** Enable validation */
  enabled: boolean;
  /** Validation rules to apply */
  rules: ValidationRule[];
  /** Global validation settings */
  settings: {
    /** Timeout for validation in ms */
    timeout: number;
    /** Maximum concurrent validations */
    maxConcurrentValidations: number;
    /** Cache validation results */
    cacheResults: boolean;
    /** Cache TTL in ms */
    cacheTTL: number;
  };
  /** Error handling configuration */
  errorHandling: {
    /** Throw errors or collect them */
    throwOnError: boolean;
    /** Include stack traces */
    includeStackTrace: boolean;
    /** Log validation errors */
    logErrors: boolean;
  };
}

/**
 * Validation performance metrics
 */
export interface ValidationMetrics {
  /** Total validations performed */
  totalValidations: number;
  /** Successful validations */
  successfulValidations: number;
  /** Failed validations */
  failedValidations: number;
  /** Average validation time */
  averageValidationTime: number;
  /** Validation cache hit rate */
  cacheHitRate: number;
  /** Validations by rule */
  validationsByRule: Record<string, number>;
  /** Performance statistics */
  performance: {
    fastest: number;
    slowest: number;
    totalTime: number;
    concurrentPeak: number;
  };
}

/**
 * Predefined validation types
 */
export enum ValidationType {
  EMAIL = 'email',
  URL = 'url',
  SEARCH_QUERY = 'search_query',
  SQL_SAFE = 'sql_safe',
  XSS_SAFE = 'xss_safe',
  ALPHANUMERIC = 'alphanumeric',
  NUMERIC = 'numeric',
  CUSTOM = 'custom'
}

/**
 * Validation event interface
 */
export interface ValidationEvent {
  /** Event type */
  type: 'validation_started' | 'validation_completed' | 'validation_failed' | 'rule_executed';
  /** Event timestamp */
  timestamp: number;
  /** Validation context */
  context: ValidationContext;
  /** Event data */
  data: {
    ruleName?: string;
    processingTime?: number;
    result?: ValidationRuleResult;
    error?: Error;
  };
}