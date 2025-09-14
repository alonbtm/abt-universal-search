/**
 * UniversalSearch - Main Component Class
 * @description Core component class for universal search functionality
 */
import type { SearchConfiguration } from './types/Config';
import type { SearchResult } from './types/Results';
import type { UniversalSearchEvent, EventHandler } from './types/Events';
import type { PerformanceMetrics } from './types/Analytics';
/**
 * Main UniversalSearch component class
 */
export declare class UniversalSearch {
    private readonly selector;
    private readonly config;
    private targetElement;
    private initialized;
    private destroyed;
    private eventListeners;
    private state;
    private memoryAdapter;
    private queryProcessor;
    private responseTransformer;
    private searchInput;
    private resultsDropdown;
    private debounceTimer;
    private performanceTracker;
    private analyticsCollector;
    private browserProfiler;
    private experimentManager;
    private privacyManager;
    private metricsExporter;
    /**
     * Creates a new UniversalSearch instance
     * @param selector - CSS selector for the target element
     * @param config - Search configuration options
     */
    constructor(selector: string, config?: Partial<SearchConfiguration>);
    /**
     * Initializes the component and mounts it to the DOM
     */
    init(): void;
    /**
     * Destroys the component and cleans up resources
     */
    destroy(): void;
    /**
     * Gets the current configuration
     */
    getConfig(): Readonly<SearchConfiguration>;
    /**
     * Gets the current search results
     */
    getResults(): readonly SearchResult[];
    /**
     * Gets the current query
     */
    getQuery(): string;
    /**
     * Perform a search with the given query
     */
    search(query: string): Promise<SearchResult[]>;
    /**
     * Clear search results
     */
    clearResults(): void;
    /**
     * Focus the search input
     */
    focus(): void;
    /**
     * Blur the search input
     */
    blur(): void;
    /**
     * Adds an event listener
     */
    on<T extends UniversalSearchEvent>(eventType: T['type'], handler: EventHandler<T>): void;
    /**
     * Removes an event listener
     */
    off<T extends UniversalSearchEvent>(eventType: T['type'], handler: EventHandler<T>): void;
    /**
     * Emits an event to all registered listeners
     */
    private emit;
    /**
     * Merges user configuration with defaults
     */
    private mergeConfig;
    /**
     * Sets up the DOM structure for the component
     */
    private setupDomStructure;
    /**
     * Initializes the event system
     */
    private initializeEventSystem;
    /**
     * Applies configuration to the component
     */
    private applyConfiguration;
    /**
     * Cleans up event listeners
     */
    private cleanupEventListeners;
    /**
     * Cleans up DOM modifications
     */
    private cleanupDomStructure;
    /**
     * Initialize search pipeline components
     */
    private initializeSearchPipeline;
    /**
     * Initialize UI components
     */
    private initializeUIComponents;
    /**
     * Set up component event handlers
     */
    private setupEventHandlers;
    /**
     * Handle search input changes
     */
    private handleSearchInput;
    /**
     * Handle keyboard navigation
     */
    private handleKeydown;
    /**
     * Handle result selection
     */
    private handleResultSelection;
    /**
     * Update component state
     */
    private setState;
    /**
     * Initialize monitoring and analytics components
     */
    private initializeMonitoring;
    /**
     * Cleanup monitoring components
     */
    private cleanupMonitoring;
    /**
     * Track performance metrics
     */
    trackPerformance(metrics: PerformanceMetrics): void;
    /**
     * Track usage event
     */
    trackUsage(event: string, properties?: Record<string, any>): void;
    /**
     * Export metrics
     */
    exportMetrics(format?: 'json' | 'csv' | 'prometheus'): Promise<string>;
    /**
     * Get performance metrics summary
     */
    getPerformanceMetrics(): any;
    /**
     * Get session ID for analytics
     */
    private getSessionId;
    /**
     * Check if user has consented to analytics
     */
    private hasUserConsent;
}
//# sourceMappingURL=UniversalSearch.d.ts.map