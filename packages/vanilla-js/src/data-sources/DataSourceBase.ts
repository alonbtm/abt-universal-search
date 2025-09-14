/**
 * Base class for all data source implementations
 * Provides common functionality and enforces the unified interface
 */

import { SearchResult, SearchOptions, DataSourceStats } from '../types';
import { EventEmitter } from '../utils/EventEmitter';

export abstract class DataSourceBase extends EventEmitter {
  protected cache: Map<string, SearchResult[]> = new Map();
  protected maxCacheSize = 100;
  protected cacheEnabled = true;

  constructor() {
    super();
  }

  /**
   * Abstract method that must be implemented by all data sources
   */
  abstract search(query: string, options?: SearchOptions): Promise<SearchResult[]>;

  /**
   * Initialize the data source (optional)
   */
  async initialize(): Promise<void> {
    // Default implementation - can be overridden
  }

  /**
   * Clean up resources when data source is destroyed (optional)
   */
  async destroy(): Promise<void> {
    this.clearCache();
    this.removeAllListeners();
  }

  /**
   * Configure the data source (optional)
   */
  configure(options: Record<string, any>): void {
    if (options.cacheEnabled !== undefined) {
      this.cacheEnabled = options.cacheEnabled;
    }
    if (options.maxCacheSize !== undefined) {
      this.maxCacheSize = options.maxCacheSize;
    }
  }

  /**
   * Get performance statistics (optional)
   */
  getStats(): DataSourceStats {
    return {
      itemCount: 0,
      isIndexed: false,
      tokenCount: 0,
      cacheSize: this.cache.size,
      indexingThreshold: 0
    };
  }

  /**
   * Clear the search cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cached results if available
   */
  protected getCachedResults(cacheKey: string): SearchResult[] | null {
    if (!this.cacheEnabled) return null;
    return this.cache.get(cacheKey) || null;
  }

  /**
   * Cache search results
   */
  protected setCachedResults(cacheKey: string, results: SearchResult[]): void {
    if (!this.cacheEnabled) return;

    // Limit cache size to prevent memory issues
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(cacheKey, results);
  }

  /**
   * Generate a cache key from query and options
   */
  protected generateCacheKey(query: string, options?: SearchOptions): string {
    return `${query}-${JSON.stringify(options || {})}`;
  }

  /**
   * Emit a search event
   */
  protected emitSearchEvent(type: 'search' | 'results' | 'error', data: any): void {
    this.emit(type, {
      type,
      timestamp: Date.now(),
      ...data
    });
  }
}