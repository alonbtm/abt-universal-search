/**
 * FocusManager - Advanced focus management with trapping and restoration
 * @description Comprehensive focus management system with clear visual indicators and focus state management
 */
import type { FocusManagementConfig, FocusStrategy } from '../types/Accessibility';
/**
 * Focus state information
 */
export interface FocusState {
    /** Currently focused element */
    current: HTMLElement | null;
    /** Previously focused element */
    previous: HTMLElement | null;
    /** Focus stack for restoration */
    stack: HTMLElement[];
    /** Is focus trapped */
    trapped: boolean;
    /** Trap container */
    trapContainer: HTMLElement | null;
}
/**
 * Focus trap configuration
 */
export interface FocusTrapConfig {
    /** Container element */
    container: HTMLElement;
    /** Initial focus element */
    initialFocus?: HTMLElement | string;
    /** Return focus element */
    returnFocus?: HTMLElement;
    /** Allow outside clicks */
    allowOutsideClick: boolean;
    /** Escape key closes trap */
    escapeDeactivates: boolean;
    /** Click outside deactivates */
    clickOutsideDeactivates: boolean;
}
/**
 * Focus manager events
 */
export interface FocusManagerEvents {
    'focus-changed': (current: HTMLElement, previous: HTMLElement | null) => void;
    'focus-trapped': (container: HTMLElement) => void;
    'focus-released': (container: HTMLElement) => void;
    'focus-restored': (element: HTMLElement) => void;
    'focus-lost': (lastElement: HTMLElement) => void;
}
/**
 * FocusManager - Advanced focus management system
 */
export declare class FocusManager {
    private readonly config;
    private readonly eventListeners;
    private focusState;
    private activeTrap;
    private isInitialized;
    private focusStyles;
    private keydownListener;
    private clickListener;
    private focusListener;
    constructor(config?: Partial<FocusManagementConfig>);
    /**
     * Initialize focus manager
     */
    init(): void;
    /**
     * Create focus trap
     */
    createTrap(config: FocusTrapConfig): void;
    /**
     * Release focus trap
     */
    releaseTrap(): void;
    /**
     * Focus specific element with strategy
     */
    focusElement(element: HTMLElement | string, strategy?: FocusStrategy): boolean;
    /**
     * Restore focus to previous element
     */
    restoreFocus(element?: HTMLElement): boolean;
    /**
     * Get currently focused element
     */
    getCurrentFocus(): HTMLElement | null;
    /**
     * Get previous focused element
     */
    getPreviousFocus(): HTMLElement | null;
    /**
     * Check if focus is trapped
     */
    isTrapped(): boolean;
    /**
     * Get focus trap container
     */
    getTrapContainer(): HTMLElement | null;
    /**
     * Find first focusable element in container
     */
    findFirstFocusable(container?: HTMLElement): HTMLElement | null;
    /**
     * Find last focusable element in container
     */
    findLastFocusable(container?: HTMLElement): HTMLElement | null;
    /**
     * Get all focusable elements in container
     */
    getFocusableElements(container?: HTMLElement): HTMLElement[];
    /**
     * Check if element is focusable
     */
    isElementFocusable(element: HTMLElement): boolean;
    /**
     * Set focus outline styles
     */
    setFocusOutline(color?: string, width?: string): void;
    /**
     * Add event listener
     */
    on<K extends keyof FocusManagerEvents>(event: K, handler: FocusManagerEvents[K]): void;
    /**
     * Remove event listener
     */
    off<K extends keyof FocusManagerEvents>(event: K, handler: FocusManagerEvents[K]): void;
    /**
     * Destroy focus manager and cleanup
     */
    destroy(): void;
    private initializeEventMaps;
    private setupFocusStyles;
    private updateFocusStyles;
    private setupEventListeners;
    private removeEventListeners;
    private setupTrapEventListeners;
    private removeTrapEventListeners;
    private handleFocusChange;
    private handleTrapKeydown;
    private handleTrapTab;
    private handleTrapClick;
    private setInitialFocus;
    private pushFocus;
    private popFocus;
    private updateFocusState;
    private emit;
}
//# sourceMappingURL=FocusManager.d.ts.map