/**
 * Rate Limiter - Sliding window rate limiting with token bucket algorithm
 * @description Implements configurable rate limiting with per-client and per-data-source quotas
 */
import { RateLimitConfig, RateLimitResult, RateLimitingMetrics, IRateLimiter, RateLimitEvent } from '../types/RateLimiting.js';
/**
 * Sliding window rate limiter with token bucket algorithm
 */
export declare class RateLimiter implements IRateLimiter {
    private config;
    private clientStates;
    private dataSourceConfigs;
    private metrics;
    private eventCallbacks;
    private cleanupInterval;
    constructor(config?: Partial<RateLimitConfig>);
    /**
     * Check if request is within rate limits
     */
    checkLimit(clientId: string, query: string, dataSource?: string): Promise<RateLimitResult>;
    /**
     * Record successful/failed request execution
     */
    recordRequest(clientId: string, query: string, success: boolean): void;
    /**
     * Get remaining quota for client
     */
    getRemainingQuota(clientId: string): RateLimitResult;
    /**
     * Reset rate limit state for client
     */
    resetClient(clientId: string): void;
    /**
     * Get comprehensive rate limiting metrics
     */
    getMetrics(): RateLimitingMetrics;
    /**
     * Update rate limiting configuration
     */
    updateConfig(config: Partial<RateLimitConfig>): void;
    /**
     * Add event callback
     */
    onEvent(callback: (event: RateLimitEvent) => void): void;
    /**
     * Cleanup resources
     */
    destroy(): void;
    private getConfigForDataSource;
    private getOrCreateClientState;
    private checkSlidingWindow;
    private checkTokenBucket;
    private combineResults;
    private cleanSlidingWindow;
    private refillTokens;
    private getWindowResetTime;
    private getTokenRefillTime;
    private updateActiveClientsCount;
    private updatePerformanceMetrics;
    private updateMemoryUsage;
    private emitEvent;
    private startCleanup;
}
/**
 * Factory function for creating rate limiter instances
 */
export declare function createRateLimiter(config?: Partial<RateLimitConfig>): IRateLimiter;
/**
 * Utility function for checking if a rate limit result indicates throttling
 */
export declare function isThrottled(result: RateLimitResult): boolean;
/**
 * Utility function for getting retry delay from rate limit result
 */
export declare function getRetryDelay(result: RateLimitResult): number;
/**
 * Utility function for formatting rate limit status for user display
 */
export declare function formatRateLimitStatus(result: RateLimitResult): string;
//# sourceMappingURL=RateLimiter.d.ts.map