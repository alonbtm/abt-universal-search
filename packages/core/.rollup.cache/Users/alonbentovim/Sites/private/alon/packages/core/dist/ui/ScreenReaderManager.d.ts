/**
 * ScreenReaderManager - Comprehensive screen reader support
 * @description ARIA live regions, announcements, and screen reader optimizations
 */
import type { ScreenReaderAnnouncement, ARIALive, ARIAAttributes, AssistiveTechnologyDetection } from '../types/Accessibility';
/**
 * ARIA live region configuration
 */
interface LiveRegionConfig {
    id: string;
    politeness: ARIALive;
    atomic: boolean;
    relevant: string;
    busy: boolean;
}
/**
 * Screen reader manager events
 */
export interface ScreenReaderManagerEvents {
    'announcement-made': (announcement: ScreenReaderAnnouncement) => void;
    'announcement-queued': (announcement: ScreenReaderAnnouncement) => void;
    'announcement-cleared': (regionId: string) => void;
    'region-created': (config: LiveRegionConfig) => void;
    'region-destroyed': (regionId: string) => void;
}
/**
 * ScreenReaderManager - Comprehensive screen reader support
 */
export declare class ScreenReaderManager {
    private readonly eventListeners;
    private liveRegions;
    private announcementQueue;
    private isInitialized;
    private processingQueue;
    private queueProcessor;
    private assistiveTech;
    constructor();
    /**
     * Initialize screen reader manager
     */
    init(): Promise<void>;
    /**
     * Make announcement to screen readers
     */
    announce(announcement: ScreenReaderAnnouncement): void;
    /**
     * Make immediate announcement (bypasses queue)
     */
    announceImmediate(message: string, liveRegion?: ARIALive): void;
    /**
     * Clear all announcements from a live region
     */
    clearRegion(liveRegion: ARIALive): void;
    /**
     * Create custom live region
     */
    createLiveRegion(config: LiveRegionConfig): HTMLElement;
    /**
     * Destroy live region
     */
    destroyLiveRegion(regionId: string): boolean;
    /**
     * Get live region element
     */
    getLiveRegion(type: ARIALive | string): HTMLElement | null;
    /**
     * Announce search results count
     */
    announceResultsCount(count: number, query?: string): void;
    /**
     * Announce loading state
     */
    announceLoading(isLoading: boolean, message?: string): void;
    /**
     * Announce error state
     */
    announceError(error: string | Error, canRetry?: boolean): void;
    /**
     * Announce navigation change
     */
    announceNavigation(currentIndex: number, totalItems: number, itemLabel?: string): void;
    /**
     * Announce selection change
     */
    announceSelection(item: string, isSelected: boolean): void;
    /**
     * Set ARIA attributes for screen reader optimization
     */
    setARIAAttributes(element: HTMLElement, attributes: ARIAAttributes): void;
    /**
     * Optimize element for screen readers
     */
    optimizeForScreenReader(element: HTMLElement, options?: {
        label?: string;
        description?: string;
        role?: string;
        expanded?: boolean;
        selected?: boolean;
        disabled?: boolean;
    }): void;
    /**
     * Detect screen reader capabilities
     */
    detectAssistiveTechnology(): AssistiveTechnologyDetection;
    /**
     * Get announcement queue status
     */
    getQueueStatus(): {
        length: number;
        processing: boolean;
        nextAnnouncement: ScreenReaderAnnouncement | null;
    };
    /**
     * Add event listener
     */
    on<K extends keyof ScreenReaderManagerEvents>(event: K, handler: ScreenReaderManagerEvents[K]): void;
    /**
     * Remove event listener
     */
    off<K extends keyof ScreenReaderManagerEvents>(event: K, handler: ScreenReaderManagerEvents[K]): void;
    /**
     * Destroy screen reader manager and cleanup
     */
    destroy(): void;
    private initializeEventMaps;
    private setupDefaultLiveRegions;
    private startQueueProcessor;
    private processAnnouncementQueue;
    private makeAnnouncement;
    private prioritizeQueue;
    private generateAnnouncementId;
    private createDescription;
    private hasScreenReader;
    private getScreenReaderName;
    private hasVoiceControl;
    private hasHighContrast;
    private hasReducedMotion;
    private hasTouchSupport;
    private isKeyboardOnly;
    private emit;
}
export {};
//# sourceMappingURL=ScreenReaderManager.d.ts.map