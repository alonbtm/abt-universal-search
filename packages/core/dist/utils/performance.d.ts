/**
 * Performance monitoring utilities for Universal Search Component
 * @description Query processing performance tracking and optimization
 */
/**
 * Performance metrics for query processing
 */
export interface QueryPerformanceMetrics {
    /** Query processing start time */
    startTime: number;
    /** Query processing end time */
    endTime: number;
    /** Total processing duration in milliseconds */
    duration: number;
    /** Query string length */
    queryLength: number;
    /** Number of validation rules applied */
    validationRulesCount: number;
    /** Memory usage before processing (if available) */
    memoryBefore?: number;
    /** Memory usage after processing (if available) */
    memoryAfter?: number;
}
/**
 * Performance tracker for query operations
 */
export declare class PerformanceTracker {
    private metrics;
    private currentOperation;
    /**
     * Start tracking performance for a query operation
     */
    startTracking(operationId: string, queryLength: number, validationRulesCount: number): void;
    /**
     * End tracking performance for a query operation
     */
    endTracking(operationId: string): QueryPerformanceMetrics | null;
    /**
     * Get performance metrics for an operation
     */
    getMetrics(operationId: string): QueryPerformanceMetrics[];
    /**
     * Get all performance metrics for a category
     */
    getAllMetrics(category?: string): QueryPerformanceMetrics[];
    /**
     * Get average performance metrics for an operation
     */
    getAverageMetrics(operationId: string): Partial<QueryPerformanceMetrics> | null;
    /**
     * Clear all metrics
     */
    clearMetrics(): void;
    /**
     * Get memory usage (if available)
     */
    private getMemoryUsage;
}
/**
 * Global performance tracker instance
 */
export declare const performanceTracker: PerformanceTracker;
/**
 * Performance optimization recommendations
 */
export interface PerformanceRecommendation {
    type: 'warning' | 'info' | 'critical';
    message: string;
    metric: keyof QueryPerformanceMetrics;
    threshold: number;
    currentValue: number;
}
/**
 * Analyze performance metrics and provide recommendations
 */
export declare function analyzePerformance(metrics: QueryPerformanceMetrics[]): PerformanceRecommendation[];
/**
 * Simple performance measurement utility
 */
export declare function measurePerformance<T>(operation: () => T, label?: string): {
    result: T;
    duration: number;
};
//# sourceMappingURL=performance.d.ts.map