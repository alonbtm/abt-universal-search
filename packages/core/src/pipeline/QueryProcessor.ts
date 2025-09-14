/**
 * Query Processor - Basic Query Processing and Validation
 * @description Handles basic query normalization, validation, and debouncing
 */

import { ValidationError } from '../utils/validation';
import { validateQuerySecurity, sanitizeInput, type SecurityValidationResult } from '../utils/security';
import { performanceTracker, analyzePerformance } from '../utils/performance';

/**
 * Enhanced query configuration with security and performance features
 */
export interface QueryConfig {
  minLength: number;
  debounceMs: number;
  triggerOn: 'change' | 'enter' | 'both';
  caseSensitive: boolean;
  matchMode: 'exact' | 'partial' | 'fuzzy';
  // Security options
  enableSecurityValidation?: boolean;
  enableXSSProtection?: boolean;
  enableSQLInjectionProtection?: boolean;
  // Performance options
  enablePerformanceMonitoring?: boolean;
  // Validation options
  customValidators?: ValidationRule[];
  // Enhanced features (AC 2, 4, 5)
  debounceStrategy?: 'leading' | 'trailing' | 'both';
  caseNormalization?: 'lowercase' | 'uppercase' | 'preserve';
  enableStemming?: boolean;
  enablePreprocessing?: boolean;
  localization?: {
    language: string;
    messages: Record<string, string>;
  };
}

/**
 * Custom validation rule interface
 */
export interface ValidationRule {
  name: string;
  validator: (query: string) => boolean;
  errorMessage: string;
}

/**
 * Processed query result with enhanced metadata
 */
export interface ProcessedQuery {
  original: string;
  normalized: string;
  sanitized?: string;
  isValid: boolean;
  error?: string;
  securityInfo?: SecurityValidationResult;
  metadata: {
    processingTime: number;
    originalQuery: string;
    length: number;
    trimmed: boolean;
    timestamp: number;
    performanceId?: string;
    validationRulesApplied?: string[];
  };
}

/**
 * Enhanced validation result with user-friendly messages (AC 5)
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
  userFriendlyMessage?: string;
  localizedMessages?: Record<string, string>;
  validationContext?: {
    field: string;
    value: any;
    rule: string;
  };
}

/**
 * Enhanced Query processor with comprehensive validation and advanced features
 */
export class QueryProcessor {
  private readonly config: QueryConfig;
  private debounceTimer: number | null = null;
  private leadingTimer: number | null = null;
  private queryCounter = 0;
  private lastExecutionTime = 0;

  constructor(config: QueryConfig) {
    // Apply defaults for new features
    this.config = {
      enableSecurityValidation: true,
      enableXSSProtection: true,
      enableSQLInjectionProtection: true,
      enablePerformanceMonitoring: true,
      customValidators: [],
      debounceStrategy: 'trailing',
      caseNormalization: 'lowercase',
      enableStemming: false,
      enablePreprocessing: true,
      localization: {
        language: 'en',
        messages: {
          'minLength': 'Please enter at least {minLength} characters',
          'maxLength': 'Query is too long (maximum {maxLength} characters)',
          'invalidChars': 'Query contains invalid characters',
          'securityThreat': 'Query contains potentially harmful content'
        }
      },
      ...config
    };
    this.validateConfig();
  }

  /**
   * Process and validate a search query with enhanced security and performance monitoring
   */
  public processQuery(query: string): ProcessedQuery {
    const operationId = `query-${++this.queryCounter}`;
    const startTime = performance.now();
    const timestamp = Date.now();
    const validationRulesApplied: string[] = [];
    
    // Start performance monitoring if enabled
    if (this.config.enablePerformanceMonitoring) {
      performanceTracker.startTracking(
        operationId, 
        typeof query === 'string' ? query.length : 0,
        (this.config.customValidators?.length || 0) + 1 // +1 for basic validation
      );
    }
    
    const original = query;
    
    // Validate input type
    if (typeof query !== 'string') {
      const errorMetadata = {
        processingTime: performance.now() - startTime,
        originalQuery: String(original),
        length: 0,
        trimmed: false,
        timestamp,
        ...(this.config.enablePerformanceMonitoring && { performanceId: operationId }),
        validationRulesApplied: ['type-validation']
      };
      
      if (this.config.enablePerformanceMonitoring) {
        performanceTracker.endTracking(operationId);
      }
      
      return this.createErrorResult(original, 'Query must be a string', errorMetadata);
    }

    // Basic normalization
    const trimmed = query.trim();
    let normalized = this.normalizeQuery(trimmed);
    validationRulesApplied.push('normalization');
    
    // Security validation and sanitization
    let securityInfo: SecurityValidationResult | undefined;
    let sanitized: string | undefined;
    
    if (this.config.enableSecurityValidation) {
      securityInfo = validateQuerySecurity(normalized, {
        xssProtection: this.config.enableXSSProtection,
        sqlInjectionProtection: this.config.enableSQLInjectionProtection
      });
      
      validationRulesApplied.push('security-validation');
      
      // Always use sanitized version when security is enabled
      sanitized = securityInfo.sanitized;
      
      // If security threats detected, use sanitized version for further processing
      if (!securityInfo.isSecure) {
        normalized = sanitized; // Use sanitized version for validation
        validationRulesApplied.push('sanitization');
      }
    }
    
    // Basic validation
    const basicValidationResult = this.validateQuery(normalized);
    validationRulesApplied.push('basic-validation');
    
    // Custom validation rules
    const customValidationErrors: string[] = [];
    if (this.config.customValidators && this.config.customValidators.length > 0) {
      for (const rule of this.config.customValidators) {
        if (!rule.validator(normalized)) {
          customValidationErrors.push(rule.errorMessage);
          validationRulesApplied.push(`custom-${rule.name}`);
        }
      }
    }
    
    // Combine validation results
    const allErrors = [...basicValidationResult.errors, ...customValidationErrors];
    const isValid = allErrors.length === 0 && (securityInfo?.isSecure !== false);
    
    const processingTime = performance.now() - startTime;
    
    // End performance monitoring
    if (this.config.enablePerformanceMonitoring) {
      performanceTracker.endTracking(operationId);
    }
    
    const result: ProcessedQuery = {
      original,
      normalized,
      ...(sanitized && { sanitized }),
      isValid,
      ...(allErrors.length > 0 && { error: allErrors[0] }),
      ...(securityInfo && { securityInfo }),
      metadata: {
        processingTime,
        originalQuery: original,
        length: normalized.length,
        trimmed: original !== trimmed,
        timestamp,
        ...(this.config.enablePerformanceMonitoring && { performanceId: operationId }),
        validationRulesApplied
      }
    };

    return result;
  }

  /**
   * Validate input with detailed error information
   */
  public validateInput(input: string): ValidationResult {
    if (typeof input !== 'string') {
      return {
        isValid: false,
        errors: ['Query must be a string']
      };
    }

    const trimmed = input.trim();
    const normalized = this.normalizeQuery(trimmed);
    
    return this.validateQuery(normalized);
  }

  /**
   * Determine if search should be triggered based on trigger mode
   */
  public shouldTriggerSearch(_input: string, triggerType: 'change' | 'enter' = 'change'): boolean {
    const config = this.config.triggerOn;
    
    if (config === 'both') {
      return true;
    }
    
    if (config === 'change' && triggerType === 'change') {
      return true;
    }
    
    if (config === 'enter' && triggerType === 'enter') {
      return true;
    }
    
    return false;
  }

  /**
   * Execute debounced search with advanced strategies (AC 2)
   */
  public debouncedProcess(
    query: string, 
    callback: (_result: ProcessedQuery) => void,
    triggerType: 'change' | 'enter' = 'change'
  ): void {
    if (!this.shouldTriggerSearch(query, triggerType)) {
      return;
    }

    if (this.config.debounceMs <= 0) {
      // Execute immediately if no debouncing configured
      const result = this.processQuery(query);
      callback(result);
      return;
    }

    const now = Date.now();
    const strategy = this.config.debounceStrategy || 'trailing';

    switch (strategy) {
      case 'leading':
        this.executeLeadingDebounce(query, callback, now);
        break;
      case 'trailing':
        this.executeTrailingDebounce(query, callback);
        break;
      case 'both':
        this.executeBothDebounce(query, callback, now);
        break;
      default:
        this.executeTrailingDebounce(query, callback);
    }
  }

  /**
   * Leading debounce - execute immediately, then ignore subsequent calls (AC 2)
   */
  private executeLeadingDebounce(query: string, callback: (_result: ProcessedQuery) => void, now: number): void {
    const timeSinceLastExecution = now - this.lastExecutionTime;
    
    if (timeSinceLastExecution >= this.config.debounceMs) {
      // Execute immediately
      const result = this.processQuery(query);
      callback(result);
      this.lastExecutionTime = now;
      
      // Set timer to reset the leading edge
      if (this.leadingTimer) {
        clearTimeout(this.leadingTimer);
      }
      
      this.leadingTimer = window.setTimeout(() => {
        this.leadingTimer = null;
      }, this.config.debounceMs);
    }
  }

  /**
   * Trailing debounce - wait for pause, then execute (AC 2)
   */
  private executeTrailingDebounce(query: string, callback: (_result: ProcessedQuery) => void): void {
    // Clear existing timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // Set new timer
    this.debounceTimer = window.setTimeout(() => {
      const result = this.processQuery(query);
      callback(result);
      this.debounceTimer = null;
      this.lastExecutionTime = Date.now();
    }, this.config.debounceMs);
  }

  /**
   * Both debounce - execute immediately and after pause (AC 2)
   */
  private executeBothDebounce(query: string, callback: (_result: ProcessedQuery) => void, now: number): void {
    const timeSinceLastExecution = now - this.lastExecutionTime;
    
    // Leading edge - execute immediately if enough time has passed
    if (timeSinceLastExecution >= this.config.debounceMs && !this.leadingTimer) {
      const result = this.processQuery(query);
      callback(result);
      this.lastExecutionTime = now;
      
      // Set leading timer to prevent immediate re-execution
      this.leadingTimer = window.setTimeout(() => {
        this.leadingTimer = null;
      }, this.config.debounceMs);
    }
    
    // Trailing edge - always set/reset trailing timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    
    this.debounceTimer = window.setTimeout(() => {
      const result = this.processQuery(query);
      callback(result);
      this.debounceTimer = null;
      this.lastExecutionTime = Date.now();
    }, this.config.debounceMs);
  }

  /**
   * Cancel any pending debounced operations (AC 2)
   */
  public cancelPendingOperations(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    
    if (this.leadingTimer) {
      clearTimeout(this.leadingTimer);
      this.leadingTimer = null;
    }
  }

  /**
   * Clean up resources
   */
  public destroy(): void {
    this.cancelPendingOperations();
  }

  /**
   * Get current configuration
   */
  public getConfig(): Readonly<QueryConfig> {
    return { ...this.config };
  }

  /**
   * Get performance metrics for query processing (AC 6)
   */
  public getPerformanceMetrics(operationId?: string): any {
    if (!this.config.enablePerformanceMonitoring) {
      return [];
    }
    
    if (operationId) {
      return performanceTracker.getMetrics(operationId);
    }
    
    return performanceTracker.getAllMetrics('query');
  }

  /**
   * Get performance recommendations based on collected metrics (AC 6)
   */
  public getPerformanceRecommendations(): any {
    if (!this.config.enablePerformanceMonitoring) {
      return [];
    }
    
    const allMetrics = this.getPerformanceMetrics();
    return analyzePerformance(allMetrics);
  }

  /**
   * Clear all performance metrics
   */
  public clearPerformanceMetrics(): void {
    if (this.config.enablePerformanceMonitoring) {
      performanceTracker.clearMetrics();
    }
  }

  /**
   * Enhanced query normalization with preprocessing and stemming (AC 4)
   */
  private normalizeQuery(query: string): string {
    let normalized = query;

    // Always trim whitespace
    normalized = normalized.trim();

    // Preprocessing step (AC 4)
    if (this.config.enablePreprocessing) {
      // Remove multiple consecutive spaces
      normalized = normalized.replace(/\s+/g, ' ');
      
      // Special character handling and encoding
      normalized = normalized.replace(/[\r\n\t]/g, ' ');
      
      // Remove common punctuation that doesn't affect search
      normalized = normalized.replace(/[.,;:!?'"()[\]{}]/g, '');
      
      // Normalize Unicode characters
      normalized = normalized.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }

    // Apply case normalization based on configuration (AC 4)
    switch (this.config.caseNormalization) {
      case 'lowercase':
        normalized = normalized.toLowerCase();
        break;
      case 'uppercase':
        normalized = normalized.toUpperCase();
        break;
      case 'preserve':
        // Keep original case
        break;
      default:
        // Fallback to existing logic
        if (!this.config.caseSensitive) {
          normalized = normalized.toLowerCase();
        }
    }

    // Basic stemming (AC 4) - simple English stemming
    if (this.config.enableStemming) {
      normalized = this.applyStemming(normalized);
    }

    return normalized;
  }

  /**
   * Apply basic stemming to query terms (AC 4)
   */
  private applyStemming(query: string): string {
    return query.split(' ').map(word => {
      // Basic English stemming rules
      if (word.length <= 2) return word;
      
      // Remove common suffixes
      if (word.endsWith('ing')) {
        return word.slice(0, -3);
      } else if (word.endsWith('ed')) {
        return word.slice(0, -2);
      } else if (word.endsWith('er')) {
        return word.slice(0, -2);
      } else if (word.endsWith('est')) {
        return word.slice(0, -3);
      } else if (word.endsWith('ly')) {
        return word.slice(0, -2);
      } else if (word.endsWith('s') && !word.endsWith('ss')) {
        return word.slice(0, -1);
      }
      
      return word;
    }).join(' ');
  }

  /**
   * Enhanced query validation with user-friendly messages (AC 5)
   */
  private validateQuery(query: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let userFriendlyMessage = '';
    const localizedMessages: Record<string, string> = {};

    // Validate minimum length (AC 1: default 3 characters)
    if (query.length < this.config.minLength) {
      const errorMsg = `Query must be at least ${this.config.minLength} characters long`;
      errors.push(errorMsg);
      
      // User-friendly message with localization (AC 5)
      userFriendlyMessage = this.getLocalizedMessage('minLength', { 
        minLength: this.config.minLength.toString() 
      });
      
      localizedMessages.en = userFriendlyMessage;
      if (this.config.localization?.language !== 'en') {
        localizedMessages[this.config.localization?.language || 'en'] = 
          this.config.localization?.messages['minLength']?.replace('{minLength}', this.config.minLength.toString()) || userFriendlyMessage;
      }
    }

    // Validate maximum length
    if (query.length > 500) {
      const errorMsg = 'Query is too long (maximum 500 characters)';
      errors.push(errorMsg);
      
      userFriendlyMessage = this.getLocalizedMessage('maxLength', { 
        maxLength: '500' 
      });
      
      localizedMessages.en = userFriendlyMessage;
      if (this.config.localization?.language !== 'en') {
        localizedMessages[this.config.localization?.language || 'en'] = 
          this.config.localization?.messages['maxLength']?.replace('{maxLength}', '500') || userFriendlyMessage;
      }
    }

    // Character validation warnings
    if (query.includes('<') || query.includes('>') || query.includes('&')) {
      warnings.push('Query contains special characters that may be filtered');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined,
      userFriendlyMessage: userFriendlyMessage || undefined,
      localizedMessages: Object.keys(localizedMessages).length > 0 ? localizedMessages : undefined,
      validationContext: {
        field: 'query',
        value: query,
        rule: errors.length > 0 ? 'length-validation' : 'valid'
      }
    };
  }

  /**
   * Get localized validation message (AC 5)
   */
  private getLocalizedMessage(key: string, params: Record<string, string> = {}): string {
    const template = this.config.localization?.messages[key] || 
      (key === 'minLength' ? 'Please enter at least {minLength} characters' : 
       key === 'maxLength' ? 'Query is too long (maximum {maxLength} characters)' : 
       'Invalid input');
    
    let message = template;
    for (const [param, value] of Object.entries(params)) {
      message = message.replace(`{${param}}`, value);
    }
    
    return message;
  }

  /**
   * Create error result with metadata
   */
  private createErrorResult(original: string, error: string, metadata: ProcessedQuery['metadata']): ProcessedQuery {
    return {
      original,
      normalized: '',
      isValid: false,
      error,
      metadata
    };
  }

  /**
   * Validate processor configuration
   */
  private validateConfig(): void {
    if (typeof this.config.minLength !== 'number' || this.config.minLength < 0) {
      throw new ValidationError('minLength must be a non-negative number', 'minLength');
    }

    if (this.config.minLength > 100) {
      throw new ValidationError('minLength cannot exceed 100 characters', 'minLength');
    }

    if (typeof this.config.debounceMs !== 'number' || this.config.debounceMs < 0) {
      throw new ValidationError('debounceMs must be a non-negative number', 'debounceMs');
    }

    if (!['change', 'enter', 'both'].includes(this.config.triggerOn)) {
      throw new ValidationError('triggerOn must be one of: change, enter, both', 'triggerOn');
    }

    if (!['exact', 'partial', 'fuzzy'].includes(this.config.matchMode)) {
      throw new ValidationError('matchMode must be one of: exact, partial, fuzzy', 'matchMode');
    }
  }
}