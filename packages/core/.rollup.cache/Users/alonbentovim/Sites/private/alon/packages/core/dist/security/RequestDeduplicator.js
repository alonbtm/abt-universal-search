/**
 * Request Deduplicator - Prevent duplicate concurrent requests for identical queries
 * @description Implements request deduplication with query hash-based duplicate detection
 */
/**
 * Hash algorithm implementations
 */
class HashAlgorithms {
    /**
     * Simple hash algorithm (fast but basic)
     */
    static simple(input) {
        let hash = 0;
        for (let i = 0; i < input.length; i++) {
            const char = input.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(36);
    }
    /**
     * DJB2 hash algorithm (good balance of speed and distribution)
     */
    static djb2(input) {
        let hash = 5381;
        for (let i = 0; i < input.length; i++) {
            hash = ((hash << 5) + hash) + input.charCodeAt(i);
        }
        return Math.abs(hash).toString(36);
    }
    /**
     * FNV-1a hash algorithm (good distribution, slightly slower)
     */
    static fnv1a(input) {
        let hash = 2166136261;
        for (let i = 0; i < input.length; i++) {
            hash ^= input.charCodeAt(i);
            hash *= 16777619;
        }
        return Math.abs(hash).toString(36);
    }
}
/**
 * Request deduplicator with query hash-based duplicate detection
 */
export class RequestDeduplicator {
    constructor(config) {
        this.activeRequests = new Map();
        this.requestCache = new Map();
        this.metrics = {
            totalRequests: 0,
            deduplicatedRequests: 0,
            savedRequests: 0,
            cacheHits: 0
        };
        this.config = {
            enabled: config.enabled,
            maxConcurrentRequests: config.maxConcurrentRequests,
            cacheSize: config.cacheSize,
            requestTTL: config.requestTTL,
            enableResultSharing: config.enableResultSharing,
            hashAlgorithm: config.hashAlgorithm
        };
        // Select hash function based on algorithm
        switch (this.config.hashAlgorithm) {
            case 'djb2':
                this.hashFunction = HashAlgorithms.djb2;
                break;
            case 'fnv1a':
                this.hashFunction = HashAlgorithms.fnv1a;
                break;
            case 'simple':
            default:
                this.hashFunction = HashAlgorithms.simple;
                break;
        }
        // Start cleanup interval
        this.startCleanupInterval();
    }
    /**
     * Check if request should be deduplicated
     */
    shouldDeduplicate(query, params) {
        if (!this.config.enabled) {
            return false;
        }
        const fingerprint = this.generateFingerprint(query, params);
        return this.activeRequests.has(fingerprint.hash);
    }
    /**
     * Get or create deduplicated request
     */
    async getOrCreateRequest(query, params, requestFn) {
        this.metrics.totalRequests++;
        if (!this.config.enabled) {
            return requestFn();
        }
        const fingerprint = this.generateFingerprint(query, params);
        // Check cache first if result sharing is enabled
        if (this.config.enableResultSharing) {
            const cached = this.getCachedResult(fingerprint.hash);
            if (cached) {
                this.metrics.cacheHits++;
                return cached;
            }
        }
        // Check if request is already active
        const existingRequest = this.activeRequests.get(fingerprint.hash);
        if (existingRequest) {
            this.metrics.deduplicatedRequests++;
            this.metrics.savedRequests++;
            // Add client to waiting list
            const clientId = this.generateClientId();
            existingRequest.waitingClients.push(clientId);
            return existingRequest.promise;
        }
        // Check concurrent request limit
        if (this.activeRequests.size >= this.config.maxConcurrentRequests) {
            throw new Error('Maximum concurrent requests exceeded');
        }
        // Create new request
        const promise = this.createDedicatedRequest(fingerprint, requestFn);
        const deduplicatedRequest = {
            fingerprint,
            promise,
            waitingClients: [this.generateClientId()],
            startTime: Date.now(),
            timeout: setTimeout(() => {
                this.activeRequests.delete(fingerprint.hash);
            }, this.config.requestTTL)
        };
        this.activeRequests.set(fingerprint.hash, deduplicatedRequest);
        return promise;
    }
    /**
     * Clear completed requests and expired cache entries
     */
    cleanup() {
        const now = Date.now();
        // Clean up expired active requests
        for (const [hash, request] of this.activeRequests.entries()) {
            if (now - request.startTime > this.config.requestTTL) {
                if (request.timeout) {
                    clearTimeout(request.timeout);
                }
                this.activeRequests.delete(hash);
            }
        }
        // Clean up expired cache entries
        for (const [hash, cached] of this.requestCache.entries()) {
            if (now - cached.timestamp > this.config.requestTTL) {
                this.requestCache.delete(hash);
            }
        }
        // Limit cache size
        if (this.requestCache.size > this.config.cacheSize) {
            const entries = Array.from(this.requestCache.entries());
            entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
            const toRemove = entries.slice(0, entries.length - this.config.cacheSize);
            for (const [hash] of toRemove) {
                this.requestCache.delete(hash);
            }
        }
    }
    /**
     * Get deduplication metrics
     */
    getMetrics() {
        return {
            totalRequests: this.metrics.totalRequests,
            deduplicatedRequests: this.metrics.deduplicatedRequests,
            savedRequests: this.metrics.savedRequests,
            cacheSize: this.requestCache.size
        };
    }
    /**
     * Update configuration
     */
    updateConfig(config) {
        Object.assign(this.config, config);
        // Update hash function if algorithm changed
        if (config.hashAlgorithm) {
            switch (config.hashAlgorithm) {
                case 'djb2':
                    this.hashFunction = HashAlgorithms.djb2;
                    break;
                case 'fnv1a':
                    this.hashFunction = HashAlgorithms.fnv1a;
                    break;
                case 'simple':
                default:
                    this.hashFunction = HashAlgorithms.simple;
                    break;
            }
        }
    }
    /**
     * Clear all active requests and cache
     */
    clear() {
        // Clear timeouts
        for (const request of this.activeRequests.values()) {
            if (request.timeout) {
                clearTimeout(request.timeout);
            }
        }
        this.activeRequests.clear();
        this.requestCache.clear();
        // Reset metrics
        this.metrics = {
            totalRequests: 0,
            deduplicatedRequests: 0,
            savedRequests: 0,
            cacheHits: 0
        };
    }
    /**
     * Generate request fingerprint
     */
    generateFingerprint(query, params) {
        const normalizedQuery = query.trim().toLowerCase();
        const sortedParams = this.sortAndStringifyParams(params);
        const combinedInput = `${normalizedQuery}:${sortedParams}`;
        const hash = this.hashFunction(combinedInput);
        const paramsHash = this.hashFunction(sortedParams);
        return {
            hash,
            query: normalizedQuery,
            paramsHash,
            dataSource: params.dataSource || 'default',
            createdAt: Date.now(),
            status: 'pending'
        };
    }
    /**
     * Sort and stringify parameters for consistent hashing
     */
    sortAndStringifyParams(params) {
        const sortedKeys = Object.keys(params).sort();
        const sortedParams = {};
        for (const key of sortedKeys) {
            sortedParams[key] = params[key];
        }
        return JSON.stringify(sortedParams);
    }
    /**
     * Create dedicated request with result caching
     */
    async createDedicatedRequest(fingerprint, requestFn) {
        try {
            const result = await requestFn();
            // Cache result if sharing is enabled
            if (this.config.enableResultSharing) {
                this.cacheResult(fingerprint.hash, result);
            }
            // Update fingerprint status
            fingerprint.status = 'completed';
            return result;
        }
        catch (error) {
            fingerprint.status = 'failed';
            throw error;
        }
        finally {
            // Clean up active request
            this.activeRequests.delete(fingerprint.hash);
        }
    }
    /**
     * Cache request result
     */
    cacheResult(hash, result) {
        this.requestCache.set(hash, {
            result,
            timestamp: Date.now()
        });
    }
    /**
     * Get cached result if available and not expired
     */
    getCachedResult(hash) {
        const cached = this.requestCache.get(hash);
        if (!cached) {
            return null;
        }
        const now = Date.now();
        if (now - cached.timestamp > this.config.requestTTL) {
            this.requestCache.delete(hash);
            return null;
        }
        return cached.result;
    }
    /**
     * Generate unique client ID
     */
    generateClientId() {
        return `client-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }
    /**
     * Start cleanup interval
     */
    startCleanupInterval() {
        setInterval(() => {
            this.cleanup();
        }, Math.max(this.config.requestTTL / 4, 5000)); // Clean up every quarter TTL or 5 seconds
    }
    /**
     * Get active request information for debugging
     */
    getActiveRequests() {
        const now = Date.now();
        return Array.from(this.activeRequests.values()).map(request => ({
            hash: request.fingerprint.hash,
            query: request.fingerprint.query,
            waitingClients: request.waitingClients.length,
            age: now - request.startTime,
            dataSource: request.fingerprint.dataSource
        }));
    }
    /**
     * Get cache information for debugging
     */
    getCacheInfo() {
        const now = Date.now();
        return Array.from(this.requestCache.entries()).map(([hash, cached]) => ({
            hash,
            age: now - cached.timestamp,
            size: JSON.stringify(cached.result).length
        }));
    }
    /**
     * Process batch of requests with deduplication
     */
    async processBatch(requests) {
        const promises = requests.map(({ query, params, requestFn }) => this.getOrCreateRequest(query, params, requestFn));
        return Promise.all(promises);
    }
}
/**
 * Default deduplication configuration
 */
export const defaultDeduplicationConfig = {
    enabled: true,
    maxConcurrentRequests: 50,
    cacheSize: 100,
    requestTTL: 30000, // 30 seconds
    enableResultSharing: true,
    hashAlgorithm: 'djb2'
};
/**
 * Create request deduplicator with default configuration
 */
export function createRequestDeduplicator(config) {
    return new RequestDeduplicator({
        ...defaultDeduplicationConfig,
        ...config
    });
}
//# sourceMappingURL=RequestDeduplicator.js.map