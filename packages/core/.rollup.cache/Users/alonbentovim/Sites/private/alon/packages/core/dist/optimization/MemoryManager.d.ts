/**
 * Memory Manager - Automatic garbage collection and memory cleanup system
 * @description Manages memory usage, detects leaks, and provides automatic cleanup mechanisms
 */
import { MemoryManagementConfig, MemoryUsageStats, IMemoryManager } from '../types/Performance.js';
/**
 * Memory Manager Implementation
 */
export declare class MemoryManager implements IMemoryManager {
    private config;
    private trackedObjects;
    private leakDetector;
    private gcScheduler;
    private monitor;
    private memoryLimit;
    private gcStats;
    constructor(config?: Partial<MemoryManagementConfig>);
    /**
     * Get memory usage statistics
     */
    getUsageStats(): MemoryUsageStats;
    /**
     * Trigger garbage collection
     */
    triggerGC(): Promise<{
        freedMemory: number;
        duration: number;
    }>;
    /**
     * Detect memory leaks
     */
    detectLeaks(): Promise<Array<{
        source: string;
        size: number;
        severity: 'low' | 'medium' | 'high';
    }>>;
    /**
     * Register memory-sensitive object
     */
    register(object: any, category: string): string;
    /**
     * Unregister object
     */
    unregister(id: string): boolean;
    /**
     * Set memory limit
     */
    setMemoryLimit(limit: number): void;
    /**
     * Get memory recommendations
     */
    getRecommendations(): Array<{
        type: 'cleanup' | 'optimization' | 'limit';
        description: string;
        priority: number;
    }>;
    /**
     * Clean up expired objects
     */
    cleanup(): Promise<{
        cleaned: number;
        freedMemory: number;
    }>;
    /**
     * Destroy memory manager
     */
    destroy(): void;
    private initialize;
    private cleanupDeadReferences;
    private triggerMemoryPressureCleanup;
    private estimateObjectSize;
    private detectComponent;
    private generateId;
}
/**
 * Object Pool for memory efficiency
 */
export declare class ObjectPool<T> {
    private pool;
    private createFn;
    private resetFn;
    private maxSize;
    private memoryManager;
    constructor(createFn: () => T, resetFn: (obj: T) => void, maxSize?: number, memoryManager?: MemoryManager);
    acquire(): T;
    release(obj: T): void;
    clear(): void;
    getStats(): {
        poolSize: number;
        maxSize: number;
        utilization: number;
    };
}
/**
 * Memory-efficient cache with automatic cleanup
 */
export declare class MemoryEfficientCache<K, V> {
    private cache;
    private memoryManager;
    private maxSize;
    private ttl;
    private cleanupInterval;
    constructor(maxSize?: number, ttl?: number, // 5 minutes
    memoryManager?: MemoryManager);
    set(key: K, value: V): void;
    get(key: K): V | undefined;
    delete(key: K): boolean;
    clear(): void;
    cleanup(): void;
    getStats(): {
        size: number;
        maxSize: number;
        hitRate: number;
        memoryUsage: number;
    };
    destroy(): void;
    private evictOldest;
    private estimateSize;
}
/**
 * Factory function for creating memory manager instances
 */
export declare function createMemoryManager(config?: Partial<MemoryManagementConfig>): IMemoryManager;
/**
 * Utility functions for memory management
 */
export declare function formatMemorySize(bytes: number): string;
export declare function calculateMemoryGrowthRate(samples: Array<{
    timestamp: number;
    usage: number;
}>): number;
export declare function detectMemoryPressure(currentUsage: number, totalMemory: number, threshold?: number): {
    underPressure: boolean;
    severity: 'low' | 'medium' | 'high';
    recommendation: string;
};
//# sourceMappingURL=MemoryManager.d.ts.map