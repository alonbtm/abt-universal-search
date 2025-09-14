/**
 * Error Mapper - Standardized Error Handling and Transformation
 * @description Maps adapter-specific errors to consistent SearchError format
 */
/**
 * Built-in error mappings for common error patterns
 */
const ERROR_MAPPINGS = new Map([
    // Network errors
    ['ENOTFOUND', {
            type: 'network',
            code: 'DNS_RESOLUTION_FAILED',
            retryable: true,
            suggestions: ['Check network connectivity', 'Verify URL/hostname'],
            fallbackOptions: ['Use cached results']
        }],
    ['ECONNREFUSED', {
            type: 'connection',
            code: 'CONNECTION_REFUSED',
            retryable: true,
            suggestions: ['Check if service is running', 'Verify port configuration'],
            fallbackOptions: ['Try alternative endpoint']
        }],
    ['ETIMEDOUT', {
            type: 'timeout',
            code: 'CONNECTION_TIMEOUT',
            retryable: true,
            suggestions: ['Increase timeout', 'Check network latency'],
            fallbackOptions: ['Use cached results']
        }],
    // HTTP errors
    ['400', {
            type: 'validation',
            code: 'BAD_REQUEST',
            retryable: false,
            suggestions: ['Check request format', 'Verify query parameters']
        }],
    ['401', {
            type: 'security',
            code: 'UNAUTHORIZED',
            retryable: false,
            suggestions: ['Check authentication credentials', 'Verify API key']
        }],
    ['403', {
            type: 'security',
            code: 'FORBIDDEN',
            retryable: false,
            suggestions: ['Check access permissions', 'Verify authorization scope']
        }],
    ['404', {
            type: 'query',
            code: 'NOT_FOUND',
            retryable: false,
            suggestions: ['Verify endpoint URL', 'Check resource existence']
        }],
    ['429', {
            type: 'security',
            code: 'RATE_LIMITED',
            retryable: true,
            suggestions: ['Reduce request frequency', 'Implement request throttling'],
            fallbackOptions: ['Use cached results']
        }],
    ['500', {
            type: 'adapter',
            code: 'INTERNAL_SERVER_ERROR',
            retryable: true,
            suggestions: ['Try again later', 'Check service status']
        }],
    ['502', {
            type: 'network',
            code: 'BAD_GATEWAY',
            retryable: true,
            suggestions: ['Try again later', 'Check upstream service'],
            fallbackOptions: ['Use alternative endpoint']
        }],
    ['503', {
            type: 'adapter',
            code: 'SERVICE_UNAVAILABLE',
            retryable: true,
            suggestions: ['Try again later', 'Check service maintenance status'],
            fallbackOptions: ['Use cached results']
        }],
    // Database errors
    ['ER_ACCESS_DENIED_ERROR', {
            type: 'security',
            code: 'DB_ACCESS_DENIED',
            retryable: false,
            suggestions: ['Check database credentials', 'Verify user permissions']
        }],
    ['ER_BAD_DB_ERROR', {
            type: 'validation',
            code: 'DB_NOT_FOUND',
            retryable: false,
            suggestions: ['Verify database name', 'Check database exists']
        }],
    ['ER_NO_SUCH_TABLE', {
            type: 'validation',
            code: 'TABLE_NOT_FOUND',
            retryable: false,
            suggestions: ['Verify table name', 'Check table exists']
        }],
    ['PROTOCOL_CONNECTION_LOST', {
            type: 'connection',
            code: 'DB_CONNECTION_LOST',
            retryable: true,
            suggestions: ['Check database server status', 'Verify network connectivity'],
            fallbackOptions: ['Reconnect with new connection']
        }],
    // Security errors
    ['QUERY_BLOCKED', {
            type: 'security',
            code: 'MALICIOUS_QUERY_BLOCKED',
            retryable: false,
            suggestions: ['Review query content', 'Remove suspicious patterns']
        }],
    ['XSS_DETECTED', {
            type: 'security',
            code: 'XSS_ATTACK_DETECTED',
            retryable: false,
            suggestions: ['Remove script tags', 'Sanitize input']
        }],
    ['SQL_INJECTION_DETECTED', {
            type: 'security',
            code: 'SQL_INJECTION_DETECTED',
            retryable: false,
            suggestions: ['Remove SQL keywords', 'Use parameterized queries']
        }],
    // DOM errors
    ['ELEMENT_NOT_FOUND', {
            type: 'query',
            code: 'DOM_ELEMENT_NOT_FOUND',
            retryable: false,
            suggestions: ['Check CSS selector', 'Verify element exists']
        }],
    ['INVALID_SELECTOR', {
            type: 'validation',
            code: 'INVALID_CSS_SELECTOR',
            retryable: false,
            suggestions: ['Fix CSS selector syntax', 'Use valid selector format']
        }]
]);
/**
 * Error mapper class for standardizing errors across adapters
 */
export class ErrorMapper {
    constructor() {
        this.customMappings = new Map();
    }
    /**
     * Map any error to standardized SearchError format
     */
    mapError(error, adapterType, context) {
        const baseError = this.extractBaseError(error);
        const mapping = this.findMapping(baseError);
        const searchError = new Error(baseError.message);
        searchError.type = mapping.type;
        searchError.code = mapping.code;
        searchError.originalError = error instanceof Error ? error : undefined;
        searchError.context = {
            adapter: adapterType,
            timestamp: Date.now(),
            ...context
        };
        searchError.recovery = {
            retryable: mapping.retryable,
            suggestions: mapping.suggestions,
            fallbackOptions: mapping.fallbackOptions
        };
        return searchError;
    }
    /**
     * Register custom error mapping
     */
    registerMapping(errorIdentifier, config) {
        this.customMappings.set(errorIdentifier, config);
    }
    /**
     * Check if an error is retryable
     */
    isRetryable(error) {
        const baseError = this.extractBaseError(error);
        const mapping = this.findMapping(baseError);
        return mapping.retryable;
    }
    /**
     * Get recovery suggestions for an error
     */
    getRecoverySuggestions(error) {
        const baseError = this.extractBaseError(error);
        const mapping = this.findMapping(baseError);
        return mapping.suggestions;
    }
    /**
     * Extract base error information from various error types
     */
    extractBaseError(error) {
        if (error instanceof Error) {
            return {
                message: error.message,
                code: error.code,
                statusCode: error.status || error.statusCode
            };
        }
        if (typeof error === 'object' && error !== null) {
            const errorObj = error;
            return {
                message: String(errorObj.message || errorObj.error || 'Unknown error'),
                code: String(errorObj.code || ''),
                statusCode: Number(errorObj.status || errorObj.statusCode || 0) || undefined
            };
        }
        return {
            message: String(error || 'Unknown error')
        };
    }
    /**
     * Find the best matching error mapping
     */
    findMapping(baseError) {
        // Check custom mappings first
        if (baseError.code) {
            const customMapping = this.customMappings.get(baseError.code);
            if (customMapping) {
                return customMapping;
            }
        }
        // Check built-in mappings
        if (baseError.code) {
            const builtinMapping = ERROR_MAPPINGS.get(baseError.code);
            if (builtinMapping) {
                return builtinMapping;
            }
        }
        // Check HTTP status codes
        if (baseError.statusCode) {
            const statusMapping = ERROR_MAPPINGS.get(String(baseError.statusCode));
            if (statusMapping) {
                return statusMapping;
            }
        }
        // Check message patterns for common errors
        const message = baseError.message.toLowerCase();
        if (message.includes('timeout')) {
            return ERROR_MAPPINGS.get('ETIMEDOUT');
        }
        if (message.includes('connection refused') || message.includes('econnrefused')) {
            return ERROR_MAPPINGS.get('ECONNREFUSED');
        }
        if (message.includes('not found') || message.includes('enotfound')) {
            return ERROR_MAPPINGS.get('ENOTFOUND');
        }
        if (message.includes('unauthorized')) {
            return ERROR_MAPPINGS.get('401');
        }
        if (message.includes('forbidden')) {
            return ERROR_MAPPINGS.get('403');
        }
        if (message.includes('rate limit')) {
            return ERROR_MAPPINGS.get('429');
        }
        // Default mapping for unknown errors
        return {
            type: 'adapter',
            code: 'UNKNOWN_ERROR',
            retryable: true,
            suggestions: ['Check logs for more details', 'Try again later'],
            fallbackOptions: ['Use cached results']
        };
    }
    /**
     * Get all registered error types
     */
    getRegisteredErrorTypes() {
        return [
            ...Array.from(ERROR_MAPPINGS.keys()),
            ...Array.from(this.customMappings.keys())
        ];
    }
    /**
     * Clear custom mappings
     */
    clearCustomMappings() {
        this.customMappings.clear();
    }
}
/**
 * Global error mapper instance
 */
export const errorMapper = new ErrorMapper();
//# sourceMappingURL=ErrorMapper.js.map