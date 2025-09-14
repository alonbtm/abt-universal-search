/**
 * Core type definitions for Universal Search Vanilla JS
 */

export interface SearchResult {
  id: string | number;
  title: string;
  description?: string;
  url?: string;
  metadata?: Record<string, any>;
  score?: number;
  highlight?: {
    title?: string;
    description?: string;
    [key: string]: string | undefined;
  };
}

export interface SearchOptions {
  limit?: number;
  offset?: number;
  filters?: Record<string, any>;
  sort?: {
    field: string;
    direction: 'asc' | 'desc';
  };
  highlight?: boolean;
  algorithm?: 'exact' | 'fuzzy' | 'prefix' | 'contains';
  fieldMapping?: Record<string, string>;
}

export interface DataSourceConfig {
  type: 'memory' | 'api' | 'dom' | 'sql';
  data?: any[];
  endpoint?: string;
  selector?: string;
  proxyUrl?: string;
  options?: {
    searchFields?: string[];
    searchAlgorithm?: 'exact' | 'fuzzy' | 'prefix' | 'contains';
    fieldMapping?: Record<string, string>;
    indexingThreshold?: number;
    [key: string]: any;
  };
}

export interface UIConfig {
  container: string | HTMLElement;
  theme?: 'light' | 'dark' | 'auto';
  templates?: {
    result?: string | ((result: SearchResult) => string);
    noResults?: string;
    loading?: string;
    error?: string;
  };
  showSearchBox?: boolean;
  placeholder?: string;
  debounceMs?: number;
}

export interface UniversalSearchConfig {
  dataSource: DataSourceConfig;
  ui: UIConfig;
  performance?: {
    cache?: boolean;
    cacheTTL?: number;
    maxCacheSize?: number;
  };
  security?: {
    sanitizeInput?: boolean;
    allowHTML?: boolean;
  };
}

export interface SearchEvent {
  type: 'search' | 'results' | 'select' | 'error' | 'loading';
  query?: string;
  results?: SearchResult[];
  result?: SearchResult;
  error?: Error;
  timestamp: number;
}

export type EventListener = (event: SearchEvent) => void;

// Enhanced Memory Data Source specific interfaces
export interface MemorySearchOptions extends SearchOptions {
  algorithm?: 'exact' | 'fuzzy' | 'prefix' | 'contains';
  fieldMapping?: Record<string, string>;
}

export interface DataSourceStats {
  itemCount: number;
  isIndexed: boolean;
  tokenCount: number;
  cacheSize: number;
  indexingThreshold: number;
}

export interface IndexEntry {
  id: number;
  tokens: Set<string>;
  fields: Map<string, string>;
}

export interface SearchIndex {
  tokens: Map<string, Set<number>>;
  entries: Map<number, IndexEntry>;
}

// Data Source Base interface for unified API
export interface DataSourceBase {
  search(query: string, options?: SearchOptions): Promise<SearchResult[]>;
  initialize?(): Promise<void>;
  destroy?(): void;
  configure?(options: Record<string, any>): void;
  getStats?(): DataSourceStats;
}

// API Data Source specific interfaces
export interface APIDataSourceConfig {
  endpoint: string;
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  queryParam?: string;
  responseParser?: (response: any) => SearchResult[];
  cache?: {
    enabled: boolean;
    ttl: number;
    maxSize: number;
  };
  retry?: {
    attempts: number;
    delay: number;
  };
  rateLimit?: {
    requests: number;
    window: number;
  };
}

// DOM Data Source specific interfaces
export interface DOMDataSourceConfig {
  selector: string;
  searchFields: {
    title: string;
    description?: string;
    url?: string;
  };
  observeChanges?: boolean;
  extractMetadata?: boolean;
}

// SQL Proxy Data Source specific interfaces
export interface SQLDataSourceConfig {
  proxyUrl: string;
  table: string;
  searchFields: string[];
  connection?: {
    timeout: number;
    retries: number;
  };
  security?: {
    sanitizeQueries: boolean;
    allowedOperations: string[];
  };
}

export interface SQLProxyRequest {
  query: string;
  table: string;
  fields: string[];
  limit?: number;
  offset?: number;
  filters?: Record<string, any>;
}

export interface SQLProxyResponse {
  results: SearchResult[];
  total: number;
  took: number;
  error?: string;
}