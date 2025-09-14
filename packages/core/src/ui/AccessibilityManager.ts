/**
 * AccessibilityManager - WCAG 2.1 AA compliance and accessibility management
 * @description Comprehensive accessibility manager with ARIA management, validation, and compliance checking
 */

import type {
  AccessibilityConfig,
  AccessibilityEvents,
  AccessibilityValidationResult,
  AccessibilityViolation,
  AccessibilityWarning,
  AccessibilityMetrics,
  ARIAAttributes,
  ARIARole,
  WCAGLevel,
  AssistiveTechnologyDetection,
  ScreenReaderAnnouncement
} from '../types/Accessibility';

import { ValidationError } from '../utils/validation';

/**
 * WCAG 2.1 success criteria mapping
 */
const WCAG_CRITERIA = {
  '1.1.1': { level: 'A', name: 'Non-text Content' },
  '1.3.1': { level: 'A', name: 'Info and Relationships' },
  '1.4.3': { level: 'AA', name: 'Contrast (Minimum)' },
  '1.4.6': { level: 'AAA', name: 'Contrast (Enhanced)' },
  '2.1.1': { level: 'A', name: 'Keyboard' },
  '2.1.2': { level: 'A', name: 'No Keyboard Trap' },
  '2.4.3': { level: 'A', name: 'Focus Order' },
  '2.4.7': { level: 'AA', name: 'Focus Visible' },
  '3.2.1': { level: 'A', name: 'On Focus' },
  '4.1.2': { level: 'A', name: 'Name, Role, Value' }
} as const;

/**
 * AccessibilityManager - Comprehensive WCAG 2.1 compliance management
 */
export class AccessibilityManager {
  private readonly config: AccessibilityConfig;
  private readonly eventListeners: Map<keyof AccessibilityEvents, Function[]>;
  
  private validationResults: AccessibilityValidationResult | null = null;
  private assistiveTechnology: AssistiveTechnologyDetection | null = null;
  private isInitialized = false;
  private validationTimer: number | null = null;
  private announceTimeout: number | null = null;

  constructor(config: Partial<AccessibilityConfig> = {}) {
    this.config = {
      wcagLevel: 'AA',
      enableKeyboardNavigation: true,
      enableScreenReaderSupport: true,
      enableFocusManagement: true,
      enableVoiceControl: false,
      enableHighContrastMode: true,
      respectReducedMotion: true,
      enableAutomatedValidation: true,
      validationInterval: 30000, // 30 seconds
      debugMode: false,
      ...config
    };

    this.eventListeners = new Map();
    this.initializeEventMaps();
  }

  /**
   * Initialize the accessibility manager
   */
  public async init(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Detect assistive technology
      this.assistiveTechnology = this.detectAssistiveTechnology();
      
      // Set up ARIA live regions
      this.setupLiveRegions();
      
      // Apply accessibility enhancements
      this.applyAccessibilityEnhancements();
      
      // Start automated validation if enabled
      if (this.config.enableAutomatedValidation) {
        this.startAutomatedValidation();
      }

      this.isInitialized = true;
      
      if (this.config.debugMode) {
        console.log('AccessibilityManager initialized:', {
          config: this.config,
          assistiveTechnology: this.assistiveTechnology
        });
      }
    } catch (error) {
      throw new ValidationError(`Failed to initialize AccessibilityManager: ${error}`);
    }
  }

  /**
   * Validate WCAG 2.1 compliance for given element
   */
  public async validateWCAG(element: HTMLElement = document.body): Promise<AccessibilityValidationResult> {
    const violations: AccessibilityViolation[] = [];
    const warnings: AccessibilityWarning[] = [];
    let score = 100;

    try {
      // Check semantic HTML structure
      const semanticViolations = this.validateSemanticHTML(element);
      violations.push(...semanticViolations);

      // Check ARIA attributes
      const ariaViolations = this.validateARIAAttributes(element);
      violations.push(...ariaViolations);

      // Check color contrast
      const contrastViolations = this.validateColorContrast(element);
      violations.push(...contrastViolations);

      // Check keyboard accessibility
      const keyboardViolations = this.validateKeyboardAccessibility(element);
      violations.push(...keyboardViolations);

      // Check focus management
      const focusViolations = this.validateFocusManagement(element);
      violations.push(...focusViolations);

      // Calculate compliance score
      const totalViolations = violations.length;
      const criticalViolations = violations.filter(v => v.severity === 'critical').length;
      const seriousViolations = violations.filter(v => v.severity === 'serious').length;

      score = Math.max(0, 100 - (criticalViolations * 25) - (seriousViolations * 15) - (totalViolations * 5));

      const result: AccessibilityValidationResult = {
        isCompliant: violations.length === 0,
        level: this.determineComplianceLevel(violations),
        violations,
        warnings,
        score,
        timestamp: new Date()
      };

      this.validationResults = result;
      this.emit('validation-complete', result);

      return result;
    } catch (error) {
      throw new ValidationError(`WCAG validation failed: ${error}`);
    }
  }

  /**
   * Apply ARIA attributes to element
   */
  public applyARIAAttributes(element: HTMLElement, attributes: ARIAAttributes): void {
    try {
      Object.entries(attributes).forEach(([key, value]) => {
        if (value !== undefined) {
          element.setAttribute(key, String(value));
        } else {
          element.removeAttribute(key);
        }
      });

      if (this.config.debugMode) {
        console.log('ARIA attributes applied:', { element, attributes });
      }
    } catch (error) {
      console.error('Failed to apply ARIA attributes:', error);
    }
  }

  /**
   * Set ARIA role for element
   */
  public setARIARole(element: HTMLElement, role: ARIARole): void {
    try {
      element.setAttribute('role', role);
      
      if (this.config.debugMode) {
        console.log('ARIA role set:', { element, role });
      }
    } catch (error) {
      console.error('Failed to set ARIA role:', error);
    }
  }

  /**
   * Announce message to screen readers
   */
  public announceToScreenReader(announcement: ScreenReaderAnnouncement): void {
    if (!this.config.enableScreenReaderSupport) {
      return;
    }

    try {
      const liveRegion = this.getLiveRegion(announcement.liveRegion);
      if (!liveRegion) {
        console.warn('Live region not found for announcement:', announcement);
        return;
      }

      // Clear previous announcement if requested
      if (announcement.clearPrevious) {
        liveRegion.textContent = '';
      }

      // Schedule announcement
      const announceMessage = () => {
        liveRegion.textContent = announcement.message;
        this.emit('screen-reader-announcement', announcement);
        
        if (this.config.debugMode) {
          console.log('Screen reader announcement:', announcement);
        }
      };

      if (announcement.delay && announcement.delay > 0) {
        this.announceTimeout = window.setTimeout(announceMessage, announcement.delay);
      } else {
        announceMessage();
      }
    } catch (error) {
      console.error('Failed to announce to screen reader:', error);
    }
  }

  /**
   * Get accessibility metrics for element
   */
  public getAccessibilityMetrics(element: HTMLElement = document.body): AccessibilityMetrics {
    const startTime = performance.now();

    try {
      const allElements = element.querySelectorAll('*');
      const interactiveElements = element.querySelectorAll(
        'button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"]), [role="button"], [role="link"]'
      );
      
      let accessibleElements = 0;
      let ariaLabeledElements = 0;
      let keyboardNavigableElements = 0;
      let colorContrastCompliantElements = 0;
      let totalContrastRatio = 0;
      let contrastCheckedElements = 0;

      // Analyze each element
      allElements.forEach(el => {
        const htmlEl = el as HTMLElement;
        
        // Check if element has accessibility attributes
        if (this.hasAccessibilityAttributes(htmlEl)) {
          accessibleElements++;
        }

        // Check ARIA labels
        if (htmlEl.getAttribute('aria-label') || 
            htmlEl.getAttribute('aria-labelledby') || 
            htmlEl.getAttribute('aria-describedby')) {
          ariaLabeledElements++;
        }

        // Check keyboard navigability
        if (this.isKeyboardNavigable(htmlEl)) {
          keyboardNavigableElements++;
        }

        // Check color contrast for text elements
        if (this.hasTextContent(htmlEl)) {
          const contrast = this.getContrastRatio(htmlEl);
          if (contrast > 0) {
            totalContrastRatio += contrast;
            contrastCheckedElements++;
            
            if (contrast >= 4.5) { // AA standard
              colorContrastCompliantElements++;
            }
          }
        }
      });

      const endTime = performance.now();
      const violations = this.validationResults?.violations.length || 0;
      const warnings = this.validationResults?.warnings.length || 0;

      return {
        totalElements: allElements.length,
        accessibleElements,
        violationsFound: violations,
        warningsIssued: warnings,
        keyboardNavigableElements,
        ariaLabeledElements,
        colorContrastCompliantElements,
        averageContrastRatio: contrastCheckedElements > 0 ? totalContrastRatio / contrastCheckedElements : 0,
        testDuration: endTime - startTime,
        complianceScore: this.validationResults?.score || 0
      };
    } catch (error) {
      console.error('Failed to get accessibility metrics:', error);
      return {
        totalElements: 0,
        accessibleElements: 0,
        violationsFound: 0,
        warningsIssued: 0,
        keyboardNavigableElements: 0,
        ariaLabeledElements: 0,
        colorContrastCompliantElements: 0,
        averageContrastRatio: 0,
        testDuration: performance.now() - startTime,
        complianceScore: 0
      };
    }
  }

  /**
   * Detect assistive technology
   */
  public detectAssistiveTechnology(): AssistiveTechnologyDetection {
    return {
      screenReader: this.detectScreenReader(),
      screenReaderName: this.getScreenReaderName(),
      voiceControl: this.detectVoiceControl(),
      switchNavigation: this.detectSwitchNavigation(),
      highContrastMode: this.detectHighContrastMode(),
      reducedMotion: this.detectReducedMotion(),
      touchSupport: this.detectTouchSupport(),
      keyboardOnly: this.detectKeyboardOnly()
    };
  }

  /**
   * Add event listener
   */
  public on<K extends keyof AccessibilityEvents>(
    event: K,
    handler: AccessibilityEvents[K]
  ): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(handler);
  }

  /**
   * Remove event listener
   */
  public off<K extends keyof AccessibilityEvents>(
    event: K,
    handler: AccessibilityEvents[K]
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
   * Destroy accessibility manager and cleanup resources
   */
  public destroy(): void {
    try {
      // Clear validation timer
      if (this.validationTimer) {
        clearInterval(this.validationTimer);
        this.validationTimer = null;
      }

      // Clear announcement timeout
      if (this.announceTimeout) {
        clearTimeout(this.announceTimeout);
        this.announceTimeout = null;
      }

      // Remove live regions
      this.removeLiveRegions();

      // Clear event listeners
      this.eventListeners.clear();

      this.isInitialized = false;
    } catch (error) {
      console.error('Failed to destroy AccessibilityManager:', error);
    }
  }

  // Private implementation methods

  private initializeEventMaps(): void {
    const events: (keyof AccessibilityEvents)[] = [
      'focus-change', 'keyboard-navigation', 'screen-reader-announcement',
      'violation-detected', 'voice-command', 'focus-trapped', 'focus-restored'
    ];
    
    events.forEach(event => {
      this.eventListeners.set(event, []);
    });
  }

  private setupLiveRegions(): void {
    // Create ARIA live regions for announcements
    const liveRegions = ['polite', 'assertive'];
    
    liveRegions.forEach(politeness => {
      const existing = document.getElementById(`aria-live-${politeness}`);
      if (!existing) {
        const region = document.createElement('div');
        region.id = `aria-live-${politeness}`;
        region.setAttribute('aria-live', politeness);
        region.setAttribute('aria-atomic', 'true');
        region.style.cssText = `
          position: absolute !important;
          left: -10000px !important;
          width: 1px !important;
          height: 1px !important;
          overflow: hidden !important;
        `;
        document.body.appendChild(region);
      }
    });
  }

  private removeLiveRegions(): void {
    const liveRegions = ['polite', 'assertive'];
    liveRegions.forEach(politeness => {
      const region = document.getElementById(`aria-live-${politeness}`);
      if (region) {
        region.parentNode?.removeChild(region);
      }
    });
  }

  private getLiveRegion(type: string): HTMLElement | null {
    return document.getElementById(`aria-live-${type}`);
  }

  private applyAccessibilityEnhancements(): void {
    // Apply high contrast mode if enabled
    if (this.config.enableHighContrastMode && this.assistiveTechnology?.highContrastMode) {
      document.body.setAttribute('data-high-contrast', 'true');
    }

    // Apply reduced motion preferences
    if (this.config.respectReducedMotion && this.assistiveTechnology?.reducedMotion) {
      document.body.setAttribute('data-reduced-motion', 'true');
    }
  }

  private startAutomatedValidation(): void {
    if (this.validationTimer) {
      return;
    }

    this.validationTimer = window.setInterval(async () => {
      try {
        await this.validateWCAG();
      } catch (error) {
        console.error('Automated validation failed:', error);
      }
    }, this.config.validationInterval);
  }

  private validateSemanticHTML(element: HTMLElement): AccessibilityViolation[] {
    const violations: AccessibilityViolation[] = [];

    // Check for proper heading hierarchy
    const headings = element.querySelectorAll('h1, h2, h3, h4, h5, h6');
    let previousLevel = 0;
    
    headings.forEach(heading => {
      const currentLevel = parseInt(heading.tagName.substring(1));
      if (currentLevel > previousLevel + 1) {
        violations.push({
          id: 'heading-hierarchy',
          description: 'Heading levels should not skip levels',
          criterion: '1.3.1',
          severity: 'moderate',
          elements: [heading as HTMLElement],
          fixSuggestion: 'Use proper heading hierarchy (h1, h2, h3, etc.) without skipping levels',
          helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships.html'
        });
      }
      previousLevel = currentLevel;
    });

    // Check for images without alt text
    const images = element.querySelectorAll('img');
    images.forEach(img => {
      if (!img.hasAttribute('alt') && !img.hasAttribute('aria-label')) {
        violations.push({
          id: 'image-alt',
          description: 'Images must have alternative text',
          criterion: '1.1.1',
          severity: 'serious',
          elements: [img as HTMLElement],
          fixSuggestion: 'Add alt attribute or aria-label to describe the image content',
          helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/non-text-content.html'
        });
      }
    });

    return violations;
  }

  private validateARIAAttributes(element: HTMLElement): AccessibilityViolation[] {
    const violations: AccessibilityViolation[] = [];

    // Check for interactive elements without proper roles
    const interactiveElements = element.querySelectorAll('button, input, select, textarea, a[href]');
    interactiveElements.forEach(el => {
      const htmlEl = el as HTMLElement;
      if (!htmlEl.hasAttribute('aria-label') && 
          !htmlEl.hasAttribute('aria-labelledby') && 
          !htmlEl.textContent?.trim()) {
        violations.push({
          id: 'interactive-no-name',
          description: 'Interactive elements must have accessible names',
          criterion: '4.1.2',
          severity: 'serious',
          elements: [htmlEl],
          fixSuggestion: 'Add aria-label, aria-labelledby, or visible text content',
          helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/name-role-value.html'
        });
      }
    });

    return violations;
  }

  private validateColorContrast(element: HTMLElement): AccessibilityViolation[] {
    const violations: AccessibilityViolation[] = [];
    // Implementation would check color contrast ratios
    // This is a placeholder for the actual contrast checking logic
    return violations;
  }

  private validateKeyboardAccessibility(element: HTMLElement): AccessibilityViolation[] {
    const violations: AccessibilityViolation[] = [];
    
    // Check for focusable elements
    const focusableElements = element.querySelectorAll(
      'button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])'
    );
    
    focusableElements.forEach(el => {
      const htmlEl = el as HTMLElement;
      if (htmlEl.tabIndex < 0 && !htmlEl.hasAttribute('aria-hidden')) {
        violations.push({
          id: 'keyboard-inaccessible',
          description: 'Interactive elements must be keyboard accessible',
          criterion: '2.1.1',
          severity: 'serious',
          elements: [htmlEl],
          fixSuggestion: 'Remove negative tabindex or add aria-hidden="true"',
          helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/keyboard.html'
        });
      }
    });

    return violations;
  }

  private validateFocusManagement(element: HTMLElement): AccessibilityViolation[] {
    const violations: AccessibilityViolation[] = [];
    // Implementation would check focus order and management
    return violations;
  }

  private determineComplianceLevel(violations: AccessibilityViolation[]): WCAGLevel {
    const hasCriticalViolations = violations.some(v => v.severity === 'critical');
    const hasSeriousViolations = violations.some(v => v.severity === 'serious');
    
    if (hasCriticalViolations) return 'A';
    if (hasSeriousViolations) return 'A';
    return 'AA';
  }

  private detectScreenReader(): boolean {
    // Check for screen reader indicators
    return !!(
      navigator.userAgent.includes('NVDA') ||
      navigator.userAgent.includes('JAWS') ||
      window.speechSynthesis ||
      'accessibility' in window
    );
  }

  private getScreenReaderName(): string | undefined {
    if (navigator.userAgent.includes('NVDA')) return 'NVDA';
    if (navigator.userAgent.includes('JAWS')) return 'JAWS';
    return undefined;
  }

  private detectVoiceControl(): boolean {
    return !!(window.speechSynthesis && window.webkitSpeechRecognition);
  }

  private detectSwitchNavigation(): boolean {
    // Check for switch navigation indicators
    return false; // Placeholder implementation
  }

  private detectHighContrastMode(): boolean {
    return window.matchMedia('(prefers-contrast: high)').matches;
  }

  private detectReducedMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  private detectTouchSupport(): boolean {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }

  private detectKeyboardOnly(): boolean {
    // This would be enhanced with actual keyboard-only detection logic
    return false;
  }

  private hasAccessibilityAttributes(element: HTMLElement): boolean {
    const accessibilityAttributes = [
      'aria-label', 'aria-labelledby', 'aria-describedby', 'role',
      'aria-expanded', 'aria-selected', 'aria-checked', 'aria-disabled'
    ];
    
    return accessibilityAttributes.some(attr => element.hasAttribute(attr));
  }

  private isKeyboardNavigable(element: HTMLElement): boolean {
    return element.tabIndex >= 0 || element.matches('button, input, select, textarea, a[href]');
  }

  private hasTextContent(element: HTMLElement): boolean {
    return !!(element.textContent && element.textContent.trim());
  }

  private getContrastRatio(element: HTMLElement): number {
    // Placeholder for contrast ratio calculation
    // Would use actual color analysis
    return 4.5;
  }

  private emit<K extends keyof AccessibilityEvents>(
    event: K,
    ...args: Parameters<AccessibilityEvents[K]>
  ): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          (listener as any)(...args);
        } catch (error) {
          console.error(`Error in AccessibilityManager ${event} listener:`, error);
        }
      });
    }
  }
}