/**
 * Request Deduplicator - Prevent duplicate concurrent requests for identical queries
 * @description Implements request deduplication with query hash-based duplicate detection
 */
import type { DeduplicationConfig, IRequestDeduplicator } from '../types/RateLimiting';
/**
 * Request deduplicator with query hash-based duplicate detection
 */
export declare class RequestDeduplicator implements IRequestDeduplicator {
    private config;
    private activeRequests;
    private requestCache;
    private hashFunction;
    private metrics;
    constructor(config: DeduplicationConfig);
    /**
     * Check if request should be deduplicated
     */
    shouldDeduplicate(query: string, params: Record<string, any>): boolean;
    /**
     * Get or create deduplicated request
     */
    getOrCreateRequest<T>(query: string, params: Record<string, any>, requestFn: () => Promise<T>): Promise<T>;
    /**
     * Clear completed requests and expired cache entries
     */
    cleanup(): void;
    /**
     * Get deduplication metrics
     */
    getMetrics(): {
        totalRequests: number;
        deduplicatedRequests: number;
        savedRequests: number;
        cacheSize: number;
    };
    /**
     * Update configuration
     */
    updateConfig(config: Partial<DeduplicationConfig>): void;
    /**
     * Clear all active requests and cache
     */
    clear(): void;
    /**
     * Generate request fingerprint
     */
    private generateFingerprint;
    /**
     * Sort and stringify parameters for consistent hashing
     */
    private sortAndStringifyParams;
    /**
     * Create dedicated request with result caching
     */
    private createDedicatedRequest;
    /**
     * Cache request result
     */
    private cacheResult;
    /**
     * Get cached result if available and not expired
     */
    private getCachedResult;
    /**
     * Generate unique client ID
     */
    private generateClientId;
    /**
     * Start cleanup interval
     */
    private startCleanupInterval;
    /**
     * Get active request information for debugging
     */
    getActiveRequests(): Array<{
        hash: string;
        query: string;
        waitingClients: number;
        age: number;
        dataSource: string;
    }>;
    /**
     * Get cache information for debugging
     */
    getCacheInfo(): Array<{
        hash: string;
        age: number;
        size: number;
    }>;
    /**
     * Process batch of requests with deduplication
     */
    processBatch<T>(requests: Array<{
        query: string;
        params: Record<string, any>;
        requestFn: () => Promise<T>;
    }>): Promise<T[]>;
}
/**
 * Default deduplication configuration
 */
export declare const defaultDeduplicationConfig: DeduplicationConfig;
/**
 * Create request deduplicator with default configuration
 */
export declare function createRequestDeduplicator(config?: Partial<DeduplicationConfig>): RequestDeduplicator;
//# sourceMappingURL=RequestDeduplicator.d.ts.map