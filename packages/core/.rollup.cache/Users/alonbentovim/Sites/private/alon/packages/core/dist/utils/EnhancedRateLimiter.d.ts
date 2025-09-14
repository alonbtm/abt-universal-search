/**
 * Enhanced Rate Limiter - Client-side rate limiting with sliding window algorithm
 * @description Implements comprehensive rate limiting with sliding window and cross-tab coordination
 */
import type { RateLimitConfig, RateLimitResult, IRateLimiter } from '../types/RateLimiting';
/**
 * Enhanced Rate limiter implementing IRateLimiter interface with sliding window algorithm
 */
export declare class EnhancedRateLimiter implements IRateLimiter {
    private slidingWindows;
    private clientStates;
    private config;
    private cleanupInterval?;
    constructor(config?: Partial<RateLimitConfig>);
    /**
     * Check if request is allowed using sliding window algorithm
     */
    checkLimit(clientId: string, query?: string, context?: Record<string, any>): Promise<RateLimitResult>;
    /**
     * Record a request for rate limiting
     */
    recordRequest(clientId: string, query: string, context?: Record<string, any>): Promise<void>;
    /**
     * Get remaining quota for client
     */
    getRemainingQuota(clientId: string): number;
    /**
     * Reset rate limit for specific client
     */
    resetClient(clientId: string): void;
    /**
     * Get current configuration
     */
    getConfig(): RateLimitConfig;
    /**
     * Update configuration
     */
    updateConfig(newConfig: Partial<RateLimitConfig>): void;
    /**
     * Get or create sliding window for identifier
     */
    private getOrCreateSlidingWindow;
    /**
     * Get or create client state for identifier
     */
    private getOrCreateClientState;
    /**
     * Clean sliding window of old requests
     */
    private cleanSlidingWindow;
    /**
     * Calculate retry after time for sliding window
     */
    private calculateRetryAfter;
    /**
     * Initialize cross-tab synchronization
     */
    private initializeCrossTabSync;
    /**
     * Sync client state to localStorage for cross-tab coordination
     */
    private syncToStorage;
    /**
     * Start cleanup interval
     */
    private startCleanup;
    /**
     * Clean up old sliding windows and client states
     */
    private cleanup;
    /**
     * Get metrics for monitoring
     */
    getMetrics(): {
        totalClients: number;
        activeWindows: number;
        totalRequests: number;
        memoryUsage: number;
    };
    /**
     * Estimate memory usage of rate limiter
     */
    private estimateMemoryUsage;
    /**
     * Destroy rate limiter and clean up resources
     */
    destroy(): void;
}
export declare const defaultRateLimitConfig: RateLimitConfig;
export { EnhancedRateLimiter as RateLimiter };
//# sourceMappingURL=EnhancedRateLimiter.d.ts.map