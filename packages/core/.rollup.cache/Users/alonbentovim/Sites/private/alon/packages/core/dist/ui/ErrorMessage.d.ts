/**
 * Error Message - User-friendly error display component
 * @description Professional error messaging with retry actions and contextual help
 */
import type { AccessibilityConfig } from '../types/Accessibility';
/**
 * Error severity levels
 */
export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical';
/**
 * Error category types
 */
export type ErrorCategory = 'network' | 'validation' | 'authentication' | 'permission' | 'system' | 'unknown';
/**
 * Retry action configuration
 */
export interface RetryAction {
    /** Action label */
    label: string;
    /** Action handler */
    handler: () => void;
    /** Action type */
    type: 'primary' | 'secondary';
    /** Loading state during action */
    loading?: boolean;
}
/**
 * Help action configuration
 */
export interface HelpAction {
    /** Help text or URL */
    content: string;
    /** Help type */
    type: 'text' | 'link';
    /** Link target for URLs */
    target?: '_blank' | '_self';
}
/**
 * Error message configuration
 */
export interface ErrorMessageConfig {
    /** Show error icon */
    showIcon: boolean;
    /** Enable animations */
    animate: boolean;
    /** Auto-hide timeout in milliseconds (0 = no auto-hide) */
    autoHideMs: number;
    /** Show timestamp */
    showTimestamp: boolean;
    /** Allow dismissal */
    dismissible: boolean;
    /** Default severity level */
    defaultSeverity: ErrorSeverity;
    /** Accessibility configuration */
    accessibility?: AccessibilityConfig;
    /** Enable keyboard navigation for actions */
    enableKeyboardNavigation?: boolean;
    /** Focus on error when shown */
    focusOnShow?: boolean;
}
/**
 * Error message events
 */
export interface ErrorMessageEvents {
    'retry': (action: RetryAction) => void;
    'help-request': (help: HelpAction) => void;
    'dismiss': () => void;
    'show': (error: Error) => void;
    'hide': () => void;
}
/**
 * Professional error message component with contextual help and retry actions
 */
export declare class ErrorMessage {
    private readonly container;
    private readonly config;
    private messageElement;
    private iconElement;
    private titleElement;
    private descriptionElement;
    private actionsElement;
    private timestampElement;
    private dismissButton;
    private isVisible;
    private isInitialized;
    private currentError;
    private autoHideTimeout;
    private eventListeners;
    private accessibilityManager;
    private screenReaderManager;
    private focusManager;
    private keyboardHandler;
    private localizationManager;
    private fontManager;
    private rtlManager;
    private localeFormatter;
    constructor(container: HTMLElement, config?: Partial<ErrorMessageConfig>);
    /**
     * Initialize the error message component
     */
    init(): Promise<void>;
    /**
     * Show error message with optional retry action
     */
    show(error?: Error | string, retryAction?: () => void): Promise<void>;
    /**
     * Show error with full configuration
     */
    showDetailed(error: Error | string, options?: {
        severity?: ErrorSeverity;
        category?: ErrorCategory;
        retryActions?: RetryAction[];
        helpAction?: HelpAction;
        customTitle?: string;
    }): Promise<void>;
    /**
     * Hide the error message
     */
    hide(): void;
    /**
     * Update error content without showing
     */
    updateError(error: Error | string): void;
    /**
     * Clear the current error
     */
    clear(): void;
    /**
     * Get current error
     */
    getCurrentError(): Error | null;
    /**
     * Check if error message is visible
     */
    isShowing(): boolean;
    /**
     * Add event listener
     */
    on<K extends keyof ErrorMessageEvents>(event: K, handler: ErrorMessageEvents[K]): void;
    /**
     * Remove event listener
     */
    off<K extends keyof ErrorMessageEvents>(event: K, handler: ErrorMessageEvents[K]): void;
    /**
     * Destroy the error message and cleanup resources
     */
    destroy(): void;
    /**
     * Initialize accessibility features
     */
    private initializeAccessibility;
    /**
     * Apply accessibility attributes to error elements
     */
    private applyAccessibilityAttributes;
    /**
     * Setup keyboard navigation for error actions
     */
    private setupKeyboardNavigation;
    /**
     * Announce error to screen readers
     */
    private announceError;
    /**
     * Focus the error message when shown (if enabled)
     */
    private focusErrorMessage;
    private createMessageStructure;
    private updateContent;
    private updateDetailedContent;
    private updateActions;
    private showMessage;
    private hideMessage;
    private handleDismiss;
    private clearAutoHide;
    private determineSeverity;
    private determineCategory;
    private getIconForSeverity;
    private getTitleForError;
    private getDescriptionForError;
    private injectCSS;
    private emit;
    private initializeEventMaps;
}
//# sourceMappingURL=ErrorMessage.d.ts.map