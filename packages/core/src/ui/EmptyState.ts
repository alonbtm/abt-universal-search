/**
 * Empty State - Helpful empty state UI component
 * @description Professional empty state with suggestions and contextual actions
 */

import { ValidationError } from '../utils/validation';
import { AccessibilityManager } from './AccessibilityManager';
import { ScreenReaderManager } from './ScreenReaderManager';
import { KeyboardHandler } from './KeyboardHandler';
import { FocusManager } from './FocusManager';
import type { AccessibilityConfig, ScreenReaderAnnouncement, KeyboardNavigationConfig } from '../types/Accessibility';

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
export class EmptyState {
  private readonly container: HTMLElement;
  private readonly config: EmptyStateConfig;
  
  private emptyStateElement: HTMLElement | null = null;
  private illustrationElement: HTMLElement | null = null;
  private messageElement: HTMLElement | null = null;
  private suggestionsElement: HTMLElement | null = null;
  private actionsElement: HTMLElement | null = null;
  
  private isVisible = false;
  private isInitialized = false;
  private currentSuggestions: EmptyStateSuggestion[] = [];
  private eventListeners: Map<keyof EmptyStateEvents, Function[]> = new Map();
  
  // Accessibility managers
  private accessibilityManager: AccessibilityManager | null = null;
  private screenReaderManager: ScreenReaderManager | null = null;
  private keyboardHandler: KeyboardHandler | null = null;
  private focusManager: FocusManager | null = null;

  constructor(container: HTMLElement, config: Partial<EmptyStateConfig> = {}) {
    if (!container || !(container instanceof HTMLElement)) {
      throw new ValidationError('Container must be a valid HTMLElement');
    }

    this.container = container;
    this.config = {
      showIllustration: true,
      animate: true,
      maxSuggestions: 5,
      illustration: 'search',
      interactiveSuggestions: true,
      enableKeyboardNavigation: true,
      announceChanges: true,
      accessibility: {
        wcagLevel: 'AA',
        enableKeyboardNavigation: true,
        enableScreenReaderSupport: true,
        enableFocusManagement: true,
        enableAutomatedValidation: false,
        debugMode: false
      },
      ...config
    };

    this.initializeEventMaps();
  }

  /**
   * Initialize the empty state component
   */
  public async init(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      this.createEmptyStateStructure();
      this.injectCSS();
      await this.initializeAccessibility();
      this.isInitialized = true;
    } catch (error) {
      throw new ValidationError(`Failed to initialize EmptyState: ${error}`);
    }
  }

  /**
   * Show empty state with message and suggestions
   */
  public async show(message?: string, suggestions?: string[] | EmptyStateSuggestion[]): Promise<void> {
    if (!this.isInitialized) {
      await this.init();
    }

    const displayMessage = message || 'No results found';
    this.updateContent(displayMessage, suggestions);
    this.showEmptyState();
    this.announceToScreenReader(displayMessage);
    this.emit('show', displayMessage);
  }

  /**
   * Show contextual empty state based on query type
   */
  public showContextual(
    query: string,
    options: {
      dataSource?: string;
      category?: string;
      customMessage?: string;
      customSuggestions?: EmptyStateSuggestion[];
    } = {}
  ): void {
    const message = this.generateContextualMessage(query, options);
    const suggestions = options.customSuggestions || this.generateContextualSuggestions(query, options);
    
    this.show(message, suggestions);
  }

  /**
   * Hide the empty state
   */
  public hide(): void {
    if (!this.isVisible || !this.emptyStateElement) {
      return;
    }

    if (this.config.animate) {
      this.emptyStateElement.classList.add('us-empty-state--hiding');
      setTimeout(() => {
        this.hideEmptyState();
      }, 200);
    } else {
      this.hideEmptyState();
    }
  }

  /**
   * Update suggestions without changing the message
   */
  public updateSuggestions(suggestions: string[] | EmptyStateSuggestion[]): void {
    this.currentSuggestions = this.normalizeSuggestions(suggestions);
    this.renderSuggestions();
  }

  /**
   * Add a new suggestion
   */
  public addSuggestion(suggestion: string | EmptyStateSuggestion): void {
    const normalized = [suggestion];
    const newSuggestions = this.normalizeSuggestions(normalized);
    
    this.currentSuggestions.push(...newSuggestions);
    if (this.currentSuggestions.length > this.config.maxSuggestions) {
      this.currentSuggestions = this.currentSuggestions.slice(0, this.config.maxSuggestions);
    }
    
    this.renderSuggestions();
  }

  /**
   * Clear all suggestions
   */
  public clearSuggestions(): void {
    this.currentSuggestions = [];
    this.renderSuggestions();
  }

  /**
   * Set custom illustration
   */
  public setIllustration(content: string, type: 'svg' | 'emoji' | 'text' = 'text'): void {
    if (!this.illustrationElement) return;

    this.illustrationElement.className = `us-empty-state__illustration us-empty-state__illustration--${type}`;
    
    if (type === 'svg') {
      this.illustrationElement.innerHTML = content;
    } else {
      this.illustrationElement.textContent = content;
    }
  }

  /**
   * Check if empty state is visible
   */
  public isShowing(): boolean {
    return this.isVisible;
  }

  /**
   * Add event listener
   */
  public on<K extends keyof EmptyStateEvents>(
    event: K,
    handler: EmptyStateEvents[K]
  ): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(handler);
  }

  /**
   * Remove event listener
   */
  public off<K extends keyof EmptyStateEvents>(
    event: K,
    handler: EmptyStateEvents[K]
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
   * Destroy the empty state and cleanup resources
   */
  public destroy(): void {
    // Cleanup accessibility managers
    if (this.accessibilityManager) {
      this.accessibilityManager.destroy();
      this.accessibilityManager = null;
    }
    if (this.screenReaderManager) {
      this.screenReaderManager.destroy();
      this.screenReaderManager = null;
    }
    if (this.keyboardHandler) {
      this.keyboardHandler.destroy();
      this.keyboardHandler = null;
    }
    if (this.focusManager) {
      this.focusManager.destroy();
      this.focusManager = null;
    }
    
    if (this.emptyStateElement && this.emptyStateElement.parentNode) {
      this.emptyStateElement.parentNode.removeChild(this.emptyStateElement);
    }

    this.eventListeners.clear();
    this.isInitialized = false;
  }

  // Private implementation methods

  /**
   * Initialize accessibility features
   */
  private async initializeAccessibility(): Promise<void> {
    try {
      if (!this.config.accessibility) return;

      // Initialize AccessibilityManager
      this.accessibilityManager = new AccessibilityManager(this.config.accessibility);
      await this.accessibilityManager.init();

      // Initialize ScreenReaderManager
      this.screenReaderManager = new ScreenReaderManager({
        politeRegionId: 'us-empty-announcements',
        assertiveRegionId: 'us-empty-announcements-urgent',
        enableLogging: this.config.accessibility.debugMode
      });
      await this.screenReaderManager.init();

      // Initialize FocusManager
      this.focusManager = new FocusManager({
        returnFocusOnEscape: true,
        trapFocus: false,
        preventScroll: false,
        debugMode: this.config.accessibility.debugMode
      });
      await this.focusManager.init();

      // Initialize KeyboardHandler if keyboard navigation is enabled
      if (this.config.enableKeyboardNavigation) {
        const keyboardConfig: KeyboardNavigationConfig = {
          enableArrowNavigation: true,
          enableTabNavigation: true,
          enableEnterActivation: true,
          enableEscapeHandling: false,
          enableHomeEndNavigation: true,
          trapFocus: false,
          enableTypeahead: false,
          typeaheadTimeout: 1000,
          debugMode: this.config.accessibility.debugMode
        };

        this.keyboardHandler = new KeyboardHandler(keyboardConfig);
        await this.keyboardHandler.init();
      }

      // Apply initial accessibility attributes
      this.applyAccessibilityAttributes();
    } catch (error) {
      console.error('Failed to initialize accessibility features for EmptyState:', error);
    }
  }

  /**
   * Apply accessibility attributes to empty state elements
   */
  private applyAccessibilityAttributes(): void {
    if (!this.emptyStateElement || !this.accessibilityManager) return;

    // Apply ARIA attributes for status region
    this.accessibilityManager.applyARIAAttributes(this.emptyStateElement, {
      role: 'status',
      'aria-live': 'polite',
      'aria-atomic': 'true',
      'aria-label': 'Search results status'
    });

    // Apply keyboard navigation if enabled
    if (this.config.enableKeyboardNavigation && this.keyboardHandler) {
      this.setupKeyboardNavigation();
    }
  }

  /**
   * Setup keyboard navigation for suggestions
   */
  private setupKeyboardNavigation(): void {
    if (!this.emptyStateElement || !this.keyboardHandler) return;

    this.keyboardHandler.registerElement(this.emptyStateElement, {
      role: 'status',
      navigationType: 'list',
      allowFocus: true
    });
  }

  /**
   * Announce message to screen readers
   */
  private announceToScreenReader(message: string): void {
    if (!this.screenReaderManager || !this.config.announceChanges) return;

    this.screenReaderManager.announce({
      message,
      priority: 'polite',
      interrupting: false,
      category: 'status'
    });
  }

  private createEmptyStateStructure(): void {
    // Main empty state container
    this.emptyStateElement = document.createElement('div');
    this.emptyStateElement.className = 'us-empty-state';
    this.emptyStateElement.setAttribute('role', 'status');
    this.emptyStateElement.setAttribute('aria-live', 'polite');
    this.emptyStateElement.style.display = 'none';

    // Illustration
    if (this.config.showIllustration) {
      this.illustrationElement = document.createElement('div');
      this.illustrationElement.className = 'us-empty-state__illustration';
      this.illustrationElement.setAttribute('aria-hidden', 'true');
      this.setDefaultIllustration();
      this.emptyStateElement.appendChild(this.illustrationElement);
    }

    // Message
    this.messageElement = document.createElement('div');
    this.messageElement.className = 'us-empty-state__message';
    this.emptyStateElement.appendChild(this.messageElement);

    // Suggestions
    this.suggestionsElement = document.createElement('div');
    this.suggestionsElement.className = 'us-empty-state__suggestions';
    this.emptyStateElement.appendChild(this.suggestionsElement);

    // Actions
    this.actionsElement = document.createElement('div');
    this.actionsElement.className = 'us-empty-state__actions';
    this.emptyStateElement.appendChild(this.actionsElement);

    // Append to container
    this.container.appendChild(this.emptyStateElement);
  }

  private updateContent(message: string, suggestions?: string[] | EmptyStateSuggestion[]): void {
    // Update message
    if (this.messageElement) {
      this.messageElement.textContent = message;
    }

    // Update suggestions
    if (suggestions) {
      this.currentSuggestions = this.normalizeSuggestions(suggestions);
      this.renderSuggestions();
    }
  }

  private normalizeSuggestions(suggestions: string[] | EmptyStateSuggestion[]): EmptyStateSuggestion[] {
    return suggestions.map(suggestion => {
      if (typeof suggestion === 'string') {
        return {
          text: suggestion,
          type: 'query',
          handler: () => this.emit('suggestion-select', suggestion)
        };
      }
      return suggestion;
    }).slice(0, this.config.maxSuggestions);
  }

  private renderSuggestions(): void {
    if (!this.suggestionsElement) return;

    // Clear existing suggestions
    this.suggestionsElement.innerHTML = '';

    if (this.currentSuggestions.length === 0) {
      this.suggestionsElement.style.display = 'none';
      return;
    }

    this.suggestionsElement.style.display = 'block';

    // Add suggestions header
    const header = document.createElement('div');
    header.className = 'us-empty-state__suggestions-header';
    header.textContent = 'Try searching for:';
    this.suggestionsElement.appendChild(header);

    // Add suggestions list
    const list = document.createElement('ul');
    list.className = 'us-empty-state__suggestions-list';
    list.setAttribute('role', 'list');

    this.currentSuggestions.forEach(suggestion => {
      const item = this.createSuggestionItem(suggestion);
      list.appendChild(item);
    });

    this.suggestionsElement.appendChild(list);
  }

  private createSuggestionItem(suggestion: EmptyStateSuggestion): HTMLElement {
    const item = document.createElement('li');
    item.className = 'us-empty-state__suggestion';
    item.setAttribute('role', 'listitem');

    if (this.config.interactiveSuggestions && suggestion.handler) {
      const button = document.createElement('button');
      button.className = 'us-empty-state__suggestion-button';
      button.setAttribute('type', 'button');
      
      if (suggestion.icon) {
        const icon = document.createElement('span');
        icon.className = 'us-empty-state__suggestion-icon';
        icon.textContent = suggestion.icon;
        icon.setAttribute('aria-hidden', 'true');
        button.appendChild(icon);
      }

      const text = document.createElement('span');
      text.className = 'us-empty-state__suggestion-text';
      text.textContent = suggestion.text;
      button.appendChild(text);

      button.addEventListener('click', () => {
        suggestion.handler?.();
      });

      item.appendChild(button);
    } else {
      if (suggestion.icon) {
        const icon = document.createElement('span');
        icon.className = 'us-empty-state__suggestion-icon';
        icon.textContent = suggestion.icon;
        icon.setAttribute('aria-hidden', 'true');
        item.appendChild(icon);
      }

      const text = document.createElement('span');
      text.className = 'us-empty-state__suggestion-text';
      text.textContent = suggestion.text;
      item.appendChild(text);
    }

    // Add type indicator
    item.setAttribute('data-type', suggestion.type);

    return item;
  }

  private generateContextualMessage(
    query: string,
    options: { dataSource?: string; category?: string; customMessage?: string }
  ): string {
    if (options.customMessage) {
      return options.customMessage;
    }

    if (!query.trim()) {
      return 'Start typing to search...';
    }

    const messages = [
      `No results found for "${query}"`,
      `We couldn't find anything matching "${query}"`,
      `No matches for "${query}" in ${options.dataSource || 'the selected data source'}`
    ];

    return messages[0]; // Use the first one for consistency
  }

  private generateContextualSuggestions(
    query: string,
    options: { dataSource?: string; category?: string }
  ): EmptyStateSuggestion[] {
    const suggestions: EmptyStateSuggestion[] = [];

    if (query.trim()) {
      // Query-based suggestions
      suggestions.push(
        {
          text: `Search for "${query}" in all categories`,
          type: 'action',
          icon: '🔍',
          handler: () => this.emit('action-click', 'search-all-categories')
        },
        {
          text: `"${query.split(' ')[0]}"`,
          type: 'query',
          icon: '📝',
          handler: () => this.emit('suggestion-select', query.split(' ')[0])
        }
      );

      // Add spelling suggestions for longer queries
      if (query.length > 3) {
        suggestions.push({
          text: 'Check your spelling',
          type: 'tip',
          icon: '✏️'
        });
      }
    }

    // Add generic helpful suggestions
    suggestions.push(
      {
        text: 'Try using fewer words',
        type: 'tip',
        icon: '💡'
      },
      {
        text: 'Use more general terms',
        type: 'tip',
        icon: '🎯'
      }
    );

    // Data source specific suggestions
    if (options.dataSource) {
      suggestions.push({
        text: `Browse ${options.dataSource}`,
        type: 'action',
        icon: '📂',
        handler: () => this.emit('action-click', `browse-${options.dataSource}`)
      });
    }

    return suggestions.slice(0, this.config.maxSuggestions);
  }

  private setDefaultIllustration(): void {
    if (!this.illustrationElement) return;

    const illustrations = {
      search: '🔍',
      empty: '📂',
      error: '❌',
      custom: this.config.customIllustration || '📋'
    };

    this.setIllustration(illustrations[this.config.illustration], 'emoji');
  }

  private showEmptyState(): void {
    if (!this.emptyStateElement || this.isVisible) return;

    this.emptyStateElement.style.display = 'block';
    this.isVisible = true;

    if (this.config.animate) {
      // Trigger reflow for animation
      this.emptyStateElement.offsetHeight;
      this.emptyStateElement.classList.add('us-empty-state--visible');
    }
  }

  private hideEmptyState(): void {
    if (!this.emptyStateElement) return;

    this.emptyStateElement.style.display = 'none';
    this.emptyStateElement.classList.remove('us-empty-state--visible', 'us-empty-state--hiding');
    this.isVisible = false;
    this.emit('hide');
  }

  private injectCSS(): void {
    const styleId = 'us-empty-state-styles';
    if (document.getElementById(styleId)) {
      return;
    }

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .us-empty-state {
        display: none;
        text-align: center;
        padding: 2rem 1rem;
        opacity: 0;
        transform: translateY(8px);
        transition: opacity 200ms ease-out, transform 200ms ease-out;
      }

      .us-empty-state--visible {
        opacity: 1;
        transform: translateY(0);
      }

      .us-empty-state--hiding {
        opacity: 0;
        transform: translateY(8px);
      }

      .us-empty-state__illustration {
        font-size: 3rem;
        margin-bottom: 1rem;
        opacity: 0.6;
      }

      .us-empty-state__illustration--emoji {
        line-height: 1;
      }

      .us-empty-state__illustration--svg {
        width: 64px;
        height: 64px;
        margin: 0 auto 1rem;
        fill: var(--us-text-color-muted, #6b7280);
      }

      .us-empty-state__message {
        font-size: 1rem;
        color: var(--us-text-color, #374151);
        margin-bottom: 1.5rem;
        font-weight: 500;
      }

      .us-empty-state__suggestions {
        margin-bottom: 1.5rem;
      }

      .us-empty-state__suggestions-header {
        font-size: 0.875rem;
        color: var(--us-text-color-muted, #6b7280);
        margin-bottom: 0.75rem;
        font-weight: 500;
      }

      .us-empty-state__suggestions-list {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        align-items: center;
      }

      .us-empty-state__suggestion {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .us-empty-state__suggestion[data-type="query"] {
        font-weight: 500;
      }

      .us-empty-state__suggestion[data-type="tip"] {
        font-style: italic;
        opacity: 0.8;
      }

      .us-empty-state__suggestion-button {
        background: none;
        border: 1px solid var(--us-border-color, #d1d5db);
        border-radius: var(--us-border-radius, 6px);
        padding: 0.5rem 0.75rem;
        font-size: 0.875rem;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        color: var(--us-text-color, #374151);
        transition: all 150ms ease;
        text-decoration: none;
      }

      .us-empty-state__suggestion-button:hover {
        background: var(--us-hover-bg, #f9fafb);
        border-color: var(--us-primary-color, #007bff);
        color: var(--us-primary-color, #007bff);
      }

      .us-empty-state__suggestion-button:focus {
        outline: 2px solid var(--us-focus-color, #007bff);
        outline-offset: 2px;
      }

      .us-empty-state__suggestion-icon {
        font-size: 1rem;
        line-height: 1;
      }

      .us-empty-state__suggestion-text {
        font-size: 0.875rem;
      }

      .us-empty-state__actions {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        align-items: center;
      }

      /* Responsive design */
      @media (max-width: 640px) {
        .us-empty-state {
          padding: 1.5rem 0.75rem;
        }

        .us-empty-state__illustration {
          font-size: 2.5rem;
        }

        .us-empty-state__suggestions-list {
          gap: 0.375rem;
        }

        .us-empty-state__suggestion-button {
          padding: 0.375rem 0.625rem;
          font-size: 0.8125rem;
        }
      }

      /* Reduced motion support */
      @media (prefers-reduced-motion: reduce) {
        .us-empty-state {
          transition: none;
        }
      }

      /* High contrast mode support */
      @media (prefers-contrast: high) {
        .us-empty-state__suggestion-button {
          border-width: 2px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  private emit<K extends keyof EmptyStateEvents>(
    event: K,
    ...args: Parameters<EmptyStateEvents[K]>
  ): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          (listener as any)(...args);
        } catch (error) {
          console.error(`Error in EmptyState ${event} listener:`, error);
        }
      });
    }
  }

  private initializeEventMaps(): void {
    const events: (keyof EmptyStateEvents)[] = [
      'suggestion-select',
      'action-click',
      'show',
      'hide'
    ];

    events.forEach(event => {
      this.eventListeners.set(event, []);
    });
  }
}