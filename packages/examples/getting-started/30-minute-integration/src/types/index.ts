/**
 * TypeScript type definitions for 30-minute integration
 * Comprehensive types for all data sources and configurations
 */

// Base interfaces
export interface SearchItem {
  id: string | number;
  title: string;
  description?: string;
  category?: string;
  tags?: string[];
  metadata?: Record<string, any>;
  [key: string]: any;
}

export interface DataSource {
  id: string;
  name: string;
  type: 'api' | 'sql' | 'dom' | 'memory';
  status: 'connected' | 'disconnected' | 'loading' | 'error';
  config: DataSourceConfig;
  lastSync?: Date;
  itemCount?: number;
  errorMessage?: string;
}

// Data source configurations
export interface DataSourceConfig {
  api?: ApiConfig;
  sql?: SqlConfig;
  dom?: DomConfig;
  memory?: MemoryConfig;
}

export interface ApiConfig {
  endpoint: string;
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  apiKey?: string;
  timeout?: number;
  retries?: number;
  cache?: {
    enabled: boolean;
    ttl: number;
  };
  transform?: (data: any) => SearchItem[];
  pagination?: {
    enabled: boolean;
    pageSize: number;
    maxPages?: number;
  };
}

export interface SqlConfig {
  connectionString?: string;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  query: string;
  pool?: {
    min: number;
    max: number;
    idleTimeoutMillis: number;
  };
  ssl?: boolean;
  transform?: (rows: any[]) => SearchItem[];
}

export interface DomConfig {
  selectors: {
    container: string;
    item: string;
    title: string;
    description?: string;
    category?: string;
  };
  attributes?: Record<string, string>;
  shadowDom?: boolean;
  mutationObserver?: {
    enabled: boolean;
    options: MutationObserverInit;
  };
}

export interface MemoryConfig {
  data: SearchItem[];
  indexFields?: string[];
  fuzzySearch?: boolean;
  caseSensitive?: boolean;
}

// Search configuration
export interface SearchConfig {
  dataSources: DataSource[];
  searchOptions: SearchOptions;
  ui: UIConfig;
  performance: PerformanceConfig;
  security: SecurityConfig;
}

export interface SearchOptions {
  fields: string[];
  fuzzy: boolean;
  caseSensitive: boolean;
  maxResults: number;
  minQueryLength: number;
  debounceMs: number;
  highlightMatches: boolean;
  sortBy?: string;
  sortOrder: 'asc' | 'desc';
  filters: FilterConfig[];
}

export interface FilterConfig {
  field: string;
  label: string;
  type: 'select' | 'multiselect' | 'range' | 'date';
  options?: string[] | { value: string; label: string }[];
  min?: number;
  max?: number;
}

export interface UIConfig {
  theme: 'light' | 'dark' | 'auto';
  layout: 'list' | 'grid' | 'table';
  showCategories: boolean;
  showDescriptions: boolean;
  showMetadata: boolean;
  placeholder: string;
  noResultsText: string;
  loadingText: string;
  errorText: string;
}

export interface PerformanceConfig {
  enableCache: boolean;
  cacheSize: number;
  cacheTtl: number;
  enableVirtualScrolling: boolean;
  virtualItemHeight: number;
  enableIncrementalSearch: boolean;
  batchSize: number;
  enableWorkers: boolean;
}

export interface SecurityConfig {
  sanitizeInput: boolean;
  escapeOutput: boolean;
  validateQueries: boolean;
  rateLimitRequests: boolean;
  maxRequestsPerMinute: number;
  allowedOrigins?: string[];
  contentSecurityPolicy?: string;
}

// Search results
export interface SearchResult {
  items: SearchItem[];
  totalCount: number;
  query: string;
  executionTime: number;
  hasMore: boolean;
  page: number;
  pageSize: number;
  filters: Record<string, any>;
  sources: {
    [sourceId: string]: {
      count: number;
      executionTime: number;
      error?: string;
    };
  };
}

// API responses
export interface ApiResponse<T = any> {
  data: T;
  success: boolean;
  message?: string;
  error?: string;
  meta?: {
    total?: number;
    page?: number;
    pageSize?: number;
    hasMore?: boolean;
    executionTime?: number;
  };
}

// Event types
export interface SearchEvents {
  search: (query: string, filters: Record<string, any>) => void;
  result: (result: SearchResult) => void;
  select: (item: SearchItem) => void;
  error: (error: Error) => void;
  loading: (loading: boolean) => void;
  filter: (filters: Record<string, any>) => void;
  clear: () => void;
}

// Error types
export interface SearchError extends Error {
  code: string;
  sourceId?: string;
  details?: any;
}

export interface ValidationError extends SearchError {
  field: string;
  value: any;
  rule: string;
}

// Performance metrics
export interface PerformanceMetrics {
  searchTime: number;
  renderTime: number;
  totalTime: number;
  resultCount: number;
  cacheHits: number;
  cacheMisses: number;
  apiCalls: number;
  memoryUsage?: number;
  sources: {
    [sourceId: string]: {
      responseTime: number;
      itemCount: number;
      cacheHit: boolean;
    };
  };
}

// Styling and theming
export interface ThemeConfig {
  colors: {
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    error: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
  };
  typography: {
    fontFamily: string;
    fontSize: {
      sm: string;
      base: string;
      lg: string;
      xl: string;
    };
    fontWeight: {
      normal: string;
      medium: string;
      bold: string;
    };
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  borderRadius: {
    sm: string;
    md: string;
    lg: string;
  };
  shadows: {
    sm: string;
    md: string;
    lg: string;
  };
}

// Component props
export interface SearchComponentProps {
  config: SearchConfig;
  onSearch?: (result: SearchResult) => void;
  onSelect?: (item: SearchItem) => void;
  onError?: (error: SearchError) => void;
  className?: string;
  style?: React.CSSProperties;
}

export interface DataSourceCardProps {
  dataSource: DataSource;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onTest?: () => void;
  onEdit?: () => void;
}

export interface SearchResultsProps {
  results: SearchResult;
  loading: boolean;
  error?: SearchError;
  onSelect?: (item: SearchItem) => void;
  layout?: 'list' | 'grid' | 'table';
}

export interface FiltersPanelProps {
  filters: FilterConfig[];
  activeFilters: Record<string, any>;
  onChange: (filters: Record<string, any>) => void;
  onClear: () => void;
}

// Utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type EventCallback<T = any> = (data: T) => void;

export type DataSourceType = DataSource['type'];
export type DataSourceStatus = DataSource['status'];
export type SearchLayout = UIConfig['layout'];
export type SearchTheme = UIConfig['theme'];

// Constants
export const DATA_SOURCE_TYPES = ['api', 'sql', 'dom', 'memory'] as const;
export const DATA_SOURCE_STATUSES = ['connected', 'disconnected', 'loading', 'error'] as const;
export const SEARCH_LAYOUTS = ['list', 'grid', 'table'] as const;
export const SEARCH_THEMES = ['light', 'dark', 'auto'] as const;

// Type guards
export const isApiConfig = (config: DataSourceConfig): config is { api: ApiConfig } => {
  return config.api !== undefined;
};

export const isSqlConfig = (config: DataSourceConfig): config is { sql: SqlConfig } => {
  return config.sql !== undefined;
};

export const isDomConfig = (config: DataSourceConfig): config is { dom: DomConfig } => {
  return config.dom !== undefined;
};

export const isMemoryConfig = (config: DataSourceConfig): config is { memory: MemoryConfig } => {
  return config.memory !== undefined;
};

export const isSearchError = (error: any): error is SearchError => {
  return error instanceof Error && 'code' in error;
};

export const isValidationError = (error: any): error is ValidationError => {
  return isSearchError(error) && 'field' in error && 'rule' in error;
};