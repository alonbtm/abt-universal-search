/**
 * RTL Manager
 * Comprehensive right-to-left layout support with mirrored positioning
 */
import { ValidationError } from '../utils/validation';
import { isRTLLocale, detectTextDirection, calculateRTLPosition, toLogicalProperties, supportsLogicalProperties } from '../utils/internationalization';
/**
 * RTL layout management with automatic detection and mirrored positioning
 */
export class RTLManager {
    constructor(config = {}) {
        this.currentDirection = 'ltr';
        this.isInitialized = false;
        this.observers = [];
        this.mutationObserver = null;
        this.styleSheet = null;
        this.eventListeners = new Map();
        this.config = {
            enabled: true,
            autoDetect: true,
            mirrorAnimations: true,
            useLogicalProperties: supportsLogicalProperties(),
            rtlClassName: 'rtl-layout',
            debugMode: false,
            ...config
        };
        this.initializeEventMaps();
    }
    /**
     * Initialize RTL manager
     */
    async init() {
        if (this.isInitialized) {
            return;
        }
        try {
            if (!this.config.enabled) {
                this.isInitialized = true;
                return;
            }
            this.injectRTLStyles();
            this.setupMutationObserver();
            this.detectInitialDirection();
            this.applyGlobalDirection();
            this.isInitialized = true;
            if (this.config.debugMode) {
                console.log('RTLManager initialized', {
                    direction: this.currentDirection,
                    useLogicalProperties: this.config.useLogicalProperties,
                    autoDetect: this.config.autoDetect
                });
            }
        }
        catch (error) {
            throw new ValidationError(`Failed to initialize RTLManager: ${error}`);
        }
    }
    /**
     * Destroy RTL manager and cleanup resources
     */
    destroy() {
        this.observers.forEach(observer => observer.disconnect());
        this.observers = [];
        if (this.mutationObserver) {
            this.mutationObserver.disconnect();
            this.mutationObserver = null;
        }
        if (this.styleSheet && this.styleSheet.ownerNode) {
            this.styleSheet.ownerNode.remove();
            this.styleSheet = null;
        }
        this.eventListeners.clear();
        this.isInitialized = false;
    }
    /**
     * Detect RTL from various sources
     */
    detectRTL(content, locale, element) {
        let isRTL = false;
        let source = 'fallback';
        let direction = 'ltr';
        let confidence = 0;
        let influencingLocale;
        // Check forced direction first
        if (this.config.forceDirection) {
            isRTL = this.config.forceDirection === 'rtl';
            source = 'configuration';
            direction = this.config.forceDirection;
            confidence = 1;
        }
        // Check element's dir attribute
        else if (element) {
            const dirAttr = element.getAttribute('dir') ||
                element.closest('[dir]')?.getAttribute('dir');
            if (dirAttr) {
                isRTL = dirAttr === 'rtl';
                source = 'manual';
                direction = dirAttr;
                confidence = 1;
            }
        }
        // Check locale
        else if (locale && isRTLLocale(locale)) {
            isRTL = true;
            source = 'locale';
            direction = 'rtl';
            confidence = 0.9;
            influencingLocale = locale;
        }
        // Check content
        else if (content && this.config.autoDetect) {
            const detection = detectTextDirection(content);
            isRTL = detection.direction === 'rtl';
            source = 'content';
            direction = detection.direction;
            confidence = detection.confidence;
        }
        return {
            isRTL,
            source,
            direction,
            confidence,
            influencingLocale
        };
    }
    /**
     * Set text direction
     */
    setDirection(direction) {
        if (direction === this.currentDirection) {
            return;
        }
        const previousDirection = this.currentDirection;
        this.currentDirection = direction;
        this.applyGlobalDirection();
        this.updateAllElements();
        this.emit('direction-changed', direction, previousDirection);
        this.emit('rtl-toggle', direction === 'rtl');
        if (this.config.debugMode) {
            console.log('Direction changed', { from: previousDirection, to: direction });
        }
    }
    /**
     * Get current text direction
     */
    getDirection() {
        return this.currentDirection;
    }
    /**
     * Check if current direction is RTL
     */
    isRTL() {
        return this.currentDirection === 'rtl';
    }
    /**
     * Apply RTL layout to element
     */
    applyRTLLayout(element, forceDirection) {
        const direction = forceDirection || this.currentDirection;
        const isRTL = direction === 'rtl';
        // Set direction attribute
        element.setAttribute('dir', direction);
        // Add/remove RTL class
        if (isRTL) {
            element.classList.add(this.config.rtlClassName);
        }
        else {
            element.classList.remove(this.config.rtlClassName);
        }
        // Apply logical properties if supported
        if (this.config.useLogicalProperties) {
            this.applyLogicalProperties(element);
        }
        // Mirror animations if enabled
        if (this.config.mirrorAnimations && isRTL) {
            this.mirrorAnimations(element);
        }
    }
    /**
     * Remove RTL layout from element
     */
    removeRTLLayout(element) {
        element.removeAttribute('dir');
        element.classList.remove(this.config.rtlClassName);
        // Remove mirrored animations
        element.style.removeProperty('animation-direction');
        element.style.removeProperty('transform');
    }
    /**
     * Get RTL-aware positioning for dropdown/popup
     */
    getDropdownPosition(trigger, dropdown, preferredSide = 'start') {
        const triggerRect = trigger.getBoundingClientRect();
        const dropdownRect = dropdown.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const isRTL = this.isRTL();
        const measurement = {
            width: dropdownRect.width,
            height: dropdownRect.height,
            left: triggerRect.left,
            right: triggerRect.right,
            top: triggerRect.bottom,
            bottom: triggerRect.bottom + dropdownRect.height,
            scrollLeft: window.scrollX,
            scrollWidth: document.documentElement.scrollWidth,
            clientWidth: viewportWidth
        };
        // Determine optimal position
        let inlineStart;
        if (preferredSide === 'start') {
            inlineStart = isRTL ? triggerRect.right - dropdownRect.width : triggerRect.left;
        }
        else {
            inlineStart = isRTL ? triggerRect.left : triggerRect.right - dropdownRect.width;
        }
        // Ensure dropdown stays within viewport
        if (inlineStart < 0) {
            inlineStart = 0;
        }
        else if (inlineStart + dropdownRect.width > viewportWidth) {
            inlineStart = viewportWidth - dropdownRect.width;
        }
        return calculateRTLPosition({ ...measurement, left: inlineStart, right: inlineStart + dropdownRect.width }, this.currentDirection, viewportWidth);
    }
    /**
     * Mirror scroll position for RTL
     */
    mirrorScrollPosition(element) {
        if (!this.isRTL())
            return;
        const scrollWidth = element.scrollWidth;
        const clientWidth = element.clientWidth;
        // Convert LTR scroll position to RTL
        element.scrollLeft = scrollWidth - clientWidth - Math.abs(element.scrollLeft);
    }
    /**
     * Get mirrored scroll position
     */
    getMirroredScrollLeft(element) {
        if (!this.isRTL()) {
            return element.scrollLeft;
        }
        const scrollWidth = element.scrollWidth;
        const clientWidth = element.clientWidth;
        return scrollWidth - clientWidth - element.scrollLeft;
    }
    /**
     * Apply RTL-aware transforms
     */
    applyRTLTransform(element, transform) {
        if (this.isRTL()) {
            // Mirror transform for RTL
            const mirroredTransform = transform.replace(/translateX\(([^)]+)\)/g, (match, value) => `translateX(calc(-1 * (${value})))`);
            element.style.transform = mirroredTransform;
        }
        else {
            element.style.transform = transform;
        }
    }
    /**
     * Get directional CSS properties
     */
    getDirectionalCSS() {
        const isRTL = this.isRTL();
        return {
            direction: this.currentDirection,
            textAlign: isRTL ? 'right' : 'left',
            ...(this.config.useLogicalProperties ? {
                'text-align': 'start'
            } : {})
        };
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
    // Private implementation methods
    detectInitialDirection() {
        if (this.config.forceDirection) {
            this.currentDirection = this.config.forceDirection;
            return;
        }
        // Check document direction
        const documentDir = document.documentElement.getAttribute('dir');
        if (documentDir === 'rtl' || documentDir === 'ltr') {
            this.currentDirection = documentDir;
            return;
        }
        // Check document language
        const lang = document.documentElement.lang || navigator.language;
        if (isRTLLocale(lang)) {
            this.currentDirection = 'rtl';
            return;
        }
        // Default to LTR
        this.currentDirection = 'ltr';
    }
    applyGlobalDirection() {
        // Set direction on document element
        document.documentElement.setAttribute('dir', this.currentDirection);
        // Add/remove global RTL class
        if (this.isRTL()) {
            document.documentElement.classList.add(this.config.rtlClassName);
        }
        else {
            document.documentElement.classList.remove(this.config.rtlClassName);
        }
    }
    updateAllElements() {
        // Update all elements that should inherit direction
        const elements = document.querySelectorAll('[data-rtl-auto]');
        elements.forEach(element => {
            if (element instanceof HTMLElement) {
                this.applyRTLLayout(element);
            }
        });
    }
    setupMutationObserver() {
        this.mutationObserver = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(node => {
                        if (node instanceof HTMLElement && node.hasAttribute('data-rtl-auto')) {
                            this.applyRTLLayout(node);
                        }
                    });
                }
            });
        });
        this.mutationObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
    applyLogicalProperties(element) {
        const computedStyle = getComputedStyle(element);
        const logicalProperties = toLogicalProperties(computedStyle, this.currentDirection);
        Object.entries(logicalProperties).forEach(([property, value]) => {
            element.style.setProperty(property, value);
        });
    }
    mirrorAnimations(element) {
        // Mirror CSS animations for RTL
        const animations = element.getAnimations();
        animations.forEach(animation => {
            if (animation instanceof CSSAnimation) {
                // Reverse animation direction for RTL
                const keyframes = animation.effect;
                if (keyframes) {
                    try {
                        const currentKeyframes = keyframes.getKeyframes();
                        const mirroredKeyframes = currentKeyframes.map(keyframe => ({
                            ...keyframe,
                            transform: this.mirrorTransformKeyframe(keyframe.transform)
                        }));
                        keyframes.setKeyframes(mirroredKeyframes);
                    }
                    catch (error) {
                        // Fallback: apply CSS transform
                        element.style.animationDirection = 'reverse';
                    }
                }
            }
        });
    }
    mirrorTransformKeyframe(transform) {
        if (!transform || transform === 'none')
            return transform;
        return transform.replace(/translateX\(([^)]+)\)/g, (match, value) => `translateX(calc(-1 * (${value})))`).replace(/scaleX\(([^)]+)\)/g, (match, value) => `scaleX(calc(-1 * (${value})))`);
    }
    injectRTLStyles() {
        const styleId = 'rtl-manager-styles';
        if (document.getElementById(styleId)) {
            return;
        }
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = this.generateRTLCSS();
        document.head.appendChild(style);
        // Store reference to the stylesheet
        this.styleSheet = style.sheet;
    }
    generateRTLCSS() {
        const rtlClass = this.config.rtlClassName;
        return `
      /* RTL Layout Support */
      .${rtlClass} {
        direction: rtl;
      }

      /* Logical Properties Fallbacks */
      ${!this.config.useLogicalProperties ? `
      .${rtlClass} [data-margin-inline-start] {
        margin-right: var(--margin-inline-start);
        margin-left: unset;
      }
      
      .${rtlClass} [data-margin-inline-end] {
        margin-left: var(--margin-inline-end);
        margin-right: unset;
      }
      
      .${rtlClass} [data-padding-inline-start] {
        padding-right: var(--padding-inline-start);
        padding-left: unset;
      }
      
      .${rtlClass} [data-padding-inline-end] {
        padding-left: var(--padding-inline-end);
        padding-right: unset;
      }
      
      .${rtlClass} [data-text-align="start"] {
        text-align: right;
      }
      
      .${rtlClass} [data-text-align="end"] {
        text-align: left;
      }
      ` : ''}

      /* RTL-specific component styles */
      .${rtlClass} .dropdown-menu {
        transform-origin: top right;
      }
      
      .${rtlClass} .search-input {
        text-align: right;
      }
      
      .${rtlClass} .search-results {
        text-align: right;
      }
      
      .${rtlClass} .loading-spinner {
        animation-direction: reverse;
      }

      /* Debug styles */
      ${this.config.debugMode ? `
      .${rtlClass} {
        outline: 2px dashed blue;
      }
      
      .${rtlClass}::before {
        content: "RTL";
        position: absolute;
        top: 0;
        right: 0;
        background: blue;
        color: white;
        padding: 2px 4px;
        font-size: 10px;
        z-index: 9999;
      }
      ` : ''}
    `;
    }
    emit(event, ...args) {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            listeners.forEach(listener => {
                try {
                    listener(...args);
                }
                catch (error) {
                    console.error(`Error in RTLManager ${event} listener:`, error);
                }
            });
        }
    }
    initializeEventMaps() {
        const events = [
            'direction-changed',
            'rtl-toggle'
        ];
        events.forEach(event => {
            this.eventListeners.set(event, []);
        });
    }
}
//# sourceMappingURL=RTLManager.js.map