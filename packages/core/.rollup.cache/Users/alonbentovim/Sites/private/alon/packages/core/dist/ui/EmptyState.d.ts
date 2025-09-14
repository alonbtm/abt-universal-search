/**
 * Empty State - Helpful empty state UI component
 * @description Professional empty state with suggestions and contextual actions
 */
import type { AccessibilityConfig } from '../types/Accessibility';
/**
 * Empty state suggestion
 */
export interface EmptyStateSuggestion {
    /** Suggestion text */
    text: string;
    /** Suggestion type */
    type: 'query' | 'action' | 'tip';
    /** Action handler for clickable suggestions */
    handler?: () => void;
    /** Icon for the suggestion */
    icon?: string;
}
/**
 * Empty state configuration
 */
export interface EmptyStateConfig {
    /** Show illustration */
    showIllustration: boolean;
    /** Enable animations */
    animate: boolean;
    /** Maximum number of suggestions to show */
    maxSuggestions: number;
    /** Default illustration type */
    illustration: 'search' | 'empty' | 'error' | 'custom';
    /** Custom illustration content */
    customIllustration?: string;
    /** Enable suggestion interaction */
    interactiveSuggestions: boolean;
    /** Accessibility configuration */
    accessibility?: AccessibilityConfig;
    /** Enable keyboard navigation for suggestions */
    enableKeyboardNavigation?: boolean;
    /** Announce content changes to screen readers */
    announceChanges?: boolean;
}
/**
 * Empty state events
 */
export interface EmptyStateEvents {
    'suggestion-select': (suggestion: string) => void;
    'action-click': (action: string) => void;
    'show': (message: string) => void;
    'hide': () => void;
}
/**
 * Professional empty state component with suggestions and contextual help
 */
export declare class EmptyState {
    private readonly container;
    private readonly config;
    private emptyStateElement;
    private illustrationElement;
    private messageElement;
    private suggestionsElement;
    private actionsElement;
    private isVisible;
    private isInitialized;
    private currentSuggestions;
    private eventListeners;
    private accessibilityManager;
    private screenReaderManager;
    private keyboardHandler;
    private focusManager;
    constructor(container: HTMLElement, config?: Partial<EmptyStateConfig>);
    /**
     * Initialize the empty state component
     */
    init(): Promise<void>;
    /**
     * Show empty state with message and suggestions
     */
    show(message?: string, suggestions?: string[] | EmptyStateSuggestion[]): Promise<void>;
    /**
     * Show contextual empty state based on query type
     */
    showContextual(query: string, options?: {
        dataSource?: string;
        category?: string;
        customMessage?: string;
        customSuggestions?: EmptyStateSuggestion[];
    }): void;
    /**
     * Hide the empty state
     */
    hide(): void;
    /**
     * Update suggestions without changing the message
     */
    updateSuggestions(suggestions: string[] | EmptyStateSuggestion[]): void;
    /**
     * Add a new suggestion
     */
    addSuggestion(suggestion: string | EmptyStateSuggestion): void;
    /**
     * Clear all suggestions
     */
    clearSuggestions(): void;
    /**
     * Set custom illustration
     */
    setIllustration(content: string, type?: 'svg' | 'emoji' | 'text'): void;
    /**
     * Check if empty state is visible
     */
    isShowing(): boolean;
    /**
     * Add event listener
     */
    on<K extends keyof EmptyStateEvents>(event: K, handler: EmptyStateEvents[K]): void;
    /**
     * Remove event listener
     */
    off<K extends keyof EmptyStateEvents>(event: K, handler: EmptyStateEvents[K]): void;
    /**
     * Destroy the empty state and cleanup resources
     */
    destroy(): void;
    /**
     * Initialize accessibility features
     */
    private initializeAccessibility;
    /**
     * Apply accessibility attributes to empty state elements
     */
    private applyAccessibilityAttributes;
    /**
     * Setup keyboard navigation for suggestions
     */
    private setupKeyboardNavigation;
    /**
     * Announce message to screen readers
     */
    private announceToScreenReader;
    private createEmptyStateStructure;
    private updateContent;
    private normalizeSuggestions;
    private renderSuggestions;
    private createSuggestionItem;
    private generateContextualMessage;
    private generateContextualSuggestions;
    private setDefaultIllustration;
    private showEmptyState;
    private hideEmptyState;
    private injectCSS;
    private emit;
    private initializeEventMaps;
}
//# sourceMappingURL=EmptyState.d.ts.map