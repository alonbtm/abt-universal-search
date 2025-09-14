/**
 * Context Preserver - Context and metadata preservation utilities
 * @description Preserves SearchResult metadata and source information through action pipeline
 */
import type { SearchResult } from '../types/Results';
/**
 * Action context data
 */
export interface ActionContext {
    /** Original search query */
    query: string;
    /** Action execution timestamp */
    timestamp: number;
    /** Data source information */
    source: {
        type: string;
        id?: string;
        name?: string;
        version?: string;
    };
    /** User information if available */
    user?: {
        id: string;
        sessionId?: string;
        permissions?: string[];
        preferences?: Record<string, unknown>;
    };
    /** Search metadata */
    search: {
        totalResults: number;
        processingTime: number;
        resultIndex: number;
        page?: number;
        filters?: Record<string, unknown>;
    };
    /** Performance metrics */
    performance?: {
        queryTime: number;
        transformationTime: number;
        renderTime: number;
    };
    /** Custom context data */
    custom?: Record<string, unknown>;
}
/**
 * Enhanced action context with security and validation
 */
export interface SecureActionContext extends ActionContext {
    /** Context validation status */
    validation: {
        isValid: boolean;
        sanitized: boolean;
        errors: string[];
        warnings: string[];
    };
    /** Security context */
    security: {
        trusted: boolean;
        origin: string;
        permissions: string[];
        restrictions: string[];
    };
    /** Audit trail */
    audit: {
        contextId: string;
        createdBy: string;
        createdAt: number;
        modifiedBy?: string;
        modifiedAt?: number;
        chain: string[];
    };
}
/**
 * Context enrichment configuration
 */
export interface ContextEnrichmentConfig {
    /** Include search performance metrics */
    includePerformance?: boolean;
    /** Include user information */
    includeUser?: boolean;
    /** Include detailed source information */
    includeDetailedSource?: boolean;
    /** Custom context enrichers */
    customEnrichers?: Array<(context: ActionContext, result: SearchResult) => Record<string, unknown>>;
    /** Context validation rules */
    validationRules?: Array<(context: ActionContext) => {
        valid: boolean;
        errors: string[];
        warnings: string[];
    }>;
    /** Security policies */
    securityPolicies?: {
        sanitizeCustomData?: boolean;
        allowedOrigins?: string[];
        requiredPermissions?: string[];
        restrictedFields?: string[];
    };
}
/**
 * Context preservation options
 */
export interface ContextPreservationOptions {
    /** Deep clone context data */
    deepClone?: boolean;
    /** Validate context before preservation */
    validate?: boolean;
    /** Sanitize sensitive data */
    sanitize?: boolean;
    /** Maximum context size in bytes */
    maxSize?: number;
    /** Context compression */
    compress?: boolean;
    /** Encryption for sensitive data */
    encrypt?: boolean;
}
/**
 * Context preservation result
 */
export interface ContextPreservationResult {
    /** Whether preservation was successful */
    success: boolean;
    /** Preserved context data */
    context?: SecureActionContext;
    /** Error message if preservation failed */
    error?: string;
    /** Warnings during preservation */
    warnings: string[];
    /** Context size in bytes */
    size: number;
    /** Processing time */
    processingTime: number;
}
/**
 * Advanced context preserver with security and validation
 */
export declare class AdvancedContextPreserver {
    private preservationHistory;
    private maxHistorySize;
    private defaultMaxSize;
    private debugMode;
    constructor(options?: {
        maxHistorySize?: number;
        defaultMaxSize?: number;
        debugMode?: boolean;
    });
    /**
     * Create action context from search result and query information
     */
    createContext(result: SearchResult, query: string, sourceInfo: ActionContext['source'], enrichmentConfig?: ContextEnrichmentConfig): ActionContext;
    /**
     * Preserve context with security and validation
     */
    preserveContext(context: ActionContext, options?: ContextPreservationOptions, enrichmentConfig?: ContextEnrichmentConfig): ContextPreservationResult;
    /**
     * Retrieve preserved context by ID
     */
    getPreservedContext(contextId: string): SecureActionContext | undefined;
    /**
     * Update preserved context
     */
    updateContext(contextId: string, updates: Partial<ActionContext>, modifiedBy?: string): boolean;
    /**
     * Enrich context with additional data
     */
    enrichContext(context: ActionContext, enrichmentData: Record<string, unknown>, enrichmentConfig?: ContextEnrichmentConfig): ActionContext;
    /**
     * Extract context metadata for logging/debugging
     */
    extractMetadata(context: ActionContext): Record<string, unknown>;
    /**
     * Clear preservation history
     */
    clearHistory(): number;
    /**
     * Get preservation history statistics
     */
    getStatistics(): {
        totalPreserved: number;
        currentSize: number;
        averageSize: number;
        oldestContext?: {
            id: string;
            age: number;
        };
        newestContext?: {
            id: string;
            age: number;
        };
    };
    /**
     * Validate context data
     */
    private validateContext;
    /**
     * Sanitize context data
     */
    private sanitizeContext;
    /**
     * Deep clone object
     */
    private deepClone;
    /**
     * Calculate context size in bytes
     */
    private calculateContextSize;
    /**
     * Check if context is trusted
     */
    private isContextTrusted;
    /**
     * Extract origin from context
     */
    private extractOrigin;
    /**
     * Extract permissions from context
     */
    private extractPermissions;
    /**
     * Extract restrictions from context
     */
    private extractRestrictions;
    /**
     * Sanitize string data
     */
    private sanitizeString;
    /**
     * Sanitize custom data object
     */
    private sanitizeCustomData;
    /**
     * Remove restricted fields from context
     */
    private removeRestrictedFields;
    /**
     * Add context to preservation history
     */
    private addToHistory;
    /**
     * Generate unique context ID
     */
    private generateContextId;
}
/**
 * Global context preserver instance
 */
export declare const contextPreserver: AdvancedContextPreserver;
//# sourceMappingURL=ContextPreserver.d.ts.map