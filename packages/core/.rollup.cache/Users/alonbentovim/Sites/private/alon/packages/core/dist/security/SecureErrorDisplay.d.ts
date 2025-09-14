/**
 * SecureErrorDisplay - Security-safe error message rendering with information disclosure prevention
 * @description Provides secure error message display that prevents sensitive information exposure
 */
import { SecureErrorDisplayConfig, ErrorDisplayResult } from '../types/Rendering';
/**
 * Default secure error display configuration
 */
export declare const DEFAULT_SECURE_ERROR_DISPLAY_CONFIG: SecureErrorDisplayConfig;
/**
 * SecureErrorDisplay class for safe error message rendering
 */
export declare class SecureErrorDisplay {
    private config;
    private escaper;
    constructor(config?: Partial<SecureErrorDisplayConfig>);
    /**
     * Display error safely with information disclosure prevention
     */
    displayError(error: Error | string, customConfig?: Partial<SecureErrorDisplayConfig>): ErrorDisplayResult;
    /**
     * Sanitize error message for safe display
     */
    sanitizeErrorMessage(message: string): string;
    /**
     * Create safe error element for DOM insertion
     */
    createErrorElement(error: Error | string, className?: string): HTMLElement;
    /**
     * Extract error information from various error types
     */
    private extractErrorInfo;
    /**
     * Classify error type based on message content
     */
    private classifyError;
    /**
     * Generate user-friendly error message
     */
    private generateUserFriendlyMessage;
    /**
     * Sanitize technical details for logging
     */
    private sanitizeTechnicalDetails;
    /**
     * Generate error code for tracking
     */
    private generateErrorCode;
    /**
     * Log error securely
     */
    logError(error: Error | string, context?: Record<string, any>): void;
    /**
     * Sanitize context object for logging
     */
    private sanitizeContext;
    /**
     * Get error display statistics
     */
    getErrorStats(): {
        totalErrors: number;
        errorsByType: Record<string, number>;
        averageMessageLength: number;
        redactionRate: number;
    };
    /**
     * Update configuration
     */
    updateConfig(newConfig: Partial<SecureErrorDisplayConfig>): void;
    /**
     * Get current configuration
     */
    getConfig(): SecureErrorDisplayConfig;
}
/**
 * Default SecureErrorDisplay instance
 */
export declare const defaultSecureErrorDisplay: SecureErrorDisplay;
/**
 * Convenience function for safe error display
 */
export declare function displayError(error: Error | string, config?: Partial<SecureErrorDisplayConfig>): string;
/**
 * Convenience function for creating error elements
 */
export declare function createErrorElement(error: Error | string, className?: string): HTMLElement;
//# sourceMappingURL=SecureErrorDisplay.d.ts.map