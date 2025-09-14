/**
 * Text Direction Detector
 * Automatic text direction detection with manual override support
 */
import { ValidationError } from '../utils/validation';
import { detectTextDirection, isRTLLocale, getBrowserLocales, normalizeLocale } from '../utils/internationalization';
/**
 * Text direction detection with caching and multiple detection methods
 */
export class TextDirectionDetector {
    constructor(config = {}) {
        this.isInitialized = false;
        this.detectionCache = new Map();
        this.cacheCleanupInterval = null;
        this.mutationObserver = null;
        this.eventListeners = new Map();
        // Detection statistics
        this.stats = {
            detections: 0,
            cacheHits: 0,
            cacheMisses: 0,
            localeDetections: 0,
            contentDetections: 0,
            manualOverrides: 0
        };
        this.config = {
            rtlThreshold: 0.3,
            detectFromLocale: true,
            detectFromContent: true,
            cacheResults: true,
            fallbackDirection: 'ltr',
            ...config
        };
        this.initializeEventMaps();
    }
    /**
     * Initialize text direction detector
     */
    async init() {
        if (this.isInitialized) {
            return;
        }
        try {
            if (this.config.cacheResults) {
                this.setupCacheCleanup();
            }
            this.setupDOMObserver();
            this.isInitialized = true;
        }
        catch (error) {
            throw new ValidationError(`Failed to initialize TextDirectionDetector: ${error}`);
        }
    }
    /**
     * Destroy detector and cleanup resources
     */
    destroy() {
        if (this.cacheCleanupInterval) {
            clearInterval(this.cacheCleanupInterval);
            this.cacheCleanupInterval = null;
        }
        if (this.mutationObserver) {
            this.mutationObserver.disconnect();
            this.mutationObserver = null;
        }
        this.detectionCache.clear();
        this.eventListeners.clear();
        this.isInitialized = false;
    }
    /**
     * Detect text direction from various sources
     */
    detectDirection(text, locale, element, forceRedetection = false) {
        this.stats.detections++;
        // Check for manual override first
        if (element) {
            const manualDirection = this.checkManualOverride(element);
            if (manualDirection) {
                this.stats.manualOverrides++;
                return manualDirection;
            }
        }
        // Create cache key
        const cacheKey = this.createCacheKey(text, locale, element);
        // Check cache
        if (this.config.cacheResults && !forceRedetection) {
            const cached = this.getCachedResult(cacheKey);
            if (cached) {
                this.stats.cacheHits++;
                return cached;
            }
            this.stats.cacheMisses++;
        }
        // Perform detection
        const result = this.performDetection(text, locale, element);
        // Cache result
        if (this.config.cacheResults) {
            this.cacheResult(cacheKey, result);
        }
        return result;
    }
    /**
     * Detect direction from element content
     */
    detectFromElement(element) {
        const textContent = this.extractTextContent(element);
        const locale = this.extractLocaleFromElement(element);
        return this.detectDirection(textContent, locale, element);
    }
    /**
     * Detect direction from locale only
     */
    detectFromLocale(locale) {
        this.stats.localeDetections++;
        const isRTL = isRTLLocale(locale);
        const direction = isRTL ? 'rtl' : 'ltr';
        return {
            direction,
            confidence: 0.9,
            method: 'locale',
            ltrChars: 0,
            rtlChars: 0,
            neutralChars: 0,
            totalChars: 0
        };
    }
    /**
     * Detect direction from content only
     */
    detectFromContent(text) {
        this.stats.contentDetections++;
        if (!text.trim()) {
            return {
                direction: this.config.fallbackDirection,
                confidence: 0,
                method: 'fallback',
                ltrChars: 0,
                rtlChars: 0,
                neutralChars: 0,
                totalChars: 0
            };
        }
        return detectTextDirection(text, this.config.rtlThreshold);
    }
    /**
     * Set manual direction override on element
     */
    setManualOverride(element, direction) {
        element.setAttribute('dir', direction);
        element.setAttribute('data-direction-manual', 'true');
        // Emit direction change event
        this.emit('direction-changed', direction, 'ltr');
    }
    /**
     * Remove manual direction override from element
     */
    removeManualOverride(element) {
        element.removeAttribute('dir');
        element.removeAttribute('data-direction-manual');
        // Re-detect direction
        const newResult = this.detectFromElement(element);
        this.emit('direction-changed', newResult.direction, 'ltr');
    }
    /**
     * Check if element has manual direction override
     */
    hasManualOverride(element) {
        return element.hasAttribute('data-direction-manual');
    }
    /**
     * Auto-detect and apply direction to element
     */
    autoApplyDirection(element) {
        const result = this.detectFromElement(element);
        if (!this.hasManualOverride(element)) {
            element.setAttribute('dir', result.direction);
            element.setAttribute('data-direction-auto', 'true');
        }
        return result;
    }
    /**
     * Detect direction for multiple elements
     */
    batchDetection(elements) {
        const results = new Map();
        elements.forEach(element => {
            const result = this.detectFromElement(element);
            results.set(element, result);
            // Apply direction if not manually set
            if (!this.hasManualOverride(element)) {
                element.setAttribute('dir', result.direction);
            }
        });
        return results;
    }
    /**
     * Get detection statistics
     */
    getStats() {
        return { ...this.stats };
    }
    /**
     * Clear detection cache
     */
    clearCache() {
        this.detectionCache.clear();
    }
    /**
     * Get cache size
     */
    getCacheSize() {
        return this.detectionCache.size;
    }
    /**
     * Add event listener
     */
    on(event, handler) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(handler);
    }
    /**
     * Remove event listener
     */
    off(event, handler) {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            const index = listeners.indexOf(handler);
            if (index >= 0) {
                listeners.splice(index, 1);
            }
        }
    }
    // Private implementation methods
    performDetection(text, locale, element) {
        const detectionResults = [];
        // Method 1: Detect from locale
        if (this.config.detectFromLocale && locale) {
            detectionResults.push(this.detectFromLocale(locale));
        }
        // Method 2: Detect from content
        if (this.config.detectFromContent && text) {
            detectionResults.push(this.detectFromContent(text));
        }
        // Method 3: Detect from browser locale if no other sources
        if (detectionResults.length === 0 && this.config.detectFromLocale) {
            const browserLocales = getBrowserLocales();
            if (browserLocales.length > 0) {
                detectionResults.push(this.detectFromLocale(browserLocales[0]));
            }
        }
        // Method 4: Use element's existing direction
        if (element && detectionResults.length === 0) {
            const existingDir = element.getAttribute('dir');
            if (existingDir === 'ltr' || existingDir === 'rtl') {
                return {
                    direction: existingDir,
                    confidence: 0.8,
                    method: 'configuration',
                    ltrChars: 0,
                    rtlChars: 0,
                    neutralChars: 0,
                    totalChars: 0
                };
            }
        }
        // Choose best result
        if (detectionResults.length === 0) {
            return {
                direction: this.config.fallbackDirection,
                confidence: 0,
                method: 'fallback',
                ltrChars: 0,
                rtlChars: 0,
                neutralChars: 0,
                totalChars: 0
            };
        }
        // Return result with highest confidence
        return detectionResults.reduce((best, current) => current.confidence > best.confidence ? current : best);
    }
    checkManualOverride(element) {
        if (!this.hasManualOverride(element)) {
            return null;
        }
        const dir = element.getAttribute('dir');
        if (dir === 'ltr' || dir === 'rtl') {
            return {
                direction: dir,
                confidence: 1,
                method: 'configuration',
                ltrChars: 0,
                rtlChars: 0,
                neutralChars: 0,
                totalChars: 0
            };
        }
        return null;
    }
    extractTextContent(element) {
        // Get visible text content, excluding script and style elements
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
            acceptNode: (node) => {
                const parent = node.parentElement;
                if (!parent)
                    return NodeFilter.FILTER_REJECT;
                const tagName = parent.tagName.toLowerCase();
                if (['script', 'style', 'noscript'].includes(tagName)) {
                    return NodeFilter.FILTER_REJECT;
                }
                const style = getComputedStyle(parent);
                if (style.display === 'none' || style.visibility === 'hidden') {
                    return NodeFilter.FILTER_REJECT;
                }
                return NodeFilter.FILTER_ACCEPT;
            }
        });
        let textContent = '';
        let node;
        while (node = walker.nextNode()) {
            textContent += node.textContent || '';
        }
        return textContent.trim();
    }
    extractLocaleFromElement(element) {
        // Check for lang attribute on element or ancestors
        let current = element;
        while (current) {
            const lang = current.getAttribute('lang');
            if (lang) {
                return normalizeLocale(lang);
            }
            current = current.parentElement;
        }
        // Check document language
        if (document.documentElement.lang) {
            return normalizeLocale(document.documentElement.lang);
        }
        return undefined;
    }
    createCacheKey(text, locale, element) {
        const parts = [
            text ? `text:${text.slice(0, 100)}` : '',
            locale ? `locale:${locale}` : '',
            element ? `element:${element.tagName}:${element.className}` : ''
        ].filter(Boolean);
        return parts.join('|');
    }
    getCachedResult(cacheKey) {
        const entry = this.detectionCache.get(cacheKey);
        if (!entry)
            return null;
        if (Date.now() > entry.expiresAt) {
            this.detectionCache.delete(cacheKey);
            return null;
        }
        return entry.result;
    }
    cacheResult(cacheKey, result) {
        const now = Date.now();
        const entry = {
            result,
            timestamp: now,
            expiresAt: now + (5 * 60 * 1000) // 5 minutes
        };
        this.detectionCache.set(cacheKey, entry);
    }
    setupCacheCleanup() {
        // Clean expired cache entries every minute
        this.cacheCleanupInterval = window.setInterval(() => {
            const now = Date.now();
            for (const [key, entry] of this.detectionCache.entries()) {
                if (now > entry.expiresAt) {
                    this.detectionCache.delete(key);
                }
            }
        }, 60000);
    }
    setupDOMObserver() {
        // Observe DOM changes to auto-detect direction for new elements
        this.mutationObserver = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(node => {
                        if (node instanceof HTMLElement) {
                            this.processNewElement(node);
                        }
                    });
                }
                else if (mutation.type === 'characterData') {
                    const element = mutation.target.parentElement;
                    if (element && element.hasAttribute('data-direction-auto')) {
                        this.autoApplyDirection(element);
                    }
                }
            });
        });
        this.mutationObserver.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true
        });
    }
    processNewElement(element) {
        // Auto-detect direction for elements marked for auto-detection
        if (element.hasAttribute('data-direction-auto')) {
            this.autoApplyDirection(element);
        }
        // Process child elements
        const autoElements = element.querySelectorAll('[data-direction-auto]');
        autoElements.forEach(child => {
            if (child instanceof HTMLElement) {
                this.autoApplyDirection(child);
            }
        });
    }
    emit(event, ...args) {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            listeners.forEach(listener => {
                try {
                    listener(...args);
                }
                catch (error) {
                    console.error(`Error in TextDirectionDetector ${event} listener:`, error);
                }
            });
        }
    }
    initializeEventMaps() {
        const events = [
            'direction-changed'
        ];
        events.forEach(event => {
            this.eventListeners.set(event, []);
        });
    }
}
//# sourceMappingURL=TextDirectionDetector.js.map