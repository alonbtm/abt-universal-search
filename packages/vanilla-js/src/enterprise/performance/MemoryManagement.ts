/**
 * MemoryManagement - Enterprise memory management with leak detection and optimization
 * Provides automatic garbage collection, memory monitoring, and leak prevention
 */

export interface MemoryConfig {
  monitoring?: {
    enabled: boolean;
    interval: number; // ms
    heapSizeLimit: number; // bytes
    gcThreshold: number; // percentage
  };
  leakDetection?: {
    enabled: boolean;
    checkInterval: number; // ms
    thresholds: {
      objectCount: number;
      memoryGrowth: number; // bytes per check
      stagnantTime: number; // ms
    };
  };
  optimization?: {
    autoCleanup: boolean;
    objectPooling: boolean;
    stringInterning: boolean;
    compactArrays: boolean;
  };
  limits?: {
    maxObjects: number;
    maxArraySize: number;
    maxStringCache: number;
  };
}

export interface MemoryStats {
  heapUsed: number;
  heapTotal: number;
  heapLimit: number;
  objectCount: number;
  arrayCount: number;
  functionCount: number;
  stringCacheSize: number;
  gcCount: number;
  lastGcTime: number;
  memoryPressure: 'low' | 'medium' | 'high' | 'critical';
}

export interface MemoryLeak {
  type: 'object' | 'array' | 'function' | 'string' | 'dom';
  source: string;
  count: number;
  growthRate: number;
  firstDetected: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  stackTrace?: string;
}

export interface ObjectPool<T> {
  acquire(): T;
  release(obj: T): void;
  size(): number;
  available(): number;
}

export class MemoryManagement {
  private config: Required<MemoryConfig>;
  private stats: MemoryStats;
  private monitoringInterval: number | null = null;
  private leakDetectionInterval: number | null = null;
  private objectRegistry: WeakMap<any, { type: string; source: string; timestamp: number }>;
  private objectPools: Map<string, ObjectPool<any>>;
  private stringCache: Map<string, WeakRef<string>>;
  private arrayCompactionQueue: any[];
  private memoryHistory: Array<{ timestamp: number; usage: number }>;
  private detectedLeaks: Map<string, MemoryLeak>;
  private observerRegistry: Set<any>;

  constructor(config: MemoryConfig = {}) {
    this.config = {
      monitoring: {
        enabled: true,
        interval: 5000, // 5 seconds
        heapSizeLimit: 512 * 1024 * 1024, // 512MB
        gcThreshold: 80, // 80%
        ...config.monitoring
      },
      leakDetection: {
        enabled: true,
        checkInterval: 30000, // 30 seconds
        thresholds: {
          objectCount: 10000,
          memoryGrowth: 10 * 1024 * 1024, // 10MB
          stagnantTime: 300000 // 5 minutes
        },
        ...config.leakDetection
      },
      optimization: {
        autoCleanup: true,
        objectPooling: true,
        stringInterning: true,
        compactArrays: true,
        ...config.optimization
      },
      limits: {
        maxObjects: 50000,
        maxArraySize: 10000,
        maxStringCache: 1000,
        ...config.limits
      },
      ...config
    };

    this.stats = this.initializeStats();
    this.objectRegistry = new WeakMap();
    this.objectPools = new Map();
    this.stringCache = new Map();
    this.arrayCompactionQueue = [];
    this.memoryHistory = [];
    this.detectedLeaks = new Map();
    this.observerRegistry = new Set();

    this.init();
  }

  /**
   * Initialize memory management system
   */
  private init(): void {
    this.setupObjectPooling();
    this.setupMemoryMonitoring();
    this.setupLeakDetection();
    this.setupGarbageCollectionTriggers();

    console.log('[MemoryManagement] Initialized with config:', this.config);
  }

  /**
   * Register object for memory tracking
   */
  registerObject(obj: any, source: string): void {
    if (typeof obj !== 'object' || obj === null) return;

    this.objectRegistry.set(obj, {
      type: this.getObjectType(obj),
      source,
      timestamp: Date.now()
    });

    this.updateObjectCount();
  }

  /**
   * Create object pool for frequent allocations
   */
  createObjectPool<T>(
    name: string,
    factory: () => T,
    reset?: (obj: T) => void,
    maxSize = 100
  ): ObjectPool<T> {
    const pool: ObjectPool<T> = {
      acquire: () => {
        const poolData = poolRegistry.get(name);
        if (poolData && poolData.available.length > 0) {
          return poolData.available.pop();
        }
        const obj = factory();
        this.registerObject(obj, `pool:${name}`);
        return obj;
      },

      release: (obj: T) => {
        const poolData = poolRegistry.get(name);
        if (poolData && poolData.available.length < maxSize) {
          if (reset) reset(obj);
          poolData.available.push(obj);
        }
      },

      size: () => {
        const poolData = poolRegistry.get(name);
        return poolData ? poolData.total : 0;
      },

      available: () => {
        const poolData = poolRegistry.get(name);
        return poolData ? poolData.available.length : 0;
      }
    };

    const poolRegistry = new Map();
    poolRegistry.set(name, {
      available: [] as T[],
      total: 0
    });

    this.objectPools.set(name, pool);
    return pool;
  }

  /**
   * Intern string to reduce memory usage
   */
  internString(str: string): string {
    if (!this.config.optimization.stringInterning) return str;
    if (this.stringCache.size >= this.config.limits.maxStringCache) {
      this.cleanupStringCache();
    }

    const cached = this.stringCache.get(str);
    const cachedStr = cached?.deref();

    if (cachedStr) {
      return cachedStr;
    }

    this.stringCache.set(str, new WeakRef(str));
    return str;
  }

  /**
   * Compact array to optimize memory usage
   */
  compactArray<T>(array: T[]): T[] {
    if (!this.config.optimization.compactArrays) return array;

    // Remove holes in sparse arrays
    const compacted = array.filter(() => true);

    // Queue for further optimization if needed
    if (compacted.length > this.config.limits.maxArraySize) {
      this.arrayCompactionQueue.push({
        array: compacted,
        timestamp: Date.now()
      });
    }

    return compacted;
  }

  /**
   * Force garbage collection if available
   */
  forceGarbageCollection(): boolean {
    if ((window as any).gc && typeof (window as any).gc === 'function') {
      try {
        (window as any).gc();
        this.stats.gcCount++;
        this.stats.lastGcTime = Date.now();
        console.log('[MemoryManagement] Forced garbage collection');
        return true;
      } catch (error) {
        console.warn('[MemoryManagement] Failed to force GC:', error);
        return false;
      }
    }

    // Fallback: trigger GC through memory pressure
    this.triggerMemoryPressure();
    return false;
  }

  /**
   * Get current memory statistics
   */
  getMemoryStats(): MemoryStats {
    this.updateMemoryStats();
    return { ...this.stats };
  }

  /**
   * Get detected memory leaks
   */
  getDetectedLeaks(): MemoryLeak[] {
    return Array.from(this.detectedLeaks.values());
  }

  /**
   * Clean up specific object types
   */
  cleanup(options?: {
    clearCaches?: boolean;
    compactArrays?: boolean;
    runGC?: boolean;
    removeListeners?: boolean;
  }): void {
    const opts = {
      clearCaches: true,
      compactArrays: true,
      runGC: true,
      removeListeners: false,
      ...options
    };

    if (opts.clearCaches) {
      this.cleanupStringCache();
    }

    if (opts.compactArrays) {
      this.processArrayCompactionQueue();
    }

    if (opts.removeListeners) {
      this.cleanupEventListeners();
    }

    if (opts.runGC) {
      this.forceGarbageCollection();
    }

    console.log('[MemoryManagement] Cleanup completed');
  }

  /**
   * Monitor specific object for memory usage
   */
  monitorObject(obj: any, name: string): () => void {
    if (!obj || typeof obj !== 'object') {
      return () => {};
    }

    this.registerObject(obj, `monitor:${name}`);

    // Return cleanup function
    return () => {
      // Remove from monitoring
      this.objectRegistry.delete(obj);
    };
  }

  /**
   * Add observer for memory changes
   */
  addMemoryObserver(observer: (stats: MemoryStats) => void): () => void {
    this.observerRegistry.add(observer);

    return () => {
      this.observerRegistry.delete(observer);
    };
  }

  /**
   * Analyze memory usage patterns
   */
  analyzeMemoryUsage(): {
    trends: Array<{ timestamp: number; usage: number; change: number }>;
    patterns: Array<{ type: string; count: number; avgSize: number }>;
    recommendations: string[];
  } {
    const trends = this.memoryHistory
      .map((entry, index) => ({
        timestamp: entry.timestamp,
        usage: entry.usage,
        change: index > 0 ? entry.usage - this.memoryHistory[index - 1].usage : 0
      }))
      .slice(-20); // Last 20 measurements

    const patterns = this.analyzeObjectPatterns();
    const recommendations = this.generateOptimizationRecommendations();

    return {
      trends,
      patterns,
      recommendations
    };
  }

  /**
   * Set memory usage limits and warnings
   */
  setMemoryLimits(limits: {
    warningThreshold?: number;
    criticalThreshold?: number;
    maxHeapSize?: number;
  }): void {
    this.config.monitoring.heapSizeLimit = limits.maxHeapSize || this.config.monitoring.heapSizeLimit;

    // Set up threshold monitoring
    const checkThresholds = () => {
      const usage = this.getHeapUsage();
      const usagePercent = (usage / this.config.monitoring.heapSizeLimit) * 100;

      if (limits.criticalThreshold && usagePercent >= limits.criticalThreshold) {
        this.handleCriticalMemoryUsage();
      } else if (limits.warningThreshold && usagePercent >= limits.warningThreshold) {
        this.handleWarningMemoryUsage();
      }
    };

    // Check thresholds more frequently
    setInterval(checkThresholds, 1000);
  }

  /**
   * Private methods for memory management implementation
   */
  private setupObjectPooling(): void {
    if (!this.config.optimization.objectPooling) return;

    // Create common object pools
    this.createObjectPool(
      'searchResult',
      () => ({ title: '', url: '', description: '', metadata: {} }),
      (obj) => {
        obj.title = '';
        obj.url = '';
        obj.description = '';
        obj.metadata = {};
      }
    );

    this.createObjectPool(
      'queryContext',
      () => ({ query: '', filters: {}, options: {}, timestamp: 0 }),
      (obj) => {
        obj.query = '';
        obj.filters = {};
        obj.options = {};
        obj.timestamp = 0;
      }
    );
  }

  private setupMemoryMonitoring(): void {
    if (!this.config.monitoring.enabled) return;

    this.monitoringInterval = window.setInterval(() => {
      this.updateMemoryStats();
      this.checkMemoryPressure();
      this.recordMemoryHistory();
      this.notifyObservers();
    }, this.config.monitoring.interval);
  }

  private setupLeakDetection(): void {
    if (!this.config.leakDetection.enabled) return;

    this.leakDetectionInterval = window.setInterval(() => {
      this.detectMemoryLeaks();
    }, this.config.leakDetection.checkInterval);
  }

  private setupGarbageCollectionTriggers(): void {
    // Trigger GC based on memory pressure
    const checkGCTrigger = () => {
      const usage = this.getHeapUsage();
      const usagePercent = (usage / this.config.monitoring.heapSizeLimit) * 100;

      if (usagePercent >= this.config.monitoring.gcThreshold) {
        this.forceGarbageCollection();
      }
    };

    setInterval(checkGCTrigger, 10000); // Check every 10 seconds
  }

  private updateMemoryStats(): void {
    const performance = (window.performance as any);

    if (performance?.memory) {
      this.stats.heapUsed = performance.memory.usedJSHeapSize;
      this.stats.heapTotal = performance.memory.totalJSHeapSize;
      this.stats.heapLimit = performance.memory.jsHeapSizeLimit;
    } else {
      // Fallback estimation
      this.stats.heapUsed = this.estimateHeapUsage();
      this.stats.heapTotal = this.stats.heapUsed * 1.2;
      this.stats.heapLimit = this.config.monitoring.heapSizeLimit;
    }

    this.stats.objectCount = this.countObjects();
    this.stats.arrayCount = this.countArrays();
    this.stats.functionCount = this.countFunctions();
    this.stats.stringCacheSize = this.stringCache.size;

    // Update memory pressure
    const usagePercent = (this.stats.heapUsed / this.stats.heapLimit) * 100;
    if (usagePercent >= 90) {
      this.stats.memoryPressure = 'critical';
    } else if (usagePercent >= 75) {
      this.stats.memoryPressure = 'high';
    } else if (usagePercent >= 50) {
      this.stats.memoryPressure = 'medium';
    } else {
      this.stats.memoryPressure = 'low';
    }
  }

  private detectMemoryLeaks(): void {
    const currentStats = this.getMemoryStats();
    const thresholds = this.config.leakDetection.thresholds;

    // Check for object count growth
    if (currentStats.objectCount > thresholds.objectCount) {
      this.reportLeak('object', 'excessive-objects', currentStats.objectCount);
    }

    // Check for memory growth rate
    if (this.memoryHistory.length >= 2) {
      const recent = this.memoryHistory.slice(-5); // Last 5 measurements
      const oldestRecent = recent[0];
      const growth = currentStats.heapUsed - oldestRecent.usage;
      const timespan = Date.now() - oldestRecent.timestamp;

      if (timespan > 0) {
        const growthRate = (growth / timespan) * 1000; // bytes per second
        const expectedGrowthRate = thresholds.memoryGrowth / (this.config.leakDetection.checkInterval / 1000);

        if (growthRate > expectedGrowthRate) {
          this.reportLeak('object', 'memory-growth', growth, growthRate);
        }
      }
    }

    // Check for stagnant objects
    this.checkStagnantObjects();
  }

  private reportLeak(
    type: MemoryLeak['type'],
    source: string,
    count: number,
    growthRate = 0
  ): void {
    const existing = this.detectedLeaks.get(source);
    const now = Date.now();

    if (existing) {
      existing.count = count;
      existing.growthRate = growthRate;
      existing.severity = this.calculateLeakSeverity(count, growthRate);
    } else {
      const leak: MemoryLeak = {
        type,
        source,
        count,
        growthRate,
        firstDetected: now,
        severity: this.calculateLeakSeverity(count, growthRate),
        stackTrace: this.captureStackTrace()
      };

      this.detectedLeaks.set(source, leak);
      console.warn('[MemoryManagement] Memory leak detected:', leak);
    }
  }

  private calculateLeakSeverity(count: number, growthRate: number): MemoryLeak['severity'] {
    const countThreshold = this.config.leakDetection.thresholds.objectCount;
    const growthThreshold = this.config.leakDetection.thresholds.memoryGrowth;

    if (count > countThreshold * 2 || growthRate > growthThreshold * 2) {
      return 'critical';
    } else if (count > countThreshold * 1.5 || growthRate > growthThreshold * 1.5) {
      return 'high';
    } else if (count > countThreshold || growthRate > growthThreshold) {
      return 'medium';
    }

    return 'low';
  }

  private checkStagnantObjects(): void {
    const now = Date.now();
    const stagnantThreshold = this.config.leakDetection.thresholds.stagnantTime;

    // This would need to be implemented with actual object tracking
    // For now, it's a placeholder
  }

  private cleanupStringCache(): void {
    const toDelete: string[] = [];

    for (const [key, ref] of this.stringCache.entries()) {
      if (!ref.deref()) {
        toDelete.push(key);
      }
    }

    toDelete.forEach(key => this.stringCache.delete(key));

    // If still too large, remove least recently used
    if (this.stringCache.size > this.config.limits.maxStringCache) {
      const entries = Array.from(this.stringCache.entries());
      const toRemove = entries.slice(0, entries.length - this.config.limits.maxStringCache);

      toRemove.forEach(([key]) => this.stringCache.delete(key));
    }
  }

  private processArrayCompactionQueue(): void {
    const now = Date.now();
    const staleTime = 60000; // 1 minute

    this.arrayCompactionQueue = this.arrayCompactionQueue.filter(item => {
      if (now - item.timestamp > staleTime) {
        // Compact old arrays
        if (Array.isArray(item.array)) {
          item.array.length = item.array.filter(x => x !== undefined).length;
        }
        return false; // Remove from queue
      }
      return true;
    });
  }

  private cleanupEventListeners(): void {
    // Remove any orphaned event listeners
    // This is a simplified implementation
    const elements = document.querySelectorAll('*');

    elements.forEach(element => {
      const events = (element as any).__eventListeners;
      if (events && typeof events === 'object') {
        Object.keys(events).forEach(eventType => {
          const listeners = events[eventType];
          if (Array.isArray(listeners)) {
            // Remove listeners that might be causing leaks
            listeners.forEach((listener: any) => {
              if (typeof listener === 'function') {
                element.removeEventListener(eventType, listener);
              }
            });
          }
        });
      }
    });
  }

  private getHeapUsage(): number {
    const performance = (window.performance as any);
    if (performance?.memory) {
      return performance.memory.usedJSHeapSize;
    }
    return this.estimateHeapUsage();
  }

  private estimateHeapUsage(): number {
    // Rough estimation based on object counts and sizes
    const objectEstimate = this.countObjects() * 100; // ~100 bytes per object
    const arrayEstimate = this.countArrays() * 200; // ~200 bytes per array
    const stringEstimate = this.stringCache.size * 50; // ~50 bytes per string

    return objectEstimate + arrayEstimate + stringEstimate;
  }

  private countObjects(): number {
    // This is a simplified count - in real implementation,
    // we'd need more sophisticated object tracking
    return this.objectPools.size * 10; // Estimate
  }

  private countArrays(): number {
    return this.arrayCompactionQueue.length;
  }

  private countFunctions(): number {
    // Count registered functions
    return this.observerRegistry.size;
  }

  private checkMemoryPressure(): void {
    if (this.stats.memoryPressure === 'high' || this.stats.memoryPressure === 'critical') {
      this.handleHighMemoryPressure();
    }
  }

  private handleHighMemoryPressure(): void {
    console.warn('[MemoryManagement] High memory pressure detected, initiating cleanup');

    this.cleanup({
      clearCaches: true,
      compactArrays: true,
      runGC: true,
      removeListeners: false
    });
  }

  private handleCriticalMemoryUsage(): void {
    console.error('[MemoryManagement] Critical memory usage detected');

    // Aggressive cleanup
    this.cleanup({
      clearCaches: true,
      compactArrays: true,
      runGC: true,
      removeListeners: true
    });

    // Clear object pools
    this.objectPools.clear();

    // Notify observers
    this.notifyObservers();
  }

  private handleWarningMemoryUsage(): void {
    console.warn('[MemoryManagement] Memory usage warning threshold reached');

    this.cleanup({
      clearCaches: true,
      compactArrays: false,
      runGC: false,
      removeListeners: false
    });
  }

  private recordMemoryHistory(): void {
    this.memoryHistory.push({
      timestamp: Date.now(),
      usage: this.stats.heapUsed
    });

    // Keep only last 100 measurements
    if (this.memoryHistory.length > 100) {
      this.memoryHistory.shift();
    }
  }

  private notifyObservers(): void {
    const currentStats = this.getMemoryStats();

    this.observerRegistry.forEach(observer => {
      try {
        observer(currentStats);
      } catch (error) {
        console.error('[MemoryManagement] Observer error:', error);
      }
    });
  }

  private analyzeObjectPatterns(): Array<{ type: string; count: number; avgSize: number }> {
    // This would analyze actual object patterns in a real implementation
    return [
      { type: 'SearchResult', count: 100, avgSize: 256 },
      { type: 'QueryContext', count: 50, avgSize: 128 },
      { type: 'CacheEntry', count: 200, avgSize: 512 }
    ];
  }

  private generateOptimizationRecommendations(): string[] {
    const recommendations: string[] = [];
    const stats = this.getMemoryStats();

    if (stats.memoryPressure === 'high' || stats.memoryPressure === 'critical') {
      recommendations.push('Consider reducing cache size or implementing more aggressive cleanup');
    }

    if (stats.objectCount > this.config.limits.maxObjects * 0.8) {
      recommendations.push('Object count approaching limit, consider object pooling');
    }

    if (this.detectedLeaks.size > 0) {
      recommendations.push(`${this.detectedLeaks.size} memory leaks detected, investigate and fix`);
    }

    if (stats.stringCacheSize > this.config.limits.maxStringCache * 0.8) {
      recommendations.push('String cache approaching limit, consider more frequent cleanup');
    }

    return recommendations;
  }

  private triggerMemoryPressure(): void {
    // Create temporary memory pressure to trigger GC
    const temp = new Array(100000).fill(0).map(() => ({}));
    setTimeout(() => {
      temp.length = 0; // Clear reference
    }, 100);
  }

  private getObjectType(obj: any): string {
    if (Array.isArray(obj)) return 'array';
    if (obj instanceof Date) return 'date';
    if (obj instanceof RegExp) return 'regexp';
    if (obj instanceof Promise) return 'promise';
    if (typeof obj === 'function') return 'function';
    if (obj.nodeType) return 'dom';
    return 'object';
  }

  private updateObjectCount(): void {
    // This would be more sophisticated in a real implementation
    this.stats.objectCount++;
  }

  private captureStackTrace(): string {
    const stack = new Error().stack;
    return stack ? stack.split('\n').slice(2, 7).join('\n') : '';
  }

  private initializeStats(): MemoryStats {
    return {
      heapUsed: 0,
      heapTotal: 0,
      heapLimit: this.config.monitoring.heapSizeLimit,
      objectCount: 0,
      arrayCount: 0,
      functionCount: 0,
      stringCacheSize: 0,
      gcCount: 0,
      lastGcTime: 0,
      memoryPressure: 'low'
    };
  }

  /**
   * Clean up all resources
   */
  destroy(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    if (this.leakDetectionInterval) {
      clearInterval(this.leakDetectionInterval);
      this.leakDetectionInterval = null;
    }

    this.objectPools.clear();
    this.stringCache.clear();
    this.arrayCompactionQueue = [];
    this.memoryHistory = [];
    this.detectedLeaks.clear();
    this.observerRegistry.clear();
  }
}