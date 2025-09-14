/**
 * API Data Source for searching remote data via REST APIs
 * Supports caching, retry logic, rate limiting, and flexible response parsing
 */

import { SearchResult, SearchOptions, DataSourceStats, APIDataSourceConfig } from '../types';
import { DataSourceBase } from './DataSourceBase';
import { SecurityUtils } from '../utils/SecurityUtils';

interface CachedResponse {
  results: SearchResult[];
  timestamp: number;
  ttl: number;
}

interface RateLimitState {
  requests: number;
  windowStart: number;
}

interface RetryState {
  attempt: number;
  lastError?: Error;
}

export class APIDataSource extends DataSourceBase {
  private config: APIDataSourceConfig;
  private responseCache: Map<string, CachedResponse> = new Map();
  private rateLimitState: RateLimitState = { requests: 0, windowStart: Date.now() };
  private isInitialized = false;
  private abortControllers: Map<string, AbortController> = new Map();

  constructor(config: APIDataSourceConfig) {
    super();
    
    this.config = {
      method: 'GET',
      queryParam: 'q',
      cache: {
        enabled: true,
        ttl: 300000, // 5 minutes
        maxSize: 100
      },
      retry: {
        attempts: 3,
        delay: 1000
      },
      rateLimit: {
        requests: 60,
        window: 60000 // 1 minute
      },
      ...config
    };

    // Override base cache settings
    this.cacheEnabled = this.config.cache?.enabled ?? true;
    this.maxCacheSize = this.config.cache?.maxSize ?? 100;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Test API connectivity
    try {
      await this.testConnection();
      this.isInitialized = true;
      this.emitSearchEvent('search', { 
        message: 'API connection established' 
      });
    } catch (error) {
      console.error('Failed to initialize API data source:', error);
      this.emitSearchEvent('error', { error });
      throw error;
    }
  }

  async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    const startTime = performance.now();
    
    if (!this.isInitialized) {
      await this.initialize();
    }

    const sanitizedQuery = SecurityUtils.sanitizeQuery(query);
    
    if (!sanitizedQuery || sanitizedQuery.length < 1) {
      return [];
    }

    // Check rate limiting
    if (!this.checkRateLimit()) {
      const error = new Error('Rate limit exceeded. Please try again later.');
      this.emitSearchEvent('error', { query: sanitizedQuery, error });
      throw error;
    }

    // Check cache first
    const cacheKey = this.generateAPICacheKey(sanitizedQuery, options);
    const cachedResponse = this.getCachedAPIResponse(cacheKey);
    if (cachedResponse) {
      console.debug(`API cache hit for query: ${sanitizedQuery}`);
      return cachedResponse;
    }

    try {
      const results = await this.performAPISearch(sanitizedQuery, options);
      const searchTime = performance.now() - startTime;

      console.debug(`API search completed in ${searchTime.toFixed(2)}ms`);

      // Cache results
      this.setCachedAPIResponse(cacheKey, results);
      
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

  private async testConnection(): Promise<void> {
    const testQuery = 'test';
    const url = this.buildRequestURL(testQuery, {});
    
    try {
      const response = await fetch(url, {
        method: this.config.method,
        headers: this.config.headers,
        signal: AbortSignal.timeout(5000) // 5 second timeout for connection test
      });

      if (!response.ok) {
        throw new Error(`API connection test failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`API connection failed: ${error.message}`);
      }
      throw error;
    }
  }

  private async performAPISearch(query: string, options: SearchOptions): Promise<SearchResult[]> {
    const requestId = SecurityUtils.generateId();
    const retryState: RetryState = { attempt: 0 };

    while (retryState.attempt < (this.config.retry?.attempts || 3)) {
      try {
        const results = await this.makeAPIRequest(query, options, requestId);
        return results;
      } catch (error) {
        retryState.attempt++;
        retryState.lastError = error as Error;

        if (retryState.attempt >= (this.config.retry?.attempts || 3)) {
          throw retryState.lastError;
        }

        // Wait before retry
        const delay = (this.config.retry?.delay || 1000) * retryState.attempt;
        console.warn(`API request failed, retrying in ${delay}ms (attempt ${retryState.attempt}):`, error);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw retryState.lastError || new Error('Max retry attempts reached');
  }

  private async makeAPIRequest(query: string, options: SearchOptions, requestId: string): Promise<SearchResult[]> {
    const url = this.buildRequestURL(query, options);
    const abortController = new AbortController();
    
    // Store abort controller for potential cancellation
    this.abortControllers.set(requestId, abortController);

    try {
      // Increment rate limit counter
      this.incrementRateLimit();

      const requestOptions: RequestInit = {
        method: this.config.method,
        headers: {
          'Content-Type': 'application/json',
          ...this.config.headers
        },
        signal: abortController.signal
      };

      // Add body for POST requests
      if (this.config.method === 'POST') {
        requestOptions.body = JSON.stringify({
          query,
          options
        });
      }

      const response = await fetch(url, requestOptions);

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const results = this.parseAPIResponse(data, query);

      return results;
    } finally {
      // Clean up abort controller
      this.abortControllers.delete(requestId);
    }
  }

  private buildRequestURL(query: string, options: SearchOptions): string {
    const url = new URL(this.config.endpoint);

    if (this.config.method === 'GET') {
      // Add query parameters for GET requests
      url.searchParams.set(this.config.queryParam || 'q', query);
      
      if (options.limit) {
        url.searchParams.set('limit', options.limit.toString());
      }
      
      if (options.offset) {
        url.searchParams.set('offset', options.offset.toString());
      }
      
      if (options.filters) {
        for (const [key, value] of Object.entries(options.filters)) {
          url.searchParams.set(`filter_${key}`, String(value));
        }
      }
      
      if (options.sort) {
        url.searchParams.set('sort_field', options.sort.field);
        url.searchParams.set('sort_direction', options.sort.direction);
      }
    }

    return url.toString();
  }

  private parseAPIResponse(data: any, query: string): SearchResult[] {
    try {
      // Use custom parser if provided
      if (this.config.responseParser) {
        return this.config.responseParser(data);
      }

      // Default parsing logic
      let items: any[] = [];

      // Handle different response structures
      if (Array.isArray(data)) {
        items = data;
      } else if (data.results && Array.isArray(data.results)) {
        items = data.results;
      } else if (data.data && Array.isArray(data.data)) {
        items = data.data;
      } else if (data.items && Array.isArray(data.items)) {
        items = data.items;
      } else {
        console.warn('Unable to parse API response structure:', data);
        return [];
      }

      // Convert items to SearchResult format
      return items.map((item, index) => {
        const result: SearchResult = {
          id: item.id || item._id || index,
          title: item.title || item.name || item.label || `Item ${index + 1}`,
          description: item.description || item.summary || item.content || '',
          url: item.url || item.link || item.href,
          metadata: this.extractMetadata(item),
          score: item.score || item._score || this.calculateRelevanceScore(item, query)
        };

        return result;
      });
    } catch (error) {
      console.error('Failed to parse API response:', error);
      throw new Error(`Failed to parse API response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private extractMetadata(item: any): Record<string, any> {
    const metadata: Record<string, any> = {};
    const excludeFields = ['id', '_id', 'title', 'name', 'label', 'description', 'summary', 'content', 'url', 'link', 'href', 'score', '_score'];

    for (const [key, value] of Object.entries(item)) {
      if (!excludeFields.includes(key)) {
        metadata[key] = value;
      }
    }

    return metadata;
  }

  private calculateRelevanceScore(item: any, query: string): number {
    let score = 0;
    const queryLower = query.toLowerCase();

    // Check title relevance
    const title = (item.title || item.name || '').toLowerCase();
    if (title.includes(queryLower)) {
      score += title === queryLower ? 100 : title.startsWith(queryLower) ? 80 : 50;
    }

    // Check description relevance
    const description = (item.description || item.content || '').toLowerCase();
    if (description.includes(queryLower)) {
      score += 30;
    }

    return score;
  }

  private checkRateLimit(): boolean {
    const now = Date.now();
    const windowDuration = this.config.rateLimit?.window || 60000;
    const maxRequests = this.config.rateLimit?.requests || 60;

    // Reset window if needed
    if (now - this.rateLimitState.windowStart >= windowDuration) {
      this.rateLimitState = {
        requests: 0,
        windowStart: now
      };
    }

    return this.rateLimitState.requests < maxRequests;
  }

  private incrementRateLimit(): void {
    this.rateLimitState.requests++;
  }

  private generateAPICacheKey(query: string, options: SearchOptions): string {
    return `api-${query}-${JSON.stringify(options)}`;
  }

  private getCachedAPIResponse(cacheKey: string): SearchResult[] | null {
    const cached = this.responseCache.get(cacheKey);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > cached.ttl) {
      this.responseCache.delete(cacheKey);
      return null;
    }

    return cached.results;
  }

  private setCachedAPIResponse(cacheKey: string, results: SearchResult[]): void {
    if (!this.config.cache?.enabled) return;

    // Limit cache size
    const maxSize = this.config.cache?.maxSize || 100;
    if (this.responseCache.size >= maxSize) {
      const firstKey = this.responseCache.keys().next().value;
      if (firstKey !== undefined) {
        this.responseCache.delete(firstKey);
      }
    }

    const ttl = this.config.cache?.ttl || 300000;
    this.responseCache.set(cacheKey, {
      results,
      timestamp: Date.now(),
      ttl
    });
  }

  async destroy(): Promise<void> {
    // Cancel all pending requests
    for (const controller of this.abortControllers.values()) {
      controller.abort();
    }
    this.abortControllers.clear();

    // Clear caches
    this.responseCache.clear();

    this.isInitialized = false;
    
    await super.destroy();
  }

  getStats(): DataSourceStats {
    return {
      itemCount: 0, // API doesn't have a fixed item count
      isIndexed: false,
      tokenCount: 0,
      cacheSize: this.responseCache.size,
      indexingThreshold: 0
    };
  }

  /**
   * Get current configuration
   */
  getConfig(): APIDataSourceConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  configure(options: Partial<APIDataSourceConfig> & Record<string, any>): void {
    super.configure(options);

    if (options.endpoint) {
      this.config.endpoint = options.endpoint;
      this.isInitialized = false; // Need to re-initialize with new endpoint
    }

    if (options.method) {
      this.config.method = options.method;
    }

    if (options.headers) {
      this.config.headers = { ...this.config.headers, ...options.headers };
    }

    if (options.queryParam) {
      this.config.queryParam = options.queryParam;
    }

    if (options.responseParser) {
      this.config.responseParser = options.responseParser;
    }

    if (options.cache) {
      this.config.cache = { ...this.config.cache, ...options.cache };
      this.cacheEnabled = this.config.cache.enabled;
      this.maxCacheSize = this.config.cache.maxSize;
    }

    if (options.retry) {
      this.config.retry = { ...this.config.retry, ...options.retry };
    }

    if (options.rateLimit) {
      this.config.rateLimit = { ...this.config.rateLimit, ...options.rateLimit };
    }

    // Clear cache when configuration changes
    this.responseCache.clear();
    this.clearCache();
  }

  /**
   * Get rate limit status
   */
  getRateLimitStatus(): {
    requests: number;
    maxRequests: number;
    windowStart: number;
    windowDuration: number;
    resetTime: number;
  } {
    const windowDuration = this.config.rateLimit?.window || 60000;
    const maxRequests = this.config.rateLimit?.requests || 60;
    
    return {
      requests: this.rateLimitState.requests,
      maxRequests,
      windowStart: this.rateLimitState.windowStart,
      windowDuration,
      resetTime: this.rateLimitState.windowStart + windowDuration
    };
  }

  /**
   * Cancel a specific request
   */
  cancelRequest(requestId: string): void {
    const controller = this.abortControllers.get(requestId);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(requestId);
    }
  }

  /**
   * Cancel all pending requests
   */
  cancelAllRequests(): void {
    for (const controller of this.abortControllers.values()) {
      controller.abort();
    }
    this.abortControllers.clear();
  }

  /**
   * Test the API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.testConnection();
      return true;
    } catch (error) {
      return false;
    }
  }
}