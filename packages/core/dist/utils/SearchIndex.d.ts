/**
 * Search Index - Performance optimization for large datasets
 * @description Provides indexing and efficient search for in-memory data
 */
import type { MemorySearchResult } from '../types/Results';
import type { MemoryPerformanceConfig } from '../types/Config';
/**
 * Index statistics
 */
interface IndexStats {
    /** Total number of indexed entries */
    totalEntries: number;
    /** Number of unique keys */
    uniqueKeys: number;
    /** Average key length */
    averageKeyLength: number;
    /** Estimated memory usage in bytes */
    memoryUsage: number;
    /** Last rebuild time */
    lastRebuild: number;
    /** Build time in milliseconds */
    buildTime: number;
}
/**
 * Search options for indexed search
 */
interface SearchOptions {
    /** Case sensitive search */
    caseSensitive: boolean;
    /** Match mode */
    matchMode: 'exact' | 'partial' | 'fuzzy' | 'prefix';
    /** Maximum results to return */
    maxResults?: number;
    /** Minimum score threshold */
    minScore?: number;
    /** Fields to search (subset of indexed fields) */
    fields?: string[];
}
/**
 * Advanced search index with multiple indexing strategies
 */
export declare class AdvancedSearchIndex {
    private data;
    private fields;
    private config;
    private exactIndex;
    private prefixIndex;
    private ngramIndex;
    private soundexIndex;
    private stats;
    private isBuilt;
    private changeCount;
    constructor(config: MemoryPerformanceConfig);
    /**
     * Build index from data
     */
    buildIndex(data: unknown[], fields: string[]): void;
    /**
     * Search using the index
     */
    search(query: string, options: SearchOptions): MemorySearchResult[];
    /**
     * Update index after data changes
     */
    updateIndex(changes: {
        type: 'add' | 'update' | 'delete';
        index: number;
        item?: unknown;
    }[]): void;
    /**
     * Get index statistics
     */
    getStats(): IndexStats;
    /**
     * Check if index is built and ready
     */
    isReady(): boolean;
    /**
     * Clear all indexes
     */
    clear(): void;
    /**
     * Get memory usage estimation
     */
    getMemoryUsage(): number;
    /**
     * Search within a specific field
     */
    private searchField;
    /**
     * Exact match search
     */
    private searchExact;
    /**
     * Prefix match search
     */
    private searchPrefix;
    /**
     * Partial match search using n-grams
     */
    private searchPartial;
    /**
     * Fuzzy search using Soundex
     */
    private searchFuzzy;
    /**
     * Index a single item
     */
    private indexItem;
    /**
     * Add to exact match index
     */
    private addToExactIndex;
    /**
     * Add to prefix index
     */
    private addToPrefixIndex;
    /**
     * Add to n-gram index
     */
    private addToNgramIndex;
    /**
     * Add to Soundex index
     */
    private addToSoundexIndex;
    /**
     * Remove item from all indexes
     */
    private removeItemFromIndex;
    /**
     * Reindex items starting from a given index
     */
    private reindexFromIndex;
    /**
     * Clear all index data structures
     */
    private clearIndexes;
    /**
     * Update index statistics
     */
    private updateStats;
    /**
     * Estimate memory usage
     */
    private estimateMemoryUsage;
    /**
     * Generate n-grams from a string
     */
    private generateNgrams;
    /**
     * Simple Soundex implementation for fuzzy matching
     */
    private soundex;
    /**
     * Get field value from object (supports dot notation)
     */
    private getFieldValue;
}
/**
 * Search index factory and manager
 */
export declare class SearchIndexFactory {
    private static instances;
    /**
     * Get or create search index
     */
    static getIndex(key: string, config: MemoryPerformanceConfig): AdvancedSearchIndex;
    /**
     * Create new search index
     */
    static createIndex(config: MemoryPerformanceConfig): AdvancedSearchIndex;
    /**
     * Clear specific index
     */
    static clearIndex(key: string): void;
    /**
     * Clear all indexes
     */
    static clearAllIndexes(): void;
    /**
     * Get memory usage for all indexes
     */
    static getTotalMemoryUsage(): number;
}
/**
 * Global search index factory instance
 */
export declare const searchIndexFactory: typeof SearchIndexFactory;
export {};
//# sourceMappingURL=SearchIndex.d.ts.map