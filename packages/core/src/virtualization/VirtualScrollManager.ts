import {
  IVirtualScrollManager,
  VirtualScrollConfig,
  ViewportInfo,
  ScrollState,
  VisibleRange,
  VirtualItem,
  VirtualScrollEvents,
  DynamicHeightConfig,
  SmoothScrollConfig,
  VirtualScrollPerformance,
  ItemAlignment
} from '../types/Virtualization';

export class VirtualScrollManager<T = any> implements IVirtualScrollManager<T> {
  private items: T[] = [];
  private config: Required<VirtualScrollConfig>;
  private dynamicHeightConfig: DynamicHeightConfig;
  private smoothScrollConfig: SmoothScrollConfig;
  private events: VirtualScrollEvents<T>;
  
  private scrollElement: HTMLElement | null = null;
  private containerElement: HTMLElement | null = null;
  private scrollState: ScrollState;
  private visibleRange: VisibleRange;
  private heightCache: Map<number, number> = new Map();
  private offsetCache: Map<number, number> = new Map();
  
  private isScrolling = false;
  private scrollTimeout: NodeJS.Timeout | null = null;
  private animationFrameId: number | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private intersectionObserver: IntersectionObserver | null = null;
  
  private performance: VirtualScrollPerformance;
  private lastFrameTime = 0;
  private frameCount = 0;
  private renderStartTime = 0;

  constructor(
    config: Partial<VirtualScrollConfig> = {},
    events: VirtualScrollEvents<T> = {},
    dynamicHeightConfig: Partial<DynamicHeightConfig> = {},
    smoothScrollConfig: Partial<SmoothScrollConfig> = {}
  ) {
    this.config = {
      itemHeight: 32,
      viewportHeight: 300,
      bufferSize: 5,
      renderBatchSize: 50,
      overscan: 5,
      enableSmoothing: true,
      scrollingResetTimeoutMs: 150,
      ...config
    };

    this.dynamicHeightConfig = {
      estimatedItemHeight: typeof this.config.itemHeight === 'number' ? this.config.itemHeight : 32,
      measurementCache: new Map(),
      enableHeightMeasurement: typeof this.config.itemHeight === 'function',
      remeasureOnUpdate: true,
      ...dynamicHeightConfig
    };

    this.smoothScrollConfig = {
      duration: 300,
      easing: 'ease-out',
      enableMomentum: true,
      momentumMultiplier: 0.8,
      ...smoothScrollConfig
    };

    this.events = events;

    this.scrollState = {
      scrollTop: 0,
      scrollHeight: 0,
      clientHeight: 0,
      isScrolling: false,
      scrollDirection: null,
      velocity: 0
    };

    this.visibleRange = {
      startIndex: 0,
      endIndex: 0,
      visibleItems: []
    };

    this.performance = {
      frameRate: 60,
      averageFrameTime: 16.67,
      scrollingFrameRate: 60,
      renderTime: 0,
      totalItems: 0,
      visibleItems: 0,
      memoryUsage: 0
    };

    this.initializeObservers();
  }

  private initializeObservers(): void {
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(entries => {
        for (const entry of entries) {
          if (entry.target === this.containerElement) {
            this.handleResize(entry.contentRect.height);
          }
        }
      });
    }

    if (typeof IntersectionObserver !== 'undefined') {
      this.intersectionObserver = new IntersectionObserver(
        entries => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              this.handleItemVisible(entry.target);
            }
          });
        },
        {
          root: this.scrollElement,
          rootMargin: `${this.config.overscan * this.getEstimatedItemHeight()}px`
        }
      );
    }
  }

  public setItems(items: T[]): void {
    const previousCount = this.items.length;
    this.items = items;
    this.performance.totalItems = items.length;

    if (this.dynamicHeightConfig.remeasureOnUpdate || previousCount !== items.length) {
      this.resetCache();
    }

    this.updateVisibleRange();
  }

  public scrollTo(index: number, align: ItemAlignment = 'auto'): void {
    if (index < 0 || index >= this.items.length) return;

    const itemOffset = this.getItemOffset(index);
    const itemHeight = this.getItemHeight(index);
    const scrollTop = this.calculateScrollTop(itemOffset, itemHeight, align);

    this.scrollToOffset(scrollTop);
  }

  public scrollToOffset(offset: number): void {
    if (!this.scrollElement) return;

    const maxOffset = this.getTotalHeight() - this.scrollState.clientHeight;
    const targetOffset = Math.max(0, Math.min(offset, maxOffset));

    if (this.smoothScrollConfig.enableMomentum) {
      this.smoothScrollTo(targetOffset);
    } else {
      this.scrollElement.scrollTop = targetOffset;
    }
  }

  private smoothScrollTo(targetOffset: number): void {
    if (!this.scrollElement) return;

    const startOffset = this.scrollElement.scrollTop;
    const distance = targetOffset - startOffset;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / this.smoothScrollConfig.duration, 1);
      const easeProgress = this.applyEasing(progress);
      
      const currentOffset = startOffset + distance * easeProgress;
      this.scrollElement!.scrollTop = currentOffset;

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }

  private applyEasing(progress: number): number {
    switch (this.smoothScrollConfig.easing) {
      case 'linear':
        return progress;
      case 'ease-in':
        return progress * progress;
      case 'ease-out':
        return 1 - (1 - progress) * (1 - progress);
      case 'ease-in-out':
        return progress < 0.5 
          ? 2 * progress * progress 
          : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      default:
        return progress;
    }
  }

  private calculateScrollTop(itemOffset: number, itemHeight: number, align: ItemAlignment): number {
    const viewportHeight = this.scrollState.clientHeight;
    
    switch (align) {
      case 'start':
        return itemOffset;
      case 'end':
        return itemOffset - viewportHeight + itemHeight;
      case 'center':
        return itemOffset - (viewportHeight - itemHeight) / 2;
      case 'auto':
      default:
        const currentScrollTop = this.scrollState.scrollTop;
        const itemEnd = itemOffset + itemHeight;
        const viewportEnd = currentScrollTop + viewportHeight;

        if (itemOffset < currentScrollTop) {
          return itemOffset;
        } else if (itemEnd > viewportEnd) {
          return itemOffset - viewportHeight + itemHeight;
        }
        return currentScrollTop;
    }
  }

  public getVisibleRange(): VisibleRange {
    return { ...this.visibleRange };
  }

  public updateViewport(viewport: ViewportInfo): void {
    const previousScrollTop = this.scrollState.scrollTop;
    
    this.scrollState = {
      scrollTop: viewport.scrollTop,
      scrollHeight: viewport.scrollHeight,
      clientHeight: viewport.clientHeight,
      isScrolling: this.isScrolling,
      scrollDirection: this.determineScrollDirection(previousScrollTop, viewport.scrollTop),
      velocity: this.calculateScrollVelocity(previousScrollTop, viewport.scrollTop)
    };

    this.updateVisibleRange();
    this.events.onScroll?.(this.scrollState);
  }

  private determineScrollDirection(previous: number, current: number): 'up' | 'down' | null {
    if (Math.abs(current - previous) < 1) return null;
    return current > previous ? 'down' : 'up';
  }

  private calculateScrollVelocity(previous: number, current: number): number {
    const now = performance.now();
    const timeDelta = now - this.lastFrameTime;
    const distance = Math.abs(current - previous);
    
    this.lastFrameTime = now;
    return timeDelta > 0 ? distance / timeDelta : 0;
  }

  private updateVisibleRange(): void {
    this.renderStartTime = performance.now();
    
    const { scrollTop, clientHeight } = this.scrollState;
    const bufferHeight = this.config.bufferSize * this.getEstimatedItemHeight();
    
    const startOffset = Math.max(0, scrollTop - bufferHeight);
    const endOffset = scrollTop + clientHeight + bufferHeight;
    
    const startIndex = this.findItemIndex(startOffset);
    const endIndex = this.findItemIndex(endOffset);
    
    const clampedStartIndex = Math.max(0, startIndex - this.config.overscan);
    const clampedEndIndex = Math.min(this.items.length - 1, endIndex + this.config.overscan);
    
    const visibleItems: VirtualItem<T>[] = [];
    for (let i = clampedStartIndex; i <= clampedEndIndex; i++) {
      visibleItems.push({
        index: i,
        data: this.items[i],
        height: this.getItemHeight(i),
        offset: this.getItemOffset(i),
        isVisible: i >= startIndex && i <= endIndex
      });
    }

    const previousRange = this.visibleRange;
    this.visibleRange = {
      startIndex: clampedStartIndex,
      endIndex: clampedEndIndex,
      visibleItems
    };

    this.performance.visibleItems = visibleItems.length;
    this.performance.renderTime = performance.now() - this.renderStartTime;
    
    if (previousRange.startIndex !== clampedStartIndex || previousRange.endIndex !== clampedEndIndex) {
      this.events.onVisibleRangeChange?.(this.visibleRange);
    }
    
    this.events.onItemsRendered?.(visibleItems);
  }

  private findItemIndex(offset: number): number {
    if (this.items.length === 0) return 0;
    
    if (typeof this.config.itemHeight === 'number') {
      return Math.floor(offset / this.config.itemHeight);
    }

    let totalOffset = 0;
    for (let i = 0; i < this.items.length; i++) {
      const itemHeight = this.getItemHeight(i);
      if (totalOffset + itemHeight > offset) {
        return i;
      }
      totalOffset += itemHeight;
    }
    
    return this.items.length - 1;
  }

  public getItemOffset(index: number): number {
    if (index < 0 || index >= this.items.length) return 0;
    
    if (this.offsetCache.has(index)) {
      return this.offsetCache.get(index)!;
    }

    let offset = 0;
    if (typeof this.config.itemHeight === 'number') {
      offset = index * this.config.itemHeight;
    } else {
      for (let i = 0; i < index; i++) {
        offset += this.getItemHeight(i);
      }
    }

    this.offsetCache.set(index, offset);
    return offset;
  }

  public getItemHeight(index: number): number {
    if (index < 0 || index >= this.items.length) {
      return this.getEstimatedItemHeight();
    }

    if (this.heightCache.has(index)) {
      return this.heightCache.get(index)!;
    }

    let height: number;
    if (typeof this.config.itemHeight === 'function') {
      height = this.config.itemHeight(this.items[index]);
    } else {
      height = this.config.itemHeight;
    }

    this.heightCache.set(index, height);
    return height;
  }

  private getEstimatedItemHeight(): number {
    return this.dynamicHeightConfig.estimatedItemHeight;
  }

  public getTotalHeight(): number {
    if (typeof this.config.itemHeight === 'number') {
      return this.items.length * this.config.itemHeight;
    }

    let totalHeight = 0;
    for (let i = 0; i < this.items.length; i++) {
      totalHeight += this.getItemHeight(i);
    }
    return totalHeight;
  }

  public resetCache(): void {
    this.heightCache.clear();
    this.offsetCache.clear();
    this.updateVisibleRange();
  }

  public getScrollElement(): HTMLElement | null {
    return this.scrollElement;
  }

  public isItemVisible(index: number): boolean {
    return index >= this.visibleRange.startIndex && index <= this.visibleRange.endIndex;
  }

  public setScrollElement(element: HTMLElement): void {
    if (this.scrollElement) {
      this.removeScrollListeners();
    }

    this.scrollElement = element;
    this.addScrollListeners();
  }

  public setContainerElement(element: HTMLElement): void {
    if (this.containerElement && this.resizeObserver) {
      this.resizeObserver.unobserve(this.containerElement);
    }

    this.containerElement = element;
    
    if (this.resizeObserver) {
      this.resizeObserver.observe(element);
    }
  }

  private addScrollListeners(): void {
    if (!this.scrollElement) return;

    this.scrollElement.addEventListener('scroll', this.handleScroll, { passive: true });
    this.scrollElement.addEventListener('scrollstart', this.handleScrollStart);
    this.scrollElement.addEventListener('scrollend', this.handleScrollEnd);
  }

  private removeScrollListeners(): void {
    if (!this.scrollElement) return;

    this.scrollElement.removeEventListener('scroll', this.handleScroll);
    this.scrollElement.removeEventListener('scrollstart', this.handleScrollStart);
    this.scrollElement.removeEventListener('scrollend', this.handleScrollEnd);
  }

  private handleScroll = (): void => {
    if (!this.scrollElement) return;

    this.updateViewport({
      top: this.scrollElement.offsetTop,
      height: this.scrollElement.offsetHeight,
      scrollTop: this.scrollElement.scrollTop,
      scrollHeight: this.scrollElement.scrollHeight,
      clientHeight: this.scrollElement.clientHeight
    });

    this.startScrolling();
    this.updatePerformanceMetrics();
  };

  private handleScrollStart = (): void => {
    this.startScrolling();
    this.events.onScrollStart?.();
  };

  private handleScrollEnd = (): void => {
    this.stopScrolling();
    this.events.onScrollEnd?.();
  };

  private startScrolling(): void {
    if (!this.isScrolling) {
      this.isScrolling = true;
      this.scrollState.isScrolling = true;
    }

    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }

    this.scrollTimeout = setTimeout(() => {
      this.stopScrolling();
    }, this.config.scrollingResetTimeoutMs);
  }

  private stopScrolling(): void {
    this.isScrolling = false;
    this.scrollState.isScrolling = false;
    this.scrollState.velocity = 0;
  }

  private handleResize(height: number): void {
    this.config.viewportHeight = height;
    this.updateVisibleRange();
  }

  private handleItemVisible(element: Element): void {
    const index = parseInt(element.getAttribute('data-index') || '0', 10);
    if (this.dynamicHeightConfig.enableHeightMeasurement) {
      this.measureItemHeight(element as HTMLElement, index);
    }
  }

  private measureItemHeight(element: HTMLElement, index: number): void {
    const height = element.offsetHeight;
    if (height > 0 && height !== this.heightCache.get(index)) {
      this.heightCache.set(index, height);
      this.offsetCache.clear(); // Clear offset cache as heights have changed
      this.updateVisibleRange();
    }
  }

  private updatePerformanceMetrics(): void {
    const now = performance.now();
    this.frameCount++;

    if (this.frameCount % 10 === 0) { // Update metrics every 10 frames
      const deltaTime = now - this.lastFrameTime;
      this.performance.frameRate = 1000 / deltaTime;
      this.performance.averageFrameTime = deltaTime;
      
      if (this.isScrolling) {
        this.performance.scrollingFrameRate = this.performance.frameRate;
      }
    }
  }

  public getPerformanceMetrics(): VirtualScrollPerformance {
    return { ...this.performance };
  }

  public dispose(): void {
    this.removeScrollListeners();
    
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }
    
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
    }

    this.heightCache.clear();
    this.offsetCache.clear();
  }
}