/**
 * Graceful Degradation - Maintain partial functionality when rate limits are exceeded
 * @description Implements fallback mechanisms and feature management for rate limit scenarios
 */
import type { GracefulDegradationConfig, DegradationState, RateLimitingMetrics, IGracefulDegradation } from '../types/RateLimiting';
/**
 * Fallback cache for storing results during degradation
 */
declare class FallbackCache {
    private cache;
    private maxSize;
    private ttl;
    constructor(maxSize: number, ttl: number);
    /**
     * Store result in fallback cache
     */
    store(key: string, result: any): void;
    /**
     * Retrieve result from fallback cache
     */
    get(key: string): any | null;
    /**
     * Check if key exists in cache
     */
    has(key: string): boolean;
    /**
     * Clear expired entries
     */
    cleanup(): void;
    /**
     * Evict least recently used entry
     */
    private evictLRU;
    /**
     * Get cache statistics
     */
    getStats(): {
        size: number;
        maxSize: number;
        hitRate: number;
        totalHits: number;
    };
    /**
     * Clear all cached entries
     */
    clear(): void;
}
/**
 * Graceful degradation with fallback mechanisms and feature management
 */
export declare class GracefulDegradation implements IGracefulDegradation {
    private config;
    private state;
    private featureManager;
    private fallbackCache;
    private recoveryTimer?;
    constructor(config: GracefulDegradationConfig);
    /**
     * Check if system should degrade
     */
    shouldDegrade(metrics: RateLimitingMetrics): boolean;
    /**
     * Activate degradation
     */
    activateDegradation(reason: DegradationState['reason'], level: DegradationState['degradationLevel']): void;
    /**
     * Deactivate degradation
     */
    deactivateDegradation(): void;
    /**
     * Get current degradation state
     */
    getState(): DegradationState;
    /**
     * Get fallback result from cache
     */
    getFallbackResult(query: string): any | null;
    /**
     * Store result for fallback
     */
    storeFallbackResult(query: string, result: any): void;
    /**
     * Check if feature is available
     */
    isFeatureAvailable(feature: string): boolean;
    /**
     * Get user notification message
     */
    getNotificationMessage(): string | null;
    /**
     * Get rate limit warning message
     */
    getRateLimitWarning(): string | null;
    /**
     * Update configuration
     */
    updateConfig(config: Partial<GracefulDegradationConfig>): void;
    /**
     * Calculate estimated recovery time
     */
    private calculateRecoveryTime;
    /**
     * Attempt automatic recovery
     */
    private attemptRecovery;
    /**
     * Update state with current feature availability
     */
    private updateStateFeatures;
    /**
     * Generate cache key for query
     */
    private generateCacheKey;
    /**
     * Get degradation statistics
     */
    getStatistics(): {
        degradationDuration: number;
        fallbackCacheStats: ReturnType<FallbackCache['getStats']>;
        featureAvailability: Record<string, boolean>;
        recoveryTimeRemaining: number;
    };
    /**
     * Force recovery (for testing/admin purposes)
     */
    forceRecovery(): void;
    /**
     * Clear fallback cache
     */
    clearFallbackCache(): void;
}
/**
 * Default graceful degradation configuration
 */
export declare const defaultGracefulDegradationConfig: GracefulDegradationConfig;
/**
 * Create graceful degradation with default configuration
 */
export declare function createGracefulDegradation(config?: Partial<GracefulDegradationConfig>): GracefulDegradation;
export {};
//# sourceMappingURL=GracefulDegradation.d.ts.map