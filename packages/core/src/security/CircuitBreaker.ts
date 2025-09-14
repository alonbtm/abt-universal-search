/**
 * Circuit Breaker - Temporarily disable requests after repeated failures
 * @description Implements circuit breaker pattern with failure threshold and exponential backoff
 */

import type { 
  CircuitBreakerConfig, 
  CircuitBreakerState, 
  CircuitBreakerMetrics, 
  ICircuitBreaker 
} from '../types/RateLimiting';

/**
 * Circuit breaker error for when circuit is open
 */
export class CircuitOpenError extends Error {
  constructor(
    public readonly nextRetryTime: number,
    public readonly failureCount: number
  ) {
    super(`Circuit breaker is open. Next retry at ${new Date(nextRetryTime).toISOString()}`);
    this.name = 'CircuitOpenError';
  }
}

/**
 * Circuit breaker with failure threshold monitoring and exponential backoff
 */
export class CircuitBreaker implements ICircuitBreaker {
  private config: Required<CircuitBreakerConfig>;
  private state: CircuitBreakerState = 'closed';
  private failureCount = 0;
  private successCount = 0;
  private totalRequests = 0;
  private lastFailureTime?: number;
  private nextRetryTime?: number;
  private currentBackoffMs = 0;
  private halfOpenRequests = 0;
  private stateHistory: CircuitBreakerMetrics['stateHistory'] = [];

  constructor(config: CircuitBreakerConfig) {
    this.config = {
      failureThreshold: config.failureThreshold,
      recoveryTimeoutMs: config.recoveryTimeoutMs,
      requestTimeoutMs: config.requestTimeoutMs,
      halfOpenMaxRequests: config.halfOpenMaxRequests,
      successThreshold: config.successThreshold,
      useExponentialBackoff: config.useExponentialBackoff,
      maxBackoffMs: config.maxBackoffMs
    };

    this.recordStateChange('closed', 'Circuit breaker initialized');
  }

  /**
   * Execute request with circuit breaker protection
   */
  public async execute<T>(requestFn: () => Promise<T>): Promise<T> {
    this.totalRequests++;

    // Check circuit state before executing
    this.updateState();

    if (this.state === 'open') {
      throw new CircuitOpenError(this.nextRetryTime!, this.failureCount);
    }

    if (this.state === 'half-open' && this.halfOpenRequests >= this.config.halfOpenMaxRequests) {
      throw new CircuitOpenError(this.nextRetryTime!, this.failureCount);
    }

    // Execute request with timeout
    try {
      const result = await this.executeWithTimeout(requestFn);
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Get current circuit breaker state
   */
  public getState(): CircuitBreakerState {
    this.updateState();
    return this.state;
  }

  /**
   * Get circuit breaker metrics
   */
  public getMetrics(): CircuitBreakerMetrics {
    this.updateState();
    
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      totalRequests: this.totalRequests,
      lastFailureTime: this.lastFailureTime,
      nextRetryTime: this.nextRetryTime,
      currentBackoffMs: this.currentBackoffMs,
      stateHistory: [...this.stateHistory]
    };
  }

  /**
   * Force circuit state (for testing)
   */
  public forceState(state: CircuitBreakerState): void {
    const oldState = this.state;
    this.state = state;
    
    if (state === 'open') {
      this.calculateNextRetryTime();
    } else if (state === 'half-open') {
      this.halfOpenRequests = 0;
    } else if (state === 'closed') {
      this.reset();
    }

    this.recordStateChange(state, `Forced state change from ${oldState}`);
  }

  /**
   * Reset circuit breaker
   */
  public reset(): void {
    this.state = 'closed';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = undefined;
    this.nextRetryTime = undefined;
    this.currentBackoffMs = 0;
    this.halfOpenRequests = 0;
    
    this.recordStateChange('closed', 'Circuit breaker reset');
  }

  /**
   * Execute request with timeout
   */
  private async executeWithTimeout<T>(requestFn: () => Promise<T>): Promise<T> {
    if (this.state === 'half-open') {
      this.halfOpenRequests++;
    }

    return new Promise<T>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Request timeout after ${this.config.requestTimeoutMs}ms`));
      }, this.config.requestTimeoutMs);

      requestFn()
        .then(result => {
          clearTimeout(timeout);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeout);
          reject(error);
        });
    });
  }

  /**
   * Handle successful request
   */
  private onSuccess(): void {
    this.successCount++;

    if (this.state === 'half-open') {
      if (this.successCount >= this.config.successThreshold) {
        this.transitionToClosed();
      }
    } else if (this.state === 'closed') {
      // Reset failure count on success in closed state
      if (this.failureCount > 0) {
        this.failureCount = Math.max(0, this.failureCount - 1);
      }
    }
  }

  /**
   * Handle failed request
   */
  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === 'closed') {
      if (this.failureCount >= this.config.failureThreshold) {
        this.transitionToOpen();
      }
    } else if (this.state === 'half-open') {
      this.transitionToOpen();
    }
  }

  /**
   * Update circuit state based on time and conditions
   */
  private updateState(): void {
    if (this.state === 'open' && this.shouldTransitionToHalfOpen()) {
      this.transitionToHalfOpen();
    }
  }

  /**
   * Check if circuit should transition from open to half-open
   */
  private shouldTransitionToHalfOpen(): boolean {
    if (!this.nextRetryTime) {
      return false;
    }
    return Date.now() >= this.nextRetryTime;
  }

  /**
   * Transition to closed state
   */
  private transitionToClosed(): void {
    this.state = 'closed';
    this.failureCount = 0;
    this.successCount = 0;
    this.nextRetryTime = undefined;
    this.currentBackoffMs = 0;
    this.halfOpenRequests = 0;
    
    this.recordStateChange('closed', 'Circuit recovered - sufficient successes');
  }

  /**
   * Transition to open state
   */
  private transitionToOpen(): void {
    this.state = 'open';
    this.successCount = 0;
    this.halfOpenRequests = 0;
    this.calculateNextRetryTime();
    
    this.recordStateChange('open', `Circuit opened - ${this.failureCount} failures`);
  }

  /**
   * Transition to half-open state
   */
  private transitionToHalfOpen(): void {
    this.state = 'half-open';
    this.successCount = 0;
    this.halfOpenRequests = 0;
    
    this.recordStateChange('half-open', 'Circuit testing recovery');
  }

  /**
   * Calculate next retry time with optional exponential backoff
   */
  private calculateNextRetryTime(): void {
    let backoffMs = this.config.recoveryTimeoutMs;

    if (this.config.useExponentialBackoff) {
      // Exponential backoff: base * 2^(failures - threshold)
      const exponent = Math.max(0, this.failureCount - this.config.failureThreshold);
      backoffMs = this.config.recoveryTimeoutMs * Math.pow(2, exponent);
      backoffMs = Math.min(backoffMs, this.config.maxBackoffMs);
    }

    this.currentBackoffMs = backoffMs;
    this.nextRetryTime = Date.now() + backoffMs;
  }

  /**
   * Record state change in history
   */
  private recordStateChange(state: CircuitBreakerState, reason: string): void {
    this.stateHistory.push({
      state,
      timestamp: Date.now(),
      reason
    });

    // Keep only last 50 state changes
    if (this.stateHistory.length > 50) {
      this.stateHistory.shift();
    }
  }

  /**
   * Get failure rate over recent requests
   */
  public getFailureRate(windowSize = 100): number {
    if (this.totalRequests === 0) {
      return 0;
    }

    const recentRequests = Math.min(this.totalRequests, windowSize);
    const recentFailures = Math.min(this.failureCount, recentRequests);
    
    return recentFailures / recentRequests;
  }

  /**
   * Get time until next retry (if circuit is open)
   */
  public getTimeUntilRetry(): number {
    if (this.state !== 'open' || !this.nextRetryTime) {
      return 0;
    }
    return Math.max(0, this.nextRetryTime - Date.now());
  }

  /**
   * Check if circuit is healthy
   */
  public isHealthy(): boolean {
    return this.state === 'closed' && this.failureCount < this.config.failureThreshold / 2;
  }

  /**
   * Get configuration
   */
  public getConfig(): CircuitBreakerConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<CircuitBreakerConfig>): void {
    Object.assign(this.config, config);
  }
}

/**
 * Multi-service circuit breaker manager
 */
export class MultiServiceCircuitBreaker {
  private breakers = new Map<string, CircuitBreaker>();
  private defaultConfig: CircuitBreakerConfig;

  constructor(defaultConfig: CircuitBreakerConfig) {
    this.defaultConfig = defaultConfig;
  }

  /**
   * Get or create circuit breaker for service
   */
  public getBreaker(serviceId: string, config?: Partial<CircuitBreakerConfig>): CircuitBreaker {
    if (!this.breakers.has(serviceId)) {
      const breakerConfig = { ...this.defaultConfig, ...config };
      this.breakers.set(serviceId, new CircuitBreaker(breakerConfig));
    }
    return this.breakers.get(serviceId)!;
  }

  /**
   * Execute request with service-specific circuit breaker
   */
  public async execute<T>(
    serviceId: string,
    requestFn: () => Promise<T>,
    config?: Partial<CircuitBreakerConfig>
  ): Promise<T> {
    const breaker = this.getBreaker(serviceId, config);
    return breaker.execute(requestFn);
  }

  /**
   * Get all service states
   */
  public getAllStates(): Record<string, CircuitBreakerState> {
    const states: Record<string, CircuitBreakerState> = {};
    for (const [serviceId, breaker] of this.breakers.entries()) {
      states[serviceId] = breaker.getState();
    }
    return states;
  }

  /**
   * Get all service metrics
   */
  public getAllMetrics(): Record<string, CircuitBreakerMetrics> {
    const metrics: Record<string, CircuitBreakerMetrics> = {};
    for (const [serviceId, breaker] of this.breakers.entries()) {
      metrics[serviceId] = breaker.getMetrics();
    }
    return metrics;
  }

  /**
   * Reset all circuit breakers
   */
  public resetAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
  }

  /**
   * Remove circuit breaker for service
   */
  public removeBreaker(serviceId: string): void {
    this.breakers.delete(serviceId);
  }

  /**
   * Get healthy services
   */
  public getHealthyServices(): string[] {
    const healthy: string[] = [];
    for (const [serviceId, breaker] of this.breakers.entries()) {
      if (breaker.isHealthy()) {
        healthy.push(serviceId);
      }
    }
    return healthy;
  }

  /**
   * Get unhealthy services
   */
  public getUnhealthyServices(): string[] {
    const unhealthy: string[] = [];
    for (const [serviceId, breaker] of this.breakers.entries()) {
      if (!breaker.isHealthy()) {
        unhealthy.push(serviceId);
      }
    }
    return unhealthy;
  }
}

/**
 * Default circuit breaker configuration
 */
export const defaultCircuitBreakerConfig: CircuitBreakerConfig = {
  failureThreshold: 5,
  recoveryTimeoutMs: 60000, // 1 minute
  requestTimeoutMs: 30000, // 30 seconds
  halfOpenMaxRequests: 3,
  successThreshold: 2,
  useExponentialBackoff: true,
  maxBackoffMs: 300000 // 5 minutes
};

/**
 * Create circuit breaker with default configuration
 */
export function createCircuitBreaker(
  config?: Partial<CircuitBreakerConfig>
): CircuitBreaker {
  return new CircuitBreaker({
    ...defaultCircuitBreakerConfig,
    ...config
  });
}

/**
 * Create multi-service circuit breaker manager
 */
export function createMultiServiceCircuitBreaker(
  config?: Partial<CircuitBreakerConfig>
): MultiServiceCircuitBreaker {
  return new MultiServiceCircuitBreaker({
    ...defaultCircuitBreakerConfig,
    ...config
  });
}
