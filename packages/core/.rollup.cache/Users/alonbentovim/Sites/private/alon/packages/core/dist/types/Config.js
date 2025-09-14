/**
 * Configuration Types for Universal Search Component
 * @description TypeScript interfaces for component configuration
 */
/**
 * Default configuration values
 */
export const DEFAULT_CONFIG = {
    dataSource: {
        type: 'memory'
    },
    queryHandling: {
        minLength: 3,
        debounceMs: 300,
        triggerOn: 'change',
        caseSensitive: false,
        matchMode: 'partial',
        debounceStrategy: 'trailing',
        caseNormalization: 'lowercase',
        xssProtection: true,
        sqlInjectionProtection: true,
        performanceMonitoring: true
    },
    ui: {
        maxResults: 10,
        placeholder: 'Search...',
        loadingText: 'Loading...',
        noResultsText: 'No results found',
        theme: 'default',
        rtl: false
    },
    debug: false,
    classPrefix: 'universal-search'
};
//# sourceMappingURL=Config.js.map