/**
 * RTL Manager
 * Comprehensive right-to-left layout support with mirrored positioning
 */
import type { RTLConfig, TextDirection, LocaleCode, RTLDetectionResult, RTLPosition, InternationalizationEvents } from '../types/Internationalization';
/**
 * RTL layout management with automatic detection and mirrored positioning
 */
export declare class RTLManager {
    private config;
    private currentDirection;
    private isInitialized;
    private observers;
    private mutationObserver;
    private styleSheet;
    private eventListeners;
    constructor(config?: Partial<RTLConfig>);
    /**
     * Initialize RTL manager
     */
    init(): Promise<void>;
    /**
     * Destroy RTL manager and cleanup resources
     */
    destroy(): void;
    /**
     * Detect RTL from various sources
     */
    detectRTL(content?: string, locale?: LocaleCode, element?: HTMLElement): RTLDetectionResult;
    /**
     * Set text direction
     */
    setDirection(direction: TextDirection): void;
    /**
     * Get current text direction
     */
    getDirection(): TextDirection;
    /**
     * Check if current direction is RTL
     */
    isRTL(): boolean;
    /**
     * Apply RTL layout to element
     */
    applyRTLLayout(element: HTMLElement, forceDirection?: TextDirection): void;
    /**
     * Remove RTL layout from element
     */
    removeRTLLayout(element: HTMLElement): void;
    /**
     * Get RTL-aware positioning for dropdown/popup
     */
    getDropdownPosition(trigger: HTMLElement, dropdown: HTMLElement, preferredSide?: 'start' | 'end'): RTLPosition;
    /**
     * Mirror scroll position for RTL
     */
    mirrorScrollPosition(element: HTMLElement): void;
    /**
     * Get mirrored scroll position
     */
    getMirroredScrollLeft(element: HTMLElement): number;
    /**
     * Apply RTL-aware transforms
     */
    applyRTLTransform(element: HTMLElement, transform: string): void;
    /**
     * Get directional CSS properties
     */
    getDirectionalCSS(): Record<string, string>;
    /**
     * Add event listener
     */
    on<K extends keyof InternationalizationEvents>(event: K, handler: InternationalizationEvents[K]): void;
    /**
     * Remove event listener
     */
    off<K extends keyof InternationalizationEvents>(event: K, handler: InternationalizationEvents[K]): void;
    private detectInitialDirection;
    private applyGlobalDirection;
    private updateAllElements;
    private setupMutationObserver;
    private applyLogicalProperties;
    private mirrorAnimations;
    private mirrorTransformKeyframe;
    private injectRTLStyles;
    private generateRTLCSS;
    private emit;
    private initializeEventMaps;
}
//# sourceMappingURL=RTLManager.d.ts.map