/**
 * Memory Manager - Automatic garbage collection and memory cleanup system
 * @description Manages memory usage, detects leaks, and provides automatic cleanup mechanisms
 */
/**
 * Default memory management configuration
 */
const DEFAULT_CONFIG = {
    autoGC: true,
    gcThreshold: 100 * 1024 * 1024, // 100MB
    gcInterval: 30000, // 30 seconds
    leakDetection: true,
    leakThreshold: 50 * 1024 * 1024, // 50MB
    useWeakReferences: true,
    cleanupStrategies: ['periodic', 'threshold', 'pressure'],
    monitoring: {
        enabled: true,
        interval: 5000, // 5 seconds
        alertThreshold: 200 * 1024 * 1024 // 200MB
    }
};
/**
 * Memory leak detection
 */
class MemoryLeakDetector {
    constructor(snapshotInterval = 10000, maxSnapshots = 20) {
        this.snapshots = new Map();
        this.snapshotInterval = snapshotInterval;
        this.maxSnapshots = maxSnapshots;
    }
    takeSnapshot(trackedObjects) {
        const now = Date.now();
        const memoryUsage = this.getMemoryUsage();
        // Count objects by category
        const objectCounts = new Map();
        for (const obj of Array.from(trackedObjects.values())) {
            const count = objectCounts.get(obj.category) || 0;
            objectCounts.set(obj.category, count + 1);
        }
        const snapshot = {
            timestamp: now,
            heapUsed: memoryUsage.heapUsed,
            objectCounts,
            trackedObjects: trackedObjects.size
        };
        this.snapshots.set(now, snapshot);
        // Clean old snapshots
        if (this.snapshots.size > this.maxSnapshots) {
            const oldestTimestamp = Math.min(...Array.from(this.snapshots.keys()));
            this.snapshots.delete(oldestTimestamp);
        }
    }
    detectLeaks(threshold) {
        if (this.snapshots.size < 3) {
            return [];
        }
        const snapshots = Array.from(this.snapshots.values()).sort((a, b) => a.timestamp - b.timestamp);
        const oldest = snapshots[0];
        const newest = snapshots[snapshots.length - 1];
        if (!oldest || !newest) {
            return [];
        }
        const leaks = [];
        // Check for memory growth trend
        const memoryGrowth = newest.heapUsed - oldest.heapUsed;
        const timeSpan = newest.timestamp - oldest.timestamp;
        const growthRate = memoryGrowth / timeSpan; // bytes per ms
        if (memoryGrowth > threshold) {
            let severity = 'low';
            if (growthRate > 1024) { // > 1KB/ms
                severity = 'high';
            }
            else if (growthRate > 256) { // > 256B/ms
                severity = 'medium';
            }
            leaks.push({
                source: 'heap_growth',
                size: memoryGrowth,
                severity
            });
        }
        // Check for object count increases
        for (const category of Array.from(new Set([
            ...Array.from(oldest.objectCounts.keys()),
            ...Array.from(newest.objectCounts.keys())
        ]))) {
            const oldCount = oldest.objectCounts.get(category) || 0;
            const newCount = newest.objectCounts.get(category) || 0;
            const growth = newCount - oldCount;
            if (growth > 100) { // More than 100 objects accumulated
                let severity = 'low';
                if (growth > 1000)
                    severity = 'high';
                else if (growth > 500)
                    severity = 'medium';
                leaks.push({
                    source: `object_accumulation_${category}`,
                    size: growth * 1024, // Estimate 1KB per object
                    severity
                });
            }
        }
        return leaks;
    }
    getMemoryUsage() {
        if (typeof process !== 'undefined' && process.memoryUsage) {
            const mem = process.memoryUsage();
            return { heapUsed: mem.heapUsed, heapTotal: mem.heapTotal };
        }
        // Browser fallback (limited information)
        if (typeof performance !== 'undefined' && performance.memory) {
            const mem = performance.memory;
            return { heapUsed: mem.usedJSHeapSize, heapTotal: mem.totalJSHeapSize };
        }
        // Fallback estimation
        return { heapUsed: 50 * 1024 * 1024, heapTotal: 100 * 1024 * 1024 };
    }
}
/**
 * Garbage Collection Scheduler
 */
class GCScheduler {
    constructor(config) {
        this.config = config;
        this.intervals = new Map();
        this.thresholdCallbacks = [];
        this.pressureCallbacks = [];
    }
    start() {
        if (this.config.cleanupStrategies.includes('periodic')) {
            this.startPeriodicCleanup();
        }
        if (this.config.cleanupStrategies.includes('threshold')) {
            this.startThresholdMonitoring();
        }
        if (this.config.cleanupStrategies.includes('pressure')) {
            this.startPressureMonitoring();
        }
    }
    stop() {
        for (const interval of Array.from(this.intervals.values())) {
            clearInterval(interval);
        }
        this.intervals.clear();
    }
    onThresholdReached(callback) {
        this.thresholdCallbacks.push(callback);
    }
    onMemoryPressure(callback) {
        this.pressureCallbacks.push(callback);
    }
    startPeriodicCleanup() {
        const interval = setInterval(() => {
            this.triggerGC('periodic');
        }, this.config.gcInterval);
        this.intervals.set('periodic', interval);
    }
    startThresholdMonitoring() {
        const interval = setInterval(() => {
            const memoryUsage = this.getMemoryUsage();
            if (memoryUsage.heapUsed > this.config.gcThreshold) {
                this.triggerGC('threshold');
                this.thresholdCallbacks.forEach(callback => {
                    try {
                        callback();
                    }
                    catch (error) {
                        console.error('GC threshold callback error:', error);
                    }
                });
            }
        }, 5000); // Check every 5 seconds
        this.intervals.set('threshold', interval);
    }
    startPressureMonitoring() {
        // Monitor for memory pressure indicators
        const interval = setInterval(() => {
            const memoryUsage = this.getMemoryUsage();
            const pressureRatio = memoryUsage.heapUsed / memoryUsage.heapTotal;
            if (pressureRatio > 0.8) { // 80% memory usage
                this.triggerGC('pressure');
                this.pressureCallbacks.forEach(callback => {
                    try {
                        callback();
                    }
                    catch (error) {
                        console.error('GC pressure callback error:', error);
                    }
                });
            }
        }, 2000); // Check every 2 seconds
        this.intervals.set('pressure', interval);
    }
    triggerGC(reason) {
        if (typeof global !== 'undefined' && global.gc) {
            try {
                global.gc();
                console.log(`GC triggered: ${reason}`);
            }
            catch (error) {
                console.warn('Manual GC failed:', error);
            }
        }
    }
    getMemoryUsage() {
        if (typeof process !== 'undefined' && process.memoryUsage) {
            const mem = process.memoryUsage();
            return { heapUsed: mem.heapUsed, heapTotal: mem.heapTotal };
        }
        if (typeof performance !== 'undefined' && performance.memory) {
            const mem = performance.memory;
            return { heapUsed: mem.usedJSHeapSize, heapTotal: mem.totalJSHeapSize };
        }
        return { heapUsed: 50 * 1024 * 1024, heapTotal: 100 * 1024 * 1024 };
    }
}
/**
 * Memory Usage Monitor
 */
class MemoryUsageMonitor {
    constructor(config) {
        this.config = config;
        this.interval = null;
        this.history = [];
        this.alertCallbacks = [];
    }
    start() {
        if (!this.config.enabled)
            return;
        this.interval = setInterval(() => {
            this.recordMemoryUsage();
        }, this.config.interval);
    }
    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }
    onAlert(callback) {
        this.alertCallbacks.push(callback);
    }
    getHistory(duration) {
        if (!duration)
            return [...this.history];
        const cutoff = Date.now() - duration;
        return this.history.filter(entry => entry.timestamp >= cutoff);
    }
    getCurrentUsage() {
        if (typeof process !== 'undefined' && process.memoryUsage) {
            return process.memoryUsage();
        }
        if (typeof performance !== 'undefined' && performance.memory) {
            const mem = performance.memory;
            return {
                heapUsed: mem.usedJSHeapSize,
                heapTotal: mem.totalJSHeapSize,
                external: 0
            };
        }
        return {
            heapUsed: 50 * 1024 * 1024,
            heapTotal: 100 * 1024 * 1024,
            external: 0
        };
    }
    recordMemoryUsage() {
        const usage = this.getCurrentUsage();
        this.history.push({
            timestamp: Date.now(),
            heapUsed: usage.heapUsed,
            heapTotal: usage.heapTotal,
            external: usage.external
        });
        // Keep only last 1000 entries
        if (this.history.length > 1000) {
            this.history.shift();
        }
        // Check for alerts
        if (usage.heapUsed > this.config.alertThreshold) {
            this.alertCallbacks.forEach(callback => {
                try {
                    callback(usage.heapUsed);
                }
                catch (error) {
                    console.error('Memory alert callback error:', error);
                }
            });
        }
    }
}
/**
 * Memory Manager Implementation
 */
export class MemoryManager {
    constructor(config = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.trackedObjects = new Map();
        this.leakDetector = new MemoryLeakDetector();
        this.gcScheduler = new GCScheduler(this.config);
        this.monitor = new MemoryUsageMonitor(this.config.monitoring);
        this.memoryLimit = null;
        this.gcStats = {
            totalCollections: 0,
            totalTime: 0,
            freedMemory: 0,
            lastCollection: 0
        };
        this.initialize();
    }
    /**
     * Get memory usage statistics
     */
    getUsageStats() {
        const currentUsage = this.monitor.getCurrentUsage();
        const leaks = this.leakDetector.detectLeaks(this.config.leakThreshold);
        // Calculate category breakdown
        const byCategory = {};
        const byComponent = {};
        for (const obj of Array.from(this.trackedObjects.values())) {
            byCategory[obj.category] = (byCategory[obj.category] || 0) + obj.size;
            const component = obj.metadata.component || 'unknown';
            byComponent[component] = (byComponent[component] || 0) + obj.size;
        }
        return {
            totalAllocated: currentUsage.heapTotal,
            used: currentUsage.heapUsed,
            available: currentUsage.heapTotal - currentUsage.heapUsed,
            byCategory,
            byComponent,
            gc: { ...this.gcStats },
            leaks: leaks.map(leak => ({ ...leak, age: Date.now() - 1000 }))
        };
    }
    /**
     * Trigger garbage collection
     */
    async triggerGC() {
        const startTime = Date.now();
        const beforeUsage = this.monitor.getCurrentUsage();
        try {
            // Clean up dead weak references first
            await this.cleanupDeadReferences();
            // Trigger manual GC if available
            if (typeof global !== 'undefined' && global.gc) {
                global.gc();
            }
            // Wait a bit for GC to complete
            await new Promise(resolve => setTimeout(resolve, 100));
            const afterUsage = this.monitor.getCurrentUsage();
            const freedMemory = Math.max(0, beforeUsage.heapUsed - afterUsage.heapUsed);
            const duration = Date.now() - startTime;
            // Update stats
            this.gcStats.totalCollections++;
            this.gcStats.totalTime += duration;
            this.gcStats.freedMemory += freedMemory;
            this.gcStats.lastCollection = Date.now();
            return { freedMemory, duration };
        }
        catch (error) {
            console.error('Manual GC failed:', error);
            return { freedMemory: 0, duration: Date.now() - startTime };
        }
    }
    /**
     * Detect memory leaks
     */
    async detectLeaks() {
        if (!this.config.leakDetection) {
            return [];
        }
        // Take a snapshot for leak detection
        this.leakDetector.takeSnapshot(this.trackedObjects);
        // Detect leaks
        return this.leakDetector.detectLeaks(this.config.leakThreshold);
    }
    /**
     * Register memory-sensitive object
     */
    register(object, category) {
        const id = this.generateId();
        const now = Date.now();
        const tracked = {
            id,
            object: object, // Simplified object reference
            category,
            size: this.estimateObjectSize(object),
            createdAt: now,
            lastAccessed: now,
            accessCount: 1,
            metadata: {
                component: this.detectComponent(object),
                type: typeof object,
                constructor: object.constructor?.name
            }
        };
        this.trackedObjects.set(id, tracked);
        // Check memory limit
        if (this.memoryLimit) {
            const currentUsage = this.monitor.getCurrentUsage();
            if (currentUsage.heapUsed > this.memoryLimit) {
                this.triggerMemoryPressureCleanup();
            }
        }
        return id;
    }
    /**
     * Unregister object
     */
    unregister(id) {
        return this.trackedObjects.delete(id);
    }
    /**
     * Set memory limit
     */
    setMemoryLimit(limit) {
        this.memoryLimit = limit;
    }
    /**
     * Get memory recommendations
     */
    getRecommendations() {
        const recommendations = [];
        const stats = this.getUsageStats();
        const currentUsage = this.monitor.getCurrentUsage();
        const usageRatio = currentUsage.heapUsed / currentUsage.heapTotal;
        // High memory usage
        if (usageRatio > 0.8) {
            recommendations.push({
                type: 'cleanup',
                description: 'High memory usage detected - consider running garbage collection',
                priority: 9
            });
        }
        // Memory leaks detected
        if (stats.leaks.length > 0) {
            const highSeverityLeaks = stats.leaks.filter(leak => leak.severity === 'high');
            if (highSeverityLeaks.length > 0) {
                recommendations.push({
                    type: 'cleanup',
                    description: 'Critical memory leaks detected - immediate attention required',
                    priority: 10
                });
            }
            else {
                recommendations.push({
                    type: 'cleanup',
                    description: 'Memory leaks detected - review object lifecycles',
                    priority: 7
                });
            }
        }
        // Large category usage
        for (const [category, size] of Object.entries(stats.byCategory)) {
            if (size > 10 * 1024 * 1024) { // > 10MB
                recommendations.push({
                    type: 'optimization',
                    description: `High memory usage in category '${category}' - consider optimization`,
                    priority: 6
                });
            }
        }
        // No memory limit set
        if (!this.memoryLimit) {
            recommendations.push({
                type: 'limit',
                description: 'No memory limit set - consider setting limits for better control',
                priority: 4
            });
        }
        // Inefficient GC
        const avgGCTime = this.gcStats.totalCollections > 0
            ? this.gcStats.totalTime / this.gcStats.totalCollections
            : 0;
        if (avgGCTime > 100) { // > 100ms average
            recommendations.push({
                type: 'optimization',
                description: 'Garbage collection is taking too long - consider object pooling',
                priority: 5
            });
        }
        return recommendations.sort((a, b) => b.priority - a.priority);
    }
    /**
     * Clean up expired objects
     */
    async cleanup() {
        let cleaned = 0;
        let freedMemory = 0;
        const now = Date.now();
        const idsToRemove = [];
        for (const [id, tracked] of Array.from(this.trackedObjects.entries())) {
            const obj = tracked.object.deref();
            // Remove if object was garbage collected or is very old and unused
            const isStale = (now - tracked.lastAccessed) > 3600000; // 1 hour
            const isUnused = tracked.accessCount < 2;
            if (!obj || (isStale && isUnused)) {
                idsToRemove.push(id);
                freedMemory += tracked.size;
                cleaned++;
            }
        }
        idsToRemove.forEach(id => this.trackedObjects.delete(id));
        return { cleaned, freedMemory };
    }
    /**
     * Destroy memory manager
     */
    destroy() {
        this.gcScheduler.stop();
        this.monitor.stop();
        this.trackedObjects.clear();
    }
    // Private implementation methods
    initialize() {
        // Start monitoring and GC scheduling
        if (this.config.autoGC) {
            this.gcScheduler.start();
        }
        this.monitor.start();
        // Set up cleanup on memory pressure
        this.gcScheduler.onMemoryPressure(() => {
            this.triggerMemoryPressureCleanup();
        });
        this.monitor.onAlert((usage) => {
            console.warn(`Memory usage alert: ${(usage / 1024 / 1024).toFixed(2)}MB`);
        });
        // Start leak detection snapshots
        if (this.config.leakDetection) {
            setInterval(() => {
                this.leakDetector.takeSnapshot(this.trackedObjects);
            }, 30000); // Every 30 seconds
        }
    }
    async cleanupDeadReferences() {
        const deadIds = [];
        for (const [id, tracked] of Array.from(this.trackedObjects.entries())) {
            const obj = tracked.object.deref();
            if (!obj) {
                deadIds.push(id);
            }
        }
        deadIds.forEach(id => this.trackedObjects.delete(id));
    }
    triggerMemoryPressureCleanup() {
        // Aggressive cleanup under memory pressure
        const now = Date.now();
        const cutoffTime = now - 300000; // 5 minutes
        const idsToRemove = [];
        for (const [id, tracked] of Array.from(this.trackedObjects.entries())) {
            // Remove less frequently accessed objects
            if (tracked.lastAccessed < cutoffTime && tracked.accessCount < 5) {
                idsToRemove.push(id);
            }
        }
        idsToRemove.forEach(id => this.trackedObjects.delete(id));
        // Trigger immediate GC
        this.triggerGC();
    }
    estimateObjectSize(object) {
        if (object === null || object === undefined)
            return 0;
        try {
            // Try JSON serialization for size estimation
            const json = JSON.stringify(object);
            return json.length * 2; // UTF-16 encoding approximation
        }
        catch {
            // Fallback for non-serializable objects
            if (typeof object === 'string')
                return object.length * 2;
            if (typeof object === 'number')
                return 8;
            if (typeof object === 'boolean')
                return 4;
            if (object instanceof Array)
                return object.length * 100; // Rough estimate
            return 1000; // Default object size estimate
        }
    }
    detectComponent(object) {
        if (!object)
            return 'unknown';
        // Try to detect component from constructor name or properties
        if (object.constructor && object.constructor.name) {
            return object.constructor.name.toLowerCase();
        }
        // Check for common component indicators
        if (object.cache !== undefined)
            return 'cache';
        if (object.query !== undefined)
            return 'query';
        if (object.render !== undefined)
            return 'ui';
        if (object.connect !== undefined)
            return 'connection';
        return 'unknown';
    }
    generateId() {
        return Math.random().toString(36).substring(2) + Date.now().toString(36);
    }
}
/**
 * Object Pool for memory efficiency
 */
export class ObjectPool {
    constructor(createFn, resetFn, maxSize = 100, memoryManager) {
        this.pool = [];
        this.createFn = createFn;
        this.resetFn = resetFn;
        this.maxSize = maxSize;
        this.memoryManager = memoryManager || new MemoryManager();
    }
    acquire() {
        if (this.pool.length > 0) {
            const obj = this.pool.pop();
            this.resetFn(obj);
            return obj;
        }
        const obj = this.createFn();
        if (this.memoryManager) {
            this.memoryManager.register(obj, 'pool_object');
        }
        return obj;
    }
    release(obj) {
        if (this.pool.length < this.maxSize) {
            this.resetFn(obj);
            this.pool.push(obj);
        }
        // If pool is full, let the object be garbage collected
    }
    clear() {
        this.pool.length = 0;
    }
    getStats() {
        return {
            poolSize: this.pool.length,
            maxSize: this.maxSize,
            utilization: (this.maxSize - this.pool.length) / this.maxSize
        };
    }
}
/**
 * Memory-efficient cache with automatic cleanup
 */
export class MemoryEfficientCache {
    constructor(maxSize = 1000, ttl = 300000, // 5 minutes
    memoryManager) {
        this.cache = new Map();
        this.memoryManager = memoryManager || new MemoryManager();
        this.maxSize = maxSize;
        this.ttl = ttl;
        // Register cache with memory manager
        this.memoryManager.register(this.cache, 'cache');
        // Start cleanup interval
        this.cleanupInterval = setInterval(() => {
            this.cleanup();
        }, 60000); // Cleanup every minute
    }
    set(key, value) {
        const now = Date.now();
        // Remove oldest entries if at capacity
        if (this.cache.size >= this.maxSize) {
            this.evictOldest();
        }
        this.cache.set(key, {
            value,
            timestamp: now,
            accessCount: 0
        });
    }
    get(key) {
        const entry = this.cache.get(key);
        if (!entry)
            return undefined;
        const now = Date.now();
        // Check TTL
        if (now - entry.timestamp > this.ttl) {
            this.cache.delete(key);
            return undefined;
        }
        // Update access info
        entry.accessCount++;
        return entry.value;
    }
    delete(key) {
        return this.cache.delete(key);
    }
    clear() {
        this.cache.clear();
    }
    cleanup() {
        const now = Date.now();
        const entriesToRemove = [];
        for (const [key, entry] of Array.from(this.cache.entries())) {
            if (now - entry.timestamp > this.ttl) {
                entriesToRemove.push(key);
            }
        }
        entriesToRemove.forEach(key => this.cache.delete(key));
    }
    getStats() {
        let totalAccesses = 0;
        let memoryUsage = 0;
        for (const entry of Array.from(this.cache.values())) {
            totalAccesses += entry.accessCount;
            memoryUsage += this.estimateSize(entry.value);
        }
        const hits = Math.max(0, totalAccesses - this.cache.size); // Rough estimate
        const hitRate = totalAccesses > 0 ? hits / totalAccesses : 0;
        return {
            size: this.cache.size,
            maxSize: this.maxSize,
            hitRate,
            memoryUsage
        };
    }
    destroy() {
        clearInterval(this.cleanupInterval);
        this.clear();
    }
    evictOldest() {
        let oldestKey = null;
        let oldestTime = Date.now();
        let lowestAccess = Number.MAX_VALUE;
        for (const [key, entry] of Array.from(this.cache.entries())) {
            // Prefer evicting least accessed, then oldest
            if (entry.accessCount < lowestAccess ||
                (entry.accessCount === lowestAccess && entry.timestamp < oldestTime)) {
                oldestKey = key;
                oldestTime = entry.timestamp;
                lowestAccess = entry.accessCount;
            }
        }
        if (oldestKey !== null) {
            this.cache.delete(oldestKey);
        }
    }
    estimateSize(value) {
        try {
            return JSON.stringify(value).length * 2;
        }
        catch {
            return 1000; // Default estimate
        }
    }
}
/**
 * Factory function for creating memory manager instances
 */
export function createMemoryManager(config) {
    return new MemoryManager(config);
}
/**
 * Utility functions for memory management
 */
export function formatMemorySize(bytes) {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }
    return `${size.toFixed(2)} ${units[unitIndex]}`;
}
export function calculateMemoryGrowthRate(samples) {
    if (samples.length < 2)
        return 0;
    const recent = samples.slice(-10); // Last 10 samples
    const oldest = recent[0];
    const newest = recent[recent.length - 1];
    const timeDiff = newest.timestamp - oldest.timestamp;
    const usageDiff = newest.usage - oldest.usage;
    return timeDiff > 0 ? (usageDiff / timeDiff) * 1000 : 0; // bytes per second
}
export function detectMemoryPressure(currentUsage, totalMemory, threshold = 0.8) {
    const usageRatio = currentUsage / totalMemory;
    if (usageRatio < threshold) {
        return {
            underPressure: false,
            severity: 'low',
            recommendation: 'Memory usage is normal'
        };
    }
    let severity = 'medium';
    let recommendation = 'Consider running garbage collection';
    if (usageRatio > 0.95) {
        severity = 'high';
        recommendation = 'Critical: Immediate memory cleanup required';
    }
    else if (usageRatio > 0.9) {
        severity = 'high';
        recommendation = 'High memory usage: Aggressive cleanup recommended';
    }
    return {
        underPressure: true,
        severity,
        recommendation
    };
}
//# sourceMappingURL=MemoryManager.js.map