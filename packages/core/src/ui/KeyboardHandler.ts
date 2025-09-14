/**
 * KeyboardHandler - Comprehensive keyboard navigation management
 * @description Complete keyboard accessibility with arrow keys, Enter, Escape, Tab navigation and focus trapping
 */

import type {
  KeyboardNavigationConfig,
  NavigationDirection,
  KeyboardEventType,
  AccessibilityEvents
} from '../types/Accessibility';

import { ValidationError } from '../utils/validation';

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
export class KeyboardHandler {
  private readonly config: KeyboardNavigationConfig;
  private readonly eventListeners: Map<keyof KeyboardHandlerEvents, Function[]>;
  
  private container: HTMLElement;
  private shortcuts: Map<string, KeyboardShortcut>;
  private focusableElements: FocusableElement[] = [];
  private currentFocusIndex = -1;
  private isInitialized = false;
  private keydownListener: ((event: KeyboardEvent) => void) | null = null;
  private keyupListener: ((event: KeyboardEvent) => void) | null = null;
  private focusListener: ((event: FocusEvent) => void) | null = null;

  constructor(container: HTMLElement, config: Partial<KeyboardNavigationConfig> = {}) {
    if (!container || !(container instanceof HTMLElement)) {
      throw new ValidationError('Container must be a valid HTMLElement');
    }

    this.container = container;
    this.config = {
      enableArrowKeys: true,
      enableEnterKey: true,
      enableEscapeKey: true,
      enableTabNavigation: true,
      enableHomeEndKeys: true,
      enablePageKeys: false,
      customShortcuts: new Map(),
      trapFocus: false,
      circularNavigation: true,
      ...config
    };

    this.shortcuts = new Map(this.config.customShortcuts);
    this.eventListeners = new Map();
    this.initializeEventMaps();
  }

  /**
   * Initialize keyboard handler
   */
  public init(): void {
    if (this.isInitialized) {
      return;
    }

    try {
      this.updateFocusableElements();
      this.setupEventListeners();
      this.setupDefaultShortcuts();
      
      this.isInitialized = true;
    } catch (error) {
      throw new ValidationError(`Failed to initialize KeyboardHandler: ${error}`);
    }
  }

  /**
   * Handle keyboard navigation
   */
  public handleKeyboardNavigation(event: KeyboardEvent): boolean {
    if (!this.isInitialized) {
      return false;
    }

    const handled = this.processKeyboardEvent(event);
    
    if (handled) {
      this.updateNavigationContext();
    }

    return handled;
  }

  /**
   * Navigate to specific direction
   */
  public navigate(direction: NavigationDirection): boolean {
    if (!this.isInitialized || this.focusableElements.length === 0) {
      return false;
    }

    let newIndex = this.currentFocusIndex;

    switch (direction) {
      case 'up':
        newIndex = this.getPreviousIndex();
        break;
      case 'down':
        newIndex = this.getNextIndex();
        break;
      case 'left':
        newIndex = this.config.circularNavigation ? this.getPreviousIndex() : Math.max(0, newIndex - 1);
        break;
      case 'right':
        newIndex = this.config.circularNavigation ? this.getNextIndex() : Math.min(this.focusableElements.length - 1, newIndex + 1);
        break;
      case 'first':
        newIndex = 0;
        break;
      case 'last':
        newIndex = this.focusableElements.length - 1;
        break;
    }

    return this.focusElementAtIndex(newIndex);
  }

  /**
   * Add custom keyboard shortcut
   */
  public addShortcut(shortcut: KeyboardShortcut): void {
    this.shortcuts.set(shortcut.combination, shortcut);
  }

  /**
   * Remove keyboard shortcut
   */
  public removeShortcut(combination: string): boolean {
    return this.shortcuts.delete(combination);
  }

  /**
   * Get all keyboard shortcuts
   */
  public getShortcuts(): KeyboardShortcut[] {
    return Array.from(this.shortcuts.values());
  }

  /**
   * Update focusable elements cache
   */
  public updateFocusableElements(): void {
    try {
      this.focusableElements = this.findFocusableElements();
      this.currentFocusIndex = this.findCurrentFocusIndex();
    } catch (error) {
      console.error('Failed to update focusable elements:', error);
      this.focusableElements = [];
      this.currentFocusIndex = -1;
    }
  }

  /**
   * Get current navigation context
   */
  public getNavigationContext(): NavigationContext {
    const currentElement = this.currentFocusIndex >= 0 ? 
      this.focusableElements[this.currentFocusIndex]?.element || null : null;
    
    const nextIndex = this.getNextIndex();
    const nextElement = nextIndex !== this.currentFocusIndex ? 
      this.focusableElements[nextIndex]?.element || null : null;

    return {
      currentElement,
      previousElement: null, // Would track previous in implementation
      nextElement,
      direction: 'down', // Would track last direction
      currentIndex: this.currentFocusIndex,
      totalElements: this.focusableElements.length
    };
  }

  /**
   * Focus specific element
   */
  public focusElement(element: HTMLElement): boolean {
    try {
      const index = this.focusableElements.findIndex(fe => fe.element === element);
      if (index >= 0) {
        return this.focusElementAtIndex(index);
      }
      
      // Try to focus directly if not in focusable list
      element.focus();
      return document.activeElement === element;
    } catch (error) {
      console.error('Failed to focus element:', error);
      return false;
    }
  }

  /**
   * Get first focusable element
   */
  public getFirstFocusableElement(): HTMLElement | null {
    return this.focusableElements.length > 0 ? this.focusableElements[0].element : null;
  }

  /**
   * Get last focusable element
   */
  public getLastFocusableElement(): HTMLElement | null {
    const lastIndex = this.focusableElements.length - 1;
    return lastIndex >= 0 ? this.focusableElements[lastIndex].element : null;
  }

  /**
   * Check if focus is trapped
   */
  public isFocusTrapped(): boolean {
    return this.config.trapFocus;
  }

  /**
   * Set focus trapping
   */
  public setFocusTrapping(trap: boolean): void {
    this.config.trapFocus = trap;
    
    if (trap) {
      this.emit('focus-trapped', this.container);
    }
  }

  /**
   * Add event listener
   */
  public on<K extends keyof KeyboardHandlerEvents>(
    event: K,
    handler: KeyboardHandlerEvents[K]
  ): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(handler);
  }

  /**
   * Remove event listener
   */
  public off<K extends keyof KeyboardHandlerEvents>(
    event: K,
    handler: KeyboardHandlerEvents[K]
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
   * Destroy keyboard handler and cleanup
   */
  public destroy(): void {
    try {
      this.removeEventListeners();
      this.eventListeners.clear();
      this.shortcuts.clear();
      this.focusableElements = [];
      this.isInitialized = false;
    } catch (error) {
      console.error('Failed to destroy KeyboardHandler:', error);
    }
  }

  // Private implementation methods

  private initializeEventMaps(): void {
    const events: (keyof KeyboardHandlerEvents)[] = [
      'navigation', 'shortcut-executed', 'focus-trapped', 'escape-pressed', 'enter-pressed'
    ];
    
    events.forEach(event => {
      this.eventListeners.set(event, []);
    });
  }

  private setupEventListeners(): void {
    // Keydown listener for navigation and shortcuts
    this.keydownListener = (event: KeyboardEvent) => {
      this.handleKeyboardNavigation(event);
    };

    // Focus listener to track focus changes
    this.focusListener = (event: FocusEvent) => {
      this.handleFocusChange(event);
    };

    document.addEventListener('keydown', this.keydownListener);
    this.container.addEventListener('focusin', this.focusListener);
  }

  private removeEventListeners(): void {
    if (this.keydownListener) {
      document.removeEventListener('keydown', this.keydownListener);
      this.keydownListener = null;
    }

    if (this.focusListener) {
      this.container.removeEventListener('focusin', this.focusListener);
      this.focusListener = null;
    }
  }

  private setupDefaultShortcuts(): void {
    // Add common accessibility shortcuts
    if (this.config.enableHomeEndKeys) {
      this.addShortcut({
        combination: 'Home',
        action: () => this.navigate('first'),
        description: 'Navigate to first element',
        enabled: true,
        preventDefault: true
      });

      this.addShortcut({
        combination: 'End',
        action: () => this.navigate('last'),
        description: 'Navigate to last element',
        enabled: true,
        preventDefault: true
      });
    }

    if (this.config.enablePageKeys) {
      this.addShortcut({
        combination: 'PageUp',
        action: () => this.navigatePage(-1),
        description: 'Navigate up one page',
        enabled: true,
        preventDefault: true
      });

      this.addShortcut({
        combination: 'PageDown',
        action: () => this.navigatePage(1),
        description: 'Navigate down one page',
        enabled: true,
        preventDefault: true
      });
    }
  }

  private processKeyboardEvent(event: KeyboardEvent): boolean {
    // Check for custom shortcuts first
    const shortcutKey = this.getShortcutKey(event);
    const shortcut = this.shortcuts.get(shortcutKey);
    
    if (shortcut && shortcut.enabled) {
      if (shortcut.preventDefault) {
        event.preventDefault();
      }
      shortcut.action(event);
      this.emit('shortcut-executed', shortcut, event);
      return true;
    }

    // Handle standard navigation keys
    return this.handleNavigationKeys(event);
  }

  private handleNavigationKeys(event: KeyboardEvent): boolean {
    const isInContainer = this.container.contains(event.target as Node);
    if (!isInContainer && this.config.trapFocus) {
      return false;
    }

    switch (event.key) {
      case 'ArrowUp':
        if (this.config.enableArrowKeys) {
          event.preventDefault();
          return this.navigate('up');
        }
        break;

      case 'ArrowDown':
        if (this.config.enableArrowKeys) {
          event.preventDefault();
          return this.navigate('down');
        }
        break;

      case 'ArrowLeft':
        if (this.config.enableArrowKeys) {
          event.preventDefault();
          return this.navigate('left');
        }
        break;

      case 'ArrowRight':
        if (this.config.enableArrowKeys) {
          event.preventDefault();
          return this.navigate('right');
        }
        break;

      case 'Enter':
        if (this.config.enableEnterKey) {
          const activeElement = document.activeElement as HTMLElement;
          if (activeElement && this.container.contains(activeElement)) {
            this.emit('enter-pressed', event, activeElement);
            return true;
          }
        }
        break;

      case 'Escape':
        if (this.config.enableEscapeKey) {
          this.emit('escape-pressed', event);
          return true;
        }
        break;

      case 'Tab':
        if (this.config.enableTabNavigation) {
          return this.handleTabNavigation(event);
        }
        break;
    }

    return false;
  }

  private handleTabNavigation(event: KeyboardEvent): boolean {
    if (!this.config.trapFocus) {
      return false;
    }

    const isShiftTab = event.shiftKey;
    const activeElement = document.activeElement as HTMLElement;
    
    // Check if we're at the boundaries
    if (isShiftTab && activeElement === this.getFirstFocusableElement()) {
      event.preventDefault();
      this.focusElement(this.getLastFocusableElement()!);
      return true;
    }

    if (!isShiftTab && activeElement === this.getLastFocusableElement()) {
      event.preventDefault();
      this.focusElement(this.getFirstFocusableElement()!);
      return true;
    }

    return false;
  }

  private handleFocusChange(event: FocusEvent): void {
    this.updateFocusableElements();
    
    if (this.config.trapFocus) {
      const target = event.target as HTMLElement;
      if (target && !this.container.contains(target)) {
        // Focus moved outside container, trap it back
        const firstFocusable = this.getFirstFocusableElement();
        if (firstFocusable) {
          firstFocusable.focus();
        }
      }
    }
  }

  private findFocusableElements(): FocusableElement[] {
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
      '[role="tab"]'
    ].join(', ');

    const elements = this.container.querySelectorAll(selector);
    const focusableElements: FocusableElement[] = [];

    elements.forEach((element) => {
      const htmlElement = element as HTMLElement;
      
      if (this.isElementFocusable(htmlElement)) {
        focusableElements.push({
          element: htmlElement,
          tabIndex: htmlElement.tabIndex,
          focusable: true,
          role: htmlElement.getAttribute('role') || undefined,
          label: htmlElement.getAttribute('aria-label') || 
                 htmlElement.getAttribute('aria-labelledby') || 
                 htmlElement.textContent?.trim() || undefined
        });
      }
    });

    // Sort by tab order
    return focusableElements.sort((a, b) => {
      if (a.tabIndex === b.tabIndex) {
        return 0;
      }
      if (a.tabIndex === 0) return 1;
      if (b.tabIndex === 0) return -1;
      return a.tabIndex - b.tabIndex;
    });
  }

  private isElementFocusable(element: HTMLElement): boolean {
    // Check if element is visible
    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden') {
      return false;
    }

    // Check if element has area (not zero dimensions)
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      return false;
    }

    // Check if element is disabled or aria-hidden
    if (element.hasAttribute('disabled') || element.getAttribute('aria-hidden') === 'true') {
      return false;
    }

    return true;
  }

  private findCurrentFocusIndex(): number {
    const activeElement = document.activeElement as HTMLElement;
    if (!activeElement) {
      return -1;
    }

    return this.focusableElements.findIndex(fe => fe.element === activeElement);
  }

  private getNextIndex(): number {
    if (this.focusableElements.length === 0) {
      return -1;
    }

    const nextIndex = this.currentFocusIndex + 1;
    
    if (nextIndex >= this.focusableElements.length) {
      return this.config.circularNavigation ? 0 : this.focusableElements.length - 1;
    }

    return nextIndex;
  }

  private getPreviousIndex(): number {
    if (this.focusableElements.length === 0) {
      return -1;
    }

    const prevIndex = this.currentFocusIndex - 1;
    
    if (prevIndex < 0) {
      return this.config.circularNavigation ? this.focusableElements.length - 1 : 0;
    }

    return prevIndex;
  }

  private focusElementAtIndex(index: number): boolean {
    if (index < 0 || index >= this.focusableElements.length) {
      return false;
    }

    try {
      const focusableElement = this.focusableElements[index];
      focusableElement.element.focus();
      
      if (document.activeElement === focusableElement.element) {
        this.currentFocusIndex = index;
        return true;
      }
    } catch (error) {
      console.error('Failed to focus element at index:', index, error);
    }

    return false;
  }

  private navigatePage(direction: number): void {
    const pageSize = Math.max(1, Math.floor(this.focusableElements.length / 10));
    const newIndex = Math.max(0, Math.min(
      this.focusableElements.length - 1,
      this.currentFocusIndex + (direction * pageSize)
    ));
    
    this.focusElementAtIndex(newIndex);
  }

  private getShortcutKey(event: KeyboardEvent): string {
    const parts: string[] = [];
    
    if (event.ctrlKey) parts.push('Ctrl');
    if (event.altKey) parts.push('Alt');
    if (event.shiftKey) parts.push('Shift');
    if (event.metaKey) parts.push('Meta');
    
    parts.push(event.key);
    
    return parts.join('+');
  }

  private updateNavigationContext(): void {
    const context = this.getNavigationContext();
    this.emit('navigation', context);
  }

  private emit<K extends keyof KeyboardHandlerEvents>(
    event: K,
    ...args: Parameters<KeyboardHandlerEvents[K]>
  ): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          (listener as any)(...args);
        } catch (error) {
          console.error(`Error in KeyboardHandler ${event} listener:`, error);
        }
      });
    }
  }
}