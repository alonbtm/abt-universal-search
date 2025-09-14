/**
 * AccessibilityManager - WCAG 2.1 AA compliance and accessibility management
 * @description Comprehensive accessibility manager with ARIA management, validation, and compliance checking
 */
import type { AccessibilityConfig, AccessibilityEvents, AccessibilityValidationResult, AccessibilityMetrics, ARIAAttributes, ARIARole, AssistiveTechnologyDetection, ScreenReaderAnnouncement } from '../types/Accessibility';
/**
 * AccessibilityManager - Comprehensive WCAG 2.1 compliance management
 */
export declare class AccessibilityManager {
    private readonly config;
    private readonly eventListeners;
    private validationResults;
    private assistiveTechnology;
    private isInitialized;
    private validationTimer;
    private announceTimeout;
    constructor(config?: Partial<AccessibilityConfig>);
    /**
     * Initialize the accessibility manager
     */
    init(): Promise<void>;
    /**
     * Validate WCAG 2.1 compliance for given element
     */
    validateWCAG(element?: HTMLElement): Promise<AccessibilityValidationResult>;
    /**
     * Apply ARIA attributes to element
     */
    applyARIAAttributes(element: HTMLElement, attributes: ARIAAttributes): void;
    /**
     * Set ARIA role for element
     */
    setARIARole(element: HTMLElement, role: ARIARole): void;
    /**
     * Announce message to screen readers
     */
    announceToScreenReader(announcement: ScreenReaderAnnouncement): void;
    /**
     * Get accessibility metrics for element
     */
    getAccessibilityMetrics(element?: HTMLElement): AccessibilityMetrics;
    /**
     * Detect assistive technology
     */
    detectAssistiveTechnology(): AssistiveTechnologyDetection;
    /**
     * Add event listener
     */
    on<K extends keyof AccessibilityEvents>(event: K, handler: AccessibilityEvents[K]): void;
    /**
     * Remove event listener
     */
    off<K extends keyof AccessibilityEvents>(event: K, handler: AccessibilityEvents[K]): void;
    /**
     * Destroy accessibility manager and cleanup resources
     */
    destroy(): void;
    private initializeEventMaps;
    private setupLiveRegions;
    private removeLiveRegions;
    private getLiveRegion;
    private applyAccessibilityEnhancements;
    private startAutomatedValidation;
    private validateSemanticHTML;
    private validateARIAAttributes;
    private validateColorContrast;
    private validateKeyboardAccessibility;
    private validateFocusManagement;
    private determineComplianceLevel;
    private detectScreenReader;
    private getScreenReaderName;
    private detectVoiceControl;
    private detectSwitchNavigation;
    private detectHighContrastMode;
    private detectReducedMotion;
    private detectTouchSupport;
    private detectKeyboardOnly;
    private hasAccessibilityAttributes;
    private isKeyboardNavigable;
    private hasTextContent;
    private getContrastRatio;
    private emit;
}
//# sourceMappingURL=AccessibilityManager.d.ts.map