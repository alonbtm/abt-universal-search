/**
 * FocusManager - Advanced focus management with trapping and restoration
 * @description Comprehensive focus management system with clear visual indicators and focus state management
 */

import type {
  FocusManagementConfig,
  FocusStrategy,
  AccessibilityEvents
} from '../types/Accessibility';

import { ValidationError } from '../utils/validation';

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
export class FocusManager {
  private readonly config: FocusManagementConfig;
  private readonly eventListeners: Map<keyof FocusManagerEvents, Function[]>;
  
  private focusState: FocusState;
  private activeTrap: FocusTrapConfig | null = null;
  private isInitialized = false;
  private focusStyles: HTMLStyleElement | null = null;
  private keydownListener: ((event: KeyboardEvent) => void) | null = null;
  private clickListener: ((event: MouseEvent) => void) | null = null;
  private focusListener: ((event: FocusEvent) => void) | null = null;

  constructor(config: Partial<FocusManagementConfig> = {}) {
    this.config = {
      trapFocus: false,
      restoreStrategy: 'restore',
      showFocusIndicators: true,
      focusOutlineColor: '#007bff',
      focusOutlineWidth: '2px',
      skipInvisible: true,
      ...config
    };

    this.focusState = {
      current: null,
      previous: null,
      stack: [],
      trapped: false,
      trapContainer: null
    };

    this.eventListeners = new Map();
    this.initializeEventMaps();
  }

  /**
   * Initialize focus manager
   */
  public init(): void {
    if (this.isInitialized) {
      return;
    }

    try {
      this.setupFocusStyles();
      this.setupEventListeners();
      this.updateFocusState();
      
      this.isInitialized = true;
    } catch (error) {
      throw new ValidationError(`Failed to initialize FocusManager: ${error}`);
    }
  }

  /**
   * Create focus trap
   */
  public createTrap(config: FocusTrapConfig): void {
    if (!this.isInitialized) {
      this.init();
    }

    try {
      // Save current focus for restoration
      const currentActive = document.activeElement as HTMLElement;
      if (currentActive) {
        this.pushFocus(currentActive);
      }

      // Deactivate existing trap
      if (this.activeTrap) {
        this.releaseTrap();
      }

      // Set up new trap
      this.activeTrap = { ...config };
      this.focusState.trapped = true;
      this.focusState.trapContainer = config.container;

      // Set initial focus
      this.setInitialFocus(config);
      
      // Add trap event listeners
      this.setupTrapEventListeners();
      
      this.emit('focus-trapped', config.container);
    } catch (error) {
      console.error('Failed to create focus trap:', error);
    }
  }

  /**
   * Release focus trap
   */
  public releaseTrap(): void {
    if (!this.activeTrap) {
      return;
    }

    try {
      const container = this.activeTrap.container;
      const returnFocus = this.activeTrap.returnFocus;
      
      // Remove trap event listeners
      this.removeTrapEventListeners();
      
      // Restore focus
      if (returnFocus) {
        this.restoreFocus(returnFocus);
      } else {
        const lastFocus = this.popFocus();
        if (lastFocus) {
          this.restoreFocus(lastFocus);
        }
      }

      // Clear trap state
      this.activeTrap = null;
      this.focusState.trapped = false;
      this.focusState.trapContainer = null;
      
      this.emit('focus-released', container);
    } catch (error) {
      console.error('Failed to release focus trap:', error);
    }
  }

  /**
   * Focus specific element with strategy
   */
  public focusElement(element: HTMLElement | string, strategy: FocusStrategy = 'restore'): boolean {
    try {
      const targetElement = typeof element === 'string' ? 
        document.querySelector(element) as HTMLElement : element;

      if (!targetElement) {
        console.warn('Focus target element not found:', element);
        return false;
      }

      // Check if element is focusable
      if (!this.isElementFocusable(targetElement)) {
        console.warn('Element is not focusable:', targetElement);
        return false;
      }

      // Save current focus based on strategy
      const currentFocus = document.activeElement as HTMLElement;
      if (currentFocus && strategy === 'restore') {
        this.pushFocus(currentFocus);
      }

      // Focus the element
      targetElement.focus();
      
      // Verify focus was successful
      if (document.activeElement === targetElement) {
        this.updateFocusState();
        return true;
      }

      return false;
    } catch (error) {
      console.error('Failed to focus element:', error);
      return false;
    }
  }

  /**
   * Restore focus to previous element
   */
  public restoreFocus(element?: HTMLElement): boolean {
    try {
      let targetElement: HTMLElement | null = null;

      if (element) {
        targetElement = element;
      } else {
        targetElement = this.popFocus();
      }

      if (targetElement && this.isElementFocusable(targetElement)) {
        targetElement.focus();
        
        if (document.activeElement === targetElement) {
          this.updateFocusState();
          this.emit('focus-restored', targetElement);
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('Failed to restore focus:', error);
      return false;
    }
  }

  /**
   * Get currently focused element
   */
  public getCurrentFocus(): HTMLElement | null {
    return this.focusState.current;
  }

  /**
   * Get previous focused element
   */
  public getPreviousFocus(): HTMLElement | null {
    return this.focusState.previous;
  }

  /**
   * Check if focus is trapped
   */
  public isTrapped(): boolean {
    return this.focusState.trapped;
  }

  /**
   * Get focus trap container
   */
  public getTrapContainer(): HTMLElement | null {
    return this.focusState.trapContainer;
  }

  /**
   * Find first focusable element in container
   */
  public findFirstFocusable(container: HTMLElement = document.body): HTMLElement | null {
    const focusableElements = this.getFocusableElements(container);
    return focusableElements.length > 0 ? focusableElements[0] : null;
  }

  /**
   * Find last focusable element in container
   */
  public findLastFocusable(container: HTMLElement = document.body): HTMLElement | null {
    const focusableElements = this.getFocusableElements(container);
    return focusableElements.length > 0 ? focusableElements[focusableElements.length - 1] : null;
  }

  /**
   * Get all focusable elements in container
   */
  public getFocusableElements(container: HTMLElement = document.body): HTMLElement[] {
    const selector = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
      '[role="button"]:not([disabled])',
      '[role="link"]',
      '[role="menuitem"]',
      '[role="option"]',
      '[role="tab"]',
      'audio[controls]',
      'video[controls]',
      'iframe',
      'object',
      'embed'
    ].join(', ');

    const elements = Array.from(container.querySelectorAll(selector)) as HTMLElement[];
    
    return elements.filter(element => {
      return this.isElementFocusable(element);
    }).sort((a, b) => {
      // Sort by tabindex
      const aTabIndex = a.tabIndex || 0;
      const bTabIndex = b.tabIndex || 0;
      
      if (aTabIndex === bTabIndex) return 0;
      if (aTabIndex === 0) return 1;
      if (bTabIndex === 0) return -1;
      
      return aTabIndex - bTabIndex;
    });
  }

  /**
   * Check if element is focusable
   */
  public isElementFocusable(element: HTMLElement): boolean {
    if (!element) return false;

    // Check if element is disabled
    if (element.hasAttribute('disabled') || element.getAttribute('aria-disabled') === 'true') {
      return false;
    }

    // Check if element is hidden
    if (element.getAttribute('aria-hidden') === 'true') {
      return false;
    }

    // Check visibility if configured
    if (this.config.skipInvisible) {
      const style = window.getComputedStyle(element);
      if (style.display === 'none' || 
          style.visibility === 'hidden' || 
          style.opacity === '0') {
        return false;
      }

      // Check if element has dimensions
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) {
        return false;
      }
    }

    // Check tabindex
    const tabIndex = element.tabIndex;
    if (tabIndex < 0) {
      return false;
    }

    return true;
  }

  /**
   * Set focus outline styles
   */
  public setFocusOutline(color?: string, width?: string): void {
    this.config.focusOutlineColor = color || this.config.focusOutlineColor;
    this.config.focusOutlineWidth = width || this.config.focusOutlineWidth;
    
    this.updateFocusStyles();
  }

  /**
   * Add event listener
   */
  public on<K extends keyof FocusManagerEvents>(
    event: K,
    handler: FocusManagerEvents[K]
  ): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(handler);
  }

  /**
   * Remove event listener
   */
  public off<K extends keyof FocusManagerEvents>(
    event: K,
    handler: FocusManagerEvents[K]
  ): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(handler);
      if (index >= 0) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Destroy focus manager and cleanup
   */
  public destroy(): void {
    try {
      // Release any active trap
      if (this.activeTrap) {
        this.releaseTrap();
      }

      // Remove event listeners
      this.removeEventListeners();

      // Remove focus styles
      if (this.focusStyles && this.focusStyles.parentNode) {
        this.focusStyles.parentNode.removeChild(this.focusStyles);
        this.focusStyles = null;
      }

      // Clear state
      this.eventListeners.clear();
      this.focusState = {
        current: null,
        previous: null,
        stack: [],
        trapped: false,
        trapContainer: null
      };

      this.isInitialized = false;
    } catch (error) {
      console.error('Failed to destroy FocusManager:', error);
    }
  }

  // Private implementation methods

  private initializeEventMaps(): void {
    const events: (keyof FocusManagerEvents)[] = [
      'focus-changed', 'focus-trapped', 'focus-released', 'focus-restored', 'focus-lost'
    ];
    
    events.forEach(event => {
      this.eventListeners.set(event, []);
    });
  }

  private setupFocusStyles(): void {
    if (!this.config.showFocusIndicators) {
      return;
    }

    this.focusStyles = document.createElement('style');
    this.focusStyles.id = 'focus-manager-styles';
    this.updateFocusStyles();
    document.head.appendChild(this.focusStyles);
  }

  private updateFocusStyles(): void {
    if (!this.focusStyles) return;

    const styles = `
      /* Enhanced focus indicators */
      *:focus {
        outline: ${this.config.focusOutlineWidth} solid ${this.config.focusOutlineColor} !important;
        outline-offset: 2px !important;
        box-shadow: 0 0 0 ${this.config.focusOutlineWidth} ${this.config.focusOutlineColor}40 !important;
        z-index: 1000 !important;
        position: relative !important;
      }

      /* Focus for dark backgrounds */
      [data-theme="dark"] *:focus {
        outline-color: #4dabf7 !important;
        box-shadow: 0 0 0 ${this.config.focusOutlineWidth} #4dabf740 !important;
      }

      /* High contrast focus */
      @media (prefers-contrast: high) {
        *:focus {
          outline-width: 3px !important;
          outline-color: HighlightText !important;
          background-color: Highlight !important;
          color: HighlightText !important;
        }
      }

      /* Reduced motion focus */
      @media (prefers-reduced-motion: reduce) {
        *:focus {
          transition: none !important;
        }
      }

      /* Focus trap container styling */
      .focus-trap-container {
        position: relative;
      }

      .focus-trap-container::before {
        content: '';
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(0, 0, 0, 0.5);
        z-index: 999;
        pointer-events: none;
      }
    `;

    this.focusStyles.textContent = styles;
  }

  private setupEventListeners(): void {
    // Global focus tracking
    this.focusListener = (event: FocusEvent) => {
      this.handleFocusChange(event);
    };

    document.addEventListener('focusin', this.focusListener);
  }

  private removeEventListeners(): void {
    if (this.focusListener) {
      document.removeEventListener('focusin', this.focusListener);
      this.focusListener = null;
    }

    this.removeTrapEventListeners();
  }

  private setupTrapEventListeners(): void {
    if (!this.activeTrap) return;

    // Keydown for escape and tab trapping
    this.keydownListener = (event: KeyboardEvent) => {
      this.handleTrapKeydown(event);
    };

    // Click outside to close
    this.clickListener = (event: MouseEvent) => {
      this.handleTrapClick(event);
    };

    document.addEventListener('keydown', this.keydownListener);
    document.addEventListener('mousedown', this.clickListener);
  }

  private removeTrapEventListeners(): void {
    if (this.keydownListener) {
      document.removeEventListener('keydown', this.keydownListener);
      this.keydownListener = null;
    }

    if (this.clickListener) {
      document.removeEventListener('mousedown', this.clickListener);
      this.clickListener = null;
    }
  }

  private handleFocusChange(event: FocusEvent): void {
    const newFocus = event.target as HTMLElement;
    const previousFocus = this.focusState.current;

    // Update focus state
    this.focusState.previous = previousFocus;
    this.focusState.current = newFocus;

    this.emit('focus-changed', newFocus, previousFocus);
  }

  private handleTrapKeydown(event: KeyboardEvent): void {
    if (!this.activeTrap) return;

    const { container, escapeDeactivates } = this.activeTrap;

    // Handle escape key
    if (event.key === 'Escape' && escapeDeactivates) {
      event.preventDefault();
      this.releaseTrap();
      return;
    }

    // Handle tab key for focus trapping
    if (event.key === 'Tab') {
      this.handleTrapTab(event);
    }
  }

  private handleTrapTab(event: KeyboardEvent): void {
    if (!this.activeTrap) return;

    const { container } = this.activeTrap;
    const focusableElements = this.getFocusableElements(container);
    
    if (focusableElements.length === 0) {
      event.preventDefault();
      return;
    }

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    const currentFocus = document.activeElement as HTMLElement;

    if (event.shiftKey) {
      // Shift + Tab (backward)
      if (currentFocus === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab (forward)
      if (currentFocus === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  }

  private handleTrapClick(event: MouseEvent): void {
    if (!this.activeTrap) return;

    const { container, clickOutsideDeactivates } = this.activeTrap;
    const target = event.target as HTMLElement;

    // Check if click was outside the trap container
    if (!container.contains(target) && clickOutsideDeactivates) {
      this.releaseTrap();
    }
  }

  private setInitialFocus(config: FocusTrapConfig): void {
    let initialElement: HTMLElement | null = null;

    // Try configured initial focus
    if (config.initialFocus) {
      if (typeof config.initialFocus === 'string') {
        initialElement = config.container.querySelector(config.initialFocus);
      } else {
        initialElement = config.initialFocus;
      }
    }

    // Fall back to first focusable element
    if (!initialElement) {
      initialElement = this.findFirstFocusable(config.container);
    }

    // Focus the initial element
    if (initialElement && this.isElementFocusable(initialElement)) {
      initialElement.focus();
    }
  }

  private pushFocus(element: HTMLElement): void {
    // Add element to focus stack if not already present
    const index = this.focusState.stack.indexOf(element);
    if (index >= 0) {
      this.focusState.stack.splice(index, 1);
    }
    this.focusState.stack.push(element);

    // Limit stack size to prevent memory leaks
    if (this.focusState.stack.length > 10) {
      this.focusState.stack.shift();
    }
  }

  private popFocus(): HTMLElement | null {
    return this.focusState.stack.pop() || null;
  }

  private updateFocusState(): void {
    const activeElement = document.activeElement as HTMLElement;
    if (activeElement && activeElement !== this.focusState.current) {
      this.focusState.previous = this.focusState.current;
      this.focusState.current = activeElement;
    }
  }

  private emit<K extends keyof FocusManagerEvents>(
    event: K,
    ...args: Parameters<FocusManagerEvents[K]>
  ): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          (listener as any)(...args);
        } catch (error) {
          console.error(`Error in FocusManager ${event} listener:`, error);
        }
      });
    }
  }
}