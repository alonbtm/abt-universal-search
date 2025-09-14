/**
 * Enhanced Rate Limiter - Client-side rate limiting with sliding window algorithm
 * @description Implements rate limiting to respect API quotas and prevent abuse
 */
import type { RateLimitConfig } from '../types/Config';
import type { RateLimitStatus } from '../types/Results';
import type { RateLimitConfig as NewRateLimitConfig, IRateLimiter } from '../types/RateLimiting';
/**
 * Enhanced Rate limiter implementing IRateLimiter interface
 */
export declare class RateLimiter implements IRateLimiter {
    private slidingWindows;
    private clientStates;
    private config;
    private cleanupInterval?;
    constructor(config?: Partial<NewRateLimitConfig>);
    /**
     * Get or create sliding window for identifier
     */
    private getOrCreateSlidingWindow;
    /**
     * Get or create client state for identifier
     */
    private getOrCreateClientState;
    /**
     * Get or create token bucket for identifier
     */
    private getOrCreateBucket;
    /**
     * Check if request can be made immediately
     */
    canMakeRequest(): boolean;
    /**
     * Wait for permission to make a request
     */
    waitForPermission(priority?: number): Promise<void>;
    /**
     * Get current rate limit status
     */
    getStatus(): RateLimitStatus;
    /**
     * Report rate limit violation from API response
     */
    reportViolation(resetTime?: number): void;
    /**
     * Update rate limits from API response headers
     */
    updateFromHeaders(headers: Record<string, string>): void;
    /**
     * Clear the request queue
     */
    clearQueue(): void;
    /**
     * Get queue length
     */
    getQueueLength(): number;
    /**
     * Reset rate limiter state
     */
    reset(): void;
    /**
     * Refill the token bucket based on elapsed time
     */
    private refillBucket;
    /**
     * Consume a token from the bucket
     */
    private consumeToken;
    /**
     * Queue a request for later processing
     */
    private queueRequest;
    /**
     * Process the request queue
     */
    private processQueue;
    /**
     * Calculate backoff delay after rate limit violations
     */
    private calculateBackoffDelay;
    /**
     * Estimate queue wait time
     */
    private estimateQueueWait;
    /**
     * Calculate next token bucket reset time
     */
    private calculateResetTime;
    /**
     * Extract numeric value from headers
     */
    private extractHeaderValue;
    /**
     * Generate unique request ID
     */
    private generateRequestId;
    /**
     * Delay utility
     */
    private delay;
}
/**
 * Rate limiter factory
 */
export declare class RateLimiterFactory {
    private limiters;
    /**
     * Get or create rate limiter for endpoint
     */
    getLimiter(endpoint: string, config: RateLimitConfig): RateLimiter;
    /**
     * Remove rate limiter for endpoint
     */
    removeLimiter(endpoint: string): void;
    /**
     * Clear all rate limiters
     */
    clearAll(): void;
    /**
     * Get all active endpoints
     */
    getActiveEndpoints(): string[];
}
/**
 * Global rate limiter factory instance
 */
export declare const rateLimiterFactory: RateLimiterFactory;
//# sourceMappingURL=RateLimiter.d.ts.map