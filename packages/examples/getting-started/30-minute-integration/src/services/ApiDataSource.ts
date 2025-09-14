/**
 * API Data Source Implementation
 * Handles REST API connections with caching, retries, and error handling
 */

import { ApiConfig, SearchItem, SearchError } from '../types/index.js';
import { BaseDataSource } from './DataSourceManager.js';

export class ApiDataSource extends BaseDataSource {
  private config: ApiConfig;
  private cache: Map<string, { data: SearchItem[]; timestamp: number }> = new Map();
  private retryCount = 0;

  constructor(id: string, config: ApiConfig) {
    super(id, `API Source (${config.endpoint})`);
    this.config = {
      method: 'GET',
      timeout: 5000,
      retries: 3,
      cache: { enabled: true, ttl: 300000 }, // 5 minutes
      pagination: { enabled: false, pageSize: 20 },
      ...config
    };
  }

  async connect(): Promise<void> {
    try {
      this.setStatus('loading');
      await this.test();
      this.setStatus('connected');
      this.logger.info('API connection established');
    } catch (error) {
      this.setStatus('error', error.message);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.cache.clear();
    this.setStatus('disconnected');
    this.logger.info('API disconnected');
  }

  async test(): Promise<boolean> {
    try {
      const testResponse = await this.makeRequest(this.config.endpoint, {
        method: 'GET',
        timeout: this.config.timeout
      });
      
      return testResponse.ok;
    } catch (error) {
      this.logger.error('API test failed:', error);
      return false;
    }
  }

  async search(query: string, options: { maxResults?: number } = {}): Promise<SearchItem[]> {
    const cacheKey = `search:${query}:${JSON.stringify(options)}`;
    
    // Check cache first
    if (this.config.cache?.enabled && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      const isValid = Date.now() - cached.timestamp < (this.config.cache.ttl || 300000);
      
      if (isValid) {
        this.logger.debug('Returning cached results for query:', query);
        return cached.data;
      }
      
      this.cache.delete(cacheKey);
    }

    try {
      const url = this.buildSearchUrl(query, options);
      const response = await this.makeRequest(url, {
        method: this.config.method,
        headers: this.buildHeaders(),
        timeout: this.config.timeout
      });

      if (!response.ok) {
        throw new SearchError(
          `API request failed: ${response.status} ${response.statusText}`,
          'API_REQUEST_FAILED'
        );
      }

      const data = await response.json();
      let items = this.transformResponse(data);
      
      // Apply result limit
      if (options.maxResults) {
        items = items.slice(0, options.maxResults);
      }

      // Cache successful results
      if (this.config.cache?.enabled && items.length > 0) {
        this.cache.set(cacheKey, {
          data: items,
          timestamp: Date.now()
        });
      }

      this.updateItemCount(items.length);
      this.retryCount = 0; // Reset retry count on success
      
      return items;

    } catch (error) {
      this.logger.error('API search failed:', error);
      
      // Retry logic
      if (this.retryCount < (this.config.retries || 0)) {
        this.retryCount++;
        this.logger.info(`Retrying API request (${this.retryCount}/${this.config.retries})`);
        await this.delay(1000 * this.retryCount); // Exponential backoff
        return this.search(query, options);
      }
      
      this.retryCount = 0;
      throw new SearchError(
        `API search failed after ${this.config.retries} retries: ${error.message}`,
        'API_SEARCH_FAILED'
      );
    }
  }

  async refresh(): Promise<void> {
    this.cache.clear();
    this.logger.info('API cache cleared');
  }

  getConfig(): ApiConfig {
    // Return config without sensitive data
    const { apiKey, ...safeConfig } = this.config;
    return {
      ...safeConfig,
      apiKey: apiKey ? '***' : undefined
    };
  }

  getType(): 'api' {
    return 'api';
  }

  private buildSearchUrl(query: string, options: { maxResults?: number }): string {
    const url = new URL(this.config.endpoint);
    
    // Add query parameter
    url.searchParams.set('q', query);
    
    // Add pagination if enabled
    if (this.config.pagination?.enabled) {
      url.searchParams.set('limit', String(options.maxResults || this.config.pagination.pageSize));
      url.searchParams.set('page', '1');
    }
    
    // Add any additional parameters
    if (options.maxResults && !this.config.pagination?.enabled) {
      url.searchParams.set('limit', String(options.maxResults));
    }

    return url.toString();
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...this.config.headers
    };

    // Add API key if provided
    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    return headers;
  }

  private async makeRequest(url: string, options: RequestInit & { timeout?: number }): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeout || 5000);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return response;
      
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new SearchError('Request timeout', 'TIMEOUT');
      }
      
      throw error;
    }
  }

  private transformResponse(data: any): SearchItem[] {
    // Apply custom transform if provided
    if (this.config.transform) {
      return this.config.transform(data);
    }

    // Handle common response formats
    if (Array.isArray(data)) {
      return data.map(this.normalizeItem);
    }

    if (data.data && Array.isArray(data.data)) {
      return data.data.map(this.normalizeItem);
    }

    if (data.results && Array.isArray(data.results)) {
      return data.results.map(this.normalizeItem);
    }

    if (data.items && Array.isArray(data.items)) {
      return data.items.map(this.normalizeItem);
    }

    // Single item response
    if (data.id || data.title || data.name) {
      return [this.normalizeItem(data)];
    }

    this.logger.warn('Unexpected API response format:', data);
    return [];
  }

  private normalizeItem(item: any): SearchItem {
    return {
      id: item.id || item._id || Math.random().toString(36),
      title: item.title || item.name || item.label || 'Untitled',
      description: item.description || item.summary || item.excerpt,
      category: item.category || item.type || item.section,
      tags: Array.isArray(item.tags) ? item.tags : 
            typeof item.tags === 'string' ? item.tags.split(',').map(t => t.trim()) : 
            [],
      metadata: {
        ...item,
        source: 'api',
        sourceId: this.id
      }
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Example usage and configuration helpers
export const createApiDataSource = (config: Partial<ApiConfig> & { endpoint: string }) => {
  return new ApiDataSource(
    `api-${Date.now()}`,
    {
      method: 'GET',
      timeout: 5000,
      retries: 3,
      cache: { enabled: true, ttl: 300000 },
      ...config
    }
  );
};

// Common API configurations
export const API_PRESETS = {
  jsonPlaceholder: {
    endpoint: 'https://jsonplaceholder.typicode.com/posts',
    transform: (data: any[]) => data.map(post => ({
      id: post.id,
      title: post.title,
      description: post.body,
      category: 'blog',
      tags: [],
      metadata: { userId: post.userId }
    }))
  },
  
  github: (username: string) => ({
    endpoint: `https://api.github.com/users/${username}/repos`,
    headers: {
      'User-Agent': 'Universal-Search-Demo'
    },
    transform: (data: any[]) => data.map(repo => ({
      id: repo.id,
      title: repo.name,
      description: repo.description || 'No description available',
      category: repo.language || 'Unknown',
      tags: repo.topics || [],
      metadata: {
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        url: repo.html_url,
        language: repo.language
      }
    }))
  }),

  newsApi: (apiKey: string) => ({
    endpoint: 'https://newsapi.org/v2/everything',
    apiKey,
    transform: (data: any) => data.articles?.map((article: any) => ({
      id: article.url,
      title: article.title,
      description: article.description,
      category: article.source?.name || 'news',
      tags: [],
      metadata: {
        author: article.author,
        publishedAt: article.publishedAt,
        url: article.url,
        urlToImage: article.urlToImage
      }
    })) || []
  })
};