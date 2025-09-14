/**
 * UniversalSearch - Main Component Class
 * @description Core component class for universal search functionality
 */

import type { SearchConfiguration } from './types/Config';
import type { SearchState, SearchResult } from './types/Results';
import type { UniversalSearchEvent, EventHandler, EventListenerMap } from './types/Events';
import { DEFAULT_CONFIG } from './types/Config';
import {
  validateSelector,
  validateTargetElement,
  validateConfiguration,
  ValidationError,
} from './utils/validation';
import { MemoryAdapter, type MemoryAdapterConfig } from './adapters/MemoryAdapter';
import { QueryProcessor } from './pipeline/QueryProcessor';
import { ResponseTransformer, type ResponseMapping } from './pipeline/ResponseTransformer';
import { SearchInput } from './ui/SearchInput';
import { ResultsDropdown } from './ui/ResultsDropdown';
import { PerformanceTracker } from './monitoring/PerformanceTracker';
import { AnalyticsCollector } from './monitoring/AnalyticsCollector';
import { BrowserProfiler } from './monitoring/BrowserProfiler';
import { ExperimentManager } from './monitoring/ExperimentManager';
import { PrivacyManager } from './monitoring/PrivacyManager';
import { MetricsExporter } from './monitoring/MetricsExporter';
import type { PerformanceMetrics, AnalyticsEvent } from './types/Analytics';

/**
 * Main UniversalSearch component class
 */
export class UniversalSearch {
  private readonly selector: string;
  private readonly config: Readonly<SearchConfiguration>;
  private targetElement: HTMLElement | null = null;
  private initialized = false;
  private destroyed = false;
  private eventListeners: EventListenerMap = {};

  private state: SearchState = {
    query: '',
    results: [],
    loading: false,
    error: null,
    hasMore: false,
    total: 0,
  };

  // Search pipeline components
  private memoryAdapter: MemoryAdapter | null = null;
  private queryProcessor: QueryProcessor | null = null;
  private responseTransformer: ResponseTransformer | null = null;
  private searchInput: SearchInput | null = null;
  private resultsDropdown: ResultsDropdown | null = null;
  private debounceTimer: number | null = null;

  // Monitoring and analytics components
  private performanceTracker: PerformanceTracker | null = null;
  private analyticsCollector: AnalyticsCollector | null = null;
  private browserProfiler: BrowserProfiler | null = null;
  private experimentManager: ExperimentManager | null = null;
  private privacyManager: PrivacyManager | null = null;
  private metricsExporter: MetricsExporter | null = null;

  /**
   * Creates a new UniversalSearch instance
   * @param selector - CSS selector for the target element
   * @param config - Search configuration options
   */
  constructor(selector: string, config: Partial<SearchConfiguration> = {}) {
    try {
      // Validate selector
      validateSelector(selector);
      this.selector = selector;

      // Validate and merge configuration
      validateConfiguration(config);
      this.config = Object.freeze(this.mergeConfig(config));

      if (this.config.debug) {
        console.log('[UniversalSearch] Instance created', { selector, config: this.config });
      }
    } catch (error) {
      const validationError =
        error instanceof ValidationError
          ? error
          : new ValidationError(`Failed to create UniversalSearch instance: ${error}`);

      if (config.debug !== false) {
        console.error('[UniversalSearch] Constructor error:', validationError);
      }
      throw validationError;
    }
  }

  /**
   * Initializes the component and mounts it to the DOM
   */
  public init(): void {
    if (this.destroyed) {
      throw new ValidationError('Cannot initialize destroyed component instance');
    }

    if (this.initialized) {
      if (this.config.debug) {
        console.warn('[UniversalSearch] Component already initialized');
      }
      return;
    }

    try {
      // Find and validate target element
      const element = document.querySelector(this.selector);
      validateTargetElement(element, this.selector);
      this.targetElement = element;

      // Set up DOM structure
      this.setupDomStructure();

      // Initialize search pipeline
      this.initializeSearchPipeline();

      // Initialize UI components
      this.initializeUIComponents();

      // Initialize event system
      this.initializeEventSystem();

      // Initialize monitoring and analytics
      this.initializeMonitoring();

      // Set up event handlers
      this.setupEventHandlers();

      // Apply initial configuration
      this.applyConfiguration();

      this.initialized = true;

      if (this.config.debug) {
        console.log('[UniversalSearch] Component initialized successfully');
      }

      // Emit initialization complete event
      this.emit({
        type: 'search:start' as const,
        timestamp: Date.now(),
        target: this.targetElement,
        query: '',
      });
    } catch (error) {
      const initError =
        error instanceof ValidationError
          ? error
          : new ValidationError(`Initialization failed: ${error}`);

      if (this.config.debug) {
        console.error('[UniversalSearch] Initialization error:', initError);
      }
      throw initError;
    }
  }

  /**
   * Destroys the component and cleans up resources
   */
  public destroy(): void {
    if (this.destroyed) {
      if (this.config.debug) {
        console.warn('[UniversalSearch] Component already destroyed');
      }
      return;
    }

    try {
      // Clear debounce timer
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = null;
      }

      // Destroy UI components
      if (this.searchInput) {
        this.searchInput.destroy();
        this.searchInput = null;
      }

      if (this.resultsDropdown) {
        this.resultsDropdown.destroy();
        this.resultsDropdown = null;
      }

      // Remove event listeners
      this.cleanupEventListeners();

      // Clean up DOM modifications
      this.cleanupDomStructure();

      // Clear search pipeline
      this.memoryAdapter = null;
      this.queryProcessor = null;
      this.responseTransformer = null;

      // Cleanup monitoring components
      this.cleanupMonitoring();

      // Clear state
      this.state = {
        query: '',
        results: [],
        loading: false,
        error: null,
        hasMore: false,
        total: 0,
      };

      // Mark as destroyed
      this.initialized = false;
      this.destroyed = true;
      this.targetElement = null;

      if (this.config.debug) {
        console.log('[UniversalSearch] Component destroyed successfully');
      }
    } catch (error) {
      if (this.config.debug) {
        console.error('[UniversalSearch] Destruction error:', error);
      }
      // Don't throw on destruction errors, just log them
    }
  }

  /**
   * Gets the current configuration
   */
  public getConfig(): Readonly<SearchConfiguration> {
    return this.config;
  }

  /**
   * Gets the current search results
   */
  public getResults(): readonly SearchResult[] {
    return [...this.state.results];
  }

  /**
   * Gets the current query
   */
  public getQuery(): string {
    return this.state.query;
  }

  /**
   * Perform a search with the given query
   */
  public async search(query: string): Promise<SearchResult[]> {
    if (!this.initialized) {
      throw new ValidationError('Component must be initialized before searching');
    }

    if (!this.queryProcessor || !this.memoryAdapter || !this.responseTransformer) {
      throw new ValidationError('Search pipeline not initialized');
    }

    try {
      // Process and validate query
      const processedQuery = this.queryProcessor.processQuery(query);

      if (!processedQuery.isValid) {
        this.setState({
          query: processedQuery.original,
          loading: false,
          error: new Error(processedQuery.error || 'Invalid query'),
          results: [],
        });
        return [];
      }

      // Update state to loading
      this.setState({
        query: processedQuery.original,
        loading: true,
        error: null,
      });

      // Emit search start event
      this.emit({
        type: 'search:start' as const,
        timestamp: Date.now(),
        target: this.targetElement!,
        query: processedQuery.normalized,
      });

      // Perform search
      const rawResults = this.memoryAdapter.search(processedQuery.normalized);

      // Transform results
      const transformedResults = this.responseTransformer.transformResults(rawResults, {
        query: processedQuery.normalized,
        timestamp: Date.now(),
        totalResults: rawResults.length,
        sourceType: 'memory',
      });

      // Update state with results
      this.setState({
        results: transformedResults,
        loading: false,
        total: transformedResults.length,
        hasMore: false,
      });

      // Update UI
      if (this.resultsDropdown) {
        if (transformedResults.length > 0) {
          this.resultsDropdown.showResults(transformedResults);
        } else {
          this.resultsDropdown.showNoResults();
        }
      }

      // Emit search complete event
      this.emit({
        type: 'search:complete' as const,
        timestamp: Date.now(),
        target: this.targetElement!,
        query: processedQuery.normalized,
        results: transformedResults,
        duration: 0, // TODO: calculate actual duration
      });

      return transformedResults;
    } catch (error) {
      const searchError = error instanceof Error ? error : new Error('Search failed');

      this.setState({
        loading: false,
        error: searchError,
        results: [],
      });

      if (this.resultsDropdown) {
        this.resultsDropdown.showError(searchError.message);
      }

      // Emit search error event
      this.emit({
        type: 'search:error' as const,
        timestamp: Date.now(),
        target: this.targetElement!,
        query: query,
        error: searchError,
      });

      throw searchError;
    }
  }

  /**
   * Clear search results
   */
  public clearResults(): void {
    this.setState({
      query: '',
      results: [],
      loading: false,
      error: null,
      total: 0,
      hasMore: false,
    });

    if (this.searchInput) {
      this.searchInput.setValue('');
    }

    if (this.resultsDropdown) {
      this.resultsDropdown.clearResults();
    }
  }

  /**
   * Focus the search input
   */
  public focus(): void {
    if (this.searchInput) {
      this.searchInput.focus();
    }
  }

  /**
   * Blur the search input
   */
  public blur(): void {
    if (this.searchInput) {
      this.searchInput.blur();
    }
  }

  /**
   * Adds an event listener
   */
  public on<T extends UniversalSearchEvent>(eventType: T['type'], handler: EventHandler<T>): void {
    if (!this.eventListeners[eventType]) {
      this.eventListeners[eventType] = [];
    }
    this.eventListeners[eventType]!.push(handler as EventHandler);
  }

  /**
   * Removes an event listener
   */
  public off<T extends UniversalSearchEvent>(eventType: T['type'], handler: EventHandler<T>): void {
    const listeners = this.eventListeners[eventType];
    if (listeners) {
      const index = listeners.indexOf(handler as EventHandler);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Emits an event to all registered listeners
   */
  private emit<T extends UniversalSearchEvent>(event: T): void {
    const listeners = this.eventListeners[event.type] as EventHandler<T>[] | undefined;
    if (listeners) {
      listeners.forEach(handler => {
        try {
          handler(event);
        } catch (error) {
          if (this.config.debug) {
            console.error(`[UniversalSearch] Event handler error for ${event.type}:`, error);
          }
        }
      });
    }
  }

  /**
   * Merges user configuration with defaults
   */
  private mergeConfig(userConfig: Partial<SearchConfiguration>): SearchConfiguration {
    return {
      ...DEFAULT_CONFIG,
      ...userConfig,
      queryHandling: {
        ...DEFAULT_CONFIG.queryHandling,
        ...userConfig.queryHandling,
      },
      ui: {
        ...DEFAULT_CONFIG.ui,
        ...userConfig.ui,
      },
      dataSource: {
        ...DEFAULT_CONFIG.dataSource,
        ...userConfig.dataSource,
      },
    };
  }

  /**
   * Sets up the DOM structure for the component
   */
  private setupDomStructure(): void {
    if (!this.targetElement) {
      throw new ValidationError('Target element not found');
    }

    // Add base CSS class
    this.targetElement.classList.add(`${this.config.classPrefix}`);

    // Add accessibility attributes
    this.targetElement.setAttribute('role', 'combobox');
    this.targetElement.setAttribute('aria-expanded', 'false');
    this.targetElement.setAttribute('aria-haspopup', 'listbox');

    if (this.config.ui.rtl) {
      this.targetElement.setAttribute('dir', 'rtl');
    }
  }

  /**
   * Initializes the event system
   */
  private initializeEventSystem(): void {
    // Event system will be expanded in future stories
    if (this.config.debug) {
      console.log('[UniversalSearch] Event system initialized');
    }
  }

  /**
   * Applies configuration to the component
   */
  private applyConfiguration(): void {
    if (!this.targetElement) return;

    // Apply theme class if specified
    if (this.config.ui.theme !== 'default') {
      this.targetElement.classList.add(`${this.config.classPrefix}--${this.config.ui.theme}`);
    }
  }

  /**
   * Cleans up event listeners
   */
  private cleanupEventListeners(): void {
    this.eventListeners = {};
  }

  /**
   * Cleans up DOM modifications
   */
  private cleanupDomStructure(): void {
    if (!this.targetElement) return;

    // Remove CSS classes
    this.targetElement.classList.remove(`${this.config.classPrefix}`);
    if (this.config.ui.theme !== 'default') {
      this.targetElement.classList.remove(`${this.config.classPrefix}--${this.config.ui.theme}`);
    }

    // Remove accessibility attributes
    this.targetElement.removeAttribute('role');
    this.targetElement.removeAttribute('aria-expanded');
    this.targetElement.removeAttribute('aria-haspopup');
    this.targetElement.removeAttribute('dir');
  }

  /**
   * Initialize search pipeline components
   */
  private initializeSearchPipeline(): void {
    try {
      // Initialize query processor
      this.queryProcessor = new QueryProcessor(this.config.queryHandling);

      // Initialize memory adapter if data source is memory
      if (this.config.dataSource.type === 'memory') {
        const memoryConfig: MemoryAdapterConfig = {
          data: (this.config.dataSource as any).data || [],
          searchFields: (this.config.dataSource as any).searchFields || ['title'],
          caseSensitive: this.config.queryHandling.caseSensitive,
          updateStrategy: 'static',
        };
        this.memoryAdapter = new MemoryAdapter(memoryConfig);
      }

      // Initialize response transformer
      const responseMapping: ResponseMapping = {
        labelField: (this.config.dataSource as any).labelField || 'title',
        valueField: (this.config.dataSource as any).valueField,
        metadataFields: (this.config.dataSource as any).metadataFields,
      };
      this.responseTransformer = new ResponseTransformer(responseMapping);

      if (this.config.debug) {
        console.log('[UniversalSearch] Search pipeline initialized');
      }
    } catch (error) {
      throw new ValidationError(`Failed to initialize search pipeline: ${error}`);
    }
  }

  /**
   * Initialize UI components
   */
  private initializeUIComponents(): void {
    if (!this.targetElement) {
      throw new ValidationError('Target element not found');
    }

    try {
      // Create search input
      this.searchInput = new SearchInput(this.targetElement, this.config.ui);
      this.searchInput.init();

      // Create results dropdown
      this.resultsDropdown = new ResultsDropdown(this.targetElement, this.config.ui);
      this.resultsDropdown.init();

      if (this.config.debug) {
        console.log('[UniversalSearch] UI components initialized');
      }
    } catch (error) {
      throw new ValidationError(`Failed to initialize UI components: ${error}`);
    }
  }

  /**
   * Set up component event handlers
   */
  private setupEventHandlers(): void {
    if (!this.searchInput || !this.resultsDropdown) {
      return;
    }

    // Search input events
    this.searchInput.on('input', (value: string) => {
      this.handleSearchInput(value);
    });

    this.searchInput.on('keydown', (event: KeyboardEvent) => {
      this.handleKeydown(event);
    });

    this.searchInput.on('focus', () => {
      if (this.state.results.length > 0) {
        this.resultsDropdown?.show();
      }
    });

    this.searchInput.on('blur', () => {
      // Delay hiding to allow for result selection
      setTimeout(() => {
        this.resultsDropdown?.hide();
      }, 150);
    });

    // Results dropdown events
    this.resultsDropdown.on('select', (result: SearchResult, index: number) => {
      this.handleResultSelection(result, index);
    });
  }

  /**
   * Handle search input changes
   */
  private handleSearchInput(value: string): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    if (value.trim().length === 0) {
      this.clearResults();
      return;
    }

    // Show loading state
    if (this.resultsDropdown) {
      this.resultsDropdown.showLoading();
    }

    // Debounce search
    this.debounceTimer = window.setTimeout(() => {
      this.search(value).catch(error => {
        if (this.config.debug) {
          console.error('[UniversalSearch] Search error:', error);
        }
      });
    }, this.config.queryHandling.debounceMs);
  }

  /**
   * Handle keyboard navigation
   */
  private handleKeydown(event: KeyboardEvent): void {
    if (!this.resultsDropdown) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.resultsDropdown.navigate('down');
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.resultsDropdown.navigate('up');
        break;
      case 'Enter':
        event.preventDefault();
        this.resultsDropdown.selectCurrent();
        break;
      case 'Escape':
        event.preventDefault();
        this.resultsDropdown.hide();
        this.searchInput?.blur();
        break;
    }
  }

  /**
   * Handle result selection
   */
  private handleResultSelection(result: SearchResult, index: number): void {
    // Emit selection event
    this.emit({
      type: 'result:select' as const,
      timestamp: Date.now(),
      target: this.targetElement!,
      result,
      index,
    });

    // Hide dropdown
    if (this.resultsDropdown) {
      this.resultsDropdown.hide();
    }

    // Update input with selected result title
    if (this.searchInput) {
      this.searchInput.setValue(result.title);
    }
  }

  /**
   * Update component state
   */
  private setState(updates: Partial<SearchState>): void {
    this.state = { ...this.state, ...updates };
  }

  /**
   * Initialize monitoring and analytics components
   */
  private initializeMonitoring(): void {
    if (!this.config.analytics?.enabled) {
      return;
    }

    try {
      // Initialize performance tracker
      this.performanceTracker = new PerformanceTracker();

      // Initialize analytics collector
      this.analyticsCollector = new AnalyticsCollector();

      // Initialize browser profiler
      this.browserProfiler = new BrowserProfiler();

      // Initialize experiment manager
      this.experimentManager = new ExperimentManager();

      // Initialize privacy manager
      this.privacyManager = new PrivacyManager();

      // Initialize metrics exporter
      this.metricsExporter = new MetricsExporter();

      // Configure components with settings from config
      if (this.config.analytics) {
        this.analyticsCollector.configure({
          enabled: this.config.analytics.enabled,
          sampleRate: this.config.analytics.sampleRate || 1.0,
          privacyMode: this.config.analytics.privacyMode || 'balanced',
          retentionDays: this.config.analytics.retentionDays || 30,
          intervals: {
            metrics: 5000,
            usage: 10000,
            performance: 1000,
          },
          export: {
            enabled: false,
            interval: 60000,
            formats: ['json'],
            destinations: [],
          },
          privacy: {
            requireConsent: this.config.analytics.requireConsent || false,
            anonymize: this.config.analytics.anonymize || true,
            anonymizeIp: true,
            hashUserId: true,
          },
        });
      }

      if (this.config.debug) {
        console.log('[UniversalSearch] Monitoring components initialized');
      }
    } catch (error) {
      if (this.config.debug) {
        console.warn('[UniversalSearch] Failed to initialize monitoring:', error);
      }
    }
  }

  /**
   * Cleanup monitoring components
   */
  private cleanupMonitoring(): void {
    try {
      if (this.performanceTracker) {
        this.performanceTracker.cleanup();
        this.performanceTracker = null;
      }

      if (this.analyticsCollector) {
        this.analyticsCollector.cleanup();
        this.analyticsCollector = null;
      }

      if (this.browserProfiler) {
        this.browserProfiler.cleanup();
        this.browserProfiler = null;
      }

      if (this.experimentManager) {
        this.experimentManager.cleanup();
        this.experimentManager = null;
      }

      if (this.privacyManager) {
        this.privacyManager.cleanup();
        this.privacyManager = null;
      }

      if (this.metricsExporter) {
        this.metricsExporter.cleanup();
        this.metricsExporter = null;
      }
    } catch (error) {
      if (this.config.debug) {
        console.warn('[UniversalSearch] Error during monitoring cleanup:', error);
      }
    }
  }

  /**
   * Track performance metrics
   */
  public trackPerformance(metrics: PerformanceMetrics): void {
    if (this.performanceTracker) {
      this.performanceTracker.recordMetrics(metrics);
    }
  }

  /**
   * Track usage event
   */
  public trackUsage(event: string, properties?: Record<string, any>): void {
    if (this.analyticsCollector) {
      const analyticsEvent: AnalyticsEvent = {
        id: `${event}_${Date.now()}_${Math.random().toString(36)}`,
        type: event,
        properties: properties || {},
        context: {
          sessionId: this.getSessionId(),
          timestamp: Date.now(),
          location: {
            url: typeof window !== 'undefined' ? window.location.href : '',
            pathname: typeof window !== 'undefined' ? window.location.pathname : '',
          },
        },
        timestamp: Date.now(),
        privacy: {
          anonymized: this.config.analytics?.anonymize || true,
          consented: this.config.analytics?.requireConsent ? this.hasUserConsent() : true,
        },
      };
      this.analyticsCollector.track(analyticsEvent);
    }
  }

  /**
   * Export metrics
   */
  public exportMetrics(format: 'json' | 'csv' | 'prometheus' = 'json'): Promise<string> {
    if (this.metricsExporter) {
      return this.metricsExporter.export(format, {
        start: Date.now() - 24 * 60 * 60 * 1000, // Last 24 hours
        end: Date.now(),
      });
    }
    return Promise.resolve('{}');
  }

  /**
   * Get performance metrics summary
   */
  public getPerformanceMetrics(): any {
    if (this.performanceTracker) {
      return this.performanceTracker.getMetricsSummary();
    }
    return null;
  }

  /**
   * Get session ID for analytics
   */
  private getSessionId(): string {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      let sessionId = window.sessionStorage.getItem('universal-search-session-id');
      if (!sessionId) {
        sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        window.sessionStorage.setItem('universal-search-session-id', sessionId);
      }
      return sessionId;
    }
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Check if user has consented to analytics
   */
  private hasUserConsent(): boolean {
    if (this.privacyManager) {
      return this.privacyManager.hasConsent('analytics');
    }
    return true; // Default to true if privacy manager not available
  }
}
