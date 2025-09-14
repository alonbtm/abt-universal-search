/**
 * DOMAdapter - A unified DOM search and manipulation library
 * Provides consistent interface for DOM operations with performance optimizations
 * and accessibility features built-in.
 */

class DOMAdapter {
    constructor(options = {}) {
        this.config = {
            enableCaching: options.enableCaching ?? true,
            enablePerformanceMetrics: options.enablePerformanceMetrics ?? false,
            enableAccessibility: options.enableAccessibility ?? true,
            cacheSize: options.cacheSize ?? 1000,
            debounceDelay: options.debounceDelay ?? 300,
            virtualScrolling: options.virtualScrolling ?? false,
            shadowDOMSupport: options.shadowDOMSupport ?? true,
            ...options
        };

        this.cache = new Map();
        this.searchIndex = new Map();
        this.mutationObserver = null;
        this.performanceMetrics = new Map();
        this.eventListeners = new Map();
        this.virtualViewports = new Map();
        
        this.init();
    }

    init() {
        if (this.config.enablePerformanceMetrics) {
            this.initPerformanceMonitoring();
        }
        
        if (this.config.shadowDOMSupport) {
            this.initShadowDOMSupport();
        }
        
        this.initMutationObserver();
        this.log('DOMAdapter initialized', 'info');
    }

    // ==================== CORE SEARCH METHODS ====================

    /**
     * Universal search method with multiple strategies
     * @param {string|Object} query - Search query or options object
     * @param {Element|string} context - Search context (element or selector)
     * @param {Object} options - Search options
     * @returns {Promise<Array>} Array of matching elements
     */
    async search(query, context = document, options = {}) {
        const startTime = performance.now();
        const searchOptions = { 
            strategy: 'auto',
            includeTextContent: true,
            includeAttributes: true,
            caseSensitive: false,
            fuzzyMatch: false,
            maxResults: Infinity,
            ...options 
        };

        try {
            // Resolve context
            const searchContext = typeof context === 'string' ? 
                document.querySelector(context) : context;
            
            if (!searchContext) {
                throw new Error('Search context not found');
            }

            // Check cache first
            const cacheKey = this.generateCacheKey(query, searchContext, searchOptions);
            if (this.config.enableCaching && this.cache.has(cacheKey)) {
                const cached = this.cache.get(cacheKey);
                this.recordMetric('search', performance.now() - startTime, 'cached');
                return cached;
            }

            // Choose search strategy
            const strategy = searchOptions.strategy === 'auto' ? 
                this.selectOptimalStrategy(query, searchContext, searchOptions) : 
                searchOptions.strategy;

            // Execute search
            let results;
            switch (strategy) {
                case 'css':
                    results = this.cssSearch(query, searchContext, searchOptions);
                    break;
                case 'xpath':
                    results = this.xpathSearch(query, searchContext, searchOptions);
                    break;
                case 'text':
                    results = this.textSearch(query, searchContext, searchOptions);
                    break;
                case 'indexed':
                    results = await this.indexedSearch(query, searchContext, searchOptions);
                    break;
                case 'fuzzy':
                    results = this.fuzzySearch(query, searchContext, searchOptions);
                    break;
                case 'attribute':
                    results = this.attributeSearch(query, searchContext, searchOptions);
                    break;
                default:
                    results = this.hybridSearch(query, searchContext, searchOptions);
            }

            // Apply result limits and post-processing
            results = this.processResults(results, searchOptions);

            // Cache results
            if (this.config.enableCaching) {
                this.cacheResult(cacheKey, results);
            }

            // Record metrics
            this.recordMetric('search', performance.now() - startTime, strategy);
            
            return results;
        } catch (error) {
            this.log(`Search error: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * CSS selector search
     */
    cssSearch(selector, context, options) {
        try {
            const elements = Array.from(context.querySelectorAll(selector));
            return this.config.shadowDOMSupport ? 
                this.extendToShadowDOM(elements, selector) : elements;
        } catch (error) {
            throw new Error(`Invalid CSS selector: ${selector}`);
        }
    }

    /**
     * XPath search
     */
    xpathSearch(xpath, context, options) {
        try {
            const result = document.evaluate(xpath, context, null, 
                XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
            const elements = [];
            for (let i = 0; i < result.snapshotLength; i++) {
                elements.push(result.snapshotItem(i));
            }
            return elements;
        } catch (error) {
            throw new Error(`Invalid XPath expression: ${xpath}`);
        }
    }

    /**
     * Text content search
     */
    textSearch(text, context, options) {
        const searchText = options.caseSensitive ? text : text.toLowerCase();
        const results = [];
        
        const walker = document.createTreeWalker(
            context,
            NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
            {
                acceptNode: (node) => {
                    if (node.nodeType === Node.TEXT_NODE) {
                        const nodeText = options.caseSensitive ? 
                            node.textContent : node.textContent.toLowerCase();
                        return nodeText.includes(searchText) ? 
                            NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
                    }
                    return NodeFilter.FILTER_SKIP;
                }
            }
        );

        let node;
        while (node = walker.nextNode()) {
            if (node.parentElement && !results.includes(node.parentElement)) {
                results.push(node.parentElement);
            }
        }

        return results;
    }

    /**
     * Indexed search using pre-built search index
     */
    async indexedSearch(query, context, options) {
        if (!this.searchIndex.has(context)) {
            await this.buildSearchIndex(context);
        }

        const index = this.searchIndex.get(context);
        const queryTerms = query.toLowerCase().split(/\s+/);
        const results = new Set();

        queryTerms.forEach(term => {
            if (index.has(term)) {
                index.get(term).forEach(element => results.add(element));
            }
        });

        return Array.from(results);
    }

    /**
     * Fuzzy search with similarity matching
     */
    fuzzySearch(query, context, options) {
        const threshold = options.fuzzyThreshold || 0.6;
        const results = [];

        const walker = document.createTreeWalker(
            context,
            NodeFilter.SHOW_ELEMENT,
            null
        );

        let element;
        while (element = walker.nextNode()) {
            const searchableText = this.getSearchableText(element);
            const similarity = this.calculateSimilarity(query, searchableText);
            
            if (similarity >= threshold) {
                results.push({ element, similarity });
            }
        }

        return results
            .sort((a, b) => b.similarity - a.similarity)
            .map(item => item.element);
    }

    /**
     * Attribute-based search
     */
    attributeSearch(criteria, context, options) {
        let selector = '';
        
        if (typeof criteria === 'string') {
            // Simple attribute name search
            selector = `[${criteria}]`;
        } else if (typeof criteria === 'object') {
            // Complex attribute criteria
            const selectors = [];
            Object.entries(criteria).forEach(([attr, value]) => {
                if (value === null || value === undefined) {
                    selectors.push(`[${attr}]`);
                } else if (typeof value === 'string') {
                    if (value.includes('*')) {
                        selectors.push(`[${attr}*="${value.replace('*', '')}"]`);
                    } else {
                        selectors.push(`[${attr}="${value}"]`);
                    }
                }
            });
            selector = selectors.join('');
        }

        return Array.from(context.querySelectorAll(selector));
    }

    /**
     * Hybrid search combining multiple strategies
     */
    hybridSearch(query, context, options) {
        const results = new Map(); // element -> score

        // CSS selector attempt
        try {
            const cssResults = this.cssSearch(query, context, options);
            cssResults.forEach(el => results.set(el, (results.get(el) || 0) + 3));
        } catch (e) {
            // CSS selector invalid, continue
        }

        // Text search
        const textResults = this.textSearch(query, context, options);
        textResults.forEach(el => results.set(el, (results.get(el) || 0) + 2));

        // Attribute search for data attributes
        if (query.includes('=') || query.includes('[')) {
            try {
                const attrResults = this.attributeSearch(query, context, options);
                attrResults.forEach(el => results.set(el, (results.get(el) || 0) + 1));
            } catch (e) {
                // Attribute search failed, continue
            }
        }

        // Sort by relevance score
        return Array.from(results.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([element]) => element);
    }

    // ==================== SELECTION AND MANIPULATION ====================

    /**
     * Select elements with enhanced capabilities
     */
    select(selector, context = document) {
        return new DOMSelection(this.search(selector, context), this);
    }

    /**
     * Find single element
     */
    find(selector, context = document) {
        const results = this.search(selector, context);
        return results.length > 0 ? results[0] : null;
    }

    /**
     * Find all matching elements
     */
    findAll(selector, context = document) {
        return this.search(selector, context);
    }

    // ==================== PERFORMANCE OPTIMIZATION ====================

    /**
     * Build search index for faster text searches
     */
    async buildSearchIndex(context) {
        const index = new Map();
        
        const walker = document.createTreeWalker(
            context,
            NodeFilter.SHOW_ELEMENT,
            null
        );

        let element;
        while (element = walker.nextNode()) {
            const text = this.getSearchableText(element).toLowerCase();
            const words = text.split(/\s+/).filter(word => word.length > 2);
            
            words.forEach(word => {
                if (!index.has(word)) {
                    index.set(word, new Set());
                }
                index.get(word).add(element);
            });
        }

        this.searchIndex.set(context, index);
    }

    /**
     * Select optimal search strategy based on query and context
     */
    selectOptimalStrategy(query, context, options) {
        // CSS selector pattern detection
        if (this.isCSSSelector(query)) {
            return 'css';
        }
        
        // XPath pattern detection
        if (query.startsWith('/') || query.includes('//')) {
            return 'xpath';
        }
        
        // Attribute search patterns
        if (query.includes('=') && (query.includes('[') || options.searchAttributes)) {
            return 'attribute';
        }
        
        // Fuzzy search for complex queries
        if (options.fuzzyMatch || query.length > 20) {
            return 'fuzzy';
        }
        
        // Large contexts benefit from indexing
        if (context.querySelectorAll('*').length > 1000) {
            return 'indexed';
        }
        
        // Default to text search
        return 'text';
    }

    /**
     * Check if string is a valid CSS selector
     */
    isCSSSelector(str) {
        try {
            document.querySelector(str);
            return true;
        } catch {
            return false;
        }
    }

    // ==================== VIRTUAL SCROLLING ====================

    /**
     * Create virtual viewport for large datasets
     */
    createVirtualViewport(container, items, options = {}) {
        const viewport = new VirtualViewport(container, items, {
            itemHeight: options.itemHeight || 40,
            renderItem: options.renderItem || this.defaultItemRenderer,
            adapter: this
        });
        
        this.virtualViewports.set(container, viewport);
        return viewport;
    }

    defaultItemRenderer(item, index) {
        const div = document.createElement('div');
        div.textContent = typeof item === 'string' ? item : JSON.stringify(item);
        return div;
    }

    // ==================== SHADOW DOM SUPPORT ====================

    initShadowDOMSupport() {
        this.shadowRoots = new WeakSet();
    }

    /**
     * Extend search to include Shadow DOM
     */
    extendToShadowDOM(elements, selector) {
        const allElements = [...elements];
        
        elements.forEach(element => {
            this.traverseShadowDOM(element, (shadowElement) => {
                try {
                    const shadowResults = Array.from(shadowElement.querySelectorAll(selector));
                    allElements.push(...shadowResults);
                } catch (e) {
                    // Shadow DOM query failed, continue
                }
            });
        });
        
        return allElements;
    }

    /**
     * Traverse Shadow DOM tree
     */
    traverseShadowDOM(root, callback, visited = new WeakSet()) {
        if (visited.has(root)) return;
        visited.add(root);

        if (root.shadowRoot) {
            callback(root.shadowRoot);
            Array.from(root.shadowRoot.children).forEach(child => {
                this.traverseShadowDOM(child, callback, visited);
            });
        }

        Array.from(root.children || []).forEach(child => {
            this.traverseShadowDOM(child, callback, visited);
        });
    }

    // ==================== MUTATION OBSERVER ====================

    initMutationObserver() {
        if (!this.config.enableCaching) return;

        this.mutationObserver = new MutationObserver((mutations) => {
            this.handleMutations(mutations);
        });

        this.mutationObserver.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeOldValue: true
        });
    }

    handleMutations(mutations) {
        let shouldClearCache = false;

        mutations.forEach(mutation => {
            if (mutation.type === 'childList' && 
                (mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0)) {
                shouldClearCache = true;
            }
            if (mutation.type === 'attributes') {
                shouldClearCache = true;
            }
        });

        if (shouldClearCache) {
            this.clearCache();
            this.searchIndex.clear();
        }
    }

    // ==================== ACCESSIBILITY FEATURES ====================

    /**
     * Announce search results to screen readers
     */
    announceResults(results, query) {
        if (!this.config.enableAccessibility) return;

        const message = `Found ${results.length} results for "${query}"`;
        const announcement = document.getElementById('search-announcement') || 
            this.createAnnouncementElement();
        
        announcement.textContent = message;
    }

    createAnnouncementElement() {
        const element = document.createElement('div');
        element.id = 'search-announcement';
        element.setAttribute('aria-live', 'polite');
        element.setAttribute('aria-atomic', 'true');
        element.style.position = 'absolute';
        element.style.left = '-10000px';
        element.style.width = '1px';
        element.style.height = '1px';
        element.style.overflow = 'hidden';
        document.body.appendChild(element);
        return element;
    }

    /**
     * Add ARIA attributes to search results
     */
    enhanceAccessibility(elements, query) {
        if (!this.config.enableAccessibility) return elements;

        elements.forEach((element, index) => {
            element.setAttribute('role', 'option');
            element.setAttribute('aria-label', 
                `Search result ${index + 1}: ${element.textContent.trim()}`);
            element.tabIndex = 0;
        });

        return elements;
    }

    // ==================== UTILITY METHODS ====================

    getSearchableText(element) {
        const texts = [];
        
        // Element text content
        if (element.textContent) {
            texts.push(element.textContent.trim());
        }
        
        // Common attributes
        ['title', 'alt', 'placeholder', 'aria-label', 'data-search'].forEach(attr => {
            const value = element.getAttribute(attr);
            if (value) texts.push(value);
        });
        
        return texts.join(' ');
    }

    calculateSimilarity(str1, str2) {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        
        if (longer.length === 0) return 1.0;
        
        const distance = this.levenshteinDistance(longer, shorter);
        return (longer.length - distance) / longer.length;
    }

    levenshteinDistance(str1, str2) {
        const matrix = [];
        
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        
        return matrix[str2.length][str1.length];
    }

    processResults(results, options) {
        if (options.maxResults && options.maxResults < results.length) {
            results = results.slice(0, options.maxResults);
        }
        
        if (this.config.enableAccessibility) {
            results = this.enhanceAccessibility(results, options.query);
        }
        
        return results;
    }

    generateCacheKey(query, context, options) {
        return JSON.stringify({ query, contextId: context.id || 'document', options });
    }

    cacheResult(key, result) {
        if (this.cache.size >= this.config.cacheSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        this.cache.set(key, result);
    }

    clearCache() {
        this.cache.clear();
    }

    // ==================== PERFORMANCE MONITORING ====================

    initPerformanceMonitoring() {
        this.performanceMetrics.set('searches', []);
        this.performanceMetrics.set('cacheHits', 0);
        this.performanceMetrics.set('cacheMisses', 0);
    }

    recordMetric(type, duration, strategy) {
        if (!this.config.enablePerformanceMetrics) return;

        const metrics = this.performanceMetrics.get('searches') || [];
        metrics.push({ type, duration, strategy, timestamp: Date.now() });
        this.performanceMetrics.set('searches', metrics);

        if (strategy === 'cached') {
            this.performanceMetrics.set('cacheHits', 
                this.performanceMetrics.get('cacheHits') + 1);
        } else {
            this.performanceMetrics.set('cacheMisses', 
                this.performanceMetrics.get('cacheMisses') + 1);
        }
    }

    getPerformanceReport() {
        if (!this.config.enablePerformanceMetrics) return null;

        const searches = this.performanceMetrics.get('searches') || [];
        const totalSearches = searches.length;
        const avgDuration = searches.reduce((sum, s) => sum + s.duration, 0) / totalSearches;
        const strategies = {};
        
        searches.forEach(search => {
            if (!strategies[search.strategy]) {
                strategies[search.strategy] = { count: 0, totalTime: 0 };
            }
            strategies[search.strategy].count++;
            strategies[search.strategy].totalTime += search.duration;
        });

        return {
            totalSearches,
            averageDuration: avgDuration,
            cacheHitRate: this.performanceMetrics.get('cacheHits') / totalSearches,
            strategies: Object.entries(strategies).map(([name, data]) => ({
                name,
                count: data.count,
                averageDuration: data.totalTime / data.count
            }))
        };
    }

    // ==================== EVENT HANDLING ====================

    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }

    off(event, callback) {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }

    emit(event, data) {
        const listeners = this.eventListeners.get(event) || [];
        listeners.forEach(callback => callback(data));
    }

    // ==================== LOGGING ====================

    log(message, level = 'info') {
        if (this.config.debug) {
            console[level](`[DOMAdapter] ${message}`);
        }
        this.emit('log', { message, level, timestamp: Date.now() });
    }

    // ==================== CLEANUP ====================

    destroy() {
        if (this.mutationObserver) {
            this.mutationObserver.disconnect();
        }
        
        this.virtualViewports.forEach(viewport => viewport.destroy());
        this.virtualViewports.clear();
        
        this.cache.clear();
        this.searchIndex.clear();
        this.eventListeners.clear();
        
        this.log('DOMAdapter destroyed', 'info');
    }
}

// ==================== DOM SELECTION CLASS ====================

class DOMSelection {
    constructor(elements, adapter) {
        this.elements = elements;
        this.adapter = adapter;
        this.length = elements.length;
    }

    // Array-like methods
    forEach(callback) {
        this.elements.forEach(callback);
        return this;
    }

    map(callback) {
        return this.elements.map(callback);
    }

    filter(callback) {
        return new DOMSelection(this.elements.filter(callback), this.adapter);
    }

    find(selector) {
        const results = [];
        this.elements.forEach(el => {
            results.push(...this.adapter.search(selector, el));
        });
        return new DOMSelection(results, this.adapter);
    }

    // DOM manipulation
    addClass(className) {
        this.elements.forEach(el => el.classList.add(className));
        return this;
    }

    removeClass(className) {
        this.elements.forEach(el => el.classList.remove(className));
        return this;
    }

    toggleClass(className) {
        this.elements.forEach(el => el.classList.toggle(className));
        return this;
    }

    attr(name, value) {
        if (value === undefined) {
            return this.elements[0]?.getAttribute(name);
        }
        this.elements.forEach(el => el.setAttribute(name, value));
        return this;
    }

    css(property, value) {
        if (value === undefined) {
            return getComputedStyle(this.elements[0])?.[property];
        }
        this.elements.forEach(el => el.style[property] = value);
        return this;
    }

    text(content) {
        if (content === undefined) {
            return this.elements[0]?.textContent;
        }
        this.elements.forEach(el => el.textContent = content);
        return this;
    }

    html(content) {
        if (content === undefined) {
            return this.elements[0]?.innerHTML;
        }
        this.elements.forEach(el => el.innerHTML = content);
        return this;
    }

    // Event handling
    on(event, handler) {
        this.elements.forEach(el => el.addEventListener(event, handler));
        return this;
    }

    off(event, handler) {
        this.elements.forEach(el => el.removeEventListener(event, handler));
        return this;
    }

    // Visibility and interaction
    show() {
        this.elements.forEach(el => el.style.display = '');
        return this;
    }

    hide() {
        this.elements.forEach(el => el.style.display = 'none');
        return this;
    }

    focus() {
        if (this.elements[0]) {
            this.elements[0].focus();
        }
        return this;
    }

    // Array access
    get(index) {
        return this.elements[index];
    }

    first() {
        return this.elements[0];
    }

    last() {
        return this.elements[this.elements.length - 1];
    }

    // Iteration
    [Symbol.iterator]() {
        return this.elements[Symbol.iterator]();
    }
}

// ==================== VIRTUAL VIEWPORT CLASS ====================

class VirtualViewport {
    constructor(container, items, options) {
        this.container = container;
        this.items = items;
        this.itemHeight = options.itemHeight;
        this.renderItem = options.renderItem;
        this.adapter = options.adapter;
        
        this.visibleStart = 0;
        this.visibleEnd = 0;
        this.scrollTop = 0;
        
        this.init();
    }

    init() {
        this.container.style.position = 'relative';
        this.container.style.overflow = 'auto';
        
        this.content = document.createElement('div');
        this.content.style.position = 'relative';
        this.container.appendChild(this.content);
        
        this.container.addEventListener('scroll', () => this.updateView());
        this.updateView();
    }

    updateView() {
        const containerHeight = this.container.clientHeight;
        const scrollTop = this.container.scrollTop;
        
        this.visibleStart = Math.floor(scrollTop / this.itemHeight);
        this.visibleEnd = Math.min(
            this.visibleStart + Math.ceil(containerHeight / this.itemHeight) + 1,
            this.items.length
        );
        
        this.content.style.height = `${this.items.length * this.itemHeight}px`;
        this.content.innerHTML = '';
        
        for (let i = this.visibleStart; i < this.visibleEnd; i++) {
            const item = this.renderItem(this.items[i], i);
            item.style.position = 'absolute';
            item.style.top = `${i * this.itemHeight}px`;
            item.style.width = '100%';
            item.style.height = `${this.itemHeight}px`;
            this.content.appendChild(item);
        }
    }

    updateItems(newItems) {
        this.items = newItems;
        this.updateView();
    }

    scrollToIndex(index) {
        this.container.scrollTop = index * this.itemHeight;
    }

    destroy() {
        this.container.removeChild(this.content);
    }
}

// ==================== FACTORY FUNCTION ====================

/**
 * Create a new DOMAdapter instance
 * @param {Object} options Configuration options
 * @returns {DOMAdapter} New DOMAdapter instance
 */
function createDOMAdapter(options = {}) {
    return new DOMAdapter(options);
}

// ==================== EXPORTS ====================

// Browser environment
if (typeof window !== 'undefined') {
    window.DOMAdapter = DOMAdapter;
    window.createDOMAdapter = createDOMAdapter;
}

// Node.js environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        DOMAdapter,
        DOMSelection,
        VirtualViewport,
        createDOMAdapter
    };
}

// Export for modern bundlers
export { DOMAdapter, DOMSelection, VirtualViewport, createDOMAdapter };