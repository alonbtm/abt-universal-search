/**
 * Text Direction Detector
 * Automatic text direction detection with manual override support
 */
import type { TextDirectionConfig, TextDirection, LocaleCode, DirectionDetectionResult, InternationalizationEvents } from '../types/Internationalization';
/**
 * Text direction detection with caching and multiple detection methods
 */
export declare class TextDirectionDetector {
    private config;
    private isInitialized;
    private detectionCache;
    private cacheCleanupInterval;
    private mutationObserver;
    private eventListeners;
    private stats;
    constructor(config?: Partial<TextDirectionConfig>);
    /**
     * Initialize text direction detector
     */
    init(): Promise<void>;
    /**
     * Destroy detector and cleanup resources
     */
    destroy(): void;
    /**
     * Detect text direction from various sources
     */
    detectDirection(text?: string, locale?: LocaleCode, element?: HTMLElement, forceRedetection?: boolean): DirectionDetectionResult;
    /**
     * Detect direction from element content
     */
    detectFromElement(element: HTMLElement): DirectionDetectionResult;
    /**
     * Detect direction from locale only
     */
    detectFromLocale(locale: LocaleCode): DirectionDetectionResult;
    /**
     * Detect direction from content only
     */
    detectFromContent(text: string): DirectionDetectionResult;
    /**
     * Set manual direction override on element
     */
    setManualOverride(element: HTMLElement, direction: TextDirection): void;
    /**
     * Remove manual direction override from element
     */
    removeManualOverride(element: HTMLElement): void;
    /**
     * Check if element has manual direction override
     */
    hasManualOverride(element: HTMLElement): boolean;
    /**
     * Auto-detect and apply direction to element
     */
    autoApplyDirection(element: HTMLElement): DirectionDetectionResult;
    /**
     * Detect direction for multiple elements
     */
    batchDetection(elements: HTMLElement[]): Map<HTMLElement, DirectionDetectionResult>;
    /**
     * Get detection statistics
     */
    getStats(): typeof this.stats;
    /**
     * Clear detection cache
     */
    clearCache(): void;
    /**
     * Get cache size
     */
    getCacheSize(): number;
    /**
     * Add event listener
     */
    on<K extends keyof InternationalizationEvents>(event: K, handler: InternationalizationEvents[K]): void;
    /**
     * Remove event listener
     */
    off<K extends keyof InternationalizationEvents>(event: K, handler: InternationalizationEvents[K]): void;
    private performDetection;
    private checkManualOverride;
    private extractTextContent;
    private extractLocaleFromElement;
    private createCacheKey;
    private getCachedResult;
    private cacheResult;
    private setupCacheCleanup;
    private setupDOMObserver;
    private processNewElement;
    private emit;
    private initializeEventMaps;
}
//# sourceMappingURL=TextDirectionDetector.d.ts.map