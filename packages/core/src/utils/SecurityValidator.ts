/**
 * Security Validator - SQL injection prevention and input sanitization
 * @description Validates and sanitizes user inputs to prevent security vulnerabilities
 */

import type { SQLValidationResult, DatabaseDialectInfo } from '../types/Results';
import type { SQLSecurityConfig, DatabaseType } from '../types/Config';
import { ValidationError } from './validation';

/**
 * SQL injection patterns and security validation
 */
export class SecurityValidator {
  private readonly sqlInjectionPatterns: RegExp[];
  private readonly riskyKeywords: string[];
  private readonly allowedOperations: Set<string>;

  constructor(config?: SQLSecurityConfig) {
    this.sqlInjectionPatterns = this.initializeSQLPatterns();
    this.riskyKeywords = this.initializeRiskyKeywords();
    this.allowedOperations = new Set(config?.allowedOperations || ['SELECT']);
  }

  /**
   * Validate SQL query for security issues
   */
  public validateSQL(
    sql: string,
    parameters: unknown[] = [],
    config?: SQLSecurityConfig
  ): SQLValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let riskLevel: 'low' | 'medium' | 'high' = 'low';

    // Check for SQL injection patterns
    const injectionCheck = this.checkSQLInjection(sql, parameters);
    if (!injectionCheck.isValid) {
      errors.push(...injectionCheck.errors);
      riskLevel = 'high';
    }

    // Check for risky keywords
    const keywordCheck = this.checkRiskyKeywords(sql);
    if (keywordCheck.warnings.length > 0) {
      warnings.push(...keywordCheck.warnings);
      if (riskLevel === 'low') riskLevel = 'medium';
    }

    // Check operation permissions
    const operationCheck = this.checkAllowedOperations(sql);
    if (!operationCheck.isValid) {
      errors.push(...operationCheck.errors);
      riskLevel = 'high';
    }

    // Validate parameter safety
    const paramCheck = this.validateParameters(parameters);
    if (!paramCheck.isValid) {
      errors.push(...paramCheck.errors);
      if (riskLevel === 'low') riskLevel = 'medium';
    }

    // Check query complexity
    const complexityCheck = this.checkQueryComplexity(sql, config);
    if (!complexityCheck.isValid) {
      warnings.push(...complexityCheck.warnings);
      if (riskLevel === 'low') riskLevel = 'medium';
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      riskLevel,
      sanitizedParams: this.sanitizeParameters(parameters)
    };
  }

  /**
   * Validate connection string security
   */
  public validateConnectionString(
    connectionString: string,
    databaseType: DatabaseType
  ): { isValid: boolean; errors: string[]; sanitized: string } {
    const errors: string[] = [];

    if (!connectionString || typeof connectionString !== 'string') {
      errors.push('Connection string must be a non-empty string');
      return { isValid: false, errors, sanitized: '' };
    }

    // Check for basic connection string format
    const patterns = {
      postgresql: /^(postgresql|postgres):\/\//i,
      mysql: /^mysql:\/\//i,
      sqlite: /^sqlite:|\.db$|\.sqlite$|\.sqlite3$/i
    };

    const pattern = patterns[databaseType];
    if (!pattern.test(connectionString.toLowerCase())) {
      errors.push(`Invalid ${databaseType} connection string format`);
    }

    // Check for SQL injection attempts in connection string
    if (connectionString.includes(';') || connectionString.includes('--') || 
        connectionString.toLowerCase().includes('drop table')) {
      errors.push('Connection string contains potentially malicious SQL patterns');
    }

    // Check for embedded credentials (security risk)
    if (connectionString.includes('@') && connectionString.includes('://')) {
      const credentialMatch = connectionString.match(/:\/\/([^@]+)@/);
      if (credentialMatch) {
        const credentials = credentialMatch[1];
        if (credentials.includes(':') && credentials.length > 20) {
          // Long embedded credentials might indicate plain text passwords
          errors.push('Long credentials in connection string may pose security risk');
        }
      }
    }

    // Check for suspicious parameters
    const suspiciousParams = ['allowLoadLocalInfile=true', 'autoReconnect=true'];
    for (const param of suspiciousParams) {
      if (connectionString.toLowerCase().includes(param.toLowerCase())) {
        errors.push(`Potentially unsafe connection parameter: ${param}`);
      }
    }

    const sanitized = this.sanitizeConnectionString(connectionString);

    return {
      isValid: errors.length === 0,
      errors,
      sanitized
    };
  }

  /**
   * Sanitize user input to prevent XSS and injection
   */
  public sanitizeInput(input: string): string {
    if (typeof input !== 'string') {
      return String(input);
    }

    return input
      // Remove null bytes
      .replace(/\0/g, '')
      // Remove control characters except newlines and tabs
      .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      // Trim whitespace
      .trim()
      // Limit length
      .substring(0, 1000);
  }

  /**
   * Validate query parameters for type safety
   */
  public validateQueryParameters(
    parameters: unknown[],
    expectedTypes?: string[]
  ): { isValid: boolean; errors: string[]; sanitized: unknown[] } {
    const errors: string[] = [];
    const sanitized: unknown[] = [];

    for (let i = 0; i < parameters.length; i++) {
      const param = parameters[i];
      const expectedType = expectedTypes?.[i];

      // Check for dangerous parameter types
      if (typeof param === 'function') {
        errors.push(`Parameter ${i + 1}: Functions are not allowed as parameters`);
        continue;
      }

      if (param instanceof RegExp) {
        errors.push(`Parameter ${i + 1}: Regular expressions are not allowed as parameters`);
        continue;
      }

      // Type validation if expected type is provided
      if (expectedType && !this.matchesExpectedType(param, expectedType)) {
        errors.push(`Parameter ${i + 1}: Expected ${expectedType}, got ${typeof param}`);
      }

      // Sanitize parameter
      sanitized.push(this.sanitizeParameter(param));
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitized
    };
  }

  /**
   * Check for SQL injection patterns
   */
  private checkSQLInjection(
    sql: string,
    parameters: unknown[]
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check for common SQL injection patterns
    for (const pattern of this.sqlInjectionPatterns) {
      if (pattern.test(sql)) {
        errors.push(`Potential SQL injection detected: ${pattern.source}`);
      }
    }

    // Check for unparameterized values that look like injection attempts
    const suspiciousValues = [
      /'\s*OR\s+'[^']*'\s*=\s*'/i,
      /'\s*UNION\s+SELECT/i,
      /;\s*DROP\s+/i,
      /;\s*DELETE\s+FROM/i,
      /;\s*UPDATE\s+.*SET/i
    ];

    for (const pattern of suspiciousValues) {
      if (pattern.test(sql)) {
        errors.push('Suspicious SQL pattern detected');
      }
    }

    // Ensure parameterized queries are used
    if (parameters.length === 0 && this.containsUserInput(sql)) {
      errors.push('Query appears to contain user input but has no parameters');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Check for risky SQL keywords
   */
  private checkRiskyKeywords(sql: string): { warnings: string[] } {
    const warnings: string[] = [];
    const upperSQL = sql.toUpperCase();

    for (const keyword of this.riskyKeywords) {
      if (upperSQL.includes(keyword)) {
        warnings.push(`Risky SQL keyword detected: ${keyword}`);
      }
    }

    return { warnings };
  }

  /**
   * Check allowed operations
   */
  private checkAllowedOperations(sql: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const upperSQL = sql.trim().toUpperCase();

    const operation = upperSQL.split(/\s+/)[0];
    
    if (!this.allowedOperations.has(operation)) {
      errors.push(`Operation not allowed: ${operation}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate parameters
   */
  private validateParameters(parameters: unknown[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (let i = 0; i < parameters.length; i++) {
      const param = parameters[i];

      // Check for dangerous parameter content
      if (typeof param === 'string' && this.containsMaliciousContent(param)) {
        errors.push(`Parameter ${i + 1} contains potentially malicious content`);
      }

      // Check parameter size
      if (typeof param === 'string' && param.length > 10000) {
        errors.push(`Parameter ${i + 1} is too large (max 10KB)`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Check query complexity
   */
  private checkQueryComplexity(
    sql: string,
    config?: SQLSecurityConfig
  ): { isValid: boolean; warnings: string[] } {
    const warnings: string[] = [];

    // Count JOINs
    const joinCount = (sql.match(/\bJOIN\b/gi) || []).length;
    if (joinCount > 5) {
      warnings.push(`Query has ${joinCount} JOINs, which may impact performance`);
    }

    // Count subqueries
    const subqueryCount = (sql.match(/\(\s*SELECT/gi) || []).length;
    if (subqueryCount > 3) {
      warnings.push(`Query has ${subqueryCount} subqueries, which may impact performance`);
    }

    // Check for UNION operations
    if (sql.toUpperCase().includes('UNION')) {
      warnings.push('Query contains UNION operation');
    }

    // Check estimated query length
    if (sql.length > 5000) {
      warnings.push('Query is very long and may be complex');
    }

    return {
      isValid: true, // Complexity doesn't make query invalid, just risky
      warnings
    };
  }

  /**
   * Initialize SQL injection patterns
   */
  private initializeSQLPatterns(): RegExp[] {
    return [
      // Union-based injection
      /UNION\s+(ALL\s+)?SELECT/i,
      
      // Boolean-based injection
      /\bOR\s+\d+\s*=\s*\d+/i,
      /\bAND\s+\d+\s*=\s*\d+/i,
      
      // Time-based injection
      /WAITFOR\s+DELAY/i,
      /BENCHMARK\s*\(/i,
      /SLEEP\s*\(/i,
      
      // Comment injection
      /--[\s\S]*$/,
      /\/\*[\s\S]*?\*\//,
      
      // Stacked queries
      /;\s*(DROP|DELETE|UPDATE|INSERT)/i,
      
      // Information disclosure
      /information_schema/i,
      /sys\./i,
      
      // Command execution
      /xp_cmdshell/i,
      /sp_execute/i
    ];
  }

  /**
   * Initialize risky keywords
   */
  private initializeRiskyKeywords(): string[] {
    return [
      'DROP TABLE', 'DROP DATABASE', 'DELETE FROM',
      'TRUNCATE', 'ALTER TABLE', 'CREATE USER',
      'GRANT', 'REVOKE', 'EXEC', 'EXECUTE',
      'LOAD_FILE', 'INTO OUTFILE', 'INTO DUMPFILE'
    ];
  }

  /**
   * Sanitize connection string for logging
   */
  private sanitizeConnectionString(connectionString: string): string {
    return connectionString
      .replace(/:\w+@/g, ':***@')
      .replace(/password=\w+/gi, 'password=***')
      .replace(/pwd=\w+/gi, 'pwd=***');
  }

  /**
   * Sanitize individual parameter
   */
  private sanitizeParameter(param: unknown): unknown {
    if (typeof param === 'string') {
      return this.sanitizeInput(param);
    }

    if (param instanceof Date) {
      return param;
    }

    if (typeof param === 'number' && (isNaN(param) || !isFinite(param))) {
      return null;
    }

    return param;
  }

  /**
   * Sanitize all parameters
   */
  private sanitizeParameters(parameters: unknown[]): unknown[] {
    return parameters.map(param => this.sanitizeParameter(param));
  }

  /**
   * Check if string contains user input patterns
   */
  private containsUserInput(sql: string): boolean {
    // Look for concatenated strings or values that aren't parameterized
    return /['"]\s*\+\s*['"]/.test(sql) || 
           /'[^']*\$\{[^}]*\}[^']*'/.test(sql) ||
           /"[^"]*\$\{[^}]*\}[^"]*"/.test(sql);
  }

  /**
   * Check if parameter contains malicious content
   */
  private containsMaliciousContent(param: string): boolean {
    const maliciousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /\bexec\s*\(/i,
      /\beval\s*\(/i,
      /\\\x/i,
      /\bunion\b.*\bselect\b/i
    ];

    return maliciousPatterns.some(pattern => pattern.test(param));
  }

  /**
   * Check if parameter matches expected type
   */
  private matchesExpectedType(param: unknown, expectedType: string): boolean {
    const type = expectedType.toLowerCase();
    
    switch (type) {
      case 'varchar':
      case 'text':
      case 'string':
        return typeof param === 'string';
      
      case 'integer':
      case 'int':
        return typeof param === 'number' && Number.isInteger(param);
      
      case 'decimal':
      case 'numeric':
      case 'number':
        return typeof param === 'number';
      
      case 'boolean':
      case 'bool':
        return typeof param === 'boolean';
      
      case 'timestamp':
      case 'datetime':
      case 'date':
        return param instanceof Date || typeof param === 'string';
      
      case 'null':
        return param === null || param === undefined;
      
      default:
        return true; // Unknown type, allow it
    }
  }
}

/**
 * Security validator factory
 */
export class SecurityValidatorFactory {
  private static validators = new Map<string, SecurityValidator>();

  /**
   * Get or create security validator
   */
  public static getValidator(config?: SQLSecurityConfig): SecurityValidator {
    const key = JSON.stringify(config || {});
    
    if (!this.validators.has(key)) {
      this.validators.set(key, new SecurityValidator(config));
    }
    
    return this.validators.get(key)!;
  }

  /**
   * Clear validator cache
   */
  public static clearCache(): void {
    this.validators.clear();
  }
}

/**
 * Global security validator factory instance
 */
export const securityValidatorFactory = SecurityValidatorFactory;