/**
 * UniversalSearch - Main Component Class
 * @description Core component class for universal search functionality
 */
import { DEFAULT_CONFIG } from './types/Config';
import { validateSelector, validateTargetElement, validateConfiguration, ValidationError } from './utils/validation';
import { MemoryAdapter } from './adapters/MemoryAdapter';
import { QueryProcessor } from './pipeline/QueryProcessor';
import { ResponseTransformer } from './pipeline/ResponseTransformer';
import { SearchInput } from './ui/SearchInput';
import { ResultsDropdown } from './ui/ResultsDropdown';
import { PerformanceTracker } from './monitoring/PerformanceTracker';
import { AnalyticsCollector } from './monitoring/AnalyticsCollector';
import { BrowserProfiler } from './monitoring/BrowserProfiler';
import { ExperimentManager } from './monitoring/ExperimentManager';
import { PrivacyManager } from './monitoring/PrivacyManager';
import { MetricsExporter } from './monitoring/MetricsExporter';
/**
 * Main UniversalSearch component class
 */
export class UniversalSearch {
    /**
     * Creates a new UniversalSearch instance
     * @param selector - CSS selector for the target element
     * @param config - Search configuration options
     */
    constructor(selector, config = {}) {
        this.targetElement = null;
        this.initialized = false;
        this.destroyed = false;
        this.eventListeners = {};
        this.state = {
            query: '',
            results: [],
            loading: false,
            error: null,
            hasMore: false,
            total: 0
        };
        // Search pipeline components
        this.memoryAdapter = null;
        this.queryProcessor = null;
        this.responseTransformer = null;
        this.searchInput = null;
        this.resultsDropdown = null;
        this.debounceTimer = null;
        // Monitoring and analytics components
        this.performanceTracker = null;
        this.analyticsCollector = null;
        this.browserProfiler = null;
        this.experimentManager = null;
        this.privacyManager = null;
        this.metricsExporter = null;
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
        }
        catch (error) {
            const validationError = error instanceof ValidationError ? error :
                new ValidationError(`Failed to create UniversalSearch instance: ${error}`);
            if (config.debug !== false) {
                console.error('[UniversalSearch] Constructor error:', validationError);
            }
            throw validationError;
        }
    }
    /**
     * Initializes the component and mounts it to the DOM
     */
    init() {
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
                type: 'search:start',
                timestamp: Date.now(),
                target: this.targetElement,
                query: ''
            });
        }
        catch (error) {
            const initError = error instanceof ValidationError ? error :
                new ValidationError(`Initialization failed: ${error}`);
            if (this.config.debug) {
                console.error('[UniversalSearch] Initialization error:', initError);
            }
            throw initError;
        }
    }
    /**
     * Destroys the component and cleans up resources
     */
    destroy() {
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
                total: 0
            };
            // Mark as destroyed
            this.initialized = false;
            this.destroyed = true;
            this.targetElement = null;
            if (this.config.debug) {
                console.log('[UniversalSearch] Component destroyed successfully');
            }
        }
        catch (error) {
            if (this.config.debug) {
                console.error('[UniversalSearch] Destruction error:', error);
            }
            // Don't throw on destruction errors, just log them
        }
    }
    /**
     * Gets the current configuration
     */
    getConfig() {
        return this.config;
    }
    /**
     * Gets the current search results
     */
    getResults() {
        return [...this.state.results];
    }
    /**
     * Gets the current query
     */
    getQuery() {
        return this.state.query;
    }
    /**
     * Perform a search with the given query
     */
    async search(query) {
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
                    results: []
                });
                return [];
            }
            // Update state to loading
            this.setState({
                query: processedQuery.original,
                loading: true,
                error: null
            });
            // Emit search start event
            this.emit({
                type: 'search:start',
                timestamp: Date.now(),
                target: this.targetElement,
                query: processedQuery.normalized
            });
            // Perform search
            const rawResults = this.memoryAdapter.search(processedQuery.normalized);
            // Transform results
            const transformedResults = this.responseTransformer.transformResults(rawResults, {
                query: processedQuery.normalized,
                timestamp: Date.now(),
                totalResults: rawResults.length,
                sourceType: 'memory'
            });
            // Update state with results
            this.setState({
                results: transformedResults,
                loading: false,
                total: transformedResults.length,
                hasMore: false
            });
            // Update UI
            if (this.resultsDropdown) {
                if (transformedResults.length > 0) {
                    this.resultsDropdown.showResults(transformedResults);
                }
                else {
                    this.resultsDropdown.showNoResults();
                }
            }
            // Emit search complete event
            this.emit({
                type: 'search:complete',
                timestamp: Date.now(),
                target: this.targetElement,
                query: processedQuery.normalized,
                results: transformedResults,
                duration: 0 // TODO: calculate actual duration
            });
            return transformedResults;
        }
        catch (error) {
            const searchError = error instanceof Error ? error : new Error('Search failed');
            this.setState({
                loading: false,
                error: searchError,
                results: []
            });
            if (this.resultsDropdown) {
                this.resultsDropdown.showError(searchError.message);
            }
            // Emit search error event
            this.emit({
                type: 'search:error',
                timestamp: Date.now(),
                target: this.targetElement,
                query: query,
                error: searchError
            });
            throw searchError;
        }
    }
    /**
     * Clear search results
     */
    clearResults() {
        this.setState({
            query: '',
            results: [],
            loading: false,
            error: null,
            total: 0,
            hasMore: false
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
    focus() {
        if (this.searchInput) {
            this.searchInput.focus();
        }
    }
    /**
     * Blur the search input
     */
    blur() {
        if (this.searchInput) {
            this.searchInput.blur();
        }
    }
    /**
     * Adds an event listener
     */
    on(eventType, handler) {
        if (!this.eventListeners[eventType]) {
            this.eventListeners[eventType] = [];
        }
        this.eventListeners[eventType].push(handler);
    }
    /**
     * Removes an event listener
     */
    off(eventType, handler) {
        const listeners = this.eventListeners[eventType];
        if (listeners) {
            const index = listeners.indexOf(handler);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }
    /**
     * Emits an event to all registered listeners
     */
    emit(event) {
        const listeners = this.eventListeners[event.type];
        if (listeners) {
            listeners.forEach(handler => {
                try {
                    handler(event);
                }
                catch (error) {
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
    mergeConfig(userConfig) {
        return {
            ...DEFAULT_CONFIG,
            ...userConfig,
            queryHandling: {
                ...DEFAULT_CONFIG.queryHandling,
                ...userConfig.queryHandling
            },
            ui: {
                ...DEFAULT_CONFIG.ui,
                ...userConfig.ui
            },
            dataSource: {
                ...DEFAULT_CONFIG.dataSource,
                ...userConfig.dataSource
            }
        };
    }
    /**
     * Sets up the DOM structure for the component
     */
    setupDomStructure() {
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
    initializeEventSystem() {
        // Event system will be expanded in future stories
        if (this.config.debug) {
            console.log('[UniversalSearch] Event system initialized');
        }
    }
    /**
     * Applies configuration to the component
     */
    applyConfiguration() {
        if (!this.targetElement)
            return;
        // Apply theme class if specified
        if (this.config.ui.theme !== 'default') {
            this.targetElement.classList.add(`${this.config.classPrefix}--${this.config.ui.theme}`);
        }
    }
    /**
     * Cleans up event listeners
     */
    cleanupEventListeners() {
        this.eventListeners = {};
    }
    /**
     * Cleans up DOM modifications
     */
    cleanupDomStructure() {
        if (!this.targetElement)
            return;
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
    initializeSearchPipeline() {
        try {
            // Initialize query processor
            this.queryProcessor = new QueryProcessor(this.config.queryHandling);
            // Initialize memory adapter if data source is memory
            if (this.config.dataSource.type === 'memory') {
                const memoryConfig = {
                    data: this.config.dataSource.data || [],
                    searchFields: this.config.dataSource.searchFields || ['title'],
                    caseSensitive: this.config.queryHandling.caseSensitive,
                    updateStrategy: 'static'
                };
                this.memoryAdapter = new MemoryAdapter(memoryConfig);
            }
            // Initialize response transformer
            const responseMapping = {
                labelField: this.config.dataSource.labelField || 'title',
                valueField: this.config.dataSource.valueField,
                metadataFields: this.config.dataSource.metadataFields
            };
            this.responseTransformer = new ResponseTransformer(responseMapping);
            if (this.config.debug) {
                console.log('[UniversalSearch] Search pipeline initialized');
            }
        }
        catch (error) {
            throw new ValidationError(`Failed to initialize search pipeline: ${error}`);
        }
    }
    /**
     * Initialize UI components
     */
    initializeUIComponents() {
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
        }
        catch (error) {
            throw new ValidationError(`Failed to initialize UI components: ${error}`);
        }
    }
    /**
     * Set up component event handlers
     */
    setupEventHandlers() {
        if (!this.searchInput || !this.resultsDropdown) {
            return;
        }
        // Search input events
        this.searchInput.on('input', (value) => {
            this.handleSearchInput(value);
        });
        this.searchInput.on('keydown', (event) => {
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
        this.resultsDropdown.on('select', (result, index) => {
            this.handleResultSelection(result, index);
        });
    }
    /**
     * Handle search input changes
     */
    handleSearchInput(value) {
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
    handleKeydown(event) {
        if (!this.resultsDropdown)
            return;
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
    handleResultSelection(result, index) {
        // Emit selection event
        this.emit({
            type: 'result:select',
            timestamp: Date.now(),
            target: this.targetElement,
            result,
            index
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
    setState(updates) {
        this.state = { ...this.state, ...updates };
    }
    /**
     * Initialize monitoring and analytics components
     */
    initializeMonitoring() {
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
                        performance: 1000
                    },
                    export: {
                        enabled: false,
                        interval: 60000,
                        formats: ['json'],
                        destinations: []
                    },
                    privacy: {
                        requireConsent: this.config.analytics.requireConsent || false,
                        anonymize: this.config.analytics.anonymize || true,
                        anonymizeIp: true,
                        hashUserId: true
                    }
                });
            }
            if (this.config.debug) {
                console.log('[UniversalSearch] Monitoring components initialized');
            }
        }
        catch (error) {
            if (this.config.debug) {
                console.warn('[UniversalSearch] Failed to initialize monitoring:', error);
            }
        }
    }
    /**
     * Cleanup monitoring components
     */
    cleanupMonitoring() {
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
        }
        catch (error) {
            if (this.config.debug) {
                console.warn('[UniversalSearch] Error during monitoring cleanup:', error);
            }
        }
    }
    /**
     * Track performance metrics
     */
    trackPerformance(metrics) {
        if (this.performanceTracker) {
            this.performanceTracker.recordMetrics(metrics);
        }
    }
    /**
     * Track usage event
     */
    trackUsage(event, properties) {
        if (this.analyticsCollector) {
            const analyticsEvent = {
                id: `${event}_${Date.now()}_${Math.random().toString(36)}`,
                type: event,
                properties: properties || {},
                context: {
                    sessionId: this.getSessionId(),
                    timestamp: Date.now(),
                    location: {
                        url: typeof window !== 'undefined' ? window.location.href : '',
                        pathname: typeof window !== 'undefined' ? window.location.pathname : ''
                    }
                },
                timestamp: Date.now(),
                privacy: {
                    anonymized: this.config.analytics?.anonymize || true,
                    consented: this.config.analytics?.requireConsent ? this.hasUserConsent() : true
                }
            };
            this.analyticsCollector.track(analyticsEvent);
        }
    }
    /**
     * Export metrics
     */
    exportMetrics(format = 'json') {
        if (this.metricsExporter) {
            return this.metricsExporter.export(format, {
                start: Date.now() - (24 * 60 * 60 * 1000), // Last 24 hours
                end: Date.now()
            });
        }
        return Promise.resolve('{}');
    }
    /**
     * Get performance metrics summary
     */
    getPerformanceMetrics() {
        if (this.performanceTracker) {
            return this.performanceTracker.getMetricsSummary();
        }
        return null;
    }
    /**
     * Get session ID for analytics
     */
    getSessionId() {
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
    hasUserConsent() {
        if (this.privacyManager) {
            return this.privacyManager.hasConsent('analytics');
        }
        return true; // Default to true if privacy manager not available
    }
}
//# sourceMappingURL=UniversalSearch.js.map