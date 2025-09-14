/**
 * Performance Monitor - Real-time performance tracking and alerting system
 * @description Monitors response times, cache hit rates, memory usage, and provides alerts
 */
import { PerformanceConfig, PerformanceMetrics, PerformanceMeasurement, PerformanceAlert, PerformanceBenchmark, PerformanceTrend, IPerformanceMonitor, OptimizationRecommendation } from '../types/Performance.js';
/**
 * Performance Monitor Implementation
 */
export declare class PerformanceMonitor implements IPerformanceMonitor {
    private config;
    private collector;
    private alertManager;
    private trendAnalyzer;
    private activeMeasurements;
    private measurementId;
    constructor(config?: Partial<PerformanceConfig>);
    /**
     * Start measuring operation
     */
    startMeasurement(operation: string, metadata?: Record<string, any>): string;
    /**
     * End measurement
     */
    endMeasurement(measurementId: string, success?: boolean, error?: string): PerformanceMeasurement;
    /**
     * Record custom metric
     */
    recordMetric(name: string, value: number, tags?: Record<string, string>): void;
    /**
     * Get current metrics
     */
    getMetrics(): PerformanceMetrics;
    /**
     * Get metric history
     */
    getMetricHistory(metric: string, timeWindow: number): number[];
    /**
     * Register alert handler
     */
    onAlert(handler: (alert: PerformanceAlert) => void): void;
    /**
     * Get performance recommendations
     */
    getRecommendations(): OptimizationRecommendation[];
    /**
     * Get performance benchmarks
     */
    getBenchmarks(): PerformanceBenchmark[];
    /**
     * Get performance trends
     */
    getPerformanceTrends(): PerformanceTrend[];
    /**
     * Destroy performance monitor
     */
    destroy(): void;
    private initialize;
    private calculateBenchmarkScore;
    private getBenchmarkStatus;
}
/**
 * Factory function for creating performance monitor instances
 */
export declare function createPerformanceMonitor(config?: Partial<PerformanceConfig>): IPerformanceMonitor;
/**
 * Performance monitoring utilities
 */
export declare function measureFunction<T extends (...args: any[]) => any>(fn: T, monitor: IPerformanceMonitor, operationName?: string): T;
export declare function createPerformanceMiddleware(monitor: IPerformanceMonitor): (operationName: string) => <T extends (...args: any[]) => any>(target: any, propertyKey: string, descriptor: TypedPropertyDescriptor<T>) => TypedPropertyDescriptor<T>;
//# sourceMappingURL=PerformanceMonitor.d.ts.map