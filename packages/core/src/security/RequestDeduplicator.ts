/**
 * Request Deduplicator - Prevent duplicate concurrent requests for identical queries
 * @description Implements request deduplication with query hash-based duplicate detection
 */

import type { 
  DeduplicationConfig, 
  RequestFingerprint, 
  DeduplicatedRequest, 
  IRequestDeduplicator 
} from '../types/RateLimiting';

/**
 * Hash algorithm implementations
 */
class HashAlgorithms {
  /**
   * Simple hash algorithm (fast but basic)
   */
  static simple(input: string): string {
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
  static djb2(input: string): string {
    let hash = 5381;
    for (let i = 0; i < input.length; i++) {
      hash = ((hash << 5) + hash) + input.charCodeAt(i);
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * FNV-1a hash algorithm (good distribution, slightly slower)
   */
  static fnv1a(input: string): string {
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
export class RequestDeduplicator implements IRequestDeduplicator {
  private config: Required<DeduplicationConfig>;
  private activeRequests = new Map<string, DeduplicatedRequest>();
  private requestCache = new Map<string, { result: any; timestamp: number }>();
  private hashFunction: (input: string) => string;
  private metrics = {
    totalRequests: 0,
    deduplicatedRequests: 0,
    savedRequests: 0,
    cacheHits: 0
  };

  constructor(config: DeduplicationConfig) {
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
  public shouldDeduplicate(query: string, params: Record<string, any>): boolean {
    if (!this.config.enabled) {
      return false;
    }

    const fingerprint = this.generateFingerprint(query, params);
    return this.activeRequests.has(fingerprint.hash);
  }

  /**
   * Get or create deduplicated request
   */
  public async getOrCreateRequest<T>(
    query: string,
    params: Record<string, any>,
    requestFn: () => Promise<T>
  ): Promise<T> {
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
    
    const deduplicatedRequest: DeduplicatedRequest = {
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
  public cleanup(): void {
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
  public getMetrics(): {
    totalRequests: number;
    deduplicatedRequests: number;
    savedRequests: number;
    cacheSize: number;
  } {
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
  public updateConfig(config: Partial<DeduplicationConfig>): void {
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
  public clear(): void {
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
  private generateFingerprint(query: string, params: Record<string, any>): RequestFingerprint {
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
  private sortAndStringifyParams(params: Record<string, any>): string {
    const sortedKeys = Object.keys(params).sort();
    const sortedParams: Record<string, any> = {};
    
    for (const key of sortedKeys) {
      sortedParams[key] = params[key];
    }
    
    return JSON.stringify(sortedParams);
  }

  /**
   * Create dedicated request with result caching
   */
  private async createDedicatedRequest<T>(
    fingerprint: RequestFingerprint,
    requestFn: () => Promise<T>
  ): Promise<T> {
    try {
      const result = await requestFn();
      
      // Cache result if sharing is enabled
      if (this.config.enableResultSharing) {
        this.cacheResult(fingerprint.hash, result);
      }
      
      // Update fingerprint status
      fingerprint.status = 'completed';
      
      return result;
    } catch (error) {
      fingerprint.status = 'failed';
      throw error;
    } finally {
      // Clean up active request
      this.activeRequests.delete(fingerprint.hash);
    }
  }

  /**
   * Cache request result
   */
  private cacheResult(hash: string, result: any): void {
    this.requestCache.set(hash, {
      result,
      timestamp: Date.now()
    });
  }

  /**
   * Get cached result if available and not expired
   */
  private getCachedResult(hash: string): any | null {
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
  private generateClientId(): string {
    return `client-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Start cleanup interval
   */
  private startCleanupInterval(): void {
    setInterval(() => {
      this.cleanup();
    }, Math.max(this.config.requestTTL / 4, 5000)); // Clean up every quarter TTL or 5 seconds
  }

  /**
   * Get active request information for debugging
   */
  public getActiveRequests(): Array<{
    hash: string;
    query: string;
    waitingClients: number;
    age: number;
    dataSource: string;
  }> {
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
  public getCacheInfo(): Array<{
    hash: string;
    age: number;
    size: number;
  }> {
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
  public async processBatch<T>(
    requests: Array<{
      query: string;
      params: Record<string, any>;
      requestFn: () => Promise<T>;
    }>
  ): Promise<T[]> {
    const promises = requests.map(({ query, params, requestFn }) =>
      this.getOrCreateRequest(query, params, requestFn)
    );

    return Promise.all(promises);
  }
}

/**
 * Default deduplication configuration
 */
export const defaultDeduplicationConfig: DeduplicationConfig = {
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
export function createRequestDeduplicator(
  config?: Partial<DeduplicationConfig>
): RequestDeduplicator {
  return new RequestDeduplicator({
    ...defaultDeduplicationConfig,
    ...config
  });
}
