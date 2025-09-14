/**
 * Loading Spinner - Professional loading animation component
 * @description Configurable loading spinner with progress indication and timeout handling
 */
import { ValidationError } from '../utils/validation';
import { AccessibilityManager } from './AccessibilityManager';
import { ScreenReaderManager } from './ScreenReaderManager';
import { LocalizationManager } from './LocalizationManager';
import { FontManager } from './FontManager';
import { RTLManager } from './RTLManager';
/**
 * Professional loading spinner component with progress indication
 */
export class LoadingSpinner {
    constructor(container, config = {}) {
        this.spinnerElement = null;
        this.messageElement = null;
        this.progressElement = null;
        this.isVisible = false;
        this.isInitialized = false;
        this.startTime = 0;
        this.timeoutId = null;
        this.progressInterval = null;
        this.eventListeners = new Map();
        // Accessibility managers
        this.accessibilityManager = null;
        this.screenReaderManager = null;
        // Internationalization managers
        this.localizationManager = null;
        this.fontManager = null;
        this.rtlManager = null;
        if (!container || !(container instanceof HTMLElement)) {
            throw new ValidationError('Container must be a valid HTMLElement');
        }
        this.container = container;
        this.config = {
            size: 32,
            duration: 1000,
            color: 'var(--us-primary-color, #007bff)',
            trackColor: 'var(--us-border-color, #e0e0e0)',
            showProgress: true,
            timeoutMs: 10000,
            timeoutMessage: 'Request is taking longer than expected...',
            respectReducedMotion: true,
            enableHighContrast: true,
            accessibility: {
                wcagLevel: 'AA',
                enableKeyboardNavigation: false,
                enableScreenReaderSupport: true,
                enableFocusManagement: false,
                enableAutomatedValidation: false,
                enableVoiceControl: false,
                enableHighContrastMode: true,
                respectReducedMotion: true,
                debugMode: false
            },
            ...config
        };
        this.validateConfig();
        this.initializeEventMaps();
    }
    /**
     * Initialize the loading spinner
     */
    async init() {
        if (this.isInitialized) {
            return;
        }
        try {
            this.createSpinnerStructure();
            await this.initializeAccessibility();
            await this.initializeInternationalization();
            this.isInitialized = true;
        }
        catch (error) {
            throw new ValidationError(`Failed to initialize LoadingSpinner: ${error}`);
        }
    }
    /**
     * Start the loading spinner with optional message
     */
    async start(message = 'Loading...') {
        if (!this.isInitialized) {
            await this.init();
        }
        this.startTime = Date.now();
        this.updateMessage(message);
        this.show();
        this.startTimeout();
        this.startProgressUpdate();
        this.announceToScreenReader({
            message: `Loading started: ${message}`,
            priority: 'polite',
            liveRegion: 'polite'
        });
        this.emit('start');
    }
    /**
     * Stop the loading spinner
     */
    stop() {
        this.hide();
        this.clearTimeout();
        this.clearProgressUpdate();
        this.announceToScreenReader({
            message: 'Loading completed',
            priority: 'polite',
            liveRegion: 'polite'
        });
        this.emit('stop');
    }
    /**
     * Show the spinner without starting animations
     */
    show() {
        if (!this.spinnerElement || this.isVisible) {
            return;
        }
        this.spinnerElement.style.display = 'flex';
        this.isVisible = true;
        // Trigger reflow for smooth animation
        this.spinnerElement.offsetHeight;
        this.spinnerElement.classList.add('us-loading-spinner--visible');
    }
    /**
     * Hide the spinner
     */
    hide() {
        if (!this.spinnerElement || !this.isVisible) {
            return;
        }
        this.spinnerElement.classList.remove('us-loading-spinner--visible');
        setTimeout(() => {
            if (this.spinnerElement) {
                this.spinnerElement.style.display = 'none';
            }
            this.isVisible = false;
        }, 200); // Match CSS transition duration
    }
    /**
     * Update the loading message
     */
    updateMessage(message) {
        if (!this.messageElement)
            return;
        // Apply internationalization to the message
        const localizedMessage = this.getText(message);
        const processedMessage = this.processTextForI18n(localizedMessage);
        this.messageElement.textContent = processedMessage;
        // Apply i18n styling
        this.applyI18nStyling(this.messageElement, processedMessage);
        this.announceToScreenReader({
            message: processedMessage,
            priority: 'polite',
            liveRegion: 'polite'
        });
    }
    /**
     * Set custom timeout duration
     */
    setTimeout(timeoutMs, message) {
        this.config.timeoutMs = timeoutMs;
        if (message) {
            this.config.timeoutMessage = message;
        }
    }
    /**
     * Get elapsed time since start
     */
    getElapsedTime() {
        return this.startTime > 0 ? Date.now() - this.startTime : 0;
    }
    /**
     * Check if spinner is currently visible
     */
    isLoading() {
        return this.isVisible;
    }
    /**
     * Add event listener
     */
    on(event, handler) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(handler);
    }
    /**
     * Remove event listener
     */
    off(event, handler) {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            const index = listeners.indexOf(handler);
            if (index >= 0) {
                listeners.splice(index, 1);
            }
        }
    }
    /**
     * Destroy the loading spinner and cleanup resources
     */
    destroy() {
        this.stop();
        // Cleanup accessibility managers
        if (this.accessibilityManager) {
            this.accessibilityManager.destroy();
            this.accessibilityManager = null;
        }
        if (this.screenReaderManager) {
            this.screenReaderManager.destroy();
            this.screenReaderManager = null;
        }
        if (this.spinnerElement && this.spinnerElement.parentNode) {
            this.spinnerElement.parentNode.removeChild(this.spinnerElement);
        }
        this.eventListeners.clear();
        this.isInitialized = false;
    }
    // Private implementation methods
    /**
     * Initialize accessibility features
     */
    async initializeAccessibility() {
        try {
            if (!this.config.accessibility)
                return;
            // Initialize AccessibilityManager
            this.accessibilityManager = new AccessibilityManager(this.config.accessibility);
            await this.accessibilityManager.init();
            // Initialize ScreenReaderManager
            this.screenReaderManager = new ScreenReaderManager();
            await this.screenReaderManager.init();
            // Apply initial accessibility attributes
            this.applyAccessibilityAttributes();
        }
        catch (error) {
            console.error('Failed to initialize accessibility features for LoadingSpinner:', error);
        }
    }
    /**
     * Apply accessibility attributes to spinner elements
     */
    applyAccessibilityAttributes() {
        if (!this.spinnerElement || !this.accessibilityManager)
            return;
        // Apply ARIA attributes for loading state
        this.accessibilityManager.applyARIAAttributes(this.spinnerElement, {
            role: 'status',
            'aria-live': 'polite',
            'aria-busy': true,
            'aria-label': 'Loading content, please wait'
        });
        // Apply progress attributes if progress is shown
        if (this.config.showProgress && this.progressElement) {
            this.accessibilityManager.applyARIAAttributes(this.progressElement, {
                'aria-live': 'polite',
                'aria-valuemin': 0,
                'aria-valuemax': 100,
                'aria-valuenow': 0,
                'aria-label': 'Loading progress'
            });
        }
    }
    /**
     * Announce message to screen readers
     */
    announceToScreenReader(announcement) {
        if (this.screenReaderManager) {
            this.screenReaderManager.announce(announcement);
        }
    }
    createSpinnerStructure() {
        // Main spinner container
        this.spinnerElement = document.createElement('div');
        this.spinnerElement.className = 'us-loading-spinner';
        this.spinnerElement.setAttribute('role', 'status');
        this.spinnerElement.setAttribute('aria-busy', 'true');
        // Spinner visual
        const spinnerVisual = document.createElement('div');
        spinnerVisual.className = 'us-loading-spinner__visual';
        // Create the animated spinner using CSS
        const spinnerRing = document.createElement('div');
        spinnerRing.className = 'us-loading-spinner__ring';
        spinnerVisual.appendChild(spinnerRing);
        this.spinnerElement.appendChild(spinnerVisual);
        // Progress indicator
        if (this.config.showProgress) {
            this.progressElement = document.createElement('div');
            this.progressElement.className = 'us-loading-spinner__progress';
            this.spinnerElement.appendChild(this.progressElement);
        }
        // Loading message
        this.messageElement = document.createElement('div');
        this.messageElement.className = 'us-loading-spinner__message';
        this.messageElement.textContent = 'Loading...';
        this.spinnerElement.appendChild(this.messageElement);
        // Apply styles
        this.applyStyles();
        // Append to container
        this.container.appendChild(this.spinnerElement);
    }
    applyStyles() {
        if (!this.spinnerElement)
            return;
        // CSS custom properties for theming
        this.spinnerElement.style.setProperty('--us-spinner-size', `${this.config.size}px`);
        this.spinnerElement.style.setProperty('--us-spinner-duration', `${this.config.duration}ms`);
        this.spinnerElement.style.setProperty('--us-spinner-color', this.config.color);
        this.spinnerElement.style.setProperty('--us-spinner-track-color', this.config.trackColor);
        // Inject CSS if not already present
        this.injectCSS();
    }
    injectCSS() {
        const styleId = 'us-loading-spinner-styles';
        if (document.getElementById(styleId)) {
            return;
        }
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
      .us-loading-spinner {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 2rem 1rem;
        opacity: 0;
        transform: translateY(8px);
        transition: opacity 200ms ease-out, transform 200ms ease-out;
      }

      .us-loading-spinner--visible {
        opacity: 1;
        transform: translateY(0);
      }

      .us-loading-spinner__visual {
        position: relative;
        width: var(--us-spinner-size, 32px);
        height: var(--us-spinner-size, 32px);
        margin-bottom: 1rem;
      }

      .us-loading-spinner__ring {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        border: 3px solid var(--us-spinner-track-color, #e0e0e0);
        border-top-color: var(--us-spinner-color, #007bff);
        border-radius: 50%;
        animation: us-spinner-rotate var(--us-spinner-duration, 1000ms) linear infinite;
        will-change: transform;
      }

      @keyframes us-spinner-rotate {
        0% {
          transform: rotate(0deg);
        }
        100% {
          transform: rotate(360deg);
        }
      }

      .us-loading-spinner__progress {
        width: 100%;
        max-width: 200px;
        height: 2px;
        background-color: var(--us-spinner-track-color, #e0e0e0);
        border-radius: 1px;
        overflow: hidden;
        margin-bottom: 0.5rem;
      }

      .us-loading-spinner__progress::after {
        content: '';
        display: block;
        width: 30%;
        height: 100%;
        background-color: var(--us-spinner-color, #007bff);
        border-radius: 1px;
        animation: us-progress-indeterminate 2s linear infinite;
        will-change: transform;
      }

      @keyframes us-progress-indeterminate {
        0% {
          transform: translateX(-100%);
        }
        50% {
          transform: translateX(0%);
        }
        100% {
          transform: translateX(400%);
        }
      }

      .us-loading-spinner__message {
        color: var(--us-text-color, #333);
        font-size: 0.875rem;
        text-align: center;
        font-weight: 500;
      }

      .us-loading-spinner__message--timeout {
        color: var(--us-warning-color, #f56500);
      }

      /* Reduced motion support */
      @media (prefers-reduced-motion: reduce) {
        .us-loading-spinner__ring {
          animation-duration: 2s;
        }
        
        .us-loading-spinner__progress::after {
          animation-duration: 3s;
        }
      }

      /* High contrast mode support */
      @media (prefers-contrast: high) {
        .us-loading-spinner__ring {
          border-width: 4px;
        }
      }
    `;
        document.head.appendChild(style);
    }
    startTimeout() {
        this.clearTimeout();
        if (this.config.timeoutMs > 0) {
            this.timeoutId = window.setTimeout(() => {
                if (this.messageElement && this.config.timeoutMessage) {
                    this.messageElement.textContent = this.config.timeoutMessage;
                    this.messageElement.classList.add('us-loading-spinner__message--timeout');
                }
                this.emit('timeout', this.getElapsedTime());
            }, this.config.timeoutMs);
        }
    }
    clearTimeout() {
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
        if (this.messageElement) {
            this.messageElement.classList.remove('us-loading-spinner__message--timeout');
        }
    }
    startProgressUpdate() {
        if (!this.config.showProgress || !this.progressElement) {
            return;
        }
        this.clearProgressUpdate();
        // Update progress indication every 100ms
        this.progressInterval = window.setInterval(() => {
            const elapsed = this.getElapsedTime();
            const progress = Math.min(elapsed / Math.max(this.config.timeoutMs, 1000), 1);
            // Update ARIA attributes for accessibility
            if (this.spinnerElement) {
                this.spinnerElement.setAttribute('aria-valuenow', Math.round(progress * 100).toString());
            }
        }, 100);
    }
    clearProgressUpdate() {
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
            this.progressInterval = null;
        }
    }
    emit(event, ...args) {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            listeners.forEach(listener => {
                try {
                    listener(...args);
                }
                catch (error) {
                    console.error(`Error in LoadingSpinner ${event} listener:`, error);
                }
            });
        }
    }
    validateConfig() {
        if (this.config.size < 16 || this.config.size > 128) {
            throw new ValidationError('Spinner size must be between 16 and 128 pixels');
        }
        if (this.config.duration < 100) {
            throw new ValidationError('Animation duration must be at least 100ms');
        }
        if (this.config.timeoutMs < 0) {
            throw new ValidationError('Timeout duration must be non-negative');
        }
    }
    initializeEventMaps() {
        const events = ['timeout', 'start', 'stop'];
        events.forEach(event => {
            this.eventListeners.set(event, []);
        });
    }
    /**
     * Initialize internationalization features
     */
    async initializeInternationalization() {
        try {
            // Initialize Localization Manager
            this.localizationManager = new LocalizationManager({
                enablePluralization: true,
                enableInterpolation: true,
                lazyLoad: true,
                fallbackLocale: 'en-US',
                debugMode: false
            });
            await this.localizationManager.init();
            // Initialize Font Manager
            this.fontManager = new FontManager({
                primaryFont: 'system-ui',
                fallbackFonts: {
                    mixed: ['system-ui', 'sans-serif'],
                    latin: ['system-ui', 'sans-serif'],
                    arabic: ['Tahoma', 'Arial Unicode MS'],
                    hebrew: ['Tahoma', 'Arial Unicode MS'],
                    cjk: ['system-ui', 'sans-serif'],
                    cyrillic: ['system-ui', 'sans-serif'],
                    devanagari: ['system-ui', 'sans-serif'],
                    thai: ['system-ui', 'sans-serif']
                },
                loadingStrategy: 'swap',
                fontDisplay: 'swap',
                preloadFonts: [],
                enableOptimization: true
            });
            await this.fontManager.init();
            // Initialize RTL Manager
            this.rtlManager = new RTLManager({
                autoDetect: true,
                mirrorAnimations: true
            });
            await this.rtlManager.init();
            // Apply initial i18n settings
            this.applyInitialI18nSettings();
        }
        catch (error) {
            console.error('Failed to initialize internationalization features:', error);
            // Continue without i18n features rather than failing completely
        }
    }
    /**
     * Apply initial internationalization settings
     */
    applyInitialI18nSettings() {
        if (!this.spinnerElement)
            return;
        // Apply RTL direction if detected
        if (this.rtlManager?.isRTL()) {
            this.spinnerElement.setAttribute('dir', 'rtl');
            this.rtlManager.applyRTLLayout(this.spinnerElement);
        }
        // Apply appropriate font stack
        if (this.fontManager) {
            const locale = this.localizationManager?.getCurrentLocale() || 'en-US';
            const fontStack = this.fontManager.getFontStackForLocale(locale);
            this.spinnerElement.style.fontFamily = fontStack.join(', ');
        }
    }
    /**
     * Process text for internationalization
     */
    processTextForI18n(text) {
        // For LoadingSpinner, we primarily need basic text processing
        return text;
    }
    /**
     * Apply internationalization styling to text elements
     */
    applyI18nStyling(element, text) {
        // Apply appropriate font stack
        if (this.fontManager) {
            const fontStack = this.fontManager.getFontStackForText(text);
            element.style.fontFamily = fontStack.join(', ');
            this.fontManager.applyFontStack(element, text);
        }
        // Apply RTL-specific styling if needed
        if (this.rtlManager?.isRTL()) {
            this.rtlManager.applyRTLLayout(element);
        }
    }
    /**
     * Get localized text
     */
    getText(key, context) {
        if (!this.localizationManager)
            return key;
        return this.localizationManager.getText(key, context);
    }
    /**
     * Set locale for internationalization
     */
    setLocale(locale) {
        if (this.localizationManager) {
            this.localizationManager.setLocale(locale);
        }
        // Update font stacks for new locale
        if (this.fontManager && this.spinnerElement) {
            const fontStack = this.fontManager.getFontStackForLocale(locale);
            this.spinnerElement.style.fontFamily = fontStack.join(', ');
        }
    }
}
//# sourceMappingURL=LoadingSpinner.js.map