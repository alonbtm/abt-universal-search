/**
 * Security utilities for Universal Search Component
 * @description XSS prevention, SQL injection protection, and input sanitization
 */
/**
 * Sanitizes query string to prevent XSS attacks
 */
export declare function sanitizeForXSS(query: string): string;
/**
 * Sanitizes query string to prevent SQL injection attacks
 */
export declare function sanitizeForSQLInjection(query: string): string;
/**
 * Comprehensive input sanitization
 */
export declare function sanitizeInput(query: string, options?: {
    xssProtection?: boolean;
    sqlInjectionProtection?: boolean;
}): string;
/**
 * Checks if query contains XSS patterns
 */
export declare function containsXSS(query: string): boolean;
/**
 * Checks if query contains SQL injection patterns
 */
export declare function containsSQLInjection(query: string): boolean;
/**
 * Validates query for security threats
 */
export interface SecurityValidationResult {
    isSecure: boolean;
    threats: {
        xss: boolean;
        sqlInjection: boolean;
    };
    sanitized: string;
}
export declare function validateQuerySecurity(query: string, options?: {
    xssProtection?: boolean;
    sqlInjectionProtection?: boolean;
}): SecurityValidationResult;
//# sourceMappingURL=security.d.ts.map