/**
 * Search Dropdown UI - Production-ready search dropdown interface
 * @description Professional, responsive search dropdown with accessibility and animations
 */
import type { SearchResult } from '../types/Results';
import type { UIConfig } from '../types/Config';
import type { LocaleCode } from '../types/Internationalization';
/**
 * Search dropdown UI events
 */
export interface SearchDropdownUIEvents {
    'result-select': (result: SearchResult) => void;
    'retry-action': () => void;
    'suggestion-select': (suggestion: string) => void;
    'dropdown-open': () => void;
    'dropdown-close': () => void;
}
/**
 * Dropdown positioning configuration
 */
export interface DropdownPosition {
    /** Preferred position relative to input */
    position: 'bottom' | 'top' | 'auto';
    /** Maximum height in pixels */
    maxHeight: number;
    /** Minimum width in pixels */
    minWidth: number;
    /** Offset from input in pixels */
    offset: number;
}
/**
 * Animation configuration
 */
export interface AnimationConfig {
    /** Enable animations */
    enabled: boolean;
    /** Animation duration in milliseconds */
    duration: number;
    /** Animation easing function */
    easing: 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'cubic-bezier';
    /** Hardware acceleration */
    useTransform: boolean;
}
/**
 * Enhanced search dropdown UI component with professional styling and animations
 */
export declare class SearchDropdownUI {
    private readonly container;
    private readonly config;
    private readonly positionConfig;
    private readonly animationConfig;
    private dropdownElement;
    private contentElement;
    private resultsList;
    private loadingSpinner;
    private errorMessage;
    private emptyState;
    private accessibilityManager;
    private keyboardHandler;
    private focusManager;
    private screenReaderManager;
    private rtlManager;
    private textDirectionDetector;
    private localizationManager;
    private unicodeHandler;
    private localeFormatter;
    private fontManager;
    private results;
    private selectedIndex;
    private isVisible;
    private isInitialized;
    private state;
    private eventListeners;
    private resizeObserver;
    private animationFrame;
    constructor(container: HTMLElement, config: UIConfig, positionConfig?: Partial<DropdownPosition>, animationConfig?: Partial<AnimationConfig>);
    /**
     * Initialize the search dropdown UI
     */
    init(): Promise<void>;
    /**
     * Show search results in the dropdown
     */
    showResults(results: SearchResult[]): void;
    /**
     * Show loading state
     */
    showLoading(message?: string): void;
    /**
     * Show error state
     */
    showError(error: Error, retryAction?: () => void): void;
    /**
     * Show empty state
     */
    showEmpty(message?: string, suggestions?: string[]): void;
    /**
     * Hide the dropdown
     */
    hide(): void;
    /**
     * Handle keyboard navigation
     */
    handleKeyboardNavigation(event: KeyboardEvent): boolean;
    /**
     * Update dropdown position and size
     */
    updatePosition(): void;
    /**
     * Add event listener
     */
    on<K extends keyof SearchDropdownUIEvents>(event: K, handler: SearchDropdownUIEvents[K]): void;
    /**
     * Remove event listener
     */
    off<K extends keyof SearchDropdownUIEvents>(event: K, handler: SearchDropdownUIEvents[K]): void;
    /**
     * Destroy the dropdown and cleanup resources
     */
    destroy(): void;
    private createDropdownStructure;
    private setupEventListeners;
    private setupResizeObserver;
    private updateContent;
    private renderResults;
    private createResultItem;
    private navigateResults;
    private setSelectedIndex;
    private updateResultSelection;
    private scrollToSelected;
    private selectResult;
    private show;
    private animateIn;
    private animateOut;
    private applyTheme;
    private emit;
    private validateConfig;
    private initializeEventMaps;
    /**
     * Initialize accessibility features
     */
    private initializeAccessibility;
    /**
     * Set up accessibility event listeners
     */
    private setupAccessibilityEventListeners;
    /**
     * Apply initial ARIA attributes
     */
    private applyInitialARIAAttributes;
    /**
     * Initialize internationalization features
     */
    private initializeInternationalization;
    /**
     * Set up internationalization event listeners
     */
    private setupI18nEventListeners;
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
     * Set locale for internationalization
     */
    setLocale(locale: LocaleCode): void;
    /**
     * Get localized text
     */
    getText(key: string, context?: any): string;
    /**
     * Format date according to current locale
     */
    formatDate(date: Date | number | string): string;
    /**
     * Format number according to current locale
     */
    formatNumber(value: number): string;
}
//# sourceMappingURL=SearchDropdownUI.d.ts.map