/**
 * Graceful Degradation - Maintain partial functionality when rate limits are exceeded
 * @description Implements fallback mechanisms and feature management for rate limit scenarios
 */

import type { 
  GracefulDegradationConfig, 
  DegradationState, 
  RateLimitingMetrics, 
  IGracefulDegradation 
} from '../types/RateLimiting';

/**
 * Feature manager for controlling available functionality
 */
class FeatureManager {
  private features = new Map<string, boolean>();
  private essentialFeatures = new Set<string>([
    'basic_search',
    'error_display',
    'user_input'
  ]);

  constructor() {
    // Initialize with all features enabled
    this.resetFeatures();
  }

  /**
   * Enable feature
   */
  enableFeature(feature: string): void {
    this.features.set(feature, true);
  }

  /**
   * Disable feature
   */
  disableFeature(feature: string): void {
    // Never disable essential features
    if (this.essentialFeatures.has(feature)) {
      return;
    }
    this.features.set(feature, false);
  }

  /**
   * Check if feature is enabled
   */
  isFeatureEnabled(feature: string): boolean {
    return this.features.get(feature) ?? false;
  }

  /**
   * Get all enabled features
   */
  getEnabledFeatures(): string[] {
    return Array.from(this.features.entries())
      .filter(([, enabled]) => enabled)
      .map(([feature]) => feature);
  }

  /**
   * Get all disabled features
   */
  getDisabledFeatures(): string[] {
    return Array.from(this.features.entries())
      .filter(([, enabled]) => !enabled)
      .map(([feature]) => feature);
  }

  /**
   * Apply degradation level
   */
  applyDegradationLevel(level: DegradationState['degradationLevel']): void {
    switch (level) {
      case 'light':
        this.disableFeature('auto_complete');
        this.disableFeature('suggestions');
        break;
      case 'moderate':
        this.disableFeature('auto_complete');
        this.disableFeature('suggestions');
        this.disableFeature('real_time_search');
        this.disableFeature('metadata_display');
        break;
      case 'severe':
        this.disableFeature('auto_complete');
        this.disableFeature('suggestions');
        this.disableFeature('real_time_search');
        this.disableFeature('metadata_display');
        this.disableFeature('result_preview');
        this.disableFeature('advanced_filters');
        break;
      case 'none':
      default:
        this.resetFeatures();
        break;
    }
  }

  /**
   * Reset all features to enabled
   */
  resetFeatures(): void {
    const allFeatures = [
      'basic_search',
      'auto_complete',
      'suggestions',
      'real_time_search',
      'metadata_display',
      'result_preview',
      'advanced_filters',
      'error_display',
      'user_input'
    ];

    for (const feature of allFeatures) {
      this.features.set(feature, true);
    }
  }
}

/**
 * Fallback cache for storing results during degradation
 */
class FallbackCache {
  private cache = new Map<string, { result: any; timestamp: number; hits: number }>();
  private maxSize: number;
  private ttl: number;

  constructor(maxSize: number, ttl: number) {
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  /**
   * Store result in fallback cache
   */
  store(key: string, result: any): void {
    // Clean expired entries first
    this.cleanup();

    // If cache is full, remove least recently used
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    this.cache.set(key, {
      result,
      timestamp: Date.now(),
      hits: 0
    });
  }

  /**
   * Retrieve result from fallback cache
   */
  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    // Update hit count
    entry.hits++;
    return entry.result;
  }

  /**
   * Check if key exists in cache
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Clear expired entries
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let oldestKey = '';
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    totalHits: number;
  } {
    let totalHits = 0;
    let totalRequests = 0;

    for (const entry of this.cache.values()) {
      totalHits += entry.hits;
      totalRequests += entry.hits + 1; // +1 for initial store
    }

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: totalRequests > 0 ? totalHits / totalRequests : 0,
      totalHits
    };
  }

  /**
   * Clear all cached entries
   */
  clear(): void {
    this.cache.clear();
  }
}

/**
 * Graceful degradation with fallback mechanisms and feature management
 */
export class GracefulDegradation implements IGracefulDegradation {
  private config: Required<GracefulDegradationConfig>;
  private state: DegradationState;
  private featureManager: FeatureManager;
  private fallbackCache: FallbackCache;
  private recoveryTimer?: NodeJS.Timeout;

  constructor(config: GracefulDegradationConfig) {
    this.config = {
      enableFallback: config.enableFallback,
      fallbackCacheSize: config.fallbackCacheSize,
      fallbackCacheTTL: config.fallbackCacheTTL,
      reducedFeatures: config.reducedFeatures,
      notifications: config.notifications
    };

    this.state = {
      isDegraded: false,
      degradationLevel: 'none',
      reason: 'rate_limit',
      startTime: 0,
      availableFeatures: [],
      disabledFeatures: []
    };

    this.featureManager = new FeatureManager();
    this.fallbackCache = new FallbackCache(
      this.config.fallbackCacheSize,
      this.config.fallbackCacheTTL
    );

    this.updateStateFeatures();
  }

  /**
   * Check if system should degrade
   */
  public shouldDegrade(metrics: RateLimitingMetrics): boolean {
    const blockRate = metrics.totalRequests > 0 ? 
      metrics.blockedRequests / metrics.totalRequests : 0;
    
    const circuitBreakerActive = metrics.circuitBreakerTrips > 0;
    const highAbuseRate = metrics.abuseIncidents > 5;
    const highDegradationRate = metrics.degradationActivations > 3;

    return blockRate > 0.3 || circuitBreakerActive || highAbuseRate || highDegradationRate;
  }

  /**
   * Activate degradation
   */
  public activateDegradation(
    reason: DegradationState['reason'], 
    level: DegradationState['degradationLevel']
  ): void {
    const wasAlreadyDegraded = this.state.isDegraded;
    
    this.state = {
      isDegraded: true,
      degradationLevel: level,
      reason,
      startTime: wasAlreadyDegraded ? this.state.startTime : Date.now(),
      estimatedRecoveryTime: this.calculateRecoveryTime(reason, level),
      availableFeatures: [],
      disabledFeatures: []
    };

    // Apply feature restrictions
    this.featureManager.applyDegradationLevel(level);
    this.updateStateFeatures();

    // Clear recovery timer if exists
    if (this.recoveryTimer) {
      clearTimeout(this.recoveryTimer);
    }

    // Set recovery timer
    if (this.state.estimatedRecoveryTime) {
      const recoveryDelay = this.state.estimatedRecoveryTime - Date.now();
      if (recoveryDelay > 0) {
        this.recoveryTimer = setTimeout(() => {
          this.attemptRecovery();
        }, recoveryDelay);
      }
    }
  }

  /**
   * Deactivate degradation
   */
  public deactivateDegradation(): void {
    this.state = {
      isDegraded: false,
      degradationLevel: 'none',
      reason: 'rate_limit',
      startTime: 0,
      availableFeatures: [],
      disabledFeatures: []
    };

    // Reset all features
    this.featureManager.resetFeatures();
    this.updateStateFeatures();

    // Clear recovery timer
    if (this.recoveryTimer) {
      clearTimeout(this.recoveryTimer);
      this.recoveryTimer = undefined;
    }
  }

  /**
   * Get current degradation state
   */
  public getState(): DegradationState {
    return { ...this.state };
  }

  /**
   * Get fallback result from cache
   */
  public getFallbackResult(query: string): any | null {
    if (!this.config.enableFallback || !this.state.isDegraded) {
      return null;
    }

    const cacheKey = this.generateCacheKey(query);
    return this.fallbackCache.get(cacheKey);
  }

  /**
   * Store result for fallback
   */
  public storeFallbackResult(query: string, result: any): void {
    if (!this.config.enableFallback) {
      return;
    }

    const cacheKey = this.generateCacheKey(query);
    this.fallbackCache.store(cacheKey, result);
  }

  /**
   * Check if feature is available
   */
  public isFeatureAvailable(feature: string): boolean {
    return this.featureManager.isFeatureEnabled(feature);
  }

  /**
   * Get user notification message
   */
  public getNotificationMessage(): string | null {
    if (!this.state.isDegraded) {
      return null;
    }

    if (!this.config.notifications.showDegradationNotice) {
      return null;
    }

    let message = '';

    switch (this.state.degradationLevel) {
      case 'light':
        message = 'Some features are temporarily limited due to high usage.';
        break;
      case 'moderate':
        message = 'Search functionality is running in reduced mode due to high usage.';
        break;
      case 'severe':
        message = 'Only basic search is available due to system protection measures.';
        break;
    }

    if (this.config.notifications.estimateRecoveryTime && this.state.estimatedRecoveryTime) {
      const recoveryTime = new Date(this.state.estimatedRecoveryTime);
      message += ` Expected recovery: ${recoveryTime.toLocaleTimeString()}.`;
    }

    return message;
  }

  /**
   * Get rate limit warning message
   */
  public getRateLimitWarning(): string | null {
    if (!this.config.notifications.showRateLimitWarning) {
      return null;
    }

    if (this.state.reason === 'rate_limit') {
      return 'You are approaching the rate limit. Please slow down your requests.';
    }

    return null;
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<GracefulDegradationConfig>): void {
    Object.assign(this.config, config);

    // Update fallback cache if size changed
    if (config.fallbackCacheSize || config.fallbackCacheTTL) {
      this.fallbackCache = new FallbackCache(
        this.config.fallbackCacheSize,
        this.config.fallbackCacheTTL
      );
    }
  }

  /**
   * Calculate estimated recovery time
   */
  private calculateRecoveryTime(
    reason: DegradationState['reason'], 
    level: DegradationState['degradationLevel']
  ): number {
    let baseRecoveryMs = 60000; // 1 minute

    switch (reason) {
      case 'rate_limit':
        baseRecoveryMs = 120000; // 2 minutes
        break;
      case 'circuit_open':
        baseRecoveryMs = 300000; // 5 minutes
        break;
      case 'service_unavailable':
        baseRecoveryMs = 600000; // 10 minutes
        break;
      case 'abuse_detected':
        baseRecoveryMs = 900000; // 15 minutes
        break;
    }

    // Adjust based on degradation level
    switch (level) {
      case 'light':
        baseRecoveryMs *= 0.5;
        break;
      case 'moderate':
        baseRecoveryMs *= 1.0;
        break;
      case 'severe':
        baseRecoveryMs *= 2.0;
        break;
    }

    return Date.now() + baseRecoveryMs;
  }

  /**
   * Attempt automatic recovery
   */
  private attemptRecovery(): void {
    // Simple recovery logic - in real implementation, this would check system health
    if (this.state.isDegraded) {
      // Gradually reduce degradation level
      switch (this.state.degradationLevel) {
        case 'severe':
          this.activateDegradation(this.state.reason, 'moderate');
          break;
        case 'moderate':
          this.activateDegradation(this.state.reason, 'light');
          break;
        case 'light':
          this.deactivateDegradation();
          break;
      }
    }
  }

  /**
   * Update state with current feature availability
   */
  private updateStateFeatures(): void {
    this.state.availableFeatures = this.featureManager.getEnabledFeatures();
    this.state.disabledFeatures = this.featureManager.getDisabledFeatures();
  }

  /**
   * Generate cache key for query
   */
  private generateCacheKey(query: string): string {
    return `fallback:${query.toLowerCase().trim()}`;
  }

  /**
   * Get degradation statistics
   */
  public getStatistics(): {
    degradationDuration: number;
    fallbackCacheStats: ReturnType<FallbackCache['getStats']>;
    featureAvailability: Record<string, boolean>;
    recoveryTimeRemaining: number;
  } {
    const degradationDuration = this.state.isDegraded ? 
      Date.now() - this.state.startTime : 0;

    const recoveryTimeRemaining = this.state.estimatedRecoveryTime ? 
      Math.max(0, this.state.estimatedRecoveryTime - Date.now()) : 0;

    const featureAvailability: Record<string, boolean> = {};
    for (const feature of this.state.availableFeatures) {
      featureAvailability[feature] = true;
    }
    for (const feature of this.state.disabledFeatures) {
      featureAvailability[feature] = false;
    }

    return {
      degradationDuration,
      fallbackCacheStats: this.fallbackCache.getStats(),
      featureAvailability,
      recoveryTimeRemaining
    };
  }

  /**
   * Force recovery (for testing/admin purposes)
   */
  public forceRecovery(): void {
    this.deactivateDegradation();
  }

  /**
   * Clear fallback cache
   */
  public clearFallbackCache(): void {
    this.fallbackCache.clear();
  }
}

/**
 * Default graceful degradation configuration
 */
export const defaultGracefulDegradationConfig: GracefulDegradationConfig = {
  enableFallback: true,
  fallbackCacheSize: 50,
  fallbackCacheTTL: 300000, // 5 minutes
  reducedFeatures: {
    disableAutoComplete: true,
    disableRealTimeSearch: true,
    limitResultCount: 10,
    disableMetadata: true
  },
  notifications: {
    showRateLimitWarning: true,
    showDegradationNotice: true,
    estimateRecoveryTime: true
  }
};

/**
 * Create graceful degradation with default configuration
 */
export function createGracefulDegradation(
  config?: Partial<GracefulDegradationConfig>
): GracefulDegradation {
  return new GracefulDegradation({
    ...defaultGracefulDegradationConfig,
    ...config
  });
}
