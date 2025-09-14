/**
 * InputValidator - Regex-based input validation with configurable rules
 * @description Comprehensive input validation system with custom rule support
 */

import { SecurityValidationResult, SecurityError, SecurityWarning, LengthValidationConfig } from '../types/Security';

/**
 * Validation rule interface
 */
export interface ValidationRule {
  name: string;
  pattern: RegExp;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  required?: boolean;
  transform?: (value: string) => string;
}

/**
 * Validation context for rule evaluation
 */
export interface ValidationContext {
  fieldName?: string;
  allowEmpty?: boolean;
  customRules?: ValidationRule[];
  lengthConfig?: LengthValidationConfig;
}

/**
 * Default validation rules for search queries
 */
const DEFAULT_SEARCH_RULES: ValidationRule[] = [
  {
    name: 'no_sql_keywords',
    pattern: /\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|EXEC)\b/i,
    message: 'SQL keywords are not allowed in search queries',
    severity: 'high'
  },
  {
    name: 'no_script_tags',
    pattern: /<script[^>]*>.*?<\/script>/i,
    message: 'Script tags are not allowed',
    severity: 'high'
  },
  {
    name: 'basic_characters',
    pattern: /^[a-zA-Z0-9\s\-_.@#$%&*()+=[\]{}|;:'"<>?/\\,!~`^]*$/,
    message: 'Contains invalid characters',
    severity: 'medium'
  },
  {
    name: 'no_null_bytes',
    pattern: /\0|%00/,
    message: 'Null bytes are not allowed',
    severity: 'critical'
  }
];

/**
 * Email validation rule
 */
const EMAIL_RULE: ValidationRule = {
  name: 'email_format',
  pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  message: 'Invalid email format',
  severity: 'medium'
};

/**
 * URL validation rule
 */
const URL_RULE: ValidationRule = {
  name: 'url_format',
  pattern: /^https?:\/\/[^\s/$.?#].[^\s]*$/i,
  message: 'Invalid URL format',
  severity: 'medium'
};

/**
 * Input validator with configurable rules
 */
export class InputValidator {
  private rules: ValidationRule[];
  private lengthConfig: LengthValidationConfig;

  constructor(
    customRules?: ValidationRule[],
    lengthConfig?: LengthValidationConfig
  ) {
    this.rules = customRules || DEFAULT_SEARCH_RULES;
    this.lengthConfig = lengthConfig || {
      minLength: 0,
      maxLength: 1000,
      bufferLimit: 10000,
      onExceeded: 'reject'
    };
  }

  /**
   * Validate input against all configured rules
   */
  public validate(input: string, context?: ValidationContext): SecurityValidationResult {
    const errors: SecurityError[] = [];
    const warnings: SecurityWarning[] = [];

    if (input === null || input === undefined) {
      if (context?.allowEmpty !== true) {
        errors.push({
          type: 'encoding_issue',
          message: 'Input cannot be null or undefined',
          severity: 'high',
          suggestion: 'Provide a valid string input'
        });
      }
      return this.buildResult(errors, warnings);
    }

    if (typeof input !== 'string') {
      errors.push({
        type: 'encoding_issue',
        message: 'Input must be a string',
        severity: 'high',
        suggestion: 'Convert input to string before validation'
      });
      return this.buildResult(errors, warnings);
    }

    // Length validation
    const lengthErrors = this.validateLength(input, context?.lengthConfig);
    errors.push(...lengthErrors);

    // Apply validation rules
    const rulesToApply = context?.customRules || this.rules;
    const ruleResults = this.applyValidationRules(input, rulesToApply);
    errors.push(...ruleResults.errors);
    warnings.push(...ruleResults.warnings);

    // Character encoding validation
    const encodingWarnings = this.validateEncoding(input);
    warnings.push(...encodingWarnings);

    return this.buildResult(errors, warnings);
  }

  /**
   * Validate string length against configuration
   */
  private validateLength(input: string, config?: LengthValidationConfig): SecurityError[] {
    const errors: SecurityError[] = [];
    const lengthConfig = config || this.lengthConfig;

    if (input.length < lengthConfig.minLength) {
      errors.push({
        type: 'buffer_overflow',
        message: `Input too short: ${input.length} < ${lengthConfig.minLength}`,
        severity: 'medium',
        suggestion: `Provide at least ${lengthConfig.minLength} characters`
      });
    }

    if (input.length > lengthConfig.maxLength) {
      const severity = lengthConfig.onExceeded === 'reject' ? 'high' : 'medium';
      errors.push({
        type: 'buffer_overflow',
        message: `Input too long: ${input.length} > ${lengthConfig.maxLength}`,
        severity,
        suggestion: `Limit input to ${lengthConfig.maxLength} characters`
      });
    }

    if (input.length > lengthConfig.bufferLimit) {
      errors.push({
        type: 'buffer_overflow',
        message: `Input exceeds buffer limit: ${input.length} > ${lengthConfig.bufferLimit}`,
        severity: 'critical',
        suggestion: 'Input size poses security risk'
      });
    }

    return errors;
  }

  /**
   * Apply validation rules to input
   */
  private applyValidationRules(input: string, rules: ValidationRule[]): {
    errors: SecurityError[];
    warnings: SecurityWarning[];
  } {
    const errors: SecurityError[] = [];
    const warnings: SecurityWarning[] = [];

    rules.forEach(rule => {
      const match = input.match(rule.pattern);
      
      if (rule.name === 'basic_characters') {
        // For whitelist rules, no match means invalid
        if (!match) {
          errors.push({
            type: 'malicious_pattern',
            message: rule.message,
            severity: rule.severity,
            suggestion: 'Remove invalid characters from input'
          });
        }
      } else {
        // For blacklist rules, match means invalid
        if (match) {
          const errorType = this.getErrorType(rule.name);
          
          if (rule.severity === 'critical' || rule.severity === 'high') {
            errors.push({
              type: errorType,
              message: rule.message,
              severity: rule.severity,
              position: match.index,
              length: match[0].length,
              suggestion: `Remove or escape: ${match[0]}`
            });
          } else {
            warnings.push({
              type: 'suspicious_pattern',
              message: rule.message,
              position: match.index,
              recommendation: `Review pattern: ${match[0]}`
            });
          }
        }
      }
    });

    return { errors, warnings };
  }

  /**
   * Validate character encoding
   */
  private validateEncoding(input: string): SecurityWarning[] {
    const warnings: SecurityWarning[] = [];

    // Check for unusual Unicode characters
    const unusualUnicode = /[\u0000-\u001F\u007F-\u009F\uFEFF]/g;
    const unicodeMatches = input.match(unusualUnicode);
    if (unicodeMatches) {
      warnings.push({
        type: 'unusual_encoding',
        message: 'Unusual Unicode characters detected',
        recommendation: 'Review Unicode characters for potential security issues'
      });
    }

    // Check for mixed encoding
    const hasHighAscii = /[\u0080-\u00FF]/.test(input);
    const hasUnicode = /[\u0100-\uFFFF]/.test(input);
    if (hasHighAscii && hasUnicode) {
      warnings.push({
        type: 'unusual_encoding',
        message: 'Mixed character encoding detected',
        recommendation: 'Normalize character encoding'
      });
    }

    // Check for potential homograph attacks
    const suspiciousChars = /[а-я].*[a-z]|[a-z].*[а-я]/; // Cyrillic mixed with Latin
    if (suspiciousChars.test(input)) {
      warnings.push({
        type: 'character_concern',
        message: 'Potential homograph attack detected',
        recommendation: 'Review mixed script usage'
      });
    }

    return warnings;
  }

  /**
   * Map rule names to error types
   */
  private getErrorType(ruleName: string): SecurityError['type'] {
    const typeMap: { [key: string]: SecurityError['type'] } = {
      'no_sql_keywords': 'sql_injection',
      'no_script_tags': 'xss',
      'no_null_bytes': 'buffer_overflow',
      'basic_characters': 'malicious_pattern'
    };

    return typeMap[ruleName] || 'malicious_pattern';
  }

  /**
   * Build validation result
   */
  private buildResult(errors: SecurityError[], warnings: SecurityWarning[]): SecurityValidationResult {
    const riskLevel = this.calculateRiskLevel(errors);
    const recommendations = this.generateRecommendations(errors, warnings);

    return {
      isSecure: errors.length === 0,
      errors,
      warnings,
      riskLevel,
      recommendations
    };
  }

  /**
   * Calculate risk level based on errors
   */
  private calculateRiskLevel(errors: SecurityError[]): 'low' | 'medium' | 'high' | 'critical' {
    if (errors.length === 0) return 'low';
    
    const severities = errors.map(e => e.severity);
    if (severities.includes('critical')) return 'critical';
    if (severities.includes('high')) return 'high';
    if (severities.includes('medium')) return 'medium';
    return 'low';
  }

  /**
   * Generate recommendations based on validation results
   */
  private generateRecommendations(errors: SecurityError[], warnings: SecurityWarning[]): string[] {
    const recommendations: string[] = [];

    if (errors.some(e => e.type === 'sql_injection')) {
      recommendations.push('Remove SQL keywords and use parameterized queries');
    }

    if (errors.some(e => e.type === 'xss')) {
      recommendations.push('Remove script tags and sanitize HTML content');
    }

    if (errors.some(e => e.type === 'buffer_overflow')) {
      recommendations.push('Reduce input length to acceptable limits');
    }

    if (warnings.some(w => w.type === 'unusual_encoding')) {
      recommendations.push('Normalize character encoding and review Unicode usage');
    }

    if (errors.length > 0) {
      recommendations.push('Review and sanitize input before processing');
    }

    return [...new Set(recommendations)];
  }

  /**
   * Validate email format
   */
  public validateEmail(email: string): SecurityValidationResult {
    return this.validate(email, {
      customRules: [EMAIL_RULE],
      allowEmpty: false
    });
  }

  /**
   * Validate URL format
   */
  public validateUrl(url: string): SecurityValidationResult {
    return this.validate(url, {
      customRules: [URL_RULE],
      allowEmpty: false
    });
  }

  /**
   * Validate search query with specific rules
   */
  public validateSearchQuery(query: string): SecurityValidationResult {
    return this.validate(query, {
      customRules: DEFAULT_SEARCH_RULES,
      lengthConfig: {
        minLength: 1,
        maxLength: 500,
        bufferLimit: 1000,
        onExceeded: 'reject'
      }
    });
  }

  /**
   * Add custom validation rule
   */
  public addRule(rule: ValidationRule): void {
    this.rules.push(rule);
  }

  /**
   * Remove validation rule by name
   */
  public removeRule(ruleName: string): void {
    this.rules = this.rules.filter(rule => rule.name !== ruleName);
  }

  /**
   * Get validation statistics
   */
  public getValidationStats(input: string, result: SecurityValidationResult) {
    return {
      inputLength: input.length,
      rulesApplied: this.rules.length,
      errorsFound: result.errors.length,
      warningsGenerated: result.warnings.length,
      riskLevel: result.riskLevel,
      isValid: result.isSecure
    };
  }
}
