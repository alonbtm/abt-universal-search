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
export declare class AdvancedCleanupManager {
    private resources;
    private groups;
    private leakDetectionTimer?;
    private statistics;
    private leakDetectionConfig;
    private debugMode;
    private isShuttingDown;
    constructor(options?: {
        leakDetectionConfig?: Partial<LeakDetectionConfig>;
        debugMode?: boolean;
        autoStart?: boolean;
    });
    /**
     * Track a resource for cleanup
     */
    trackResource(type: ResourceTracker['type'], name: string, cleanup: CleanupTask, options?: {
        priority?: number;
        critical?: boolean;
        metadata?: Record<string, unknown>;
        groupId?: string;
    }): string;
    /**
     * Track an event listener
     */
    trackEventListener(target: EventTarget, event: string, listener: EventListener, options?: AddEventListenerOptions): string;
    /**
     * Track a timer (setTimeout/setInterval)
     */
    trackTimer(timerId: number, type: 'timeout' | 'interval'): string;
    /**
     * Track a subscription (e.g., RxJS, EventEmitter)
     */
    trackSubscription(name: string, unsubscribe: () => void, metadata?: Record<string, unknown>): string;
    /**
     * Track an observer (e.g., MutationObserver, IntersectionObserver)
     */
    trackObserver(observer: {
        disconnect: () => void;
    }, name: string, metadata?: Record<string, unknown>): string;
    /**
     * Create a cleanup group
     */
    createGroup(id: string, name: string, options?: {
        priority?: number;
        atomic?: boolean;
        metadata?: Record<string, unknown>;
    }): void;
    /**
     * Add resource to a group
     */
    addToGroup(resourceId: string, groupId: string): boolean;
    /**
     * Clean up a specific resource
     */
    cleanupResource(resourceId: string): Promise<boolean>;
    /**
     * Clean up resources by type
     */
    cleanupByType(type: ResourceTracker['type']): Promise<CleanupResult>;
    /**
     * Clean up a group of resources
     */
    cleanupGroup(groupId: string): Promise<CleanupResult>;
    /**
     * Clean up multiple resources
     */
    cleanupResources(resourceIds: string[], atomic?: boolean): Promise<CleanupResult>;
    /**
     * Clean up all resources
     */
    cleanupAll(respectCritical?: boolean): Promise<CleanupResult>;
    /**
     * Start leak detection monitoring
     */
    startLeakDetection(): void;
    /**
     * Stop leak detection monitoring
     */
    stopLeakDetection(): void;
    /**
     * Check for memory leaks
     */
    checkForLeaks(): void;
    /**
     * Get cleanup statistics
     */
    getStatistics(): CleanupStatistics;
    /**
     * Get resource information
     */
    getResourceInfo(resourceId?: string): ResourceTracker[] | ResourceTracker | undefined;
    /**
     * Get active resource count
     */
    getActiveResourceCount(): number;
    /**
     * Get resources by type
     */
    getResourcesByType(type: ResourceTracker['type']): ResourceTracker[];
    /**
     * Access a resource (updates lastAccessed timestamp)
     */
    accessResource(resourceId: string): boolean;
    /**
     * Shutdown cleanup manager and clean up all resources
     */
    shutdown(): Promise<CleanupResult>;
    /**
     * Reset statistics
     */
    resetStatistics(): void;
    /**
     * Generate unique resource ID
     */
    private generateResourceId;
    /**
     * Initialize statistics
     */
    private initializeStatistics;
    /**
     * Update average cleanup time
     */
    private updateAverageCleanupTime;
    /**
     * Calculate average resource lifetime
     */
    private calculateAverageLifetime;
}
/**
 * Cleanup utilities for common patterns
 */
export declare class CleanupUtils {
    /**
     * Create a cleanup function that combines multiple cleanup tasks
     */
    static combine(...cleanupTasks: CleanupTask[]): CleanupTask;
    /**
     * Create a debounced cleanup function
     */
    static debounce(cleanup: CleanupTask, delay: number): CleanupTask;
    /**
     * Create a cleanup function with retry logic
     */
    static withRetry(cleanup: CleanupTask, maxRetries?: number, delay?: number): CleanupTask;
}
/**
 * Global cleanup manager instance
 */
export declare const cleanupManager: AdvancedCleanupManager;
//# sourceMappingURL=CleanupManager.d.ts.map