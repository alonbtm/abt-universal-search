/**
 * Circuit Breaker - Temporarily disable requests after repeated failures
 * @description Implements circuit breaker pattern with failure threshold and exponential backoff
 */
import type { CircuitBreakerConfig, CircuitBreakerState, CircuitBreakerMetrics, ICircuitBreaker } from '../types/RateLimiting';
/**
 * Circuit breaker error for when circuit is open
 */
export declare class CircuitOpenError extends Error {
    readonly nextRetryTime: number;
    readonly failureCount: number;
    constructor(nextRetryTime: number, failureCount: number);
}
/**
 * Circuit breaker with failure threshold monitoring and exponential backoff
 */
export declare class CircuitBreaker implements ICircuitBreaker {
    private config;
    private state;
    private failureCount;
    private successCount;
    private totalRequests;
    private lastFailureTime?;
    private nextRetryTime?;
    private currentBackoffMs;
    private halfOpenRequests;
    private stateHistory;
    constructor(config: CircuitBreakerConfig);
    /**
     * Execute request with circuit breaker protection
     */
    execute<T>(requestFn: () => Promise<T>): Promise<T>;
    /**
     * Get current circuit breaker state
     */
    getState(): CircuitBreakerState;
    /**
     * Get circuit breaker metrics
     */
    getMetrics(): CircuitBreakerMetrics;
    /**
     * Force circuit state (for testing)
     */
    forceState(state: CircuitBreakerState): void;
    /**
     * Reset circuit breaker
     */
    reset(): void;
    /**
     * Execute request with timeout
     */
    private executeWithTimeout;
    /**
     * Handle successful request
     */
    private onSuccess;
    /**
     * Handle failed request
     */
    private onFailure;
    /**
     * Update circuit state based on time and conditions
     */
    private updateState;
    /**
     * Check if circuit should transition from open to half-open
     */
    private shouldTransitionToHalfOpen;
    /**
     * Transition to closed state
     */
    private transitionToClosed;
    /**
     * Transition to open state
     */
    private transitionToOpen;
    /**
     * Transition to half-open state
     */
    private transitionToHalfOpen;
    /**
     * Calculate next retry time with optional exponential backoff
     */
    private calculateNextRetryTime;
    /**
     * Record state change in history
     */
    private recordStateChange;
    /**
     * Get failure rate over recent requests
     */
    getFailureRate(windowSize?: number): number;
    /**
     * Get time until next retry (if circuit is open)
     */
    getTimeUntilRetry(): number;
    /**
     * Check if circuit is healthy
     */
    isHealthy(): boolean;
    /**
     * Get configuration
     */
    getConfig(): CircuitBreakerConfig;
    /**
     * Update configuration
     */
    updateConfig(config: Partial<CircuitBreakerConfig>): void;
}
/**
 * Multi-service circuit breaker manager
 */
export declare class MultiServiceCircuitBreaker {
    private breakers;
    private defaultConfig;
    constructor(defaultConfig: CircuitBreakerConfig);
    /**
     * Get or create circuit breaker for service
     */
    getBreaker(serviceId: string, config?: Partial<CircuitBreakerConfig>): CircuitBreaker;
    /**
     * Execute request with service-specific circuit breaker
     */
    execute<T>(serviceId: string, requestFn: () => Promise<T>, config?: Partial<CircuitBreakerConfig>): Promise<T>;
    /**
     * Get all service states
     */
    getAllStates(): Record<string, CircuitBreakerState>;
    /**
     * Get all service metrics
     */
    getAllMetrics(): Record<string, CircuitBreakerMetrics>;
    /**
     * Reset all circuit breakers
     */
    resetAll(): void;
    /**
     * Remove circuit breaker for service
     */
    removeBreaker(serviceId: string): void;
    /**
     * Get healthy services
     */
    getHealthyServices(): string[];
    /**
     * Get unhealthy services
     */
    getUnhealthyServices(): string[];
}
/**
 * Default circuit breaker configuration
 */
export declare const defaultCircuitBreakerConfig: CircuitBreakerConfig;
/**
 * Create circuit breaker with default configuration
 */
export declare function createCircuitBreaker(config?: Partial<CircuitBreakerConfig>): CircuitBreaker;
/**
 * Create multi-service circuit breaker manager
 */
export declare function createMultiServiceCircuitBreaker(config?: Partial<CircuitBreakerConfig>): MultiServiceCircuitBreaker;
//# sourceMappingURL=CircuitBreaker.d.ts.map