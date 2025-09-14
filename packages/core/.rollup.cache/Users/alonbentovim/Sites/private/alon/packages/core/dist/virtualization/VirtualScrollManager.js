export class VirtualScrollManager {
    constructor(config = {}, events = {}, dynamicHeightConfig = {}, smoothScrollConfig = {}) {
        this.items = [];
        this.scrollElement = null;
        this.containerElement = null;
        this.heightCache = new Map();
        this.offsetCache = new Map();
        this.isScrolling = false;
        this.scrollTimeout = null;
        this.animationFrameId = null;
        this.resizeObserver = null;
        this.intersectionObserver = null;
        this.lastFrameTime = 0;
        this.frameCount = 0;
        this.renderStartTime = 0;
        this.handleScroll = () => {
            if (!this.scrollElement)
                return;
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
        this.handleScrollStart = () => {
            this.startScrolling();
            this.events.onScrollStart?.();
        };
        this.handleScrollEnd = () => {
            this.stopScrolling();
            this.events.onScrollEnd?.();
        };
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
    initializeObservers() {
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
            this.intersectionObserver = new IntersectionObserver(entries => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        this.handleItemVisible(entry.target);
                    }
                });
            }, {
                root: this.scrollElement,
                rootMargin: `${this.config.overscan * this.getEstimatedItemHeight()}px`
            });
        }
    }
    setItems(items) {
        const previousCount = this.items.length;
        this.items = items;
        this.performance.totalItems = items.length;
        if (this.dynamicHeightConfig.remeasureOnUpdate || previousCount !== items.length) {
            this.resetCache();
        }
        this.updateVisibleRange();
    }
    scrollTo(index, align = 'auto') {
        if (index < 0 || index >= this.items.length)
            return;
        const itemOffset = this.getItemOffset(index);
        const itemHeight = this.getItemHeight(index);
        const scrollTop = this.calculateScrollTop(itemOffset, itemHeight, align);
        this.scrollToOffset(scrollTop);
    }
    scrollToOffset(offset) {
        if (!this.scrollElement)
            return;
        const maxOffset = this.getTotalHeight() - this.scrollState.clientHeight;
        const targetOffset = Math.max(0, Math.min(offset, maxOffset));
        if (this.smoothScrollConfig.enableMomentum) {
            this.smoothScrollTo(targetOffset);
        }
        else {
            this.scrollElement.scrollTop = targetOffset;
        }
    }
    smoothScrollTo(targetOffset) {
        if (!this.scrollElement)
            return;
        const startOffset = this.scrollElement.scrollTop;
        const distance = targetOffset - startOffset;
        const startTime = performance.now();
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / this.smoothScrollConfig.duration, 1);
            const easeProgress = this.applyEasing(progress);
            const currentOffset = startOffset + distance * easeProgress;
            this.scrollElement.scrollTop = currentOffset;
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        requestAnimationFrame(animate);
    }
    applyEasing(progress) {
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
    calculateScrollTop(itemOffset, itemHeight, align) {
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
                }
                else if (itemEnd > viewportEnd) {
                    return itemOffset - viewportHeight + itemHeight;
                }
                return currentScrollTop;
        }
    }
    getVisibleRange() {
        return { ...this.visibleRange };
    }
    updateViewport(viewport) {
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
    determineScrollDirection(previous, current) {
        if (Math.abs(current - previous) < 1)
            return null;
        return current > previous ? 'down' : 'up';
    }
    calculateScrollVelocity(previous, current) {
        const now = performance.now();
        const timeDelta = now - this.lastFrameTime;
        const distance = Math.abs(current - previous);
        this.lastFrameTime = now;
        return timeDelta > 0 ? distance / timeDelta : 0;
    }
    updateVisibleRange() {
        this.renderStartTime = performance.now();
        const { scrollTop, clientHeight } = this.scrollState;
        const bufferHeight = this.config.bufferSize * this.getEstimatedItemHeight();
        const startOffset = Math.max(0, scrollTop - bufferHeight);
        const endOffset = scrollTop + clientHeight + bufferHeight;
        const startIndex = this.findItemIndex(startOffset);
        const endIndex = this.findItemIndex(endOffset);
        const clampedStartIndex = Math.max(0, startIndex - this.config.overscan);
        const clampedEndIndex = Math.min(this.items.length - 1, endIndex + this.config.overscan);
        const visibleItems = [];
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
    findItemIndex(offset) {
        if (this.items.length === 0)
            return 0;
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
    getItemOffset(index) {
        if (index < 0 || index >= this.items.length)
            return 0;
        if (this.offsetCache.has(index)) {
            return this.offsetCache.get(index);
        }
        let offset = 0;
        if (typeof this.config.itemHeight === 'number') {
            offset = index * this.config.itemHeight;
        }
        else {
            for (let i = 0; i < index; i++) {
                offset += this.getItemHeight(i);
            }
        }
        this.offsetCache.set(index, offset);
        return offset;
    }
    getItemHeight(index) {
        if (index < 0 || index >= this.items.length) {
            return this.getEstimatedItemHeight();
        }
        if (this.heightCache.has(index)) {
            return this.heightCache.get(index);
        }
        let height;
        if (typeof this.config.itemHeight === 'function') {
            height = this.config.itemHeight(this.items[index]);
        }
        else {
            height = this.config.itemHeight;
        }
        this.heightCache.set(index, height);
        return height;
    }
    getEstimatedItemHeight() {
        return this.dynamicHeightConfig.estimatedItemHeight;
    }
    getTotalHeight() {
        if (typeof this.config.itemHeight === 'number') {
            return this.items.length * this.config.itemHeight;
        }
        let totalHeight = 0;
        for (let i = 0; i < this.items.length; i++) {
            totalHeight += this.getItemHeight(i);
        }
        return totalHeight;
    }
    resetCache() {
        this.heightCache.clear();
        this.offsetCache.clear();
        this.updateVisibleRange();
    }
    getScrollElement() {
        return this.scrollElement;
    }
    isItemVisible(index) {
        return index >= this.visibleRange.startIndex && index <= this.visibleRange.endIndex;
    }
    setScrollElement(element) {
        if (this.scrollElement) {
            this.removeScrollListeners();
        }
        this.scrollElement = element;
        this.addScrollListeners();
    }
    setContainerElement(element) {
        if (this.containerElement && this.resizeObserver) {
            this.resizeObserver.unobserve(this.containerElement);
        }
        this.containerElement = element;
        if (this.resizeObserver) {
            this.resizeObserver.observe(element);
        }
    }
    addScrollListeners() {
        if (!this.scrollElement)
            return;
        this.scrollElement.addEventListener('scroll', this.handleScroll, { passive: true });
        this.scrollElement.addEventListener('scrollstart', this.handleScrollStart);
        this.scrollElement.addEventListener('scrollend', this.handleScrollEnd);
    }
    removeScrollListeners() {
        if (!this.scrollElement)
            return;
        this.scrollElement.removeEventListener('scroll', this.handleScroll);
        this.scrollElement.removeEventListener('scrollstart', this.handleScrollStart);
        this.scrollElement.removeEventListener('scrollend', this.handleScrollEnd);
    }
    startScrolling() {
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
    stopScrolling() {
        this.isScrolling = false;
        this.scrollState.isScrolling = false;
        this.scrollState.velocity = 0;
    }
    handleResize(height) {
        this.config.viewportHeight = height;
        this.updateVisibleRange();
    }
    handleItemVisible(element) {
        const index = parseInt(element.getAttribute('data-index') || '0', 10);
        if (this.dynamicHeightConfig.enableHeightMeasurement) {
            this.measureItemHeight(element, index);
        }
    }
    measureItemHeight(element, index) {
        const height = element.offsetHeight;
        if (height > 0 && height !== this.heightCache.get(index)) {
            this.heightCache.set(index, height);
            this.offsetCache.clear(); // Clear offset cache as heights have changed
            this.updateVisibleRange();
        }
    }
    updatePerformanceMetrics() {
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
    getPerformanceMetrics() {
        return { ...this.performance };
    }
    dispose() {
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
//# sourceMappingURL=VirtualScrollManager.js.map