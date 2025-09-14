/**
 * Rate Limiter - Sliding window rate limiting with token bucket algorithm
 * @description Implements configurable rate limiting with per-client and per-data-source quotas
 */
/**
 * Default rate limiting configuration
 */
const DEFAULT_CONFIG = {
    requestsPerWindow: 60,
    windowSizeMs: 60000, // 1 minute
    burstCapacity: 10,
    refillRate: 1, // 1 token per second
    useSlidingWindow: true,
    perDataSource: {}
};
/**
 * Sliding window rate limiter with token bucket algorithm
 */
export class RateLimiter {
    constructor(config = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.clientStates = new Map();
        this.dataSourceConfigs = new Map();
        this.eventCallbacks = [];
        this.cleanupInterval = null;
        // Initialize metrics
        this.metrics = {
            totalRequests: 0,
            blockedRequests: 0,
            deduplicatedRequests: 0,
            circuitBreakerTrips: 0,
            avgProcessingTime: 0,
            activeClients: 0,
            abuseIncidents: 0,
            degradationActivations: 0,
            performance: {
                rateLimitCheckTime: 0,
                deduplicationTime: 0,
                fingerprintingTime: 0,
                memoryUsage: 0
            }
        };
        // Initialize per-data-source configs
        if (this.config.perDataSource) {
            for (const [dataSource, dsConfig] of Object.entries(this.config.perDataSource)) {
                this.dataSourceConfigs.set(dataSource, { ...this.config, ...dsConfig });
            }
        }
        // Start cleanup interval
        this.startCleanup();
    }
    /**
     * Check if request is within rate limits
     */
    async checkLimit(clientId, query, dataSource) {
        const startTime = performance.now();
        try {
            this.metrics.totalRequests++;
            // Get applicable configuration
            const config = this.getConfigForDataSource(dataSource);
            // Get or create client state
            const clientState = this.getOrCreateClientState(clientId);
            // Update metrics
            this.updateActiveClientsCount();
            // Check sliding window limit
            const slidingWindowResult = this.checkSlidingWindow(clientState, config);
            // Check token bucket limit
            const tokenBucketResult = this.checkTokenBucket(clientState, config);
            // Determine final result (most restrictive)
            const finalResult = this.combineResults(slidingWindowResult, tokenBucketResult, config);
            // Record metrics
            if (!finalResult.allowed) {
                this.metrics.blockedRequests++;
                this.emitEvent('rate_limit_exceeded', clientId, { rateLimit: finalResult });
            }
            else if (finalResult.remainingRequests <= config.requestsPerWindow * 0.1) {
                this.emitEvent('rate_limit_warning', clientId, { rateLimit: finalResult });
            }
            // Update performance metrics
            const processingTime = performance.now() - startTime;
            this.updatePerformanceMetrics('rateLimitCheckTime', processingTime);
            return finalResult;
        }
        catch (error) {
            // Fail open - allow request if rate limiting fails
            console.error('Rate limiting error:', error);
            return {
                allowed: true,
                remainingRequests: this.config.requestsPerWindow,
                resetTime: Date.now() + this.config.windowSizeMs,
                windowStart: Date.now(),
                appliedLimit: dataSource || 'default',
                retryAfter: 0
            };
        }
    }
    /**
     * Record successful/failed request execution
     */
    recordRequest(clientId, query, success) {
        const clientState = this.clientStates.get(clientId);
        if (!clientState)
            return;
        // Update request timestamps
        const now = Date.now();
        clientState.lastRequestTime = now;
        clientState.totalRequests++;
        // Clean old timestamps from sliding window
        this.cleanSlidingWindow(clientState);
        // Add current request timestamp
        clientState.requestTimestamps.push(now);
        // Update failure tracking for circuit breaker integration
        if (!success) {
            // Could emit event for circuit breaker
            this.emitEvent('rate_limit_reset', clientId, {});
        }
    }
    /**
     * Get remaining quota for client
     */
    getRemainingQuota(clientId) {
        const clientState = this.clientStates.get(clientId);
        if (!clientState) {
            return {
                allowed: true,
                remainingRequests: this.config.requestsPerWindow,
                resetTime: Date.now() + this.config.windowSizeMs,
                windowStart: Date.now(),
                appliedLimit: 'default'
            };
        }
        this.cleanSlidingWindow(clientState);
        const remainingRequests = Math.max(0, this.config.requestsPerWindow - clientState.requestTimestamps.length);
        const remainingTokens = Math.floor(clientState.tokens);
        return {
            allowed: remainingRequests > 0 && remainingTokens > 0,
            remainingRequests: Math.min(remainingRequests, remainingTokens),
            resetTime: this.getWindowResetTime(clientState),
            windowStart: clientState.firstRequestTime,
            appliedLimit: 'default'
        };
    }
    /**
     * Reset rate limit state for client
     */
    resetClient(clientId) {
        const clientState = this.clientStates.get(clientId);
        if (clientState) {
            clientState.requestTimestamps = [];
            clientState.tokens = this.config.burstCapacity || this.config.requestsPerWindow;
            clientState.lastRefill = Date.now();
            this.emitEvent('rate_limit_reset', clientId, {});
        }
    }
    /**
     * Get comprehensive rate limiting metrics
     */
    getMetrics() {
        this.updateMemoryUsage();
        return { ...this.metrics };
    }
    /**
     * Update rate limiting configuration
     */
    updateConfig(config) {
        this.config = { ...this.config, ...config };
        // Update per-data-source configs
        if (config.perDataSource) {
            this.dataSourceConfigs.clear();
            for (const [dataSource, dsConfig] of Object.entries(config.perDataSource)) {
                this.dataSourceConfigs.set(dataSource, { ...this.config, ...dsConfig });
            }
        }
    }
    /**
     * Add event callback
     */
    onEvent(callback) {
        this.eventCallbacks.push(callback);
    }
    /**
     * Cleanup resources
     */
    destroy() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
        this.clientStates.clear();
        this.dataSourceConfigs.clear();
        this.eventCallbacks.length = 0;
    }
    // Private implementation methods
    getConfigForDataSource(dataSource) {
        if (dataSource && this.dataSourceConfigs.has(dataSource)) {
            return this.dataSourceConfigs.get(dataSource);
        }
        return this.config;
    }
    getOrCreateClientState(clientId) {
        let clientState = this.clientStates.get(clientId);
        if (!clientState) {
            const now = Date.now();
            clientState = {
                clientId,
                requestTimestamps: [],
                tokens: this.config.burstCapacity || this.config.requestsPerWindow,
                lastRefill: now,
                totalRequests: 0,
                firstRequestTime: now,
                lastRequestTime: now
            };
            this.clientStates.set(clientId, clientState);
        }
        return clientState;
    }
    checkSlidingWindow(clientState, config) {
        this.cleanSlidingWindow(clientState, config);
        const requestCount = clientState.requestTimestamps.length;
        const remainingRequests = Math.max(0, config.requestsPerWindow - requestCount);
        const allowed = requestCount < config.requestsPerWindow;
        return {
            allowed,
            remainingRequests,
            resetTime: this.getWindowResetTime(clientState, config),
            windowStart: clientState.requestTimestamps[0] || Date.now(),
            appliedLimit: 'sliding_window',
            retryAfter: allowed ? 0 : Math.ceil(config.windowSizeMs / 1000)
        };
    }
    checkTokenBucket(clientState, config) {
        this.refillTokens(clientState, config);
        const hasTokens = clientState.tokens >= 1;
        const remainingTokens = Math.floor(clientState.tokens);
        if (hasTokens) {
            clientState.tokens -= 1;
        }
        return {
            allowed: hasTokens,
            remainingRequests: remainingTokens,
            resetTime: this.getTokenRefillTime(clientState, config),
            windowStart: clientState.firstRequestTime,
            appliedLimit: 'token_bucket',
            retryAfter: hasTokens ? 0 : Math.ceil(1 / (config.refillRate || 1))
        };
    }
    combineResults(slidingResult, tokenResult, config) {
        // Use sliding window if enabled, otherwise use token bucket
        if (config.useSlidingWindow) {
            // Both limits must pass
            const allowed = slidingResult.allowed && tokenResult.allowed;
            return {
                allowed,
                remainingRequests: Math.min(slidingResult.remainingRequests, tokenResult.remainingRequests),
                resetTime: Math.max(slidingResult.resetTime, tokenResult.resetTime),
                windowStart: slidingResult.windowStart,
                appliedLimit: allowed ? slidingResult.appliedLimit : (slidingResult.allowed ? tokenResult.appliedLimit : slidingResult.appliedLimit),
                retryAfter: allowed ? 0 : Math.max(slidingResult.retryAfter || 0, tokenResult.retryAfter || 0)
            };
        }
        else {
            return tokenResult;
        }
    }
    cleanSlidingWindow(clientState, config) {
        const windowSize = (config || this.config).windowSizeMs;
        const cutoffTime = Date.now() - windowSize;
        // Remove timestamps outside the sliding window
        clientState.requestTimestamps = clientState.requestTimestamps.filter(timestamp => timestamp > cutoffTime);
    }
    refillTokens(clientState, config) {
        const now = Date.now();
        const timeSinceLastRefill = now - clientState.lastRefill;
        const tokensToAdd = (timeSinceLastRefill / 1000) * (config.refillRate || 1);
        if (tokensToAdd > 0) {
            const maxTokens = config.burstCapacity || config.requestsPerWindow;
            clientState.tokens = Math.min(maxTokens, clientState.tokens + tokensToAdd);
            clientState.lastRefill = now;
        }
    }
    getWindowResetTime(clientState, config) {
        const windowSize = (config || this.config).windowSizeMs;
        if (clientState.requestTimestamps.length === 0) {
            return Date.now() + windowSize;
        }
        return clientState.requestTimestamps[0] + windowSize;
    }
    getTokenRefillTime(clientState, config) {
        const refillRate = config.refillRate || 1;
        return clientState.lastRefill + (1000 / refillRate);
    }
    updateActiveClientsCount() {
        this.metrics.activeClients = this.clientStates.size;
    }
    updatePerformanceMetrics(metric, value) {
        // Simple exponential moving average
        const alpha = 0.1;
        this.metrics.performance[metric] = (1 - alpha) * this.metrics.performance[metric] + alpha * value;
    }
    updateMemoryUsage() {
        // Estimate memory usage
        const clientStatesSize = this.clientStates.size * 200; // Rough estimate per client state
        const configSize = JSON.stringify(this.config).length;
        this.metrics.performance.memoryUsage = clientStatesSize + configSize;
    }
    emitEvent(type, clientId, data) {
        const event = {
            type,
            timestamp: Date.now(),
            clientId,
            data
        };
        this.eventCallbacks.forEach(callback => {
            try {
                callback(event);
            }
            catch (error) {
                console.error('Rate limiting event callback error:', error);
            }
        });
    }
    startCleanup() {
        // Clean up old client states every 5 minutes
        this.cleanupInterval = setInterval(() => {
            const cutoffTime = Date.now() - (this.config.windowSizeMs * 2); // Keep data for 2x window size
            for (const [clientId, clientState] of this.clientStates.entries()) {
                if (clientState.lastRequestTime < cutoffTime) {
                    this.clientStates.delete(clientId);
                }
            }
            this.updateActiveClientsCount();
        }, 5 * 60 * 1000); // 5 minutes
    }
}
/**
 * Factory function for creating rate limiter instances
 */
export function createRateLimiter(config) {
    return new RateLimiter(config);
}
/**
 * Utility function for checking if a rate limit result indicates throttling
 */
export function isThrottled(result) {
    return !result.allowed;
}
/**
 * Utility function for getting retry delay from rate limit result
 */
export function getRetryDelay(result) {
    return result.retryAfter || 0;
}
/**
 * Utility function for formatting rate limit status for user display
 */
export function formatRateLimitStatus(result) {
    if (result.allowed) {
        return `${result.remainingRequests} requests remaining`;
    }
    else {
        const retryAfter = result.retryAfter || 0;
        if (retryAfter > 0) {
            return `Rate limited. Try again in ${retryAfter} seconds`;
        }
        else {
            return 'Rate limited. Please try again later';
        }
    }
}
//# sourceMappingURL=RateLimiter.js.map