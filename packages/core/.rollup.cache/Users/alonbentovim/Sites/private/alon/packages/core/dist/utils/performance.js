/**
 * Performance monitoring utilities for Universal Search Component
 * @description Query processing performance tracking and optimization
 */
/**
 * Performance tracker for query operations
 */
export class PerformanceTracker {
    constructor() {
        this.metrics = new Map();
        this.currentOperation = new Map();
    }
    /**
     * Start tracking performance for a query operation
     */
    startTracking(operationId, queryLength, validationRulesCount) {
        const startTime = performance.now();
        const memoryBefore = this.getMemoryUsage();
        this.currentOperation.set(operationId, {
            startTime,
            queryLength,
            validationRulesCount,
            ...(memoryBefore !== undefined && { memoryBefore })
        });
    }
    /**
     * End tracking performance for a query operation
     */
    endTracking(operationId) {
        const operation = this.currentOperation.get(operationId);
        if (!operation || !operation.startTime) {
            return null;
        }
        const endTime = performance.now();
        const duration = endTime - operation.startTime;
        const memoryAfter = this.getMemoryUsage();
        const metrics = {
            startTime: operation.startTime,
            endTime,
            duration,
            queryLength: operation.queryLength || 0,
            validationRulesCount: operation.validationRulesCount || 0,
            ...(operation.memoryBefore !== undefined && { memoryBefore: operation.memoryBefore }),
            ...(memoryAfter !== undefined && { memoryAfter })
        };
        // Store metrics
        const operationMetrics = this.metrics.get(operationId) || [];
        operationMetrics.push(metrics);
        this.metrics.set(operationId, operationMetrics);
        // Clean up current operation
        this.currentOperation.delete(operationId);
        return metrics;
    }
    /**
     * Get performance metrics for an operation
     */
    getMetrics(operationId) {
        return this.metrics.get(operationId) || [];
    }
    /**
     * Get all performance metrics for a category
     */
    getAllMetrics(category = '') {
        const allMetrics = [];
        for (const [key, metrics] of this.metrics.entries()) {
            if (category === '' || key.includes(category)) {
                allMetrics.push(...metrics);
            }
        }
        return allMetrics;
    }
    /**
     * Get average performance metrics for an operation
     */
    getAverageMetrics(operationId) {
        const metrics = this.getMetrics(operationId);
        if (metrics.length === 0) {
            return null;
        }
        const totals = metrics.reduce((acc, metric) => ({
            duration: acc.duration + metric.duration,
            queryLength: acc.queryLength + metric.queryLength,
            validationRulesCount: acc.validationRulesCount + metric.validationRulesCount
        }), { duration: 0, queryLength: 0, validationRulesCount: 0 });
        return {
            duration: totals.duration / metrics.length,
            queryLength: totals.queryLength / metrics.length,
            validationRulesCount: totals.validationRulesCount / metrics.length
        };
    }
    /**
     * Clear all metrics
     */
    clearMetrics() {
        this.metrics.clear();
        this.currentOperation.clear();
    }
    /**
     * Get memory usage (if available)
     */
    getMemoryUsage() {
        if (typeof performance !== 'undefined' && 'memory' in performance) {
            return performance.memory.usedJSHeapSize;
        }
        return undefined;
    }
}
/**
 * Global performance tracker instance
 */
export const performanceTracker = new PerformanceTracker();
/**
 * Analyze performance metrics and provide recommendations
 */
export function analyzePerformance(metrics) {
    const recommendations = [];
    if (metrics.length === 0) {
        return recommendations;
    }
    const avgDuration = metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length;
    const maxDuration = Math.max(...metrics.map(m => m.duration));
    const avgQueryLength = metrics.reduce((sum, m) => sum + m.queryLength, 0) / metrics.length;
    // Check average processing time
    if (avgDuration > 10) {
        recommendations.push({
            type: 'warning',
            message: 'Average query processing time is high. Consider optimizing validation rules.',
            metric: 'duration',
            threshold: 10,
            currentValue: avgDuration
        });
    }
    // Check maximum processing time
    if (maxDuration > 50) {
        recommendations.push({
            type: 'critical',
            message: 'Some queries are taking too long to process. Review complex validation patterns.',
            metric: 'duration',
            threshold: 50,
            currentValue: maxDuration
        });
    }
    // Check query length patterns
    if (avgQueryLength > 100) {
        recommendations.push({
            type: 'info',
            message: 'Users are entering long queries. Consider adding query length limits.',
            metric: 'queryLength',
            threshold: 100,
            currentValue: avgQueryLength
        });
    }
    return recommendations;
}
/**
 * Simple performance measurement utility
 */
export function measurePerformance(operation, label = 'operation') {
    const startTime = performance.now();
    const result = operation();
    const endTime = performance.now();
    const duration = endTime - startTime;
    if (duration > 5) {
        console.warn(`Performance: ${label} took ${duration.toFixed(2)}ms`);
    }
    return { result, duration };
}
//# sourceMappingURL=performance.js.map