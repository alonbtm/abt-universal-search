/**
 * ValidationReporter - Security-safe error reporting and validation feedback
 * @description Provides secure error messages and validation feedback without exposing sensitive information
 */
import { SecurityValidationResult, SecurityEvent, SecurityAuditEntry } from '../types/Security';
/**
 * Error reporting configuration
 */
export interface ReportingConfig {
    /** Include detailed error information */
    includeDetails: boolean;
    /** Include position information in errors */
    includePositions: boolean;
    /** Maximum error message length */
    maxMessageLength: number;
    /** Sanitize error messages */
    sanitizeMessages: boolean;
    /** Log security events */
    logSecurityEvents: boolean;
    /** Include stack traces (development only) */
    includeStackTraces: boolean;
}
/**
 * Validation feedback levels
 */
export type FeedbackLevel = 'silent' | 'minimal' | 'detailed' | 'verbose';
/**
 * Security-safe validation reporter
 */
export declare class ValidationReporter {
    private config;
    private auditLog;
    private eventLog;
    constructor(config?: Partial<ReportingConfig>);
    /**
     * Generate user-friendly validation report
     */
    generateReport(result: SecurityValidationResult, feedbackLevel?: FeedbackLevel): {
        isValid: boolean;
        message: string;
        errors: string[];
        warnings: string[];
        recommendations: string[];
    };
    /**
     * Generate summary message for validation result
     */
    private generateSummaryMessage;
    /**
     * Format errors for user display
     */
    private formatErrors;
    /**
     * Format warnings for user display
     */
    private formatWarnings;
    /**
     * Format recommendations for user display
     */
    private formatRecommendations;
    /**
     * Get safe error message without exposing sensitive information
     */
    private getSafeErrorMessage;
    /**
     * Get safe warning message
     */
    private getSafeWarningMessage;
    /**
     * Sanitize message content
     */
    private sanitizeMessage;
    /**
     * Log security event for monitoring
     */
    private logSecurityEvent;
    /**
     * Create audit log entry
     */
    createAuditEntry(eventType: string, success: boolean, processingTime: number, error?: string, context?: Record<string, unknown>): SecurityAuditEntry;
    /**
     * Generate unique audit ID
     */
    private generateAuditId;
    /**
     * Get validation metrics for monitoring
     */
    getValidationMetrics(): {
        totalValidations: number;
        failedValidations: number;
        recentEvents: SecurityEvent[];
        errorsByType: Record<string, number>;
    };
    /**
     * Generate security report for administrators
     */
    generateSecurityReport(): {
        summary: {
            totalEvents: number;
            criticalEvents: number;
            highRiskEvents: number;
            recentTrends: string[];
        };
        topThreats: Array<{
            type: string;
            count: number;
            severity: string;
        }>;
        recommendations: string[];
    };
    /**
     * Analyze recent security trends
     */
    private analyzeRecentTrends;
    /**
     * Generate security recommendations based on threat analysis
     */
    private generateSecurityRecommendations;
    /**
     * Clear audit logs (for testing or privacy compliance)
     */
    clearAuditLogs(): void;
    /**
     * Update reporting configuration
     */
    updateConfig(newConfig: Partial<ReportingConfig>): void;
    /**
     * Get current configuration
     */
    getConfig(): ReportingConfig;
}
//# sourceMappingURL=ValidationReporter.d.ts.map