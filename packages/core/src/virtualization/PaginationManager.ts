import {
  IPaginationManager,
  PaginationConfig,
  PaginationParams,
  PaginationResult,
  PaginationState,
  PaginationProvider,
  PaginationCache,
  PaginationOptimizer,
  PaginationEvents,
  PaginationPerformance,
  OffsetPaginationParams,
  CursorPaginationParams
} from '../types/Pagination';

export class PaginationManager<T = any> implements IPaginationManager<T> {
  private config: Required<PaginationConfig>;
  private state: PaginationState<T>;
  private providers: Map<string, PaginationProvider<T>> = new Map();
  private cache: PaginationCache<T> | null = null;
  private optimizer: PaginationOptimizer | null = null;
  private events: PaginationEvents<T>;
  
  private abortController: AbortController | null = null;
  private prefetchPromises: Map<number, Promise<PaginationResult<T>>> = new Map();
  
  private performance: PaginationPerformance = {
    avgLoadTime: 0,
    cacheHitRate: 0,
    totalRequests: 0,
    failedRequests: 0,
    prefetchHitRate: 0,
    memoryUsage: 0
  };

  constructor(
    config: Partial<PaginationConfig> = {},
    events: PaginationEvents<T> = {}
  ) {
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

  private initializeDefaultProviders(): void {
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

  private initializeOptimizer(): void {
    this.optimizer = {
      shouldPrefetch: (currentPage, totalPages) => {
        if (!this.config.enablePrefetch || !totalPages) return false;
        return currentPage < totalPages - 1;
      },
      getOptimalPageSize: (totalCount) => {
        if (totalCount <= 100) return 20;
        if (totalCount <= 1000) return 50;
        return 100;
      },
      shouldCache: (pageNumber, accessPattern) => {
        if (!this.config.cachePages) return false;
        return accessPattern.includes(pageNumber) || pageNumber <= 3; // Cache first few pages
      },
      optimizeQueries: (params) => {
        // Add sorting optimization, field selection, etc.
        return { ...params };
      }
    };
  }

  private async loadOffsetPage(params: PaginationParams): Promise<PaginationResult<T>> {
    // Calculate offset parameters
    const offset = params.offset ?? ((params.page ?? 1) - 1) * (params.size ?? this.config.pageSize);
    const limit = params.limit ?? params.size ?? this.config.pageSize;

    // This would be implemented by the specific data source
    throw new Error(`Offset pagination load function must be provided by data source (offset: ${offset}, limit: ${limit})`);
  }

  private async loadCursorPage(params: PaginationParams): Promise<PaginationResult<T>> {
    // Calculate cursor parameters
    const cursor = params.cursor;
    const limit = params.limit ?? params.size ?? this.config.pageSize;

    // This would be implemented by the specific data source
    throw new Error(`Cursor pagination load function must be provided by data source (cursor: ${cursor}, limit: ${limit})`);
  }

  public async loadPage(params: PaginationParams): Promise<PaginationResult<T>> {
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

    } catch (error) {
      const endTime = performance.now();
      const loadTime = endTime - startTime;
      
      this.updatePerformance(loadTime, false);
      this.state.error = error as Error;
      this.performance.failedRequests++;
      
      this.events.onLoadError?.(error as Error, params.page ?? 1);
      throw error;

    } finally {
      this.state.isLoading = false;
      this.abortController = null;
    }
  }

  public async getPage(pageNumber: number): Promise<PaginationResult<T>> {
    return this.loadPage({
      page: pageNumber,
      size: this.state.pageSize
    });
  }

  public async getNextPage(): Promise<PaginationResult<T> | null> {
    if (!this.state.hasNext) return null;
    
    const nextPage = this.state.currentPage + 1;
    const result = await this.getPage(nextPage);
    return result;
  }

  public async getPreviousPage(): Promise<PaginationResult<T> | null> {
    if (!this.state.hasPrevious) return null;
    
    const prevPage = this.state.currentPage - 1;
    const result = await this.getPage(prevPage);
    return result;
  }

  public async jumpToPage(pageNumber: number): Promise<PaginationResult<T>> {
    if (pageNumber < 1) {
      throw new Error('Page number must be >= 1');
    }
    
    if (this.state.totalPages && pageNumber > this.state.totalPages) {
      throw new Error(`Page ${pageNumber} exceeds total pages (${this.state.totalPages})`);
    }

    return this.getPage(pageNumber);
  }

  public async refreshCurrentPage(): Promise<PaginationResult<T>> {
    // Clear cache for current page
    this.invalidateCache(this.state.currentPage);
    return this.getPage(this.state.currentPage);
  }

  private findProvider(params: PaginationParams): PaginationProvider<T> | null {
    for (const provider of Array.from(this.providers.values())) {
      if (provider.supports(params)) {
        return provider;
      }
    }
    return null;
  }

  private updateState(result: PaginationResult<T>, params: PaginationParams): void {
    this.state.data = result.data;
    this.state.currentPage = params.page ?? this.state.currentPage;
    this.state.totalPages = result.pagination.totalPages ?? this.state.totalPages;
    this.state.totalCount = result.pagination.totalCount ?? this.state.totalCount;
    this.state.hasNext = result.pagination.hasNext;
    this.state.hasPrevious = result.pagination.hasPrevious;
    this.state.lastUpdated = Date.now();
    
    this.events.onPageChange?.(this.state.currentPage, this.state.data);
  }

  private updatePerformance(loadTime: number, success: boolean): void {
    if (success) {
      const totalSuccessful = this.performance.totalRequests - this.performance.failedRequests;
      this.performance.avgLoadTime = 
        (this.performance.avgLoadTime * (totalSuccessful - 1) + loadTime) / totalSuccessful;
    }
  }

  private calculateCacheHitRate(isHit: boolean): number {
    // Simple cache hit rate calculation
    const totalCacheChecks = this.performance.totalRequests;
    return totalCacheChecks > 0 ? (isHit ? 1 : 0) / totalCacheChecks : 0;
  }

  private cacheResult(pageNumber: number, result: PaginationResult<T>): void {
    if (this.state.cache.size >= this.config.maxCachedPages) {
      // Remove oldest cache entry (simple LRU)
      const oldestKey = Math.min(...Array.from(this.state.cache.keys()));
      this.state.cache.delete(oldestKey);
    }
    
    this.state.cache.set(pageNumber, { ...result, cached: true });
  }

  private async prefetchPages(): Promise<void> {
    if (!this.config.enablePrefetch || this.state.isLoading) return;

    const pagesToPrefetch: number[] = [];
    const currentPage = this.state.currentPage;
    
    // Prefetch next few pages
    for (let i = 1; i <= this.config.prefetchPages; i++) {
      const pageNum = currentPage + i;
      if (this.state.totalPages && pageNum > this.state.totalPages) break;
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

  private async prefetchPage(pageNumber: number): Promise<PaginationResult<T>> {
    try {
      const result = await this.loadPage({
        page: pageNumber,
        size: this.state.pageSize
      });
      
      // Update prefetch hit rate
      this.performance.prefetchHitRate = 
        (this.performance.prefetchHitRate + 1) / 2; // Simple average
      
      return result;
    } catch (error) {
      // Prefetch errors are not critical
      console.warn(`Prefetch failed for page ${pageNumber}:`, error);
      throw error;
    }
  }

  public getCurrentPage(): number {
    return this.state.currentPage;
  }

  public getTotalPages(): number | null {
    return this.state.totalPages;
  }

  public hasNextPage(): boolean {
    return this.state.hasNext;
  }

  public hasPreviousPage(): boolean {
    return this.state.hasPrevious;
  }

  public reset(): void {
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

  public setPageSize(size: number): void {
    if (size <= 0) {
      throw new Error('Page size must be greater than 0');
    }
    
    this.state.pageSize = size;
    this.config.pageSize = size;
    
    // Clear cache as page size change invalidates cached results
    this.invalidateCache();
    
    this.events.onPageSizeChange?.(size);
  }

  public getPageSize(): number {
    return this.state.pageSize;
  }

  public async prefetchNextPage(): Promise<void> {
    if (!this.state.hasNext) return;
    
    const nextPage = this.state.currentPage + 1;
    if (!this.prefetchPromises.has(nextPage)) {
      await this.prefetchPage(nextPage);
    }
  }

  public getCachedPage(pageNumber: number): PaginationResult<T> | null {
    return this.state.cache.get(pageNumber) ?? null;
  }

  public invalidateCache(pageNumber?: number): void {
    if (pageNumber) {
      this.state.cache.delete(pageNumber);
    } else {
      this.state.cache.clear();
    }
  }

  public getState(): PaginationState<T> {
    return { ...this.state };
  }

  public getPerformanceMetrics(): PaginationPerformance {
    return { ...this.performance };
  }

  public addProvider(provider: PaginationProvider<T>): void {
    this.providers.set(provider.name, provider);
  }

  public removeProvider(name: string): void {
    this.providers.delete(name);
  }

  public setCache(cache: PaginationCache<T>): void {
    this.cache = cache;
  }

  public setOptimizer(optimizer: PaginationOptimizer): void {
    this.optimizer = optimizer;
  }

  public isLoading(): boolean {
    return this.state.isLoading;
  }

  public getError(): Error | null {
    return this.state.error;
  }

  public getData(): T[] {
    return [...this.state.data];
  }

  public getTotalCount(): number | null {
    return this.state.totalCount;
  }

  public getCacheStats() {
    return {
      cachedPages: this.state.cache.size,
      maxCachedPages: this.config.maxCachedPages,
      hitRate: this.performance.cacheHitRate,
      memoryUsage: this.performance.memoryUsage
    };
  }

  public dispose(): void {
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