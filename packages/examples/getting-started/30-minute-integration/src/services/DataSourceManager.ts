/**
 * Data Source Manager
 * Centralized management for all data sources (API, SQL, DOM, Memory)
 */

import { 
  DataSource, 
  SearchItem, 
  SearchResult, 
  ApiConfig, 
  SqlConfig, 
  DomConfig, 
  MemoryConfig,
  SearchError,
  PerformanceMetrics
} from '../types/index.js';
import { ApiDataSource } from './ApiDataSource.js';
import { SqlDataSource } from './SqlDataSource.js';
import { DomDataSource } from './DomDataSource.js';
import { MemoryDataSource } from './MemoryDataSource.js';
import { EventEmitter } from '../utils/EventEmitter.js';
import { Logger } from '../utils/Logger.js';

export class DataSourceManager extends EventEmitter {
  private dataSources: Map<string, BaseDataSource> = new Map();
  private logger: Logger;
  private performanceMetrics: Map<string, PerformanceMetrics> = new Map();
  private cache: Map<string, { data: SearchItem[]; timestamp: number; ttl: number }> = new Map();

  constructor() {
    super();
    this.logger = new Logger('DataSourceManager');
  }

  /**
   * Register a data source
   */
  async registerDataSource(config: DataSource): Promise<void> {
    try {
      this.logger.info(`Registering data source: ${config.id} (${config.type})`);

      let dataSource: BaseDataSource;

      switch (config.type) {
        case 'api':
          dataSource = new ApiDataSource(config.id, config.config.api!);
          break;
        case 'sql':
          dataSource = new SqlDataSource(config.id, config.config.sql!);
          break;
        case 'dom':
          dataSource = new DomDataSource(config.id, config.config.dom!);
          break;
        case 'memory':
          dataSource = new MemoryDataSource(config.id, config.config.memory!);
          break;
        default:
          throw new Error(`Unsupported data source type: ${config.type}`);
      }

      // Set up event listeners
      dataSource.on('status', (status) => {
        this.emit('dataSourceStatus', { id: config.id, status });
      });

      dataSource.on('error', (error) => {
        this.logger.error(`Data source ${config.id} error:`, error);
        this.emit('dataSourceError', { id: config.id, error });
      });

      dataSource.on('data', (data) => {
        this.emit('dataSourceData', { id: config.id, data });
      });

      this.dataSources.set(config.id, dataSource);
      
      // Attempt initial connection
      await dataSource.connect();
      
      this.logger.info(`Data source ${config.id} registered successfully`);
      this.emit('dataSourceRegistered', config);

    } catch (error) {
      this.logger.error(`Failed to register data source ${config.id}:`, error);
      throw new SearchError(`Failed to register data source: ${error.message}`, 'REGISTRATION_ERROR');
    }
  }

  /**
   * Unregister a data source
   */
  async unregisterDataSource(id: string): Promise<void> {
    const dataSource = this.dataSources.get(id);
    if (dataSource) {
      await dataSource.disconnect();
      this.dataSources.delete(id);
      this.performanceMetrics.delete(id);
      this.logger.info(`Data source ${id} unregistered`);
      this.emit('dataSourceUnregistered', { id });
    }
  }

  /**
   * Get all registered data sources
   */
  getDataSources(): DataSource[] {
    return Array.from(this.dataSources.entries()).map(([id, source]) => ({
      id,
      name: source.getName(),
      type: source.getType(),
      status: source.getStatus(),
      config: source.getConfig(),
      lastSync: source.getLastSync(),
      itemCount: source.getItemCount(),
      errorMessage: source.getErrorMessage()
    }));
  }

  /**
   * Get specific data source
   */
  getDataSource(id: string): DataSource | null {
    const source = this.dataSources.get(id);
    if (!source) return null;

    return {
      id,
      name: source.getName(),
      type: source.getType(),
      status: source.getStatus(),
      config: source.getConfig(),
      lastSync: source.getLastSync(),
      itemCount: source.getItemCount(),
      errorMessage: source.getErrorMessage()
    };
  }

  /**
   * Test data source connection
   */
  async testDataSource(id: string): Promise<boolean> {
    const dataSource = this.dataSources.get(id);
    if (!dataSource) {
      throw new SearchError(`Data source ${id} not found`, 'SOURCE_NOT_FOUND');
    }

    try {
      return await dataSource.test();
    } catch (error) {
      this.logger.error(`Test failed for data source ${id}:`, error);
      return false;
    }
  }

  /**
   * Search across all or specific data sources
   */
  async search(
    query: string, 
    options: {
      sourceIds?: string[];
      maxResults?: number;
      timeout?: number;
      useCache?: boolean;
      filters?: Record<string, any>;
    } = {}
  ): Promise<SearchResult> {
    const startTime = performance.now();
    const { sourceIds, maxResults = 50, timeout = 5000, useCache = true, filters = {} } = options;

    this.logger.info(`Searching for: "${query}" across ${sourceIds?.length || this.dataSources.size} sources`);

    // Determine which sources to search
    const sourcesToSearch = sourceIds 
      ? sourceIds.map(id => this.dataSources.get(id)).filter(Boolean)
      : Array.from(this.dataSources.values());

    if (sourcesToSearch.length === 0) {
      return {
        items: [],
        totalCount: 0,
        query,
        executionTime: 0,
        hasMore: false,
        page: 1,
        pageSize: maxResults,
        filters,
        sources: {}
      };
    }

    const results: SearchItem[] = [];
    const sourceResults: Record<string, { count: number; executionTime: number; error?: string }> = {};
    const promises: Promise<void>[] = [];

    // Create search promises for each source
    for (const source of sourcesToSearch) {
      const promise = this.searchSingleSource(source, query, maxResults, useCache)
        .then((items) => {
          const sourceStartTime = performance.now();
          results.push(...items);
          const sourceEndTime = performance.now();
          
          sourceResults[source.getId()] = {
            count: items.length,
            executionTime: sourceEndTime - sourceStartTime,
          };
        })
        .catch((error) => {
          this.logger.error(`Search failed for source ${source.getId()}:`, error);
          sourceResults[source.getId()] = {
            count: 0,
            executionTime: 0,
            error: error.message
          };
        });

      promises.push(promise);
    }

    // Wait for all searches with timeout
    try {
      await Promise.race([
        Promise.allSettled(promises),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Search timeout')), timeout)
        )
      ]);
    } catch (error) {
      this.logger.warn('Some searches timed out');
    }

    // Apply filters
    let filteredResults = this.applyFilters(results, filters);

    // Sort and limit results
    filteredResults = this.sortAndLimitResults(filteredResults, maxResults, query);

    const endTime = performance.now();
    const executionTime = endTime - startTime;

    const result: SearchResult = {
      items: filteredResults,
      totalCount: results.length,
      query,
      executionTime,
      hasMore: results.length > maxResults,
      page: 1,
      pageSize: maxResults,
      filters,
      sources: sourceResults
    };

    this.logger.info(`Search completed in ${executionTime.toFixed(2)}ms, found ${filteredResults.length} results`);
    this.emit('searchCompleted', result);

    return result;
  }

  /**
   * Search a single data source
   */
  private async searchSingleSource(
    source: BaseDataSource, 
    query: string, 
    maxResults: number,
    useCache: boolean
  ): Promise<SearchItem[]> {
    const cacheKey = `${source.getId()}:${query}`;
    
    // Check cache first
    if (useCache && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      if (Date.now() - cached.timestamp < cached.ttl) {
        return cached.data;
      }
      this.cache.delete(cacheKey);
    }

    // Perform search
    const items = await source.search(query, { maxResults });
    
    // Cache results
    if (useCache && items.length > 0) {
      this.cache.set(cacheKey, {
        data: items,
        timestamp: Date.now(),
        ttl: 5 * 60 * 1000 // 5 minutes
      });
    }

    return items;
  }

  /**
   * Apply filters to search results
   */
  private applyFilters(items: SearchItem[], filters: Record<string, any>): SearchItem[] {
    if (Object.keys(filters).length === 0) return items;

    return items.filter(item => {
      return Object.entries(filters).every(([key, value]) => {
        if (!value || (Array.isArray(value) && value.length === 0)) return true;

        const itemValue = item[key];
        if (itemValue === undefined) return false;

        if (Array.isArray(value)) {
          // Multiple values filter
          return value.some(filterValue => {
            if (Array.isArray(itemValue)) {
              return itemValue.includes(filterValue);
            }
            return itemValue === filterValue;
          });
        } else {
          // Single value filter
          if (Array.isArray(itemValue)) {
            return itemValue.includes(value);
          }
          return itemValue === value;
        }
      });
    });
  }

  /**
   * Sort and limit results by relevance
   */
  private sortAndLimitResults(items: SearchItem[], maxResults: number, query: string): SearchItem[] {
    // Sort by relevance score
    const scored = items.map(item => ({
      item,
      score: this.calculateRelevanceScore(item, query)
    }));

    scored.sort((a, b) => b.score - a.score);
    
    return scored.slice(0, maxResults).map(s => s.item);
  }

  /**
   * Calculate relevance score for search results
   */
  private calculateRelevanceScore(item: SearchItem, query: string): number {
    const queryLower = query.toLowerCase();
    let score = 0;

    // Title match (highest weight)
    if (item.title?.toLowerCase().includes(queryLower)) {
      if (item.title.toLowerCase().startsWith(queryLower)) {
        score += 100;
      } else {
        score += 50;
      }
    }

    // Description match (medium weight)
    if (item.description?.toLowerCase().includes(queryLower)) {
      score += 25;
    }

    // Category match (medium weight)
    if (item.category?.toLowerCase().includes(queryLower)) {
      score += 30;
    }

    // Tags match (lower weight)
    if (item.tags?.some(tag => tag.toLowerCase().includes(queryLower))) {
      score += 15;
    }

    // Boost score for exact matches
    const exactFields = [item.title, item.category, ...(item.tags || [])];
    if (exactFields.some(field => field?.toLowerCase() === queryLower)) {
      score += 200;
    }

    return score;
  }

  /**
   * Get performance metrics for all sources
   */
  getPerformanceMetrics(): Record<string, PerformanceMetrics> {
    const metrics: Record<string, PerformanceMetrics> = {};
    
    this.performanceMetrics.forEach((metric, sourceId) => {
      metrics[sourceId] = { ...metric };
    });

    return metrics;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    this.logger.info('Cache cleared');
    this.emit('cacheCleared');
  }

  /**
   * Refresh all data sources
   */
  async refreshAllSources(): Promise<void> {
    this.logger.info('Refreshing all data sources');
    const promises = Array.from(this.dataSources.values()).map(source => 
      source.refresh().catch(error => {
        this.logger.error(`Failed to refresh source ${source.getId()}:`, error);
      })
    );

    await Promise.allSettled(promises);
    this.clearCache();
    this.emit('sourcesRefreshed');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; hitRate: number; entries: Array<{ key: string; age: number }> } {
    const now = Date.now();
    const entries = Array.from(this.cache.entries()).map(([key, value]) => ({
      key,
      age: now - value.timestamp
    }));

    return {
      size: this.cache.size,
      hitRate: 0, // Would need to track hits/misses to calculate
      entries
    };
  }

  /**
   * Cleanup resources
   */
  async destroy(): Promise<void> {
    this.logger.info('Destroying data source manager');
    
    const promises = Array.from(this.dataSources.values()).map(source => 
      source.disconnect()
    );

    await Promise.allSettled(promises);
    
    this.dataSources.clear();
    this.performanceMetrics.clear();
    this.cache.clear();
    this.removeAllListeners();
    
    this.logger.info('Data source manager destroyed');
  }
}

/**
 * Base class for all data sources
 */
export abstract class BaseDataSource extends EventEmitter {
  protected id: string;
  protected name: string;
  protected status: DataSource['status'] = 'disconnected';
  protected lastSync?: Date;
  protected itemCount = 0;
  protected errorMessage?: string;
  protected logger: Logger;

  constructor(id: string, name: string) {
    super();
    this.id = id;
    this.name = name;
    this.logger = new Logger(`DataSource:${id}`);
  }

  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract search(query: string, options?: any): Promise<SearchItem[]>;
  abstract test(): Promise<boolean>;
  abstract refresh(): Promise<void>;
  abstract getConfig(): any;
  abstract getType(): DataSource['type'];

  getId(): string {
    return this.id;
  }

  getName(): string {
    return this.name;
  }

  getStatus(): DataSource['status'] {
    return this.status;
  }

  getLastSync(): Date | undefined {
    return this.lastSync;
  }

  getItemCount(): number {
    return this.itemCount;
  }

  getErrorMessage(): string | undefined {
    return this.errorMessage;
  }

  protected setStatus(status: DataSource['status'], errorMessage?: string): void {
    this.status = status;
    this.errorMessage = errorMessage;
    this.emit('status', status);
    
    if (status === 'error' && errorMessage) {
      this.emit('error', new SearchError(errorMessage, 'DATA_SOURCE_ERROR'));
    }
  }

  protected updateItemCount(count: number): void {
    this.itemCount = count;
    this.lastSync = new Date();
    this.emit('data', { count });
  }
}