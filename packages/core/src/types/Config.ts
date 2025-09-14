/**
 * Configuration Types for Universal Search Component
 * @description TypeScript interfaces for component configuration
 */

/**
 * Custom validation rule function
 */
export interface ValidationRule {
  /** Validation function that returns true if valid */
  validate: (_query: string) => boolean;
  /** Error message to show when validation fails */
  errorMessage: string;
  /** Unique identifier for this rule */
  id: string;
}

/**
 * Query processing configuration
 */
export interface QueryConfig {
  /** Minimum query length to trigger search */
  minLength: number;
  /** Debounce delay in milliseconds */
  debounceMs: number;
  /** Events that trigger search */
  triggerOn: 'change' | 'enter' | 'both';
  /** Case sensitive search */
  caseSensitive: boolean;
  /** Match mode for search */
  matchMode: 'exact' | 'partial' | 'fuzzy';
  /** Debounce strategy */
  debounceStrategy: 'leading' | 'trailing' | 'both';
  /** Case normalization strategy */
  caseNormalization: 'lowercase' | 'uppercase' | 'preserve';
  /** Custom validation rules */
  customValidators?: ValidationRule[];
  /** Enable XSS protection */
  xssProtection: boolean;
  /** Enable SQL injection protection */
  sqlInjectionProtection: boolean;
  /** Enable performance monitoring */
  performanceMonitoring: boolean;
}

/**
 * UI configuration options
 */
export interface UIConfig {
  /** Maximum number of results to display */
  maxResults: number;
  /** Input placeholder text */
  placeholder: string;
  /** Loading indicator text */
  loadingText: string;
  /** No results found text */
  noResultsText: string;
  /** Theme name */
  theme: string;
  /** Right-to-left text direction */
  rtl: boolean;
}

/**
 * Connection configuration interface for different adapter types
 */
export interface ConnectionConfig {
  /** Connection timeout in milliseconds */
  timeout?: number;
  /** Retry configuration */
  retry?: {
    attempts: number;
    backoffMs: number;
    maxBackoffMs: number;
  };
  /** Connection pooling configuration */
  pooling?: {
    enabled: boolean;
    maxConnections: number;
    idleTimeoutMs: number;
  };
  /** Security configuration */
  security?: {
    validateInput: boolean;
    sanitizeQueries: boolean;
    rateLimitRpm?: number;
  };
}

/**
 * Authentication configuration for API requests
 */
export interface AuthConfig {
  /** Authentication type */
  type: 'none' | 'apikey' | 'bearer' | 'oauth2' | 'basic';
  /** API key configuration */
  apiKey?: {
    key: string;
    header?: string; // Default: 'X-API-Key'
    queryParam?: string; // Alternative: pass as query parameter
  };
  /** Bearer token configuration */
  bearer?: {
    token: string;
    refreshToken?: string;
    refreshUrl?: string;
    expiresAt?: number;
  };
  /** OAuth2 configuration */
  oauth2?: {
    clientId: string;
    clientSecret?: string;
    authUrl: string;
    tokenUrl: string;
    refreshUrl?: string;
    scopes?: string[];
    grantType: 'authorization_code' | 'client_credentials';
  };
  /** Basic authentication configuration */
  basic?: {
    username: string;
    password: string;
  };
}

/**
 * Request transformation configuration
 */
export interface RequestTransformConfig {
  /** Parameter mapping for the search query */
  queryMapping?: {
    field: string; // Field name in API request
    transform?: 'lowercase' | 'uppercase' | 'trim' | 'encode';
  };
  /** Additional parameters to include in request */
  additionalParams?: Record<string, string | number | boolean>;
  /** Dynamic header generation */
  dynamicHeaders?: Record<string, string>;
  /** GraphQL query configuration */
  graphql?: {
    query: string;
    variables?: Record<string, unknown>;
    operationName?: string;
  };
}

/**
 * CORS handling configuration
 */
export interface CORSConfig {
  /** Enable CORS handling */
  enabled: boolean;
  /** Allowed methods */
  allowedMethods?: string[];
  /** Allowed headers */
  allowedHeaders?: string[];
  /** JSONP callback parameter name for fallback */
  jsonpCallback?: string;
  /** Proxy endpoint URL for CORS fallback */
  proxyUrl?: string;
  /** Enable automatic fallback detection */
  autoFallback?: boolean;
}

/**
 * Rate limiting configuration
 */
export interface RateLimitConfig {
  /** Requests per minute limit */
  requestsPerMinute: number;
  /** Requests per second limit */
  requestsPerSecond?: number;
  /** Burst limit for initial requests */
  burstLimit?: number;
  /** Queue maximum size for rate-limited requests */
  queueSize?: number;
  /** Backoff strategy for rate limit violations */
  backoffStrategy?: 'exponential' | 'linear' | 'fixed';
  /** Initial backoff delay in ms */
  initialBackoffMs?: number;
  /** Maximum backoff delay in ms */
  maxBackoffMs?: number;
}

/**
 * API response configuration
 */
export interface APIResponseConfig {
  /** Field path to data array in response */
  dataPath?: string;
  /** Field mappings for search results */
  fieldMappings?: Record<string, string>;
  /** Expected response format */
  format?: 'json' | 'jsonp' | 'xml';
  /** Response validation schema */
  schema?: Record<string, unknown>;
  /** Enable response caching */
  cache?: {
    enabled: boolean;
    ttlMs: number;
    maxSize?: number;
  };
}

/**
 * Enhanced API-specific data source configuration
 */
export interface APIDataSourceConfig extends ConnectionConfig {
  type: 'api';
  /** Base API URL */
  url: string;
  /** HTTP method for requests */
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  /** Static headers to include with requests */
  headers?: Record<string, string>;
  /** Query parameter name for search terms (for GET requests) */
  queryParam?: string;
  /** Authentication configuration */
  auth?: AuthConfig;
  /** Request transformation configuration */
  requestTransform?: RequestTransformConfig;
  /** CORS handling configuration */
  cors?: CORSConfig;
  /** Rate limiting configuration */
  rateLimit?: RateLimitConfig;
  /** Response parsing configuration */
  response?: APIResponseConfig;
}

/**
 * Database type enumeration
 */
export type DatabaseType = 'postgresql' | 'mysql' | 'sqlite';

/**
 * SQL connection configuration
 */
export interface SQLConnectionConfig {
  /** Database connection string (for direct connections) */
  connectionString?: string;
  /** Proxy endpoint URL (for secure connections) */
  proxyEndpoint?: string;
  /** Database type for dialect-specific queries */
  databaseType: DatabaseType;
  /** Connection validation timeout */
  validationTimeout?: number;
  /** Enable SSL connection */
  ssl?: boolean;
  /** Connection-specific options */
  options?: Record<string, unknown>;
}

/**
 * SQL query configuration
 */
export interface SQLQueryConfig {
  /** Primary table to search in */
  tableName: string;
  /** Columns to search in */
  searchColumns: string[];
  /** Columns to return in results */
  selectColumns?: string[];
  /** Additional tables for JOINs */
  joinTables?: {
    table: string;
    type: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL';
    condition: string;
  }[];
  /** Custom WHERE clause conditions */
  whereClause?: string;
  /** ORDER BY configuration */
  orderBy?: {
    column: string;
    direction: 'ASC' | 'DESC';
  }[];
  /** GROUP BY columns */
  groupBy?: string[];
  /** HAVING clause for GROUP BY queries */
  having?: string;
}

/**
 * SQL result limiting and pagination
 */
export interface SQLPaginationConfig {
  /** Maximum results per query */
  maxResults?: number;
  /** Default page size */
  pageSize?: number;
  /** Enable automatic pagination */
  enablePagination?: boolean;
  /** Offset-based or cursor-based pagination */
  paginationType?: 'offset' | 'cursor';
  /** Cursor column for cursor-based pagination */
  cursorColumn?: string;
}

/**
 * SQL security configuration
 */
export interface SQLSecurityConfig {
  /** Enable SQL injection protection */
  preventSQLInjection?: boolean;
  /** Enable connection string validation */
  validateConnectionString?: boolean;
  /** Sanitize all user inputs */
  sanitizeInputs?: boolean;
  /** Maximum query execution time (ms) */
  maxQueryTime?: number;
  /** Allowed database operations */
  allowedOperations?: ('SELECT' | 'INSERT' | 'UPDATE' | 'DELETE')[];
  /** Enable query logging for security */
  logQueries?: boolean;
}

/**
 * SQL performance configuration
 */
export interface SQLPerformanceConfig {
  /** Enable query caching */
  enableQueryCache?: boolean;
  /** Query cache TTL in seconds */
  queryCacheTTL?: number;
  /** Connection pool configuration */
  connectionPool?: {
    min: number;
    max: number;
    acquireTimeoutMs: number;
    idleTimeoutMs: number;
    reapIntervalMs: number;
  };
  /** Enable query optimization */
  enableOptimization?: boolean;
  /** Query explain analysis */
  enableExplain?: boolean;
}

/**
 * Enhanced SQL-specific data source configuration
 */
export interface SQLDataSourceConfig extends ConnectionConfig {
  type: 'sql';
  
  /** Database connection configuration */
  connection: SQLConnectionConfig;
  
  /** SQL query configuration */
  query: SQLQueryConfig;
  
  /** Pagination and result limiting */
  pagination?: SQLPaginationConfig;
  
  /** Security settings */
  security?: SQLSecurityConfig;
  
  /** Performance settings */
  performance?: SQLPerformanceConfig;
}

/**
 * Memory performance optimization configuration
 */
export interface MemoryPerformanceConfig {
  /** Enable search indexing for large datasets */
  enableIndexing?: boolean;
  /** Index rebuild threshold (number of changes) */
  indexRebuildThreshold?: number;
  /** Enable result caching */
  enableCaching?: boolean;
  /** Cache size limit */
  cacheSize?: number;
  /** Cache TTL in milliseconds */
  cacheTTL?: number;
  /** Enable performance monitoring */
  enableMonitoring?: boolean;
}

/**
 * DOM update configuration
 */
export interface DOMUpdateConfig {
  /** Enable live updates */
  enabled: boolean;
  /** Update strategy */
  strategy: 'static' | 'mutation-observer' | 'polling';
  /** Polling interval in milliseconds (for polling strategy) */
  pollIntervalMs?: number;
  /** Mutation observer options */
  mutationOptions?: {
    /** Watch for child list changes */
    childList: boolean;
    /** Watch for subtree changes */
    subtree: boolean;
    /** Watch for attribute changes */
    attributes: boolean;
    /** Watch for character data changes */
    characterData: boolean;
    /** Specific attributes to watch */
    attributeFilter?: string[];
  };
}

/**
 * DOM Shadow DOM configuration
 */
export interface DOMShadowConfig {
  /** Enable shadow DOM traversal */
  enabled: boolean;
  /** Maximum shadow DOM depth to traverse */
  maxDepth: number;
  /** Include closed shadow roots (if accessible) */
  includeClosed: boolean;
  /** Cross-shadow element identification strategy */
  identificationStrategy: 'path' | 'unique-id' | 'data-attributes';
}

/**
 * DOM performance optimization configuration
 */
export interface DOMPerformanceConfig {
  /** Enable lazy loading of elements */
  enableLazyLoading?: boolean;
  /** Enable result caching */
  enableCaching?: boolean;
  /** Cache TTL in milliseconds */
  cacheTTL?: number;
  /** Enable virtualization for large element collections */
  enableVirtualization?: boolean;
  /** Virtualization page size */
  virtualizationPageSize?: number;
  /** Enable performance monitoring */
  enableMonitoring?: boolean;
}

/**
 * Memory data source configuration
 */
export interface MemoryDataSourceConfig extends ConnectionConfig {
  type: 'memory';
  /** Data array or function that returns data */
  data: unknown[] | (() => unknown[]);
  /** Fields to search within data objects */
  searchFields: string[];
  /** Case sensitive search */
  caseSensitive?: boolean;
  /** Data update strategy */
  updateStrategy?: 'static' | 'reactive' | 'polling';
  /** Polling interval in milliseconds (for polling strategy) */
  pollIntervalMs?: number;
  /** Performance optimization settings */
  performance?: MemoryPerformanceConfig;
}

/**
 * DOM-specific data source configuration
 */
export interface DOMDataSourceConfig extends ConnectionConfig {
  type: 'dom';
  /** CSS selector to define search scope */
  selector: string;
  /** Attributes and properties to search in */
  searchAttributes: string[];
  /** Live update configuration */
  liveUpdate?: DOMUpdateConfig;
  /** Shadow DOM configuration */
  shadowDOM?: DOMShadowConfig;
  /** Performance optimization settings */
  performance?: DOMPerformanceConfig;
  /** DOM-specific options */
  options?: {
    /** Case sensitive search */
    caseSensitive: boolean;
    /** Include hidden elements */
    includeHidden: boolean;
    /** Maximum traversal depth */
    maxDepth: number;
    /** Extract text content method */
    textExtraction: 'textContent' | 'innerText' | 'innerHTML';
  };
}

/**
 * Data source configuration union type
 */
export type DataSourceConfig = 
  | APIDataSourceConfig 
  | SQLDataSourceConfig 
  | MemoryDataSourceConfig 
  | DOMDataSourceConfig;

/**
 * Main search configuration interface
 */
export interface SearchConfiguration {
  /** Data source configuration */
  dataSource: DataSourceConfig;
  /** Query handling configuration */
  queryHandling: QueryConfig;
  /** UI configuration */
  ui: UIConfig;
  /** Enable debug mode */
  debug?: boolean;
  /** Custom CSS class prefix */
  classPrefix?: string;
}

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: SearchConfiguration = {
  dataSource: {
    type: 'memory'
  },
  queryHandling: {
    minLength: 3,
    debounceMs: 300,
    triggerOn: 'change',
    caseSensitive: false,
    matchMode: 'partial',
    debounceStrategy: 'trailing',
    caseNormalization: 'lowercase',
    xssProtection: true,
    sqlInjectionProtection: true,
    performanceMonitoring: true
  },
  ui: {
    maxResults: 10,
    placeholder: 'Search...',
    loadingText: 'Loading...',
    noResultsText: 'No results found',
    theme: 'default',
    rtl: false
  },
  debug: false,
  classPrefix: 'universal-search'
};