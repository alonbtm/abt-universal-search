/**
 * Universal Search - Main entry point for vanilla JS implementation
 */

import { UniversalSearchConfig, SearchResult, SearchOptions, SearchEvent } from '../types';
import { MemoryDataSource } from '../data-sources/MemoryDataSource';
import { UIManager } from '../ui/UIManager';
import { EventEmitter } from '../utils/EventEmitter';
import { SecurityUtils } from '../utils/SecurityUtils';

export class UniversalSearch extends EventEmitter {
  private config: UniversalSearchConfig;
  private dataSource: MemoryDataSource;
  private uiManager: UIManager;
  private id: string;
  private isDestroyed = false;

  constructor(config?: Partial<UniversalSearchConfig>) {
    super();
    
    this.id = SecurityUtils.generateId();
    this.config = this.mergeDefaultConfig(config);
    
    // Initialize data source
    this.dataSource = this.createDataSource(this.config.dataSource);
    
    // Initialize UI
    this.uiManager = new UIManager(this.config.ui);
    
    // Set up event handling
    this.setupEventHandlers();
    
    // Auto-initialize from data attributes if container is provided
    this.initializeFromAttributes();
  }

  private mergeDefaultConfig(userConfig?: Partial<UniversalSearchConfig>): UniversalSearchConfig {
    const defaultConfig: UniversalSearchConfig = {
      dataSource: {
        type: 'memory',
        data: []
      },
      ui: {
        container: '#universal-search',
        theme: 'auto',
        showSearchBox: true,
        placeholder: 'Search...',
        debounceMs: 300
      },
      performance: {
        cache: true,
        cacheTTL: 300000, // 5 minutes
        maxCacheSize: 100
      },
      security: {
        sanitizeInput: true,
        allowHTML: false
      }
    };

    return this.deepMerge(defaultConfig, userConfig || {});
  }

  private deepMerge(target: any, source: any, seen = new WeakSet()): any {
    // Prevent circular references
    if (seen.has(source)) {
      return target;
    }
    
    const result = { ...target };
    
    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key]) && source[key].constructor === Object) {
          seen.add(source[key]);
          result[key] = this.deepMerge(target[key] || {}, source[key], seen);
          seen.delete(source[key]);
        } else {
          result[key] = source[key];
        }
      }
    }
    
    return result;
  }

  private createDataSource(config: UniversalSearchConfig['dataSource']): MemoryDataSource {
    // For now, only memory data source is implemented
    // Future versions will support API, DOM, and SQL data sources
    return new MemoryDataSource(config);
  }

  private setupEventHandlers(): void {
    // Handle search events from UI
    this.uiManager.on('search', async ({ query }: { query: string }) => {
      await this.handleSearch(query);
    });

    // Handle result selection from UI
    this.uiManager.on('select', ({ result }: { result: SearchResult }) => {
      this.handleSelect(result);
    });
  }

  private async handleSearch(query: string): Promise<void> {
    if (this.isDestroyed) return;

    const sanitizedQuery = this.config.security?.sanitizeInput 
      ? SecurityUtils.sanitizeQuery(query) 
      : query;

    // Emit search event
    this.emitEvent('search', { query: sanitizedQuery });

    if (!sanitizedQuery || sanitizedQuery.length < 1) {
      this.uiManager.hideResults();
      return;
    }

    try {
      // Show loading state
      this.uiManager.showLoading();
      this.emitEvent('loading', { query: sanitizedQuery });

      // Perform search
      const options: SearchOptions = {
        limit: 20,
        highlight: true
      };

      const results = await this.dataSource.search(sanitizedQuery, options);

      // Show results
      this.uiManager.showResults(results);
      this.emitEvent('results', { query: sanitizedQuery, results });

    } catch (error) {
      console.error('Search error:', error);
      this.uiManager.showError(error as Error);
      this.emitEvent('error', { query: sanitizedQuery, error: error as Error });
    }
  }

  private handleSelect(result: SearchResult): void {
    this.emitEvent('select', { result });

    // If result has a URL, navigate to it
    if (result.url) {
      window.location.href = result.url;
    }
  }

  private emitEvent(type: SearchEvent['type'], data: Partial<SearchEvent> = {}): void {
    const event: SearchEvent = {
      type,
      timestamp: Date.now(),
      ...data
    };

    this.emit(type, event);
    this.emit('*', event); // Wildcard event for all events
  }

  private initializeFromAttributes(): void {
    const container = this.resolveContainer(this.config.ui.container);
    if (!container) return;

    // Initialize data from data attributes
    const dataAttr = container.getAttribute('data-data');
    if (dataAttr) {
      try {
        const data = JSON.parse(dataAttr);
        if (Array.isArray(data)) {
          this.setData(data);
        }
      } catch (error) {
        console.warn('Invalid data attribute JSON:', error);
      }
    }

    // Set search query from data attribute
    const queryAttr = container.getAttribute('data-query');
    if (queryAttr) {
      this.setQuery(queryAttr);
    }
  }

  private resolveContainer(container: string | HTMLElement): HTMLElement | null {
    if (typeof container === 'string') {
      return document.querySelector(container);
    }
    return container;
  }

  // Public API methods

  /**
   * Perform a search programmatically
   */
  async search(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    if (this.isDestroyed) {
      throw new Error('UniversalSearch instance has been destroyed');
    }

    const sanitizedQuery = this.config.security?.sanitizeInput 
      ? SecurityUtils.sanitizeQuery(query) 
      : query;

    return await this.dataSource.search(sanitizedQuery, options || {});
  }

  /**
   * Set the search query in the UI
   */
  setQuery(query: string): void {
    if (this.isDestroyed) return;
    this.uiManager.setQuery(query);
  }

  /**
   * Get the current search query from the UI
   */
  getQuery(): string {
    if (this.isDestroyed) return '';
    return this.uiManager.getQuery();
  }

  /**
   * Set data for memory data source
   */
  setData(data: any[]): void {
    if (this.isDestroyed) return;
    
    if (this.dataSource instanceof MemoryDataSource) {
      this.dataSource.setData(data);
    }
  }

  /**
   * Get data from memory data source
   */
  getData(): any[] {
    if (this.isDestroyed) return [];
    
    if (this.dataSource instanceof MemoryDataSource) {
      return this.dataSource.getData();
    }
    
    return [];
  }

  /**
   * Clear search results cache
   */
  clearCache(): void {
    if (this.isDestroyed) return;
    
    if (this.dataSource instanceof MemoryDataSource) {
      this.dataSource.clearCache();
    }
  }

  /**
   * Show search results programmatically
   */
  showResults(results: SearchResult[]): void {
    if (this.isDestroyed) return;
    this.uiManager.showResults(results);
  }

  /**
   * Hide search results
   */
  hideResults(): void {
    if (this.isDestroyed) return;
    this.uiManager.hideResults();
  }

  /**
   * Get the unique instance ID
   */
  getId(): string {
    return this.id;
  }

  /**
   * Get current configuration
   */
  getConfig(): UniversalSearchConfig {
    return { ...this.config };
  }

  /**
   * Update configuration (partial update)
   */
  updateConfig(config: Partial<UniversalSearchConfig>): void {
    if (this.isDestroyed) return;
    
    this.config = this.deepMerge(this.config, config);
    
    // Note: This doesn't reinitialize components
    // Full reconfiguration would require destroy/recreate
  }

  /**
   * Destroy the search instance and clean up resources
   */
  destroy(): void {
    if (this.isDestroyed) return;

    this.isDestroyed = true;
    
    // Clean up UI
    this.uiManager.destroy();
    
    // Clear data source cache
    if (this.dataSource instanceof MemoryDataSource) {
      this.dataSource.clearCache();
    }
    
    // Remove all event listeners
    this.removeAllListeners();
  }

  /**
   * Check if instance is destroyed
   */
  getIsDestroyed(): boolean {
    return this.isDestroyed;
  }

  // Static factory methods for easy instantiation

  /**
   * Create a memory-based search instance with data
   */
  static memory(data: any[], container: string | HTMLElement, options?: Partial<UniversalSearchConfig>): UniversalSearch {
    return new UniversalSearch({
      dataSource: { type: 'memory', data },
      ui: { container },
      ...options
    });
  }

  /**
   * Auto-initialize from DOM data attributes
   */
  static auto(): UniversalSearch[] {
    const elements = document.querySelectorAll('[data-universal-search]');
    const instances: UniversalSearch[] = [];

    elements.forEach(element => {
      try {
        const instance = new UniversalSearch({
          ui: { container: element as HTMLElement }
        });
        instances.push(instance);
      } catch (error) {
        console.error('Failed to initialize UniversalSearch for element:', element, error);
      }
    });

    return instances;
  }

  /**
   * Get data source statistics
   */
  getDataSourceStats(): any {
    if (this.isDestroyed) return null;
    
    if (this.dataSource.getStats) {
      return this.dataSource.getStats();
    }
    
    return null;
  }

  /**
   * Get data source type
   */
  getDataSourceType(): string {
    return this.config.dataSource.type;
  }

  /**
   * Configure the data source
   */
  configureDataSource(options: Record<string, any>): void {
    if (this.isDestroyed) return;
    
    if (this.dataSource.configure) {
      this.dataSource.configure(options);
    }
  }

  /**
   * Initialize the data source (useful for async data sources like DOM/API)
   */
  async initialize(): Promise<void> {
    if (this.isDestroyed) return;
    
    if (this.dataSource.initialize) {
      await this.dataSource.initialize();
    }
  }
}

// Auto-initialize when DOM is ready
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      UniversalSearch.auto();
    });
  } else {
    // DOM is already ready
    setTimeout(() => UniversalSearch.auto(), 0);
  }
}