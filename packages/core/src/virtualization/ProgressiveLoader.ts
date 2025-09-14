import {
  IProgressiveLoader,
  ProgressiveLoadingConfig,
  LoadingState,
  BatchLoadResult,
  LoadingStrategy
} from '../types/Virtualization';

export interface ProgressiveLoaderEvents<T = any> {
  onLoadStart?: (batchSize: number) => void;
  onLoadEnd?: (items: T[], hasMore: boolean) => void;
  onLoadError?: (error: Error) => void;
  onThresholdReached?: (scrollPosition: number) => void;
  onBatchSizeChange?: (newSize: number) => void;
}

export class ProgressiveLoader<T = any> implements IProgressiveLoader<T> {
  private config: Required<ProgressiveLoadingConfig>;
  private loadingState: LoadingState;
  private items: T[] = [];
  private events: ProgressiveLoaderEvents<T>;
  private strategies: Map<string, LoadingStrategy<T>> = new Map();
  private currentStrategy: LoadingStrategy<T> | null = null;
  
  private scrollElement: HTMLElement | null = null;
  private intersectionObserver: IntersectionObserver | null = null;
  private sentinelElement: HTMLElement | null = null;
  
  private loadingPromise: Promise<T[]> | null = null;
  private abortController: AbortController | null = null;
  
  private performanceMetrics = {
    totalLoadTime: 0,
    averageLoadTime: 0,
    successfulLoads: 0,
    failedLoads: 0,
    totalItemsLoaded: 0
  };

  private adaptiveConfig = {
    enableAdaptive: true,
    minBatchSize: 10,
    maxBatchSize: 1000,
    performanceThreshold: 2000, // 2 seconds
    networkQualityFactor: 1.0
  };

  constructor(
    config: Partial<ProgressiveLoadingConfig> = {},
    events: ProgressiveLoaderEvents<T> = {}
  ) {
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

  private initializeIntersectionObserver(): void {
    if (typeof IntersectionObserver !== 'undefined' && this.config.enableInfiniteScroll) {
      this.intersectionObserver = new IntersectionObserver(
        entries => {
          entries.forEach(entry => {
            if (entry.isIntersecting && !this.loadingState.isLoading && this.loadingState.hasMore) {
              this.events.onThresholdReached?.(this.getScrollPosition());
              if (this.config.loadingStrategy === 'auto') {
                this.loadMore();
              }
            }
          });
        },
        {
          root: this.scrollElement,
          rootMargin: '200px',
          threshold: 0.1
        }
      );
    }
  }

  private registerDefaultStrategies(): void {
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
      getBatchSize: (currentItems) => Math.min(
        this.config.batchSize * Math.floor(currentItems / 100 + 1),
        this.adaptiveConfig.maxBatchSize
      )
    });

    // Set default strategy
    this.currentStrategy = this.strategies.get('adaptive')!;
  }

  private async defaultLoadBatch(_offset: number, _limit: number): Promise<BatchLoadResult<T>> {
    // This would be overridden by the actual data source implementation
    throw new Error('LoadBatch function must be provided through setLoadFunction or data source');
  }

  private calculateAdaptiveBatchSize(currentItems: number): number {
    const baseSize = this.config.batchSize;
    const networkFactor = this.adaptiveConfig.networkQualityFactor;
    const performanceFactor = this.getPerformanceFactor();
    
    let adaptiveSize = Math.floor(baseSize * networkFactor * performanceFactor);
    
    // Adjust based on current dataset size
    if (currentItems > 1000) {
      adaptiveSize *= 1.5; // Larger batches for larger datasets
    }
    
    return Math.max(
      this.adaptiveConfig.minBatchSize,
      Math.min(adaptiveSize, this.adaptiveConfig.maxBatchSize)
    );
  }

  private getPerformanceFactor(): number {
    if (this.performanceMetrics.averageLoadTime === 0) return 1.0;
    
    const threshold = this.adaptiveConfig.performanceThreshold;
    if (this.performanceMetrics.averageLoadTime < threshold / 2) {
      return 1.5; // Fast performance, increase batch size
    } else if (this.performanceMetrics.averageLoadTime > threshold) {
      return 0.7; // Slow performance, decrease batch size
    }
    return 1.0;
  }

  public async loadMore(batchSize?: number): Promise<T[]> {
    if (this.loadingState.isLoading || !this.loadingState.hasMore) {
      return [];
    }

    if (this.loadingState.loadedCount >= this.config.maxItems) {
      this.loadingState.hasMore = false;
      return [];
    }

    const effectiveBatchSize = batchSize || this.getCurrentBatchSize();
    const adjustedBatchSize = Math.min(
      effectiveBatchSize,
      this.config.maxItems - this.loadingState.loadedCount
    );

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
      
    } catch (error) {
      const endTime = performance.now();
      const loadTime = endTime - startTime;
      
      this.updatePerformanceMetrics(loadTime, false, 0);
      this.loadingState.error = error as Error;
      this.events.onLoadError?.(error as Error);
      
      throw error;
    } finally {
      this.loadingState.isLoading = false;
      this.loadingPromise = null;
      this.abortController = null;
    }
  }

  private async executeLoad(offset: number, limit: number): Promise<T[]> {
    if (!this.currentStrategy) {
      throw new Error('No loading strategy available');
    }

    const batchResult = await this.currentStrategy.loadBatch(offset, limit);
    return batchResult.items;
  }

  private updatePerformanceMetrics(loadTime: number, success: boolean, itemCount: number): void {
    this.performanceMetrics.totalLoadTime += loadTime;
    
    if (success) {
      this.performanceMetrics.successfulLoads++;
      this.performanceMetrics.totalItemsLoaded += itemCount;
    } else {
      this.performanceMetrics.failedLoads++;
    }
    
    const totalLoads = this.performanceMetrics.successfulLoads + this.performanceMetrics.failedLoads;
    this.performanceMetrics.averageLoadTime = this.performanceMetrics.totalLoadTime / totalLoads;
  }

  private updateLoadingState(items: T[], requestedBatchSize: number): void {
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

  private async preloadBatches(): Promise<void> {
    if (!this.loadingState.hasMore || this.loadingState.isLoading) return;

    const batchesToPreload = Math.min(this.config.preloadBatches, 3); // Limit preloading
    const promises: Promise<T[]>[] = [];

    for (let i = 0; i < batchesToPreload; i++) {
      const offset = this.loadingState.loadedCount + (i * this.getCurrentBatchSize());
      if (offset >= this.config.maxItems) break;
      
      // Create preload promises but don't await them immediately
      promises.push(this.preloadBatch(offset));
    }

    try {
      await Promise.allSettled(promises);
    } catch (error) {
      // Preload errors are not critical, just log them
      console.warn('Preload batch failed:', error);
    }
  }

  private async preloadBatch(offset: number): Promise<T[]> {
    const batchSize = this.getCurrentBatchSize();
    const adjustedBatchSize = Math.min(batchSize, this.config.maxItems - offset);
    
    if (adjustedBatchSize <= 0) return [];
    
    return this.executeLoad(offset, adjustedBatchSize);
  }

  private getCurrentBatchSize(): number {
    return this.currentStrategy?.getBatchSize?.(this.loadingState.loadedCount) || this.config.batchSize;
  }

  public hasMore(): boolean {
    return this.loadingState.hasMore;
  }

  public isLoading(): boolean {
    return this.loadingState.isLoading;
  }

  public getLoadingState(): LoadingState {
    return { ...this.loadingState };
  }

  public reset(): void {
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

  public setThreshold(threshold: number): void {
    this.config.loadingThreshold = Math.max(0, Math.min(threshold, 1));
  }

  public getLoadedCount(): number {
    return this.loadingState.loadedCount;
  }

  public getTotalCount(): number | null {
    return this.loadingState.totalCount;
  }

  public setScrollElement(element: HTMLElement): void {
    this.scrollElement = element;
    
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
      this.initializeIntersectionObserver();
    }
  }

  public setSentinelElement(element: HTMLElement): void {
    if (this.sentinelElement && this.intersectionObserver) {
      this.intersectionObserver.unobserve(this.sentinelElement);
    }

    this.sentinelElement = element;
    
    if (this.intersectionObserver) {
      this.intersectionObserver.observe(element);
    }
  }

  private getScrollPosition(): number {
    if (!this.scrollElement) return 0;
    
    const { scrollTop, scrollHeight, clientHeight } = this.scrollElement;
    return scrollTop / (scrollHeight - clientHeight);
  }

  public shouldLoad(): boolean {
    const scrollPosition = this.getScrollPosition();
    return this.currentStrategy?.shouldLoad?.(scrollPosition, this.config.loadingThreshold) ?? false;
  }

  public setStrategy(strategyName: string): void {
    const strategy = this.strategies.get(strategyName);
    if (strategy) {
      this.currentStrategy = strategy;
    }
  }

  public addStrategy(strategy: LoadingStrategy<T>): void {
    this.strategies.set(strategy.name, strategy);
  }

  public setLoadFunction(loadFn: (offset: number, limit: number) => Promise<BatchLoadResult<T>>): void {
    if (this.currentStrategy) {
      this.currentStrategy.loadBatch = loadFn;
    }
  }

  public setBatchSize(size: number): void {
    const newSize = Math.max(1, Math.min(size, this.adaptiveConfig.maxBatchSize));
    this.config.batchSize = newSize;
    this.events.onBatchSizeChange?.(newSize);
  }

  public getBatchSize(): number {
    return this.config.batchSize;
  }

  public getPerformanceMetrics() {
    return { ...this.performanceMetrics };
  }

  public updateNetworkQuality(factor: number): void {
    this.adaptiveConfig.networkQualityFactor = Math.max(0.1, Math.min(factor, 3.0));
  }

  public setMaxItems(maxItems: number): void {
    this.config.maxItems = Math.max(1, maxItems);
    
    // Update hasMore if we've already exceeded the new limit
    if (this.loadingState.loadedCount >= maxItems) {
      this.loadingState.hasMore = false;
    }
  }

  public getItems(): T[] {
    return [...this.items];
  }

  public dispose(): void {
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