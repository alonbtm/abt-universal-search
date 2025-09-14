/**
 * Loading Spinner - Professional loading animation component
 * @description Configurable loading spinner with progress indication and timeout handling
 */
import type { AccessibilityConfig } from '../types/Accessibility';
import type { LocaleCode } from '../types/Internationalization';
/**
 * Loading spinner configuration
 */
export interface LoadingSpinnerConfig {
    /** Size of the spinner in pixels */
    size: number;
    /** Spinner animation duration in milliseconds */
    duration: number;
    /** Primary color for the spinner */
    color: string;
    /** Secondary color for the track */
    trackColor: string;
    /** Show progress indication */
    showProgress: boolean;
    /** Timeout duration in milliseconds */
    timeoutMs: number;
    /** Custom timeout message */
    timeoutMessage?: string;
    /** Accessibility configuration */
    accessibility?: AccessibilityConfig;
    /** Enable reduced motion for accessibility */
    respectReducedMotion?: boolean;
    /** Enable high contrast support */
    enableHighContrast?: boolean;
}
/**
 * Loading spinner events
 */
export interface LoadingSpinnerEvents {
    'timeout': (duration: number) => void;
    'start': () => void;
    'stop': () => void;
}
/**
 * Professional loading spinner component with progress indication
 */
export declare class LoadingSpinner {
    private readonly container;
    private readonly config;
    private spinnerElement;
    private messageElement;
    private progressElement;
    private isVisible;
    private isInitialized;
    private startTime;
    private timeoutId;
    private progressInterval;
    private eventListeners;
    private accessibilityManager;
    private screenReaderManager;
    private localizationManager;
    private fontManager;
    private rtlManager;
    constructor(container: HTMLElement, config?: Partial<LoadingSpinnerConfig>);
    /**
     * Initialize the loading spinner
     */
    init(): Promise<void>;
    /**
     * Start the loading spinner with optional message
     */
    start(message?: string): Promise<void>;
    /**
     * Stop the loading spinner
     */
    stop(): void;
    /**
     * Show the spinner without starting animations
     */
    show(): void;
    /**
     * Hide the spinner
     */
    hide(): void;
    /**
     * Update the loading message
     */
    updateMessage(message: string): void;
    /**
     * Set custom timeout duration
     */
    setTimeout(timeoutMs: number, message?: string): void;
    /**
     * Get elapsed time since start
     */
    getElapsedTime(): number;
    /**
     * Check if spinner is currently visible
     */
    isLoading(): boolean;
    /**
     * Add event listener
     */
    on<K extends keyof LoadingSpinnerEvents>(event: K, handler: LoadingSpinnerEvents[K]): void;
    /**
     * Remove event listener
     */
    off<K extends keyof LoadingSpinnerEvents>(event: K, handler: LoadingSpinnerEvents[K]): void;
    /**
     * Destroy the loading spinner and cleanup resources
     */
    destroy(): void;
    /**
     * Initialize accessibility features
     */
    private initializeAccessibility;
    /**
     * Apply accessibility attributes to spinner elements
     */
    private applyAccessibilityAttributes;
    /**
     * Announce message to screen readers
     */
    private announceToScreenReader;
    private createSpinnerStructure;
    private applyStyles;
    private injectCSS;
    private startTimeout;
    private clearTimeout;
    private startProgressUpdate;
    private clearProgressUpdate;
    private emit;
    private validateConfig;
    private initializeEventMaps;
    /**
     * Initialize internationalization features
     */
    private initializeInternationalization;
    /**
     * Apply initial internationalization settings
     */
    private applyInitialI18nSettings;
    /**
     * Process text for internationalization
     */
    private processTextForI18n;
    /**
     * Apply internationalization styling to text elements
     */
    private applyI18nStyling;
    /**
     * Get localized text
     */
    private getText;
    /**
     * Set locale for internationalization
     */
    setLocale(locale: LocaleCode): void;
}
//# sourceMappingURL=LoadingSpinner.d.ts.map