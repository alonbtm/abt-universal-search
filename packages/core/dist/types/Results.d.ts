/**
 * Result Types for Universal Search Component
 * @description TypeScript interfaces for search results, transformations, and validation
 */
/**
 * Validation result for query processing
 */
export interface ValidationResult {
    /** Whether the validation passed */
    isValid: boolean;
    /** List of validation errors */
    errors: string[];
    /** List of validation warnings */
    warnings?: string[];
}
/**
 * Processed query result with enhanced metadata
 */
export interface ProcessedQuery {
    /** Original raw query */
    original: string;
    /** Normalized query */
    normalized: string;
    /** Whether query is valid for searching */
    isValid: boolean;
    /** Validation error message if invalid */
    error?: string;
    /** Processing metadata */
    metadata: {
        /** Processing time in milliseconds */
        processingTime: number;
        /** Original query before any processing */
        originalQuery: string;
        /** Length of normalized query */
        length: number;
        /** Whether query was trimmed */
        trimmed: boolean;
        /** Timestamp when processed */
        timestamp: number;
        /** Case normalization applied */
        caseNormalized?: 'lowercase' | 'uppercase' | 'preserve';
        /** Whether XSS protection was applied */
        xssProtected?: boolean;
        /** Whether SQL injection protection was applied */
        sqlInjectionProtected?: boolean;
    };
}
/**
 * Connection interface for data source adapters
 */
export interface Connection {
    /** Unique connection identifier */
    id: string;
    /** Adapter type that owns this connection */
    adapterType: string;
    /** Connection status */
    status: 'connecting' | 'connected' | 'disconnected' | 'error';
    /** Creation timestamp */
    createdAt: number;
    /** Last used timestamp */
    lastUsedAt: number;
    /** Connection-specific metadata */
    metadata: Record<string, unknown>;
}
/**
 * Raw result interface from data source adapters
 */
export interface RawResult {
    /** Unique result identifier */
    id: string | number;
    /** Raw data from the data source */
    data: unknown;
    /** Match score (0-1) */
    score: number;
    /** Fields that matched the query */
    matchedFields: string[];
    /** Adapter-specific metadata */
    metadata?: Record<string, unknown>;
}
/**
 * API Connection interface with authentication and rate limiting
 */
export interface APIConnection extends Connection {
    /** Base URL for API requests */
    baseURL: string;
    /** Default headers to include with requests */
    defaultHeaders: Record<string, string>;
    /** Authentication token information */
    auth?: {
        type: string;
        token?: string;
        expiresAt?: number;
    };
    /** Rate limiter instance */
    rateLimiter?: {
        remainingRequests: number;
        resetTime: number;
        windowStart: number;
    };
    /** CORS configuration active for this connection */
    corsMode?: 'cors' | 'jsonp' | 'proxy';
}
/**
 * API-specific request configuration
 */
export interface APIRequestConfig {
    url: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    headers: Record<string, string>;
    params?: Record<string, unknown>;
    body?: unknown;
    timeout?: number;
}
/**
 * API response with metadata
 */
export interface APIResponse {
    /** Response data */
    data: unknown;
    /** HTTP status code */
    status: number;
    /** Response headers */
    headers: Record<string, string>;
    /** Response time in ms */
    responseTime: number;
    /** Rate limit information from headers */
    rateLimit?: {
        limit: number;
        remaining: number;
        reset: number;
    };
}
/**
 * Authentication token information
 */
export interface AuthToken {
    /** Access token */
    token: string;
    /** Token type (Bearer, Basic, etc.) */
    type: string;
    /** Token expiration timestamp */
    expiresAt?: number;
    /** Refresh token if available */
    refreshToken?: string;
    /** Token scopes */
    scopes?: string[];
}
/**
 * OAuth2 authorization flow result
 */
export interface OAuth2Result {
    /** Access token */
    accessToken: string;
    /** Token type */
    tokenType: string;
    /** Expires in seconds */
    expiresIn: number;
    /** Refresh token */
    refreshToken?: string;
    /** Granted scopes */
    scopes?: string[];
}
/**
 * Rate limit status
 */
export interface RateLimitStatus {
    /** Requests remaining in current window */
    remaining: number;
    /** Total requests allowed per window */
    limit: number;
    /** Window reset time (timestamp) */
    reset: number;
    /** Current window start time */
    windowStart: number;
    /** Whether request should be queued */
    shouldQueue: boolean;
    /** Estimated queue wait time in ms */
    queueWaitMs?: number;
}
/**
 * SQL Connection interface with database-specific features
 */
export interface SQLConnection extends Connection {
    /** Database type */
    databaseType: 'postgresql' | 'mysql' | 'sqlite';
    /** Connection string (sanitized) */
    connectionString?: string;
    /** Proxy endpoint if using proxy connection */
    proxyEndpoint?: string;
    /** Database name */
    database?: string;
    /** Schema name */
    schema?: string;
    /** Connection pool information */
    pool?: {
        size: number;
        available: number;
        pending: number;
    };
    /** Query execution stats */
    queryStats?: {
        totalQueries: number;
        avgExecutionTime: number;
        lastQueryTime: number;
    };
}
/**
 * Parameterized SQL query
 */
export interface ParameterizedQuery {
    /** SQL query string with parameter placeholders */
    sql: string;
    /** Parameter values in order */
    parameters: unknown[];
    /** Parameter types for validation */
    parameterTypes?: string[];
    /** Query metadata */
    metadata?: {
        queryType: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
        estimatedRows?: number;
        executionPlan?: string;
    };
}
/**
 * SQL query result with database-specific metadata
 */
export interface SQLResult {
    /** Query result rows */
    rows: Record<string, unknown>[];
    /** Total row count (if available) */
    totalCount?: number;
    /** Rows affected (for non-SELECT queries) */
    rowsAffected?: number;
    /** Query execution time in ms */
    executionTime: number;
    /** Database-specific metadata */
    metadata?: {
        columns: {
            name: string;
            type: string;
            nullable: boolean;
        }[];
        queryPlan?: string;
        warnings?: string[];
    };
}
/**
 * SQL pagination cursor
 */
export interface SQLCursor {
    /** Cursor value */
    value: unknown;
    /** Cursor column */
    column: string;
    /** Direction for next page */
    direction: 'next' | 'previous';
}
/**
 * SQL pagination result
 */
export interface SQLPaginationResult {
    /** Current page data */
    data: Record<string, unknown>[];
    /** Current page number (for offset pagination) */
    page?: number;
    /** Total pages (if available) */
    totalPages?: number;
    /** Total row count (if available) */
    totalCount?: number;
    /** Page size */
    pageSize: number;
    /** Next page cursor (for cursor pagination) */
    nextCursor?: SQLCursor;
    /** Previous page cursor (for cursor pagination) */
    previousCursor?: SQLCursor;
    /** Has more pages */
    hasNext: boolean;
    /** Has previous pages */
    hasPrevious: boolean;
}
/**
 * SQL query validation result
 */
export interface SQLValidationResult {
    /** Is query valid */
    isValid: boolean;
    /** Validation errors */
    errors: string[];
    /** Security warnings */
    warnings: string[];
    /** Sanitized query parameters */
    sanitizedParams?: unknown[];
    /** Query risk level */
    riskLevel: 'low' | 'medium' | 'high';
}
/**
 * Database dialect information
 */
export interface DatabaseDialectInfo {
    /** Database type */
    type: 'postgresql' | 'mysql' | 'sqlite';
    /** Version information */
    version?: string;
    /** Supported features */
    features: {
        /** Supports LIMIT/OFFSET */
        supportsLimitOffset: boolean;
        /** Supports window functions */
        supportsWindowFunctions: boolean;
        /** Supports CTEs */
        supportsCTE: boolean;
        /** Supports JSON columns */
        supportsJSON: boolean;
        /** Supports full-text search */
        supportsFullTextSearch: boolean;
    };
    /** Dialect-specific syntax */
    syntax: {
        /** Parameter placeholder style */
        parameterPlaceholder: string;
        /** Quote identifier character */
        identifierQuote: string;
        /** String literal quote */
        stringQuote: string;
        /** Limit clause syntax */
        limitSyntax: 'LIMIT_OFFSET' | 'TOP' | 'ROWNUM';
    };
}
/**
 * Standardized error interface
 */
export interface SearchError extends Error {
    /** Error type category */
    type: 'connection' | 'query' | 'validation' | 'timeout' | 'security' | 'adapter' | 'network';
    /** Error code for programmatic handling */
    code: string;
    /** Original error if this is a wrapped error */
    originalError?: Error;
    /** Context information for debugging */
    context?: {
        adapter?: string;
        query?: string;
        config?: Record<string, unknown>;
        timestamp?: number;
    };
    /** Recovery suggestions */
    recovery?: {
        retryable: boolean;
        suggestions: string[];
        fallbackOptions?: string[];
    };
}
/**
 * Connection performance metrics
 */
export interface ConnectionMetrics {
    /** Connection establishment time in ms */
    connectionTime: number;
    /** Query execution time in ms */
    queryTime: number;
    /** Total operation time in ms */
    totalTime: number;
    /** Success indicator */
    success: boolean;
    /** Number of results returned */
    resultCount: number;
    /** Memory usage if available */
    memoryUsage?: number;
}
/**
 * Raw search result from adapters before transformation
 */
export interface RawSearchResult {
    item: unknown;
    score: number;
    matchedFields: string[];
    originalIndex?: number;
}
/**
 * Base search result interface
 */
export interface SearchResult {
    id: string | number;
    title: string;
    description?: string;
    url?: string;
    metadata?: Record<string, unknown>;
}
/**
 * Search response wrapper
 */
export interface SearchResponse {
    results: SearchResult[];
    total: number;
    page: number;
    hasMore: boolean;
    query: string;
    duration?: number;
}
/**
 * Search state interface
 */
export interface SearchState {
    query: string;
    results: SearchResult[];
    loading: boolean;
    error: Error | null;
    hasMore: boolean;
    total: number;
}
/**
 * DOM-specific connection interface
 */
export interface DOMConnection extends Connection {
    /** Root element for search scope */
    rootElement: Element;
    /** Active mutation observer */
    mutationObserver?: MutationObserver;
    /** Discovered shadow roots */
    shadowRoots: ShadowRoot[];
    /** Search scope type */
    searchScope: 'document' | 'element' | 'shadow-dom';
    /** Performance metrics */
    performanceMetrics?: {
        elementCount: number;
        shadowRootCount: number;
        lastScanTime: number;
    };
}
/**
 * Memory-specific connection interface
 */
export interface MemoryConnection extends Connection {
    /** Data source function or array */
    dataSource: unknown[] | (() => unknown[]);
    /** Search index for performance */
    searchIndex?: SearchIndex;
    /** Change detector for reactive data */
    changeDetector?: ChangeDetector;
    /** Performance metrics */
    performanceMetrics?: {
        dataSize: number;
        indexSize: number;
        lastUpdateTime: number;
        cacheHitRate: number;
    };
}
/**
 * Search index interface for performance optimization
 */
export interface SearchIndex {
    /** Indexed fields */
    fields: string[];
    /** Index data structure */
    index: Map<string, Set<number>>;
    /** Last rebuild time */
    lastRebuild: number;
    /** Index statistics */
    stats: {
        totalKeys: number;
        averageKeyLength: number;
        memoryUsage: number;
    };
}
/**
 * Change detector interface for reactive data
 */
export interface ChangeDetector {
    /** Last known data hash */
    lastHash: string;
    /** Change detection strategy */
    strategy: 'shallow' | 'deep' | 'property-watchers';
    /** Watched properties */
    watchedProperties?: string[];
    /** Change callback */
    onChange?: (changes: DataChange[]) => void;
}
/**
 * Data change notification
 */
export interface DataChange {
    /** Type of change */
    type: 'add' | 'update' | 'delete';
    /** Index of changed item */
    index: number;
    /** Old value (for updates and deletes) */
    oldValue?: unknown;
    /** New value (for adds and updates) */
    newValue?: unknown;
    /** Changed fields (for updates) */
    changedFields?: string[];
}
/**
 * DOM element result with enhanced metadata
 */
export interface DOMElementResult {
    /** DOM element reference */
    element: Element;
    /** Element path for identification */
    path: string;
    /** Shadow DOM path (if in shadow root) */
    shadowPath?: string;
    /** Matched attributes and content */
    matches: {
        attribute?: string;
        value: string;
        matchType: 'exact' | 'partial' | 'starts-with' | 'ends-with';
    }[];
    /** Element visibility and accessibility */
    accessibility: {
        visible: boolean;
        focusable: boolean;
        ariaLabel?: string;
        role?: string;
    };
}
/**
 * Memory search result with performance metadata
 */
export interface MemorySearchResult {
    /** Original data item */
    item: unknown;
    /** Match score */
    score: number;
    /** Matched fields */
    matchedFields: string[];
    /** Index in original data array */
    originalIndex: number;
    /** Performance metadata */
    searchMetadata?: {
        usedIndex: boolean;
        searchTime: number;
        cacheHit: boolean;
    };
}
/**
 * Transformation function type
 */
export type TransformFunction = (value: unknown, context: TransformContext) => unknown;
/**
 * Transform context for field transformations
 */
export interface TransformContext {
    /** Source object being transformed */
    source: Record<string, unknown>;
    /** Current field path */
    fieldPath: string;
    /** Current value being transformed */
    currentValue: unknown;
    /** Index in results array */
    index: number;
    /** Additional context data */
    additionalContext: Record<string, unknown>;
}
/**
 * Validation rule interface
 */
export interface ValidationRule {
    /** Validation function */
    validate: (value: unknown, context: ValidationContext) => {
        valid: boolean;
        message?: string;
    };
    /** Error severity level */
    severity?: 'error' | 'warning' | 'info';
    /** Custom error message */
    message?: string;
}
/**
 * Validation context
 */
export interface ValidationContext {
    /** Field name being validated */
    fieldName: string;
    /** Index of object in batch */
    objectIndex: number;
    /** Additional context data */
    [key: string]: unknown;
}
/**
 * Quality metrics for filtering
 */
export interface QualityMetrics {
    /** Completeness score (0-1) */
    completeness: number;
    /** Relevance score (0-1) */
    relevance: number;
    /** Data quality score (0-1) */
    dataQuality: number;
    /** Overall quality score (0-1) */
    overall: number;
    /** Quality issues found */
    issues: string[];
}
/**
 * Enhanced search result with quality metrics
 */
export interface EnhancedSearchResult extends SearchResult {
    metadata: SearchResult['metadata'] & {
        /** Quality metrics */
        qualityMetrics?: QualityMetrics;
        /** Enhancement metadata */
        enhanced?: boolean;
        /** Enhancement time */
        enhancementTime?: number;
        /** Enhancement errors */
        enhancementError?: string;
    };
}
//# sourceMappingURL=Results.d.ts.map