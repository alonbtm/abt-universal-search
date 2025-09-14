/**
 * Unified Data Source - Provides consistent interface across all data source types
 * Supports runtime switching between Memory, DOM, API, and SQL data sources
 */

import { 
  SearchResult, 
  SearchOptions, 
  DataSourceConfig, 
  DataSourceStats,
  MemorySearchOptions,
  APIDataSourceConfig,
  DOMDataSourceConfig,
  SQLDataSourceConfig
} from '../types';
import { DataSourceBase } from './DataSourceBase';
import { MemoryDataSource } from './MemoryDataSource';
import { DOMDataSource } from './DOMDataSource';
import { APIDataSource } from './APIDataSource';
import { SQLDataSource } from './SQLDataSource';
import { SecurityUtils } from '../utils/SecurityUtils';

type DataSourceInstance = MemoryDataSource | DOMDataSource | APIDataSource | SQLDataSource;

interface DataSourceState {
  instance: DataSourceInstance;
  config: DataSourceConfig;
  isActive: boolean;
}

export class UnifiedDataSource extends DataSourceBase {
  private dataSources: Map<string, DataSourceState> = new Map();
  private activeDataSourceId: string | null = null;
  private defaultDataSourceId: string | null = null;

  constructor(initialConfig?: DataSourceConfig) {
    super();

    if (initialConfig) {
      const id = this.addDataSource(initialConfig);
      this.setActiveDataSource(id);
      this.defaultDataSourceId = id;
    }
  }

  /**
   * Add a new data source configuration
   */
  addDataSource(config: DataSourceConfig, id?: string): string {
    const dataSourceId = id || SecurityUtils.generateId();
    
    if (this.dataSources.has(dataSourceId)) {
      throw new Error(`Data source with ID '${dataSourceId}' already exists`);
    }

    // Create the appropriate data source instance
    const instance = this.createDataSourceInstance(config);
    
    // Forward events from the data source
    this.setupDataSourceEventForwarding(instance, dataSourceId);

    this.dataSources.set(dataSourceId, {
      instance,
      config: { ...config },
      isActive: false
    });

    return dataSourceId;
  }

  /**
   * Remove a data source
   */
  async removeDataSource(id: string): Promise<void> {
    const state = this.dataSources.get(id);
    if (!state) {
      throw new Error(`Data source with ID '${id}' not found`);
    }

    // Destroy the data source instance
    if (state.instance.destroy) {
      await state.instance.destroy();
    }

    this.dataSources.delete(id);

    // If this was the active data source, switch to default or first available
    if (this.activeDataSourceId === id) {
      this.activeDataSourceId = null;
      
      if (this.defaultDataSourceId && this.dataSources.has(this.defaultDataSourceId)) {
        this.setActiveDataSource(this.defaultDataSourceId);
      } else {
        const firstId = this.dataSources.keys().next().value;
        if (firstId) {
          this.setActiveDataSource(firstId);
        }
      }
    }
  }

  /**
   * Set the active data source
   */
  setActiveDataSource(id: string): void {
    const state = this.dataSources.get(id);
    if (!state) {
      throw new Error(`Data source with ID '${id}' not found`);
    }

    // Deactivate current active data source
    if (this.activeDataSourceId) {
      const currentState = this.dataSources.get(this.activeDataSourceId);
      if (currentState) {
        currentState.isActive = false;
      }
    }

    // Activate new data source
    state.isActive = true;
    this.activeDataSourceId = id;

    this.emitSearchEvent('search', { 
      message: `Switched to data source: ${state.config.type} (${id})` 
    });
  }

  /**
   * Get the active data source ID
   */
  getActiveDataSourceId(): string | null {
    return this.activeDataSourceId;
  }

  /**
   * Get active data source instance
   */
  private getActiveDataSource(): DataSourceInstance | null {
    if (!this.activeDataSourceId) return null;
    
    const state = this.dataSources.get(this.activeDataSourceId);
    return state ? state.instance : null;
  }

  /**
   * Auto-detect data source type from configuration
   */
  static detectDataSourceType(config: any): DataSourceConfig['type'] {
    if (config.data && Array.isArray(config.data)) {
      return 'memory';
    }
    
    if (config.selector || (typeof config === 'string' && config.includes('.'))) {
      return 'dom';
    }
    
    if (config.endpoint || config.url) {
      return 'api';
    }
    
    if (config.proxyUrl || config.table) {
      return 'sql';
    }

    // Default to memory
    return 'memory';
  }

  /**
   * Create a data source from auto-detected configuration
   */
  static fromAutoConfig(config: any): UnifiedDataSource {
    const type = UnifiedDataSource.detectDataSourceType(config);
    
    const dataSourceConfig: DataSourceConfig = {
      type,
      ...config
    };

    return new UnifiedDataSource(dataSourceConfig);
  }

  async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    const activeSource = this.getActiveDataSource();
    if (!activeSource) {
      throw new Error('No active data source available');
    }

    try {
      return await activeSource.search(query, options);
    } catch (error) {
      this.emitSearchEvent('error', { 
        query, 
        error,
        dataSourceId: this.activeDataSourceId 
      });
      throw error;
    }
  }

  async initialize(): Promise<void> {
    const activeSource = this.getActiveDataSource();
    if (activeSource && activeSource.initialize) {
      await activeSource.initialize();
    }
  }

  async destroy(): Promise<void> {
    // Destroy all data sources
    for (const [id, state] of this.dataSources) {
      if (state.instance.destroy) {
        await state.instance.destroy();
      }
    }
    
    this.dataSources.clear();
    this.activeDataSourceId = null;
    this.defaultDataSourceId = null;

    await super.destroy();
  }

  configure(options: Record<string, any>): void {
    const activeSource = this.getActiveDataSource();
    if (activeSource && activeSource.configure) {
      activeSource.configure(options);
    }
  }

  getStats(): DataSourceStats {
    const activeSource = this.getActiveDataSource();
    if (activeSource && activeSource.getStats) {
      const stats = activeSource.getStats();
      return {
        ...stats,
        // Add unified data source specific stats
        ...super.getStats()
      };
    }

    return super.getStats();
  }

  /**
   * Get statistics for all data sources
   */
  getAllStats(): Record<string, DataSourceStats & { type: string; isActive: boolean }> {
    const allStats: Record<string, DataSourceStats & { type: string; isActive: boolean }> = {};

    for (const [id, state] of this.dataSources) {
      const stats = state.instance.getStats ? state.instance.getStats() : {
        itemCount: 0,
        isIndexed: false,
        tokenCount: 0,
        cacheSize: 0,
        indexingThreshold: 0
      };

      allStats[id] = {
        ...stats,
        type: state.config.type,
        isActive: state.isActive
      };
    }

    return allStats;
  }

  /**
   * Get all data source configurations
   */
  getAllConfigurations(): Record<string, { type: string; config: DataSourceConfig; isActive: boolean }> {
    const configs: Record<string, { type: string; config: DataSourceConfig; isActive: boolean }> = {};

    for (const [id, state] of this.dataSources) {
      configs[id] = {
        type: state.config.type,
        config: { ...state.config },
        isActive: state.isActive
      };
    }

    return configs;
  }

  /**
   * Switch between data sources with state preservation
   */
  switchDataSource(fromId: string, toId: string, preserveState = true): void {
    const fromState = this.dataSources.get(fromId);
    const toState = this.dataSources.get(toId);

    if (!fromState || !toState) {
      throw new Error('Invalid data source IDs for switching');
    }

    if (preserveState) {
      // Preserve cache state if possible
      if (fromState.instance.cache && toState.instance.cache) {
        // Copy cache from source to target (with type compatibility check)
        const fromCache = fromState.instance.cache;
        const toCache = toState.instance.cache;
        
        for (const [key, value] of fromCache.entries()) {
          toCache.set(key, value);
        }
      }
    }

    this.setActiveDataSource(toId);
  }

  /**
   * Search across multiple data sources and merge results
   */
  async searchAll(
    query: string, 
    options: SearchOptions = {}, 
    dataSourceIds?: string[]
  ): Promise<{
    results: SearchResult[];
    sources: Record<string, { results: SearchResult[]; error?: Error; timing: number }>;
  }> {
    const searchIds = dataSourceIds || Array.from(this.dataSources.keys());
    const sources: Record<string, { results: SearchResult[]; error?: Error; timing: number }> = {};
    const allResults: SearchResult[] = [];

    // Search all specified data sources in parallel
    const searchPromises = searchIds.map(async (id) => {
      const state = this.dataSources.get(id);
      if (!state) return;

      const startTime = performance.now();
      
      try {
        const results = await state.instance.search(query, options);
        const timing = performance.now() - startTime;
        
        sources[id] = { results, timing };
        
        // Add source identifier to results
        results.forEach(result => {
          result.metadata = result.metadata || {};
          result.metadata._dataSource = id;
          result.metadata._dataSourceType = state.config.type;
        });

        allResults.push(...results);
      } catch (error) {
        const timing = performance.now() - startTime;
        sources[id] = { 
          results: [], 
          error: error as Error, 
          timing 
        };
      }
    });

    await Promise.all(searchPromises);

    // Sort combined results by score
    allResults.sort((a, b) => (b.score || 0) - (a.score || 0));

    // Apply unified pagination
    const start = options.offset || 0;
    const limit = options.limit || 20;
    const paginatedResults = allResults.slice(start, start + limit);

    return {
      results: paginatedResults,
      sources
    };
  }

  /**
   * Add data source-specific methods for Memory data source
   */
  setData(data: any[]): void {
    const activeSource = this.getActiveDataSource();
    if (activeSource instanceof MemoryDataSource) {
      activeSource.setData(data);
    } else {
      throw new Error('setData() only available for Memory data source');
    }
  }

  getData(): any[] {
    const activeSource = this.getActiveDataSource();
    if (activeSource instanceof MemoryDataSource) {
      return activeSource.getData();
    } else {
      throw new Error('getData() only available for Memory data source');
    }
  }

  private createDataSourceInstance(config: DataSourceConfig): DataSourceInstance {
    switch (config.type) {
      case 'memory':
        return new MemoryDataSource(config);
        
      case 'dom':
        if (!config.selector) {
          throw new Error('DOM data source requires a selector');
        }
        return new DOMDataSource(config as DOMDataSourceConfig);
        
      case 'api':
        if (!config.endpoint) {
          throw new Error('API data source requires an endpoint');
        }
        return new APIDataSource(config as APIDataSourceConfig);
        
      case 'sql':
        if (!config.proxyUrl || !config.options?.table) {
          throw new Error('SQL data source requires proxyUrl and table in options');
        }
        return new SQLDataSource({
          proxyUrl: config.proxyUrl,
          table: config.options.table,
          searchFields: config.options.searchFields || ['title', 'description'],
          connection: config.options.connection,
          security: config.options.security
        });
        
      default:
        throw new Error(`Unsupported data source type: ${config.type}`);
    }
  }

  private setupDataSourceEventForwarding(instance: DataSourceInstance, id: string): void {
    // Only MemoryDataSource doesn't extend DataSourceBase yet, so check for 'on' method
    if ('on' in instance && typeof instance.on === 'function') {
      instance.on('*', (event: any) => {
        // Forward events with data source context
        this.emit(event.type, {
          ...event,
          dataSourceId: id,
          dataSourceType: this.dataSources.get(id)?.config.type
        });
      });
    }
  }
}