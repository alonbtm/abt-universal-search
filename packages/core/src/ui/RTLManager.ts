/**
 * RTL Manager
 * Comprehensive right-to-left layout support with mirrored positioning
 */

import { ValidationError } from '../utils/validation';
import { 
  isRTLLocale, 
  detectTextDirection, 
  calculateRTLPosition,
  toLogicalProperties,
  supportsLogicalProperties
} from '../utils/internationalization';
import type {
  RTLConfig,
  TextDirection,
  LocaleCode,
  RTLDetectionResult,
  LayoutMeasurement,
  RTLPosition,
  InternationalizationEvents
} from '../types/Internationalization';

/**
 * RTL layout management with automatic detection and mirrored positioning
 */
export class RTLManager {
  private config: RTLConfig;
  private currentDirection: TextDirection = 'ltr';
  private isInitialized = false;
  private observers: ResizeObserver[] = [];
  private mutationObserver: MutationObserver | null = null;
  private styleSheet: CSSStyleSheet | null = null;
  private eventListeners: Map<keyof InternationalizationEvents, Function[]> = new Map();

  constructor(config: Partial<RTLConfig> = {}) {
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
  public async init(): Promise<void> {
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
    } catch (error) {
      throw new ValidationError(`Failed to initialize RTLManager: ${error}`);
    }
  }

  /**
   * Destroy RTL manager and cleanup resources
   */
  public destroy(): void {
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
  public detectRTL(
    content?: string,
    locale?: LocaleCode,
    element?: HTMLElement
  ): RTLDetectionResult {
    let isRTL = false;
    let source: RTLDetectionResult['source'] = 'fallback';
    let direction: TextDirection = 'ltr';
    let confidence = 0;
    let influencingLocale: LocaleCode | undefined;

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
        direction = dirAttr as TextDirection;
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
  public setDirection(direction: TextDirection): void {
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
  public getDirection(): TextDirection {
    return this.currentDirection;
  }

  /**
   * Check if current direction is RTL
   */
  public isRTL(): boolean {
    return this.currentDirection === 'rtl';
  }

  /**
   * Apply RTL layout to element
   */
  public applyRTLLayout(element: HTMLElement, forceDirection?: TextDirection): void {
    const direction = forceDirection || this.currentDirection;
    const isRTL = direction === 'rtl';

    // Set direction attribute
    element.setAttribute('dir', direction);

    // Add/remove RTL class
    if (isRTL) {
      element.classList.add(this.config.rtlClassName);
    } else {
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
  public removeRTLLayout(element: HTMLElement): void {
    element.removeAttribute('dir');
    element.classList.remove(this.config.rtlClassName);
    
    // Remove mirrored animations
    element.style.removeProperty('animation-direction');
    element.style.removeProperty('transform');
  }

  /**
   * Get RTL-aware positioning for dropdown/popup
   */
  public getDropdownPosition(
    trigger: HTMLElement,
    dropdown: HTMLElement,
    preferredSide: 'start' | 'end' = 'start'
  ): RTLPosition {
    const triggerRect = trigger.getBoundingClientRect();
    const dropdownRect = dropdown.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const isRTL = this.isRTL();

    const measurement: LayoutMeasurement = {
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
    let inlineStart: number;
    
    if (preferredSide === 'start') {
      inlineStart = isRTL ? triggerRect.right - dropdownRect.width : triggerRect.left;
    } else {
      inlineStart = isRTL ? triggerRect.left : triggerRect.right - dropdownRect.width;
    }

    // Ensure dropdown stays within viewport
    if (inlineStart < 0) {
      inlineStart = 0;
    } else if (inlineStart + dropdownRect.width > viewportWidth) {
      inlineStart = viewportWidth - dropdownRect.width;
    }

    return calculateRTLPosition(
      { ...measurement, left: inlineStart, right: inlineStart + dropdownRect.width },
      this.currentDirection,
      viewportWidth
    );
  }

  /**
   * Mirror scroll position for RTL
   */
  public mirrorScrollPosition(element: HTMLElement): void {
    if (!this.isRTL()) return;

    const scrollWidth = element.scrollWidth;
    const clientWidth = element.clientWidth;
    
    // Convert LTR scroll position to RTL
    element.scrollLeft = scrollWidth - clientWidth - Math.abs(element.scrollLeft);
  }

  /**
   * Get mirrored scroll position
   */
  public getMirroredScrollLeft(element: HTMLElement): number {
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
  public applyRTLTransform(element: HTMLElement, transform: string): void {
    if (this.isRTL()) {
      // Mirror transform for RTL
      const mirroredTransform = transform.replace(
        /translateX\(([^)]+)\)/g,
        (match, value) => `translateX(calc(-1 * (${value})))`
      );
      element.style.transform = mirroredTransform;
    } else {
      element.style.transform = transform;
    }
  }

  /**
   * Get directional CSS properties
   */
  public getDirectionalCSS(): Record<string, string> {
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
  public on<K extends keyof InternationalizationEvents>(
    event: K,
    handler: InternationalizationEvents[K]
  ): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(handler);
  }

  /**
   * Remove event listener
   */
  public off<K extends keyof InternationalizationEvents>(
    event: K,
    handler: InternationalizationEvents[K]
  ): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(handler);
      if (index >= 0) {
        listeners.splice(index, 1);
      }
    }
  }

  // Private implementation methods

  private detectInitialDirection(): void {
    if (this.config.forceDirection) {
      this.currentDirection = this.config.forceDirection;
      return;
    }

    // Check document direction
    const documentDir = document.documentElement.getAttribute('dir') as TextDirection;
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

  private applyGlobalDirection(): void {
    // Set direction on document element
    document.documentElement.setAttribute('dir', this.currentDirection);
    
    // Add/remove global RTL class
    if (this.isRTL()) {
      document.documentElement.classList.add(this.config.rtlClassName);
    } else {
      document.documentElement.classList.remove(this.config.rtlClassName);
    }
  }

  private updateAllElements(): void {
    // Update all elements that should inherit direction
    const elements = document.querySelectorAll('[data-rtl-auto]');
    elements.forEach(element => {
      if (element instanceof HTMLElement) {
        this.applyRTLLayout(element);
      }
    });
  }

  private setupMutationObserver(): void {
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

  private applyLogicalProperties(element: HTMLElement): void {
    const computedStyle = getComputedStyle(element);
    const logicalProperties = toLogicalProperties(computedStyle, this.currentDirection);

    Object.entries(logicalProperties).forEach(([property, value]) => {
      element.style.setProperty(property, value);
    });
  }

  private mirrorAnimations(element: HTMLElement): void {
    // Mirror CSS animations for RTL
    const animations = element.getAnimations();
    animations.forEach(animation => {
      if (animation instanceof CSSAnimation) {
        // Reverse animation direction for RTL
        const keyframes = animation.effect as KeyframeEffect;
        if (keyframes) {
          try {
            const currentKeyframes = keyframes.getKeyframes();
            const mirroredKeyframes = currentKeyframes.map(keyframe => ({
              ...keyframe,
              transform: this.mirrorTransformKeyframe(keyframe.transform as string)
            }));
            keyframes.setKeyframes(mirroredKeyframes);
          } catch (error) {
            // Fallback: apply CSS transform
            element.style.animationDirection = 'reverse';
          }
        }
      }
    });
  }

  private mirrorTransformKeyframe(transform: string): string {
    if (!transform || transform === 'none') return transform;

    return transform.replace(
      /translateX\(([^)]+)\)/g,
      (match, value) => `translateX(calc(-1 * (${value})))`
    ).replace(
      /scaleX\(([^)]+)\)/g,
      (match, value) => `scaleX(calc(-1 * (${value})))`
    );
  }

  private injectRTLStyles(): void {
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

  private generateRTLCSS(): string {
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

  private emit<K extends keyof InternationalizationEvents>(
    event: K,
    ...args: Parameters<InternationalizationEvents[K]>
  ): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          (listener as any)(...args);
        } catch (error) {
          console.error(`Error in RTLManager ${event} listener:`, error);
        }
      });
    }
  }

  private initializeEventMaps(): void {
    const events: (keyof InternationalizationEvents)[] = [
      'direction-changed',
      'rtl-toggle'
    ];

    events.forEach(event => {
      this.eventListeners.set(event, []);
    });
  }
}