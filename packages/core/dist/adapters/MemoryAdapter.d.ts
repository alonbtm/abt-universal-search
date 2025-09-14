/**
 * Memory Adapter - Enhanced In-Memory Data Search Implementation
 * @description Handles searching through arrays of objects with comprehensive filtering and BaseAdapter compliance
 */
import { BaseDataSourceAdapter, type AdapterCapabilities } from './BaseAdapter';
import type { DataSourceConfig } from '../types/Config';
import type { ProcessedQuery, Connection, RawResult } from '../types/Results';
/**
 * Raw search result before transformation
 */
export interface RawSearchResult {
    item: unknown;
    score: number;
    matchedFields: string[];
}
/**
 * Basic memory data source configuration (deprecated - use MemoryDataSourceConfig)
 */
export interface MemoryAdapterConfig {
    data: unknown[];
    searchFields: string[];
    caseSensitive?: boolean;
}
/**
 * Enhanced memory adapter extending BaseDataSourceAdapter
 */
export declare class MemoryAdapter extends BaseDataSourceAdapter {
    private readonly config;
    private data;
    private isValidated;
    constructor(config?: unknown);
    /**
     * Normalize config to handle both old and new formats
     */
    private normalizeConfig;
    /**
     * Connect to memory data source (BaseAdapter interface)
     */
    connect(config: DataSourceConfig): Promise<Connection>;
    /**
     * Execute query on memory data (BaseAdapter interface)
     */
    query(connection: Connection, query: ProcessedQuery): Promise<RawResult[]>;
    /**
     * Disconnect from memory data source (BaseAdapter interface)
     */
    disconnect(connection: Connection): Promise<void>;
    /**
     * Validate configuration (BaseAdapter interface)
     */
    validateConfig(config: DataSourceConfig): Promise<void>;
    /**
     * Get adapter capabilities (BaseAdapter interface)
     */
    getCapabilities(): AdapterCapabilities;
    /**
     * Search through the in-memory data
     */
    search(query: string): RawSearchResult[];
    /**
     * Update the data array
     */
    updateData(newData: unknown[]): void;
    /**
     * Get current data
     */
    getData(): readonly unknown[];
    /**
     * Get adapter configuration
     */
    getConfig(): Readonly<Required<MemoryAdapterConfig>>;
    /**
     * Synchronous version of validateConfig for constructor use
     */
    private validateConfigSync;
    /**
     * Validate that data items have the required search fields
     */
    private validateData;
    /**
     * Normalize query string for searching
     */
    private normalizeQuery;
    /**
     * Match an item against the query
     */
    private matchItem;
    /**
     * Get field value from object (supports dot notation)
     */
    private getFieldValue;
}
//# sourceMappingURL=MemoryAdapter.d.ts.map