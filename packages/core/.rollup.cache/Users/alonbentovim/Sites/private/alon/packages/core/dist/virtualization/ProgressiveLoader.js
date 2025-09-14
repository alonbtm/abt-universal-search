export class ProgressiveLoader {
    constructor(config = {}, events = {}) {
        this.items = [];
        this.strategies = new Map();
        this.currentStrategy = null;
        this.scrollElement = null;
        this.intersectionObserver = null;
        this.sentinelElement = null;
        this.loadingPromise = null;
        this.abortController = null;
        this.performanceMetrics = {
            totalLoadTime: 0,
            averageLoadTime: 0,
            successfulLoads: 0,
            failedLoads: 0,
            totalItemsLoaded: 0
        };
        this.adaptiveConfig = {
            enableAdaptive: true,
            minBatchSize: 10,
            maxBatchSize: 1000,
            performanceThreshold: 2000, // 2 seconds
            networkQualityFactor: 1.0
        };
        this.config = {
            batchSize: 50,
            loadingThreshold: 0.8,
            maxItems: Infinity,
            enableInfiniteScroll: true,
            loadingStrategy: 'auto',
            preloadBatches: 1,
            ...config
        };
        this.loadingState = {
            isLoading: false,
            hasMore: true,
            error: null,
            loadedCount: 0,
            totalCount: null
        };
        this.events = events;
        this.initializeIntersectionObserver();
        this.registerDefaultStrategies();
    }
    initializeIntersectionObserver() {
        if (typeof IntersectionObserver !== 'undefined' && this.config.enableInfiniteScroll) {
            this.intersectionObserver = new IntersectionObserver(entries => {
                entries.forEach(entry => {
                    if (entry.isIntersecting && !this.loadingState.isLoading && this.loadingState.hasMore) {
                        this.events.onThresholdReached?.(this.getScrollPosition());
                        if (this.config.loadingStrategy === 'auto') {
                            this.loadMore();
                        }
                    }
                });
            }, {
                root: this.scrollElement,
                rootMargin: '200px',
                threshold: 0.1
            });
        }
    }
    registerDefaultStrategies() {
        // Fixed batch size strategy
        this.strategies.set('fixed', {
            name: 'fixed',
            loadBatch: (offset, limit) => this.defaultLoadBatch(offset, limit),
            shouldLoad: (scrollPosition, threshold) => scrollPosition >= threshold,
            getBatchSize: () => this.config.batchSize
        });
        // Adaptive batch size strategy
        this.strategies.set('adaptive', {
            name: 'adaptive',
            loadBatch: (offset, limit) => this.defaultLoadBatch(offset, limit),
            shouldLoad: (scrollPosition, threshold) => scrollPosition >= threshold,
            getBatchSize: (currentItems) => this.calculateAdaptiveBatchSize(currentItems)
        });
        // Progressive batch size strategy (starts small, grows larger)
        this.strategies.set('progressive', {
            name: 'progressive',
            loadBatch: (offset, limit) => this.defaultLoadBatch(offset, limit),
            shouldLoad: (scrollPosition, threshold) => scrollPosition >= threshold,
            getBatchSize: (currentItems) => Math.min(this.config.batchSize * Math.floor(currentItems / 100 + 1), this.adaptiveConfig.maxBatchSize)
        });
        // Set default strategy
        this.currentStrategy = this.strategies.get('adaptive');
    }
    async defaultLoadBatch(_offset, _limit) {
        // This would be overridden by the actual data source implementation
        throw new Error('LoadBatch function must be provided through setLoadFunction or data source');
    }
    calculateAdaptiveBatchSize(currentItems) {
        const baseSize = this.config.batchSize;
        const networkFactor = this.adaptiveConfig.networkQualityFactor;
        const performanceFactor = this.getPerformanceFactor();
        let adaptiveSize = Math.floor(baseSize * networkFactor * performanceFactor);
        // Adjust based on current dataset size
        if (currentItems > 1000) {
            adaptiveSize *= 1.5; // Larger batches for larger datasets
        }
        return Math.max(this.adaptiveConfig.minBatchSize, Math.min(adaptiveSize, this.adaptiveConfig.maxBatchSize));
    }
    getPerformanceFactor() {
        if (this.performanceMetrics.averageLoadTime === 0)
            return 1.0;
        const threshold = this.adaptiveConfig.performanceThreshold;
        if (this.performanceMetrics.averageLoadTime < threshold / 2) {
            return 1.5; // Fast performance, increase batch size
        }
        else if (this.performanceMetrics.averageLoadTime > threshold) {
            return 0.7; // Slow performance, decrease batch size
        }
        return 1.0;
    }
    async loadMore(batchSize) {
        if (this.loadingState.isLoading || !this.loadingState.hasMore) {
            return [];
        }
        if (this.loadingState.loadedCount >= this.config.maxItems) {
            this.loadingState.hasMore = false;
            return [];
        }
        const effectiveBatchSize = batchSize || this.getCurrentBatchSize();
        const adjustedBatchSize = Math.min(effectiveBatchSize, this.config.maxItems - this.loadingState.loadedCount);
        // Cancel any existing loading operation
        if (this.abortController) {
            this.abortController.abort();
        }
        this.abortController = new AbortController();
        this.loadingState.isLoading = true;
        this.loadingState.error = null;
        this.events.onLoadStart?.(adjustedBatchSize);
        const startTime = performance.now();
        try {
            this.loadingPromise = this.executeLoad(this.loadingState.loadedCount, adjustedBatchSize);
            const result = await this.loadingPromise;
            const endTime = performance.now();
            const loadTime = endTime - startTime;
            this.updatePerformanceMetrics(loadTime, true, result.length);
            this.updateLoadingState(result, adjustedBatchSize);
            this.events.onLoadEnd?.(result, this.loadingState.hasMore);
            // Preload next batches if configured
            if (this.config.preloadBatches > 0 && this.loadingState.hasMore) {
                this.preloadBatches();
            }
            return result;
        }
        catch (error) {
            const endTime = performance.now();
            const loadTime = endTime - startTime;
            this.updatePerformanceMetrics(loadTime, false, 0);
            this.loadingState.error = error;
            this.events.onLoadError?.(error);
            throw error;
        }
        finally {
            this.loadingState.isLoading = false;
            this.loadingPromise = null;
            this.abortController = null;
        }
    }
    async executeLoad(offset, limit) {
        if (!this.currentStrategy) {
            throw new Error('No loading strategy available');
        }
        const batchResult = await this.currentStrategy.loadBatch(offset, limit);
        return batchResult.items;
    }
    updatePerformanceMetrics(loadTime, success, itemCount) {
        this.performanceMetrics.totalLoadTime += loadTime;
        if (success) {
            this.performanceMetrics.successfulLoads++;
            this.performanceMetrics.totalItemsLoaded += itemCount;
        }
        else {
            this.performanceMetrics.failedLoads++;
        }
        const totalLoads = this.performanceMetrics.successfulLoads + this.performanceMetrics.failedLoads;
        this.performanceMetrics.averageLoadTime = this.performanceMetrics.totalLoadTime / totalLoads;
    }
    updateLoadingState(items, requestedBatchSize) {
        this.items.push(...items);
        this.loadingState.loadedCount += items.length;
        // If we got fewer items than requested, assume no more data
        if (items.length < requestedBatchSize) {
            this.loadingState.hasMore = false;
        }
        // Check if we've reached the maximum items limit
        if (this.loadingState.loadedCount >= this.config.maxItems) {
            this.loadingState.hasMore = false;
        }
    }
    async preloadBatches() {
        if (!this.loadingState.hasMore || this.loadingState.isLoading)
            return;
        const batchesToPreload = Math.min(this.config.preloadBatches, 3); // Limit preloading
        const promises = [];
        for (let i = 0; i < batchesToPreload; i++) {
            const offset = this.loadingState.loadedCount + (i * this.getCurrentBatchSize());
            if (offset >= this.config.maxItems)
                break;
            // Create preload promises but don't await them immediately
            promises.push(this.preloadBatch(offset));
        }
        try {
            await Promise.allSettled(promises);
        }
        catch (error) {
            // Preload errors are not critical, just log them
            console.warn('Preload batch failed:', error);
        }
    }
    async preloadBatch(offset) {
        const batchSize = this.getCurrentBatchSize();
        const adjustedBatchSize = Math.min(batchSize, this.config.maxItems - offset);
        if (adjustedBatchSize <= 0)
            return [];
        return this.executeLoad(offset, adjustedBatchSize);
    }
    getCurrentBatchSize() {
        return this.currentStrategy?.getBatchSize?.(this.loadingState.loadedCount) || this.config.batchSize;
    }
    hasMore() {
        return this.loadingState.hasMore;
    }
    isLoading() {
        return this.loadingState.isLoading;
    }
    getLoadingState() {
        return { ...this.loadingState };
    }
    reset() {
        // Cancel any ongoing loading
        if (this.abortController) {
            this.abortController.abort();
        }
        this.items = [];
        this.loadingState = {
            isLoading: false,
            hasMore: true,
            error: null,
            loadedCount: 0,
            totalCount: null
        };
        // Reset performance metrics
        this.performanceMetrics = {
            totalLoadTime: 0,
            averageLoadTime: 0,
            successfulLoads: 0,
            failedLoads: 0,
            totalItemsLoaded: 0
        };
    }
    setThreshold(threshold) {
        this.config.loadingThreshold = Math.max(0, Math.min(threshold, 1));
    }
    getLoadedCount() {
        return this.loadingState.loadedCount;
    }
    getTotalCount() {
        return this.loadingState.totalCount;
    }
    setScrollElement(element) {
        this.scrollElement = element;
        if (this.intersectionObserver) {
            this.intersectionObserver.disconnect();
            this.initializeIntersectionObserver();
        }
    }
    setSentinelElement(element) {
        if (this.sentinelElement && this.intersectionObserver) {
            this.intersectionObserver.unobserve(this.sentinelElement);
        }
        this.sentinelElement = element;
        if (this.intersectionObserver) {
            this.intersectionObserver.observe(element);
        }
    }
    getScrollPosition() {
        if (!this.scrollElement)
            return 0;
        const { scrollTop, scrollHeight, clientHeight } = this.scrollElement;
        return scrollTop / (scrollHeight - clientHeight);
    }
    shouldLoad() {
        const scrollPosition = this.getScrollPosition();
        return this.currentStrategy?.shouldLoad?.(scrollPosition, this.config.loadingThreshold) ?? false;
    }
    setStrategy(strategyName) {
        const strategy = this.strategies.get(strategyName);
        if (strategy) {
            this.currentStrategy = strategy;
        }
    }
    addStrategy(strategy) {
        this.strategies.set(strategy.name, strategy);
    }
    setLoadFunction(loadFn) {
        if (this.currentStrategy) {
            this.currentStrategy.loadBatch = loadFn;
        }
    }
    setBatchSize(size) {
        const newSize = Math.max(1, Math.min(size, this.adaptiveConfig.maxBatchSize));
        this.config.batchSize = newSize;
        this.events.onBatchSizeChange?.(newSize);
    }
    getBatchSize() {
        return this.config.batchSize;
    }
    getPerformanceMetrics() {
        return { ...this.performanceMetrics };
    }
    updateNetworkQuality(factor) {
        this.adaptiveConfig.networkQualityFactor = Math.max(0.1, Math.min(factor, 3.0));
    }
    setMaxItems(maxItems) {
        this.config.maxItems = Math.max(1, maxItems);
        // Update hasMore if we've already exceeded the new limit
        if (this.loadingState.loadedCount >= maxItems) {
            this.loadingState.hasMore = false;
        }
    }
    getItems() {
        return [...this.items];
    }
    dispose() {
        // Cancel any ongoing loading
        if (this.abortController) {
            this.abortController.abort();
        }
        // Disconnect observers
        if (this.intersectionObserver) {
            this.intersectionObserver.disconnect();
        }
        // Clear data
        this.items = [];
        this.strategies.clear();
        this.currentStrategy = null;
    }
}
//# sourceMappingURL=ProgressiveLoader.js.map