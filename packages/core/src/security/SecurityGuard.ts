/**
 * SecurityGuard - SQL injection protection and security constraint enforcement
 * @description Comprehensive security validation for database queries and user inputs
 */

import { SecurityConfig, SQLInjectionConfig, SecurityValidationResult, SecurityError, SecurityWarning } from '../types/Security';

/**
 * SQL injection detection patterns
 */
const SQL_INJECTION_PATTERNS = [
  // Union-based injection
  /(\bunion\b.*\bselect\b)|(\bselect\b.*\bunion\b)/i,
  // Boolean-based blind injection
  /(\band\b|\bor\b)\s+\d+\s*[=<>]\s*\d+/i,
  // Time-based blind injection
  /\b(sleep|waitfor|delay)\s*\(/i,
  // Stacked queries
  /;\s*(drop|delete|insert|update|create|alter)\b/i,
  // Comment-based injection
  /(\/\*.*\*\/|--|\#)/,
  // String concatenation
  /\|\||concat\s*\(/i,
  // Information schema queries
  /information_schema|sys\.|pg_|mysql\./i,
  // Common SQL functions used in attacks
  /\b(load_file|into\s+outfile|dumpfile)\b/i,
];

/**
 * Dangerous SQL keywords that should be blocked in user input
 */
const DANGEROUS_SQL_KEYWORDS = [
  'DROP', 'DELETE', 'TRUNCATE', 'ALTER', 'CREATE', 'INSERT', 'UPDATE',
  'EXEC', 'EXECUTE', 'UNION', 'SELECT', 'FROM', 'WHERE', 'HAVING',
  'ORDER', 'GROUP', 'INTO', 'VALUES', 'SET', 'DECLARE', 'CAST',
  'CONVERT', 'SUBSTRING', 'CHAR', 'ASCII', 'LOAD_FILE', 'OUTFILE'
];

/**
 * Security constraint types
 */
export interface SecurityConstraint {
  name: string;
  pattern: RegExp;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  action: 'block' | 'sanitize' | 'warn';
}

/**
 * Default security constraints for search queries
 */
const DEFAULT_CONSTRAINTS: SecurityConstraint[] = [
  {
    name: 'sql_injection',
    pattern: /(\bunion\b.*\bselect\b)|(\bselect\b.*\bunion\b)/i,
    severity: 'critical',
    message: 'SQL injection attempt detected',
    action: 'block'
  },
  {
    name: 'script_injection',
    pattern: /<script[^>]*>.*?<\/script>/i,
    severity: 'high',
    message: 'Script injection attempt detected',
    action: 'block'
  },
  {
    name: 'path_traversal',
    pattern: /\.\.[\/\\]/,
    severity: 'high',
    message: 'Path traversal attempt detected',
    action: 'block'
  },
  {
    name: 'command_injection',
    pattern: /[;&|`$(){}[\]]/,
    severity: 'medium',
    message: 'Command injection characters detected',
    action: 'sanitize'
  }
];

/**
 * Security guard for input validation and threat detection
 */
export class SecurityGuard {
  private config: SecurityConfig;
  private sqlConfig: SQLInjectionConfig;
  private constraints: SecurityConstraint[];

  constructor(
    config: SecurityConfig, 
    sqlConfig?: SQLInjectionConfig,
    customConstraints?: SecurityConstraint[]
  ) {
    this.config = config;
    this.sqlConfig = sqlConfig || {
      enforceParameterized: true,
      blockedKeywords: DANGEROUS_SQL_KEYWORDS,
      injectionPatterns: SQL_INJECTION_PATTERNS,
      escapeSpecialChars: true,
      allowStoredProcedures: false
    };
    this.constraints = [...DEFAULT_CONSTRAINTS, ...(customConstraints || [])];
  }

  /**
   * Comprehensive security validation of input
   */
  public validateInput(input: string): SecurityValidationResult {
    const errors: SecurityError[] = [];
    const warnings: SecurityWarning[] = [];

    if (!input || typeof input !== 'string') {
      return {
        isSecure: true,
        errors: [],
        warnings: [],
        riskLevel: 'low',
        recommendations: []
      };
    }

    // Check SQL injection patterns
    const sqlErrors = this.detectSQLInjection(input);
    errors.push(...sqlErrors);

    // Check security constraints
    const constraintResults = this.checkSecurityConstraints(input);
    errors.push(...constraintResults.errors);
    warnings.push(...constraintResults.warnings);

    // Check for suspicious patterns
    const suspiciousWarnings = this.detectSuspiciousPatterns(input);
    warnings.push(...suspiciousWarnings);

    // Determine risk level
    const riskLevel = this.calculateRiskLevel(errors);

    // Generate recommendations
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
   * Detect SQL injection attempts
   */
  private detectSQLInjection(input: string): SecurityError[] {
    const errors: SecurityError[] = [];

    // Check against SQL injection patterns
    this.sqlConfig.injectionPatterns.forEach((pattern, index) => {
      const match = input.match(pattern);
      if (match) {
        errors.push({
          type: 'sql_injection',
          message: `SQL injection pattern detected: ${match[0]}`,
          severity: 'critical',
          position: match.index,
          length: match[0].length,
          suggestion: 'Use parameterized queries and input validation'
        });
      }
    });

    // Check for dangerous SQL keywords
    const upperInput = input.toUpperCase();
    this.sqlConfig.blockedKeywords.forEach(keyword => {
      const index = upperInput.indexOf(keyword);
      if (index !== -1) {
        errors.push({
          type: 'sql_injection',
          message: `Dangerous SQL keyword detected: ${keyword}`,
          severity: 'high',
          position: index,
          length: keyword.length,
          suggestion: 'Remove SQL keywords from user input'
        });
      }
    });

    return errors;
  }

  /**
   * Check input against security constraints
   */
  private checkSecurityConstraints(input: string): { errors: SecurityError[], warnings: SecurityWarning[] } {
    const errors: SecurityError[] = [];
    const warnings: SecurityWarning[] = [];

    this.constraints.forEach(constraint => {
      const match = input.match(constraint.pattern);
      if (match) {
        if (constraint.action === 'block') {
          errors.push({
            type: constraint.name as any,
            message: constraint.message,
            severity: constraint.severity,
            position: match.index,
            length: match[0].length,
            suggestion: `Remove or escape: ${match[0]}`
          });
        } else if (constraint.action === 'warn') {
          warnings.push({
            type: 'suspicious_pattern',
            message: constraint.message,
            position: match.index,
            recommendation: `Review pattern: ${match[0]}`
          });
        }
      }
    });

    return { errors, warnings };
  }

  /**
   * Detect suspicious patterns that might indicate attacks
   */
  private detectSuspiciousPatterns(input: string): SecurityWarning[] {
    const warnings: SecurityWarning[] = [];

    // Check for excessive special characters
    const specialCharCount = (input.match(/[^a-zA-Z0-9\s]/g) || []).length;
    if (specialCharCount > input.length * 0.3) {
      warnings.push({
        type: 'suspicious_pattern',
        message: 'High concentration of special characters detected',
        recommendation: 'Review input for potential encoding attacks'
      });
    }

    // Check for repeated patterns (possible injection attempts)
    const repeatedPatterns = input.match(/(.{3,})\1{2,}/g);
    if (repeatedPatterns) {
      warnings.push({
        type: 'suspicious_pattern',
        message: 'Repeated patterns detected',
        recommendation: 'Check for potential buffer overflow or injection attempts'
      });
    }

    // Check for unusual encoding
    if (/(%[0-9a-f]{2}){3,}/i.test(input)) {
      warnings.push({
        type: 'unusual_encoding',
        message: 'URL encoding detected in input',
        recommendation: 'Decode and validate URL-encoded content'
      });
    }

    // Check for null bytes
    if (input.includes('\0') || input.includes('%00')) {
      warnings.push({
        type: 'character_concern',
        message: 'Null byte detected in input',
        recommendation: 'Remove null bytes to prevent injection attacks'
      });
    }

    return warnings;
  }

  /**
   * Calculate overall risk level based on errors
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
   * Generate security recommendations
   */
  private generateRecommendations(errors: SecurityError[], warnings: SecurityWarning[]): string[] {
    const recommendations: string[] = [];

    if (errors.some(e => e.type === 'sql_injection')) {
      recommendations.push('Use parameterized queries to prevent SQL injection');
      recommendations.push('Implement input validation and sanitization');
    }

    if (errors.some(e => e.type === 'xss')) {
      recommendations.push('Sanitize HTML content and escape user input');
      recommendations.push('Implement Content Security Policy (CSP)');
    }

    if (warnings.some(w => w.type === 'unusual_encoding')) {
      recommendations.push('Normalize and validate encoded input');
    }

    if (errors.length > 0) {
      recommendations.push('Review and sanitize all user input before processing');
    }

    return [...new Set(recommendations)]; // Remove duplicates
  }

  /**
   * Sanitize input by removing or escaping dangerous content
   */
  public sanitizeInput(input: string): string {
    if (!input || typeof input !== 'string') {
      return '';
    }

    let sanitized = input;

    // Remove SQL injection patterns
    this.sqlConfig.injectionPatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });

    // Remove dangerous SQL keywords
    this.sqlConfig.blockedKeywords.forEach(keyword => {
      const pattern = new RegExp(`\\b${keyword}\\b`, 'gi');
      sanitized = sanitized.replace(pattern, '');
    });

    // Escape special characters if configured
    if (this.sqlConfig.escapeSpecialChars) {
      sanitized = this.escapeSpecialCharacters(sanitized);
    }

    // Apply constraint-based sanitization
    this.constraints.forEach(constraint => {
      if (constraint.action === 'sanitize') {
        sanitized = sanitized.replace(constraint.pattern, '');
      }
    });

    return sanitized.trim();
  }

  /**
   * Escape special characters that could be used in attacks
   */
  private escapeSpecialCharacters(input: string): string {
    const escapeMap: { [key: string]: string } = {
      "'": "''",
      '"': '""',
      '\\': '\\\\',
      '\0': '\\0',
      '\n': '\\n',
      '\r': '\\r',
      '\t': '\\t'
    };

    return input.replace(/['"\\\0\n\r\t]/g, char => escapeMap[char] || char);
  }

  /**
   * Check if input is safe for database queries
   */
  public isSafeForDatabase(input: string): boolean {
    const validation = this.validateInput(input);
    return validation.isSecure && 
           !validation.errors.some(e => e.type === 'sql_injection');
  }

  /**
   * Get security metrics for monitoring
   */
  public getSecurityMetrics(input: string) {
    const validation = this.validateInput(input);
    return {
      inputLength: input.length,
      threatsDetected: validation.errors.length,
      warningsGenerated: validation.warnings.length,
      riskLevel: validation.riskLevel,
      isSecure: validation.isSecure,
      processingTime: Date.now() // Would be calculated in real implementation
    };
  }
}
