/**
 * ColorContrastValidator - WCAG 2.1 color contrast compliance validation
 * @description 4.5:1 minimum contrast ratio validation and high contrast mode support
 */
import { ValidationError } from '../utils/validation';
/**
 * WCAG contrast requirements
 */
const WCAG_CONTRAST_LEVELS = {
    'A': { level: 'A', minimumRatio: 3.0, largeTextRatio: 3.0 },
    'AA': { level: 'AA', minimumRatio: 4.5, largeTextRatio: 3.0 },
    'AAA': { level: 'AAA', minimumRatio: 7.0, largeTextRatio: 4.5 }
};
/**
 * ColorContrastValidator - WCAG color contrast validation
 */
export class ColorContrastValidator {
    constructor(config = {}) {
        this.canvas = null;
        this.context = null;
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
    validateElement(element) {
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
        }
        catch (error) {
            console.error('Failed to validate element contrast:', error);
            return null;
        }
    }
    /**
     * Validate contrast between two colors
     */
    validateColors(foreground, background, isLargeText = false) {
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
        }
        catch (error) {
            throw new ValidationError(`Color contrast validation failed: ${error}`);
        }
    }
    /**
     * Validate contrast for entire page or container
     */
    validateContainer(container = document.body) {
        const startTime = Date.now();
        const violations = [];
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
        }
        catch (error) {
            throw new ValidationError(`Container contrast validation failed: ${error}`);
        }
    }
    /**
     * Get suggested color adjustments
     */
    getSuggestedColors(foreground, background, targetRatio = 4.5) {
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
        }
        catch (error) {
            throw new ValidationError(`Failed to get suggested colors: ${error}`);
        }
    }
    /**
     * Apply high contrast theme
     */
    applyHighContrastTheme(container = document.body) {
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
        }
        catch (error) {
            console.error('Failed to apply high contrast theme:', error);
        }
    }
    /**
     * Remove high contrast theme
     */
    removeHighContrastTheme(container = document.body) {
        try {
            const styleElement = document.getElementById('high-contrast-theme');
            if (styleElement) {
                styleElement.remove();
            }
            container.removeAttribute('data-high-contrast');
        }
        catch (error) {
            console.error('Failed to remove high contrast theme:', error);
        }
    }
    /**
     * Detect if system is in high contrast mode
     */
    isHighContrastMode() {
        return window.matchMedia('(prefers-contrast: high)').matches ||
            window.matchMedia('(-ms-high-contrast: active)').matches;
    }
    // Private implementation methods
    initializeCanvas() {
        try {
            if (typeof document !== 'undefined' && typeof HTMLCanvasElement !== 'undefined') {
                this.canvas = document.createElement('canvas');
                this.canvas.width = 1;
                this.canvas.height = 1;
                this.context = this.canvas.getContext('2d');
            }
        }
        catch (error) {
            // Canvas not available (e.g., in test environment), using fallback methods
            this.canvas = null;
            this.context = null;
        }
    }
    isElementTestable(element) {
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
    isFormElement(element) {
        return ['INPUT', 'BUTTON', 'SELECT', 'TEXTAREA'].includes(element.tagName);
    }
    getTextElements(container) {
        const textElements = [];
        const walker = document.createTreeWalker(container, NodeFilter.SHOW_ELEMENT, {
            acceptNode: (node) => {
                const element = node;
                if (this.isElementTestable(element)) {
                    return NodeFilter.FILTER_ACCEPT;
                }
                return NodeFilter.FILTER_SKIP;
            }
        });
        let node = walker.nextNode();
        while (node) {
            textElements.push(node);
            node = walker.nextNode();
        }
        return textElements;
    }
    parseColor(colorString) {
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
        }
        catch (error) {
            console.warn('Failed to parse color:', colorString, error);
            return null;
        }
    }
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }
    rgbToHex(rgb) {
        return '#' +
            Math.round(rgb.r).toString(16).padStart(2, '0') +
            Math.round(rgb.g).toString(16).padStart(2, '0') +
            Math.round(rgb.b).toString(16).padStart(2, '0');
    }
    parseRgbString(rgb) {
        const match = rgb.match(/rgba?\(([^)]+)\)/);
        if (!match)
            return null;
        const values = match[1].split(',').map(v => parseFloat(v.trim()));
        if (values.length < 3)
            return null;
        return {
            r: values[0],
            g: values[1],
            b: values[2],
            a: values[3] !== undefined ? values[3] : 1
        };
    }
    parseHslString(hsl) {
        const match = hsl.match(/hsla?\(([^)]+)\)/);
        if (!match)
            return null;
        const values = match[1].split(',').map(v => parseFloat(v.trim()));
        if (values.length < 3)
            return null;
        return {
            h: values[0],
            s: values[1],
            l: values[2],
            a: values[3] !== undefined ? values[3] : 1
        };
    }
    hslToRgb(hsl) {
        const h = hsl.h / 360;
        const s = hsl.s / 100;
        const l = hsl.l / 100;
        const hue2rgb = (p, q, t) => {
            if (t < 0)
                t += 1;
            if (t > 1)
                t -= 1;
            if (t < 1 / 6)
                return p + (q - p) * 6 * t;
            if (t < 1 / 2)
                return q;
            if (t < 2 / 3)
                return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        };
        let r, g, b;
        if (s === 0) {
            r = g = b = l; // achromatic
        }
        else {
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1 / 3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1 / 3);
        }
        return {
            r: Math.round(r * 255),
            g: Math.round(g * 255),
            b: Math.round(b * 255),
            a: hsl.a
        };
    }
    getNamedColor(name) {
        const namedColors = {
            'black': { r: 0, g: 0, b: 0 },
            'white': { r: 255, g: 255, b: 255 },
            'red': { r: 255, g: 0, b: 0 },
            'green': { r: 0, g: 128, b: 0 },
            'blue': { r: 0, g: 0, b: 255 }
            // Add more as needed
        };
        return namedColors[name.toLowerCase()] || null;
    }
    getBackgroundColor(element) {
        let currentElement = element;
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
    calculateContrastRatio(color1, color2) {
        const lum1 = this.getLuminance(color1);
        const lum2 = this.getLuminance(color2);
        const brightest = Math.max(lum1, lum2);
        const darkest = Math.min(lum1, lum2);
        return (brightest + 0.05) / (darkest + 0.05);
    }
    getLuminance(color) {
        const sRGB = [color.r, color.g, color.b].map(value => {
            const normalized = value / 255;
            return normalized <= 0.03928
                ? normalized / 12.92
                : Math.pow((normalized + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
    }
    isLargeText(element, computedStyle) {
        const fontSize = parseFloat(computedStyle.fontSize);
        const fontWeight = this.parseFontWeight(computedStyle.fontWeight);
        // Large text: 18pt+ or 14pt+ bold
        const isLargeSize = fontSize >= 24; // 18pt ≈ 24px
        const isLargeBold = fontSize >= 18 && fontWeight >= this.config.largeTextBoldWeight; // 14pt ≈ 18px
        return isLargeSize || isLargeBold;
    }
    parseFontWeight(fontWeight) {
        const numericWeight = parseInt(fontWeight);
        if (!isNaN(numericWeight)) {
            return numericWeight;
        }
        const weightMap = {
            'normal': 400,
            'bold': 700,
            'lighter': 300,
            'bolder': 700
        };
        return weightMap[fontWeight] || 400;
    }
    evaluateContrastPasses(ratio, isLargeText) {
        return {
            AA: ratio >= WCAG_CONTRAST_LEVELS.AA.minimumRatio,
            AAA: ratio >= WCAG_CONTRAST_LEVELS.AAA.minimumRatio,
            AALarge: ratio >= WCAG_CONTRAST_LEVELS.AA.largeTextRatio,
            AAALarge: ratio >= WCAG_CONTRAST_LEVELS.AAA.largeTextRatio
        };
    }
    getRequiredContrastRatio(isLargeText) {
        const level = WCAG_CONTRAST_LEVELS[this.config.wcagLevel];
        return isLargeText ? level.largeTextRatio : level.minimumRatio;
    }
    createContrastViolation(result, requiredRatio) {
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
    calculateComplianceScore(tested, violations) {
        if (tested === 0)
            return 100;
        return Math.max(0, Math.round(((tested - violations) / tested) * 100));
    }
    determineComplianceLevel(violations) {
        if (violations.some(v => v.severity === 'critical'))
            return 'A';
        if (violations.some(v => v.severity === 'serious'))
            return 'A';
        return 'AA';
    }
    adjustLuminanceForRatio(color, otherColor, targetRatio, direction) {
        const targetLuminance = this.calculateTargetLuminance(otherColor, targetRatio, direction);
        if (targetLuminance === null)
            return null;
        // Simple luminance adjustment (could be enhanced with more sophisticated color space operations)
        const currentLuminance = this.getLuminance(color);
        const adjustment = targetLuminance - currentLuminance;
        const adjustedColor = {
            r: Math.max(0, Math.min(255, color.r + (adjustment * 255))),
            g: Math.max(0, Math.min(255, color.g + (adjustment * 255))),
            b: Math.max(0, Math.min(255, color.b + (adjustment * 255)))
        };
        return adjustedColor;
    }
    calculateTargetLuminance(otherColor, targetRatio, direction) {
        const otherLuminance = this.getLuminance(otherColor);
        if (direction === 'lighten') {
            const targetLuminance = (otherLuminance + 0.05) * targetRatio - 0.05;
            return targetLuminance <= 1 ? targetLuminance : null;
        }
        else {
            const targetLuminance = (otherLuminance + 0.05) / targetRatio - 0.05;
            return targetLuminance >= 0 ? targetLuminance : null;
        }
    }
}
//# sourceMappingURL=ColorContrastValidator.js.map