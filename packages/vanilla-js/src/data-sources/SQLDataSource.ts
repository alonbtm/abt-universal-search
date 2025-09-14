/**
 * SQL Data Source using proxy service pattern
 * Connects to databases through a configurable proxy service for security
 */

import { SearchResult, SearchOptions, DataSourceStats, SQLDataSourceConfig, SQLProxyRequest, SQLProxyResponse } from '../types';
import { DataSourceBase } from './DataSourceBase';
import { SecurityUtils } from '../utils/SecurityUtils';

interface ConnectionPool {
  active: number;
  idle: number;
  total: number;
}

export class SQLDataSource extends DataSourceBase {
  private config: SQLDataSourceConfig;
  private isInitialized = false;
  private connectionPool: ConnectionPool = { active: 0, idle: 0, total: 0 };
  private pendingRequests: Map<string, AbortController> = new Map();

  constructor(config: SQLDataSourceConfig) {
    super();
    
    this.config = {
      connection: {
        timeout: 30000, // 30 seconds
        retries: 3
      },
      security: {
        sanitizeQueries: true,
        allowedOperations: ['SELECT', 'SEARCH']
      },
      ...config
    };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Test proxy connection and get connection pool info
      await this.testProxyConnection();
      this.isInitialized = true;
      
      this.emitSearchEvent('search', { 
        message: `SQL proxy connected: ${this.config.proxyUrl}` 
      });
    } catch (error) {
      console.error('Failed to initialize SQL data source:', error);
      this.emitSearchEvent('error', { error });
      throw error;
    }
  }

  async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    const startTime = performance.now();
    
    if (!this.isInitialized) {
      await this.initialize();
    }

    const sanitizedQuery = this.config.security?.sanitizeQueries 
      ? SecurityUtils.sanitizeQuery(query)
      : query;
    
    if (!sanitizedQuery || sanitizedQuery.length < 1) {
      return [];
    }

    // Check cache first
    const cacheKey = this.generateCacheKey(sanitizedQuery, options);
    const cachedResults = this.getCachedResults(cacheKey);
    if (cachedResults) {
      console.debug(`SQL cache hit for query: ${sanitizedQuery}`);
      return cachedResults;
    }

    try {
      const results = await this.performSQLSearch(sanitizedQuery, options);
      const searchTime = performance.now() - startTime;

      console.debug(`SQL search completed in ${searchTime.toFixed(2)}ms`);

      // Cache results
      this.setCachedResults(cacheKey, results);
      
      // Emit results event
      this.emitSearchEvent('results', { 
        query: sanitizedQuery, 
        results,
        searchTime 
      });

      return results;
    } catch (error) {
      this.emitSearchEvent('error', { query: sanitizedQuery, error });
      throw error;
    }
  }

  private async testProxyConnection(): Promise<void> {
    const testRequest: SQLProxyRequest = {
      query: 'test',
      table: this.config.table,
      fields: this.config.searchFields,
      limit: 1
    };

    try {
      const response = await this.makeProxyRequest('/health', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`Proxy health check failed: ${response.status} ${response.statusText}`);
      }

      const healthData = await response.json();
      if (healthData.connectionPool) {
        this.connectionPool = healthData.connectionPool;
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`SQL proxy connection failed: ${error.message}`);
      }
      throw error;
    }
  }

  private async performSQLSearch(query: string, options: SearchOptions): Promise<SearchResult[]> {
    const requestId = SecurityUtils.generateId();
    let attempt = 0;
    const maxRetries = this.config.connection?.retries || 3;

    while (attempt < maxRetries) {
      try {
        const results = await this.executeSQLSearch(query, options, requestId);
        return results;
      } catch (error) {
        attempt++;
        
        if (attempt >= maxRetries) {
          throw error;
        }

        // Wait before retry with exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        console.warn(`SQL search failed, retrying in ${delay}ms (attempt ${attempt}):`, error);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw new Error('Max retry attempts reached for SQL search');
  }

  private async executeSQLSearch(query: string, options: SearchOptions, requestId: string): Promise<SearchResult[]> {
    // Validate operation security
    if (this.config.security?.allowedOperations) {
      const operation = 'SEARCH'; // This is always a search operation
      if (!this.config.security.allowedOperations.includes(operation)) {
        throw new Error(`Operation '${operation}' is not allowed`);
      }
    }

    // Build SQL proxy request
    const proxyRequest: SQLProxyRequest = {
      query,
      table: this.config.table,
      fields: this.config.searchFields,
      limit: options.limit,
      offset: options.offset,
      filters: options.filters
    };

    // Create abort controller for request cancellation
    const abortController = new AbortController();
    this.pendingRequests.set(requestId, abortController);

    try {
      const response = await this.makeProxyRequest('/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(proxyRequest),
        signal: abortController.signal
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`SQL proxy request failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const proxyResponse: SQLProxyResponse = await response.json();
      
      if (proxyResponse.error) {
        throw new Error(`SQL proxy error: ${proxyResponse.error}`);
      }

      console.debug(`SQL query executed in ${proxyResponse.took}ms, returned ${proxyResponse.results.length} results`);

      // Apply client-side sorting if requested
      let results = proxyResponse.results;
      if (options.sort && !this.wasSortingAppliedServerSide(options)) {
        results = this.applySorting(results, options.sort);
      }

      return results;
    } finally {
      // Clean up abort controller
      this.pendingRequests.delete(requestId);
    }
  }

  private async makeProxyRequest(endpoint: string, options: RequestInit): Promise<Response> {
    const url = `${this.config.proxyUrl.replace(/\/$/, '')}${endpoint}`;
    const timeout = this.config.connection?.timeout || 30000;

    // Add timeout to the request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: options.signal || controller.signal
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timed out after ${timeout}ms`);
      }
      throw error;
    }
  }

  private wasSortingAppliedServerSide(options: SearchOptions): boolean {
    // In a real implementation, you might check if the proxy supports server-side sorting
    // For now, assume sorting was not applied server-side
    return false;
  }

  private applySorting(results: SearchResult[], sort: { field: string; direction: 'asc' | 'desc' }): SearchResult[] {
    return results.sort((a, b) => {
      const aValue = this.getNestedValue(a, sort.field);
      const bValue = this.getNestedValue(b, sort.field);
      
      let comparison = 0;
      if (aValue < bValue) comparison = -1;
      if (aValue > bValue) comparison = 1;
      
      return sort.direction === 'desc' ? -comparison : comparison;
    });
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  async destroy(): Promise<void> {
    // Cancel all pending requests
    for (const controller of this.pendingRequests.values()) {
      controller.abort();
    }
    this.pendingRequests.clear();

    this.isInitialized = false;
    
    await super.destroy();
  }

  getStats(): DataSourceStats {
    return {
      itemCount: 0, // SQL doesn't have a fixed item count
      isIndexed: true, // SQL databases typically have indexes
      tokenCount: 0,
      cacheSize: this.cache.size,
      indexingThreshold: 0
    };
  }

  /**
   * Get current configuration
   */
  getConfig(): SQLDataSourceConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  configure(options: Partial<SQLDataSourceConfig> & Record<string, any>): void {
    super.configure(options);

    let shouldReinitialize = false;

    if (options.proxyUrl && options.proxyUrl !== this.config.proxyUrl) {
      this.config.proxyUrl = options.proxyUrl;
      shouldReinitialize = true;
    }

    if (options.table) {
      this.config.table = options.table;
    }

    if (options.searchFields) {
      this.config.searchFields = [...options.searchFields];
    }

    if (options.connection) {
      this.config.connection = { ...this.config.connection, ...options.connection };
    }

    if (options.security) {
      this.config.security = { ...this.config.security, ...options.security };
    }

    // Clear cache when configuration changes
    this.clearCache();

    if (shouldReinitialize && this.isInitialized) {
      this.isInitialized = false;
      // Re-initialization will happen on next search
    }
  }

  /**
   * Get connection pool status
   */
  getConnectionPoolStatus(): ConnectionPool {
    return { ...this.connectionPool };
  }

  /**
   * Cancel a specific request
   */
  cancelRequest(requestId: string): void {
    const controller = this.pendingRequests.get(requestId);
    if (controller) {
      controller.abort();
      this.pendingRequests.delete(requestId);
    }
  }

  /**
   * Cancel all pending requests
   */
  cancelAllRequests(): void {
    for (const controller of this.pendingRequests.values()) {
      controller.abort();
    }
    this.pendingRequests.clear();
  }

  /**
   * Test the proxy connection
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.testProxyConnection();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Execute a raw SQL query through the proxy (advanced usage)
   */
  async executeRawQuery(sql: string, params?: any[]): Promise<any[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Security check
    if (this.config.security?.sanitizeQueries) {
      // Basic SQL injection prevention
      const dangerousKeywords = ['DROP', 'DELETE', 'UPDATE', 'INSERT', 'ALTER', 'CREATE', 'TRUNCATE'];
      const upperSQL = sql.toUpperCase();
      
      for (const keyword of dangerousKeywords) {
        if (upperSQL.includes(keyword)) {
          throw new Error(`SQL operation '${keyword}' is not allowed`);
        }
      }
    }

    const requestId = SecurityUtils.generateId();
    const abortController = new AbortController();
    this.pendingRequests.set(requestId, abortController);

    try {
      const response = await this.makeProxyRequest('/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sql,
          params
        }),
        signal: abortController.signal
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Raw SQL execution failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      
      if (result.error) {
        throw new Error(`SQL execution error: ${result.error}`);
      }

      return result.rows || [];
    } finally {
      this.pendingRequests.delete(requestId);
    }
  }
}