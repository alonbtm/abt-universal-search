/**
 * Performance Tracker - Enhanced performance metrics tracking for comprehensive monitoring
 * @description Tracks query response times, result rendering time, user interaction latency, and baselines
 */
/**
 * Enhanced Performance Tracker
 * Extends the basic performance monitoring with search-specific measurements
 */
export class PerformanceTracker {
    constructor() {
        this.frameRateObserver = null;
        this.interactionObserver = null;
        this.measurementIdCounter = 0;
        this.enabled = true;
        this.measurements = new Map();
        this.baselines = new Map();
        this.initializePerformanceObservers();
        this.establishDefaultBaselines();
    }
    /**
     * Start measuring a search operation
     */
    startMeasurement(operation, metadata) {
        if (!this.enabled)
            return '';
        const id = `perf_${operation}_${++this.measurementIdCounter}_${Date.now()}`;
        const measurement = {
            id,
            operation,
            startTime: performance.now(),
            metadata: {
                ...metadata,
                userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server',
                timestamp: Date.now()
            }
        };
        // Record memory before operation if available
        if (typeof performance !== 'undefined' && performance.memory) {
            measurement.memoryBefore = performance.memory.usedJSHeapSize;
        }
        if (!this.measurements.has(operation)) {
            this.measurements.set(operation, []);
        }
        this.measurements.get(operation).push(measurement);
        return id;
    }
    /**
     * End measurement with additional tracking
     */
    endMeasurement(measurementId, success = true, additionalData) {
        const endTime = performance.now();
        // Find the measurement across all operations
        let measurement;
        let operationType = '';
        for (const [operation, measurements] of Array.from(this.measurements.entries())) {
            const found = measurements.find((m) => m.id === measurementId);
            if (found) {
                measurement = found;
                operationType = operation;
                break;
            }
        }
        if (!measurement) {
            // Return a dummy measurement if not found
            return {
                id: measurementId,
                operation: 'unknown',
                startTime: endTime,
                endTime,
                duration: 0,
                success: false,
                error: 'Measurement not found'
            };
        }
        // Complete the measurement
        measurement.endTime = endTime;
        measurement.duration = endTime - measurement.startTime;
        measurement.success = success;
        // Add additional tracking data
        if (additionalData) {
            measurement.resultCount = additionalData.resultCount;
            measurement.cacheStatus = additionalData.cacheStatus;
            measurement.sourceLatency = additionalData.sourceLatency;
            measurement.frameRate = additionalData.frameRate;
            measurement.interactionType = additionalData.interactionType;
        }
        // Record memory after operation if available
        if (typeof performance !== 'undefined' && performance.memory) {
            measurement.memoryAfter = performance.memory.usedJSHeapSize;
        }
        // Keep only recent measurements (last 1000 per operation)
        const measurements = this.measurements.get(operationType);
        if (measurements.length > 1000) {
            measurements.splice(0, measurements.length - 1000);
        }
        // Check for regressions
        this.checkForRegressions(operationType, measurement);
        return measurement;
    }
    /**
     * Record user interaction latency
     */
    recordInteractionLatency(interactionType, latency, targetElement) {
        if (!this.enabled)
            return;
        const measurement = {
            id: `interaction_${++this.measurementIdCounter}_${Date.now()}`,
            operation: 'user_interaction',
            startTime: performance.now() - latency,
            endTime: performance.now(),
            duration: latency,
            success: true,
            interactionType,
            metadata: {
                targetElement,
                timestamp: Date.now()
            }
        };
        if (!this.measurements.has('user_interaction')) {
            this.measurements.set('user_interaction', []);
        }
        this.measurements.get('user_interaction').push(measurement);
    }
    /**
     * Record rendering performance
     */
    recordRenderingPerformance(renderTime, resultCount, frameRate) {
        if (!this.enabled)
            return;
        const measurement = {
            id: `render_${++this.measurementIdCounter}_${Date.now()}`,
            operation: 'result_rendering',
            startTime: performance.now() - renderTime,
            endTime: performance.now(),
            duration: renderTime,
            success: true,
            resultCount,
            frameRate,
            metadata: {
                timestamp: Date.now()
            }
        };
        if (!this.measurements.has('result_rendering')) {
            this.measurements.set('result_rendering', []);
        }
        this.measurements.get('result_rendering').push(measurement);
    }
    /**
     * Establish performance baseline
     */
    establishBaseline(name, targetResponseTime, targetRenderTime = 16.67, // 60fps
    targetInteractionLatency = 100, regressionThreshold = 0.2 // 20% degradation
    ) {
        const baseline = {
            name,
            targetResponseTime,
            targetRenderTime,
            targetInteractionLatency,
            regressionThreshold,
            establishedDate: Date.now(),
            sampleSize: 100
        };
        this.baselines.set(name, baseline);
    }
    /**
     * Detect performance regressions
     */
    detectRegressions(operation) {
        const measurements = this.measurements.get(operation) || [];
        const recent = measurements.slice(-50); // Last 50 measurements
        if (recent.length < 10) {
            return {
                detected: false,
                affectedMetrics: [],
                severity: 'minor',
                comparison: [],
                recommendations: [],
                timestamp: Date.now()
            };
        }
        const baseline = this.baselines.get('default');
        if (!baseline) {
            return {
                detected: false,
                affectedMetrics: [],
                severity: 'minor',
                comparison: [],
                recommendations: [],
                timestamp: Date.now()
            };
        }
        const avgResponseTime = recent
            .filter(m => m.duration !== undefined)
            .reduce((sum, m) => sum + m.duration, 0) / recent.length;
        const avgRenderTime = recent
            .filter(m => m.frameRate !== undefined)
            .reduce((sum, m) => sum + (16.67 / (m.frameRate / 60)), 0) / recent.length;
        const comparisons = [];
        const affectedMetrics = [];
        let maxDegradation = 0;
        // Check response time regression
        if (avgResponseTime > baseline.targetResponseTime * (1 + baseline.regressionThreshold)) {
            const degradation = (avgResponseTime - baseline.targetResponseTime) / baseline.targetResponseTime;
            comparisons.push({
                metric: 'response_time',
                current: avgResponseTime,
                baseline: baseline.targetResponseTime,
                degradation
            });
            affectedMetrics.push('response_time');
            maxDegradation = Math.max(maxDegradation, degradation);
        }
        // Check render time regression
        if (avgRenderTime > baseline.targetRenderTime * (1 + baseline.regressionThreshold)) {
            const degradation = (avgRenderTime - baseline.targetRenderTime) / baseline.targetRenderTime;
            comparisons.push({
                metric: 'render_time',
                current: avgRenderTime,
                baseline: baseline.targetRenderTime,
                degradation
            });
            affectedMetrics.push('render_time');
            maxDegradation = Math.max(maxDegradation, degradation);
        }
        let severity = 'minor';
        if (maxDegradation > 0.5)
            severity = 'severe';
        else if (maxDegradation > 0.3)
            severity = 'moderate';
        const recommendations = this.generateRegressionRecommendations(affectedMetrics, severity);
        return {
            detected: affectedMetrics.length > 0,
            affectedMetrics,
            severity,
            comparison: comparisons,
            recommendations,
            timestamp: Date.now()
        };
    }
    /**
     * Get performance metrics summary
     */
    getMetricsSummary(operation, timeWindow) {
        const cutoff = timeWindow ? Date.now() - timeWindow : 0;
        let allMeasurements = [];
        if (operation) {
            allMeasurements = (this.measurements.get(operation) || [])
                .filter(m => m.startTime >= cutoff);
        }
        else {
            for (const measurements of Array.from(this.measurements.values())) {
                allMeasurements.push(...measurements.filter((m) => m.startTime >= cutoff));
            }
        }
        // Calculate response time metrics
        const responseTimes = allMeasurements
            .filter(m => m.duration !== undefined)
            .map(m => m.duration)
            .sort((a, b) => a - b);
        const avgResponseTime = responseTimes.length > 0
            ? responseTimes.reduce((sum, t) => sum + t, 0) / responseTimes.length
            : 0;
        // Calculate render time metrics
        const renderMeasurements = allMeasurements.filter(m => m.frameRate !== undefined);
        const avgRenderTime = renderMeasurements.length > 0
            ? renderMeasurements.reduce((sum, m) => sum + (16.67 / (m.frameRate / 60)), 0) / renderMeasurements.length
            : 0;
        const avgFps = renderMeasurements.length > 0
            ? renderMeasurements.reduce((sum, m) => sum + m.frameRate, 0) / renderMeasurements.length
            : 60;
        // Calculate interaction latency by type
        const interactionMeasurements = allMeasurements.filter(m => m.interactionType !== undefined);
        const interactionsByType = {};
        for (const measurement of interactionMeasurements) {
            const type = measurement.interactionType;
            if (!interactionsByType[type])
                interactionsByType[type] = [];
            if (measurement.duration !== undefined) {
                interactionsByType[type].push(measurement.duration);
            }
        }
        const avgInteractionLatency = interactionMeasurements.length > 0
            ? interactionMeasurements.reduce((sum, m) => sum + (m.duration || 0), 0) / interactionMeasurements.length
            : 0;
        const latencyByType = {};
        for (const [type, latencies] of Object.entries(interactionsByType)) {
            latencyByType[type] = latencies.reduce((sum, l) => sum + l, 0) / latencies.length;
        }
        // Calculate cache performance
        const cacheMeasurements = allMeasurements.filter(m => m.cacheStatus !== undefined);
        const cacheHits = cacheMeasurements.filter(m => m.cacheStatus === 'hit');
        const cacheMisses = cacheMeasurements.filter(m => m.cacheStatus === 'miss');
        const hitRate = cacheMeasurements.length > 0
            ? cacheHits.length / cacheMeasurements.length
            : 0;
        const avgHitTime = cacheHits.length > 0
            ? cacheHits.reduce((sum, m) => sum + (m.duration || 0), 0) / cacheHits.length
            : 0;
        const avgMissTime = cacheMisses.length > 0
            ? cacheMisses.reduce((sum, m) => sum + (m.duration || 0), 0) / cacheMisses.length
            : 0;
        // Check for regressions
        const regressions = [];
        if (operation) {
            regressions.push(this.detectRegressions(operation));
        }
        else {
            for (const op of Array.from(this.measurements.keys())) {
                regressions.push(this.detectRegressions(op));
            }
        }
        return {
            responseTime: {
                avg: avgResponseTime,
                p95: this.getPercentile(responseTimes, 0.95),
                p99: this.getPercentile(responseTimes, 0.99)
            },
            renderTime: {
                avg: avgRenderTime,
                targetFps: avgFps
            },
            interactionLatency: {
                avg: avgInteractionLatency,
                byType: latencyByType
            },
            cachePerformance: {
                hitRate,
                avgHitTime,
                avgMissTime
            },
            regressions: regressions.filter(r => r.detected)
        };
    }
    /**
     * Enable or disable tracking
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        if (!enabled) {
            this.cleanup();
        }
        else {
            this.initializePerformanceObservers();
        }
    }
    /**
     * Clear all measurements
     */
    clearMeasurements(operation) {
        if (operation) {
            this.measurements.delete(operation);
        }
        else {
            this.measurements.clear();
        }
    }
    /**
     * Get all measurements for an operation
     */
    getMeasurements(operation) {
        return [...(this.measurements.get(operation) || [])];
    }
    /**
     * Cleanup resources
     */
    cleanup() {
        if (this.frameRateObserver) {
            this.frameRateObserver.disconnect();
            this.frameRateObserver = null;
        }
        if (this.interactionObserver) {
            this.interactionObserver.disconnect();
            this.interactionObserver = null;
        }
    }
    // Private implementation methods
    initializePerformanceObservers() {
        if (typeof PerformanceObserver === 'undefined')
            return;
        try {
            // Observe frame rate performance
            this.frameRateObserver = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    if (entry.entryType === 'measure' || entry.entryType === 'paint') {
                        // Track frame timing for render performance
                        const frameTime = entry.duration || entry.startTime;
                        const fps = frameTime > 0 ? 1000 / frameTime : 60;
                        // Store for later correlation with render measurements
                        if (fps < 55) { // Below 55fps indicates performance issues
                            this.recordRenderingPerformance(frameTime, 0, fps);
                        }
                    }
                }
            });
            this.frameRateObserver.observe({ entryTypes: ['measure', 'paint'] });
            // Observe user interactions
            this.interactionObserver = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    if (entry.entryType === 'event') {
                        const eventEntry = entry;
                        const latency = eventEntry.processingEnd - eventEntry.startTime;
                        let interactionType = 'click';
                        if (eventEntry.name.includes('key'))
                            interactionType = 'keyboard';
                        else if (eventEntry.name.includes('touch'))
                            interactionType = 'touch';
                        this.recordInteractionLatency(interactionType, latency, eventEntry.target?.toString());
                    }
                }
            });
            // Only observe if the browser supports it
            if ('PerformanceEventTiming' in window) {
                this.interactionObserver.observe({ entryTypes: ['event'] });
            }
        }
        catch (error) {
            console.warn('Performance observers not fully supported:', error);
        }
    }
    establishDefaultBaselines() {
        // Default baseline for general performance
        this.establishBaseline('default', 200, 16.67, 100, 0.2);
        // Specific baselines for different operations
        this.establishBaseline('search_query', 150, 16.67, 50, 0.15);
        this.establishBaseline('result_rendering', 50, 16.67, 30, 0.1);
        this.establishBaseline('user_interaction', 16, 16.67, 100, 0.25);
    }
    checkForRegressions(operation, measurement) {
        // Only check every 10th measurement to avoid performance impact
        if (this.measurementIdCounter % 10 !== 0)
            return;
        const regression = this.detectRegressions(operation);
        if (regression.detected) {
            // Emit performance regression event
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('performance-regression', {
                    detail: { operation, regression, measurement }
                }));
            }
        }
    }
    generateRegressionRecommendations(metrics, severity) {
        const recommendations = [];
        if (metrics.includes('response_time')) {
            recommendations.push('Consider implementing or improving result caching');
            recommendations.push('Review data source query optimization');
            if (severity === 'severe') {
                recommendations.push('Implement request debouncing or throttling');
            }
        }
        if (metrics.includes('render_time')) {
            recommendations.push('Optimize result rendering with virtual scrolling');
            recommendations.push('Reduce DOM manipulations during rendering');
            if (severity === 'severe') {
                recommendations.push('Consider implementing progressive rendering');
            }
        }
        if (metrics.includes('interaction_latency')) {
            recommendations.push('Optimize event handlers and reduce processing time');
            recommendations.push('Implement event delegation for better performance');
        }
        return recommendations;
    }
    getPercentile(sortedArray, percentile) {
        if (sortedArray.length === 0)
            return 0;
        const index = Math.ceil(sortedArray.length * percentile) - 1;
        return sortedArray[Math.max(0, Math.min(index, sortedArray.length - 1))];
    }
}
/**
 * Global performance tracker instance
 */
export const performanceTracker = new PerformanceTracker();
//# sourceMappingURL=PerformanceTracker.js.map