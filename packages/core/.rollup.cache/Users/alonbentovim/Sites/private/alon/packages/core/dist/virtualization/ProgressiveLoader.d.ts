import { IProgressiveLoader, ProgressiveLoadingConfig, LoadingState, BatchLoadResult, LoadingStrategy } from '../types/Virtualization';
export interface ProgressiveLoaderEvents<T = any> {
    onLoadStart?: (batchSize: number) => void;
    onLoadEnd?: (items: T[], hasMore: boolean) => void;
    onLoadError?: (error: Error) => void;
    onThresholdReached?: (scrollPosition: number) => void;
    onBatchSizeChange?: (newSize: number) => void;
}
export declare class ProgressiveLoader<T = any> implements IProgressiveLoader<T> {
    private config;
    private loadingState;
    private items;
    private events;
    private strategies;
    private currentStrategy;
    private scrollElement;
    private intersectionObserver;
    private sentinelElement;
    private loadingPromise;
    private abortController;
    private performanceMetrics;
    private adaptiveConfig;
    constructor(config?: Partial<ProgressiveLoadingConfig>, events?: ProgressiveLoaderEvents<T>);
    private initializeIntersectionObserver;
    private registerDefaultStrategies;
    private defaultLoadBatch;
    private calculateAdaptiveBatchSize;
    private getPerformanceFactor;
    loadMore(batchSize?: number): Promise<T[]>;
    private executeLoad;
    private updatePerformanceMetrics;
    private updateLoadingState;
    private preloadBatches;
    private preloadBatch;
    private getCurrentBatchSize;
    hasMore(): boolean;
    isLoading(): boolean;
    getLoadingState(): LoadingState;
    reset(): void;
    setThreshold(threshold: number): void;
    getLoadedCount(): number;
    getTotalCount(): number | null;
    setScrollElement(element: HTMLElement): void;
    setSentinelElement(element: HTMLElement): void;
    private getScrollPosition;
    shouldLoad(): boolean;
    setStrategy(strategyName: string): void;
    addStrategy(strategy: LoadingStrategy<T>): void;
    setLoadFunction(loadFn: (offset: number, limit: number) => Promise<BatchLoadResult<T>>): void;
    setBatchSize(size: number): void;
    getBatchSize(): number;
    getPerformanceMetrics(): {
        totalLoadTime: number;
        averageLoadTime: number;
        successfulLoads: number;
        failedLoads: number;
        totalItemsLoaded: number;
    };
    updateNetworkQuality(factor: number): void;
    setMaxItems(maxItems: number): void;
    getItems(): T[];
    dispose(): void;
}
//# sourceMappingURL=ProgressiveLoader.d.ts.map