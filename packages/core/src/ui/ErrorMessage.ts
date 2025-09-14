/**
 * Error Message - User-friendly error display component
 * @description Professional error messaging with retry actions and contextual help
 */

import { ValidationError } from '../utils/validation';
import { AccessibilityManager } from './AccessibilityManager';
import { ScreenReaderManager } from './ScreenReaderManager';
import { FocusManager } from './FocusManager';
import { KeyboardHandler } from './KeyboardHandler';
import { LocalizationManager } from './LocalizationManager';
import { FontManager } from './FontManager';
import { RTLManager } from './RTLManager';
import { LocaleFormatter } from './LocaleFormatter';
import type { AccessibilityConfig, ScreenReaderAnnouncement, KeyboardNavigationConfig } from '../types/Accessibility';
import type { LocaleCode } from '../types/Internationalization';

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
export class ErrorMessage {
  private readonly container: HTMLElement;
  private readonly config: ErrorMessageConfig;
  
  private messageElement: HTMLElement | null = null;
  private iconElement: HTMLElement | null = null;
  private titleElement: HTMLElement | null = null;
  private descriptionElement: HTMLElement | null = null;
  private actionsElement: HTMLElement | null = null;
  private timestampElement: HTMLElement | null = null;
  private dismissButton: HTMLElement | null = null;
  
  private isVisible = false;
  private isInitialized = false;
  private currentError: Error | null = null;
  private autoHideTimeout: number | null = null;
  private eventListeners: Map<keyof ErrorMessageEvents, Function[]> = new Map();
  
  // Accessibility managers
  private accessibilityManager: AccessibilityManager | null = null;
  private screenReaderManager: ScreenReaderManager | null = null;
  private focusManager: FocusManager | null = null;
  private keyboardHandler: KeyboardHandler | null = null;
  
  // Internationalization managers
  private localizationManager: LocalizationManager | null = null;
  private fontManager: FontManager | null = null;
  private rtlManager: RTLManager | null = null;
  private localeFormatter: LocaleFormatter | null = null;

  constructor(container: HTMLElement, config: Partial<ErrorMessageConfig> = {}) {
    if (!container || !(container instanceof HTMLElement)) {
      throw new ValidationError('Container must be a valid HTMLElement');
    }

    this.container = container;
    this.config = {
      showIcon: true,
      animate: true,
      autoHideMs: 0,
      showTimestamp: false,
      dismissible: true,
      defaultSeverity: 'error',
      enableKeyboardNavigation: true,
      focusOnShow: true,
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
   * Initialize the error message component
   */
  public async init(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      this.createMessageStructure();
      this.injectCSS();
      await this.initializeAccessibility();
      this.isInitialized = true;
    } catch (error) {
      throw new ValidationError(`Failed to initialize ErrorMessage: ${error}`);
    }
  }

  /**
   * Show error message with optional retry action
   */
  public async show(error?: Error | string, retryAction?: () => void): Promise<void> {
    if (!this.isInitialized) {
      await this.init();
    }

    const errorObj = typeof error === 'string' ? new Error(error) : error || new Error('An unexpected error occurred');
    this.currentError = errorObj;

    this.updateContent(errorObj, retryAction);
    this.showMessage();
    this.announceError(errorObj);
    this.emit('show', errorObj);
  }

  /**
   * Show error with full configuration
   */
  public async showDetailed(
    error: Error | string,
    options: {
      severity?: ErrorSeverity;
      category?: ErrorCategory;
      retryActions?: RetryAction[];
      helpAction?: HelpAction;
      customTitle?: string;
    } = {}
  ): Promise<void> {
    if (!this.isInitialized) {
      await this.init();
    }

    const errorObj = typeof error === 'string' ? new Error(error) : error;
    this.currentError = errorObj;

    this.updateDetailedContent(errorObj, options);
    this.showMessage();
    this.announceError(errorObj, options.severity);
    this.emit('show', errorObj);
  }

  /**
   * Hide the error message
   */
  public hide(): void {
    if (!this.isVisible || !this.messageElement) {
      return;
    }

    this.clearAutoHide();

    if (this.config.animate) {
      this.messageElement.classList.add('us-error-message--hiding');
      setTimeout(() => {
        this.hideMessage();
      }, 200);
    } else {
      this.hideMessage();
    }
  }

  /**
   * Update error content without showing
   */
  public updateError(error: Error | string): void {
    const errorObj = typeof error === 'string' ? new Error(error) : error;
    this.currentError = errorObj;
    
    if (this.isVisible) {
      this.updateContent(errorObj);
    }
  }

  /**
   * Clear the current error
   */
  public clear(): void {
    this.currentError = null;
    this.hide();
  }

  /**
   * Get current error
   */
  public getCurrentError(): Error | null {
    return this.currentError;
  }

  /**
   * Check if error message is visible
   */
  public isShowing(): boolean {
    return this.isVisible;
  }

  /**
   * Add event listener
   */
  public on<K extends keyof ErrorMessageEvents>(
    event: K,
    handler: ErrorMessageEvents[K]
  ): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(handler);
  }

  /**
   * Remove event listener
   */
  public off<K extends keyof ErrorMessageEvents>(
    event: K,
    handler: ErrorMessageEvents[K]
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
   * Destroy the error message and cleanup resources
   */
  public destroy(): void {
    this.clearAutoHide();
    
    // Cleanup accessibility managers
    if (this.accessibilityManager) {
      this.accessibilityManager.destroy();
      this.accessibilityManager = null;
    }
    if (this.screenReaderManager) {
      this.screenReaderManager.destroy();
      this.screenReaderManager = null;
    }
    if (this.focusManager) {
      this.focusManager.destroy();
      this.focusManager = null;
    }
    if (this.keyboardHandler) {
      this.keyboardHandler.destroy();
      this.keyboardHandler = null;
    }
    
    if (this.messageElement && this.messageElement.parentNode) {
      this.messageElement.parentNode.removeChild(this.messageElement);
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
        politeRegionId: 'us-error-announcements',
        assertiveRegionId: 'us-error-announcements-urgent',
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
          enableEscapeHandling: true,
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
      console.error('Failed to initialize accessibility features for ErrorMessage:', error);
    }
  }

  /**
   * Apply accessibility attributes to error elements
   */
  private applyAccessibilityAttributes(): void {
    if (!this.messageElement || !this.accessibilityManager) return;

    // Apply ARIA attributes for error alert
    this.accessibilityManager.applyARIAAttributes(this.messageElement, {
      role: 'alert',
      'aria-live': 'assertive',
      'aria-atomic': 'true',
      'aria-relevant': 'additions text'
    });

    // Apply keyboard navigation if enabled
    if (this.config.enableKeyboardNavigation && this.keyboardHandler) {
      this.setupKeyboardNavigation();
    }
  }

  /**
   * Setup keyboard navigation for error actions
   */
  private setupKeyboardNavigation(): void {
    if (!this.messageElement || !this.keyboardHandler) return;

    this.keyboardHandler.registerElement(this.messageElement);

    // Handle Escape key to dismiss error
    if (this.config.dismissible) {
      this.keyboardHandler.addShortcut('Escape', {
        handler: () => this.handleDismiss(),
        description: 'Dismiss error message'
      });
    }
  }

  /**
   * Announce error to screen readers
   */
  private announceError(error: Error, severity?: ErrorSeverity): void {
    if (!this.screenReaderManager) return;

    const errorSeverity = severity || this.determineSeverity(error);
    const priority = errorSeverity === 'critical' ? 'assertive' : 'polite';
    const category = this.determineCategory(error);
    const title = this.getTitleForError(error, category);
    const description = this.getDescriptionForError(error);

    this.screenReaderManager.announce({
      message: `${title}: ${description}`,
      priority: priority as any,
      liveRegion: priority
    });
  }

  /**
   * Focus the error message when shown (if enabled)
   */
  private focusErrorMessage(): void {
    if (!this.config.focusOnShow || !this.messageElement || !this.focusManager) return;

    // Focus the first focusable element (dismiss button or first action)
    const focusableElement = this.dismissButton || 
                            this.actionsElement?.querySelector('button') ||
                            this.messageElement;

    if (focusableElement) {
      this.focusManager.focusElement(focusableElement as HTMLElement);
    }
  }

  private createMessageStructure(): void {
    // Main message container
    this.messageElement = document.createElement('div');
    this.messageElement.className = 'us-error-message';
    this.messageElement.setAttribute('role', 'alert');
    this.messageElement.setAttribute('aria-live', 'assertive');
    this.messageElement.style.display = 'none';

    // Header section
    const headerElement = document.createElement('div');
    headerElement.className = 'us-error-message__header';

    // Icon
    if (this.config.showIcon) {
      this.iconElement = document.createElement('div');
      this.iconElement.className = 'us-error-message__icon';
      this.iconElement.setAttribute('aria-hidden', 'true');
      headerElement.appendChild(this.iconElement);
    }

    // Title
    this.titleElement = document.createElement('div');
    this.titleElement.className = 'us-error-message__title';
    headerElement.appendChild(this.titleElement);

    // Dismiss button
    if (this.config.dismissible) {
      this.dismissButton = document.createElement('button');
      this.dismissButton.className = 'us-error-message__dismiss';
      this.dismissButton.setAttribute('type', 'button');
      this.dismissButton.setAttribute('aria-label', 'Dismiss error');
      this.dismissButton.innerHTML = '×';
      this.dismissButton.addEventListener('click', () => this.handleDismiss());
      headerElement.appendChild(this.dismissButton);
    }

    this.messageElement.appendChild(headerElement);

    // Description
    this.descriptionElement = document.createElement('div');
    this.descriptionElement.className = 'us-error-message__description';
    this.messageElement.appendChild(this.descriptionElement);

    // Actions container
    this.actionsElement = document.createElement('div');
    this.actionsElement.className = 'us-error-message__actions';
    this.messageElement.appendChild(this.actionsElement);

    // Timestamp
    if (this.config.showTimestamp) {
      this.timestampElement = document.createElement('div');
      this.timestampElement.className = 'us-error-message__timestamp';
      this.messageElement.appendChild(this.timestampElement);
    }

    // Append to container
    this.container.appendChild(this.messageElement);
  }

  private updateContent(error: Error, retryAction?: () => void): void {
    if (!this.messageElement) return;

    const severity = this.determineSeverity(error);
    const category = this.determineCategory(error);
    
    // Update severity class
    this.messageElement.className = `us-error-message us-error-message--${severity}`;

    // Update icon
    if (this.iconElement) {
      this.iconElement.textContent = this.getIconForSeverity(severity);
    }

    // Update title
    if (this.titleElement) {
      this.titleElement.textContent = this.getTitleForError(error, category);
    }

    // Update description
    if (this.descriptionElement) {
      this.descriptionElement.textContent = this.getDescriptionForError(error);
    }

    // Update actions
    this.updateActions(retryAction ? [{
      label: 'Try Again',
      handler: retryAction,
      type: 'primary'
    }] : []);

    // Update timestamp
    if (this.timestampElement) {
      this.timestampElement.textContent = new Date().toLocaleTimeString();
    }
  }

  private updateDetailedContent(
    error: Error,
    options: {
      severity?: ErrorSeverity;
      category?: ErrorCategory;
      retryActions?: RetryAction[];
      helpAction?: HelpAction;
      customTitle?: string;
    }
  ): void {
    if (!this.messageElement) return;

    const severity = options.severity || this.determineSeverity(error);
    const category = options.category || this.determineCategory(error);
    
    // Update severity class
    this.messageElement.className = `us-error-message us-error-message--${severity}`;

    // Update icon
    if (this.iconElement) {
      this.iconElement.textContent = this.getIconForSeverity(severity);
    }

    // Update title
    if (this.titleElement) {
      this.titleElement.textContent = options.customTitle || this.getTitleForError(error, category);
    }

    // Update description
    if (this.descriptionElement) {
      this.descriptionElement.textContent = this.getDescriptionForError(error);
    }

    // Update actions
    const actions = [...(options.retryActions || [])];
    if (options.helpAction) {
      actions.push({
        label: 'Get Help',
        handler: () => this.emit('help-request', options.helpAction!),
        type: 'secondary'
      });
    }
    this.updateActions(actions);

    // Update timestamp
    if (this.timestampElement) {
      this.timestampElement.textContent = new Date().toLocaleTimeString();
    }
  }

  private updateActions(actions: RetryAction[]): void {
    if (!this.actionsElement) return;

    // Clear existing actions
    this.actionsElement.innerHTML = '';

    if (actions.length === 0) {
      this.actionsElement.style.display = 'none';
      return;
    }

    this.actionsElement.style.display = 'block';

    actions.forEach(action => {
      const button = document.createElement('button');
      button.className = `us-error-message__action us-error-message__action--${action.type}`;
      button.textContent = action.label;
      button.disabled = action.loading || false;
      
      button.addEventListener('click', () => {
        this.emit('retry', action);
      });

      this.actionsElement!.appendChild(button);
    });
  }

  private showMessage(): void {
    if (!this.messageElement || this.isVisible) return;

    this.messageElement.style.display = 'block';
    this.isVisible = true;

    if (this.config.animate) {
      // Trigger reflow for animation
      this.messageElement.offsetHeight;
      this.messageElement.classList.add('us-error-message--visible');
    }

    // Focus the error message if enabled
    setTimeout(() => {
      this.focusErrorMessage();
    }, this.config.animate ? 250 : 0);

    // Setup auto-hide
    if (this.config.autoHideMs > 0) {
      this.autoHideTimeout = window.setTimeout(() => {
        this.hide();
      }, this.config.autoHideMs);
    }
  }

  private hideMessage(): void {
    if (!this.messageElement) return;

    this.messageElement.style.display = 'none';
    this.messageElement.classList.remove('us-error-message--visible', 'us-error-message--hiding');
    this.isVisible = false;
    this.emit('hide');
  }

  private handleDismiss(): void {
    this.emit('dismiss');
    this.hide();
  }

  private clearAutoHide(): void {
    if (this.autoHideTimeout) {
      clearTimeout(this.autoHideTimeout);
      this.autoHideTimeout = null;
    }
  }

  private determineSeverity(error: Error): ErrorSeverity {
    // Simple heuristics for determining severity
    const message = error.message.toLowerCase();
    
    if (message.includes('network') || message.includes('fetch')) {
      return 'warning';
    }
    
    if (message.includes('permission') || message.includes('unauthorized')) {
      return 'error';
    }
    
    if (message.includes('critical') || message.includes('fatal')) {
      return 'critical';
    }
    
    return this.config.defaultSeverity;
  }

  private determineCategory(error: Error): ErrorCategory {
    const message = error.message.toLowerCase();
    const name = error.name.toLowerCase();
    
    if (message.includes('network') || message.includes('fetch') || name.includes('network')) {
      return 'network';
    }
    
    if (message.includes('validation') || name.includes('validation')) {
      return 'validation';
    }
    
    if (message.includes('auth') || message.includes('unauthorized') || message.includes('forbidden')) {
      return 'authentication';
    }
    
    if (message.includes('permission') || message.includes('access')) {
      return 'permission';
    }
    
    return 'unknown';
  }

  private getIconForSeverity(severity: ErrorSeverity): string {
    const icons = {
      info: 'ℹ️',
      warning: '⚠️',
      error: '❌',
      critical: '🚨'
    };
    
    return icons[severity] || icons.error;
  }

  private getTitleForError(error: Error, category: ErrorCategory): string {
    const titles = {
      network: 'Connection Problem',
      validation: 'Invalid Input',
      authentication: 'Authentication Required',
      permission: 'Permission Denied',
      system: 'System Error',
      unknown: 'Something Went Wrong'
    };
    
    return titles[category] || titles.unknown;
  }

  private getDescriptionForError(error: Error): string {
    // Return a user-friendly version of the error message
    const message = error.message;
    
    // Common error message mappings
    const friendlyMessages: Record<string, string> = {
      'fetch failed': 'Unable to connect to the server. Please check your internet connection.',
      'network error': 'Network connection failed. Please try again.',
      'timeout': 'The request took too long to complete. Please try again.',
      'not found': 'The requested resource could not be found.',
      'unauthorized': 'You are not authorized to perform this action.',
      'forbidden': 'Access to this resource is forbidden.',
      'validation error': 'Please check your input and try again.'
    };
    
    // Check for known patterns
    for (const [pattern, friendlyMessage] of Object.entries(friendlyMessages)) {
      if (message.toLowerCase().includes(pattern)) {
        return friendlyMessage;
      }
    }
    
    // Return original message if no friendly version available
    return message || 'An unexpected error occurred. Please try again.';
  }

  private injectCSS(): void {
    const styleId = 'us-error-message-styles';
    if (document.getElementById(styleId)) {
      return;
    }

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .us-error-message {
        display: none;
        background: var(--us-error-bg, #fef2f2);
        border: 1px solid var(--us-error-border, #fecaca);
        border-radius: var(--us-border-radius, 6px);
        padding: 1rem;
        margin: 0.5rem 0;
        opacity: 0;
        transform: translateY(-8px);
        transition: opacity 200ms ease-out, transform 200ms ease-out;
      }

      .us-error-message--visible {
        opacity: 1;
        transform: translateY(0);
      }

      .us-error-message--hiding {
        opacity: 0;
        transform: translateY(-8px);
      }

      .us-error-message--info {
        background: var(--us-info-bg, #eff6ff);
        border-color: var(--us-info-border, #bfdbfe);
        color: var(--us-info-text, #1e40af);
      }

      .us-error-message--warning {
        background: var(--us-warning-bg, #fffbeb);
        border-color: var(--us-warning-border, #fed7aa);
        color: var(--us-warning-text, #d97706);
      }

      .us-error-message--error {
        background: var(--us-error-bg, #fef2f2);
        border-color: var(--us-error-border, #fecaca);
        color: var(--us-error-text, #dc2626);
      }

      .us-error-message--critical {
        background: var(--us-critical-bg, #450a0a);
        border-color: var(--us-critical-border, #dc2626);
        color: var(--us-critical-text, #fecaca);
      }

      .us-error-message__header {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        margin-bottom: 0.5rem;
      }

      .us-error-message__icon {
        font-size: 1.25rem;
        line-height: 1;
        flex-shrink: 0;
      }

      .us-error-message__title {
        font-weight: 600;
        font-size: 0.875rem;
        flex: 1;
      }

      .us-error-message__dismiss {
        background: none;
        border: none;
        font-size: 1.25rem;
        line-height: 1;
        padding: 0.25rem;
        cursor: pointer;
        color: inherit;
        opacity: 0.7;
        border-radius: var(--us-border-radius-sm, 4px);
        transition: opacity 150ms ease;
      }

      .us-error-message__dismiss:hover {
        opacity: 1;
        background: rgba(0, 0, 0, 0.1);
      }

      .us-error-message__description {
        font-size: 0.875rem;
        line-height: 1.5;
        margin-bottom: 1rem;
      }

      .us-error-message__actions {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
      }

      .us-error-message__action {
        padding: 0.5rem 1rem;
        border-radius: var(--us-border-radius-sm, 4px);
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 150ms ease;
        border: 1px solid transparent;
      }

      .us-error-message__action:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      .us-error-message__action--primary {
        background: var(--us-primary-color, #007bff);
        color: white;
        border-color: var(--us-primary-color, #007bff);
      }

      .us-error-message__action--primary:hover:not(:disabled) {
        background: var(--us-primary-color-dark, #0056b3);
        border-color: var(--us-primary-color-dark, #0056b3);
      }

      .us-error-message__action--secondary {
        background: transparent;
        color: inherit;
        border-color: currentColor;
      }

      .us-error-message__action--secondary:hover:not(:disabled) {
        background: rgba(0, 0, 0, 0.1);
      }

      .us-error-message__timestamp {
        font-size: 0.75rem;
        opacity: 0.7;
        margin-top: 0.5rem;
        font-family: monospace;
      }

      /* Accessibility */
      .us-error-message:focus-within {
        outline: 2px solid var(--us-focus-color, #007bff);
        outline-offset: 2px;
      }

      /* Reduced motion support */
      @media (prefers-reduced-motion: reduce) {
        .us-error-message {
          transition: none;
        }
      }
    `;

    document.head.appendChild(style);
  }

  private emit<K extends keyof ErrorMessageEvents>(
    event: K,
    ...args: Parameters<ErrorMessageEvents[K]>
  ): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          (listener as any)(...args);
        } catch (error) {
          console.error(`Error in ErrorMessage ${event} listener:`, error);
        }
      });
    }
  }

  private initializeEventMaps(): void {
    const events: (keyof ErrorMessageEvents)[] = [
      'retry',
      'help-request',
      'dismiss',
      'show',
      'hide'
    ];

    events.forEach(event => {
      this.eventListeners.set(event, []);
    });
  }
}