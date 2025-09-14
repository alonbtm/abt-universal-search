/**
 * ColorContrastValidator - WCAG 2.1 color contrast compliance validation
 * @description 4.5:1 minimum contrast ratio validation and high contrast mode support
 */
import type { ColorContrastResult, WCAGLevel, AccessibilityValidationResult } from '../types/Accessibility';
/**
 * RGB color values
 */
export interface RGBColor {
    r: number;
    g: number;
    b: number;
    a?: number;
}
/**
 * HSL color values
 */
export interface HSLColor {
    h: number;
    s: number;
    l: number;
    a?: number;
}
/**
 * Color contrast test result
 */
export interface ContrastTestResult {
    element: HTMLElement;
    foregroundColor: RGBColor;
    backgroundColor: RGBColor;
    contrastRatio: number;
    passes: {
        AA: boolean;
        AAA: boolean;
        AALarge: boolean;
        AAALarge: boolean;
    };
    isLargeText: boolean;
    fontSize: number;
    fontWeight: number;
}
/**
 * Color contrast validation configuration
 */
export interface ContrastValidationConfig {
    /** Target WCAG level */
    wcagLevel: WCAGLevel;
    /** Include large text exceptions */
    includeLargeText: boolean;
    /** Minimum font size for large text (px) */
    largeTextMinSize: number;
    /** Minimum font weight for large text bold */
    largeTextBoldWeight: number;
    /** Test non-text elements */
    includeNonText: boolean;
    /** Skip invisible elements */
    skipInvisible: boolean;
    /** Custom color pairs to test */
    customColorPairs: Array<{
        foreground: string;
        background: string;
    }>;
}
/**
 * ColorContrastValidator - WCAG color contrast validation
 */
export declare class ColorContrastValidator {
    private readonly config;
    private canvas;
    private context;
    constructor(config?: Partial<ContrastValidationConfig>);
    /**
     * Validate color contrast for element
     */
    validateElement(element: HTMLElement): ContrastTestResult | null;
    /**
     * Validate contrast between two colors
     */
    validateColors(foreground: string, background: string, isLargeText?: boolean): ColorContrastResult;
    /**
     * Validate contrast for entire page or container
     */
    validateContainer(container?: HTMLElement): AccessibilityValidationResult;
    /**
     * Get suggested color adjustments
     */
    getSuggestedColors(foreground: string, background: string, targetRatio?: number): {
        foreground: string;
        background: string;
        ratio: number;
    };
    /**
     * Apply high contrast theme
     */
    applyHighContrastTheme(container?: HTMLElement): void;
    /**
     * Remove high contrast theme
     */
    removeHighContrastTheme(container?: HTMLElement): void;
    /**
     * Detect if system is in high contrast mode
     */
    isHighContrastMode(): boolean;
    private initializeCanvas;
    private isElementTestable;
    private isFormElement;
    private getTextElements;
    private parseColor;
    private hexToRgb;
    private rgbToHex;
    private parseRgbString;
    private parseHslString;
    private hslToRgb;
    private getNamedColor;
    private getBackgroundColor;
    private calculateContrastRatio;
    private getLuminance;
    private isLargeText;
    private parseFontWeight;
    private evaluateContrastPasses;
    private getRequiredContrastRatio;
    private createContrastViolation;
    private calculateComplianceScore;
    private determineComplianceLevel;
    private adjustLuminanceForRatio;
    private calculateTargetLuminance;
}
//# sourceMappingURL=ColorContrastValidator.d.ts.map