/**
 * Rate Limiting Types - Type definitions for rate limiting, throttling, and abuse prevention
 * @description TypeScript interfaces for rate limiters, debouncing, circuit breakers, and client tracking
 */
/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
    /** Maximum requests per time window */
    requestsPerWindow: number;
    /** Time window duration in milliseconds */
    windowSizeMs: number;
    /** Burst capacity for token bucket */
    burstCapacity?: number;
    /** Token refill rate per second */
    refillRate?: number;
    /** Enable sliding window algorithm */
    useSlidingWindow: boolean;
    /** Rate limit per data source */
    perDataSource?: Record<string, Partial<RateLimitConfig>>;
}
/**
 * Rate limit result
 */
export interface RateLimitResult {
    /** Whether request is allowed */
    allowed: boolean;
    /** Remaining requests in current window */
    remainingRequests: number;
    /** Time until window resets (ms) */
    resetTime: number;
    /** Current window start time */
    windowStart: number;
    /** Rate limit that was applied */
    appliedLimit: string;
    /** Retry after time in seconds */
    retryAfter?: number;
}
/**
 * Client rate limit state
 */
export interface ClientRateState {
    /** Client identifier */
    clientId: string;
    /** Request timestamps in current window */
    requestTimestamps: number[];
    /** Token bucket current token count */
    tokens: number;
    /** Last token refill time */
    lastRefill: number;
    /** Total requests made */
    totalRequests: number;
    /** First request time */
    firstRequestTime: number;
    /** Last request time */
    lastRequestTime: number;
}
/**
 * Adaptive debounce configuration
 */
export interface AdaptiveDebounceConfig {
    /** Base debounce delay in milliseconds */
    baseDelayMs: number;
    /** Maximum debounce delay */
    maxDelayMs: number;
    /** Minimum debounce delay */
    minDelayMs: number;
    /** Factor for delay adjustment */
    adaptationFactor: number;
    /** Frequency threshold for rapid typing detection */
    rapidTypingThreshold: number;
    /** Confidence threshold for bypassing debounce */
    bypassConfidenceThreshold: number;
    /** Enable pattern-based optimization */
    enablePatternOptimization: boolean;
}
/**
 * Debounce state tracking
 */
export interface DebounceState {
    /** Last input time */
    lastInputTime: number;
    /** Input frequency (chars/ms) */
    inputFrequency: number;
    /** Query pattern confidence */
    patternConfidence: number;
    /** Current debounce delay */
    currentDelay: number;
    /** Input sequence for pattern analysis */
    inputSequence: string[];
    /** Typing pattern classification */
    typingPattern: 'slow' | 'normal' | 'rapid' | 'burst';
}
/**
 * Request deduplication configuration
 */
export interface DeduplicationConfig {
    /** Enable request deduplication */
    enabled: boolean;
    /** Maximum concurrent identical requests */
    maxConcurrentRequests: number;
    /** Request hash cache size */
    cacheSize: number;
    /** Request TTL in milliseconds */
    requestTTL: number;
    /** Enable result sharing */
    enableResultSharing: boolean;
    /** Hash algorithm for request fingerprinting */
    hashAlgorithm: 'simple' | 'djb2' | 'fnv1a';
}
/**
 * Request fingerprint
 */
export interface RequestFingerprint {
    /** Request hash */
    hash: string;
    /** Original query */
    query: string;
    /** Request parameters hash */
    paramsHash: string;
    /** Data source identifier */
    dataSource: string;
    /** Request creation time */
    createdAt: number;
    /** Request status */
    status: 'pending' | 'completed' | 'failed';
}
/**
 * Deduplicated request state
 */
export interface DeduplicatedRequest {
    /** Request fingerprint */
    fingerprint: RequestFingerprint;
    /** Promise for request result */
    promise: Promise<any>;
    /** Clients waiting for this request */
    waitingClients: string[];
    /** Request start time */
    startTime: number;
    /** Request timeout */
    timeout?: NodeJS.Timeout;
}
/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
    /** Failure threshold to open circuit */
    failureThreshold: number;
    /** Recovery timeout in milliseconds */
    recoveryTimeoutMs: number;
    /** Request timeout in milliseconds */
    requestTimeoutMs: number;
    /** Half-open max requests */
    halfOpenMaxRequests: number;
    /** Success threshold to close circuit */
    successThreshold: number;
    /** Enable exponential backoff */
    useExponentialBackoff: boolean;
    /** Maximum backoff time */
    maxBackoffMs: number;
}
/**
 * Circuit breaker state
 */
export type CircuitBreakerState = 'closed' | 'open' | 'half-open';
/**
 * Circuit breaker metrics
 */
export interface CircuitBreakerMetrics {
    /** Current state */
    state: CircuitBreakerState;
    /** Failure count in current window */
    failureCount: number;
    /** Success count in current window */
    successCount: number;
    /** Total requests */
    totalRequests: number;
    /** Last failure time */
    lastFailureTime?: number;
    /** Next retry time */
    nextRetryTime?: number;
    /** Current backoff delay */
    currentBackoffMs: number;
    /** State change history */
    stateHistory: Array<{
        state: CircuitBreakerState;
        timestamp: number;
        reason: string;
    }>;
}
/**
 * Client fingerprinting configuration
 */
export interface ClientFingerprintConfig {
    /** Enable browser fingerprinting */
    enableBrowserFingerprinting: boolean;
    /** Enable behavior tracking */
    enableBehaviorTracking: boolean;
    /** Fingerprint cache TTL */
    fingerprintTTL: number;
    /** Abuse detection threshold */
    abuseThreshold: number;
    /** Suspicious activity scoring factors */
    scoringFactors: {
        queryFrequency: number;
        patternVariation: number;
        sessionDuration: number;
        errorRate: number;
    };
    /** Privacy mode settings */
    privacyMode: 'strict' | 'balanced' | 'minimal';
}
/**
 * Client fingerprint data
 */
export interface ClientFingerprint {
    /** Unique client identifier */
    clientId: string;
    /** Browser characteristics */
    browserFingerprint: {
        userAgent: string;
        screenResolution: string;
        timezone: string;
        language: string;
        platform: string;
        cookieEnabled: boolean;
        doNotTrack: boolean;
        canvasFingerprint?: string;
        webglFingerprint?: string;
    };
    /** Behavioral characteristics */
    behaviorFingerprint: {
        avgQueryLength: number;
        queryFrequency: number;
        typingSpeed: number;
        sessionDuration: number;
        errorRate: number;
        commonPatterns: string[];
    };
    /** Creation and update times */
    createdAt: number;
    updatedAt: number;
    /** Abuse scoring */
    suspiciousScore: number;
    /** Throttle level */
    throttleLevel: 'none' | 'light' | 'moderate' | 'heavy' | 'blocked';
}
/**
 * Graceful degradation configuration
 */
export interface GracefulDegradationConfig {
    /** Enable fallback mechanisms */
    enableFallback: boolean;
    /** Cache size for fallback results */
    fallbackCacheSize: number;
    /** Cache TTL for fallback results */
    fallbackCacheTTL: number;
    /** Reduced functionality features */
    reducedFeatures: {
        disableAutoComplete: boolean;
        disableRealTimeSearch: boolean;
        limitResultCount: number;
        disableMetadata: boolean;
    };
    /** User notification settings */
    notifications: {
        showRateLimitWarning: boolean;
        showDegradationNotice: boolean;
        estimateRecoveryTime: boolean;
    };
}
/**
 * Degradation state
 */
export interface DegradationState {
    /** Whether system is in degraded mode */
    isDegraded: boolean;
    /** Degradation level */
    degradationLevel: 'none' | 'light' | 'moderate' | 'severe';
    /** Degradation reason */
    reason: 'rate_limit' | 'circuit_open' | 'service_unavailable' | 'abuse_detected';
    /** Degradation start time */
    startTime: number;
    /** Estimated recovery time */
    estimatedRecoveryTime?: number;
    /** Available features */
    availableFeatures: string[];
    /** Disabled features */
    disabledFeatures: string[];
}
/**
 * Rate limiting event types
 */
export type RateLimitEventType = 'rate_limit_exceeded' | 'rate_limit_warning' | 'rate_limit_reset' | 'circuit_opened' | 'circuit_closed' | 'circuit_half_opened' | 'request_deduplicated' | 'client_throttled' | 'abuse_detected' | 'degradation_activated' | 'degradation_recovered';
/**
 * Rate limiting event
 */
export interface RateLimitEvent {
    /** Event type */
    type: RateLimitEventType;
    /** Event timestamp */
    timestamp: number;
    /** Client identifier */
    clientId: string;
    /** Event data */
    data: {
        /** Applied rate limit */
        rateLimit?: RateLimitResult;
        /** Circuit breaker state */
        circuitState?: CircuitBreakerState;
        /** Deduplication info */
        deduplicationInfo?: {
            originalHash: string;
            waitingClients: number;
        };
        /** Client fingerprint */
        clientFingerprint?: Partial<ClientFingerprint>;
        /** Degradation state */
        degradationState?: DegradationState;
        /** Additional metadata */
        metadata?: Record<string, any>;
    };
}
/**
 * Rate limiting metrics
 */
export interface RateLimitingMetrics {
    /** Total requests processed */
    totalRequests: number;
    /** Requests blocked by rate limiting */
    blockedRequests: number;
    /** Requests deduplicated */
    deduplicatedRequests: number;
    /** Circuit breaker trips */
    circuitBreakerTrips: number;
    /** Average request processing time */
    avgProcessingTime: number;
    /** Current active clients */
    activeClients: number;
    /** Abuse incidents detected */
    abuseIncidents: number;
    /** Degradation activations */
    degradationActivations: number;
    /** Performance metrics */
    performance: {
        rateLimitCheckTime: number;
        deduplicationTime: number;
        fingerprintingTime: number;
        memoryUsage: number;
    };
}
/**
 * Rate limiter interface
 */
export interface IRateLimiter {
    /** Check if request is allowed */
    checkLimit(clientId: string, query: string, dataSource?: string): Promise<RateLimitResult>;
    /** Record request execution */
    recordRequest(clientId: string, query: string, success: boolean): void;
    /** Get remaining quota for client */
    getRemainingQuota(clientId: string): RateLimitResult;
    /** Reset rate limit for client */
    resetClient(clientId: string): void;
    /** Get rate limiting metrics */
    getMetrics(): RateLimitingMetrics;
    /** Update configuration */
    updateConfig(config: Partial<RateLimitConfig>): void;
}
/**
 * Adaptive debouncer interface
 */
export interface IAdaptiveDebouncer {
    /** Debounce a function call */
    debounce<T extends (...args: any[]) => any>(fn: T, query: string, context?: Record<string, any>): (...args: Parameters<T>) => Promise<ReturnType<T>>;
    /** Check if query should bypass debounce */
    shouldBypass(query: string): boolean;
    /** Update debounce configuration */
    updateConfig(config: Partial<AdaptiveDebounceConfig>): void;
    /** Get current debounce state */
    getState(): DebounceState;
}
/**
 * Request deduplicator interface
 */
export interface IRequestDeduplicator {
    /** Check if request should be deduplicated */
    shouldDeduplicate(query: string, params: Record<string, any>): boolean;
    /** Get or create deduplicated request */
    getOrCreateRequest<T>(query: string, params: Record<string, any>, requestFn: () => Promise<T>): Promise<T>;
    /** Clear completed requests */
    cleanup(): void;
    /** Get deduplication metrics */
    getMetrics(): {
        totalRequests: number;
        deduplicatedRequests: number;
        savedRequests: number;
        cacheSize: number;
    };
}
/**
 * Circuit breaker interface
 */
export interface ICircuitBreaker {
    /** Execute request with circuit breaker protection */
    execute<T>(requestFn: () => Promise<T>): Promise<T>;
    /** Get current circuit breaker state */
    getState(): CircuitBreakerState;
    /** Get circuit breaker metrics */
    getMetrics(): CircuitBreakerMetrics;
    /** Force circuit state (for testing) */
    forceState(state: CircuitBreakerState): void;
    /** Reset circuit breaker */
    reset(): void;
}
/**
 * Client fingerprinter interface
 */
export interface IClientFingerprinter {
    /** Generate client fingerprint */
    generateFingerprint(): Promise<ClientFingerprint>;
    /** Update behavior data */
    updateBehavior(clientId: string, behaviorData: Partial<ClientFingerprint['behaviorFingerprint']>): void;
    /** Check if client should be throttled */
    shouldThrottle(clientId: string): {
        shouldThrottle: boolean;
        throttleLevel: ClientFingerprint['throttleLevel'];
        reason: string;
    };
    /** Get client fingerprint */
    getFingerprint(clientId: string): ClientFingerprint | null;
    /** Clean up expired fingerprints */
    cleanup(): void;
}
/**
 * Graceful degradation interface
 */
export interface IGracefulDegradation {
    /** Check if system should degrade */
    shouldDegrade(metrics: RateLimitingMetrics): boolean;
    /** Activate degradation */
    activateDegradation(reason: DegradationState['reason'], level: DegradationState['degradationLevel']): void;
    /** Deactivate degradation */
    deactivateDegradation(): void;
    /** Get current degradation state */
    getState(): DegradationState;
    /** Get fallback result from cache */
    getFallbackResult(query: string): any | null;
    /** Store result for fallback */
    storeFallbackResult(query: string, result: any): void;
}
/**
 * Combined rate limiting system interface
 */
export interface IRateLimitingSystem {
    rateLimiter: IRateLimiter;
    debouncer: IAdaptiveDebouncer;
    deduplicator: IRequestDeduplicator;
    circuitBreaker: ICircuitBreaker;
    fingerprinter: IClientFingerprinter;
    degradation: IGracefulDegradation;
    /** Process query with all rate limiting checks */
    processQuery<T>(query: string, clientId: string, requestFn: () => Promise<T>, context?: Record<string, any>): Promise<T>;
    /** Get system-wide metrics */
    getSystemMetrics(): RateLimitingMetrics;
    /** Handle rate limiting events */
    onEvent(callback: (event: RateLimitEvent) => void): void;
}
//# sourceMappingURL=RateLimiting.d.ts.map