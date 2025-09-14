/**
 * Enhanced Rate Limiter - Client-side rate limiting with sliding window algorithm
 * @description Implements rate limiting to respect API quotas and prevent abuse
 */

import type { RateLimitConfig } from '../types/Config';
import type { RateLimitStatus } from '../types/Results';
import type { 
  RateLimitConfig as NewRateLimitConfig, 
  RateLimitResult, 
  ClientRateState,
  IRateLimiter 
} from '../types/RateLimiting';

/**
 * Token bucket for rate limiting
 */
interface TokenBucket {
  /** Current number of tokens */
  tokens: number;
  /** Maximum number of tokens */
  capacity: number;
  /** Token refill rate per second */
  refillRate: number;
  /** Last refill timestamp */
  lastRefill: number;
  /** Last request timestamp */
  lastRequest: number;
}

/**
 * Queued request information
 */
interface QueuedRequest {
  /** Request identifier */
  id: string;
  /** Timestamp when request was queued */
  queuedAt: number;
  /** Promise resolver */
  resolve: () => void;
  /** Promise rejecter */
  reject: (error: Error) => void;
  /** Request priority */
  priority: number;
}

/**
 * Sliding window for rate limiting
 */
interface SlidingWindow {
  /** Requests within the window */
  requests: { timestamp: number; query: string; context: Record<string, any> }[];
  /** Window start timestamp */
  windowStart: number;
  /** Last cleanup timestamp */
  lastCleanup: number;
}

/**
 * Backoff state for rate limiting
 */
interface BackoffState {
  /** Next allowed request timestamp */
  nextAllowedTime: number;
}

/**
 * Enhanced Rate limiter implementing IRateLimiter interface
 */
export class RateLimiter implements IRateLimiter {
  private slidingWindows = new Map<string, SlidingWindow>();
  private clientStates = new Map<string, ClientRateState>();
  private config: NewRateLimitConfig;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(config: Partial<NewRateLimitConfig> = {}) {
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
   * Get or create sliding window for identifier
   */
  private getOrCreateSlidingWindow(identifier: string): SlidingWindow {
    let window = this.slidingWindows.get(identifier);
    
    if (!window) {
      window = {
        requests: [],
        windowStart: Date.now() - this.newConfig.windowSizeMs,
        lastCleanup: Date.now()
      };
      this.slidingWindows.set(identifier, window);
    }
    
    return window;
  }

  /**
   * Get or create client state for identifier
   */
  private getOrCreateClientState(identifier: string): ClientRateState {
    let state = this.clientStates.get(identifier);
    
    if (!state) {
      state = {
        clientId: identifier,
        totalRequests: 0,
        blockedRequests: 0,
        lastRequestTime: 0,
        requestHistory: [],
        createdAt: Date.now()
      };
      this.clientStates.set(identifier, state);
    }
    
    return state;
  }

  /**
   * Get or create token bucket for identifier
   */
  private getOrCreateBucket(identifier: string): TokenBucket {
    let bucket = this.buckets.get(identifier);
    
    if (!bucket) {
      bucket = {
        tokens: this.config.burstLimit,
        capacity: this.config.burstLimit,
        refillRate: this.config.requestsPerSecond,
        lastRefill: Date.now(),
        lastRequest: 0
      };
      this.buckets.set(identifier, bucket);
    }
    
    return bucket;
  }

  /**
   * Check if request can be made immediately
   */
  public canMakeRequest(): boolean {
    this.refillBucket();
    return this.bucket.tokens > 0;
  }

  /**
   * Wait for permission to make a request
   */
  public async waitForPermission(priority = 0): Promise<void> {
    if (this.canMakeRequest()) {
      this.consumeToken();
      return;
    }

    // Check if we should apply backoff due to recent violations
    const backoffDelay = this.calculateBackoffDelay();
    if (backoffDelay > 0) {
      await this.delay(backoffDelay);
      
      // Try again after backoff
      if (this.canMakeRequest()) {
        this.consumeToken();
        return;
      }
    }

    // Add to queue if not at capacity
    if (this.requestQueue.length >= this.config.queueSize) {
      throw new Error('Rate limit queue is full');
    }

    return this.queueRequest(priority);
  }

  /**
   * Get current rate limit status
   */
  public getStatus(): RateLimitStatus {
    this.refillBucket();
    
    const queueWaitMs = this.estimateQueueWait();
    
    return {
      remaining: Math.floor(this.bucket.tokens),
      limit: this.bucket.capacity,
      reset: this.calculateResetTime(),
      windowStart: this.bucket.lastRefill,
      shouldQueue: !this.canMakeRequest(),
      queueWaitMs: queueWaitMs > 0 ? queueWaitMs : undefined
    };
  }

  /**
   * Report rate limit violation from API response
   */
  public reportViolation(resetTime?: number): void {
    this.lastViolation = Date.now();
    
    // Reduce available tokens
    this.bucket.tokens = Math.max(0, this.bucket.tokens - 1);
    
    // Increase backoff multiplier
    this.backoffMultiplier = Math.min(this.backoffMultiplier * 2, 10);
    
    // Update reset time if provided by API
    if (resetTime) {
      const resetMs = resetTime > 1000000000 ? resetTime : resetTime * 1000;
      this.bucket.lastRefill = Math.min(this.bucket.lastRefill, resetMs - 60000);
    }
  }

  /**
   * Update rate limits from API response headers
   */
  public updateFromHeaders(headers: Record<string, string>): void {
    const limit = this.extractHeaderValue(headers, ['x-ratelimit-limit', 'x-rate-limit-limit']);
    const remaining = this.extractHeaderValue(headers, ['x-ratelimit-remaining', 'x-rate-limit-remaining']);
    const reset = this.extractHeaderValue(headers, ['x-ratelimit-reset', 'x-rate-limit-reset']);

    if (limit !== null) {
      this.bucket.capacity = limit;
      this.config.requestsPerSecond = limit;
    }

    if (remaining !== null) {
      this.bucket.tokens = Math.min(remaining, this.bucket.tokens);
    }

    if (reset !== null) {
      const resetMs = reset > 1000000000 ? reset : reset * 1000;
      this.bucket.lastRefill = Math.max(this.bucket.lastRefill, resetMs - 60000);
    }
  }

  /**
   * Clear the request queue
   */
  public clearQueue(): void {
    for (const request of this.requestQueue) {
      request.reject(new Error('Request queue cleared'));
    }
    this.requestQueue = [];
  }

  /**
   * Get queue length
   */
  public getQueueLength(): number {
    return this.requestQueue.length;
  }

  /**
   * Reset rate limiter state
   */
  public reset(): void {
    this.bucket.tokens = this.config.burstLimit;
    this.bucket.lastRefill = Date.now();
    this.backoffMultiplier = 1;
    this.lastViolation = 0;
    this.clearQueue();
  }

  /**
   * Refill the token bucket based on elapsed time
   */
  private refillBucket(): void {
    const now = Date.now();
    const elapsed = (now - this.bucket.lastRefill) / 1000;
    
    if (elapsed > 0) {
      const tokensToAdd = elapsed * this.bucket.refillRate;
      this.bucket.tokens = Math.min(
        this.bucket.capacity,
        this.bucket.tokens + tokensToAdd
      );
      this.bucket.lastRefill = now;
    }
  }

  /**
   * Consume a token from the bucket
   */
  private consumeToken(): void {
    if (this.bucket.tokens > 0) {
      this.bucket.tokens -= 1;
    }
  }

  /**
   * Queue a request for later processing
   */
  private queueRequest(priority: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const request: QueuedRequest = {
        id: this.generateRequestId(),
        queuedAt: Date.now(),
        resolve,
        reject,
        priority
      };

      // Insert in priority order (higher priority first)
      const insertIndex = this.requestQueue.findIndex(r => r.priority < priority);
      if (insertIndex === -1) {
        this.requestQueue.push(request);
      } else {
        this.requestQueue.splice(insertIndex, 0, request);
      }

      this.processQueue();
    });
  }

  /**
   * Process the request queue
   */
  private async processQueue(): Promise<void> {
    if (this.processingQueue || this.requestQueue.length === 0) {
      return;
    }

    this.processingQueue = true;

    while (this.requestQueue.length > 0) {
      this.refillBucket();

      if (this.bucket.tokens > 0) {
        const request = this.requestQueue.shift()!;
        this.consumeToken();
        request.resolve();
      } else {
        // Wait for next refill opportunity
        const waitTime = Math.max(100, 1000 / this.bucket.refillRate);
        await this.delay(waitTime);
      }
    }

    this.processingQueue = false;
  }

  /**
   * Calculate backoff delay after rate limit violations
   */
  private calculateBackoffDelay(): number {
    if (this.lastViolation === 0) {
      return 0;
    }

    const timeSinceViolation = Date.now() - this.lastViolation;
    const baseDelay = this.config.initialBackoffMs * this.backoffMultiplier;

    if (timeSinceViolation > 60000) {
      // Reset backoff after 1 minute
      this.backoffMultiplier = 1;
      return 0;
    }

    let delay = 0;
    switch (this.config.backoffStrategy) {
      case 'exponential':
        delay = Math.min(baseDelay, this.config.maxBackoffMs);
        break;
      case 'linear':
        delay = Math.min(
          this.config.initialBackoffMs * this.backoffMultiplier,
          this.config.maxBackoffMs
        );
        break;
      case 'fixed':
        delay = this.config.initialBackoffMs;
        break;
    }

    return Math.max(0, delay - timeSinceViolation);
  }

  /**
   * Estimate queue wait time
   */
  private estimateQueueWait(): number {
    if (this.requestQueue.length === 0) {
      return 0;
    }

    const tokensNeeded = this.requestQueue.length;
    const timeToGenerate = (tokensNeeded / this.bucket.refillRate) * 1000;
    
    return Math.max(0, timeToGenerate);
  }

  /**
   * Calculate next token bucket reset time
   */
  private calculateResetTime(): number {
    const secondsUntilFull = (this.bucket.capacity - this.bucket.tokens) / this.bucket.refillRate;
    return Date.now() + (secondsUntilFull * 1000);
  }

  /**
   * Extract numeric value from headers
   */
  private extractHeaderValue(headers: Record<string, string>, headerNames: string[]): number | null {
    for (const name of headerNames) {
      const value = headers[name.toLowerCase()];
      if (value) {
        const parsed = parseInt(value, 10);
        return isNaN(parsed) ? null : parsed;
      }
    }
    return null;
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Rate limiter factory
 */
export class RateLimiterFactory {
  private limiters = new Map<string, RateLimiter>();

  /**
   * Get or create rate limiter for endpoint
   */
  public getLimiter(endpoint: string, config: RateLimitConfig): RateLimiter {
    if (!this.limiters.has(endpoint)) {
      this.limiters.set(endpoint, new RateLimiter(config));
    }
    return this.limiters.get(endpoint)!;
  }

  /**
   * Remove rate limiter for endpoint
   */
  public removeLimiter(endpoint: string): void {
    const limiter = this.limiters.get(endpoint);
    if (limiter) {
      limiter.clearQueue();
      this.limiters.delete(endpoint);
    }
  }

  /**
   * Clear all rate limiters
   */
  public clearAll(): void {
    for (const limiter of this.limiters.values()) {
      limiter.clearQueue();
    }
    this.limiters.clear();
  }

  /**
   * Get all active endpoints
   */
  public getActiveEndpoints(): string[] {
    return Array.from(this.limiters.keys());
  }
}

/**
 * Global rate limiter factory instance
 */
export const rateLimiterFactory = new RateLimiterFactory();