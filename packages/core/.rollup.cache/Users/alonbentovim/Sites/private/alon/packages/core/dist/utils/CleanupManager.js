/**
 * Cleanup Manager - Event cleanup and memory management utilities
 * @description Manages event listener cleanup and prevents memory leaks
 */
/**
 * Advanced cleanup manager with leak detection and resource tracking
 */
export class AdvancedCleanupManager {
    constructor(options = {}) {
        this.resources = new Map();
        this.groups = new Map();
        this.statistics = this.initializeStatistics();
        this.leakDetectionConfig = {
            enabled: true,
            checkInterval: 60000, // 1 minute
            ageThreshold: 300000, // 5 minutes
            maxResources: 1000
        };
        this.debugMode = false;
        this.isShuttingDown = false;
        this.leakDetectionConfig = { ...this.leakDetectionConfig, ...options.leakDetectionConfig };
        this.debugMode = options.debugMode || false;
        if (options.autoStart !== false) {
            this.startLeakDetection();
        }
        // Set up global cleanup on page unload
        if (typeof window !== 'undefined') {
            window.addEventListener('beforeunload', () => this.shutdown());
        }
        // Set up process cleanup for Node.js
        if (typeof process !== 'undefined') {
            process.on('exit', () => this.shutdown());
            process.on('SIGTERM', () => this.shutdown());
            process.on('SIGINT', () => this.shutdown());
        }
    }
    /**
     * Track a resource for cleanup
     */
    trackResource(type, name, cleanup, options = {}) {
        const id = this.generateResourceId();
        const now = Date.now();
        const resource = {
            id,
            type,
            name,
            cleanup,
            created: now,
            lastAccessed: now,
            metadata: options.metadata,
            priority: options.priority || 0,
            critical: options.critical || false
        };
        this.resources.set(id, resource);
        this.statistics.totalTracked++;
        this.statistics.byType[type] = (this.statistics.byType[type] || 0) + 1;
        this.statistics.activeResources++;
        // Add to group if specified
        if (options.groupId) {
            const group = this.groups.get(options.groupId);
            if (group) {
                group.resources.add(id);
            }
        }
        if (this.debugMode) {
            console.log(`[CleanupManager] Tracking resource: ${name} (${type}) - ${id}`);
        }
        return id;
    }
    /**
     * Track an event listener
     */
    trackEventListener(target, event, listener, options) {
        return this.trackResource('event-listener', `${target.constructor.name}:${event}`, () => target.removeEventListener(event, listener, options), {
            metadata: { event, target: target.constructor.name, options }
        });
    }
    /**
     * Track a timer (setTimeout/setInterval)
     */
    trackTimer(timerId, type) {
        return this.trackResource('timer', `${type}:${timerId}`, () => {
            if (type === 'timeout') {
                clearTimeout(timerId);
            }
            else {
                clearInterval(timerId);
            }
        }, {
            metadata: { timerId, type }
        });
    }
    /**
     * Track a subscription (e.g., RxJS, EventEmitter)
     */
    trackSubscription(name, unsubscribe, metadata) {
        return this.trackResource('subscription', name, unsubscribe, { metadata });
    }
    /**
     * Track an observer (e.g., MutationObserver, IntersectionObserver)
     */
    trackObserver(observer, name, metadata) {
        return this.trackResource('observer', name, () => observer.disconnect(), { metadata });
    }
    /**
     * Create a cleanup group
     */
    createGroup(id, name, options = {}) {
        const group = {
            id,
            name,
            resources: new Set(),
            priority: options.priority || 0,
            atomic: options.atomic || false,
            metadata: options.metadata
        };
        this.groups.set(id, group);
        if (this.debugMode) {
            console.log(`[CleanupManager] Created cleanup group: ${name} - ${id}`);
        }
    }
    /**
     * Add resource to a group
     */
    addToGroup(resourceId, groupId) {
        const resource = this.resources.get(resourceId);
        const group = this.groups.get(groupId);
        if (resource && group) {
            group.resources.add(resourceId);
            if (this.debugMode) {
                console.log(`[CleanupManager] Added resource ${resourceId} to group ${groupId}`);
            }
            return true;
        }
        return false;
    }
    /**
     * Clean up a specific resource
     */
    async cleanupResource(resourceId) {
        const resource = this.resources.get(resourceId);
        if (!resource) {
            return false;
        }
        const startTime = performance.now();
        try {
            await resource.cleanup();
            this.resources.delete(resourceId);
            this.statistics.totalCleaned++;
            this.statistics.activeResources--;
            const cleanupTime = performance.now() - startTime;
            this.statistics.performance.totalCleanupTime += cleanupTime;
            this.updateAverageCleanupTime();
            if (this.debugMode) {
                console.log(`[CleanupManager] Cleaned up resource: ${resource.name} - ${resourceId}`);
            }
            return true;
        }
        catch (error) {
            this.statistics.performance.failedCleanups++;
            if (this.debugMode) {
                console.error(`[CleanupManager] Failed to cleanup resource ${resourceId}:`, error);
            }
            return false;
        }
    }
    /**
     * Clean up resources by type
     */
    async cleanupByType(type) {
        const resources = Array.from(this.resources.values()).filter(r => r.type === type);
        return this.cleanupResources(resources.map(r => r.id));
    }
    /**
     * Clean up a group of resources
     */
    async cleanupGroup(groupId) {
        const group = this.groups.get(groupId);
        if (!group) {
            return {
                success: false,
                resourcesCleaned: 0,
                failed: 0,
                totalTime: 0,
                results: []
            };
        }
        const resourceIds = Array.from(group.resources);
        const result = await this.cleanupResources(resourceIds, group.atomic);
        // Remove the group after cleanup
        this.groups.delete(groupId);
        if (this.debugMode) {
            console.log(`[CleanupManager] Cleaned up group: ${group.name} - ${resourceIds.length} resources`);
        }
        return result;
    }
    /**
     * Clean up multiple resources
     */
    async cleanupResources(resourceIds, atomic = false) {
        const startTime = performance.now();
        const results = [];
        let resourcesCleaned = 0;
        let failed = 0;
        if (atomic) {
            // Atomic cleanup - all or nothing
            try {
                for (const resourceId of resourceIds) {
                    const resource = this.resources.get(resourceId);
                    if (resource) {
                        const resourceStart = performance.now();
                        await resource.cleanup();
                        results.push({
                            resourceId,
                            success: true,
                            time: performance.now() - resourceStart
                        });
                        resourcesCleaned++;
                    }
                }
                // Remove all resources only if all succeeded
                resourceIds.forEach(id => this.resources.delete(id));
            }
            catch (error) {
                failed = resourceIds.length;
                results.forEach(r => r.success = false);
            }
        }
        else {
            // Individual cleanup
            for (const resourceId of resourceIds) {
                const resourceStart = performance.now();
                const success = await this.cleanupResource(resourceId);
                results.push({
                    resourceId,
                    success,
                    time: performance.now() - resourceStart
                });
                if (success) {
                    resourcesCleaned++;
                }
                else {
                    failed++;
                }
            }
        }
        const totalTime = performance.now() - startTime;
        return {
            success: failed === 0,
            resourcesCleaned,
            failed,
            totalTime,
            results
        };
    }
    /**
     * Clean up all resources
     */
    async cleanupAll(respectCritical = true) {
        const resources = Array.from(this.resources.values());
        const resourcesToClean = respectCritical
            ? resources.filter(r => !r.critical)
            : resources;
        // Sort by priority (higher priority cleaned first)
        resourcesToClean.sort((a, b) => b.priority - a.priority);
        return this.cleanupResources(resourcesToClean.map(r => r.id));
    }
    /**
     * Start leak detection monitoring
     */
    startLeakDetection() {
        if (!this.leakDetectionConfig.enabled || this.leakDetectionTimer) {
            return;
        }
        this.leakDetectionTimer = window.setInterval(() => {
            this.checkForLeaks();
        }, this.leakDetectionConfig.checkInterval);
        if (this.debugMode) {
            console.log('[CleanupManager] Started leak detection monitoring');
        }
    }
    /**
     * Stop leak detection monitoring
     */
    stopLeakDetection() {
        if (this.leakDetectionTimer) {
            clearInterval(this.leakDetectionTimer);
            this.leakDetectionTimer = undefined;
            if (this.debugMode) {
                console.log('[CleanupManager] Stopped leak detection monitoring');
            }
        }
    }
    /**
     * Check for memory leaks
     */
    checkForLeaks() {
        const now = Date.now();
        const { ageThreshold, maxResources, onLeakDetected } = this.leakDetectionConfig;
        // Check resource count
        if (this.resources.size > maxResources) {
            if (this.debugMode) {
                console.warn(`[CleanupManager] Resource count exceeded limit: ${this.resources.size} > ${maxResources}`);
            }
        }
        // Check for old resources
        for (const resource of this.resources.values()) {
            const age = now - resource.lastAccessed;
            if (age > ageThreshold && !resource.critical) {
                this.statistics.leaksDetected++;
                if (this.debugMode) {
                    console.warn(`[CleanupManager] Potential leak detected: ${resource.name} (age: ${age}ms)`);
                }
                if (onLeakDetected) {
                    onLeakDetected(resource);
                }
            }
        }
    }
    /**
     * Get cleanup statistics
     */
    getStatistics() {
        this.calculateAverageLifetime();
        return { ...this.statistics };
    }
    /**
     * Get resource information
     */
    getResourceInfo(resourceId) {
        if (resourceId) {
            return this.resources.get(resourceId);
        }
        return Array.from(this.resources.values());
    }
    /**
     * Get active resource count
     */
    getActiveResourceCount() {
        return this.resources.size;
    }
    /**
     * Get resources by type
     */
    getResourcesByType(type) {
        return Array.from(this.resources.values()).filter(r => r.type === type);
    }
    /**
     * Access a resource (updates lastAccessed timestamp)
     */
    accessResource(resourceId) {
        const resource = this.resources.get(resourceId);
        if (resource) {
            resource.lastAccessed = Date.now();
            return true;
        }
        return false;
    }
    /**
     * Shutdown cleanup manager and clean up all resources
     */
    async shutdown() {
        if (this.isShuttingDown) {
            return {
                success: true,
                resourcesCleaned: 0,
                failed: 0,
                totalTime: 0,
                results: []
            };
        }
        this.isShuttingDown = true;
        this.stopLeakDetection();
        if (this.debugMode) {
            console.log('[CleanupManager] Shutting down and cleaning up all resources');
        }
        const result = await this.cleanupAll(false); // Don't respect critical flag during shutdown
        if (this.debugMode) {
            console.log(`[CleanupManager] Shutdown complete: ${result.resourcesCleaned} resources cleaned, ${result.failed} failed`);
        }
        return result;
    }
    /**
     * Reset statistics
     */
    resetStatistics() {
        this.statistics = this.initializeStatistics();
        this.statistics.activeResources = this.resources.size;
    }
    /**
     * Generate unique resource ID
     */
    generateResourceId() {
        return `resource_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    /**
     * Initialize statistics
     */
    initializeStatistics() {
        return {
            totalTracked: 0,
            totalCleaned: 0,
            byType: {},
            activeResources: 0,
            leaksDetected: 0,
            averageLifetime: 0,
            performance: {
                averageCleanupTime: 0,
                totalCleanupTime: 0,
                failedCleanups: 0
            }
        };
    }
    /**
     * Update average cleanup time
     */
    updateAverageCleanupTime() {
        if (this.statistics.totalCleaned > 0) {
            this.statistics.performance.averageCleanupTime =
                this.statistics.performance.totalCleanupTime / this.statistics.totalCleaned;
        }
    }
    /**
     * Calculate average resource lifetime
     */
    calculateAverageLifetime() {
        const now = Date.now();
        let totalLifetime = 0;
        let count = 0;
        for (const resource of this.resources.values()) {
            totalLifetime += now - resource.created;
            count++;
        }
        this.statistics.averageLifetime = count > 0 ? totalLifetime / count : 0;
    }
}
/**
 * Cleanup utilities for common patterns
 */
export class CleanupUtils {
    /**
     * Create a cleanup function that combines multiple cleanup tasks
     */
    static combine(...cleanupTasks) {
        return async () => {
            const promises = cleanupTasks.map(async (task) => {
                try {
                    await task();
                }
                catch (error) {
                    console.error('Cleanup task failed:', error);
                }
            });
            await Promise.all(promises);
        };
    }
    /**
     * Create a debounced cleanup function
     */
    static debounce(cleanup, delay) {
        let timeoutId;
        return () => {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
            timeoutId = window.setTimeout(async () => {
                await cleanup();
                timeoutId = undefined;
            }, delay);
        };
    }
    /**
     * Create a cleanup function with retry logic
     */
    static withRetry(cleanup, maxRetries = 3, delay = 1000) {
        return async () => {
            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                    await cleanup();
                    return; // Success
                }
                catch (error) {
                    if (attempt === maxRetries) {
                        throw error; // Final attempt failed
                    }
                    // Wait before retry
                    await new Promise(resolve => setTimeout(resolve, delay * attempt));
                }
            }
        };
    }
}
/**
 * Global cleanup manager instance
 */
export const cleanupManager = new AdvancedCleanupManager({
    debugMode: process.env.NODE_ENV === 'development'
});
//# sourceMappingURL=CleanupManager.js.map