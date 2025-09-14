/**
 * SecurityGuard - SQL injection protection and security constraint enforcement
 * @description Comprehensive security validation for database queries and user inputs
 */
import { SecurityConfig, SQLInjectionConfig, SecurityValidationResult } from '../types/Security';
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
 * Security guard for input validation and threat detection
 */
export declare class SecurityGuard {
    private config;
    private sqlConfig;
    private constraints;
    constructor(config: SecurityConfig, sqlConfig?: SQLInjectionConfig, customConstraints?: SecurityConstraint[]);
    /**
     * Comprehensive security validation of input
     */
    validateInput(input: string): SecurityValidationResult;
    /**
     * Detect SQL injection attempts
     */
    private detectSQLInjection;
    /**
     * Check input against security constraints
     */
    private checkSecurityConstraints;
    /**
     * Detect suspicious patterns that might indicate attacks
     */
    private detectSuspiciousPatterns;
    /**
     * Calculate overall risk level based on errors
     */
    private calculateRiskLevel;
    /**
     * Generate security recommendations
     */
    private generateRecommendations;
    /**
     * Sanitize input by removing or escaping dangerous content
     */
    sanitizeInput(input: string): string;
    /**
     * Escape special characters that could be used in attacks
     */
    private escapeSpecialCharacters;
    /**
     * Check if input is safe for database queries
     */
    isSafeForDatabase(input: string): boolean;
    /**
     * Get security metrics for monitoring
     */
    getSecurityMetrics(input: string): {
        inputLength: number;
        threatsDetected: number;
        warningsGenerated: number;
        riskLevel: import("../types/Security").SecuritySeverity;
        isSecure: boolean;
        processingTime: number;
    };
}
//# sourceMappingURL=SecurityGuard.d.ts.map