/**
 * Security Types - Type definitions for security-related functionality
 * @description TypeScript interfaces for input sanitization, validation, and security constraints
 */
/**
 * Security validation severity levels
 */
export type SecuritySeverity = 'low' | 'medium' | 'high' | 'critical';
/**
 * Security validation result
 */
export interface SecurityValidationResult {
    /** Whether input passes security validation */
    isSecure: boolean;
    /** Validation errors found */
    errors: SecurityError[];
    /** Security warnings */
    warnings: SecurityWarning[];
    /** Risk assessment level */
    riskLevel: SecuritySeverity;
    /** Recommended actions */
    recommendations: string[];
}
/**
 * Security error interface
 */
export interface SecurityError {
    /** Error type */
    type: 'xss' | 'sql_injection' | 'buffer_overflow' | 'malicious_pattern' | 'encoding_issue';
    /** Error message */
    message: string;
    /** Severity level */
    severity: SecuritySeverity;
    /** Character position where error was found */
    position?: number;
    /** Length of problematic content */
    length?: number;
    /** Suggested fix */
    suggestion?: string;
}
/**
 * Security warning interface
 */
export interface SecurityWarning {
    /** Warning type */
    type: 'suspicious_pattern' | 'unusual_encoding' | 'length_concern' | 'character_concern';
    /** Warning message */
    message: string;
    /** Position in input */
    position?: number;
    /** Recommended action */
    recommendation?: string;
}
/**
 * Security configuration interface
 */
export interface SecurityConfig {
    /** Enable input sanitization */
    inputSanitization: boolean;
    /** Maximum query length */
    maxQueryLength: number;
    /** Allowed characters pattern */
    allowedCharacters?: RegExp;
    /** Enable XSS protection */
    xssProtection: boolean;
    /** Enable SQL injection protection */
    sqlInjectionProtection: boolean;
    /** Buffer overflow protection */
    bufferOverflowProtection: boolean;
    /** Custom security patterns to block */
    blockedPatterns?: RegExp[];
    /** Security logging enabled */
    securityLogging: boolean;
}
/**
 * Character filtering configuration
 */
export interface CharacterFilterConfig {
    /** Characters to remove completely */
    removeCharacters?: string[];
    /** Characters to escape */
    escapeCharacters?: string[];
    /** Allow Unicode characters */
    allowUnicode: boolean;
    /** Allow international characters */
    allowInternational: boolean;
    /** Custom character whitelist */
    whitelist?: RegExp;
    /** Custom character blacklist */
    blacklist?: RegExp;
}
/**
 * Length validation configuration
 */
export interface LengthValidationConfig {
    /** Minimum allowed length */
    minLength: number;
    /** Maximum allowed length */
    maxLength: number;
    /** Buffer size limit for processing */
    bufferLimit: number;
    /** Action when limit exceeded */
    onExceeded: 'truncate' | 'reject' | 'warn';
}
/**
 * SQL injection protection configuration
 */
export interface SQLInjectionConfig {
    /** Enable parameterized query enforcement */
    enforceParameterized: boolean;
    /** SQL keywords to block */
    blockedKeywords: string[];
    /** SQL patterns to detect */
    injectionPatterns: RegExp[];
    /** Escape special SQL characters */
    escapeSpecialChars: boolean;
    /** Allow stored procedures */
    allowStoredProcedures: boolean;
}
/**
 * XSS protection configuration
 */
export interface XSSProtectionConfig {
    /** HTML tags to allow */
    allowedTags: string[];
    /** HTML attributes to allow */
    allowedAttributes: string[];
    /** Scripts to block */
    blockScripts: boolean;
    /** Event handlers to block */
    blockEventHandlers: boolean;
    /** Data URLs to block */
    blockDataUrls: boolean;
}
/**
 * Security event interface
 */
export interface SecurityEvent {
    /** Event type */
    type: 'validation_failed' | 'sanitization_applied' | 'threat_detected' | 'limit_exceeded';
    /** Event timestamp */
    timestamp: number;
    /** Security severity */
    severity: SecuritySeverity;
    /** Event description */
    description: string;
    /** Input that triggered event */
    input?: string;
    /** Detection details */
    details: {
        pattern?: string;
        position?: number;
        action: string;
    };
    /** User session info (anonymized) */
    session?: {
        id: string;
        userAgent?: string;
        ipHash?: string;
    };
}
/**
 * Security audit log entry
 */
export interface SecurityAuditEntry {
    /** Unique audit ID */
    id: string;
    /** Audit timestamp */
    timestamp: number;
    /** Event type */
    eventType: string;
    /** Severity level */
    severity: SecuritySeverity;
    /** Action taken */
    action: string;
    /** Success/failure status */
    success: boolean;
    /** Processing time in ms */
    processingTime: number;
    /** Error details if failed */
    error?: string;
    /** Context information */
    context: Record<string, unknown>;
}
/**
 * Security metrics interface
 */
export interface SecurityMetrics {
    /** Total validations performed */
    totalValidations: number;
    /** Successful validations */
    successfulValidations: number;
    /** Failed validations */
    failedValidations: number;
    /** Threats detected and blocked */
    threatsBlocked: number;
    /** Average validation time */
    averageValidationTime: number;
    /** Validation by type */
    validationsByType: Record<string, number>;
    /** Threats by severity */
    threatsBySeverity: Record<SecuritySeverity, number>;
    /** Performance statistics */
    performance: {
        fastest: number;
        slowest: number;
        totalTime: number;
    };
}
//# sourceMappingURL=Security.d.ts.map