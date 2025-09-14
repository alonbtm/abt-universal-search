/**
 * Caching Types - Type definitions for intelligent caching system
 * @description TypeScript interfaces for cache management, eviction policies, and cache optimization
 */
/**
 * Cache configuration options
 */
export interface CacheConfig {
    /** Maximum number of items in cache */
    maxSize: number;
    /** Default TTL in milliseconds */
    defaultTTL: number;
    /** Cache eviction policy */
    evictionPolicy: 'LRU' | 'LFU' | 'TTL' | 'FIFO';
    /** Enable compression for cached data */
    compressionEnabled: boolean;
    /** Compression threshold in bytes */
    compressionThreshold: number;
    /** Enable cache warming */
    enableWarming: boolean;
    /** Cache storage type */
    storageType: 'memory' | 'localStorage' | 'indexedDB' | 'hybrid';
    /** Cache key prefix */
    keyPrefix: string;
    /** Enable cache metrics collection */
    enableMetrics: boolean;
    /** Cache persistence settings */
    persistence: {
        enabled: boolean;
        storageQuota: number;
        backupFrequency: number;
    };
}
/**
 * Cache entry metadata
 */
export interface CacheEntry<T = any> {
    /** Cached value */
    value: T;
    /** Entry creation timestamp */
    createdAt: number;
    /** Entry last access timestamp */
    lastAccessed: number;
    /** Entry access count */
    accessCount: number;
    /** Entry TTL in milliseconds */
    ttl: number;
    /** Entry size in bytes */
    size: number;
    /** Compression status */
    compressed: boolean;
    /** Cache key */
    key: string;
    /** Entry tags for invalidation */
    tags: string[];
    /** Entry priority for eviction */
    priority: number;
}
/**
 * Cache key configuration
 */
export interface CacheKeyConfig {
    /** Include query parameters in key */
    includeQueryParams: boolean;
    /** Include data source in key */
    includeDataSource: boolean;
    /** Include user context in key */
    includeUserContext: boolean;
    /** Custom key components */
    customComponents: string[];
    /** Key normalization strategy */
    normalization: 'none' | 'lowercase' | 'hash' | 'fingerprint';
    /** Maximum key length */
    maxKeyLength: number;
}
/**
 * Cache invalidation configuration
 */
export interface CacheInvalidationConfig {
    /** Time-based invalidation */
    timeBased: {
        enabled: boolean;
        defaultTTL: number;
        maxTTL: number;
    };
    /** Dependency-based invalidation */
    dependencyBased: {
        enabled: boolean;
        dependencies: Record<string, string[]>;
        cascadeInvalidation: boolean;
    };
    /** Manual invalidation */
    manual: {
        enabled: boolean;
        patterns: string[];
        tags: string[];
    };
    /** Event-based invalidation */
    eventBased: {
        enabled: boolean;
        events: string[];
        debounceMs: number;
    };
}
/**
 * Cache statistics
 */
export interface CacheStatistics {
    /** Total cache operations */
    totalOperations: number;
    /** Cache hits */
    hits: number;
    /** Cache misses */
    misses: number;
    /** Cache hit rate */
    hitRate: number;
    /** Total entries in cache */
    entryCount: number;
    /** Total cache size in bytes */
    totalSize: number;
    /** Average entry size */
    averageEntrySize: number;
    /** Cache memory usage */
    memoryUsage: number;
    /** Eviction count */
    evictions: number;
    /** Compression statistics */
    compression: {
        totalCompressed: number;
        compressionRatio: number;
        compressionSavings: number;
    };
    /** Performance metrics */
    performance: {
        averageGetTime: number;
        averageSetTime: number;
        averageEvictionTime: number;
    };
}
/**
 * Cache warming configuration
 */
export interface CacheWarmingConfig {
    /** Enable cache warming */
    enabled: boolean;
    /** Warming strategies */
    strategies: Array<'popular' | 'recent' | 'predicted' | 'scheduled'>;
    /** Popular query threshold */
    popularityThreshold: number;
    /** Recent query window in milliseconds */
    recentWindowMs: number;
    /** Prediction algorithm */
    predictionAlgorithm: 'frequency' | 'pattern' | 'ml';
    /** Scheduled warming times */
    scheduledTimes: string[];
    /** Maximum warming operations */
    maxWarmingOperations: number;
    /** Warming concurrency limit */
    concurrencyLimit: number;
}
/**
 * Cache eviction policy interface
 */
export interface ICacheEvictionPolicy<T = any> {
    /** Policy name */
    name: string;
    /** Select entries to evict */
    selectForEviction(entries: Map<string, CacheEntry<T>>, targetCount: number): string[];
    /** Update entry metadata on access */
    onAccess(entry: CacheEntry<T>): void;
    /** Update entry metadata on insertion */
    onInsert(entry: CacheEntry<T>): void;
    /** Get policy-specific metrics */
    getMetrics(): Record<string, number>;
}
/**
 * Cache storage interface
 */
export interface ICacheStorage<T = any> {
    /** Get value by key */
    get(key: string): Promise<CacheEntry<T> | null>;
    /** Set value with key */
    set(key: string, entry: CacheEntry<T>): Promise<void>;
    /** Delete value by key */
    delete(key: string): Promise<boolean>;
    /** Clear all values */
    clear(): Promise<void>;
    /** Get all keys */
    keys(): Promise<string[]>;
    /** Get storage size */
    size(): Promise<number>;
    /** Check if storage supports persistence */
    supportsPersistence(): boolean;
    /** Get storage quota information */
    getQuota(): Promise<{
        used: number;
        available: number;
    }>;
}
/**
 * Cache manager interface
 */
export interface ICacheManager<T = any> {
    /** Get cached value */
    get(key: string): Promise<T | null>;
    /** Set cached value */
    set(key: string, value: T, ttl?: number): Promise<void>;
    /** Check if key exists */
    has(key: string): Promise<boolean>;
    /** Delete cached value */
    delete(key: string): Promise<boolean>;
    /** Invalidate cache by pattern */
    invalidate(pattern: string): Promise<number>;
    /** Invalidate cache by tags */
    invalidateByTags(tags: string[]): Promise<number>;
    /** Clear all cache */
    clear(): Promise<void>;
    /** Get cache statistics */
    getStatistics(): CacheStatistics;
    /** Get cache configuration */
    getConfig(): CacheConfig;
    /** Update cache configuration */
    updateConfig(config: Partial<CacheConfig>): void;
    /** Warm cache with popular/predicted queries */
    warmCache(queries: string[]): Promise<void>;
    /** Get cache health status */
    getHealth(): {
        status: 'healthy' | 'degraded' | 'critical';
        issues: string[];
        recommendations: string[];
    };
}
/**
 * Cache layer configuration
 */
export interface CacheLayerConfig {
    /** L1 cache (memory) configuration */
    l1: Partial<CacheConfig>;
    /** L2 cache (persistent) configuration */
    l2: Partial<CacheConfig>;
    /** Enable multi-layer caching */
    multiLayer: boolean;
    /** L1 to L2 promotion threshold */
    promotionThreshold: number;
    /** Cache coherency strategy */
    coherencyStrategy: 'write-through' | 'write-behind' | 'write-around';
    /** Background sync settings */
    backgroundSync: {
        enabled: boolean;
        interval: number;
        batchSize: number;
    };
}
/**
 * Cache event types
 */
export type CacheEventType = 'cache_hit' | 'cache_miss' | 'cache_set' | 'cache_delete' | 'cache_invalidate' | 'cache_eviction' | 'cache_warm' | 'cache_error' | 'cache_full' | 'cache_expired';
/**
 * Cache event data
 */
export interface CacheEvent {
    /** Event type */
    type: CacheEventType;
    /** Event timestamp */
    timestamp: number;
    /** Cache key */
    key?: string;
    /** Event metadata */
    metadata: {
        /** Cache layer */
        layer?: 'l1' | 'l2';
        /** Entry size */
        size?: number;
        /** Operation duration */
        duration?: number;
        /** Error details */
        error?: string;
        /** Eviction reason */
        evictionReason?: 'size' | 'ttl' | 'lru' | 'lfu';
        /** Additional context */
        context?: Record<string, any>;
    };
}
/**
 * Cache compression interface
 */
export interface ICacheCompressor {
    /** Compress data */
    compress(data: any): Promise<{
        compressed: Uint8Array;
        originalSize: number;
        compressedSize: number;
        algorithm: string;
    }>;
    /** Decompress data */
    decompress(compressed: Uint8Array, algorithm: string): Promise<any>;
    /** Check if data should be compressed */
    shouldCompress(data: any, threshold: number): boolean;
    /** Get compression ratio */
    getCompressionRatio(originalSize: number, compressedSize: number): number;
    /** Get supported algorithms */
    getSupportedAlgorithms(): string[];
}
/**
 * Cache warming strategy interface
 */
export interface ICacheWarmingStrategy {
    /** Strategy name */
    name: string;
    /** Get queries to warm */
    getQueriesToWarm(config: CacheWarmingConfig, statistics: CacheStatistics, queryHistory: Array<{
        query: string;
        timestamp: number;
        frequency: number;
    }>): Promise<string[]>;
    /** Update strategy based on cache performance */
    updateStrategy(metrics: CacheStatistics): void;
}
/**
 * Cache prefetching configuration
 */
export interface CachePrefetchingConfig {
    /** Enable prefetching */
    enabled: boolean;
    /** Prefetch trigger threshold */
    triggerThreshold: number;
    /** Maximum prefetch operations */
    maxOperations: number;
    /** Prefetch strategies */
    strategies: Array<'sequential' | 'related' | 'predicted'>;
    /** Prefetch lookahead window */
    lookaheadWindow: number;
    /** Prefetch confidence threshold */
    confidenceThreshold: number;
}
/**
 * Cache metrics aggregator interface
 */
export interface ICacheMetricsAggregator {
    /** Record cache event */
    recordEvent(event: CacheEvent): void;
    /** Get aggregated metrics */
    getMetrics(timeWindow?: number): CacheStatistics;
    /** Get cache performance trends */
    getTrends(timeWindow: number): {
        hitRateTrend: number[];
        responseTimes: number[];
        evictionRate: number[];
        memoryUsage: number[];
    };
    /** Get cache recommendations */
    getRecommendations(): Array<{
        type: 'size' | 'ttl' | 'eviction' | 'compression';
        recommendation: string;
        impact: 'low' | 'medium' | 'high';
        priority: number;
    }>;
    /** Reset metrics */
    reset(): void;
}
/**
 * Cache optimization result
 */
export interface CacheOptimizationResult {
    /** Optimization type */
    type: 'size' | 'ttl' | 'eviction' | 'warming' | 'compression';
    /** Optimization description */
    description: string;
    /** Expected performance improvement */
    expectedImprovement: {
        hitRate?: number;
        responseTime?: number;
        memoryUsage?: number;
    };
    /** Implementation complexity */
    complexity: 'low' | 'medium' | 'high';
    /** Estimated impact score */
    impactScore: number;
    /** Configuration changes needed */
    configChanges: Partial<CacheConfig>;
}
/**
 * Cache query pattern
 */
export interface CacheQueryPattern {
    /** Pattern identifier */
    id: string;
    /** Query pattern regex */
    pattern: RegExp;
    /** Pattern frequency */
    frequency: number;
    /** Pattern cache strategy */
    strategy: {
        ttl: number;
        priority: number;
        compression: boolean;
        tags: string[];
    };
    /** Pattern performance metrics */
    metrics: {
        hitRate: number;
        averageResponseTime: number;
        memoryUsage: number;
    };
}
//# sourceMappingURL=Caching.d.ts.map