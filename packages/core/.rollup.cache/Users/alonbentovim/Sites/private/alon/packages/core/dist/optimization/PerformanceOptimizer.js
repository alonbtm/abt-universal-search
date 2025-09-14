export class PerformanceOptimizer {
    constructor(config = {}, events = {}, budget = {}, adaptiveConfig = {}) {
        this.isMonitoring = false;
        this.frameCallbacks = new Map();
        this.nextCallbackId = 1;
        this.metrics = {
            currentFrameRate: 60,
            averageFrameRate: 60,
            frameTimeP95: 16.67,
            renderTimeP95: 8,
            memoryUsage: 0,
            totalFrames: 0,
            droppedFrames: 0,
            gcCollections: 0
        };
        this.frameHistory = [];
        this.lastFrameTime = 0;
        this.frameStartTime = 0;
        this.renderStartTime = 0;
        this.currentQualityLevel = 0;
        this.qualityLevels = [];
        this.memoryObserver = null;
        this.paintObserver = null;
        this.layoutObserver = null;
        this.config = {
            targetFrameRate: 60,
            maxFrameTime: 16.67,
            enableFrameMonitoring: true,
            enableMemoryMonitoring: true,
            adaptiveQuality: true,
            alertThresholds: {
                frameDrops: 5,
                memoryUsage: 100 * 1024 * 1024, // 100MB
                renderTime: 10
            },
            ...config
        };
        this.budget = {
            targetFrameRate: this.config.targetFrameRate,
            maxFrameTime: this.config.maxFrameTime,
            maxRenderTime: 8,
            memoryThreshold: this.config.alertThresholds.memoryUsage,
            gcThreshold: 50 * 1024 * 1024, // 50MB
            ...budget
        };
        this.adaptiveConfig = {
            enableAdaptive: true,
            performanceThreshold: 0.8,
            qualityLevels: this.getDefaultQualityLevels(),
            adaptationStrategy: 'balanced',
            ...adaptiveConfig
        };
        this.events = events;
        this.qualityLevels = this.adaptiveConfig.qualityLevels;
        this.initializeObservers();
    }
    getDefaultQualityLevels() {
        return [
            {
                name: 'high',
                itemHeight: 40,
                bufferSize: 10,
                renderBatchSize: 100,
                enableAnimations: true,
                enableShadows: true
            },
            {
                name: 'medium',
                itemHeight: 36,
                bufferSize: 7,
                renderBatchSize: 75,
                enableAnimations: true,
                enableShadows: false
            },
            {
                name: 'low',
                itemHeight: 32,
                bufferSize: 5,
                renderBatchSize: 50,
                enableAnimations: false,
                enableShadows: false
            },
            {
                name: 'minimal',
                itemHeight: 28,
                bufferSize: 3,
                renderBatchSize: 25,
                enableAnimations: false,
                enableShadows: false
            }
        ];
    }
    initializeObservers() {
        if (typeof PerformanceObserver === 'undefined')
            return;
        // Memory observer
        if (this.config.enableMemoryMonitoring) {
            try {
                this.memoryObserver = new PerformanceObserver(list => {
                    for (const entry of list.getEntries()) {
                        if (entry.entryType === 'measure' && entry.name === 'memory') {
                            this.handleMemoryMeasurement(entry);
                        }
                    }
                });
                this.memoryObserver.observe({ entryTypes: ['measure'] });
            }
            catch (error) {
                console.warn('Memory performance observer not supported:', error);
            }
        }
        // Paint observer
        try {
            this.paintObserver = new PerformanceObserver(list => {
                for (const entry of list.getEntries()) {
                    this.handlePaintMeasurement(entry);
                }
            });
            this.paintObserver.observe({ entryTypes: ['paint'] });
        }
        catch (error) {
            console.warn('Paint performance observer not supported:', error);
        }
        // Layout observer
        try {
            this.layoutObserver = new PerformanceObserver(list => {
                for (const entry of list.getEntries()) {
                    this.handleLayoutMeasurement(entry);
                }
            });
            this.layoutObserver.observe({ entryTypes: ['layout-shift'] });
        }
        catch (error) {
            console.warn('Layout performance observer not supported:', error);
        }
    }
    startMonitoring() {
        if (this.isMonitoring)
            return;
        this.isMonitoring = true;
        this.lastFrameTime = performance.now();
        if (this.config.enableFrameMonitoring) {
            this.scheduleFrameMonitoring();
        }
        this.startMemoryMonitoring();
    }
    stopMonitoring() {
        this.isMonitoring = false;
        if (this.memoryObserver) {
            this.memoryObserver.disconnect();
        }
        if (this.paintObserver) {
            this.paintObserver.disconnect();
        }
        if (this.layoutObserver) {
            this.layoutObserver.disconnect();
        }
    }
    scheduleFrameMonitoring() {
        if (!this.isMonitoring)
            return;
        this.frameStartTime = performance.now();
        requestAnimationFrame((timestamp) => {
            this.measureFrame(timestamp);
            this.scheduleFrameMonitoring();
        });
    }
    measureFrame(timestamp) {
        const frameTime = timestamp - this.lastFrameTime;
        const renderTime = this.renderStartTime > 0 ? performance.now() - this.renderStartTime : 0;
        const frameMetrics = {
            frameTime,
            renderTime,
            layoutTime: 0, // Will be updated by layout observer
            paintTime: 0, // Will be updated by paint observer
            memoryUsage: this.getCurrentMemoryUsage(),
            timestamp
        };
        this.updateMetrics(frameMetrics);
        this.checkPerformanceThresholds(frameMetrics);
        this.lastFrameTime = timestamp;
        this.renderStartTime = 0;
    }
    updateMetrics(frameMetrics) {
        this.metrics.totalFrames++;
        // Update frame rate
        if (frameMetrics.frameTime > 0) {
            this.metrics.currentFrameRate = 1000 / frameMetrics.frameTime;
        }
        // Track dropped frames (frames that took longer than budget)
        if (frameMetrics.frameTime > this.budget.maxFrameTime) {
            this.metrics.droppedFrames++;
            this.events.onFrameDrop?.(frameMetrics);
        }
        // Update averages
        const alpha = 0.1; // Smoothing factor
        this.metrics.averageFrameRate =
            this.metrics.averageFrameRate * (1 - alpha) +
                this.metrics.currentFrameRate * alpha;
        // Store frame history for P95 calculations
        this.frameHistory.push(frameMetrics);
        if (this.frameHistory.length > 100) {
            this.frameHistory.shift();
        }
        // Calculate P95 metrics
        this.updatePercentileMetrics();
        // Update memory usage
        this.metrics.memoryUsage = frameMetrics.memoryUsage;
    }
    updatePercentileMetrics() {
        if (this.frameHistory.length < 10)
            return;
        const frameTimes = this.frameHistory.map(f => f.frameTime).sort((a, b) => a - b);
        const renderTimes = this.frameHistory.map(f => f.renderTime).sort((a, b) => a - b);
        const p95Index = Math.floor(frameTimes.length * 0.95);
        this.metrics.frameTimeP95 = frameTimes[p95Index];
        this.metrics.renderTimeP95 = renderTimes[p95Index];
    }
    checkPerformanceThresholds(frameMetrics) {
        // Check frame drop threshold
        const frameDropRate = this.metrics.droppedFrames / this.metrics.totalFrames;
        if (frameDropRate > this.config.alertThresholds.frameDrops / 100) {
            this.emitAlert('frame-drop', 'warning', `High frame drop rate: ${(frameDropRate * 100).toFixed(1)}%`);
        }
        // Check memory threshold
        if (frameMetrics.memoryUsage > this.config.alertThresholds.memoryUsage) {
            this.emitAlert('memory-high', 'warning', `High memory usage: ${(frameMetrics.memoryUsage / 1024 / 1024).toFixed(1)}MB`);
            this.events.onMemoryPressure?.(frameMetrics.memoryUsage);
        }
        // Check render time threshold
        if (frameMetrics.renderTime > this.config.alertThresholds.renderTime) {
            this.emitAlert('render-slow', 'warning', `Slow render time: ${frameMetrics.renderTime.toFixed(1)}ms`);
        }
        // Check if we should adapt quality
        if (this.adaptiveConfig.enableAdaptive && this.shouldAdaptQuality()) {
            this.adaptQuality();
        }
    }
    emitAlert(type, severity, message) {
        const alert = {
            type,
            severity,
            message,
            metrics: { ...this.metrics },
            timestamp: Date.now()
        };
        this.events.onPerformanceAlert?.(alert);
    }
    shouldAdaptQuality() {
        const performanceScore = this.calculatePerformanceScore();
        return performanceScore < this.adaptiveConfig.performanceThreshold;
    }
    calculatePerformanceScore() {
        // Calculate a performance score between 0 and 1
        const frameRateScore = Math.min(this.metrics.currentFrameRate / this.budget.targetFrameRate, 1);
        const memoryScore = Math.max(0, 1 - (this.metrics.memoryUsage / this.budget.memoryThreshold));
        const renderTimeScore = Math.max(0, 1 - (this.metrics.renderTimeP95 / this.budget.maxRenderTime));
        return (frameRateScore + memoryScore + renderTimeScore) / 3;
    }
    adaptQuality() {
        const performanceScore = this.calculatePerformanceScore();
        let targetQualityLevel;
        switch (this.adaptiveConfig.adaptationStrategy) {
            case 'aggressive':
                targetQualityLevel = performanceScore < 0.5 ? this.qualityLevels.length - 1 :
                    performanceScore < 0.7 ? Math.min(this.currentQualityLevel + 1, this.qualityLevels.length - 1) :
                        Math.max(0, this.currentQualityLevel - 1);
                break;
            case 'conservative':
                targetQualityLevel = performanceScore < 0.3 ? Math.min(this.currentQualityLevel + 1, this.qualityLevels.length - 1) :
                    performanceScore > 0.8 ? Math.max(0, this.currentQualityLevel - 1) :
                        this.currentQualityLevel;
                break;
            case 'balanced':
            default:
                targetQualityLevel = performanceScore < 0.4 ? Math.min(this.currentQualityLevel + 1, this.qualityLevels.length - 1) :
                    performanceScore > 0.7 ? Math.max(0, this.currentQualityLevel - 1) :
                        this.currentQualityLevel;
                break;
        }
        if (targetQualityLevel !== this.currentQualityLevel) {
            this.setQualityLevel(targetQualityLevel);
        }
    }
    setQualityLevel(level) {
        if (level < 0 || level >= this.qualityLevels.length)
            return;
        this.currentQualityLevel = level;
        const qualityLevel = this.qualityLevels[level];
        this.events.onQualityChange?.(qualityLevel);
        this.events.onOptimizationApplied?.(`Quality level changed to: ${qualityLevel.name}`);
    }
    getCurrentQualityLevel() {
        return this.qualityLevels[this.currentQualityLevel];
    }
    startMemoryMonitoring() {
        if (!this.config.enableMemoryMonitoring)
            return;
        // Periodic memory measurement
        const measureMemory = () => {
            if (!this.isMonitoring)
                return;
            const memoryUsage = this.getCurrentMemoryUsage();
            if (memoryUsage > this.budget.memoryThreshold) {
                this.triggerGarbageCollection();
            }
            setTimeout(measureMemory, 5000); // Check every 5 seconds
        };
        measureMemory();
    }
    getCurrentMemoryUsage() {
        if ('memory' in performance && performance.memory) {
            return performance.memory.usedJSHeapSize || 0;
        }
        return 0;
    }
    triggerGarbageCollection() {
        // Force garbage collection if available (Chrome DevTools)
        if (window.gc) {
            window.gc();
            this.metrics.gcCollections++;
            this.events.onOptimizationApplied?.('Garbage collection triggered');
        }
    }
    handleMemoryMeasurement(entry) {
        // Handle memory measurements from PerformanceObserver
        if (entry.duration > this.budget.gcThreshold) {
            this.emitAlert('gc-pressure', 'warning', `Long GC pause: ${entry.duration.toFixed(1)}ms`);
        }
    }
    handlePaintMeasurement(entry) {
        // Update paint time in current frame metrics
        const currentFrame = this.frameHistory[this.frameHistory.length - 1];
        if (currentFrame) {
            currentFrame.paintTime = entry.duration;
        }
    }
    handleLayoutMeasurement(entry) {
        // Handle layout shift measurements
        if (entry.hadRecentInput)
            return; // Ignore user-initiated layout shifts
        const currentFrame = this.frameHistory[this.frameHistory.length - 1];
        if (currentFrame) {
            currentFrame.layoutTime += entry.duration;
        }
    }
    getMetrics() {
        return { ...this.metrics };
    }
    setBudget(budget) {
        this.budget = { ...budget };
    }
    shouldReduceQuality() {
        const performanceScore = this.calculatePerformanceScore();
        return performanceScore < this.adaptiveConfig.performanceThreshold;
    }
    optimizeForPerformance() {
        // Apply immediate performance optimizations
        this.triggerGarbageCollection();
        // Reduce quality if needed
        if (this.shouldReduceQuality()) {
            this.adaptQuality();
        }
        // Additional optimizations
        this.events.onOptimizationApplied?.('Performance optimization applied');
    }
    requestFrame(callback) {
        const id = this.nextCallbackId++;
        this.frameCallbacks.set(id, callback);
        const wrappedCallback = (timestamp) => {
            this.renderStartTime = performance.now();
            try {
                callback(timestamp);
            }
            finally {
                this.frameCallbacks.delete(id);
            }
        };
        return requestAnimationFrame(wrappedCallback);
    }
    cancelFrame(handle) {
        this.frameCallbacks.delete(handle);
        cancelAnimationFrame(handle);
    }
    setAdaptiveConfig(config) {
        this.adaptiveConfig = { ...this.adaptiveConfig, ...config };
    }
    addQualityLevel(level) {
        this.qualityLevels.push(level);
    }
    removeQualityLevel(name) {
        const index = this.qualityLevels.findIndex(level => level.name === name);
        if (index > -1 && this.qualityLevels.length > 1) {
            this.qualityLevels.splice(index, 1);
            // Adjust current quality level if needed
            if (this.currentQualityLevel >= this.qualityLevels.length) {
                this.currentQualityLevel = this.qualityLevels.length - 1;
            }
        }
    }
    getBudget() {
        return { ...this.budget };
    }
    isMonitoringActive() {
        return this.isMonitoring;
    }
    getFrameHistory() {
        return [...this.frameHistory];
    }
    dispose() {
        this.stopMonitoring();
        this.frameCallbacks.clear();
        this.frameHistory = [];
    }
}
//# sourceMappingURL=PerformanceOptimizer.js.map