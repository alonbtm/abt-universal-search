export class DOMPoolManager {
    constructor(config = {}, cullingConfig = {}, events = {}, factory) {
        this.pools = new Map();
        this.inUseElements = new Set();
        this.elementMetadata = new Map();
        this.cleanupTimer = null;
        this.memoryMonitorTimer = null;
        this.stats = {
            totalElements: 0,
            availableElements: 0,
            inUseElements: 0,
            reuseRate: 0,
            memoryUsage: 0
        };
        this.performanceMetrics = {
            elementsCreated: 0,
            elementsReused: 0,
            elementsDestroyed: 0,
            cleanupCycles: 0,
            memoryReclaimed: 0
        };
        this.config = {
            maxPoolSize: 100,
            initialPoolSize: 20,
            enablePooling: true,
            cleanupIntervalMs: 30000, // 30 seconds
            maxIdleTime: 60000, // 1 minute
            ...config
        };
        this.cullingConfig = {
            enableCulling: true,
            cullMargin: 200,
            maxVisibleNodes: 100,
            aggressiveCulling: false,
            ...cullingConfig
        };
        this.events = events;
        this.factory = factory || this.createDefaultFactory();
        this.initializePools();
        this.startCleanupTimer();
        this.startMemoryMonitoring();
    }
    createDefaultFactory() {
        return {
            createElement: (tagName, className) => {
                const element = document.createElement(tagName);
                if (className) {
                    element.className = className;
                }
                return element;
            },
            resetElement: (element) => {
                // Reset common properties
                element.innerHTML = '';
                element.className = element.className.split(' ').filter(c => c.startsWith('pool-')).join(' ');
                element.style.cssText = '';
                element.removeAttribute('data-index');
                element.removeAttribute('aria-label');
                element.removeAttribute('role');
                // Remove event listeners
                const clone = element.cloneNode(false);
                element.parentNode?.replaceChild(clone, element);
            },
            validateElement: (element) => {
                return element.isConnected === false &&
                    element.parentNode === null &&
                    !this.inUseElements.has(element);
            }
        };
    }
    initializePools() {
        if (!this.config.enablePooling)
            return;
        // Pre-populate common element types
        const commonTypes = ['div', 'span', 'li', 'button'];
        commonTypes.forEach(tagName => {
            this.createInitialPool(tagName);
        });
    }
    createInitialPool(tagName) {
        const poolKey = this.getPoolKey(tagName);
        const pool = [];
        for (let i = 0; i < this.config.initialPoolSize; i++) {
            const element = this.factory.createElement(tagName);
            pool.push({
                element,
                isInUse: false,
                lastUsed: Date.now(),
                reuseCount: 0
            });
            this.setElementMetadata(element, {
                tagName,
                poolKey,
                created: Date.now(),
                totalReuseTime: 0
            });
        }
        this.pools.set(poolKey, pool);
        this.updateStats();
    }
    getPoolKey(tagName, className) {
        return className ? `${tagName}.${className}` : tagName;
    }
    acquireElement(tagName, className) {
        if (!this.config.enablePooling) {
            const element = this.factory.createElement(tagName, className);
            this.events.onElementCreated?.(element, tagName);
            return element;
        }
        const poolKey = this.getPoolKey(tagName, className);
        let pool = this.pools.get(poolKey);
        if (!pool) {
            pool = [];
            this.pools.set(poolKey, pool);
        }
        // Find available element
        let pooledElement = pool.find(pe => !pe.isInUse);
        if (!pooledElement) {
            // Create new element if pool is not at capacity
            if (pool.length < this.config.maxPoolSize) {
                const element = this.factory.createElement(tagName, className);
                pooledElement = {
                    element,
                    isInUse: false,
                    lastUsed: Date.now(),
                    reuseCount: 0
                };
                pool.push(pooledElement);
                this.setElementMetadata(element, {
                    tagName,
                    poolKey,
                    created: Date.now(),
                    totalReuseTime: 0
                });
                this.performanceMetrics.elementsCreated++;
                this.events.onElementCreated?.(element, tagName);
            }
            else {
                // Pool is full, create temporary element
                const element = this.factory.createElement(tagName, className);
                this.events.onElementCreated?.(element, tagName);
                return element;
            }
        }
        else {
            // Reuse existing element
            this.factory.resetElement(pooledElement.element);
            pooledElement.reuseCount++;
            this.performanceMetrics.elementsReused++;
            const metadata = this.elementMetadata.get(pooledElement.element);
            if (metadata) {
                metadata.totalReuseTime += Date.now() - pooledElement.lastUsed;
            }
            this.events.onElementReused?.(pooledElement.element, pooledElement.reuseCount);
        }
        // Mark as in use
        pooledElement.isInUse = true;
        pooledElement.lastUsed = Date.now();
        this.inUseElements.add(pooledElement.element);
        this.updateStats();
        return pooledElement.element;
    }
    releaseElement(element) {
        if (!this.config.enablePooling) {
            this.destroyElement(element);
            return;
        }
        // Find the pooled element
        let pooledElement;
        let pool;
        for (const [, currentPool] of Array.from(this.pools)) {
            pooledElement = currentPool.find((pe) => pe.element === element);
            if (pooledElement) {
                pool = currentPool;
                break;
            }
        }
        if (!pooledElement || !pool) {
            // Element not from pool, destroy it
            this.destroyElement(element);
            return;
        }
        // Validate element before returning to pool
        if (!this.factory.validateElement(element)) {
            // Element is corrupted, remove from pool
            const index = pool.indexOf(pooledElement);
            if (index > -1) {
                pool.splice(index, 1);
                this.destroyElement(element);
            }
            return;
        }
        // Return to pool
        pooledElement.isInUse = false;
        pooledElement.lastUsed = Date.now();
        this.inUseElements.delete(element);
        this.factory.resetElement(element);
        this.events.onElementReleased?.(element);
        this.updateStats();
    }
    destroyElement(element) {
        this.inUseElements.delete(element);
        this.elementMetadata.delete(element);
        // Remove from DOM if attached
        if (element.parentNode) {
            element.parentNode.removeChild(element);
        }
        this.performanceMetrics.elementsDestroyed++;
    }
    setElementMetadata(element, metadata) {
        this.elementMetadata.set(element, metadata);
    }
    getPoolStats() {
        return { ...this.stats };
    }
    updateStats() {
        let totalElements = 0;
        let availableElements = 0;
        let inUseElements = 0;
        for (const pool of Array.from(this.pools.values())) {
            totalElements += pool.length;
            availableElements += pool.filter((pe) => !pe.isInUse).length;
            inUseElements += pool.filter((pe) => pe.isInUse).length;
        }
        const totalOperations = this.performanceMetrics.elementsCreated + this.performanceMetrics.elementsReused;
        const reuseRate = totalOperations > 0 ? this.performanceMetrics.elementsReused / totalOperations : 0;
        this.stats = {
            totalElements,
            availableElements,
            inUseElements,
            reuseRate,
            memoryUsage: this.estimateMemoryUsage()
        };
    }
    estimateMemoryUsage() {
        // Rough estimation of memory usage
        let memoryUsage = 0;
        for (const pool of Array.from(this.pools.values())) {
            memoryUsage += pool.length * 1024; // Assume ~1KB per DOM element
        }
        return memoryUsage;
    }
    cleanup() {
        if (!this.config.enablePooling)
            return;
        const now = Date.now();
        let removedCount = 0;
        for (const [poolKey, pool] of Array.from(this.pools)) {
            for (let i = pool.length - 1; i >= 0; i--) {
                const pooledElement = pool[i];
                if (!pooledElement.isInUse &&
                    now - pooledElement.lastUsed > this.config.maxIdleTime) {
                    // Remove idle element
                    pool.splice(i, 1);
                    this.destroyElement(pooledElement.element);
                    removedCount++;
                }
            }
            // Remove empty pools
            if (pool.length === 0) {
                this.pools.delete(poolKey);
            }
        }
        if (removedCount > 0) {
            this.performanceMetrics.cleanupCycles++;
            this.performanceMetrics.memoryReclaimed += removedCount * 1024; // Estimated
            this.events.onPoolCleanup?.(removedCount);
        }
        this.updateStats();
    }
    reset() {
        // Release all elements and clear pools
        for (const pool of Array.from(this.pools.values())) {
            for (const pooledElement of pool) {
                this.destroyElement(pooledElement.element);
            }
        }
        this.pools.clear();
        this.inUseElements.clear();
        this.elementMetadata.clear();
        // Reset stats
        this.stats = {
            totalElements: 0,
            availableElements: 0,
            inUseElements: 0,
            reuseRate: 0,
            memoryUsage: 0
        };
        // Reinitialize pools
        this.initializePools();
    }
    setMaxPoolSize(size) {
        this.config.maxPoolSize = Math.max(1, size);
        // Trim pools if necessary
        for (const pool of Array.from(this.pools.values())) {
            while (pool.length > size) {
                const pooledElement = pool.find((pe) => !pe.isInUse);
                if (pooledElement) {
                    const index = pool.indexOf(pooledElement);
                    pool.splice(index, 1);
                    this.destroyElement(pooledElement.element);
                }
                else {
                    break; // All remaining elements are in use
                }
            }
        }
        this.updateStats();
    }
    cullInvisibleElements(viewport) {
        if (!this.cullingConfig.enableCulling)
            return;
        const culledElements = [];
        for (const element of Array.from(this.inUseElements)) {
            if (this.shouldCullElement(element, viewport)) {
                culledElements.push(element);
            }
        }
        // Limit culling to avoid performance impact
        const maxCull = Math.min(culledElements.length, 20);
        for (let i = 0; i < maxCull; i++) {
            this.releaseElement(culledElements[i]);
        }
    }
    shouldCullElement(element, viewport) {
        if (!element.parentNode)
            return true; // Already detached
        const rect = element.getBoundingClientRect();
        const margin = this.cullingConfig.cullMargin;
        // Element is outside viewport with margin
        if (rect.bottom < viewport.top - margin || rect.top > viewport.bottom + margin) {
            return true;
        }
        // Aggressive culling for performance
        if (this.cullingConfig.aggressiveCulling && this.stats.inUseElements > this.cullingConfig.maxVisibleNodes) {
            // Cull elements that are barely visible
            return rect.top < viewport.top - margin / 2 || rect.bottom > viewport.bottom + margin / 2;
        }
        return false;
    }
    startCleanupTimer() {
        this.cleanupTimer = setInterval(() => {
            this.cleanup();
        }, this.config.cleanupIntervalMs);
    }
    startMemoryMonitoring() {
        this.memoryMonitorTimer = setInterval(() => {
            this.updateStats();
            if (this.stats.memoryUsage > 50 * 1024 * 1024) { // 50MB threshold
                this.events.onMemoryPressure?.(this.stats);
                // Trigger aggressive cleanup
                this.config.maxIdleTime = Math.max(10000, this.config.maxIdleTime * 0.8);
                this.cleanup();
            }
        }, 10000); // Check every 10 seconds
    }
    getPerformanceMetrics() {
        return { ...this.performanceMetrics };
    }
    getElementMetadata(element) {
        return this.elementMetadata.get(element) || null;
    }
    preWarmPool(tagName, className, count = 10) {
        const poolKey = this.getPoolKey(tagName, className);
        let pool = this.pools.get(poolKey);
        if (!pool) {
            pool = [];
            this.pools.set(poolKey, pool);
        }
        const currentSize = pool.length;
        const targetSize = Math.min(currentSize + count, this.config.maxPoolSize);
        for (let i = currentSize; i < targetSize; i++) {
            const element = this.factory.createElement(tagName, className);
            pool.push({
                element,
                isInUse: false,
                lastUsed: Date.now(),
                reuseCount: 0
            });
            this.setElementMetadata(element, {
                tagName,
                poolKey,
                created: Date.now(),
                totalReuseTime: 0
            });
        }
        this.updateStats();
    }
    dispose() {
        // Clear timers
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
        }
        if (this.memoryMonitorTimer) {
            clearInterval(this.memoryMonitorTimer);
        }
        // Clean up all elements
        this.reset();
    }
}
//# sourceMappingURL=DOMPoolManager.js.map