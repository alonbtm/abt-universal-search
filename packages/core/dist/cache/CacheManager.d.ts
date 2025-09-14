/**
 * Cache Manager - Intelligent caching system with TTL, LRU eviction, and compression
 * @description Implements multi-layer caching with configurable eviction policies and cache warming
 */
import { CacheConfig, CacheStatistics, ICacheManager, CacheEvent, CacheLayerConfig, CacheOptimizationResult } from '../types/Caching.js';
/**
 * Cache Manager Implementation
 */
export declare class CacheManager<T = any> implements ICacheManager<T> {
    private config;
    private storage;
    private evictionPolicy;
    private compressor;
    private warmingStrategies;
    private statistics;
    private eventCallbacks;
    private cleanupInterval;
    private entries;
    constructor(config?: Partial<CacheConfig>);
    /**
     * Get cached value
     */
    get(key: string): Promise<T | null>;
    /**
     * Set cached value
     */
    set(key: string, value: T, ttl?: number): Promise<void>;
    /**
     * Check if key exists
     */
    has(key: string): Promise<boolean>;
    /**
     * Delete cached value
     */
    delete(key: string): Promise<boolean>;
    /**
     * Invalidate cache by pattern
     */
    invalidate(pattern: string): Promise<number>;
    /**
     * Invalidate cache by tags
     */
    invalidateByTags(tags: string[]): Promise<number>;
    /**
     * Clear all cache
     */
    clear(): Promise<void>;
    /**
     * Get cache statistics
     */
    getStatistics(): CacheStatistics;
    /**
     * Get cache configuration
     */
    getConfig(): CacheConfig;
    /**
     * Update cache configuration
     */
    updateConfig(config: Partial<CacheConfig>): void;
    /**
     * Warm cache with queries
     */
    warmCache(queries: string[]): Promise<void>;
    /**
     * Get cache health status
     */
    getHealth(): {
        status: 'healthy' | 'degraded' | 'critical';
        issues: string[];
        recommendations: string[];
    };
    /**
     * Get optimization recommendations
     */
    getOptimizationRecommendations(): CacheOptimizationResult[];
    /**
     * Register event callback
     */
    onEvent(callback: (event: CacheEvent) => void): void;
    /**
     * Destroy cache manager
     */
    destroy(): void;
    private createStorage;
    private createEvictionPolicy;
    private isExpired;
    private calculateSize;
    private ensureCapacity;
    private evictEntries;
    private updateHitRate;
    private updateAverageEntrySize;
    private updateCompressionStats;
    private updatePerformanceMetric;
    private emitEvent;
    private startCleanup;
    private cleanupExpiredEntries;
    private loadPersistedData;
}
/**
 * Factory function for creating cache manager instances
 */
export declare function createCacheManager<T = any>(config?: Partial<CacheConfig>): ICacheManager<T>;
/**
 * Multi-layer cache manager
 */
export declare class MultiLayerCacheManager<T = any> implements ICacheManager<T> {
    private l1Cache;
    private l2Cache;
    private config;
    constructor(config: CacheLayerConfig);
    get(key: string): Promise<T | null>;
    set(key: string, value: T, ttl?: number): Promise<void>;
    has(key: string): Promise<boolean>;
    delete(key: string): Promise<boolean>;
    invalidate(pattern: string): Promise<number>;
    invalidateByTags(tags: string[]): Promise<number>;
    clear(): Promise<void>;
    getStatistics(): CacheStatistics;
    getConfig(): CacheConfig;
    updateConfig(config: Partial<CacheConfig>): void;
    warmCache(queries: string[]): Promise<void>;
    getHealth(): {
        status: 'healthy' | 'degraded' | 'critical';
        issues: string[];
        recommendations: string[];
    };
}
//# sourceMappingURL=CacheManager.d.ts.map