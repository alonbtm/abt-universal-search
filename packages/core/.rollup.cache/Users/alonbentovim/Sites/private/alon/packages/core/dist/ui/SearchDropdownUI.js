/**
 * Search Dropdown UI - Production-ready search dropdown interface
 * @description Professional, responsive search dropdown with accessibility and animations
 */
import { LoadingSpinner } from './LoadingSpinner';
import { FontManager } from './FontManager';
import { ErrorMessage } from './ErrorMessage';
import { AccessibilityManager } from './AccessibilityManager';
import { KeyboardHandler } from './KeyboardHandler';
import { FocusManager } from './FocusManager';
import { ScreenReaderManager } from './ScreenReaderManager';
import { RTLManager } from './RTLManager';
import { TextDirectionDetector } from './TextDirectionDetector';
import { LocalizationManager } from './LocalizationManager';
import { UnicodeHandler } from './UnicodeHandler';
import { LocaleFormatter } from './LocaleFormatter';
import { ValidationError } from '../utils/validation';
/**
 * Enhanced search dropdown UI component with professional styling and animations
 */
export class SearchDropdownUI {
    constructor(container, config, positionConfig = {}, animationConfig = {}) {
        this.dropdownElement = null;
        this.contentElement = null;
        this.resultsList = null;
        this.loadingSpinner = null;
        this.errorMessage = null;
        this.emptyState = null;
        // Accessibility managers
        this.accessibilityManager = null;
        this.keyboardHandler = null;
        this.focusManager = null;
        this.screenReaderManager = null;
        // Internationalization managers
        this.rtlManager = null;
        this.textDirectionDetector = null;
        this.localizationManager = null;
        this.unicodeHandler = null;
        this.localeFormatter = null;
        this.fontManager = null;
        this.results = [];
        this.selectedIndex = -1;
        this.isVisible = false;
        this.isInitialized = false;
        this.state = 'idle';
        this.eventListeners = new Map();
        this.resizeObserver = null;
        this.animationFrame = null;
        if (!container || !(container instanceof HTMLElement)) {
            throw new ValidationError('Container must be a valid HTMLElement');
        }
        this.container = container;
        this.config = { ...config };
        this.positionConfig = {
            position: 'auto',
            maxHeight: 300,
            minWidth: 200,
            offset: 4,
            ...positionConfig
        };
        this.animationConfig = {
            enabled: true,
            duration: 200,
            easing: 'ease-out',
            useTransform: true,
            ...animationConfig
        };
        this.validateConfig();
        this.initializeEventMaps();
    }
    /**
     * Initialize the search dropdown UI
     */
    async init() {
        if (this.isInitialized) {
            return;
        }
        try {
            this.createDropdownStructure();
            this.setupEventListeners();
            this.setupResizeObserver();
            this.applyTheme();
            // Initialize accessibility features
            await this.initializeAccessibility();
            // Initialize internationalization features
            await this.initializeInternationalization();
            this.isInitialized = true;
        }
        catch (error) {
            throw new ValidationError(`Failed to initialize SearchDropdownUI: ${error}`);
        }
    }
    /**
     * Show search results in the dropdown
     */
    showResults(results) {
        this.results = [...results];
        this.selectedIndex = -1;
        this.state = results.length > 0 ? 'results' : 'empty';
        this.updateContent();
        this.show();
    }
    /**
     * Show loading state
     */
    showLoading(message) {
        this.state = 'loading';
        this.updateContent();
        this.show();
        if (this.loadingSpinner) {
            this.loadingSpinner.start(message || this.config.loadingText);
        }
    }
    /**
     * Show error state
     */
    showError(error, retryAction) {
        this.state = 'error';
        this.updateContent();
        this.show();
        if (this.errorMessage) {
            this.errorMessage.show(error, retryAction);
        }
    }
    /**
     * Show empty state
     */
    showEmpty(message, suggestions) {
        this.state = 'empty';
        this.updateContent();
        this.show();
        if (this.emptyState) {
            this.emptyState.show(message || this.config.noResultsText, suggestions);
        }
    }
    /**
     * Hide the dropdown
     */
    hide() {
        if (!this.isVisible || !this.dropdownElement) {
            return;
        }
        this.animateOut(() => {
            this.isVisible = false;
            this.emit('dropdown-close');
        });
    }
    /**
     * Handle keyboard navigation
     */
    handleKeyboardNavigation(event) {
        if (!this.isVisible || this.state !== 'results' || this.results.length === 0) {
            return false;
        }
        switch (event.key) {
            case 'ArrowDown':
                event.preventDefault();
                this.navigateResults('down');
                return true;
            case 'ArrowUp':
                event.preventDefault();
                this.navigateResults('up');
                return true;
            case 'Enter':
                event.preventDefault();
                if (this.selectedIndex >= 0 && this.selectedIndex < this.results.length) {
                    this.selectResult(this.selectedIndex);
                }
                return true;
            case 'Escape':
                event.preventDefault();
                this.hide();
                return true;
            case 'Home':
                event.preventDefault();
                this.navigateResults('first');
                return true;
            case 'End':
                event.preventDefault();
                this.navigateResults('last');
                return true;
            default:
                return false;
        }
    }
    /**
     * Update dropdown position and size
     */
    updatePosition() {
        if (!this.dropdownElement || !this.isVisible) {
            return;
        }
        const containerRect = this.container.getBoundingClientRect();
        const dropdownRect = this.dropdownElement.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;
        // Calculate optimal position
        const spaceBelow = viewportHeight - containerRect.bottom - this.positionConfig.offset;
        const spaceAbove = containerRect.top - this.positionConfig.offset;
        let position = this.positionConfig.position;
        if (position === 'auto') {
            position = spaceBelow >= this.positionConfig.maxHeight || spaceBelow >= spaceAbove ? 'bottom' : 'top';
        }
        // Calculate horizontal position with RTL support
        let leftPosition = containerRect.left;
        if (this.rtlManager?.isRTL()) {
            // For RTL, apply RTL layout
            if (this.rtlManager) {
                this.rtlManager.applyRTLLayout(this.dropdownElement);
            }
            leftPosition = containerRect.right - dropdownRect.width;
        }
        else {
            leftPosition = Math.max(8, Math.min(containerRect.left, viewportWidth - dropdownRect.width - 8));
        }
        // Set position and dimensions
        const styles = {
            position: 'fixed',
            left: `${leftPosition}px`,
            width: `${Math.max(this.positionConfig.minWidth, containerRect.width)}px`,
            maxHeight: `${Math.min(this.positionConfig.maxHeight, position === 'bottom' ? spaceBelow : spaceAbove)}px`,
            zIndex: '9999'
        };
        if (position === 'bottom') {
            styles.top = `${containerRect.bottom + this.positionConfig.offset}px`;
        }
        else {
            styles.bottom = `${viewportHeight - containerRect.top + this.positionConfig.offset}px`;
        }
        Object.assign(this.dropdownElement.style, styles);
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
     * Destroy the dropdown and cleanup resources
     */
    destroy() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
        if (this.loadingSpinner) {
            this.loadingSpinner.destroy();
        }
        if (this.errorMessage) {
            this.errorMessage.destroy();
        }
        if (this.emptyState) {
            this.emptyState.destroy();
        }
        // Destroy internationalization managers
        if (this.rtlManager) {
            this.rtlManager.setDirection('ltr');
        }
        if (this.textDirectionDetector) {
            this.textDirectionDetector.destroy();
        }
        if (this.localizationManager) {
            this.localizationManager.destroy();
        }
        if (this.unicodeHandler) {
            this.unicodeHandler.destroy();
        }
        if (this.localeFormatter) {
            this.localeFormatter.destroy();
        }
        if (this.fontManager) {
            this.fontManager.destroy();
        }
        if (this.dropdownElement && this.dropdownElement.parentNode) {
            this.dropdownElement.parentNode.removeChild(this.dropdownElement);
        }
        this.eventListeners.clear();
        this.isInitialized = false;
    }
    // Private implementation methods
    createDropdownStructure() {
        // Create main dropdown container
        this.dropdownElement = document.createElement('div');
        this.dropdownElement.className = 'us-dropdown';
        this.dropdownElement.setAttribute('role', 'listbox');
        this.dropdownElement.setAttribute('aria-expanded', 'false');
        this.dropdownElement.style.display = 'none';
        // Create content container
        this.contentElement = document.createElement('div');
        this.contentElement.className = 'us-dropdown__content';
        this.dropdownElement.appendChild(this.contentElement);
        // Create results list
        this.resultsList = document.createElement('ul');
        this.resultsList.className = 'us-dropdown__results';
        this.resultsList.setAttribute('role', 'listbox');
        this.contentElement.appendChild(this.resultsList);
        // Initialize child components
        this.loadingSpinner = new LoadingSpinner(this.contentElement);
        this.loadingSpinner.init();
        this.errorMessage = new ErrorMessage(this.contentElement);
        this.errorMessage.init();
        this.errorMessage.on('retry', () => this.emit('retry-action'));
        // EmptyState component will be implemented in future iterations
        this.emptyState = null;
        // Append to document body for proper positioning
        document.body.appendChild(this.dropdownElement);
    }
    setupEventListeners() {
        if (!this.resultsList)
            return;
        // Mouse interactions
        this.resultsList.addEventListener('click', (event) => {
            const target = event.target;
            const resultItem = target.closest('.us-dropdown__result');
            if (resultItem) {
                const index = Array.from(this.resultsList.children).indexOf(resultItem);
                if (index >= 0) {
                    this.selectResult(index);
                }
            }
        });
        this.resultsList.addEventListener('mouseover', (event) => {
            const target = event.target;
            const resultItem = target.closest('.us-dropdown__result');
            if (resultItem) {
                const index = Array.from(this.resultsList.children).indexOf(resultItem);
                if (index >= 0) {
                    this.setSelectedIndex(index);
                }
            }
        });
        // Global click handler to close dropdown
        document.addEventListener('click', (event) => {
            if (this.isVisible && !this.container.contains(event.target) &&
                !this.dropdownElement?.contains(event.target)) {
                this.hide();
            }
        });
        // Prevent dropdown from closing when clicking inside
        if (this.dropdownElement) {
            this.dropdownElement.addEventListener('click', (event) => {
                event.stopPropagation();
            });
        }
    }
    setupResizeObserver() {
        if (typeof ResizeObserver !== 'undefined') {
            this.resizeObserver = new ResizeObserver(() => {
                if (this.isVisible) {
                    this.updatePosition();
                }
            });
            this.resizeObserver.observe(this.container);
            this.resizeObserver.observe(document.body);
        }
        // Fallback for browsers without ResizeObserver
        window.addEventListener('resize', () => {
            if (this.isVisible) {
                this.updatePosition();
            }
        });
    }
    updateContent() {
        if (!this.contentElement || !this.resultsList)
            return;
        // Hide all components first
        this.loadingSpinner?.hide();
        this.errorMessage?.hide();
        this.emptyState?.hide();
        this.resultsList.style.display = 'none';
        switch (this.state) {
            case 'loading':
                this.loadingSpinner?.show();
                break;
            case 'error':
                this.errorMessage?.show();
                break;
            case 'empty':
                this.emptyState?.show();
                break;
            case 'results':
                this.renderResults();
                this.resultsList.style.display = 'block';
                break;
        }
    }
    renderResults() {
        if (!this.resultsList)
            return;
        // Clear existing results
        this.resultsList.innerHTML = '';
        this.results.forEach((result, index) => {
            const resultItem = this.createResultItem(result, index);
            this.resultsList.appendChild(resultItem);
        });
        // Set initial selection
        if (this.selectedIndex >= 0 && this.selectedIndex < this.results.length) {
            this.updateResultSelection();
        }
    }
    createResultItem(result, index) {
        const item = document.createElement('li');
        item.className = 'us-dropdown__result';
        item.setAttribute('role', 'option');
        item.setAttribute('aria-selected', 'false');
        item.setAttribute('data-index', index.toString());
        // Main content
        const content = document.createElement('div');
        content.className = 'us-dropdown__result-content';
        // Icon if provided
        if (result.metadata?.icon) {
            const icon = document.createElement('span');
            icon.className = 'us-dropdown__result-icon';
            icon.textContent = String(result.metadata.icon);
            content.appendChild(icon);
        }
        // Text content
        const textContainer = document.createElement('div');
        textContainer.className = 'us-dropdown__result-text';
        const title = document.createElement('div');
        title.className = 'us-dropdown__result-title';
        // Process title text for internationalization
        const processedTitle = this.processTextForI18n(result.title);
        title.textContent = processedTitle;
        // Apply appropriate font stack and text direction
        this.applyI18nStyling(title, result.title);
        textContainer.appendChild(title);
        if (result.metadata?.subtitle) {
            const subtitle = document.createElement('div');
            subtitle.className = 'us-dropdown__result-subtitle';
            const subtitleText = String(result.metadata.subtitle);
            const processedSubtitle = this.processTextForI18n(subtitleText);
            subtitle.textContent = processedSubtitle;
            // Apply appropriate font stack and text direction
            this.applyI18nStyling(subtitle, subtitleText);
            textContainer.appendChild(subtitle);
        }
        content.appendChild(textContainer);
        // Category badge if provided
        if (result.metadata?.category) {
            const category = document.createElement('span');
            category.className = 'us-dropdown__result-category';
            const categoryText = String(result.metadata.category);
            const processedCategory = this.processTextForI18n(categoryText);
            category.textContent = processedCategory;
            // Apply appropriate font stack and text direction
            this.applyI18nStyling(category, categoryText);
            content.appendChild(category);
        }
        item.appendChild(content);
        // Apply disabled state if needed
        if (result.metadata?.disabled) {
            item.classList.add('us-dropdown__result--disabled');
            item.setAttribute('aria-disabled', 'true');
        }
        // Apply RTL positioning if needed
        if (this.rtlManager?.isRTL()) {
            this.rtlManager.applyRTLLayout(item);
        }
        return item;
    }
    navigateResults(direction) {
        if (this.results.length === 0)
            return;
        let newIndex = this.selectedIndex;
        switch (direction) {
            case 'down':
                newIndex = this.selectedIndex < this.results.length - 1 ? this.selectedIndex + 1 : 0;
                break;
            case 'up':
                newIndex = this.selectedIndex > 0 ? this.selectedIndex - 1 : this.results.length - 1;
                break;
            case 'first':
                newIndex = 0;
                break;
            case 'last':
                newIndex = this.results.length - 1;
                break;
        }
        this.setSelectedIndex(newIndex);
    }
    setSelectedIndex(index) {
        if (index < 0 || index >= this.results.length || index === this.selectedIndex) {
            return;
        }
        this.selectedIndex = index;
        this.updateResultSelection();
        this.scrollToSelected();
    }
    updateResultSelection() {
        if (!this.resultsList)
            return;
        const items = this.resultsList.querySelectorAll('.us-dropdown__result');
        items.forEach((item, index) => {
            const isSelected = index === this.selectedIndex;
            item.classList.toggle('us-dropdown__result--selected', isSelected);
            item.setAttribute('aria-selected', isSelected.toString());
        });
    }
    scrollToSelected() {
        if (!this.resultsList || this.selectedIndex < 0)
            return;
        const selectedItem = this.resultsList.children[this.selectedIndex];
        if (selectedItem) {
            selectedItem.scrollIntoView({
                block: 'nearest',
                behavior: 'smooth'
            });
        }
    }
    selectResult(index) {
        if (index < 0 || index >= this.results.length)
            return;
        const result = this.results[index];
        if (!result || result.metadata?.disabled)
            return;
        this.emit('result-select', result);
        this.hide();
    }
    show() {
        if (this.isVisible || !this.dropdownElement)
            return;
        this.updatePosition();
        this.animateIn(() => {
            this.isVisible = true;
            this.emit('dropdown-open');
        });
    }
    animateIn(callback) {
        if (!this.dropdownElement || !this.animationConfig.enabled) {
            this.dropdownElement.style.display = 'block';
            this.dropdownElement.setAttribute('aria-expanded', 'true');
            callback?.();
            return;
        }
        // Use optimized 60fps animation keyframes
        this.dropdownElement.style.display = 'block';
        this.dropdownElement.setAttribute('data-animation', 'enter');
        // Hardware-accelerated entrance animation
        this.animationFrame = requestAnimationFrame(() => {
            if (!this.dropdownElement)
                return;
            this.dropdownElement.style.animation = `us-dropdown-enter ${this.animationConfig.duration}ms ease-out both`;
            this.dropdownElement.setAttribute('aria-expanded', 'true');
            setTimeout(() => {
                callback?.();
            }, this.animationConfig.duration);
        });
    }
    animateOut(callback) {
        if (!this.dropdownElement || !this.animationConfig.enabled) {
            this.dropdownElement.style.display = 'none';
            this.dropdownElement.setAttribute('aria-expanded', 'false');
            callback?.();
            return;
        }
        // Use optimized 60fps exit animation
        this.dropdownElement.setAttribute('data-animation', 'exit');
        this.dropdownElement.style.animation = `us-dropdown-exit ${this.animationConfig.duration}ms ease-out both`;
        this.dropdownElement.setAttribute('aria-expanded', 'false');
        setTimeout(() => {
            if (this.dropdownElement) {
                this.dropdownElement.style.display = 'none';
                this.dropdownElement.removeAttribute('data-animation');
                this.dropdownElement.style.animation = '';
            }
            callback?.();
        }, this.animationConfig.duration);
    }
    applyTheme() {
        if (!this.dropdownElement)
            return;
        this.dropdownElement.setAttribute('data-theme', this.config.theme);
        if (this.config.rtl) {
            this.dropdownElement.setAttribute('dir', 'rtl');
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
                    console.error(`Error in ${event} listener:`, error);
                }
            });
        }
    }
    validateConfig() {
        if (this.config.maxResults < 1) {
            throw new ValidationError('maxResults must be greater than 0');
        }
        if (this.positionConfig.maxHeight < 50) {
            throw new ValidationError('maxHeight must be at least 50px');
        }
        if (this.animationConfig.duration < 0) {
            throw new ValidationError('Animation duration must be non-negative');
        }
    }
    initializeEventMaps() {
        const events = [
            'result-select',
            'retry-action',
            'suggestion-select',
            'dropdown-open',
            'dropdown-close'
        ];
        events.forEach(event => {
            this.eventListeners.set(event, []);
        });
    }
    /**
     * Initialize accessibility features
     */
    async initializeAccessibility() {
        try {
            // Initialize AccessibilityManager
            this.accessibilityManager = new AccessibilityManager({
                wcagLevel: 'AA',
                enableKeyboardNavigation: true,
                enableScreenReaderSupport: true,
                enableFocusManagement: true,
                enableAutomatedValidation: false, // Manual validation for better control
                debugMode: false
            });
            await this.accessibilityManager.init();
            // Initialize ScreenReaderManager
            this.screenReaderManager = new ScreenReaderManager();
            await this.screenReaderManager.init();
            // Initialize KeyboardHandler
            this.keyboardHandler = new KeyboardHandler(this.container, {
                enableArrowKeys: true,
                enableEnterKey: true,
                enableEscapeKey: true,
                enableTabNavigation: true,
                enableHomeEndKeys: true,
                trapFocus: false, // Managed by FocusManager
                circularNavigation: true
            });
            this.keyboardHandler.init();
            // Initialize FocusManager
            this.focusManager = new FocusManager({
                trapFocus: true,
                restoreStrategy: 'restore',
                showFocusIndicators: true,
                skipInvisible: true
            });
            this.focusManager.init();
            // Set up accessibility event listeners
            this.setupAccessibilityEventListeners();
            // Apply initial ARIA attributes
            this.applyInitialARIAAttributes();
        }
        catch (error) {
            console.error('Failed to initialize accessibility features:', error);
            // Continue without accessibility features rather than failing completely
        }
    }
    /**
     * Set up accessibility event listeners
     */
    setupAccessibilityEventListeners() {
        if (!this.keyboardHandler || !this.screenReaderManager)
            return;
        // Handle keyboard navigation
        this.keyboardHandler.on('navigation', (context) => {
            if (this.isVisible && this.state === 'results') {
                this.selectedIndex = context.currentIndex;
                this.updateResultSelection();
                // Announce current selection to screen readers
                if (this.selectedIndex >= 0 && this.selectedIndex < this.results.length) {
                    const result = this.results[this.selectedIndex];
                    if (result && this.selectedIndex >= 0) {
                        this.screenReaderManager?.announceNavigation(this.selectedIndex, this.results.length, result.title);
                    }
                }
            }
        });
        // Handle Enter key selection
        this.keyboardHandler.on('enter-pressed', (event) => {
            if (this.isVisible && this.selectedIndex >= 0) {
                event.preventDefault();
                this.selectResult(this.selectedIndex);
            }
        });
        // Handle Escape key
        this.keyboardHandler.on('escape-pressed', (event) => {
            if (this.isVisible) {
                event.preventDefault();
                this.hide();
            }
        });
    }
    /**
     * Apply initial ARIA attributes
     */
    applyInitialARIAAttributes() {
        if (!this.accessibilityManager || !this.dropdownElement)
            return;
        // Set dropdown ARIA attributes
        this.accessibilityManager.applyARIAAttributes(this.dropdownElement, {
            'aria-expanded': 'false',
            'aria-hidden': true
        });
        this.accessibilityManager.setARIARole(this.dropdownElement, 'listbox');
        // Set results list ARIA attributes
        if (this.resultsList) {
            this.accessibilityManager.setARIARole(this.resultsList, 'list');
            this.accessibilityManager.applyARIAAttributes(this.resultsList, {
                'aria-multiselectable': false
            });
        }
    }
    /**
     * Initialize internationalization features
     */
    async initializeInternationalization() {
        try {
            // Initialize RTL Manager
            this.rtlManager = new RTLManager({
                autoDetect: true,
                mirrorAnimations: true
            });
            await this.rtlManager.init();
            // Initialize Text Direction Detector
            this.textDirectionDetector = new TextDirectionDetector({
                rtlThreshold: 0.3,
                detectFromLocale: true,
                detectFromContent: true,
                cacheResults: true,
                fallbackDirection: 'ltr'
            });
            await this.textDirectionDetector.init();
            // Initialize Localization Manager
            this.localizationManager = new LocalizationManager({
                enablePluralization: true,
                enableInterpolation: true,
                lazyLoad: true,
                fallbackLocale: 'en-US',
                debugMode: false
            });
            await this.localizationManager.init();
            // Initialize Unicode Handler
            this.unicodeHandler = new UnicodeHandler({
                normalizationForm: 'NFC',
                enableBidi: true,
                enableCombining: true,
                handleEmoji: true,
                validateInput: true,
                debugMode: false
            });
            await this.unicodeHandler.init();
            // Initialize Locale Formatter
            this.localeFormatter = new LocaleFormatter('en-US', {
                dateFormat: { dateStyle: 'medium' },
                numberFormat: { useGrouping: true },
                currencyFormat: { style: 'currency', currency: 'USD' },
                relativeTimeFormat: { numeric: 'auto', style: 'long' },
                listFormat: { style: 'long', type: 'conjunction' }
            });
            await this.localeFormatter.init();
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
                enableOptimization: true,
                weightMapping: {
                    mixed: 'normal',
                    latin: 'normal',
                    arabic: 'normal',
                    hebrew: 'normal',
                    cjk: 'normal',
                    cyrillic: 'normal',
                    devanagari: 'normal',
                    thai: 'normal'
                }
            });
            await this.fontManager.init();
            // Set up internationalization event listeners
            this.setupI18nEventListeners();
            // Apply initial internationalization settings
            this.applyInitialI18nSettings();
        }
        catch (error) {
            console.error('Failed to initialize internationalization features:', error);
            // Continue without i18n features rather than failing completely
        }
    }
    /**
     * Set up internationalization event listeners
     */
    setupI18nEventListeners() {
        if (!this.rtlManager || !this.textDirectionDetector)
            return;
        // Handle RTL direction changes
        this.rtlManager.on('direction-changed', (direction) => {
            if (this.dropdownElement) {
                this.dropdownElement.setAttribute('dir', direction);
                if (this.isVisible) {
                    this.updatePosition();
                }
            }
        });
        // Handle text direction detection changes
        this.textDirectionDetector.on('direction-changed', (direction) => {
            if (this.dropdownElement) {
                this.dropdownElement.setAttribute('data-text-direction', direction);
            }
        });
        // Handle locale changes
        if (this.localizationManager) {
            this.localizationManager.on('locale-changed', (newLocale, oldLocale) => {
                // Update font stacks for new locale
                if (this.fontManager && this.dropdownElement) {
                    const fontStack = this.fontManager.getFontStackForLocale(newLocale);
                    this.dropdownElement.style.fontFamily = fontStack.join(', ');
                }
                // Re-render results with new locale
                if (this.isVisible && this.state === 'results') {
                    this.renderResults();
                }
            });
        }
    }
    /**
     * Apply initial internationalization settings
     */
    applyInitialI18nSettings() {
        if (!this.dropdownElement)
            return;
        // Apply RTL direction if detected
        if (this.rtlManager?.isRTL()) {
            this.dropdownElement.setAttribute('dir', 'rtl');
            this.rtlManager.applyRTLLayout(this.dropdownElement);
        }
        // Apply appropriate font stack
        if (this.fontManager && this.localizationManager) {
            this.localizationManager.getCurrentLocale(); // Get current locale for comparison
            const fontStack = this.fontManager.getFontStackForLocale('en-US');
            this.dropdownElement.style.fontFamily = fontStack.join(', ');
        }
    }
    /**
     * Process text for internationalization
     */
    processTextForI18n(text) {
        if (!this.unicodeHandler)
            return text;
        // Normalize Unicode text
        let processedText = this.unicodeHandler.normalizeText(text);
        // Apply bidirectional text processing if needed
        if (this.unicodeHandler && text.length > 0) {
            processedText = this.unicodeHandler.normalizeText(text);
        }
        return processedText;
    }
    /**
     * Apply internationalization styling to text elements
     */
    applyI18nStyling(element, text) {
        // Detect and apply text direction
        if (this.textDirectionDetector) {
            const directionResult = this.textDirectionDetector.detectFromContent(text);
            element.setAttribute('dir', directionResult.direction);
        }
        // Apply appropriate font stack
        if (this.fontManager) {
            const fontStack = this.fontManager.getFontStackForText(text);
            element.style.fontFamily = fontStack.join(', ');
            // Apply the font stack to the element
            this.fontManager.applyFontStack(element, text);
        }
        // Apply RTL-specific styling if needed
        if (this.rtlManager?.isRTL()) {
            this.rtlManager.applyRTLLayout(element);
        }
    }
    /**
     * Set locale for internationalization
     */
    setLocale(locale) {
        if (this.localizationManager) {
            this.localizationManager.setLocale(locale);
        }
        if (this.localeFormatter) {
            this.localeFormatter.setLocale(locale);
        }
        // Update font stacks for new locale
        if (this.fontManager && this.dropdownElement) {
            const fontStack = this.fontManager.getFontStackForLocale(locale);
            this.dropdownElement.style.fontFamily = fontStack.join(', ');
        }
        // Re-render if visible
        if (this.isVisible && this.state === 'results') {
            this.renderResults();
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
     * Format date according to current locale
     */
    formatDate(date) {
        if (!this.localeFormatter)
            return String(date);
        return this.localeFormatter.formatDate(date);
    }
    /**
     * Format number according to current locale
     */
    formatNumber(value) {
        if (!this.localeFormatter)
            return value.toString();
        return this.localeFormatter.formatNumber(value);
    }
}
//# sourceMappingURL=SearchDropdownUI.js.map