/**
 * AdvancedCaching - Enterprise-grade multi-level caching system
 * Provides LRU eviction, TTL management, cache warming, and intelligent prefetching
 */

export interface CacheConfig {
  levels: ('memory' | 'local' | 'session' | 'distributed')[];
  memoryCache?: {
    maxSize: number; // in bytes
    maxEntries: number;
    ttlDefault: number; // in seconds
  };
  localStorage?: {
    maxSize: number;
    ttlDefault: number;
    compression: boolean;
  };
  distributedCache?: {
    endpoint?: string;
    timeout: number;
    retryAttempts: number;
  };
  prefetching?: {
    enabled: boolean;
    strategy: 'predictive' | 'popularity' | 'sequential';
    maxPrefetch: number;
  };
  analytics?: {
    trackHitRatio: boolean;
    trackLatency: boolean;
    reportInterval: number;
  };
}

export interface CacheEntry<T> {
  key: string;
  value: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccess: number;
  size: number;
  compressed: boolean;
}

export interface CacheStats {
  hitRatio: number;
  missCount: number;
  hitCount: number;
  totalRequests: number;
  averageLatency: number;
  memoryUsage: number;
  storageUsage: number;
  evictionCount: number;
}

export interface LRUNode<T> {
  key: string;
  value: CacheEntry<T>;
  prev: LRUNode<T> | null;
  next: LRUNode<T> | null;
}

export class AdvancedCaching {
  private config: Required<CacheConfig>;
  private memoryCache: Map<string, CacheEntry<any>>;
  private lruHead: LRUNode<any> | null = null;
  private lruTail: LRUNode<any> | null = null;
  private nodeMap: Map<string, LRUNode<any>>;
  private stats: CacheStats;
  private cleanupInterval: number | null = null;
  private prefetchQueue: string[] = [];
  private compressionWorker: Worker | null = null;

  constructor(config: CacheConfig) {
    this.config = {
      levels: config.levels || ['memory', 'local'],
      memoryCache: {
        maxSize: 50 * 1024 * 1024, // 50MB
        maxEntries: 10000,
        ttlDefault: 3600, // 1 hour
        ...config.memoryCache
      },
      localStorage: {
        maxSize: 100 * 1024 * 1024, // 100MB
        ttlDefault: 86400, // 24 hours
        compression: true,
        ...config.localStorage
      },
      distributedCache: {
        timeout: 5000,
        retryAttempts: 3,
        ...config.distributedCache
      },
      prefetching: {
        enabled: true,
        strategy: 'predictive',
        maxPrefetch: 10,
        ...config.prefetching
      },
      analytics: {
        trackHitRatio: true,
        trackLatency: true,
        reportInterval: 60000, // 1 minute
        ...config.analytics
      },
      ...config
    };

    this.memoryCache = new Map();
    this.nodeMap = new Map();
    this.stats = this.initializeStats();

    this.init();
  }

  /**
   * Initialize caching system
   */
  private init(): void {
    this.setupCleanupInterval();
    this.setupCompressionWorker();
    this.setupAnalytics();
    console.log('[AdvancedCaching] Initialized with levels:', this.config.levels);
  }

  /**
   * Get value from cache with intelligent fallback
   */
  async get<T>(key: string, options?: {
    skipPrefetch?: boolean;
    preferredLevel?: string;
  }): Promise<T | null> {
    const startTime = performance.now();

    try {
      // Try each cache level in order
      for (const level of this.config.levels) {
        const value = await this.getFromLevel<T>(key, level);
        if (value !== null) {
          this.updateStats('hit', performance.now() - startTime);
          this.updateLRU(key);

          // Populate higher levels
          if (this.config.levels.indexOf(level) > 0) {
            this.populateHigherLevels(key, value, level);
          }

          // Trigger prefetching if enabled
          if (!options?.skipPrefetch && this.config.prefetching.enabled) {
            this.triggerPrefetch(key);
          }

          return value;
        }
      }

      this.updateStats('miss', performance.now() - startTime);
      return null;
    } catch (error) {
      console.error('[AdvancedCaching] Get error:', error);
      this.updateStats('miss', performance.now() - startTime);
      return null;
    }
  }

  /**
   * Set value in cache across all configured levels
   */
  async set<T>(
    key: string,
    value: T,
    options?: {
      ttl?: number;
      skipLevels?: string[];
      compress?: boolean;
    }
  ): Promise<boolean> {
    try {
      const ttl = options?.ttl || this.config.memoryCache.ttlDefault;
      const skipLevels = options?.skipLevels || [];

      const tasks = this.config.levels
        .filter(level => !skipLevels.includes(level))
        .map(level => this.setInLevel(key, value, ttl, level, options?.compress));

      const results = await Promise.allSettled(tasks);
      const successCount = results.filter(r => r.status === 'fulfilled').length;

      if (successCount > 0) {
        this.updateLRU(key);
        return true;
      }

      return false;
    } catch (error) {
      console.error('[AdvancedCaching] Set error:', error);
      return false;
    }
  }

  /**
   * Delete from all cache levels
   */
  async delete(key: string): Promise<boolean> {
    try {
      const tasks = this.config.levels.map(level => this.deleteFromLevel(key, level));
      await Promise.allSettled(tasks);

      this.removeLRUNode(key);
      return true;
    } catch (error) {
      console.error('[AdvancedCaching] Delete error:', error);
      return false;
    }
  }

  /**
   * Warm cache with preloaded data
   */
  async warmCache(entries: Array<{ key: string; value: any; ttl?: number }>): Promise<number> {
    let successCount = 0;

    const batchSize = 100;
    for (let i = 0; i < entries.length; i += batchSize) {
      const batch = entries.slice(i, i + batchSize);
      const tasks = batch.map(async ({ key, value, ttl }) => {
        const success = await this.set(key, value, { ttl });
        if (success) successCount++;
      });

      await Promise.allSettled(tasks);

      // Small delay to prevent overwhelming the system
      if (i + batchSize < entries.length) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }

    console.log(`[AdvancedCaching] Warmed cache with ${successCount}/${entries.length} entries`);
    return successCount;
  }

  /**
   * Batch get multiple values
   */
  async getMultiple<T>(keys: string[]): Promise<Map<string, T | null>> {
    const results = new Map<string, T | null>();

    // Process in batches to avoid overwhelming the system
    const batchSize = 50;
    for (let i = 0; i < keys.length; i += batchSize) {
      const batch = keys.slice(i, i + batchSize);
      const batchTasks = batch.map(async key => {
        const value = await this.get<T>(key, { skipPrefetch: true });
        return { key, value };
      });

      const batchResults = await Promise.allSettled(batchTasks);
      batchResults.forEach(result => {
        if (result.status === 'fulfilled') {
          results.set(result.value.key, result.value.value);
        }
      });
    }

    return results;
  }

  /**
   * Clear specific cache level or all levels
   */
  async clear(level?: string): Promise<boolean> {
    try {
      if (level) {
        await this.clearLevel(level);
      } else {
        const tasks = this.config.levels.map(l => this.clearLevel(l));
        await Promise.allSettled(tasks);
      }

      if (!level || level === 'memory') {
        this.memoryCache.clear();
        this.nodeMap.clear();
        this.lruHead = null;
        this.lruTail = null;
      }

      this.stats = this.initializeStats();
      return true;
    } catch (error) {
      console.error('[AdvancedCaching] Clear error:', error);
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const memoryUsage = this.calculateMemoryUsage();
    const storageUsage = this.calculateStorageUsage();

    return {
      ...this.stats,
      memoryUsage,
      storageUsage
    };
  }

  /**
   * Optimize cache performance
   */
  async optimize(): Promise<void> {
    console.log('[AdvancedCaching] Starting optimization...');

    // Remove expired entries
    await this.cleanupExpired();

    // Optimize memory usage
    await this.optimizeMemoryCache();

    // Compact localStorage if supported
    await this.compactLocalStorage();

    console.log('[AdvancedCaching] Optimization complete');
  }

  /**
   * Get value from specific cache level
   */
  private async getFromLevel<T>(key: string, level: string): Promise<T | null> {
    switch (level) {
      case 'memory':
        return this.getFromMemory<T>(key);

      case 'local':
        return this.getFromLocalStorage<T>(key);

      case 'session':
        return this.getFromSessionStorage<T>(key);

      case 'distributed':
        return this.getFromDistributed<T>(key);

      default:
        return null;
    }
  }

  /**
   * Set value in specific cache level
   */
  private async setInLevel<T>(
    key: string,
    value: T,
    ttl: number,
    level: string,
    compress?: boolean
  ): Promise<boolean> {
    switch (level) {
      case 'memory':
        return this.setInMemory(key, value, ttl);

      case 'local':
        return this.setInLocalStorage(key, value, ttl, compress);

      case 'session':
        return this.setInSessionStorage(key, value, ttl, compress);

      case 'distributed':
        return this.setInDistributed(key, value, ttl);

      default:
        return false;
    }
  }

  /**
   * Memory cache operations
   */
  private getFromMemory<T>(key: string): T | null {
    const entry = this.memoryCache.get(key);
    if (!entry) return null;

    if (this.isExpired(entry)) {
      this.memoryCache.delete(key);
      this.removeLRUNode(key);
      return null;
    }

    entry.accessCount++;
    entry.lastAccess = Date.now();
    return entry.value;
  }

  private setInMemory<T>(key: string, value: T, ttl: number): boolean {
    const size = this.calculateSize(value);
    const entry: CacheEntry<T> = {
      key,
      value,
      timestamp: Date.now(),
      ttl: ttl * 1000, // Convert to milliseconds
      accessCount: 0,
      lastAccess: Date.now(),
      size,
      compressed: false
    };

    // Check size limits
    if (size > this.config.memoryCache.maxSize) {
      console.warn(`[AdvancedCaching] Entry too large: ${size} bytes`);
      return false;
    }

    // Evict if necessary
    this.evictIfNecessary(size);

    this.memoryCache.set(key, entry);
    this.addToLRU(key, entry);
    return true;
  }

  /**
   * LocalStorage cache operations with compression
   */
  private async getFromLocalStorage<T>(key: string): Promise<T | null> {
    try {
      const stored = localStorage.getItem(`cache_${key}`);
      if (!stored) return null;

      const entry: CacheEntry<T> = JSON.parse(stored);
      if (this.isExpired(entry)) {
        localStorage.removeItem(`cache_${key}`);
        return null;
      }

      let value = entry.value;
      if (entry.compressed) {
        value = await this.decompress(value as any);
      }

      entry.accessCount++;
      entry.lastAccess = Date.now();
      localStorage.setItem(`cache_${key}`, JSON.stringify(entry));

      return value;
    } catch (error) {
      console.error('[AdvancedCaching] LocalStorage get error:', error);
      return null;
    }
  }

  private async setInLocalStorage<T>(
    key: string,
    value: T,
    ttl: number,
    compress?: boolean
  ): Promise<boolean> {
    try {
      let processedValue = value;
      let isCompressed = false;

      if (compress && this.config.localStorage.compression) {
        processedValue = await this.compress(value);
        isCompressed = true;
      }

      const entry: CacheEntry<T> = {
        key,
        value: processedValue,
        timestamp: Date.now(),
        ttl: ttl * 1000,
        accessCount: 0,
        lastAccess: Date.now(),
        size: this.calculateSize(processedValue),
        compressed: isCompressed
      };

      localStorage.setItem(`cache_${key}`, JSON.stringify(entry));
      return true;
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        console.warn('[AdvancedCaching] LocalStorage quota exceeded, clearing old entries');
        await this.cleanupLocalStorage();
        return this.setInLocalStorage(key, value, ttl, compress);
      }
      console.error('[AdvancedCaching] LocalStorage set error:', error);
      return false;
    }
  }

  /**
   * Distributed cache operations (placeholder for Redis/Memcached)
   */
  private async getFromDistributed<T>(key: string): Promise<T | null> {
    if (!this.config.distributedCache.endpoint) {
      return null;
    }

    try {
      const response = await fetch(`${this.config.distributedCache.endpoint}/get/${key}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(this.config.distributedCache.timeout)
      });

      if (!response.ok) return null;
      const data = await response.json();
      return data.value || null;
    } catch (error) {
      console.error('[AdvancedCaching] Distributed cache get error:', error);
      return null;
    }
  }

  private async setInDistributed<T>(key: string, value: T, ttl: number): Promise<boolean> {
    if (!this.config.distributedCache.endpoint) {
      return false;
    }

    try {
      const response = await fetch(`${this.config.distributedCache.endpoint}/set`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value, ttl }),
        signal: AbortSignal.timeout(this.config.distributedCache.timeout)
      });

      return response.ok;
    } catch (error) {
      console.error('[AdvancedCaching] Distributed cache set error:', error);
      return false;
    }
  }

  /**
   * LRU (Least Recently Used) cache management
   */
  private addToLRU<T>(key: string, entry: CacheEntry<T>): void {
    const newNode: LRUNode<T> = {
      key,
      value: entry,
      prev: null,
      next: this.lruHead
    };

    if (this.lruHead) {
      this.lruHead.prev = newNode;
    }

    this.lruHead = newNode;

    if (!this.lruTail) {
      this.lruTail = newNode;
    }

    this.nodeMap.set(key, newNode);
  }

  private updateLRU(key: string): void {
    const node = this.nodeMap.get(key);
    if (!node) return;

    // Move to front
    this.moveToFront(node);
  }

  private moveToFront<T>(node: LRUNode<T>): void {
    if (node === this.lruHead) return;

    // Remove from current position
    if (node.prev) {
      node.prev.next = node.next;
    }
    if (node.next) {
      node.next.prev = node.prev;
    }
    if (node === this.lruTail) {
      this.lruTail = node.prev;
    }

    // Add to front
    node.prev = null;
    node.next = this.lruHead;
    if (this.lruHead) {
      this.lruHead.prev = node;
    }
    this.lruHead = node;

    if (!this.lruTail) {
      this.lruTail = node;
    }
  }

  private removeLRUNode(key: string): void {
    const node = this.nodeMap.get(key);
    if (!node) return;

    if (node.prev) {
      node.prev.next = node.next;
    }
    if (node.next) {
      node.next.prev = node.prev;
    }
    if (node === this.lruHead) {
      this.lruHead = node.next;
    }
    if (node === this.lruTail) {
      this.lruTail = node.prev;
    }

    this.nodeMap.delete(key);
  }

  /**
   * Cache eviction when memory limits are reached
   */
  private evictIfNecessary(newEntrySize: number): void {
    const currentSize = this.calculateMemoryUsage();
    const maxSize = this.config.memoryCache.maxSize;
    const maxEntries = this.config.memoryCache.maxEntries;

    // Check if we need to evict based on size or count
    if (
      currentSize + newEntrySize > maxSize ||
      this.memoryCache.size >= maxEntries
    ) {
      this.evictLRUEntries(Math.max(1, Math.ceil(this.memoryCache.size * 0.1))); // Evict 10%
    }
  }

  private evictLRUEntries(count: number): void {
    let current = this.lruTail;
    let evicted = 0;

    while (current && evicted < count) {
      const prev = current.prev;
      this.memoryCache.delete(current.key);
      this.removeLRUNode(current.key);
      this.stats.evictionCount++;
      current = prev;
      evicted++;
    }

    console.log(`[AdvancedCaching] Evicted ${evicted} entries`);
  }

  /**
   * Utility methods
   */
  private isExpired(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  private calculateSize(value: any): number {
    if (typeof value === 'string') {
      return value.length * 2; // Rough estimate for UTF-16
    }
    return JSON.stringify(value).length * 2;
  }

  private calculateMemoryUsage(): number {
    let totalSize = 0;
    for (const entry of this.memoryCache.values()) {
      totalSize += entry.size;
    }
    return totalSize;
  }

  private calculateStorageUsage(): number {
    let totalSize = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('cache_')) {
        const value = localStorage.getItem(key);
        if (value) {
          totalSize += value.length * 2;
        }
      }
    }
    return totalSize;
  }

  private initializeStats(): CacheStats {
    return {
      hitRatio: 0,
      missCount: 0,
      hitCount: 0,
      totalRequests: 0,
      averageLatency: 0,
      memoryUsage: 0,
      storageUsage: 0,
      evictionCount: 0
    };
  }

  private updateStats(type: 'hit' | 'miss', latency: number): void {
    this.stats.totalRequests++;
    if (type === 'hit') {
      this.stats.hitCount++;
    } else {
      this.stats.missCount++;
    }

    this.stats.hitRatio = this.stats.hitCount / this.stats.totalRequests;
    this.stats.averageLatency =
      (this.stats.averageLatency * (this.stats.totalRequests - 1) + latency) /
      this.stats.totalRequests;
  }

  /**
   * Compression operations
   */
  private async compress(value: any): Promise<string> {
    if (this.compressionWorker) {
      return new Promise((resolve) => {
        const id = Math.random().toString(36);
        const handler = (event: MessageEvent) => {
          if (event.data.id === id) {
            this.compressionWorker?.removeEventListener('message', handler);
            resolve(event.data.result);
          }
        };

        this.compressionWorker.addEventListener('message', handler);
        this.compressionWorker.postMessage({
          id,
          action: 'compress',
          data: JSON.stringify(value)
        });
      });
    }

    // Fallback to simple base64 encoding
    return btoa(JSON.stringify(value));
  }

  private async decompress(compressed: string): Promise<any> {
    if (this.compressionWorker) {
      return new Promise((resolve) => {
        const id = Math.random().toString(36);
        const handler = (event: MessageEvent) => {
          if (event.data.id === id) {
            this.compressionWorker?.removeEventListener('message', handler);
            resolve(JSON.parse(event.data.result));
          }
        };

        this.compressionWorker.addEventListener('message', handler);
        this.compressionWorker.postMessage({
          id,
          action: 'decompress',
          data: compressed
        });
      });
    }

    // Fallback to simple base64 decoding
    return JSON.parse(atob(compressed));
  }

  /**
   * Setup methods
   */
  private setupCleanupInterval(): void {
    this.cleanupInterval = window.setInterval(() => {
      this.cleanupExpired();
    }, 300000); // 5 minutes
  }

  private setupCompressionWorker(): void {
    if (typeof Worker !== 'undefined' && this.config.localStorage.compression) {
      try {
        const workerCode = `
          self.addEventListener('message', function(e) {
            const { id, action, data } = e.data;
            let result;

            if (action === 'compress') {
              result = btoa(unescape(encodeURIComponent(data)));
            } else if (action === 'decompress') {
              result = decodeURIComponent(escape(atob(data)));
            }

            self.postMessage({ id, result });
          });
        `;

        const blob = new Blob([workerCode], { type: 'application/javascript' });
        this.compressionWorker = new Worker(URL.createObjectURL(blob));
      } catch (error) {
        console.warn('[AdvancedCaching] Could not create compression worker:', error);
      }
    }
  }

  private setupAnalytics(): void {
    if (this.config.analytics.trackHitRatio) {
      setInterval(() => {
        const stats = this.getStats();
        console.log('[AdvancedCaching] Stats:', {
          hitRatio: (stats.hitRatio * 100).toFixed(2) + '%',
          averageLatency: stats.averageLatency.toFixed(2) + 'ms',
          memoryUsage: (stats.memoryUsage / 1024 / 1024).toFixed(2) + 'MB'
        });
      }, this.config.analytics.reportInterval);
    }
  }

  private async cleanupExpired(): Promise<void> {
    // Cleanup memory cache
    const expiredKeys: string[] = [];
    for (const [key, entry] of this.memoryCache) {
      if (this.isExpired(entry)) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => {
      this.memoryCache.delete(key);
      this.removeLRUNode(key);
    });

    // Cleanup localStorage
    await this.cleanupLocalStorage();
  }

  private async cleanupLocalStorage(): Promise<void> {
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('cache_')) {
        try {
          const stored = localStorage.getItem(key);
          if (stored) {
            const entry = JSON.parse(stored);
            if (this.isExpired(entry)) {
              keysToRemove.push(key);
            }
          }
        } catch {
          keysToRemove.push(key); // Remove corrupted entries
        }
      }
    }

    keysToRemove.forEach(key => localStorage.removeItem(key));
  }

  /**
   * Advanced operations
   */
  private async populateHigherLevels<T>(key: string, value: T, sourceLevel: string): void {
    const sourceLevelIndex = this.config.levels.indexOf(sourceLevel);
    const higherLevels = this.config.levels.slice(0, sourceLevelIndex);

    for (const level of higherLevels) {
      await this.setInLevel(key, value, this.config.memoryCache.ttlDefault, level);
    }
  }

  private triggerPrefetch(key: string): void {
    if (this.prefetchQueue.length >= this.config.prefetching.maxPrefetch) {
      return;
    }

    const relatedKeys = this.generateRelatedKeys(key);
    relatedKeys.forEach(relatedKey => {
      if (!this.prefetchQueue.includes(relatedKey)) {
        this.prefetchQueue.push(relatedKey);
      }
    });

    // Process prefetch queue
    this.processPrefetchQueue();
  }

  private generateRelatedKeys(key: string): string[] {
    // Simple strategy: generate variations of the key
    const baseKey = key.split('_')[0];
    return [
      `${baseKey}_popular`,
      `${baseKey}_recent`,
      `${baseKey}_related`
    ];
  }

  private async processPrefetchQueue(): Promise<void> {
    if (this.prefetchQueue.length === 0) return;

    const key = this.prefetchQueue.shift();
    if (key) {
      // Check if already cached
      const cached = await this.get(key, { skipPrefetch: true });
      if (!cached) {
        // Would trigger actual data fetching in real implementation
        console.log(`[AdvancedCaching] Prefetch triggered for: ${key}`);
      }
    }

    // Process next item with small delay
    setTimeout(() => this.processPrefetchQueue(), 100);
  }

  private async optimizeMemoryCache(): Promise<void> {
    // Remove least accessed items if memory usage is high
    const currentUsage = this.calculateMemoryUsage();
    const maxUsage = this.config.memoryCache.maxSize * 0.8; // 80% threshold

    if (currentUsage > maxUsage) {
      const entries = Array.from(this.memoryCache.entries())
        .map(([key, entry]) => ({ key, entry }))
        .sort((a, b) => a.entry.accessCount - b.entry.accessCount);

      const toRemove = Math.ceil(entries.length * 0.2); // Remove 20%
      entries.slice(0, toRemove).forEach(({ key }) => {
        this.memoryCache.delete(key);
        this.removeLRUNode(key);
      });
    }
  }

  private async compactLocalStorage(): Promise<void> {
    // Reorganize localStorage to reduce fragmentation
    const cacheEntries: Array<{ key: string; value: string }> = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('cache_')) {
        const value = localStorage.getItem(key);
        if (value) {
          cacheEntries.push({ key, value });
          localStorage.removeItem(key);
        }
      }
    }

    // Re-add in optimized order
    cacheEntries.forEach(({ key, value }) => {
      try {
        localStorage.setItem(key, value);
      } catch {
        // Skip if quota exceeded
      }
    });
  }

  private deleteFromLevel(key: string, level: string): Promise<boolean> {
    switch (level) {
      case 'memory':
        this.memoryCache.delete(key);
        this.removeLRUNode(key);
        return Promise.resolve(true);

      case 'local':
        localStorage.removeItem(`cache_${key}`);
        return Promise.resolve(true);

      case 'session':
        sessionStorage.removeItem(`cache_${key}`);
        return Promise.resolve(true);

      case 'distributed':
        return this.deleteFromDistributed(key);

      default:
        return Promise.resolve(false);
    }
  }

  private async deleteFromDistributed(key: string): Promise<boolean> {
    if (!this.config.distributedCache.endpoint) {
      return false;
    }

    try {
      const response = await fetch(`${this.config.distributedCache.endpoint}/delete/${key}`, {
        method: 'DELETE',
        signal: AbortSignal.timeout(this.config.distributedCache.timeout)
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private clearLevel(level: string): Promise<boolean> {
    switch (level) {
      case 'memory':
        this.memoryCache.clear();
        this.nodeMap.clear();
        this.lruHead = null;
        this.lruTail = null;
        return Promise.resolve(true);

      case 'local':
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const key = localStorage.key(i);
          if (key?.startsWith('cache_')) {
            localStorage.removeItem(key);
          }
        }
        return Promise.resolve(true);

      case 'session':
        for (let i = sessionStorage.length - 1; i >= 0; i--) {
          const key = sessionStorage.key(i);
          if (key?.startsWith('cache_')) {
            sessionStorage.removeItem(key);
          }
        }
        return Promise.resolve(true);

      default:
        return Promise.resolve(false);
    }
  }

  private getFromSessionStorage<T>(key: string): T | null {
    try {
      const stored = sessionStorage.getItem(`cache_${key}`);
      if (!stored) return null;

      const entry: CacheEntry<T> = JSON.parse(stored);
      if (this.isExpired(entry)) {
        sessionStorage.removeItem(`cache_${key}`);
        return null;
      }

      return entry.value;
    } catch {
      return null;
    }
  }

  private setInSessionStorage<T>(
    key: string,
    value: T,
    ttl: number,
    compress?: boolean
  ): boolean {
    try {
      const entry: CacheEntry<T> = {
        key,
        value,
        timestamp: Date.now(),
        ttl: ttl * 1000,
        accessCount: 0,
        lastAccess: Date.now(),
        size: this.calculateSize(value),
        compressed: false
      };

      sessionStorage.setItem(`cache_${key}`, JSON.stringify(entry));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    if (this.compressionWorker) {
      this.compressionWorker.terminate();
      this.compressionWorker = null;
    }

    this.memoryCache.clear();
    this.nodeMap.clear();
    this.prefetchQueue = [];
    this.lruHead = null;
    this.lruTail = null;
  }
}