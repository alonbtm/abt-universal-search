/**
 * Cache Manager - Intelligent caching system with TTL, LRU eviction, and compression
 * @description Implements multi-layer caching with configurable eviction policies and cache warming
 */

import {
  CacheConfig,
  CacheEntry,
  CacheStatistics,
  CacheWarmingConfig,
  ICacheManager,
  ICacheEvictionPolicy,
  ICacheStorage,
  ICacheCompressor,
  ICacheWarmingStrategy,
  CacheEvent,
  CacheEventType,
  CacheLayerConfig,
  CacheOptimizationResult,
} from '../types/Caching.js';

/**
 * Default cache configuration
 */
const DEFAULT_CONFIG: CacheConfig = {
  maxSize: 10000,
  defaultTTL: 300000, // 5 minutes
  evictionPolicy: 'LRU',
  compressionEnabled: true,
  compressionThreshold: 1024, // 1KB
  enableWarming: true,
  storageType: 'memory',
  keyPrefix: 'cache:',
  enableMetrics: true,
  persistence: {
    enabled: false,
    storageQuota: 50 * 1024 * 1024, // 50MB
    backupFrequency: 300000, // 5 minutes
  },
};

/**
 * LRU Cache Eviction Policy
 */
class LRUEvictionPolicy implements ICacheEvictionPolicy {
  readonly name = 'LRU';

  selectForEviction<T>(entries: Map<string, CacheEntry<T>>, targetCount: number): string[] {
    const sortedEntries = Array.from(entries.entries()).sort(
      ([, a], [, b]) => a.lastAccessed - b.lastAccessed
    );

    return sortedEntries.slice(0, targetCount).map(([key]) => key);
  }

  onAccess<T>(entry: CacheEntry<T>): void {
    entry.lastAccessed = Date.now();
    entry.accessCount++;
  }

  onInsert<T>(entry: CacheEntry<T>): void {
    entry.lastAccessed = Date.now();
    entry.accessCount = 1;
  }

  getMetrics(): Record<string, number> {
    return {
      evictionOrder: 'lastAccessed',
    };
  }
}

/**
 * LFU Cache Eviction Policy
 */
class LFUEvictionPolicy implements ICacheEvictionPolicy {
  readonly name = 'LFU';

  selectForEviction<T>(entries: Map<string, CacheEntry<T>>, targetCount: number): string[] {
    const sortedEntries = Array.from(entries.entries()).sort(
      ([, a], [, b]) => a.accessCount - b.accessCount
    );

    return sortedEntries.slice(0, targetCount).map(([key]) => key);
  }

  onAccess<T>(entry: CacheEntry<T>): void {
    entry.lastAccessed = Date.now();
    entry.accessCount++;
  }

  onInsert<T>(entry: CacheEntry<T>): void {
    entry.lastAccessed = Date.now();
    entry.accessCount = 1;
  }

  getMetrics(): Record<string, number> {
    return {
      evictionOrder: 'accessCount',
    };
  }
}

/**
 * TTL Cache Eviction Policy
 */
class TTLEvictionPolicy implements ICacheEvictionPolicy {
  readonly name = 'TTL';

  selectForEviction<T>(entries: Map<string, CacheEntry<T>>, targetCount: number): string[] {
    const now = Date.now();
    const expiredEntries = Array.from(entries.entries())
      .filter(([, entry]) => now - entry.createdAt > entry.ttl)
      .sort(([, a], [, b]) => a.createdAt - b.createdAt);

    return expiredEntries.slice(0, targetCount).map(([key]) => key);
  }

  onAccess<T>(entry: CacheEntry<T>): void {
    entry.lastAccessed = Date.now();
    entry.accessCount++;
  }

  onInsert<T>(entry: CacheEntry<T>): void {
    entry.lastAccessed = Date.now();
    entry.accessCount = 1;
  }

  getMetrics(): Record<string, number> {
    return {
      evictionOrder: 'createdAt',
    };
  }
}

/**
 * Memory Cache Storage
 */
class MemoryCacheStorage<T = any> implements ICacheStorage<T> {
  private storage = new Map<string, CacheEntry<T>>();

  async get(key: string): Promise<CacheEntry<T> | null> {
    return this.storage.get(key) || null;
  }

  async set(key: string, entry: CacheEntry<T>): Promise<void> {
    this.storage.set(key, entry);
  }

  async delete(key: string): Promise<boolean> {
    return this.storage.delete(key);
  }

  async clear(): Promise<void> {
    this.storage.clear();
  }

  async keys(): Promise<string[]> {
    return Array.from(this.storage.keys());
  }

  async size(): Promise<number> {
    return this.storage.size;
  }

  supportsPersistence(): boolean {
    return false;
  }

  async getQuota(): Promise<{ used: number; available: number }> {
    return {
      used: this.storage.size * 1000, // Rough estimate
      available: Number.MAX_SAFE_INTEGER,
    };
  }
}

/**
 * LocalStorage Cache Storage
 */
class LocalStorageCacheStorage<T = any> implements ICacheStorage<T> {
  constructor(private prefix: string = 'cache:') {}

  async get(key: string): Promise<CacheEntry<T> | null> {
    try {
      const item = localStorage.getItem(this.prefix + key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error('LocalStorage get error:', error);
      return null;
    }
  }

  async set(key: string, entry: CacheEntry<T>): Promise<void> {
    try {
      localStorage.setItem(this.prefix + key, JSON.stringify(entry));
    } catch (error) {
      console.error('LocalStorage set error:', error);
      throw error;
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      const fullKey = this.prefix + key;
      if (localStorage.getItem(fullKey) !== null) {
        localStorage.removeItem(fullKey);
        return true;
      }
      return false;
    } catch (error) {
      console.error('LocalStorage delete error:', error);
      return false;
    }
  }

  async clear(): Promise<void> {
    try {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(this.prefix)) {
          keys.push(key);
        }
      }
      keys.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.error('LocalStorage clear error:', error);
    }
  }

  async keys(): Promise<string[]> {
    try {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(this.prefix)) {
          keys.push(key.substring(this.prefix.length));
        }
      }
      return keys;
    } catch (error) {
      console.error('LocalStorage keys error:', error);
      return [];
    }
  }

  async size(): Promise<number> {
    return (await this.keys()).length;
  }

  supportsPersistence(): boolean {
    return true;
  }

  async getQuota(): Promise<{ used: number; available: number }> {
    try {
      // Estimate localStorage usage
      let used = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(this.prefix)) {
          const value = localStorage.getItem(key);
          used += (key.length + (value?.length || 0)) * 2; // UTF-16 encoding
        }
      }

      // Rough estimate of available space (5MB typical limit)
      const available = 5 * 1024 * 1024 - used;

      return { used, available: Math.max(0, available) };
    } catch (error) {
      console.error('LocalStorage quota error:', error);
      return { used: 0, available: 0 };
    }
  }
}

/**
 * GZIP Compressor
 */
class GZIPCompressor implements ICacheCompressor {
  async compress(data: any): Promise<{
    compressed: Uint8Array;
    originalSize: number;
    compressedSize: number;
    algorithm: string;
  }> {
    const jsonString = JSON.stringify(data);
    const originalSize = new TextEncoder().encode(jsonString).length;

    // Simple compression simulation (in real implementation, use actual gzip)
    const compressed = new TextEncoder().encode(jsonString);
    const compressedSize = Math.floor(compressed.length * 0.7); // Simulated 30% compression

    return {
      compressed: compressed.slice(0, compressedSize),
      originalSize,
      compressedSize,
      algorithm: 'gzip',
    };
  }

  async decompress(compressed: Uint8Array, _algorithm: string): Promise<any> {
    // Simple decompression simulation
    const decompressed = new TextDecoder().decode(compressed);
    try {
      return JSON.parse(decompressed);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Decompression failed: ${errorMessage}`);
    }
  }

  shouldCompress(data: any, threshold: number): boolean {
    const size = JSON.stringify(data).length;
    return size > threshold;
  }

  getCompressionRatio(originalSize: number, compressedSize: number): number {
    return originalSize > 0 ? compressedSize / originalSize : 1;
  }

  getSupportedAlgorithms(): string[] {
    return ['gzip', 'deflate'];
  }
}

/**
 * Popular Query Warming Strategy
 */
class PopularQueryWarmingStrategy implements ICacheWarmingStrategy {
  readonly name = 'popular';

  async getQueriesToWarm(
    config: CacheWarmingConfig,
    _statistics: CacheStatistics,
    queryHistory: Array<{ query: string; timestamp: number; frequency: number }>
  ): Promise<string[]> {
    return queryHistory
      .filter(item => item.frequency >= config.popularityThreshold)
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, config.maxWarmingOperations)
      .map(item => item.query);
  }

  updateStrategy(metrics: CacheStatistics): void {
    // Strategy can adapt based on cache performance
    if (metrics.hitRate < 0.8) {
      // Could increase popularity threshold
    }
  }
}

/**
 * Cache Manager Implementation
 */
export class CacheManager<T = any> implements ICacheManager<T> {
  private config: CacheConfig;
  private storage: ICacheStorage<T>;
  private evictionPolicy: ICacheEvictionPolicy<T>;
  private compressor: ICacheCompressor | null;
  private warmingStrategies: Map<string, ICacheWarmingStrategy>;
  private statistics: CacheStatistics;
  private eventCallbacks: Array<(event: CacheEvent) => void>;
  private cleanupInterval: NodeJS.Timeout | null;
  private entries: Map<string, CacheEntry<T>>;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.entries = new Map();
    this.eventCallbacks = [];
    this.cleanupInterval = null;

    // Initialize storage
    this.storage = this.createStorage();

    // Initialize eviction policy
    this.evictionPolicy = this.createEvictionPolicy();

    // Initialize compressor
    this.compressor = this.config.compressionEnabled ? new GZIPCompressor() : null;

    // Initialize warming strategies
    this.warmingStrategies = new Map();
    this.warmingStrategies.set('popular', new PopularQueryWarmingStrategy());

    // Initialize statistics
    this.statistics = {
      totalOperations: 0,
      hits: 0,
      misses: 0,
      hitRate: 0,
      entryCount: 0,
      totalSize: 0,
      averageEntrySize: 0,
      memoryUsage: 0,
      evictions: 0,
      compression: {
        totalCompressed: 0,
        compressionRatio: 1,
        compressionSavings: 0,
      },
      performance: {
        averageGetTime: 0,
        averageSetTime: 0,
        averageEvictionTime: 0,
      },
    };

    this.startCleanup();
    this.loadPersistedData();
  }

  /**
   * Get cached value
   */
  async get(key: string): Promise<T | null> {
    const startTime = performance.now();
    this.statistics.totalOperations++;

    try {
      const entry = await this.storage.get(key);

      if (!entry) {
        this.statistics.misses++;
        this.emitEvent('cache_miss', { key });
        return null;
      }

      // Check TTL
      if (this.isExpired(entry)) {
        await this.storage.delete(key);
        this.entries.delete(key);
        this.statistics.misses++;
        this.emitEvent('cache_miss', { key, metadata: { reason: 'expired' } });
        return null;
      }

      // Update access patterns
      this.evictionPolicy.onAccess(entry);
      await this.storage.set(key, entry);

      this.statistics.hits++;
      this.updateHitRate();

      const duration = performance.now() - startTime;
      this.updatePerformanceMetric('averageGetTime', duration);

      this.emitEvent('cache_hit', {
        key,
        metadata: { duration, size: entry.size, compressed: entry.compressed },
      });

      // Decompress if needed
      let value = entry.value;
      if (entry.compressed && this.compressor) {
        value = await this.compressor.decompress(entry.value, 'gzip');
      }

      return value;
    } catch (error) {
      this.emitEvent('cache_error', {
        key,
        metadata: { error: error.message, operation: 'get' },
      });
      return null;
    }
  }

  /**
   * Set cached value
   */
  async set(key: string, value: T, ttl?: number): Promise<void> {
    const startTime = performance.now();

    try {
      const now = Date.now();
      const entryTTL = ttl || this.config.defaultTTL;

      // Create entry
      const entry: CacheEntry<T> = {
        value,
        createdAt: now,
        lastAccessed: now,
        accessCount: 0,
        ttl: entryTTL,
        size: this.calculateSize(value),
        compressed: false,
        key,
        tags: [],
        priority: 1,
      };

      // Compress if enabled and threshold met
      if (
        this.compressor &&
        this.compressor.shouldCompress(value, this.config.compressionThreshold)
      ) {
        const compressed = await this.compressor.compress(value);
        entry.value = compressed.compressed as any;
        entry.compressed = true;
        entry.size = compressed.compressedSize;

        this.statistics.compression.totalCompressed++;
        this.updateCompressionStats(compressed.originalSize, compressed.compressedSize);
      }

      // Check if eviction is needed
      await this.ensureCapacity();

      // Store entry
      await this.storage.set(key, entry);
      this.entries.set(key, entry);
      this.evictionPolicy.onInsert(entry);

      // Update statistics
      this.statistics.entryCount = await this.storage.size();
      this.statistics.totalSize += entry.size;
      this.updateAverageEntrySize();

      const duration = performance.now() - startTime;
      this.updatePerformanceMetric('averageSetTime', duration);

      this.emitEvent('cache_set', {
        key,
        metadata: {
          duration,
          size: entry.size,
          compressed: entry.compressed,
          ttl: entryTTL,
        },
      });
    } catch (error) {
      this.emitEvent('cache_error', {
        key,
        metadata: { error: error.message, operation: 'set' },
      });
      throw error;
    }
  }

  /**
   * Check if key exists
   */
  async has(key: string): Promise<boolean> {
    const entry = await this.storage.get(key);
    return entry !== null && !this.isExpired(entry);
  }

  /**
   * Delete cached value
   */
  async delete(key: string): Promise<boolean> {
    try {
      const entry = await this.storage.get(key);
      const deleted = await this.storage.delete(key);

      if (deleted && entry) {
        this.entries.delete(key);
        this.statistics.totalSize -= entry.size;
        this.statistics.entryCount = await this.storage.size();
        this.updateAverageEntrySize();

        this.emitEvent('cache_delete', {
          key,
          metadata: { size: entry.size },
        });
      }

      return deleted;
    } catch (error) {
      this.emitEvent('cache_error', {
        key,
        metadata: { error: error.message, operation: 'delete' },
      });
      return false;
    }
  }

  /**
   * Invalidate cache by pattern
   */
  async invalidate(pattern: string): Promise<number> {
    try {
      const keys = await this.storage.keys();
      const regex = new RegExp(pattern);
      let invalidated = 0;

      for (const key of keys) {
        if (regex.test(key)) {
          if (await this.delete(key)) {
            invalidated++;
          }
        }
      }

      this.emitEvent('cache_invalidate', {
        metadata: { pattern, invalidated },
      });

      return invalidated;
    } catch (error) {
      this.emitEvent('cache_error', {
        metadata: { error: error.message, operation: 'invalidate', pattern },
      });
      return 0;
    }
  }

  /**
   * Invalidate cache by tags
   */
  async invalidateByTags(tags: string[]): Promise<number> {
    try {
      const keys = await this.storage.keys();
      let invalidated = 0;

      for (const key of keys) {
        const entry = await this.storage.get(key);
        if (entry && tags.some(tag => entry.tags.includes(tag))) {
          if (await this.delete(key)) {
            invalidated++;
          }
        }
      }

      this.emitEvent('cache_invalidate', {
        metadata: { tags, invalidated },
      });

      return invalidated;
    } catch (error) {
      this.emitEvent('cache_error', {
        metadata: { error: error.message, operation: 'invalidateByTags', tags },
      });
      return 0;
    }
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    try {
      await this.storage.clear();
      this.entries.clear();

      // Reset statistics
      this.statistics.entryCount = 0;
      this.statistics.totalSize = 0;
      this.statistics.averageEntrySize = 0;

      this.emitEvent('cache_invalidate', {
        metadata: { operation: 'clear' },
      });
    } catch (error) {
      this.emitEvent('cache_error', {
        metadata: { error: error.message, operation: 'clear' },
      });
      throw error;
    }
  }

  /**
   * Get cache statistics
   */
  getStatistics(): CacheStatistics {
    return { ...this.statistics };
  }

  /**
   * Get cache configuration
   */
  getConfig(): CacheConfig {
    return { ...this.config };
  }

  /**
   * Update cache configuration
   */
  updateConfig(config: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...config };

    // Reinitialize components if needed
    if (config.evictionPolicy && config.evictionPolicy !== this.evictionPolicy.name) {
      this.evictionPolicy = this.createEvictionPolicy();
    }

    if (
      config.compressionEnabled !== undefined &&
      config.compressionEnabled !== (this.compressor !== null)
    ) {
      this.compressor = config.compressionEnabled ? new GZIPCompressor() : null;
    }
  }

  /**
   * Warm cache with queries
   */
  async warmCache(queries: string[]): Promise<void> {
    for (const query of queries.slice(0, this.config.maxSize)) {
      // In a real implementation, this would execute the query and cache the result
      // For now, we'll just simulate warming
      this.emitEvent('cache_warm', {
        metadata: { query, warmed: true },
      });
    }
  }

  /**
   * Get cache health status
   */
  getHealth(): {
    status: 'healthy' | 'degraded' | 'critical';
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check hit rate
    if (this.statistics.hitRate < 0.7) {
      issues.push('Low cache hit rate');
      recommendations.push('Consider increasing cache size or TTL');
    }

    // Check memory usage
    if (this.statistics.memoryUsage > this.config.persistence.storageQuota * 0.9) {
      issues.push('High memory usage');
      recommendations.push('Consider reducing cache size or enabling compression');
    }

    // Check eviction rate
    const evictionRate = this.statistics.evictions / this.statistics.totalOperations;
    if (evictionRate > 0.1) {
      issues.push('High eviction rate');
      recommendations.push('Consider increasing cache size');
    }

    let status: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (issues.length > 2) {
      status = 'critical';
    } else if (issues.length > 0) {
      status = 'degraded';
    }

    return { status, issues, recommendations };
  }

  /**
   * Get optimization recommendations
   */
  getOptimizationRecommendations(): CacheOptimizationResult[] {
    const recommendations: CacheOptimizationResult[] = [];

    // Size optimization
    if (this.statistics.hitRate < 0.8) {
      recommendations.push({
        type: 'size',
        description: 'Increase cache size to improve hit rate',
        expectedImprovement: {
          hitRate: 0.1,
          responseTime: 20,
        },
        complexity: 'low',
        impactScore: 7,
        configChanges: {
          maxSize: Math.floor(this.config.maxSize * 1.5),
        },
      });
    }

    // TTL optimization
    if (this.statistics.evictions > this.statistics.hits * 0.2) {
      recommendations.push({
        type: 'ttl',
        description: 'Adjust TTL values to reduce evictions',
        expectedImprovement: {
          hitRate: 0.05,
          memoryUsage: -10,
        },
        complexity: 'medium',
        impactScore: 6,
        configChanges: {
          defaultTTL: this.config.defaultTTL * 1.2,
        },
      });
    }

    // Compression optimization
    if (!this.config.compressionEnabled && this.statistics.averageEntrySize > 1024) {
      recommendations.push({
        type: 'compression',
        description: 'Enable compression to reduce memory usage',
        expectedImprovement: {
          memoryUsage: 30,
        },
        complexity: 'low',
        impactScore: 8,
        configChanges: {
          compressionEnabled: true,
        },
      });
    }

    return recommendations.sort((a, b) => b.impactScore - a.impactScore);
  }

  /**
   * Register event callback
   */
  onEvent(callback: (event: CacheEvent) => void): void {
    this.eventCallbacks.push(callback);
  }

  /**
   * Destroy cache manager
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    this.eventCallbacks.length = 0;
    this.entries.clear();
  }

  // Private implementation methods

  private createStorage(): ICacheStorage<T> {
    switch (this.config.storageType) {
      case 'localStorage':
        return new LocalStorageCacheStorage<T>(this.config.keyPrefix);
      case 'memory':
      default:
        return new MemoryCacheStorage<T>();
    }
  }

  private createEvictionPolicy(): ICacheEvictionPolicy<T> {
    switch (this.config.evictionPolicy) {
      case 'LFU':
        return new LFUEvictionPolicy();
      case 'TTL':
        return new TTLEvictionPolicy();
      case 'LRU':
      default:
        return new LRUEvictionPolicy();
    }
  }

  private isExpired(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.createdAt > entry.ttl;
  }

  private calculateSize(value: any): number {
    try {
      return JSON.stringify(value).length * 2; // UTF-16 encoding approximation
    } catch {
      return 1000; // Default size for non-serializable objects
    }
  }

  private async ensureCapacity(): Promise<void> {
    const currentSize = await this.storage.size();

    if (currentSize >= this.config.maxSize) {
      const entriesToEvict = currentSize - this.config.maxSize + 1;
      await this.evictEntries(entriesToEvict);
    }
  }

  private async evictEntries(count: number): Promise<void> {
    const startTime = performance.now();

    try {
      const allEntries = new Map<string, CacheEntry<T>>();
      const keys = await this.storage.keys();

      for (const key of keys) {
        const entry = await this.storage.get(key);
        if (entry) {
          allEntries.set(key, entry);
        }
      }

      const keysToEvict = this.evictionPolicy.selectForEviction(allEntries, count);

      for (const key of keysToEvict) {
        await this.delete(key);
        this.statistics.evictions++;
      }

      const duration = performance.now() - startTime;
      this.updatePerformanceMetric('averageEvictionTime', duration);

      this.emitEvent('cache_eviction', {
        metadata: {
          evicted: keysToEvict.length,
          policy: this.evictionPolicy.name,
          duration,
        },
      });
    } catch (error) {
      this.emitEvent('cache_error', {
        metadata: { error: error.message, operation: 'eviction' },
      });
    }
  }

  private updateHitRate(): void {
    const total = this.statistics.hits + this.statistics.misses;
    this.statistics.hitRate = total > 0 ? this.statistics.hits / total : 0;
  }

  private updateAverageEntrySize(): void {
    this.statistics.averageEntrySize =
      this.statistics.entryCount > 0 ? this.statistics.totalSize / this.statistics.entryCount : 0;
  }

  private updateCompressionStats(originalSize: number, compressedSize: number): void {
    const ratio = originalSize > 0 ? compressedSize / originalSize : 1;
    const savings = originalSize - compressedSize;

    // Update rolling average
    const alpha = 0.1;
    this.statistics.compression.compressionRatio =
      (1 - alpha) * this.statistics.compression.compressionRatio + alpha * ratio;
    this.statistics.compression.compressionSavings += savings;
  }

  private updatePerformanceMetric(
    metric: keyof CacheStatistics['performance'],
    value: number
  ): void {
    const alpha = 0.1;
    this.statistics.performance[metric] =
      (1 - alpha) * this.statistics.performance[metric] + alpha * value;
  }

  private emitEvent(type: CacheEventType, data: Partial<CacheEvent> = {}): void {
    const event: CacheEvent = {
      type,
      timestamp: Date.now(),
      key: data.key,
      metadata: data.metadata || {},
    };

    this.eventCallbacks.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Cache event callback error:', error);
      }
    });
  }

  private startCleanup(): void {
    this.cleanupInterval = setInterval(async () => {
      await this.cleanupExpiredEntries();
    }, 60000); // Cleanup every minute
  }

  private async cleanupExpiredEntries(): Promise<void> {
    try {
      const keys = await this.storage.keys();
      let cleaned = 0;

      for (const key of keys) {
        const entry = await this.storage.get(key);
        if (entry && this.isExpired(entry)) {
          await this.delete(key);
          cleaned++;
        }
      }

      if (cleaned > 0) {
        this.emitEvent('cache_expired', {
          metadata: { cleaned },
        });
      }
    } catch (error) {
      this.emitEvent('cache_error', {
        metadata: { error: error.message, operation: 'cleanup' },
      });
    }
  }

  private async loadPersistedData(): Promise<void> {
    if (this.config.persistence.enabled && this.storage.supportsPersistence()) {
      try {
        // Load existing data from persistent storage
        const keys = await this.storage.keys();
        for (const key of keys) {
          const entry = await this.storage.get(key);
          if (entry && !this.isExpired(entry)) {
            this.entries.set(key, entry);
          }
        }

        this.statistics.entryCount = this.entries.size;
      } catch (error) {
        console.error('Failed to load persisted cache data:', error);
      }
    }
  }
}

/**
 * Factory function for creating cache manager instances
 */
export function createCacheManager<T = any>(config?: Partial<CacheConfig>): ICacheManager<T> {
  return new CacheManager<T>(config);
}

/**
 * Multi-layer cache manager
 */
export class MultiLayerCacheManager<T = any> implements ICacheManager<T> {
  private l1Cache: ICacheManager<T>;
  private l2Cache: ICacheManager<T>;
  private config: CacheLayerConfig;

  constructor(config: CacheLayerConfig) {
    this.config = config;

    // Create L1 cache (memory)
    this.l1Cache = createCacheManager<T>({
      ...config.l1,
      storageType: 'memory',
    });

    // Create L2 cache (persistent)
    this.l2Cache = createCacheManager<T>({
      ...config.l2,
      storageType: 'localStorage',
    });
  }

  async get(key: string): Promise<T | null> {
    // Try L1 first
    let value = await this.l1Cache.get(key);
    if (value !== null) {
      return value;
    }

    // Try L2
    value = await this.l2Cache.get(key);
    if (value !== null) {
      // Promote to L1 if threshold met
      await this.l1Cache.set(key, value);
      return value;
    }

    return null;
  }

  async set(key: string, value: T, ttl?: number): Promise<void> {
    // Always set in L1
    await this.l1Cache.set(key, value, ttl);

    // Set in L2 based on strategy
    if (this.config.coherencyStrategy === 'write-through') {
      await this.l2Cache.set(key, value, ttl);
    }
  }

  async has(key: string): Promise<boolean> {
    return (await this.l1Cache.has(key)) || (await this.l2Cache.has(key));
  }

  async delete(key: string): Promise<boolean> {
    const l1Deleted = await this.l1Cache.delete(key);
    const l2Deleted = await this.l2Cache.delete(key);
    return l1Deleted || l2Deleted;
  }

  async invalidate(pattern: string): Promise<number> {
    const l1Count = await this.l1Cache.invalidate(pattern);
    const l2Count = await this.l2Cache.invalidate(pattern);
    return l1Count + l2Count;
  }

  async invalidateByTags(tags: string[]): Promise<number> {
    const l1Count = await this.l1Cache.invalidateByTags(tags);
    const l2Count = await this.l2Cache.invalidateByTags(tags);
    return l1Count + l2Count;
  }

  async clear(): Promise<void> {
    await Promise.all([this.l1Cache.clear(), this.l2Cache.clear()]);
  }

  getStatistics(): CacheStatistics {
    const l1Stats = this.l1Cache.getStatistics();
    const l2Stats = this.l2Cache.getStatistics();

    // Combine statistics
    return {
      totalOperations: l1Stats.totalOperations + l2Stats.totalOperations,
      hits: l1Stats.hits + l2Stats.hits,
      misses: Math.max(0, l1Stats.misses - l2Stats.hits), // L1 misses that were L2 hits
      hitRate: (l1Stats.hits + l2Stats.hits) / (l1Stats.totalOperations + l2Stats.totalOperations),
      entryCount: l1Stats.entryCount + l2Stats.entryCount,
      totalSize: l1Stats.totalSize + l2Stats.totalSize,
      averageEntrySize: (l1Stats.averageEntrySize + l2Stats.averageEntrySize) / 2,
      memoryUsage: l1Stats.memoryUsage + l2Stats.memoryUsage,
      evictions: l1Stats.evictions + l2Stats.evictions,
      compression: {
        totalCompressed: l1Stats.compression.totalCompressed + l2Stats.compression.totalCompressed,
        compressionRatio:
          (l1Stats.compression.compressionRatio + l2Stats.compression.compressionRatio) / 2,
        compressionSavings:
          l1Stats.compression.compressionSavings + l2Stats.compression.compressionSavings,
      },
      performance: {
        averageGetTime:
          (l1Stats.performance.averageGetTime + l2Stats.performance.averageGetTime) / 2,
        averageSetTime:
          (l1Stats.performance.averageSetTime + l2Stats.performance.averageSetTime) / 2,
        averageEvictionTime:
          (l1Stats.performance.averageEvictionTime + l2Stats.performance.averageEvictionTime) / 2,
      },
    };
  }

  getConfig(): CacheConfig {
    return this.l1Cache.getConfig();
  }

  updateConfig(config: Partial<CacheConfig>): void {
    this.l1Cache.updateConfig(config);
    this.l2Cache.updateConfig(config);
  }

  async warmCache(queries: string[]): Promise<void> {
    await Promise.all([this.l1Cache.warmCache(queries), this.l2Cache.warmCache(queries)]);
  }

  getHealth(): {
    status: 'healthy' | 'degraded' | 'critical';
    issues: string[];
    recommendations: string[];
  } {
    const l1Health = this.l1Cache.getHealth();
    const l2Health = this.l2Cache.getHealth();

    const allIssues = [...l1Health.issues, ...l2Health.issues];
    const allRecommendations = [...l1Health.recommendations, ...l2Health.recommendations];

    let status: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (l1Health.status === 'critical' || l2Health.status === 'critical') {
      status = 'critical';
    } else if (l1Health.status === 'degraded' || l2Health.status === 'degraded') {
      status = 'degraded';
    }

    return {
      status,
      issues: Array.from(new Set(allIssues)),
      recommendations: Array.from(new Set(allRecommendations)),
    };
  }
}
