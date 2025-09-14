/**
 * Enhanced Rate Limiter - Client-side rate limiting with sliding window algorithm
 * @description Implements comprehensive rate limiting with sliding window and cross-tab coordination
 */
/**
 * Enhanced Rate limiter implementing IRateLimiter interface with sliding window algorithm
 */
export class EnhancedRateLimiter {
    constructor(config = {}) {
        this.slidingWindows = new Map();
        this.clientStates = new Map();
        this.config = {
            algorithm: 'sliding_window',
            windowSizeMs: 60000,
            maxRequests: 100,
            burstAllowance: 20,
            crossTabSync: true,
            storageKey: 'rate_limit_state',
            gracePeriodMs: 5000,
            ...config
        };
        // Start cleanup interval
        this.startCleanup();
        // Initialize cross-tab sync if enabled
        if (this.config.crossTabSync && typeof window !== 'undefined') {
            this.initializeCrossTabSync();
        }
    }
    /**
     * Check if request is allowed using sliding window algorithm
     */
    async checkLimit(clientId, query, context) {
        const now = Date.now();
        const window = this.getOrCreateSlidingWindow(clientId);
        const clientState = this.getOrCreateClientState(clientId);
        // Clean old requests outside window
        this.cleanSlidingWindow(window, now);
        // Check if within rate limit
        const requestCount = window.requests.length;
        const burstCount = window.requests.filter(req => now - req.timestamp < 1000).length;
        // Apply burst allowance
        const effectiveLimit = this.config.maxRequests +
            (burstCount <= this.config.burstAllowance ? this.config.burstAllowance : 0);
        const allowed = requestCount < effectiveLimit;
        if (allowed) {
            // Add request to window
            window.requests.push({
                timestamp: now,
                query: query || '',
                context: context || {}
            });
            // Update client state
            clientState.totalRequests++;
            clientState.lastRequestTime = now;
            clientState.requestHistory.push(now);
            // Keep history manageable
            if (clientState.requestHistory.length > 1000) {
                clientState.requestHistory = clientState.requestHistory.slice(-500);
            }
        }
        // Sync to cross-tab storage if enabled
        if (this.config.crossTabSync) {
            this.syncToStorage(clientId, clientState);
        }
        return {
            allowed,
            remaining: Math.max(0, effectiveLimit - requestCount - (allowed ? 1 : 0)),
            limit: effectiveLimit,
            resetTime: now + this.config.windowSizeMs,
            windowStart: now - this.config.windowSizeMs,
            retryAfter: allowed ? undefined : this.calculateRetryAfter(window, now),
            clientState: { ...clientState }
        };
    }
    /**
     * Record a request for rate limiting
     */
    async recordRequest(clientId, query, context) {
        const result = await this.checkLimit(clientId, query, context);
        if (!result.allowed) {
            throw new Error(`Rate limit exceeded. Retry after ${result.retryAfter}ms`);
        }
    }
    /**
     * Get remaining quota for client
     */
    getRemainingQuota(clientId) {
        const window = this.slidingWindows.get(clientId);
        if (!window) {
            return this.config.maxRequests;
        }
        this.cleanSlidingWindow(window, Date.now());
        return Math.max(0, this.config.maxRequests - window.requests.length);
    }
    /**
     * Reset rate limit for specific client
     */
    resetClient(clientId) {
        this.slidingWindows.delete(clientId);
        this.clientStates.delete(clientId);
        // Clear from cross-tab storage if enabled
        if (this.config.crossTabSync && typeof window !== 'undefined') {
            try {
                const existing = window.localStorage.getItem(this.config.storageKey);
                if (existing) {
                    const data = JSON.parse(existing);
                    delete data[clientId];
                    window.localStorage.setItem(this.config.storageKey, JSON.stringify(data));
                }
            }
            catch (error) {
                console.warn('Failed to clear client from cross-tab storage:', error);
            }
        }
    }
    /**
     * Get current configuration
     */
    getConfig() {
        return { ...this.config };
    }
    /**
     * Update configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }
    /**
     * Get or create sliding window for identifier
     */
    getOrCreateSlidingWindow(identifier) {
        let window = this.slidingWindows.get(identifier);
        if (!window) {
            window = {
                requests: [],
                windowStart: Date.now() - this.config.windowSizeMs,
                lastCleanup: Date.now()
            };
            this.slidingWindows.set(identifier, window);
        }
        return window;
    }
    /**
     * Get or create client state for identifier
     */
    getOrCreateClientState(identifier) {
        let state = this.clientStates.get(identifier);
        if (!state) {
            state = {
                clientId: identifier,
                totalRequests: 0,
                lastRequestTime: 0,
                requestHistory: [],
                createdAt: Date.now()
            };
            this.clientStates.set(identifier, state);
        }
        return state;
    }
    /**
     * Clean sliding window of old requests
     */
    cleanSlidingWindow(window, now) {
        const cutoff = now - this.config.windowSizeMs;
        window.requests = window.requests.filter(req => req.timestamp > cutoff);
        window.lastCleanup = now;
    }
    /**
     * Calculate retry after time for sliding window
     */
    calculateRetryAfter(window, now) {
        if (window.requests.length === 0)
            return 1000; // 1 second default
        const oldestRequest = window.requests[0];
        const timeUntilOldestExpires = (oldestRequest.timestamp + this.config.windowSizeMs) - now;
        return Math.max(1000, timeUntilOldestExpires);
    }
    /**
     * Initialize cross-tab synchronization
     */
    initializeCrossTabSync() {
        if (typeof window === 'undefined' || !window.localStorage)
            return;
        // Listen for storage changes from other tabs
        window.addEventListener('storage', (event) => {
            if (event.key === this.config.storageKey && event.newValue) {
                try {
                    const data = JSON.parse(event.newValue);
                    // Update local state with cross-tab data
                    for (const [clientId, state] of Object.entries(data)) {
                        this.clientStates.set(clientId, state);
                    }
                }
                catch (error) {
                    console.warn('Failed to parse cross-tab rate limit data:', error);
                }
            }
        });
    }
    /**
     * Sync client state to localStorage for cross-tab coordination
     */
    syncToStorage(identifier, state) {
        if (typeof window === 'undefined' || !window.localStorage)
            return;
        try {
            const existing = window.localStorage.getItem(this.config.storageKey);
            const data = existing ? JSON.parse(existing) : {};
            data[identifier] = state;
            // Keep only recent states to prevent storage bloat
            const now = Date.now();
            const maxAge = this.config.windowSizeMs * 2;
            for (const [key, clientState] of Object.entries(data)) {
                if (now - clientState.lastRequestTime > maxAge) {
                    delete data[key];
                }
            }
            window.localStorage.setItem(this.config.storageKey, JSON.stringify(data));
        }
        catch (error) {
            console.warn('Failed to sync rate limit state to storage:', error);
        }
    }
    /**
     * Start cleanup interval
     */
    startCleanup() {
        this.cleanupInterval = setInterval(() => {
            this.cleanup();
        }, 60000); // Clean up every minute
    }
    /**
     * Clean up old sliding windows and client states
     */
    cleanup() {
        const now = Date.now();
        const maxAge = this.config.windowSizeMs * 2; // Keep data for 2x window size
        // Clean old sliding windows
        for (const [identifier, window] of this.slidingWindows.entries()) {
            if (now - window.lastCleanup > maxAge) {
                this.slidingWindows.delete(identifier);
            }
            else {
                this.cleanSlidingWindow(window, now);
            }
        }
        // Clean old client states
        for (const [identifier, state] of this.clientStates.entries()) {
            if (now - state.lastRequestTime > maxAge) {
                this.clientStates.delete(identifier);
            }
        }
    }
    /**
     * Get metrics for monitoring
     */
    getMetrics() {
        let totalRequests = 0;
        for (const state of this.clientStates.values()) {
            totalRequests += state.totalRequests;
        }
        return {
            totalClients: this.clientStates.size,
            activeWindows: this.slidingWindows.size,
            totalRequests,
            memoryUsage: this.estimateMemoryUsage()
        };
    }
    /**
     * Estimate memory usage of rate limiter
     */
    estimateMemoryUsage() {
        let size = 0;
        // Estimate sliding windows
        for (const window of this.slidingWindows.values()) {
            size += window.requests.length * 100; // Rough estimate per request
        }
        // Estimate client states
        for (const state of this.clientStates.values()) {
            size += state.requestHistory.length * 8 + 200; // Timestamps + overhead
        }
        return size;
    }
    /**
     * Destroy rate limiter and clean up resources
     */
    destroy() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = undefined;
        }
        this.slidingWindows.clear();
        this.clientStates.clear();
    }
}
// Export default configuration
export const defaultRateLimitConfig = {
    algorithm: 'sliding_window',
    windowSizeMs: 60000,
    maxRequests: 100,
    burstAllowance: 20,
    crossTabSync: true,
    storageKey: 'rate_limit_state',
    gracePeriodMs: 5000
};
// Export legacy RateLimiter for backward compatibility
export { EnhancedRateLimiter as RateLimiter };
//# sourceMappingURL=EnhancedRateLimiter.js.map