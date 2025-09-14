/**
 * Cleanup Manager - Event cleanup and memory management utilities
 * @description Manages event listener cleanup and prevents memory leaks
 */

/**
 * Cleanup task function type
 */
export type CleanupTask = () => void | Promise<void>;

/**
 * Resource tracking information
 */
export interface ResourceTracker {
  /** Unique resource ID */
  id: string;
  /** Resource type */
  type: 'event-listener' | 'timer' | 'subscription' | 'observer' | 'connection' | 'custom';
  /** Resource name/description */
  name: string;
  /** Cleanup function */
  cleanup: CleanupTask;
  /** Creation timestamp */
  created: number;
  /** Last access timestamp */
  lastAccessed: number;
  /** Resource metadata */
  metadata?: Record<string, unknown>;
  /** Priority for cleanup order (higher first) */
  priority: number;
  /** Whether resource is critical (won't be auto-cleaned) */
  critical: boolean;
}

/**
 * Cleanup group configuration
 */
export interface CleanupGroup {
  /** Group ID */
  id: string;
  /** Group name */
  name: string;
  /** Resources in this group */
  resources: Set<string>;
  /** Group cleanup order priority */
  priority: number;
  /** Whether group should be cleaned up together */
  atomic: boolean;
  /** Group metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Memory leak detection configuration
 */
export interface LeakDetectionConfig {
  /** Enable leak detection */
  enabled: boolean;
  /** Check interval in milliseconds */
  checkInterval: number;
  /** Resource age threshold for leak detection (ms) */
  ageThreshold: number;
  /** Maximum number of resources before warning */
  maxResources: number;
  /** Callback when leak is detected */
  onLeakDetected?: (resource: ResourceTracker) => void;
}

/**
 * Cleanup statistics
 */
export interface CleanupStatistics {
  /** Total resources tracked */
  totalTracked: number;
  /** Total resources cleaned up */
  totalCleaned: number;
  /** Resources by type */
  byType: Record<string, number>;
  /** Active resources count */
  activeResources: number;
  /** Memory leaks detected */
  leaksDetected: number;
  /** Average resource lifetime */
  averageLifetime: number;
  /** Cleanup performance */
  performance: {
    averageCleanupTime: number;
    totalCleanupTime: number;
    failedCleanups: number;
  };
}

/**
 * Cleanup execution result
 */
export interface CleanupResult {
  /** Whether cleanup was successful */
  success: boolean;
  /** Number of resources cleaned */
  resourcesCleaned: number;
  /** Number of failed cleanups */
  failed: number;
  /** Total cleanup time */
  totalTime: number;
  /** Individual cleanup results */
  results: Array<{
    resourceId: string;
    success: boolean;
    error?: Error;
    time: number;
  }>;
}

/**
 * Advanced cleanup manager with leak detection and resource tracking
 */
export class AdvancedCleanupManager {
  private resources = new Map<string, ResourceTracker>();
  private groups = new Map<string, CleanupGroup>();
  private leakDetectionTimer?: number;
  private statistics: CleanupStatistics = this.initializeStatistics();
  private leakDetectionConfig: LeakDetectionConfig = {
    enabled: true,
    checkInterval: 60000, // 1 minute
    ageThreshold: 300000, // 5 minutes
    maxResources: 1000
  };
  private debugMode = false;
  private isShuttingDown = false;

  constructor(options: {
    leakDetectionConfig?: Partial<LeakDetectionConfig>;
    debugMode?: boolean;
    autoStart?: boolean;
  } = {}) {
    this.leakDetectionConfig = { ...this.leakDetectionConfig, ...options.leakDetectionConfig };
    this.debugMode = options.debugMode || false;

    if (options.autoStart !== false) {
      this.startLeakDetection();
    }

    // Set up global cleanup on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => this.shutdown());
    }

    // Set up process cleanup for Node.js
    if (typeof process !== 'undefined') {
      process.on('exit', () => this.shutdown());
      process.on('SIGTERM', () => this.shutdown());
      process.on('SIGINT', () => this.shutdown());
    }
  }

  /**
   * Track a resource for cleanup
   */
  public trackResource(
    type: ResourceTracker['type'],
    name: string,
    cleanup: CleanupTask,
    options: {
      priority?: number;
      critical?: boolean;
      metadata?: Record<string, unknown>;
      groupId?: string;
    } = {}
  ): string {
    const id = this.generateResourceId();
    const now = Date.now();

    const resource: ResourceTracker = {
      id,
      type,
      name,
      cleanup,
      created: now,
      lastAccessed: now,
      metadata: options.metadata,
      priority: options.priority || 0,
      critical: options.critical || false
    };

    this.resources.set(id, resource);
    this.statistics.totalTracked++;
    this.statistics.byType[type] = (this.statistics.byType[type] || 0) + 1;
    this.statistics.activeResources++;

    // Add to group if specified
    if (options.groupId) {
      const group = this.groups.get(options.groupId);
      if (group) {
        group.resources.add(id);
      }
    }

    if (this.debugMode) {
      console.log(`[CleanupManager] Tracking resource: ${name} (${type}) - ${id}`);
    }

    return id;
  }

  /**
   * Track an event listener
   */
  public trackEventListener(
    target: EventTarget,
    event: string,
    listener: EventListener,
    options?: AddEventListenerOptions
  ): string {
    return this.trackResource(
      'event-listener',
      `${target.constructor.name}:${event}`,
      () => target.removeEventListener(event, listener, options),
      {
        metadata: { event, target: target.constructor.name, options }
      }
    );
  }

  /**
   * Track a timer (setTimeout/setInterval)
   */
  public trackTimer(timerId: number, type: 'timeout' | 'interval'): string {
    return this.trackResource(
      'timer',
      `${type}:${timerId}`,
      () => {
        if (type === 'timeout') {
          clearTimeout(timerId);
        } else {
          clearInterval(timerId);
        }
      },
      {
        metadata: { timerId, type }
      }
    );
  }

  /**
   * Track a subscription (e.g., RxJS, EventEmitter)
   */
  public trackSubscription(
    name: string,
    unsubscribe: () => void,
    metadata?: Record<string, unknown>
  ): string {
    return this.trackResource(
      'subscription',
      name,
      unsubscribe,
      { metadata }
    );
  }

  /**
   * Track an observer (e.g., MutationObserver, IntersectionObserver)
   */
  public trackObserver(
    observer: { disconnect: () => void },
    name: string,
    metadata?: Record<string, unknown>
  ): string {
    return this.trackResource(
      'observer',
      name,
      () => observer.disconnect(),
      { metadata }
    );
  }

  /**
   * Create a cleanup group
   */
  public createGroup(
    id: string,
    name: string,
    options: {
      priority?: number;
      atomic?: boolean;
      metadata?: Record<string, unknown>;
    } = {}
  ): void {
    const group: CleanupGroup = {
      id,
      name,
      resources: new Set(),
      priority: options.priority || 0,
      atomic: options.atomic || false,
      metadata: options.metadata
    };

    this.groups.set(id, group);

    if (this.debugMode) {
      console.log(`[CleanupManager] Created cleanup group: ${name} - ${id}`);
    }
  }

  /**
   * Add resource to a group
   */
  public addToGroup(resourceId: string, groupId: string): boolean {
    const resource = this.resources.get(resourceId);
    const group = this.groups.get(groupId);

    if (resource && group) {
      group.resources.add(resourceId);
      if (this.debugMode) {
        console.log(`[CleanupManager] Added resource ${resourceId} to group ${groupId}`);
      }
      return true;
    }

    return false;
  }

  /**
   * Clean up a specific resource
   */
  public async cleanupResource(resourceId: string): Promise<boolean> {
    const resource = this.resources.get(resourceId);
    if (!resource) {
      return false;
    }

    const startTime = performance.now();

    try {
      await resource.cleanup();
      this.resources.delete(resourceId);
      this.statistics.totalCleaned++;
      this.statistics.activeResources--;
      
      const cleanupTime = performance.now() - startTime;
      this.statistics.performance.totalCleanupTime += cleanupTime;
      this.updateAverageCleanupTime();

      if (this.debugMode) {
        console.log(`[CleanupManager] Cleaned up resource: ${resource.name} - ${resourceId}`);
      }

      return true;

    } catch (error) {
      this.statistics.performance.failedCleanups++;
      
      if (this.debugMode) {
        console.error(`[CleanupManager] Failed to cleanup resource ${resourceId}:`, error);
      }

      return false;
    }
  }

  /**
   * Clean up resources by type
   */
  public async cleanupByType(type: ResourceTracker['type']): Promise<CleanupResult> {
    const resources = Array.from(this.resources.values()).filter(r => r.type === type);
    return this.cleanupResources(resources.map(r => r.id));
  }

  /**
   * Clean up a group of resources
   */
  public async cleanupGroup(groupId: string): Promise<CleanupResult> {
    const group = this.groups.get(groupId);
    if (!group) {
      return {
        success: false,
        resourcesCleaned: 0,
        failed: 0,
        totalTime: 0,
        results: []
      };
    }

    const resourceIds = Array.from(group.resources);
    const result = await this.cleanupResources(resourceIds, group.atomic);

    // Remove the group after cleanup
    this.groups.delete(groupId);

    if (this.debugMode) {
      console.log(`[CleanupManager] Cleaned up group: ${group.name} - ${resourceIds.length} resources`);
    }

    return result;
  }

  /**
   * Clean up multiple resources
   */
  public async cleanupResources(
    resourceIds: string[],
    atomic = false
  ): Promise<CleanupResult> {
    const startTime = performance.now();
    const results: CleanupResult['results'] = [];
    let resourcesCleaned = 0;
    let failed = 0;

    if (atomic) {
      // Atomic cleanup - all or nothing
      try {
        for (const resourceId of resourceIds) {
          const resource = this.resources.get(resourceId);
          if (resource) {
            const resourceStart = performance.now();
            await resource.cleanup();
            results.push({
              resourceId,
              success: true,
              time: performance.now() - resourceStart
            });
            resourcesCleaned++;
          }
        }

        // Remove all resources only if all succeeded
        resourceIds.forEach(id => this.resources.delete(id));

      } catch (error) {
        failed = resourceIds.length;
        results.forEach(r => r.success = false);
      }

    } else {
      // Individual cleanup
      for (const resourceId of resourceIds) {
        const resourceStart = performance.now();
        const success = await this.cleanupResource(resourceId);
        
        results.push({
          resourceId,
          success,
          time: performance.now() - resourceStart
        });

        if (success) {
          resourcesCleaned++;
        } else {
          failed++;
        }
      }
    }

    const totalTime = performance.now() - startTime;

    return {
      success: failed === 0,
      resourcesCleaned,
      failed,
      totalTime,
      results
    };
  }

  /**
   * Clean up all resources
   */
  public async cleanupAll(respectCritical = true): Promise<CleanupResult> {
    const resources = Array.from(this.resources.values());
    const resourcesToClean = respectCritical 
      ? resources.filter(r => !r.critical)
      : resources;

    // Sort by priority (higher priority cleaned first)
    resourcesToClean.sort((a, b) => b.priority - a.priority);

    return this.cleanupResources(resourcesToClean.map(r => r.id));
  }

  /**
   * Start leak detection monitoring
   */
  public startLeakDetection(): void {
    if (!this.leakDetectionConfig.enabled || this.leakDetectionTimer) {
      return;
    }

    this.leakDetectionTimer = window.setInterval(() => {
      this.checkForLeaks();
    }, this.leakDetectionConfig.checkInterval);

    if (this.debugMode) {
      console.log('[CleanupManager] Started leak detection monitoring');
    }
  }

  /**
   * Stop leak detection monitoring
   */
  public stopLeakDetection(): void {
    if (this.leakDetectionTimer) {
      clearInterval(this.leakDetectionTimer);
      this.leakDetectionTimer = undefined;

      if (this.debugMode) {
        console.log('[CleanupManager] Stopped leak detection monitoring');
      }
    }
  }

  /**
   * Check for memory leaks
   */
  public checkForLeaks(): void {
    const now = Date.now();
    const { ageThreshold, maxResources, onLeakDetected } = this.leakDetectionConfig;

    // Check resource count
    if (this.resources.size > maxResources) {
      if (this.debugMode) {
        console.warn(`[CleanupManager] Resource count exceeded limit: ${this.resources.size} > ${maxResources}`);
      }
    }

    // Check for old resources
    for (const resource of this.resources.values()) {
      const age = now - resource.lastAccessed;
      
      if (age > ageThreshold && !resource.critical) {
        this.statistics.leaksDetected++;
        
        if (this.debugMode) {
          console.warn(`[CleanupManager] Potential leak detected: ${resource.name} (age: ${age}ms)`);
        }

        if (onLeakDetected) {
          onLeakDetected(resource);
        }
      }
    }
  }

  /**
   * Get cleanup statistics
   */
  public getStatistics(): CleanupStatistics {
    this.calculateAverageLifetime();
    return { ...this.statistics };
  }

  /**
   * Get resource information
   */
  public getResourceInfo(resourceId?: string): ResourceTracker[] | ResourceTracker | undefined {
    if (resourceId) {
      return this.resources.get(resourceId);
    }
    return Array.from(this.resources.values());
  }

  /**
   * Get active resource count
   */
  public getActiveResourceCount(): number {
    return this.resources.size;
  }

  /**
   * Get resources by type
   */
  public getResourcesByType(type: ResourceTracker['type']): ResourceTracker[] {
    return Array.from(this.resources.values()).filter(r => r.type === type);
  }

  /**
   * Access a resource (updates lastAccessed timestamp)
   */
  public accessResource(resourceId: string): boolean {
    const resource = this.resources.get(resourceId);
    if (resource) {
      resource.lastAccessed = Date.now();
      return true;
    }
    return false;
  }

  /**
   * Shutdown cleanup manager and clean up all resources
   */
  public async shutdown(): Promise<CleanupResult> {
    if (this.isShuttingDown) {
      return {
        success: true,
        resourcesCleaned: 0,
        failed: 0,
        totalTime: 0,
        results: []
      };
    }

    this.isShuttingDown = true;
    this.stopLeakDetection();

    if (this.debugMode) {
      console.log('[CleanupManager] Shutting down and cleaning up all resources');
    }

    const result = await this.cleanupAll(false); // Don't respect critical flag during shutdown

    if (this.debugMode) {
      console.log(`[CleanupManager] Shutdown complete: ${result.resourcesCleaned} resources cleaned, ${result.failed} failed`);
    }

    return result;
  }

  /**
   * Reset statistics
   */
  public resetStatistics(): void {
    this.statistics = this.initializeStatistics();
    this.statistics.activeResources = this.resources.size;
  }

  /**
   * Generate unique resource ID
   */
  private generateResourceId(): string {
    return `resource_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Initialize statistics
   */
  private initializeStatistics(): CleanupStatistics {
    return {
      totalTracked: 0,
      totalCleaned: 0,
      byType: {},
      activeResources: 0,
      leaksDetected: 0,
      averageLifetime: 0,
      performance: {
        averageCleanupTime: 0,
        totalCleanupTime: 0,
        failedCleanups: 0
      }
    };
  }

  /**
   * Update average cleanup time
   */
  private updateAverageCleanupTime(): void {
    if (this.statistics.totalCleaned > 0) {
      this.statistics.performance.averageCleanupTime = 
        this.statistics.performance.totalCleanupTime / this.statistics.totalCleaned;
    }
  }

  /**
   * Calculate average resource lifetime
   */
  private calculateAverageLifetime(): void {
    const now = Date.now();
    let totalLifetime = 0;
    let count = 0;

    for (const resource of this.resources.values()) {
      totalLifetime += now - resource.created;
      count++;
    }

    this.statistics.averageLifetime = count > 0 ? totalLifetime / count : 0;
  }
}

/**
 * Cleanup utilities for common patterns
 */
export class CleanupUtils {
  /**
   * Create a cleanup function that combines multiple cleanup tasks
   */
  static combine(...cleanupTasks: CleanupTask[]): CleanupTask {
    return async () => {
      const promises = cleanupTasks.map(async (task) => {
        try {
          await task();
        } catch (error) {
          console.error('Cleanup task failed:', error);
        }
      });
      
      await Promise.all(promises);
    };
  }

  /**
   * Create a debounced cleanup function
   */
  static debounce(cleanup: CleanupTask, delay: number): CleanupTask {
    let timeoutId: number | undefined;
    
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      timeoutId = window.setTimeout(async () => {
        await cleanup();
        timeoutId = undefined;
      }, delay);
    };
  }

  /**
   * Create a cleanup function with retry logic
   */
  static withRetry(cleanup: CleanupTask, maxRetries = 3, delay = 1000): CleanupTask {
    return async () => {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          await cleanup();
          return; // Success
        } catch (error) {
          if (attempt === maxRetries) {
            throw error; // Final attempt failed
          }
          
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, delay * attempt));
        }
      }
    };
  }
}

/**
 * Global cleanup manager instance
 */
export const cleanupManager = new AdvancedCleanupManager({
  debugMode: process.env.NODE_ENV === 'development'
});