/**
 * Security Validator - SQL injection prevention and input sanitization
 * @description Validates and sanitizes user inputs to prevent security vulnerabilities
 */
import type { SQLValidationResult } from '../types/Results';
import type { SQLSecurityConfig, DatabaseType } from '../types/Config';
/**
 * SQL injection patterns and security validation
 */
export declare class SecurityValidator {
    private readonly sqlInjectionPatterns;
    private readonly riskyKeywords;
    private readonly allowedOperations;
    constructor(config?: SQLSecurityConfig);
    /**
     * Validate SQL query for security issues
     */
    validateSQL(sql: string, parameters?: unknown[], config?: SQLSecurityConfig): SQLValidationResult;
    /**
     * Validate connection string security
     */
    validateConnectionString(connectionString: string, databaseType: DatabaseType): {
        isValid: boolean;
        errors: string[];
        sanitized: string;
    };
    /**
     * Sanitize user input to prevent XSS and injection
     */
    sanitizeInput(input: string): string;
    /**
     * Validate query parameters for type safety
     */
    validateQueryParameters(parameters: unknown[], expectedTypes?: string[]): {
        isValid: boolean;
        errors: string[];
        sanitized: unknown[];
    };
    /**
     * Check for SQL injection patterns
     */
    private checkSQLInjection;
    /**
     * Check for risky SQL keywords
     */
    private checkRiskyKeywords;
    /**
     * Check allowed operations
     */
    private checkAllowedOperations;
    /**
     * Validate parameters
     */
    private validateParameters;
    /**
     * Check query complexity
     */
    private checkQueryComplexity;
    /**
     * Initialize SQL injection patterns
     */
    private initializeSQLPatterns;
    /**
     * Initialize risky keywords
     */
    private initializeRiskyKeywords;
    /**
     * Sanitize connection string for logging
     */
    private sanitizeConnectionString;
    /**
     * Sanitize individual parameter
     */
    private sanitizeParameter;
    /**
     * Sanitize all parameters
     */
    private sanitizeParameters;
    /**
     * Check if string contains user input patterns
     */
    private containsUserInput;
    /**
     * Check if parameter contains malicious content
     */
    private containsMaliciousContent;
    /**
     * Check if parameter matches expected type
     */
    private matchesExpectedType;
}
/**
 * Security validator factory
 */
export declare class SecurityValidatorFactory {
    private static validators;
    /**
     * Get or create security validator
     */
    static getValidator(config?: SQLSecurityConfig): SecurityValidator;
    /**
     * Clear validator cache
     */
    static clearCache(): void;
}
/**
 * Global security validator factory instance
 */
export declare const securityValidatorFactory: typeof SecurityValidatorFactory;
//# sourceMappingURL=SecurityValidator.d.ts.map