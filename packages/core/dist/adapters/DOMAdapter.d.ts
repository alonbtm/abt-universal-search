/**
 * DOM Data Source Adapter - DOM element searching with Shadow DOM support
 * @description Handles searching DOM elements using CSS selectors with live updates
 */
import type { DataSourceConfig } from '../types/Config';
import type { ProcessedQuery, Connection, RawResult, DOMConnection } from '../types/Results';
import { BaseDataSourceAdapter, type AdapterCapabilities } from './BaseAdapter';
/**
 * DOM adapter with comprehensive element searching and live updates
 */
export declare class DOMAdapter extends BaseDataSourceAdapter {
    private mutationObservers;
    private shadowTraversers;
    private elementCache;
    private resultCache;
    constructor();
    /**
     * Connect to DOM search scope
     */
    connect(config: DataSourceConfig): Promise<DOMConnection>;
    /**
     * Execute DOM search query
     */
    query(connection: Connection, query: ProcessedQuery): Promise<RawResult[]>;
    /**
     * Disconnect from DOM
     */
    disconnect(connection: Connection): Promise<void>;
    /**
     * Validate DOM configuration
     */
    validateConfig(config: DataSourceConfig): Promise<void>;
    /**
     * Get DOM adapter capabilities
     */
    getCapabilities(): AdapterCapabilities;
    /**
     * Find matching DOM elements
     */
    private findMatchingElements;
    /**
     * Find regular (non-shadow) elements
     */
    private findRegularElements;
    /**
     * Match element against search criteria
     */
    private matchElement;
    /**
     * Extract attribute value from element
     */
    private extractAttributeValue;
    /**
     * Convert DOM matches to RawResult format
     */
    private convertToRawResults;
    /**
     * Get accessibility information for element
     */
    private getAccessibilityInfo;
    /**
     * Check if element is visible
     */
    private isElementVisible;
    /**
     * Check if element is focusable
     */
    private isElementFocusable;
    /**
     * Create DOM connection object
     */
    private createDOMConnection;
    /**
     * Find root element using selector
     */
    private findRootElement;
    /**
     * Set up live updates for DOM changes
     */
    private setupLiveUpdates;
    /**
     * Emit DOM change event
     */
    private emitDOMChangeEvent;
    /**
     * Count elements in scope
     */
    private countElements;
    /**
     * Create element path for identification
     */
    private createElementPath;
    /**
     * Build element path from root
     */
    private buildElementPath;
    /**
     * Generate cache key for query
     */
    private generateCacheKey;
    /**
     * Clear cache for connection
     */
    private clearConnectionCache;
    /**
     * Clone results for caching
     */
    private cloneResults;
    /**
     * Generate unique connection ID
     */
    private generateConnectionId;
    /**
     * Simple hash function
     */
    private simpleHash;
    /**
     * Get connection configuration (mock)
     */
    private getConnectionConfig;
}
/**
 * DOM adapter factory
 */
export declare class DOMAdapterFactory {
    private static instance;
    /**
     * Get singleton DOM adapter instance
     */
    static getInstance(): DOMAdapter;
    /**
     * Create new DOM adapter instance
     */
    static createAdapter(): DOMAdapter;
    /**
     * Clear singleton instance
     */
    static clearInstance(): void;
    /**
     * Check if DOM is available
     */
    static isDOMAvailable(): boolean;
}
/**
 * Global DOM adapter factory instance
 */
export declare const domAdapterFactory: typeof DOMAdapterFactory;
//# sourceMappingURL=DOMAdapter.d.ts.map