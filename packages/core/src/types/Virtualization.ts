export interface ViewportInfo {
  top: number;
  height: number;
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
}

export interface VirtualItem<T = any> {
  index: number;
  data: T;
  height: number;
  offset: number;
  isVisible: boolean;
}

export interface VirtualScrollConfig {
  itemHeight: number | ((item: any) => number);
  viewportHeight: number;
  bufferSize: number;
  renderBatchSize: number;
  overscan: number;
  enableSmoothing: boolean;
  scrollingResetTimeoutMs: number;
}

export interface ScrollState {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
  isScrolling: boolean;
  scrollDirection: 'up' | 'down' | null;
  velocity: number;
}

export interface VisibleRange {
  startIndex: number;
  endIndex: number;
  visibleItems: VirtualItem[];
}

export interface IVirtualScrollManager<T = any> {
  scrollTo(index: number, align?: 'start' | 'center' | 'end' | 'auto'): void;
  scrollToOffset(offset: number): void;
  getVisibleRange(): VisibleRange;
  updateViewport(viewport: ViewportInfo): void;
  setItems(items: T[]): void;
  getItemOffset(index: number): number;
  getItemHeight(index: number): number;
  getTotalHeight(): number;
  resetCache(): void;
  getScrollElement(): HTMLElement | null;
  isItemVisible(index: number): boolean;
}

export interface VirtualScrollEvents<T = any> {
  onScroll?: (scrollState: ScrollState) => void;
  onVisibleRangeChange?: (range: VisibleRange) => void;
  onScrollStart?: () => void;
  onScrollEnd?: () => void;
  onItemsRendered?: (visibleItems: VirtualItem<T>[]) => void;
}

export interface DynamicHeightConfig {
  estimatedItemHeight: number;
  measurementCache: Map<number, number>;
  enableHeightMeasurement: boolean;
  remeasureOnUpdate: boolean;
}

export interface SmoothScrollConfig {
  duration: number;
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
  enableMomentum: boolean;
  momentumMultiplier: number;
}

export interface VirtualScrollPerformance {
  frameRate: number;
  averageFrameTime: number;
  scrollingFrameRate: number;
  renderTime: number;
  totalItems: number;
  visibleItems: number;
  memoryUsage: number;
}

export interface ProgressiveLoadingConfig {
  batchSize: number;
  loadingThreshold: number;
  maxItems: number;
  enableInfiniteScroll: boolean;
  loadingStrategy: 'auto' | 'manual';
  preloadBatches: number;
}

export interface LoadingState {
  isLoading: boolean;
  hasMore: boolean;
  error: Error | null;
  loadedCount: number;
  totalCount: number | null;
}

export interface IProgressiveLoader<T = any> {
  loadMore(batchSize?: number): Promise<T[]>;
  hasMore(): boolean;
  isLoading(): boolean;
  getLoadingState(): LoadingState;
  reset(): void;
  setThreshold(threshold: number): void;
  getLoadedCount(): number;
  getTotalCount(): number | null;
}

export interface BatchLoadResult<T = any> {
  items: T[];
  hasMore: boolean;
  totalCount?: number;
  nextCursor?: string;
  metadata?: Record<string, any>;
}

export interface LoadingStrategy<T = any> {
  name: string;
  loadBatch: (offset: number, limit: number) => Promise<BatchLoadResult<T>>;
  shouldLoad: (scrollPosition: number, threshold: number) => boolean;
  getBatchSize: (currentItems: number) => number;
}

export interface InfiniteScrollConfig {
  threshold: number;
  rootMargin: string;
  reverse: boolean;
  initialLoad: boolean;
  delayMs: number;
}

export interface DOMPoolConfig {
  maxPoolSize: number;
  initialPoolSize: number;
  enablePooling: boolean;
  cleanupIntervalMs: number;
  maxIdleTime: number;
}

export interface PooledElement {
  element: HTMLElement;
  isInUse: boolean;
  lastUsed: number;
  reuseCount: number;
}

export interface IDOMPoolManager {
  acquireElement(tagName: string, className?: string): HTMLElement;
  releaseElement(element: HTMLElement): void;
  getPoolStats(): DOMPoolStats;
  cleanup(): void;
  reset(): void;
  setMaxPoolSize(size: number): void;
}

export interface DOMPoolStats {
  totalElements: number;
  availableElements: number;
  inUseElements: number;
  reuseRate: number;
  memoryUsage: number;
}

export interface ViewportCullingConfig {
  enableCulling: boolean;
  cullMargin: number;
  maxVisibleNodes: number;
  aggressiveCulling: boolean;
}

export interface RenderItem<T = any> {
  data: T;
  index: number;
  style: Record<string, string | number>;
  ref?: HTMLElement | null;
}

export interface VirtualScrollRenderProps<T = any> {
  items: RenderItem<T>[];
  totalHeight: number;
  containerProps: Record<string, any>;
  scrollerProps: Record<string, any>;
}

export interface SearchWithinConfig {
  enableHighlighting: boolean;
  caseSensitive: boolean;
  matchWholeWords: boolean;
  searchFields: string[];
  maxHighlights: number;
  highlightClassName: string;
}

export interface SearchIndex<T = any> {
  add(item: T, index: number): void;
  remove(index: number): void;
  search(query: string): SearchResult<T>[];
  update(item: T, index: number): void;
  clear(): void;
  getSize(): number;
}

export interface SearchResult<T = any> {
  item: T;
  index: number;
  score: number;
  highlights: SearchHighlight[];
}

export interface SearchHighlight {
  field: string;
  start: number;
  end: number;
  text: string;
}

export interface IInResultSearch<T = any> {
  search(query: string, items: T[]): SearchResult<T>[];
  highlight(text: string, query: string): string;
  setConfig(config: SearchWithinConfig): void;
  getIndex(): SearchIndex<T> | null;
  updateIndex(items: T[]): void;
  clearIndex(): void;
}

export interface PerformanceBudget {
  targetFrameRate: number;
  maxFrameTime: number;
  maxRenderTime: number;
  memoryThreshold: number;
  gcThreshold: number;
}

export interface FrameMetrics {
  frameTime: number;
  renderTime: number;
  layoutTime: number;
  paintTime: number;
  memoryUsage: number;
  timestamp: number;
}

export interface IPerformanceOptimizer {
  startMonitoring(): void;
  stopMonitoring(): void;
  getMetrics(): PerformanceMetrics;
  setBudget(budget: PerformanceBudget): void;
  shouldReduceQuality(): boolean;
  optimizeForPerformance(): void;
  requestFrame(callback: FrameRequestCallback): number;
  cancelFrame(handle: number): void;
}

export interface PerformanceMetrics {
  currentFrameRate: number;
  averageFrameRate: number;
  frameTimeP95: number;
  renderTimeP95: number;
  memoryUsage: number;
  totalFrames: number;
  droppedFrames: number;
  gcCollections: number;
}

export interface PerformanceAlert {
  type: 'frame-drop' | 'memory-high' | 'render-slow' | 'gc-pressure';
  severity: 'warning' | 'critical';
  message: string;
  metrics: PerformanceMetrics;
  timestamp: number;
}

export interface AdaptiveConfig {
  enableAdaptive: boolean;
  performanceThreshold: number;
  qualityLevels: QualityLevel[];
  adaptationStrategy: 'aggressive' | 'conservative' | 'balanced';
}

export interface QualityLevel {
  name: string;
  itemHeight: number;
  bufferSize: number;
  renderBatchSize: number;
  enableAnimations: boolean;
  enableShadows: boolean;
}

export type VirtualScrollDirection = 'vertical' | 'horizontal';
export type ScrollBehavior = 'auto' | 'smooth' | 'instant';
export type ItemAlignment = 'start' | 'center' | 'end' | 'auto';