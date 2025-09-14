/**
 * ColorContrastValidator - WCAG 2.1 color contrast compliance validation
 * @description 4.5:1 minimum contrast ratio validation and high contrast mode support
 */

import type {
  ColorContrastResult,
  ColorContrastLevel,
  WCAGLevel,
  AccessibilityValidationResult,
  AccessibilityViolation
} from '../types/Accessibility';

import { ValidationError } from '../utils/validation';

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
  customColorPairs: Array<{ foreground: string; background: string }>;
}

/**
 * WCAG contrast requirements
 */
const WCAG_CONTRAST_LEVELS: Record<WCAGLevel, ColorContrastLevel> = {
  'A': { level: 'A', minimumRatio: 3.0, largeTextRatio: 3.0 },
  'AA': { level: 'AA', minimumRatio: 4.5, largeTextRatio: 3.0 },
  'AAA': { level: 'AAA', minimumRatio: 7.0, largeTextRatio: 4.5 }
};

/**
 * ColorContrastValidator - WCAG color contrast validation
 */
export class ColorContrastValidator {
  private readonly config: ContrastValidationConfig;
  private canvas: HTMLCanvasElement | null = null;
  private context: CanvasRenderingContext2D | null = null;

  constructor(config: Partial<ContrastValidationConfig> = {}) {
    this.config = {
      wcagLevel: 'AA',
      includeLargeText: true,
      largeTextMinSize: 18,
      largeTextBoldWeight: 700,
      includeNonText: true,
      skipInvisible: true,
      customColorPairs: [],
      ...config
    };

    this.initializeCanvas();
  }

  /**
   * Validate color contrast for element
   */
  public validateElement(element: HTMLElement): ContrastTestResult | null {
    try {
      if (!this.isElementTestable(element)) {
        return null;
      }

      const computedStyle = window.getComputedStyle(element);
      const foregroundColor = this.parseColor(computedStyle.color);
      const backgroundColor = this.getBackgroundColor(element);

      if (!foregroundColor || !backgroundColor) {
        return null;
      }

      const contrastRatio = this.calculateContrastRatio(foregroundColor, backgroundColor);
      const isLargeText = this.isLargeText(element, computedStyle);
      const fontSize = parseFloat(computedStyle.fontSize);
      const fontWeight = this.parseFontWeight(computedStyle.fontWeight);

      const passes = this.evaluateContrastPasses(contrastRatio, isLargeText);

      return {
        element,
        foregroundColor,
        backgroundColor,
        contrastRatio,
        passes,
        isLargeText,
        fontSize,
        fontWeight
      };
    } catch (error) {
      console.error('Failed to validate element contrast:', error);
      return null;
    }
  }

  /**
   * Validate contrast between two colors
   */
  public validateColors(
    foreground: string, 
    background: string, 
    isLargeText: boolean = false
  ): ColorContrastResult {
    try {
      const fgColor = this.parseColor(foreground);
      const bgColor = this.parseColor(background);

      if (!fgColor || !bgColor) {
        throw new ValidationError('Invalid color format provided');
      }

      const ratio = this.calculateContrastRatio(fgColor, bgColor);
      const passes = this.evaluateContrastPasses(ratio, isLargeText);

      return {
        ratio,
        passesAA: passes.AA || (isLargeText && passes.AALarge),
        passesAAA: passes.AAA || (isLargeText && passes.AAALarge),
        foregroundColor: foreground,
        backgroundColor: background,
        isLargeText
      };
    } catch (error) {
      throw new ValidationError(`Color contrast validation failed: ${error}`);
    }
  }

  /**
   * Validate contrast for entire page or container
   */
  public validateContainer(container: HTMLElement = document.body): AccessibilityValidationResult {
    const startTime = Date.now();
    const violations: AccessibilityViolation[] = [];
    let totalElements = 0;
    let testedElements = 0;

    try {
      // Get all elements with text content
      const textElements = this.getTextElements(container);
      totalElements = textElements.length;

      textElements.forEach(element => {
        const result = this.validateElement(element);
        if (result) {
          testedElements++;
          
          const requiredRatio = this.getRequiredContrastRatio(result.isLargeText);
          
          if (result.contrastRatio < requiredRatio) {
            violations.push(this.createContrastViolation(result, requiredRatio));
          }
        }
      });

      // Test custom color pairs
      this.config.customColorPairs.forEach(pair => {
        const result = this.validateColors(pair.foreground, pair.background);
        if (!result.passesAA) {
          violations.push({
            id: 'custom-color-contrast',
            description: `Custom color pair has insufficient contrast: ${result.ratio.toFixed(2)}:1`,
            criterion: '1.4.3',
            severity: 'serious',
            elements: [],
            fixSuggestion: 'Adjust colors to meet minimum contrast ratio requirements',
            helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html'
          });
        }
      });

      const score = this.calculateComplianceScore(testedElements, violations.length);
      const level = this.determineComplianceLevel(violations);

      return {
        isCompliant: violations.length === 0,
        level,
        violations,
        warnings: [],
        score,
        timestamp: new Date()
      };
    } catch (error) {
      throw new ValidationError(`Container contrast validation failed: ${error}`);
    }
  }

  /**
   * Get suggested color adjustments
   */
  public getSuggestedColors(
    foreground: string,
    background: string,
    targetRatio: number = 4.5
  ): { foreground: string; background: string; ratio: number } {
    try {
      const fgColor = this.parseColor(foreground);
      const bgColor = this.parseColor(background);

      if (!fgColor || !bgColor) {
        throw new ValidationError('Invalid color format');
      }

      // Try adjusting luminance of foreground first
      let adjustedFg = this.adjustLuminanceForRatio(fgColor, bgColor, targetRatio, 'darken');
      if (!adjustedFg) {
        adjustedFg = this.adjustLuminanceForRatio(fgColor, bgColor, targetRatio, 'lighten');
      }

      if (adjustedFg) {
        const newRatio = this.calculateContrastRatio(adjustedFg, bgColor);
        return {
          foreground: this.rgbToHex(adjustedFg),
          background,
          ratio: newRatio
        };
      }

      // Try adjusting background
      let adjustedBg = this.adjustLuminanceForRatio(bgColor, fgColor, targetRatio, 'lighten');
      if (!adjustedBg) {
        adjustedBg = this.adjustLuminanceForRatio(bgColor, fgColor, targetRatio, 'darken');
      }

      if (adjustedBg) {
        const newRatio = this.calculateContrastRatio(fgColor, adjustedBg);
        return {
          foreground,
          background: this.rgbToHex(adjustedBg),
          ratio: newRatio
        };
      }

      // Fallback to high contrast colors
      return {
        foreground: '#000000',
        background: '#ffffff',
        ratio: 21
      };
    } catch (error) {
      throw new ValidationError(`Failed to get suggested colors: ${error}`);
    }
  }

  /**
   * Apply high contrast theme
   */
  public applyHighContrastTheme(container: HTMLElement = document.body): void {
    try {
      // Create high contrast CSS
      const highContrastCSS = `
        [data-high-contrast="true"] {
          background-color: white !important;
          color: black !important;
        }
        
        [data-high-contrast="true"] a:link {
          color: #0000EE !important;
        }
        
        [data-high-contrast="true"] a:visited {
          color: #551A8B !important;
        }
        
        [data-high-contrast="true"] button,
        [data-high-contrast="true"] input,
        [data-high-contrast="true"] select,
        [data-high-contrast="true"] textarea {
          background-color: white !important;
          color: black !important;
          border: 2px solid black !important;
        }
        
        [data-high-contrast="true"] button:focus,
        [data-high-contrast="true"] input:focus,
        [data-high-contrast="true"] select:focus,
        [data-high-contrast="true"] textarea:focus {
          outline: 3px solid #0000EE !important;
        }
      `;

      // Inject CSS if not already present
      let styleElement = document.getElementById('high-contrast-theme');
      if (!styleElement) {
        styleElement = document.createElement('style');
        styleElement.id = 'high-contrast-theme';
        document.head.appendChild(styleElement);
      }
      
      styleElement.textContent = highContrastCSS;
      
      // Apply high contrast attribute
      container.setAttribute('data-high-contrast', 'true');
    } catch (error) {
      console.error('Failed to apply high contrast theme:', error);
    }
  }

  /**
   * Remove high contrast theme
   */
  public removeHighContrastTheme(container: HTMLElement = document.body): void {
    try {
      const styleElement = document.getElementById('high-contrast-theme');
      if (styleElement) {
        styleElement.remove();
      }
      
      container.removeAttribute('data-high-contrast');
    } catch (error) {
      console.error('Failed to remove high contrast theme:', error);
    }
  }

  /**
   * Detect if system is in high contrast mode
   */
  public isHighContrastMode(): boolean {
    return window.matchMedia('(prefers-contrast: high)').matches ||
           window.matchMedia('(-ms-high-contrast: active)').matches;
  }

  // Private implementation methods

  private initializeCanvas(): void {
    try {
      if (typeof document !== 'undefined' && typeof HTMLCanvasElement !== 'undefined') {
        this.canvas = document.createElement('canvas');
        this.canvas.width = 1;
        this.canvas.height = 1;
        this.context = this.canvas.getContext('2d');
      }
    } catch (error) {
      // Canvas not available (e.g., in test environment), using fallback methods
      this.canvas = null;
      this.context = null;
    }
  }

  private isElementTestable(element: HTMLElement): boolean {
    if (this.config.skipInvisible) {
      const style = window.getComputedStyle(element);
      if (style.display === 'none' || 
          style.visibility === 'hidden' || 
          style.opacity === '0') {
        return false;
      }

      const rect = element.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) {
        return false;
      }
    }

    // Check if element has text content or is a form element
    return !!(element.textContent?.trim() || this.isFormElement(element));
  }

  private isFormElement(element: HTMLElement): boolean {
    return ['INPUT', 'BUTTON', 'SELECT', 'TEXTAREA'].includes(element.tagName);
  }

  private getTextElements(container: HTMLElement): HTMLElement[] {
    const textElements: HTMLElement[] = [];
    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_ELEMENT,
      {
        acceptNode: (node) => {
          const element = node as HTMLElement;
          if (this.isElementTestable(element)) {
            return NodeFilter.FILTER_ACCEPT;
          }
          return NodeFilter.FILTER_SKIP;
        }
      }
    );

    let node = walker.nextNode();
    while (node) {
      textElements.push(node as HTMLElement);
      node = walker.nextNode();
    }

    return textElements;
  }

  private parseColor(colorString: string): RGBColor | null {
    try {
      // Try canvas method first
      if (this.context) {
        this.context.fillStyle = colorString;
        const canvasColor = this.context.fillStyle;
        
        if (canvasColor.startsWith('#')) {
          return this.hexToRgb(canvasColor);
        }
      }

      // Fallback parsing methods
      if (colorString.startsWith('#')) {
        return this.hexToRgb(colorString);
      }

      if (colorString.startsWith('rgb')) {
        return this.parseRgbString(colorString);
      }

      if (colorString.startsWith('hsl')) {
        const hslColor = this.parseHslString(colorString);
        return hslColor ? this.hslToRgb(hslColor) : null;
      }

      // Named colors fallback
      return this.getNamedColor(colorString);
    } catch (error) {
      console.warn('Failed to parse color:', colorString, error);
      return null;
    }
  }

  private hexToRgb(hex: string): RGBColor | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  private rgbToHex(rgb: RGBColor): string {
    return '#' + 
      Math.round(rgb.r).toString(16).padStart(2, '0') +
      Math.round(rgb.g).toString(16).padStart(2, '0') +
      Math.round(rgb.b).toString(16).padStart(2, '0');
  }

  private parseRgbString(rgb: string): RGBColor | null {
    const match = rgb.match(/rgba?\(([^)]+)\)/);
    if (!match) return null;

    const values = match[1].split(',').map(v => parseFloat(v.trim()));
    if (values.length < 3) return null;

    return {
      r: values[0],
      g: values[1],
      b: values[2],
      a: values[3] !== undefined ? values[3] : 1
    };
  }

  private parseHslString(hsl: string): HSLColor | null {
    const match = hsl.match(/hsla?\(([^)]+)\)/);
    if (!match) return null;

    const values = match[1].split(',').map(v => parseFloat(v.trim()));
    if (values.length < 3) return null;

    return {
      h: values[0],
      s: values[1],
      l: values[2],
      a: values[3] !== undefined ? values[3] : 1
    };
  }

  private hslToRgb(hsl: HSLColor): RGBColor {
    const h = hsl.h / 360;
    const s = hsl.s / 100;
    const l = hsl.l / 100;

    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    let r, g, b;

    if (s === 0) {
      r = g = b = l; // achromatic
    } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }

    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255),
      a: hsl.a
    };
  }

  private getNamedColor(name: string): RGBColor | null {
    const namedColors: Record<string, RGBColor> = {
      'black': { r: 0, g: 0, b: 0 },
      'white': { r: 255, g: 255, b: 255 },
      'red': { r: 255, g: 0, b: 0 },
      'green': { r: 0, g: 128, b: 0 },
      'blue': { r: 0, g: 0, b: 255 }
      // Add more as needed
    };

    return namedColors[name.toLowerCase()] || null;
  }

  private getBackgroundColor(element: HTMLElement): RGBColor | null {
    let currentElement: HTMLElement | null = element;

    while (currentElement && currentElement !== document.body) {
      const style = window.getComputedStyle(currentElement);
      const backgroundColor = this.parseColor(style.backgroundColor);

      if (backgroundColor && backgroundColor.a !== 0) {
        return backgroundColor;
      }

      currentElement = currentElement.parentElement;
    }

    // Default to white background
    return { r: 255, g: 255, b: 255 };
  }

  private calculateContrastRatio(color1: RGBColor, color2: RGBColor): number {
    const lum1 = this.getLuminance(color1);
    const lum2 = this.getLuminance(color2);
    
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);
    
    return (brightest + 0.05) / (darkest + 0.05);
  }

  private getLuminance(color: RGBColor): number {
    const sRGB = [color.r, color.g, color.b].map(value => {
      const normalized = value / 255;
      return normalized <= 0.03928
        ? normalized / 12.92
        : Math.pow((normalized + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
  }

  private isLargeText(element: HTMLElement, computedStyle: CSSStyleDeclaration): boolean {
    const fontSize = parseFloat(computedStyle.fontSize);
    const fontWeight = this.parseFontWeight(computedStyle.fontWeight);

    // Large text: 18pt+ or 14pt+ bold
    const isLargeSize = fontSize >= 24; // 18pt ≈ 24px
    const isLargeBold = fontSize >= 18 && fontWeight >= this.config.largeTextBoldWeight; // 14pt ≈ 18px

    return isLargeSize || isLargeBold;
  }

  private parseFontWeight(fontWeight: string): number {
    const numericWeight = parseInt(fontWeight);
    if (!isNaN(numericWeight)) {
      return numericWeight;
    }

    const weightMap: Record<string, number> = {
      'normal': 400,
      'bold': 700,
      'lighter': 300,
      'bolder': 700
    };

    return weightMap[fontWeight] || 400;
  }

  private evaluateContrastPasses(ratio: number, isLargeText: boolean) {
    return {
      AA: ratio >= WCAG_CONTRAST_LEVELS.AA.minimumRatio,
      AAA: ratio >= WCAG_CONTRAST_LEVELS.AAA.minimumRatio,
      AALarge: ratio >= WCAG_CONTRAST_LEVELS.AA.largeTextRatio,
      AAALarge: ratio >= WCAG_CONTRAST_LEVELS.AAA.largeTextRatio
    };
  }

  private getRequiredContrastRatio(isLargeText: boolean): number {
    const level = WCAG_CONTRAST_LEVELS[this.config.wcagLevel];
    return isLargeText ? level.largeTextRatio : level.minimumRatio;
  }

  private createContrastViolation(result: ContrastTestResult, requiredRatio: number): AccessibilityViolation {
    return {
      id: 'color-contrast-insufficient',
      description: `Insufficient color contrast: ${result.contrastRatio.toFixed(2)}:1 (requires ${requiredRatio}:1)`,
      criterion: '1.4.3',
      severity: result.contrastRatio < 3.0 ? 'critical' : 'serious',
      elements: [result.element],
      fixSuggestion: `Adjust colors to achieve minimum ${requiredRatio}:1 contrast ratio`,
      helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html'
    };
  }

  private calculateComplianceScore(tested: number, violations: number): number {
    if (tested === 0) return 100;
    return Math.max(0, Math.round(((tested - violations) / tested) * 100));
  }

  private determineComplianceLevel(violations: AccessibilityViolation[]): WCAGLevel {
    if (violations.some(v => v.severity === 'critical')) return 'A';
    if (violations.some(v => v.severity === 'serious')) return 'A';
    return 'AA';
  }

  private adjustLuminanceForRatio(
    color: RGBColor, 
    otherColor: RGBColor, 
    targetRatio: number, 
    direction: 'lighten' | 'darken'
  ): RGBColor | null {
    const targetLuminance = this.calculateTargetLuminance(otherColor, targetRatio, direction);
    if (targetLuminance === null) return null;

    // Simple luminance adjustment (could be enhanced with more sophisticated color space operations)
    const currentLuminance = this.getLuminance(color);
    const adjustment = targetLuminance - currentLuminance;

    const adjustedColor: RGBColor = {
      r: Math.max(0, Math.min(255, color.r + (adjustment * 255))),
      g: Math.max(0, Math.min(255, color.g + (adjustment * 255))),
      b: Math.max(0, Math.min(255, color.b + (adjustment * 255)))
    };

    return adjustedColor;
  }

  private calculateTargetLuminance(
    otherColor: RGBColor, 
    targetRatio: number, 
    direction: 'lighten' | 'darken'
  ): number | null {
    const otherLuminance = this.getLuminance(otherColor);
    
    if (direction === 'lighten') {
      const targetLuminance = (otherLuminance + 0.05) * targetRatio - 0.05;
      return targetLuminance <= 1 ? targetLuminance : null;
    } else {
      const targetLuminance = (otherLuminance + 0.05) / targetRatio - 0.05;
      return targetLuminance >= 0 ? targetLuminance : null;
    }
  }
}