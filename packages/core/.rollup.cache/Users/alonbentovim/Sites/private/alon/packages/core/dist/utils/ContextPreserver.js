/**
 * Context Preserver - Context and metadata preservation utilities
 * @description Preserves SearchResult metadata and source information through action pipeline
 */
/**
 * Advanced context preserver with security and validation
 */
export class AdvancedContextPreserver {
    constructor(options = {}) {
        this.preservationHistory = new Map();
        this.maxHistorySize = 1000;
        this.defaultMaxSize = 1024 * 1024; // 1MB
        this.debugMode = false;
        this.maxHistorySize = options.maxHistorySize || 1000;
        this.defaultMaxSize = options.defaultMaxSize || 1024 * 1024;
        this.debugMode = options.debugMode || false;
    }
    /**
     * Create action context from search result and query information
     */
    createContext(result, query, sourceInfo, enrichmentConfig = {}) {
        const baseContext = {
            query,
            timestamp: Date.now(),
            source: {
                type: sourceInfo.type,
                id: sourceInfo.id,
                name: sourceInfo.name,
                version: sourceInfo.version
            },
            search: {
                totalResults: 1,
                processingTime: result.metadata?.queryTime || 0,
                resultIndex: result.metadata?.originalIndex || 0,
                page: result.metadata?.page,
                filters: result.metadata?.filters
            }
        };
        // Add performance metrics if enabled
        if (enrichmentConfig.includePerformance && result.metadata) {
            baseContext.performance = {
                queryTime: result.metadata.queryTime || 0,
                transformationTime: result.metadata.enhancementTime || 0,
                renderTime: 0 // Would be set by UI component
            };
        }
        // Add user information if enabled and available
        if (enrichmentConfig.includeUser && result.metadata?.user) {
            baseContext.user = result.metadata.user;
        }
        // Add detailed source information if enabled
        if (enrichmentConfig.includeDetailedSource && result.metadata?.source) {
            Object.assign(baseContext.source, result.metadata.source);
        }
        // Apply custom enrichers
        if (enrichmentConfig.customEnrichers) {
            let customData = {};
            for (const enricher of enrichmentConfig.customEnrichers) {
                try {
                    const enrichmentData = enricher(baseContext, result);
                    customData = { ...customData, ...enrichmentData };
                }
                catch (error) {
                    if (this.debugMode) {
                        console.warn('[ContextPreserver] Custom enricher failed:', error);
                    }
                }
            }
            if (Object.keys(customData).length > 0) {
                baseContext.custom = customData;
            }
        }
        return baseContext;
    }
    /**
     * Preserve context with security and validation
     */
    preserveContext(context, options = {}, enrichmentConfig = {}) {
        const startTime = performance.now();
        const result = {
            success: false,
            warnings: [],
            size: 0,
            processingTime: 0
        };
        try {
            // Deep clone if requested
            let processedContext = options.deepClone
                ? this.deepClone(context)
                : { ...context };
            // Validate context
            const validation = this.validateContext(processedContext, enrichmentConfig);
            if (!validation.isValid && options.validate) {
                result.error = `Context validation failed: ${validation.errors.join(', ')}`;
                result.warnings = validation.warnings;
                return result;
            }
            // Sanitize context if requested
            if (options.sanitize) {
                processedContext = this.sanitizeContext(processedContext, enrichmentConfig);
            }
            // Check size limits
            const contextSize = this.calculateContextSize(processedContext);
            const maxSize = options.maxSize || this.defaultMaxSize;
            if (contextSize > maxSize) {
                result.error = `Context size (${contextSize} bytes) exceeds maximum (${maxSize} bytes)`;
                return result;
            }
            // Create secure context
            const secureContext = {
                ...processedContext,
                validation: {
                    isValid: validation.isValid,
                    sanitized: options.sanitize || false,
                    errors: validation.errors,
                    warnings: validation.warnings
                },
                security: {
                    trusted: this.isContextTrusted(processedContext, enrichmentConfig),
                    origin: this.extractOrigin(processedContext),
                    permissions: this.extractPermissions(processedContext, enrichmentConfig),
                    restrictions: this.extractRestrictions(processedContext, enrichmentConfig)
                },
                audit: {
                    contextId: this.generateContextId(),
                    createdBy: 'ContextPreserver',
                    createdAt: Date.now(),
                    chain: ['created']
                }
            };
            // Add to preservation history
            this.addToHistory(secureContext);
            result.success = true;
            result.context = secureContext;
            result.size = contextSize;
            result.warnings = validation.warnings;
            result.processingTime = performance.now() - startTime;
            if (this.debugMode) {
                console.log(`[ContextPreserver] Context preserved: ${secureContext.audit.contextId} (${contextSize} bytes)`);
            }
        }
        catch (error) {
            result.error = error instanceof Error ? error.message : String(error);
            if (this.debugMode) {
                console.error('[ContextPreserver] Context preservation failed:', error);
            }
        }
        result.processingTime = performance.now() - startTime;
        return result;
    }
    /**
     * Retrieve preserved context by ID
     */
    getPreservedContext(contextId) {
        return this.preservationHistory.get(contextId);
    }
    /**
     * Update preserved context
     */
    updateContext(contextId, updates, modifiedBy = 'Unknown') {
        const context = this.preservationHistory.get(contextId);
        if (!context) {
            return false;
        }
        // Apply updates
        Object.assign(context, updates);
        // Update audit trail
        context.audit.modifiedBy = modifiedBy;
        context.audit.modifiedAt = Date.now();
        context.audit.chain.push('updated');
        if (this.debugMode) {
            console.log(`[ContextPreserver] Context updated: ${contextId} by ${modifiedBy}`);
        }
        return true;
    }
    /**
     * Enrich context with additional data
     */
    enrichContext(context, enrichmentData, enrichmentConfig = {}) {
        const enrichedContext = { ...context };
        // Add to custom data
        enrichedContext.custom = {
            ...enrichedContext.custom,
            ...enrichmentData
        };
        // Apply security policies
        if (enrichmentConfig.securityPolicies?.sanitizeCustomData) {
            enrichedContext.custom = this.sanitizeCustomData(enrichedContext.custom);
        }
        return enrichedContext;
    }
    /**
     * Extract context metadata for logging/debugging
     */
    extractMetadata(context) {
        return {
            query: context.query,
            timestamp: context.timestamp,
            sourceType: context.source.type,
            totalResults: context.search.totalResults,
            resultIndex: context.search.resultIndex,
            hasUser: !!context.user,
            hasCustomData: !!context.custom,
            customDataKeys: context.custom ? Object.keys(context.custom) : []
        };
    }
    /**
     * Clear preservation history
     */
    clearHistory() {
        const count = this.preservationHistory.size;
        this.preservationHistory.clear();
        if (this.debugMode) {
            console.log(`[ContextPreserver] Cleared history: ${count} contexts`);
        }
        return count;
    }
    /**
     * Get preservation history statistics
     */
    getStatistics() {
        const contexts = Array.from(this.preservationHistory.values());
        const now = Date.now();
        let totalSize = 0;
        let oldestContext;
        let newestContext;
        for (const context of contexts) {
            const size = this.calculateContextSize(context);
            totalSize += size;
            const age = now - context.audit.createdAt;
            if (!oldestContext || age > oldestContext.age) {
                oldestContext = { id: context.audit.contextId, age };
            }
            if (!newestContext || age < newestContext.age) {
                newestContext = { id: context.audit.contextId, age };
            }
        }
        return {
            totalPreserved: contexts.length,
            currentSize: this.preservationHistory.size,
            averageSize: contexts.length > 0 ? totalSize / contexts.length : 0,
            oldestContext,
            newestContext
        };
    }
    /**
     * Validate context data
     */
    validateContext(context, enrichmentConfig) {
        const errors = [];
        const warnings = [];
        // Basic validation
        if (!context.query || typeof context.query !== 'string') {
            errors.push('Query is required and must be a string');
        }
        if (!context.timestamp || typeof context.timestamp !== 'number') {
            errors.push('Timestamp is required and must be a number');
        }
        if (!context.source || !context.source.type) {
            errors.push('Source type is required');
        }
        if (!context.search || typeof context.search.totalResults !== 'number') {
            errors.push('Search metadata with totalResults is required');
        }
        // Apply custom validation rules
        if (enrichmentConfig.validationRules) {
            for (const rule of enrichmentConfig.validationRules) {
                try {
                    const ruleResult = rule(context);
                    if (!ruleResult.valid) {
                        errors.push(...ruleResult.errors);
                        warnings.push(...ruleResult.warnings);
                    }
                }
                catch (error) {
                    warnings.push(`Validation rule failed: ${error}`);
                }
            }
        }
        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }
    /**
     * Sanitize context data
     */
    sanitizeContext(context, enrichmentConfig) {
        const sanitized = { ...context };
        // Sanitize query
        sanitized.query = this.sanitizeString(sanitized.query);
        // Sanitize custom data
        if (sanitized.custom) {
            sanitized.custom = this.sanitizeCustomData(sanitized.custom);
        }
        // Apply security policies
        const policies = enrichmentConfig.securityPolicies;
        if (policies) {
            // Remove restricted fields
            if (policies.restrictedFields) {
                this.removeRestrictedFields(sanitized, policies.restrictedFields);
            }
        }
        return sanitized;
    }
    /**
     * Deep clone object
     */
    deepClone(obj) {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }
        if (obj instanceof Date) {
            return new Date(obj.getTime());
        }
        if (Array.isArray(obj)) {
            return obj.map(item => this.deepClone(item));
        }
        const cloned = {};
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                cloned[key] = this.deepClone(obj[key]);
            }
        }
        return cloned;
    }
    /**
     * Calculate context size in bytes
     */
    calculateContextSize(context) {
        try {
            return new Blob([JSON.stringify(context)]).size;
        }
        catch {
            // Fallback approximation
            return JSON.stringify(context).length * 2; // UTF-16 approximation
        }
    }
    /**
     * Check if context is trusted
     */
    isContextTrusted(context, enrichmentConfig) {
        const policies = enrichmentConfig.securityPolicies;
        if (!policies)
            return true;
        // Check allowed origins
        if (policies.allowedOrigins) {
            const origin = this.extractOrigin(context);
            if (!policies.allowedOrigins.includes(origin)) {
                return false;
            }
        }
        return true;
    }
    /**
     * Extract origin from context
     */
    extractOrigin(context) {
        return context.source.name || context.source.type || 'unknown';
    }
    /**
     * Extract permissions from context
     */
    extractPermissions(context, enrichmentConfig) {
        const permissions = context.user?.permissions || [];
        const required = enrichmentConfig.securityPolicies?.requiredPermissions || [];
        return [...new Set([...permissions, ...required])];
    }
    /**
     * Extract restrictions from context
     */
    extractRestrictions(context, enrichmentConfig) {
        const restrictions = [];
        if (!context.user) {
            restrictions.push('no-user-context');
        }
        if (!this.isContextTrusted(context, enrichmentConfig)) {
            restrictions.push('untrusted-origin');
        }
        return restrictions;
    }
    /**
     * Sanitize string data
     */
    sanitizeString(str) {
        return str
            .replace(/[<>]/g, '') // Remove HTML tags
            .replace(/javascript:/gi, '') // Remove javascript: URLs
            .replace(/on\w+=/gi, '') // Remove event handlers
            .trim();
    }
    /**
     * Sanitize custom data object
     */
    sanitizeCustomData(data) {
        const sanitized = {};
        for (const [key, value] of Object.entries(data)) {
            if (typeof value === 'string') {
                sanitized[key] = this.sanitizeString(value);
            }
            else if (typeof value === 'object' && value !== null) {
                sanitized[key] = this.sanitizeCustomData(value);
            }
            else {
                sanitized[key] = value;
            }
        }
        return sanitized;
    }
    /**
     * Remove restricted fields from context
     */
    removeRestrictedFields(context, restrictedFields) {
        for (const field of restrictedFields) {
            const fieldPath = field.split('.');
            let current = context;
            for (let i = 0; i < fieldPath.length - 1; i++) {
                if (!current[fieldPath[i]])
                    return;
                current = current[fieldPath[i]];
            }
            delete current[fieldPath[fieldPath.length - 1]];
        }
    }
    /**
     * Add context to preservation history
     */
    addToHistory(context) {
        this.preservationHistory.set(context.audit.contextId, context);
        // Maintain history size limit
        if (this.preservationHistory.size > this.maxHistorySize) {
            const oldest = Array.from(this.preservationHistory.keys())[0];
            this.preservationHistory.delete(oldest);
        }
    }
    /**
     * Generate unique context ID
     */
    generateContextId() {
        return `ctx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
/**
 * Global context preserver instance
 */
export const contextPreserver = new AdvancedContextPreserver({
    debugMode: process.env.NODE_ENV === 'development'
});
//# sourceMappingURL=ContextPreserver.js.map