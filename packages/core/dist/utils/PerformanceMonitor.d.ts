/**
 * Performance Monitor - Advanced performance tracking for transformation pipeline
 * @description Monitors transformation timing, memory usage, and optimization recommendations
 */
/**
 * Performance metrics for individual operations
 */
export interface OperationMetrics {
    /** Operation name */
    name: string;
    /** Start time in milliseconds */
    startTime: number;
    /** End time in milliseconds */
    endTime?: number;
    /** Duration in milliseconds */
    duration?: number;
    /** Memory usage before operation (bytes) */
    memoryBefore?: number;
    /** Memory usage after operation (bytes) */
    memoryAfter?: number;
    /** Memory delta (bytes) */
    memoryDelta?: number;
    /** Items processed */
    itemsProcessed?: number;
    /** Processing rate (items/second) */
    processingRate?: number;
    /** Operation metadata */
    metadata?: Record<string, unknown>;
}
/**
 * Aggregated performance statistics
 */
export interface PerformanceStats {
    /** Total operations tracked */
    totalOperations: number;
    /** Total processing time */
    totalProcessingTime: number;
    /** Average processing time per operation */
    averageProcessingTime: number;
    /** Total items processed */
    totalItemsProcessed: number;
    /** Overall processing rate */
    overallProcessingRate: number;
    /** Peak memory usage */
    peakMemoryUsage: number;
    /** Average memory usage */
    averageMemoryUsage: number;
    /** Memory efficiency (items/MB) */
    memoryEfficiency: number;
    /** Slowest operations */
    slowestOperations: OperationMetrics[];
    /** Memory-intensive operations */
    memoryIntensiveOperations: OperationMetrics[];
    /** Performance trends */
    trends: {
        processingTimeSlope: number;
        memoryUsageSlope: number;
        efficiencySlope: number;
    };
}
/**
 * Performance threshold configuration
 */
export interface PerformanceThresholds {
    /** Maximum acceptable processing time per item (ms) */
    maxProcessingTimePerItem: number;
    /** Maximum acceptable memory usage (bytes) */
    maxMemoryUsage: number;
    /** Minimum acceptable processing rate (items/second) */
    minProcessingRate: number;
    /** Memory efficiency threshold (items/MB) */
    minMemoryEfficiency: number;
}
/**
 * Performance warning
 */
export interface PerformanceWarning {
    /** Warning severity */
    severity: 'info' | 'warning' | 'critical';
    /** Warning message */
    message: string;
    /** Metric that triggered the warning */
    metric: string;
    /** Current value */
    currentValue: number;
    /** Threshold value */
    thresholdValue: number;
    /** Suggested actions */
    suggestions: string[];
    /** Timestamp when warning was generated */
    timestamp: number;
}
/**
 * Performance recommendation
 */
export interface PerformanceRecommendation {
    /** Recommendation priority */
    priority: 'high' | 'medium' | 'low';
    /** Recommendation title */
    title: string;
    /** Detailed description */
    description: string;
    /** Expected impact */
    expectedImpact: string;
    /** Implementation complexity */
    complexity: 'easy' | 'medium' | 'hard';
    /** Configuration changes suggested */
    configChanges?: Record<string, unknown>;
}
/**
 * Advanced performance monitor with optimization recommendations
 */
export declare class AdvancedPerformanceMonitor {
    private operations;
    private activeOperations;
    private thresholds;
    private warnings;
    private maxHistorySize;
    constructor(options?: {
        thresholds?: Partial<PerformanceThresholds>;
        maxHistorySize?: number;
    });
    /**
     * Start tracking an operation
     */
    startOperation(name: string, metadata?: Record<string, unknown>): string;
    /**
     * End tracking an operation
     */
    endOperation(operationId: string, itemsProcessed?: number): OperationMetrics | null;
    /**
     * Record a completed operation directly
     */
    recordOperation(name: string, duration: number, itemsProcessed?: number, memoryDelta?: number, metadata?: Record<string, unknown>): OperationMetrics;
    /**
     * Get comprehensive performance statistics
     */
    getStats(): PerformanceStats;
    /**
     * Get performance warnings
     */
    getWarnings(): PerformanceWarning[];
    /**
     * Get optimization recommendations
     */
    getRecommendations(): PerformanceRecommendation[];
    /**
     * Clear performance history
     */
    clearHistory(): void;
    /**
     * Export performance data
     */
    exportData(): {
        operations: OperationMetrics[];
        stats: PerformanceStats;
        warnings: PerformanceWarning[];
        recommendations: PerformanceRecommendation[];
        exportTime: number;
    };
    /**
     * Add operation to history
     */
    private addToHistory;
    /**
     * Check operation against thresholds and generate warnings
     */
    private checkThresholds;
    /**
     * Calculate performance trends
     */
    private calculateTrends;
    /**
     * Calculate slope for trend analysis
     */
    private calculateSlope;
    /**
     * Find operations that frequently appear among slowest
     */
    private findFrequentSlowOperations;
    /**
     * Get current memory usage (simplified)
     */
    private getMemoryUsage;
}
/**
 * Utility function for measuring operation performance
 */
export declare function measureAsync<T>(monitor: AdvancedPerformanceMonitor, operationName: string, operation: () => Promise<T>, itemsProcessed?: number, metadata?: Record<string, unknown>): Promise<T>;
/**
 * Utility function for measuring synchronous operation performance
 */
export declare function measureSync<T>(monitor: AdvancedPerformanceMonitor, operationName: string, operation: () => T, itemsProcessed?: number, metadata?: Record<string, unknown>): T;
/**
 * Global performance monitor instance
 */
export declare const performanceMonitor: AdvancedPerformanceMonitor;
//# sourceMappingURL=PerformanceMonitor.d.ts.map