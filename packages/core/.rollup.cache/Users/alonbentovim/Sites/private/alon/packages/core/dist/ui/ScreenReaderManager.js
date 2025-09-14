/**
 * ScreenReaderManager - Comprehensive screen reader support
 * @description ARIA live regions, announcements, and screen reader optimizations
 */
import { ValidationError } from '../utils/validation';
/**
 * ScreenReaderManager - Comprehensive screen reader support
 */
export class ScreenReaderManager {
    constructor() {
        this.liveRegions = new Map();
        this.announcementQueue = [];
        this.isInitialized = false;
        this.processingQueue = false;
        this.queueProcessor = null;
        this.assistiveTech = null;
        this.eventListeners = new Map();
        this.initializeEventMaps();
    }
    /**
     * Initialize screen reader manager
     */
    async init() {
        if (this.isInitialized) {
            return;
        }
        try {
            // Detect screen reader technology
            this.assistiveTech = this.detectAssistiveTechnology();
            // Set up default live regions
            this.setupDefaultLiveRegions();
            // Start announcement queue processor
            this.startQueueProcessor();
            this.isInitialized = true;
        }
        catch (error) {
            throw new ValidationError(`Failed to initialize ScreenReaderManager: ${error}`);
        }
    }
    /**
     * Make announcement to screen readers
     */
    announce(announcement) {
        if (!this.isInitialized) {
            console.warn('ScreenReaderManager not initialized, queuing announcement');
        }
        try {
            // Add to queue
            const queueItem = {
                announcement,
                timestamp: Date.now(),
                id: this.generateAnnouncementId()
            };
            this.announcementQueue.push(queueItem);
            this.emit('announcement-queued', announcement);
            // Sort queue by priority
            this.prioritizeQueue();
            // Process immediately if urgent
            if (announcement.priority === 'urgent') {
                this.processAnnouncementQueue();
            }
        }
        catch (error) {
            console.error('Failed to announce to screen reader:', error);
        }
    }
    /**
     * Make immediate announcement (bypasses queue)
     */
    announceImmediate(message, liveRegion = 'assertive') {
        try {
            const region = this.getLiveRegion(liveRegion);
            if (region) {
                // Clear previous content for immediate announcements
                region.textContent = '';
                // Force reflow to ensure screen readers pick up the change
                region.offsetHeight;
                // Set new message
                region.textContent = message;
                this.emit('announcement-made', {
                    message,
                    priority: 'urgent',
                    liveRegion,
                    clearPrevious: true
                });
            }
        }
        catch (error) {
            console.error('Failed to make immediate announcement:', error);
        }
    }
    /**
     * Clear all announcements from a live region
     */
    clearRegion(liveRegion) {
        try {
            const region = this.getLiveRegion(liveRegion);
            if (region) {
                region.textContent = '';
                this.emit('announcement-cleared', region.id);
            }
        }
        catch (error) {
            console.error('Failed to clear live region:', error);
        }
    }
    /**
     * Create custom live region
     */
    createLiveRegion(config) {
        try {
            // Check if region already exists
            if (this.liveRegions.has(config.id)) {
                throw new ValidationError(`Live region with id '${config.id}' already exists`);
            }
            // Create region element
            const region = document.createElement('div');
            region.id = config.id;
            region.setAttribute('aria-live', config.politeness);
            region.setAttribute('aria-atomic', config.atomic.toString());
            region.setAttribute('aria-relevant', config.relevant);
            if (config.busy) {
                region.setAttribute('aria-busy', 'true');
            }
            // Style for screen readers (hidden but accessible)
            region.style.cssText = `
        position: absolute !important;
        left: -10000px !important;
        top: -10000px !important;
        width: 1px !important;
        height: 1px !important;
        overflow: hidden !important;
        clip: rect(1px, 1px, 1px, 1px) !important;
        white-space: nowrap !important;
      `;
            // Add to DOM
            document.body.appendChild(region);
            this.liveRegions.set(config.id, region);
            this.emit('region-created', config);
            return region;
        }
        catch (error) {
            throw new ValidationError(`Failed to create live region: ${error}`);
        }
    }
    /**
     * Destroy live region
     */
    destroyLiveRegion(regionId) {
        try {
            const region = this.liveRegions.get(regionId);
            if (region && region.parentNode) {
                region.parentNode.removeChild(region);
                this.liveRegions.delete(regionId);
                this.emit('region-destroyed', regionId);
                return true;
            }
            return false;
        }
        catch (error) {
            console.error('Failed to destroy live region:', error);
            return false;
        }
    }
    /**
     * Get live region element
     */
    getLiveRegion(type) {
        const regionId = `aria-live-${type}`;
        return this.liveRegions.get(regionId) || null;
    }
    /**
     * Announce search results count
     */
    announceResultsCount(count, query = '') {
        let message = '';
        if (count === 0) {
            message = query ?
                `No results found for "${query}". Try different search terms.` :
                'No results found.';
        }
        else if (count === 1) {
            message = query ?
                `1 result found for "${query}".` :
                '1 result found.';
        }
        else {
            message = query ?
                `${count} results found for "${query}".` :
                `${count} results found.`;
        }
        this.announce({
            message,
            priority: 'medium',
            liveRegion: 'polite',
            clearPrevious: true
        });
    }
    /**
     * Announce loading state
     */
    announceLoading(isLoading, message) {
        const defaultMessage = isLoading ? 'Loading...' : 'Loading complete.';
        this.announce({
            message: message || defaultMessage,
            priority: 'medium',
            liveRegion: 'polite',
            clearPrevious: true
        });
    }
    /**
     * Announce error state
     */
    announceError(error, canRetry = false) {
        const errorMessage = error instanceof Error ? error.message : error;
        const retryMessage = canRetry ? ' Press the retry button to try again.' : '';
        this.announce({
            message: `Error: ${errorMessage}${retryMessage}`,
            priority: 'high',
            liveRegion: 'assertive',
            clearPrevious: true
        });
    }
    /**
     * Announce navigation change
     */
    announceNavigation(currentIndex, totalItems, itemLabel) {
        const position = currentIndex + 1;
        const label = itemLabel || 'item';
        this.announce({
            message: `${label} ${position} of ${totalItems}`,
            priority: 'low',
            liveRegion: 'polite',
            delay: 100
        });
    }
    /**
     * Announce selection change
     */
    announceSelection(item, isSelected) {
        const message = isSelected ?
            `${item} selected` :
            `${item} deselected`;
        this.announce({
            message,
            priority: 'medium',
            liveRegion: 'polite'
        });
    }
    /**
     * Set ARIA attributes for screen reader optimization
     */
    setARIAAttributes(element, attributes) {
        try {
            Object.entries(attributes).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    element.setAttribute(key, String(value));
                }
                else {
                    element.removeAttribute(key);
                }
            });
        }
        catch (error) {
            console.error('Failed to set ARIA attributes:', error);
        }
    }
    /**
     * Optimize element for screen readers
     */
    optimizeForScreenReader(element, options = {}) {
        try {
            const attributes = {};
            if (options.label) {
                attributes['aria-label'] = options.label;
            }
            if (options.description) {
                attributes['aria-describedby'] = this.createDescription(options.description);
            }
            if (options.expanded !== undefined) {
                attributes['aria-expanded'] = options.expanded ? 'true' : 'false';
            }
            if (options.selected !== undefined) {
                attributes['aria-selected'] = options.selected ? 'true' : 'false';
            }
            if (options.disabled !== undefined) {
                attributes['aria-disabled'] = options.disabled;
            }
            this.setARIAAttributes(element, attributes);
            if (options.role) {
                element.setAttribute('role', options.role);
            }
        }
        catch (error) {
            console.error('Failed to optimize element for screen reader:', error);
        }
    }
    /**
     * Detect screen reader capabilities
     */
    detectAssistiveTechnology() {
        return {
            screenReader: this.hasScreenReader(),
            screenReaderName: this.getScreenReaderName(),
            voiceControl: this.hasVoiceControl(),
            switchNavigation: false, // Placeholder
            highContrastMode: this.hasHighContrast(),
            reducedMotion: this.hasReducedMotion(),
            touchSupport: this.hasTouchSupport(),
            keyboardOnly: this.isKeyboardOnly()
        };
    }
    /**
     * Get announcement queue status
     */
    getQueueStatus() {
        return {
            length: this.announcementQueue.length,
            processing: this.processingQueue,
            nextAnnouncement: this.announcementQueue.length > 0 ?
                this.announcementQueue[0].announcement : null
        };
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
    /**
     * Destroy screen reader manager and cleanup
     */
    destroy() {
        try {
            // Stop queue processor
            if (this.queueProcessor) {
                clearInterval(this.queueProcessor);
                this.queueProcessor = null;
            }
            // Clear queue
            this.announcementQueue = [];
            // Remove live regions
            this.liveRegions.forEach((region, id) => {
                if (region.parentNode) {
                    region.parentNode.removeChild(region);
                }
            });
            this.liveRegions.clear();
            // Clear event listeners
            this.eventListeners.clear();
            this.isInitialized = false;
        }
        catch (error) {
            console.error('Failed to destroy ScreenReaderManager:', error);
        }
    }
    // Private implementation methods
    initializeEventMaps() {
        const events = [
            'announcement-made', 'announcement-queued', 'announcement-cleared',
            'region-created', 'region-destroyed'
        ];
        events.forEach(event => {
            this.eventListeners.set(event, []);
        });
    }
    setupDefaultLiveRegions() {
        // Polite live region for general announcements
        this.createLiveRegion({
            id: 'aria-live-polite',
            politeness: 'polite',
            atomic: true,
            relevant: 'additions text',
            busy: false
        });
        // Assertive live region for urgent announcements
        this.createLiveRegion({
            id: 'aria-live-assertive',
            politeness: 'assertive',
            atomic: true,
            relevant: 'additions text',
            busy: false
        });
        // Status region for ongoing updates
        this.createLiveRegion({
            id: 'aria-live-status',
            politeness: 'polite',
            atomic: false,
            relevant: 'additions text',
            busy: false
        });
    }
    startQueueProcessor() {
        if (this.queueProcessor) {
            return;
        }
        // Process announcements every 500ms
        this.queueProcessor = window.setInterval(() => {
            if (!this.processingQueue && this.announcementQueue.length > 0) {
                this.processAnnouncementQueue();
            }
        }, 500);
    }
    processAnnouncementQueue() {
        if (this.processingQueue || this.announcementQueue.length === 0) {
            return;
        }
        this.processingQueue = true;
        try {
            const queueItem = this.announcementQueue.shift();
            if (queueItem) {
                this.makeAnnouncement(queueItem.announcement);
            }
        }
        catch (error) {
            console.error('Failed to process announcement queue:', error);
        }
        finally {
            this.processingQueue = false;
        }
    }
    makeAnnouncement(announcement) {
        try {
            const region = this.getLiveRegion(announcement.liveRegion);
            if (!region) {
                console.warn('Live region not found:', announcement.liveRegion);
                return;
            }
            // Clear previous if requested
            if (announcement.clearPrevious) {
                region.textContent = '';
                // Force reflow
                region.offsetHeight;
            }
            // Set the message
            if (announcement.delay && announcement.delay > 0) {
                setTimeout(() => {
                    region.textContent = announcement.message;
                    this.emit('announcement-made', announcement);
                }, announcement.delay);
            }
            else {
                region.textContent = announcement.message;
                this.emit('announcement-made', announcement);
            }
        }
        catch (error) {
            console.error('Failed to make announcement:', error);
        }
    }
    prioritizeQueue() {
        // Sort by priority: urgent > high > medium > low
        const priorityOrder = {
            urgent: 0,
            high: 1,
            medium: 2,
            low: 3
        };
        this.announcementQueue.sort((a, b) => {
            const aPriority = priorityOrder[a.announcement.priority];
            const bPriority = priorityOrder[b.announcement.priority];
            if (aPriority === bPriority) {
                // Same priority, sort by timestamp
                return a.timestamp - b.timestamp;
            }
            return aPriority - bPriority;
        });
    }
    generateAnnouncementId() {
        return `announcement-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    createDescription(description) {
        // Create hidden description element
        const id = `sr-description-${Date.now()}`;
        const element = document.createElement('span');
        element.id = id;
        element.textContent = description;
        element.style.cssText = `
      position: absolute !important;
      left: -10000px !important;
      top: -10000px !important;
      width: 1px !important;
      height: 1px !important;
      overflow: hidden !important;
    `;
        document.body.appendChild(element);
        return id;
    }
    // Detection methods
    hasScreenReader() {
        return !!(
        // Check for screen reader APIs
        window.speechSynthesis ||
            navigator.userAgent.includes('NVDA') ||
            navigator.userAgent.includes('JAWS') ||
            navigator.userAgent.includes('VoiceOver') ||
            // Check for accessibility APIs
            ('getComputedAccessibleNode' in Element.prototype) ||
            // Check for screen reader specific features
            document.documentElement.hasAttribute('data-whatinput') ||
            // Check for high contrast (often used with screen readers)
            window.matchMedia('(prefers-contrast: high)').matches);
    }
    getScreenReaderName() {
        if (navigator.userAgent.includes('NVDA'))
            return 'NVDA';
        if (navigator.userAgent.includes('JAWS'))
            return 'JAWS';
        if (navigator.userAgent.includes('VoiceOver'))
            return 'VoiceOver';
        return undefined;
    }
    hasVoiceControl() {
        return !!(window.speechSynthesis && 'webkitSpeechRecognition' in window);
    }
    hasHighContrast() {
        return window.matchMedia('(prefers-contrast: high)').matches;
    }
    hasReducedMotion() {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    hasTouchSupport() {
        return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    }
    isKeyboardOnly() {
        // This would be enhanced with actual detection logic
        return false;
    }
    emit(event, ...args) {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            listeners.forEach(listener => {
                try {
                    listener(...args);
                }
                catch (error) {
                    console.error(`Error in ScreenReaderManager ${event} listener:`, error);
                }
            });
        }
    }
}
//# sourceMappingURL=ScreenReaderManager.js.map