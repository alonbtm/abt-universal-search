export class PaginationManager {
    constructor(config = {}, events = {}) {
        this.providers = new Map();
        this.cache = null;
        this.optimizer = null;
        this.abortController = null;
        this.prefetchPromises = new Map();
        this.performance = {
            avgLoadTime: 0,
            cacheHitRate: 0,
            totalRequests: 0,
            failedRequests: 0,
            prefetchHitRate: 0,
            memoryUsage: 0
        };
        this.config = {
            type: 'offset',
            pageSize: 20,
            maxPages: 1000,
            enablePrefetch: true,
            prefetchPages: 2,
            cachePages: true,
            maxCachedPages: 10,
            ...config
        };
        this.state = {
            currentPage: 1,
            pageSize: this.config.pageSize,
            totalPages: null,
            totalCount: null,
            hasNext: true,
            hasPrevious: false,
            isLoading: false,
            error: null,
            data: [],
            cache: new Map(),
            lastUpdated: Date.now()
        };
        this.events = events;
        this.initializeDefaultProviders();
        this.initializeOptimizer();
    }
    initializeDefaultProviders() {
        // Offset-based pagination provider
        this.providers.set('offset', {
            name: 'offset',
            type: 'offset',
            load: this.loadOffsetPage.bind(this),
            supports: (params) => 'offset' in params || 'page' in params
        });
        // Cursor-based pagination provider
        this.providers.set('cursor', {
            name: 'cursor',
            type: 'cursor',
            load: this.loadCursorPage.bind(this),
            supports: (params) => 'cursor' in params
        });
    }
    initializeOptimizer() {
        this.optimizer = {
            shouldPrefetch: (currentPage, totalPages) => {
                if (!this.config.enablePrefetch || !totalPages)
                    return false;
                return currentPage < totalPages - 1;
            },
            getOptimalPageSize: (totalCount) => {
                if (totalCount <= 100)
                    return 20;
                if (totalCount <= 1000)
                    return 50;
                return 100;
            },
            shouldCache: (pageNumber, accessPattern) => {
                if (!this.config.cachePages)
                    return false;
                return accessPattern.includes(pageNumber) || pageNumber <= 3; // Cache first few pages
            },
            optimizeQueries: (params) => {
                // Add sorting optimization, field selection, etc.
                return { ...params };
            }
        };
    }
    async loadOffsetPage(params) {
        // Calculate offset parameters
        const offset = params.offset ?? ((params.page ?? 1) - 1) * (params.size ?? this.config.pageSize);
        const limit = params.limit ?? params.size ?? this.config.pageSize;
        // This would be implemented by the specific data source
        throw new Error(`Offset pagination load function must be provided by data source (offset: ${offset}, limit: ${limit})`);
    }
    async loadCursorPage(params) {
        // Calculate cursor parameters
        const cursor = params.cursor;
        const limit = params.limit ?? params.size ?? this.config.pageSize;
        // This would be implemented by the specific data source
        throw new Error(`Cursor pagination load function must be provided by data source (cursor: ${cursor}, limit: ${limit})`);
    }
    async loadPage(params) {
        const startTime = performance.now();
        this.performance.totalRequests++;
        // Check cache first
        if (this.config.cachePages && params.page) {
            const cached = this.getCachedPage(params.page);
            if (cached) {
                this.performance.cacheHitRate = this.calculateCacheHitRate(true);
                this.events.onCacheHit?.(params.page);
                return cached;
            }
            this.events.onCacheMiss?.(params.page);
        }
        // Find appropriate provider
        const provider = this.findProvider(params);
        if (!provider) {
            throw new Error(`No suitable pagination provider found for params: ${JSON.stringify(params)}`);
        }
        // Cancel any existing request
        if (this.abortController) {
            this.abortController.abort();
        }
        this.abortController = new AbortController();
        this.state.isLoading = true;
        this.state.error = null;
        this.events.onLoadStart?.(params.page ?? 1);
        try {
            // Optimize parameters
            const optimizedParams = this.optimizer?.optimizeQueries(params) ?? params;
            const result = await provider.load(optimizedParams);
            const endTime = performance.now();
            const loadTime = endTime - startTime;
            this.updatePerformance(loadTime, true);
            this.updateState(result, params);
            // Cache the result
            if (this.config.cachePages && params.page) {
                this.cacheResult(params.page, result);
            }
            this.events.onLoadEnd?.(params.page ?? 1, result.data);
            // Prefetch next pages if enabled
            if (this.config.enablePrefetch && result.pagination.hasNext) {
                this.prefetchPages();
            }
            return result;
        }
        catch (error) {
            const endTime = performance.now();
            const loadTime = endTime - startTime;
            this.updatePerformance(loadTime, false);
            this.state.error = error;
            this.performance.failedRequests++;
            this.events.onLoadError?.(error, params.page ?? 1);
            throw error;
        }
        finally {
            this.state.isLoading = false;
            this.abortController = null;
        }
    }
    async getPage(pageNumber) {
        return this.loadPage({
            page: pageNumber,
            size: this.state.pageSize
        });
    }
    async getNextPage() {
        if (!this.state.hasNext)
            return null;
        const nextPage = this.state.currentPage + 1;
        const result = await this.getPage(nextPage);
        return result;
    }
    async getPreviousPage() {
        if (!this.state.hasPrevious)
            return null;
        const prevPage = this.state.currentPage - 1;
        const result = await this.getPage(prevPage);
        return result;
    }
    async jumpToPage(pageNumber) {
        if (pageNumber < 1) {
            throw new Error('Page number must be >= 1');
        }
        if (this.state.totalPages && pageNumber > this.state.totalPages) {
            throw new Error(`Page ${pageNumber} exceeds total pages (${this.state.totalPages})`);
        }
        return this.getPage(pageNumber);
    }
    async refreshCurrentPage() {
        // Clear cache for current page
        this.invalidateCache(this.state.currentPage);
        return this.getPage(this.state.currentPage);
    }
    findProvider(params) {
        for (const provider of Array.from(this.providers.values())) {
            if (provider.supports(params)) {
                return provider;
            }
        }
        return null;
    }
    updateState(result, params) {
        this.state.data = result.data;
        this.state.currentPage = params.page ?? this.state.currentPage;
        this.state.totalPages = result.pagination.totalPages ?? this.state.totalPages;
        this.state.totalCount = result.pagination.totalCount ?? this.state.totalCount;
        this.state.hasNext = result.pagination.hasNext;
        this.state.hasPrevious = result.pagination.hasPrevious;
        this.state.lastUpdated = Date.now();
        this.events.onPageChange?.(this.state.currentPage, this.state.data);
    }
    updatePerformance(loadTime, success) {
        if (success) {
            const totalSuccessful = this.performance.totalRequests - this.performance.failedRequests;
            this.performance.avgLoadTime =
                (this.performance.avgLoadTime * (totalSuccessful - 1) + loadTime) / totalSuccessful;
        }
    }
    calculateCacheHitRate(isHit) {
        // Simple cache hit rate calculation
        const totalCacheChecks = this.performance.totalRequests;
        return totalCacheChecks > 0 ? (isHit ? 1 : 0) / totalCacheChecks : 0;
    }
    cacheResult(pageNumber, result) {
        if (this.state.cache.size >= this.config.maxCachedPages) {
            // Remove oldest cache entry (simple LRU)
            const oldestKey = Math.min(...Array.from(this.state.cache.keys()));
            this.state.cache.delete(oldestKey);
        }
        this.state.cache.set(pageNumber, { ...result, cached: true });
    }
    async prefetchPages() {
        if (!this.config.enablePrefetch || this.state.isLoading)
            return;
        const pagesToPrefetch = [];
        const currentPage = this.state.currentPage;
        // Prefetch next few pages
        for (let i = 1; i <= this.config.prefetchPages; i++) {
            const pageNum = currentPage + i;
            if (this.state.totalPages && pageNum > this.state.totalPages)
                break;
            if (!this.state.cache.has(pageNum) && !this.prefetchPromises.has(pageNum)) {
                pagesToPrefetch.push(pageNum);
            }
        }
        // Start prefetch operations
        pagesToPrefetch.forEach(pageNum => {
            const prefetchPromise = this.prefetchPage(pageNum);
            this.prefetchPromises.set(pageNum, prefetchPromise);
            // Clean up completed prefetch promises
            prefetchPromise.finally(() => {
                this.prefetchPromises.delete(pageNum);
            });
        });
    }
    async prefetchPage(pageNumber) {
        try {
            const result = await this.loadPage({
                page: pageNumber,
                size: this.state.pageSize
            });
            // Update prefetch hit rate
            this.performance.prefetchHitRate =
                (this.performance.prefetchHitRate + 1) / 2; // Simple average
            return result;
        }
        catch (error) {
            // Prefetch errors are not critical
            console.warn(`Prefetch failed for page ${pageNumber}:`, error);
            throw error;
        }
    }
    getCurrentPage() {
        return this.state.currentPage;
    }
    getTotalPages() {
        return this.state.totalPages;
    }
    hasNextPage() {
        return this.state.hasNext;
    }
    hasPreviousPage() {
        return this.state.hasPrevious;
    }
    reset() {
        // Cancel any ongoing operations
        if (this.abortController) {
            this.abortController.abort();
        }
        // Clear prefetch promises
        this.prefetchPromises.clear();
        // Reset state
        this.state = {
            currentPage: 1,
            pageSize: this.config.pageSize,
            totalPages: null,
            totalCount: null,
            hasNext: true,
            hasPrevious: false,
            isLoading: false,
            error: null,
            data: [],
            cache: new Map(),
            lastUpdated: Date.now()
        };
        // Reset performance metrics
        this.performance = {
            avgLoadTime: 0,
            cacheHitRate: 0,
            totalRequests: 0,
            failedRequests: 0,
            prefetchHitRate: 0,
            memoryUsage: 0
        };
    }
    setPageSize(size) {
        if (size <= 0) {
            throw new Error('Page size must be greater than 0');
        }
        this.state.pageSize = size;
        this.config.pageSize = size;
        // Clear cache as page size change invalidates cached results
        this.invalidateCache();
        this.events.onPageSizeChange?.(size);
    }
    getPageSize() {
        return this.state.pageSize;
    }
    async prefetchNextPage() {
        if (!this.state.hasNext)
            return;
        const nextPage = this.state.currentPage + 1;
        if (!this.prefetchPromises.has(nextPage)) {
            await this.prefetchPage(nextPage);
        }
    }
    getCachedPage(pageNumber) {
        return this.state.cache.get(pageNumber) ?? null;
    }
    invalidateCache(pageNumber) {
        if (pageNumber) {
            this.state.cache.delete(pageNumber);
        }
        else {
            this.state.cache.clear();
        }
    }
    getState() {
        return { ...this.state };
    }
    getPerformanceMetrics() {
        return { ...this.performance };
    }
    addProvider(provider) {
        this.providers.set(provider.name, provider);
    }
    removeProvider(name) {
        this.providers.delete(name);
    }
    setCache(cache) {
        this.cache = cache;
    }
    setOptimizer(optimizer) {
        this.optimizer = optimizer;
    }
    isLoading() {
        return this.state.isLoading;
    }
    getError() {
        return this.state.error;
    }
    getData() {
        return [...this.state.data];
    }
    getTotalCount() {
        return this.state.totalCount;
    }
    getCacheStats() {
        return {
            cachedPages: this.state.cache.size,
            maxCachedPages: this.config.maxCachedPages,
            hitRate: this.performance.cacheHitRate,
            memoryUsage: this.performance.memoryUsage
        };
    }
    dispose() {
        // Cancel any ongoing operations
        if (this.abortController) {
            this.abortController.abort();
        }
        // Clear all promises and caches
        this.prefetchPromises.clear();
        this.state.cache.clear();
        this.providers.clear();
    }
}
//# sourceMappingURL=PaginationManager.js.map