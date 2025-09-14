/**
 * Performance Tracker - Enhanced performance metrics tracking for comprehensive monitoring
 * @description Tracks query response times, result rendering time, user interaction latency, and baselines
 */
import { PerformanceMeasurement } from '../types/Performance.js';
/**
 * Performance measurement types specific to Universal Search
 */
export interface SearchPerformanceMeasurement extends PerformanceMeasurement {
    /** Rendering frame rate if applicable */
    frameRate?: number;
    /** User interaction type */
    interactionType?: 'click' | 'keyboard' | 'touch' | 'voice';
    /** Search result count */
    resultCount?: number;
    /** Cache hit/miss status */
    cacheStatus?: 'hit' | 'miss' | 'partial';
    /** Data source latency breakdown */
    sourceLatency?: Record<string, number>;
}
/**
 * Performance baseline configuration
 */
export interface PerformanceBaseline {
    /** Baseline name */
    name: string;
    /** Target response time */
    targetResponseTime: number;
    /** Target render time */
    targetRenderTime: number;
    /** Target interaction latency */
    targetInteractionLatency: number;
    /** Acceptable regression threshold */
    regressionThreshold: number;
    /** Baseline establishment date */
    establishedDate: number;
    /** Sample size for baseline */
    sampleSize: number;
}
/**
 * Regression detection result
 */
export interface RegressionDetection {
    /** Regression detected */
    detected: boolean;
    /** Affected metrics */
    affectedMetrics: string[];
    /** Regression severity */
    severity: 'minor' | 'moderate' | 'severe';
    /** Comparison with baseline */
    comparison: {
        metric: string;
        current: number;
        baseline: number;
        degradation: number;
    }[];
    /** Recommendations */
    recommendations: string[];
    /** Detection timestamp */
    timestamp: number;
}
/**
 * Enhanced Performance Tracker
 * Extends the basic performance monitoring with search-specific measurements
 */
export declare class PerformanceTracker {
    private measurements;
    private baselines;
    private frameRateObserver;
    private interactionObserver;
    private measurementIdCounter;
    private enabled;
    constructor();
    /**
     * Start measuring a search operation
     */
    startMeasurement(operation: string, metadata?: Record<string, any>): string;
    /**
     * End measurement with additional tracking
     */
    endMeasurement(measurementId: string, success?: boolean, additionalData?: {
        resultCount?: number;
        cacheStatus?: 'hit' | 'miss' | 'partial';
        sourceLatency?: Record<string, number>;
        frameRate?: number;
        interactionType?: 'click' | 'keyboard' | 'touch' | 'voice';
    }): SearchPerformanceMeasurement;
    /**
     * Record user interaction latency
     */
    recordInteractionLatency(interactionType: 'click' | 'keyboard' | 'touch' | 'voice', latency: number, targetElement?: string): void;
    /**
     * Record rendering performance
     */
    recordRenderingPerformance(renderTime: number, resultCount: number, frameRate?: number): void;
    /**
     * Establish performance baseline
     */
    establishBaseline(name: string, targetResponseTime: number, targetRenderTime?: number, // 60fps
    targetInteractionLatency?: number, regressionThreshold?: number): void;
    /**
     * Detect performance regressions
     */
    detectRegressions(operation: string): RegressionDetection;
    /**
     * Get performance metrics summary
     */
    getMetricsSummary(operation?: string, timeWindow?: number): {
        responseTime: {
            avg: number;
            p95: number;
            p99: number;
        };
        renderTime: {
            avg: number;
            targetFps: number;
        };
        interactionLatency: {
            avg: number;
            byType: Record<string, number>;
        };
        cachePerformance: {
            hitRate: number;
            avgHitTime: number;
            avgMissTime: number;
        };
        regressions: RegressionDetection[];
    };
    /**
     * Enable or disable tracking
     */
    setEnabled(enabled: boolean): void;
    /**
     * Clear all measurements
     */
    clearMeasurements(operation?: string): void;
    /**
     * Get all measurements for an operation
     */
    getMeasurements(operation: string): SearchPerformanceMeasurement[];
    /**
     * Cleanup resources
     */
    cleanup(): void;
    private initializePerformanceObservers;
    private establishDefaultBaselines;
    private checkForRegressions;
    private generateRegressionRecommendations;
    private getPercentile;
}
/**
 * Global performance tracker instance
 */
export declare const performanceTracker: PerformanceTracker;
declare global {
    interface Window {
        PerformanceEventTiming: typeof PerformanceEventTiming;
    }
}
//# sourceMappingURL=PerformanceTracker.d.ts.map