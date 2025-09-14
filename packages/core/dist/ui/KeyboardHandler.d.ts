/**
 * KeyboardHandler - Comprehensive keyboard navigation management
 * @description Complete keyboard accessibility with arrow keys, Enter, Escape, Tab navigation and focus trapping
 */
import type { KeyboardNavigationConfig, NavigationDirection } from '../types/Accessibility';
/**
 * Keyboard shortcut definition
 */
export interface KeyboardShortcut {
    /** Key combination (e.g., 'Ctrl+Enter', 'Alt+F') */
    combination: string;
    /** Action to execute */
    action: (event: KeyboardEvent) => void;
    /** Description for documentation */
    description: string;
    /** Enabled state */
    enabled: boolean;
    /** Prevent default behavior */
    preventDefault: boolean;
}
/**
 * Focusable element information
 */
export interface FocusableElement {
    /** The element */
    element: HTMLElement;
    /** Tab index */
    tabIndex: number;
    /** Is visible and focusable */
    focusable: boolean;
    /** Element role */
    role?: string;
    /** ARIA label */
    label?: string;
}
/**
 * Navigation context for keyboard events
 */
export interface NavigationContext {
    /** Current focused element */
    currentElement: HTMLElement | null;
    /** Previous focused element */
    previousElement: HTMLElement | null;
    /** Next focusable element */
    nextElement: HTMLElement | null;
    /** Navigation direction */
    direction: NavigationDirection;
    /** Current index in focusable elements */
    currentIndex: number;
    /** Total focusable elements */
    totalElements: number;
}
/**
 * KeyboardHandler events
 */
export interface KeyboardHandlerEvents {
    'navigation': (context: NavigationContext) => void;
    'shortcut-executed': (shortcut: KeyboardShortcut, event: KeyboardEvent) => void;
    'focus-trapped': (container: HTMLElement) => void;
    'escape-pressed': (event: KeyboardEvent) => void;
    'enter-pressed': (event: KeyboardEvent, element: HTMLElement) => void;
}
/**
 * KeyboardHandler - Complete keyboard navigation system
 */
export declare class KeyboardHandler {
    private readonly config;
    private readonly eventListeners;
    private container;
    private shortcuts;
    private focusableElements;
    private currentFocusIndex;
    private isInitialized;
    private keydownListener;
    private keyupListener;
    private focusListener;
    constructor(container: HTMLElement, config?: Partial<KeyboardNavigationConfig>);
    /**
     * Initialize keyboard handler
     */
    init(): void;
    /**
     * Handle keyboard navigation
     */
    handleKeyboardNavigation(event: KeyboardEvent): boolean;
    /**
     * Navigate to specific direction
     */
    navigate(direction: NavigationDirection): boolean;
    /**
     * Add custom keyboard shortcut
     */
    addShortcut(shortcut: KeyboardShortcut): void;
    /**
     * Remove keyboard shortcut
     */
    removeShortcut(combination: string): boolean;
    /**
     * Get all keyboard shortcuts
     */
    getShortcuts(): KeyboardShortcut[];
    /**
     * Update focusable elements cache
     */
    updateFocusableElements(): void;
    /**
     * Get current navigation context
     */
    getNavigationContext(): NavigationContext;
    /**
     * Focus specific element
     */
    focusElement(element: HTMLElement): boolean;
    /**
     * Get first focusable element
     */
    getFirstFocusableElement(): HTMLElement | null;
    /**
     * Get last focusable element
     */
    getLastFocusableElement(): HTMLElement | null;
    /**
     * Check if focus is trapped
     */
    isFocusTrapped(): boolean;
    /**
     * Set focus trapping
     */
    setFocusTrapping(trap: boolean): void;
    /**
     * Add event listener
     */
    on<K extends keyof KeyboardHandlerEvents>(event: K, handler: KeyboardHandlerEvents[K]): void;
    /**
     * Remove event listener
     */
    off<K extends keyof KeyboardHandlerEvents>(event: K, handler: KeyboardHandlerEvents[K]): void;
    /**
     * Destroy keyboard handler and cleanup
     */
    destroy(): void;
    private initializeEventMaps;
    private setupEventListeners;
    private removeEventListeners;
    private setupDefaultShortcuts;
    private processKeyboardEvent;
    private handleNavigationKeys;
    private handleTabNavigation;
    private handleFocusChange;
    private findFocusableElements;
    private isElementFocusable;
    private findCurrentFocusIndex;
    private getNextIndex;
    private getPreviousIndex;
    private focusElementAtIndex;
    private navigatePage;
    private getShortcutKey;
    private updateNavigationContext;
    private emit;
}
//# sourceMappingURL=KeyboardHandler.d.ts.map