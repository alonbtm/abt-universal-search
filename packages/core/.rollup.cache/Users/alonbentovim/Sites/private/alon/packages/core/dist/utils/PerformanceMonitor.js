/**
 * Performance Monitor - Advanced performance tracking for transformation pipeline
 * @description Monitors transformation timing, memory usage, and optimization recommendations
 */
/**
 * Advanced performance monitor with optimization recommendations
 */
export class AdvancedPerformanceMonitor {
    constructor(options = {}) {
        this.operations = [];
        this.activeOperations = new Map();
        this.warnings = [];
        this.thresholds = {
            maxProcessingTimePerItem: 10, // 10ms per item
            maxMemoryUsage: 100 * 1024 * 1024, // 100MB
            minProcessingRate: 100, // 100 items/second
            minMemoryEfficiency: 1000, // 1000 items/MB
            ...options.thresholds
        };
        this.maxHistorySize = options.maxHistorySize || 1000;
    }
    /**
     * Start tracking an operation
     */
    startOperation(name, metadata) {
        const operationId = `${name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const operation = {
            name,
            startTime: performance.now(),
            memoryBefore: this.getMemoryUsage(),
            metadata
        };
        this.activeOperations.set(operationId, operation);
        return operationId;
    }
    /**
     * End tracking an operation
     */
    endOperation(operationId, itemsProcessed) {
        const operation = this.activeOperations.get(operationId);
        if (!operation) {
            return null;
        }
        operation.endTime = performance.now();
        operation.duration = operation.endTime - operation.startTime;
        operation.memoryAfter = this.getMemoryUsage();
        if (operation.memoryBefore !== undefined && operation.memoryAfter !== undefined) {
            operation.memoryDelta = operation.memoryAfter - operation.memoryBefore;
        }
        if (itemsProcessed !== undefined) {
            operation.itemsProcessed = itemsProcessed;
            if (operation.duration > 0) {
                operation.processingRate = (itemsProcessed * 1000) / operation.duration; // items per second
            }
        }
        this.activeOperations.delete(operationId);
        this.addToHistory(operation);
        this.checkThresholds(operation);
        return operation;
    }
    /**
     * Record a completed operation directly
     */
    recordOperation(name, duration, itemsProcessed, memoryDelta, metadata) {
        const now = performance.now();
        const operation = {
            name,
            startTime: now - duration,
            endTime: now,
            duration,
            itemsProcessed,
            memoryDelta,
            metadata
        };
        if (itemsProcessed !== undefined && duration > 0) {
            operation.processingRate = (itemsProcessed * 1000) / duration;
        }
        this.addToHistory(operation);
        this.checkThresholds(operation);
        return operation;
    }
    /**
     * Get comprehensive performance statistics
     */
    getStats() {
        const completedOps = this.operations.filter(op => op.duration !== undefined);
        if (completedOps.length === 0) {
            return {
                totalOperations: 0,
                totalProcessingTime: 0,
                averageProcessingTime: 0,
                totalItemsProcessed: 0,
                overallProcessingRate: 0,
                peakMemoryUsage: 0,
                averageMemoryUsage: 0,
                memoryEfficiency: 0,
                slowestOperations: [],
                memoryIntensiveOperations: [],
                trends: {
                    processingTimeSlope: 0,
                    memoryUsageSlope: 0,
                    efficiencySlope: 0
                }
            };
        }
        const totalProcessingTime = completedOps.reduce((sum, op) => sum + (op.duration || 0), 0);
        const averageProcessingTime = totalProcessingTime / completedOps.length;
        const totalItemsProcessed = completedOps.reduce((sum, op) => sum + (op.itemsProcessed || 0), 0);
        const overallProcessingRate = totalProcessingTime > 0 ? (totalItemsProcessed * 1000) / totalProcessingTime : 0;
        const memoryUsages = completedOps
            .map(op => op.memoryAfter)
            .filter(mem => mem !== undefined);
        const peakMemoryUsage = memoryUsages.length > 0 ? Math.max(...memoryUsages) : 0;
        const averageMemoryUsage = memoryUsages.length > 0
            ? memoryUsages.reduce((sum, mem) => sum + mem, 0) / memoryUsages.length
            : 0;
        const memoryEfficiency = averageMemoryUsage > 0
            ? (totalItemsProcessed / (averageMemoryUsage / (1024 * 1024))) // items per MB
            : 0;
        // Find slowest operations
        const slowestOperations = [...completedOps]
            .sort((a, b) => (b.duration || 0) - (a.duration || 0))
            .slice(0, 5);
        // Find memory-intensive operations
        const memoryIntensiveOperations = [...completedOps]
            .filter(op => op.memoryDelta !== undefined)
            .sort((a, b) => (b.memoryDelta || 0) - (a.memoryDelta || 0))
            .slice(0, 5);
        // Calculate trends
        const trends = this.calculateTrends(completedOps);
        return {
            totalOperations: completedOps.length,
            totalProcessingTime,
            averageProcessingTime,
            totalItemsProcessed,
            overallProcessingRate,
            peakMemoryUsage,
            averageMemoryUsage,
            memoryEfficiency,
            slowestOperations,
            memoryIntensiveOperations,
            trends
        };
    }
    /**
     * Get performance warnings
     */
    getWarnings() {
        return [...this.warnings];
    }
    /**
     * Get optimization recommendations
     */
    getRecommendations() {
        const stats = this.getStats();
        const recommendations = [];
        // Slow processing recommendations
        if (stats.averageProcessingTime > this.thresholds.maxProcessingTimePerItem * (stats.totalItemsProcessed / stats.totalOperations)) {
            recommendations.push({
                priority: 'high',
                title: 'Optimize Processing Speed',
                description: 'Processing is slower than optimal. Consider optimizing transformation logic or using parallel processing.',
                expectedImpact: `Could improve processing speed by up to 50%`,
                complexity: 'medium',
                configChanges: {
                    enableParallelProcessing: true,
                    batchSize: Math.max(10, Math.floor(stats.totalItemsProcessed / stats.totalOperations / 2))
                }
            });
        }
        // Memory usage recommendations
        if (stats.peakMemoryUsage > this.thresholds.maxMemoryUsage) {
            recommendations.push({
                priority: 'high',
                title: 'Reduce Memory Usage',
                description: 'Peak memory usage exceeds threshold. Consider processing data in smaller batches.',
                expectedImpact: `Could reduce memory usage by 30-50%`,
                complexity: 'easy',
                configChanges: {
                    enableStreaming: true,
                    maxBatchSize: 100
                }
            });
        }
        // Low efficiency recommendations
        if (stats.memoryEfficiency < this.thresholds.minMemoryEfficiency) {
            recommendations.push({
                priority: 'medium',
                title: 'Improve Memory Efficiency',
                description: 'Memory efficiency is below optimal. Consider object pooling or reducing object creation.',
                expectedImpact: `Could improve memory efficiency by 25%`,
                complexity: 'hard',
                configChanges: {
                    enableObjectPooling: true,
                    reuseTransformationObjects: true
                }
            });
        }
        // Trending issues
        if (stats.trends.processingTimeSlope > 0.1) {
            recommendations.push({
                priority: 'medium',
                title: 'Address Performance Degradation',
                description: 'Processing time is increasing over time. This suggests memory leaks or accumulating inefficiencies.',
                expectedImpact: 'Could prevent further performance degradation',
                complexity: 'medium'
            });
        }
        // Frequent slow operations
        const slowOperationNames = stats.slowestOperations.map(op => op.name);
        const frequentSlowOps = this.findFrequentSlowOperations();
        for (const opName of frequentSlowOps) {
            recommendations.push({
                priority: 'medium',
                title: `Optimize '${opName}' Operation`,
                description: `The '${opName}' operation appears frequently among slow operations.`,
                expectedImpact: 'Could improve overall processing speed',
                complexity: 'medium'
            });
        }
        return recommendations.sort((a, b) => {
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            return priorityOrder[b.priority] - priorityOrder[a.priority];
        });
    }
    /**
     * Clear performance history
     */
    clearHistory() {
        this.operations = [];
        this.warnings = [];
    }
    /**
     * Export performance data
     */
    exportData() {
        return {
            operations: [...this.operations],
            stats: this.getStats(),
            warnings: this.getWarnings(),
            recommendations: this.getRecommendations(),
            exportTime: Date.now()
        };
    }
    /**
     * Add operation to history
     */
    addToHistory(operation) {
        this.operations.push(operation);
        // Maintain history size limit
        if (this.operations.length > this.maxHistorySize) {
            this.operations = this.operations.slice(-this.maxHistorySize);
        }
    }
    /**
     * Check operation against thresholds and generate warnings
     */
    checkThresholds(operation) {
        const now = Date.now();
        // Check processing time per item
        if (operation.itemsProcessed && operation.duration) {
            const timePerItem = operation.duration / operation.itemsProcessed;
            if (timePerItem > this.thresholds.maxProcessingTimePerItem) {
                this.warnings.push({
                    severity: 'warning',
                    message: `Operation '${operation.name}' exceeded processing time threshold`,
                    metric: 'processingTimePerItem',
                    currentValue: timePerItem,
                    thresholdValue: this.thresholds.maxProcessingTimePerItem,
                    suggestions: [
                        'Optimize transformation logic',
                        'Consider parallel processing',
                        'Reduce complexity of transformations'
                    ],
                    timestamp: now
                });
            }
        }
        // Check memory usage
        if (operation.memoryAfter !== undefined && operation.memoryAfter > this.thresholds.maxMemoryUsage) {
            this.warnings.push({
                severity: 'critical',
                message: `Operation '${operation.name}' exceeded memory usage threshold`,
                metric: 'memoryUsage',
                currentValue: operation.memoryAfter,
                thresholdValue: this.thresholds.maxMemoryUsage,
                suggestions: [
                    'Process data in smaller batches',
                    'Enable garbage collection',
                    'Optimize data structures'
                ],
                timestamp: now
            });
        }
        // Check processing rate
        if (operation.processingRate !== undefined && operation.processingRate < this.thresholds.minProcessingRate) {
            this.warnings.push({
                severity: 'warning',
                message: `Operation '${operation.name}' below minimum processing rate`,
                metric: 'processingRate',
                currentValue: operation.processingRate,
                thresholdValue: this.thresholds.minProcessingRate,
                suggestions: [
                    'Optimize processing algorithms',
                    'Use more efficient data structures',
                    'Consider caching frequently used data'
                ],
                timestamp: now
            });
        }
        // Limit warnings history
        if (this.warnings.length > 100) {
            this.warnings = this.warnings.slice(-100);
        }
    }
    /**
     * Calculate performance trends
     */
    calculateTrends(operations) {
        if (operations.length < 2) {
            return { processingTimeSlope: 0, memoryUsageSlope: 0, efficiencySlope: 0 };
        }
        // Simple linear regression for trends
        const processingTimes = operations.map(op => op.duration || 0);
        const memoryUsages = operations
            .map(op => op.memoryAfter)
            .filter(mem => mem !== undefined);
        const efficiencies = operations
            .filter(op => op.itemsProcessed && op.memoryAfter)
            .map(op => (op.itemsProcessed / (op.memoryAfter / (1024 * 1024))));
        return {
            processingTimeSlope: this.calculateSlope(processingTimes),
            memoryUsageSlope: this.calculateSlope(memoryUsages),
            efficiencySlope: this.calculateSlope(efficiencies)
        };
    }
    /**
     * Calculate slope for trend analysis
     */
    calculateSlope(values) {
        if (values.length < 2)
            return 0;
        const n = values.length;
        const sumX = (n * (n + 1)) / 2; // Sum of indices
        const sumY = values.reduce((sum, val) => sum + val, 0);
        const sumXY = values.reduce((sum, val, i) => sum + (i + 1) * val, 0);
        const sumXX = (n * (n + 1) * (2 * n + 1)) / 6; // Sum of squares of indices
        return (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    }
    /**
     * Find operations that frequently appear among slowest
     */
    findFrequentSlowOperations() {
        const recentOps = this.operations.slice(-100); // Last 100 operations
        const slowOps = recentOps
            .sort((a, b) => (b.duration || 0) - (a.duration || 0))
            .slice(0, 20); // Top 20% slowest
        const operationCounts = slowOps.reduce((counts, op) => {
            counts[op.name] = (counts[op.name] || 0) + 1;
            return counts;
        }, {});
        return Object.entries(operationCounts)
            .filter(([_, count]) => count >= 3) // Appears at least 3 times in slow operations
            .map(([name]) => name);
    }
    /**
     * Get current memory usage (simplified)
     */
    getMemoryUsage() {
        if (typeof performance !== 'undefined' && 'memory' in performance) {
            // @ts-ignore - performance.memory is not in standard types
            return performance.memory.usedJSHeapSize || 0;
        }
        return 0; // Fallback when memory info not available
    }
}
/**
 * Utility function for measuring operation performance
 */
export async function measureAsync(monitor, operationName, operation, itemsProcessed, metadata) {
    const operationId = monitor.startOperation(operationName, metadata);
    try {
        const result = await operation();
        monitor.endOperation(operationId, itemsProcessed);
        return result;
    }
    catch (error) {
        monitor.endOperation(operationId, itemsProcessed);
        throw error;
    }
}
/**
 * Utility function for measuring synchronous operation performance
 */
export function measureSync(monitor, operationName, operation, itemsProcessed, metadata) {
    const operationId = monitor.startOperation(operationName, metadata);
    try {
        const result = operation();
        monitor.endOperation(operationId, itemsProcessed);
        return result;
    }
    catch (error) {
        monitor.endOperation(operationId, itemsProcessed);
        throw error;
    }
}
/**
 * Global performance monitor instance
 */
export const performanceMonitor = new AdvancedPerformanceMonitor();
//# sourceMappingURL=PerformanceMonitor.js.map