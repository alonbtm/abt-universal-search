export interface PaginationConfig {
    type: 'offset' | 'cursor' | 'hybrid';
    pageSize: number;
    maxPages: number;
    enablePrefetch: boolean;
    prefetchPages: number;
    cachePages: boolean;
    maxCachedPages: number;
}
export interface OffsetPaginationParams {
    offset: number;
    limit: number;
    sort?: string;
    order?: 'asc' | 'desc';
}
export interface CursorPaginationParams {
    cursor?: string;
    limit: number;
    direction?: 'forward' | 'backward';
    sort?: string;
}
export interface PaginationParams {
    page?: number;
    size?: number;
    offset?: number;
    limit?: number;
    cursor?: string;
    sort?: string;
    order?: 'asc' | 'desc';
    direction?: 'forward' | 'backward';
}
export interface PaginationResult<T = any> {
    data: T[];
    pagination: PaginationMetadata;
    cached?: boolean;
    loadTime?: number;
}
export interface PaginationMetadata {
    page?: number;
    pageSize: number;
    totalPages?: number;
    totalCount?: number;
    hasNext: boolean;
    hasPrevious: boolean;
    nextCursor?: string;
    previousCursor?: string;
    nextOffset?: number;
    previousOffset?: number;
}
export interface IPaginationManager<T = any> {
    loadPage(params: PaginationParams): Promise<PaginationResult<T>>;
    getPage(pageNumber: number): Promise<PaginationResult<T>>;
    getNextPage(): Promise<PaginationResult<T> | null>;
    getPreviousPage(): Promise<PaginationResult<T> | null>;
    jumpToPage(pageNumber: number): Promise<PaginationResult<T>>;
    refreshCurrentPage(): Promise<PaginationResult<T>>;
    getCurrentPage(): number;
    getTotalPages(): number | null;
    hasNextPage(): boolean;
    hasPreviousPage(): boolean;
    reset(): void;
    setPageSize(size: number): void;
    getPageSize(): number;
    prefetchNextPage(): Promise<void>;
    getCachedPage(pageNumber: number): PaginationResult<T> | null;
    invalidateCache(pageNumber?: number): void;
}
export interface PaginationState<T = any> {
    currentPage: number;
    pageSize: number;
    totalPages: number | null;
    totalCount: number | null;
    hasNext: boolean;
    hasPrevious: boolean;
    isLoading: boolean;
    error: Error | null;
    data: T[];
    cache: Map<number, PaginationResult<T>>;
    lastUpdated: number;
}
export interface PaginationProvider<T = any> {
    name: string;
    type: 'offset' | 'cursor';
    load: (params: PaginationParams) => Promise<PaginationResult<T>>;
    supports: (params: PaginationParams) => boolean;
}
export interface PaginationCache<T = any> {
    get(key: string): PaginationResult<T> | null;
    set(key: string, result: PaginationResult<T>, ttl?: number): void;
    invalidate(pattern?: string): number;
    clear(): void;
    getStats(): PaginationCacheStats;
}
export interface PaginationCacheStats {
    totalEntries: number;
    hitRate: number;
    memoryUsage: number;
    avgLoadTime: number;
}
export interface PaginationOptimizer {
    shouldPrefetch(currentPage: number, totalPages: number): boolean;
    getOptimalPageSize(totalCount: number): number;
    shouldCache(pageNumber: number, accessPattern: number[]): boolean;
    optimizeQueries(params: PaginationParams): PaginationParams;
}
export interface PageControls {
    first(): Promise<void>;
    previous(): Promise<void>;
    next(): Promise<void>;
    last(): Promise<void>;
    goto(page: number): Promise<void>;
    setPageSize(size: number): Promise<void>;
    refresh(): Promise<void>;
}
export interface PaginationUI {
    showPageNumbers: boolean;
    showPageSizes: boolean;
    showQuickJump: boolean;
    showFirstLast: boolean;
    showPrevNext: boolean;
    showInfo: boolean;
    maxVisiblePages: number;
    pageSizeOptions: number[];
}
export interface PaginationEvents<T = any> {
    onPageChange?: (page: number, data: T[]) => void;
    onPageSizeChange?: (size: number) => void;
    onLoadStart?: (page: number) => void;
    onLoadEnd?: (page: number, data: T[]) => void;
    onLoadError?: (error: Error, page: number) => void;
    onCacheHit?: (page: number) => void;
    onCacheMiss?: (page: number) => void;
}
export interface ServerPaginationConfig {
    endpoint: string;
    method: 'GET' | 'POST';
    headers?: Record<string, string>;
    queryParams?: Record<string, any>;
    bodyTemplate?: Record<string, any>;
    responseTransform?: (response: any) => PaginationResult<any>;
    errorTransform?: (error: any) => Error;
}
export interface PaginationPerformance {
    avgLoadTime: number;
    cacheHitRate: number;
    totalRequests: number;
    failedRequests: number;
    prefetchHitRate: number;
    memoryUsage: number;
}
export interface PaginationStrategy<T = any> {
    name: string;
    canHandle: (config: PaginationConfig) => boolean;
    loadPage: (params: PaginationParams) => Promise<PaginationResult<T>>;
    optimize: (state: PaginationState<T>) => PaginationConfig;
}
export interface HybridPaginationConfig extends PaginationConfig {
    offsetThreshold: number;
    cursorField: string;
    fallbackToCursor: boolean;
}
export interface PaginationAnalytics {
    pageViews: Map<number, number>;
    avgTimeOnPage: Map<number, number>;
    bounceRate: number;
    mostAccessedPages: number[];
    searchPatterns: string[];
    userNavigation: NavigationPattern[];
}
export interface NavigationPattern {
    from: number;
    to: number;
    count: number;
    avgTime: number;
}
export interface PaginationAccessibility {
    enableKeyboardNav: boolean;
    announcePageChanges: boolean;
    focusOnPageChange: boolean;
    ariaLabels: Record<string, string>;
    skipLinks: boolean;
}
export interface PaginationLoader<T = any> {
    loading: boolean;
    error: Error | null;
    progress: number;
    estimatedTime: number;
    cancelable: boolean;
    cancel?: () => void;
}
export type PaginationType = 'offset' | 'cursor' | 'hybrid';
export type PaginationDirection = 'forward' | 'backward';
export type SortOrder = 'asc' | 'desc';
export type LoadingStrategy = 'lazy' | 'eager' | 'prefetch';
//# sourceMappingURL=Pagination.d.ts.map