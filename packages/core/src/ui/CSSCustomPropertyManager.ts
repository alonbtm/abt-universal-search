/**
 * CSS Custom Property Manager
 * Comprehensive system for managing CSS custom properties with validation and fallbacks
 */

import { ValidationError } from '../utils/validation';
import type {
  CSSCustomProperty,
  CSSCustomProperties,
  CSSValidationResult,
  ThemingEvents
} from '../types/Theming';

/**
 * CSS custom property validator
 */
interface PropertyValidator {
  /** Validation function */
  validate: (value: string) => boolean;
  /** Error message */
  message: string;
  /** Suggested fixes */
  suggestions?: string[];
}

/**
 * CSS custom property configuration
 */
export interface CSSCustomPropertyConfig {
  /** CSS prefix for custom properties */
  prefix: string;
  /** Enable validation */
  enableValidation: boolean;
  /** Include fallback values */
  includeFallbacks: boolean;
  /** Auto-generate CSS */
  autoGenerateCSS: boolean;
  /** CSS injection target */
  injectionTarget: 'head' | 'document' | HTMLElement;
  /** Enable debugging */
  debug: boolean;
}

/**
 * Comprehensive CSS custom property management with validation and fallbacks
 */
export class CSSCustomPropertyManager {
  private config: CSSCustomPropertyConfig;
  private properties: Map<string, CSSCustomProperty> = new Map();
  private validators: Map<string, PropertyValidator> = new Map();
  private eventListeners: Map<keyof ThemingEvents, Function[]> = new Map();
  private isInitialized = false;
  private styleElement: HTMLStyleElement | null = null;

  // Property validators
  private readonly builtInValidators: Map<string, PropertyValidator> = new Map([
    ['color', {
      validate: (value: string) => this.isValidColor(value),
      message: 'Invalid color value',
      suggestions: ['Use hex (#000000), rgb(0,0,0), hsl(0,0%,0%), or named colors']
    }],
    ['length', {
      validate: (value: string) => this.isValidLength(value),
      message: 'Invalid length value',
      suggestions: ['Use px, em, rem, %, vh, vw, or other valid CSS length units']
    }],
    ['number', {
      validate: (value: string) => this.isValidNumber(value),
      message: 'Invalid number value',
      suggestions: ['Use valid numeric values (integers or decimals)']
    }],
    ['percentage', {
      validate: (value: string) => this.isValidPercentage(value),
      message: 'Invalid percentage value',
      suggestions: ['Use values like 50%, 100%, etc.']
    }],
    ['shadow', {
      validate: (value: string) => this.isValidShadow(value),
      message: 'Invalid shadow value',
      suggestions: ['Use format: offset-x offset-y blur-radius spread-radius color']
    }],
    ['font-family', {
      validate: (value: string) => this.isValidFontFamily(value),
      message: 'Invalid font family value',
      suggestions: ['Use quoted font names or valid CSS font family values']
    }],
    ['timing-function', {
      validate: (value: string) => this.isValidTimingFunction(value),
      message: 'Invalid timing function',
      suggestions: ['Use ease, linear, ease-in, ease-out, ease-in-out, or cubic-bezier()']
    }]
  ]);

  // Default CSS custom properties
  private readonly defaultProperties: CSSCustomProperties = {
    // Colors
    '--primary-50': {
      name: '--primary-50',
      value: '#f0f9ff',
      fallback: '#f8fafc',
      description: 'Primary color - lightest shade',
      category: 'color'
    },
    '--primary-500': {
      name: '--primary-500',
      value: '#3b82f6',
      fallback: '#3b82f6',
      description: 'Primary color - main shade',
      category: 'color'
    },
    '--primary-900': {
      name: '--primary-900',
      value: '#1e3a8a',
      fallback: '#1e40af',
      description: 'Primary color - darkest shade',
      category: 'color'
    },
    
    // Text colors
    '--text-primary': {
      name: '--text-primary',
      value: '#1f2937',
      fallback: '#000000',
      description: 'Primary text color',
      category: 'color'
    },
    '--text-secondary': {
      name: '--text-secondary',
      value: '#6b7280',
      fallback: '#666666',
      description: 'Secondary text color',
      category: 'color'
    },
    
    // Background colors
    '--bg-primary': {
      name: '--bg-primary',
      value: '#ffffff',
      fallback: '#ffffff',
      description: 'Primary background color',
      category: 'color'
    },
    '--bg-secondary': {
      name: '--bg-secondary',
      value: '#f9fafb',
      fallback: '#f5f5f5',
      description: 'Secondary background color',
      category: 'color'
    },
    
    // Border colors
    '--border-primary': {
      name: '--border-primary',
      value: '#d1d5db',
      fallback: '#cccccc',
      description: 'Primary border color',
      category: 'color'
    },
    
    // Spacing
    '--spacing-xs': {
      name: '--spacing-xs',
      value: '0.25rem',
      fallback: '4px',
      description: 'Extra small spacing',
      category: 'spacing'
    },
    '--spacing-sm': {
      name: '--spacing-sm',
      value: '0.5rem',
      fallback: '8px',
      description: 'Small spacing',
      category: 'spacing'
    },
    '--spacing-md': {
      name: '--spacing-md',
      value: '1rem',
      fallback: '16px',
      description: 'Medium spacing',
      category: 'spacing'
    },
    '--spacing-lg': {
      name: '--spacing-lg',
      value: '1.5rem',
      fallback: '24px',
      description: 'Large spacing',
      category: 'spacing'
    },
    '--spacing-xl': {
      name: '--spacing-xl',
      value: '2rem',
      fallback: '32px',
      description: 'Extra large spacing',
      category: 'spacing'
    },
    
    // Typography
    '--font-family-primary': {
      name: '--font-family-primary',
      value: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
      fallback: 'Arial, sans-serif',
      description: 'Primary font family',
      category: 'typography'
    },
    '--font-size-xs': {
      name: '--font-size-xs',
      value: '0.75rem',
      fallback: '12px',
      description: 'Extra small font size',
      category: 'typography'
    },
    '--font-size-sm': {
      name: '--font-size-sm',
      value: '0.875rem',
      fallback: '14px',
      description: 'Small font size',
      category: 'typography'
    },
    '--font-size-base': {
      name: '--font-size-base',
      value: '1rem',
      fallback: '16px',
      description: 'Base font size',
      category: 'typography'
    },
    '--font-size-lg': {
      name: '--font-size-lg',
      value: '1.125rem',
      fallback: '18px',
      description: 'Large font size',
      category: 'typography'
    },
    '--font-weight-normal': {
      name: '--font-weight-normal',
      value: '400',
      fallback: 'normal',
      description: 'Normal font weight',
      category: 'typography'
    },
    '--font-weight-medium': {
      name: '--font-weight-medium',
      value: '500',
      fallback: '500',
      description: 'Medium font weight',
      category: 'typography'
    },
    '--font-weight-semibold': {
      name: '--font-weight-semibold',
      value: '600',
      fallback: 'bold',
      description: 'Semi-bold font weight',
      category: 'typography'
    },
    '--line-height-tight': {
      name: '--line-height-tight',
      value: '1.25',
      fallback: '1.25',
      description: 'Tight line height',
      category: 'typography'
    },
    '--line-height-normal': {
      name: '--line-height-normal',
      value: '1.5',
      fallback: '1.5',
      description: 'Normal line height',
      category: 'typography'
    },
    
    // Shadows
    '--shadow-sm': {
      name: '--shadow-sm',
      value: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      fallback: '0 1px 2px rgba(0, 0, 0, 0.1)',
      description: 'Small shadow',
      category: 'shadow'
    },
    '--shadow-md': {
      name: '--shadow-md',
      value: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      fallback: '0 4px 6px rgba(0, 0, 0, 0.1)',
      description: 'Medium shadow',
      category: 'shadow'
    },
    '--shadow-lg': {
      name: '--shadow-lg',
      value: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      fallback: '0 10px 15px rgba(0, 0, 0, 0.1)',
      description: 'Large shadow',
      category: 'shadow'
    },
    '--shadow-focus': {
      name: '--shadow-focus',
      value: '0 0 0 3px rgba(59, 130, 246, 0.5)',
      fallback: '0 0 0 3px rgba(59, 130, 246, 0.5)',
      description: 'Focus shadow',
      category: 'shadow'
    },
    
    // Border radius
    '--border-radius-sm': {
      name: '--border-radius-sm',
      value: '0.125rem',
      fallback: '2px',
      description: 'Small border radius',
      category: 'border'
    },
    '--border-radius-md': {
      name: '--border-radius-md',
      value: '0.375rem',
      fallback: '6px',
      description: 'Medium border radius',
      category: 'border'
    },
    '--border-radius-lg': {
      name: '--border-radius-lg',
      value: '0.5rem',
      fallback: '8px',
      description: 'Large border radius',
      category: 'border'
    },
    
    // Animations
    '--transition-duration-fast': {
      name: '--transition-duration-fast',
      value: '150ms',
      fallback: '150ms',
      description: 'Fast transition duration',
      category: 'animation'
    },
    '--transition-duration-normal': {
      name: '--transition-duration-normal',
      value: '200ms',
      fallback: '200ms',
      description: 'Normal transition duration',
      category: 'animation'
    },
    '--transition-duration-slow': {
      name: '--transition-duration-slow',
      value: '300ms',
      fallback: '300ms',
      description: 'Slow transition duration',
      category: 'animation'
    },
    '--transition-timing-ease': {
      name: '--transition-timing-ease',
      value: 'cubic-bezier(0.4, 0, 0.2, 1)',
      fallback: 'ease',
      description: 'Ease timing function',
      category: 'animation'
    }
  };

  constructor(config: Partial<CSSCustomPropertyConfig> = {}) {
    this.config = {
      prefix: 'us',
      enableValidation: true,
      includeFallbacks: true,
      autoGenerateCSS: true,
      injectionTarget: 'head',
      debug: false,
      ...config
    };

    this.initializeEventMaps();
    this.initializeValidators();
  }

  /**
   * Initialize CSS custom property manager
   */
  public async init(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Load default properties
      this.loadDefaultProperties();
      
      // Create style element for injection
      if (this.config.autoGenerateCSS) {
        this.createStyleElement();
      }
      
      // Generate and inject initial CSS
      if (this.config.autoGenerateCSS) {
        this.generateAndInjectCSS();
      }
      
      this.isInitialized = true;
    } catch (error) {
      throw new ValidationError(`Failed to initialize CSSCustomPropertyManager: ${error}`);
    }
  }

  /**
   * Destroy CSS custom property manager
   */
  public destroy(): void {
    if (this.styleElement && this.styleElement.parentNode) {
      this.styleElement.parentNode.removeChild(this.styleElement);
    }
    
    this.properties.clear();
    this.eventListeners.clear();
    this.isInitialized = false;
  }

  /**
   * Set a CSS custom property
   */
  public setProperty(name: string, value: string, options: Partial<CSSCustomProperty> = {}): void {
    const fullName = this.normalizePropertyName(name);
    
    const property: CSSCustomProperty = {
      name: fullName,
      value,
      fallback: options.fallback || '',
      description: options.description || '',
      category: options.category || 'other'
    };

    // Validate property if validation is enabled
    if (this.config.enableValidation) {
      const validation = this.validateProperty(property);
      if (!validation.valid) {
        throw new ValidationError(`Invalid CSS property: ${validation.errors.join(', ')}`);
      }
    }

    this.properties.set(fullName, property);
    
    // Update CSS if auto-generation is enabled
    if (this.config.autoGenerateCSS) {
      this.updateCSSProperty(property);
    }

    if (this.config.debug) {
      console.log(`CSS property set: ${fullName} = ${value}`);
    }
  }

  /**
   * Get a CSS custom property
   */
  public getProperty(name: string): CSSCustomProperty | null {
    const fullName = this.normalizePropertyName(name);
    return this.properties.get(fullName) || null;
  }

  /**
   * Get all CSS custom properties
   */
  public getAllProperties(): CSSCustomProperties {
    const result: CSSCustomProperties = {};
    this.properties.forEach((property, name) => {
      result[name] = property;
    });
    return result;
  }

  /**
   * Get properties by category
   */
  public getPropertiesByCategory(category: string): CSSCustomProperties {
    const result: CSSCustomProperties = {};
    this.properties.forEach((property, name) => {
      if (property.category === category) {
        result[name] = property;
      }
    });
    return result;
  }

  /**
   * Remove a CSS custom property
   */
  public removeProperty(name: string): boolean {
    const fullName = this.normalizePropertyName(name);
    const removed = this.properties.delete(fullName);
    
    if (removed && this.config.autoGenerateCSS) {
      this.generateAndInjectCSS();
    }
    
    return removed;
  }

  /**
   * Validate a CSS custom property
   */
  public validateProperty(property: CSSCustomProperty): CSSValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check property name format
    if (!property.name.startsWith('--')) {
      errors.push('CSS custom property names must start with "--"');
    }

    // Validate property value based on category
    if (property.category && this.validators.has(property.category)) {
      const validator = this.validators.get(property.category)!;
      if (!validator.validate(property.value)) {
        errors.push(validator.message);
      }
    }

    // Check for empty values
    if (!property.value || property.value.trim() === '') {
      errors.push('CSS custom property value cannot be empty');
    }

    // Validate fallback if provided
    if (property.fallback && property.category && this.validators.has(property.category)) {
      const validator = this.validators.get(property.category)!;
      if (!validator.validate(property.fallback)) {
        warnings.push(`Fallback value may be invalid: ${validator.message}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      rules: []
    };
  }

  /**
   * Validate all CSS custom properties
   */
  public validateAllProperties(): CSSValidationResult {
    const allErrors: string[] = [];
    const allWarnings: string[] = [];

    this.properties.forEach((property, name) => {
      const result = this.validateProperty(property);
      allErrors.push(...result.errors.map(error => `${name}: ${error}`));
      allWarnings.push(...result.warnings.map(warning => `${name}: ${warning}`));
    });

    return {
      valid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings,
      rules: []
    };
  }

  /**
   * Generate CSS from custom properties
   */
  public generateCSS(): string {
    const cssRules: string[] = [];
    
    // Root selector with all custom properties
    const rootProperties: string[] = [];
    this.properties.forEach((property) => {
      if (this.config.includeFallbacks && property.fallback) {
        rootProperties.push(`  ${property.name}: ${property.value}; /* fallback: ${property.fallback} */`);
      } else {
        rootProperties.push(`  ${property.name}: ${property.value};`);
      }
    });

    if (rootProperties.length > 0) {
      cssRules.push(`:root {\n${rootProperties.join('\n')}\n}`);
    }

    // Add fallback classes for browsers without custom property support
    if (this.config.includeFallbacks) {
      const fallbackRules = this.generateFallbackCSS();
      if (fallbackRules) {
        cssRules.push(fallbackRules);
      }
    }

    return cssRules.join('\n\n');
  }

  /**
   * Export properties in various formats
   */
  public exportProperties(format: 'json' | 'css' | 'scss' | 'js' = 'json'): string {
    switch (format) {
      case 'json':
        return JSON.stringify(this.getAllProperties(), null, 2);
      
      case 'css':
        return this.generateCSS();
      
      case 'scss':
        return this.generateSCSS();
      
      case 'js':
        return this.generateJS();
      
      default:
        throw new ValidationError(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Import properties from various formats
   */
  public importProperties(data: string, format: 'json' | 'css' = 'json'): void {
    try {
      switch (format) {
        case 'json':
          const properties = JSON.parse(data) as CSSCustomProperties;
          this.loadProperties(properties);
          break;
        
        case 'css':
          this.parseCSSAndLoad(data);
          break;
        
        default:
          throw new ValidationError(`Unsupported import format: ${format}`);
      }
      
      if (this.config.autoGenerateCSS) {
        this.generateAndInjectCSS();
      }
    } catch (error) {
      throw new ValidationError(`Failed to import properties: ${error}`);
    }
  }

  /**
   * Add event listener
   */
  public on<K extends keyof ThemingEvents>(event: K, handler: ThemingEvents[K]): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(handler);
  }

  /**
   * Remove event listener
   */
  public off<K extends keyof ThemingEvents>(event: K, handler: ThemingEvents[K]): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(handler);
      if (index >= 0) {
        listeners.splice(index, 1);
      }
    }
  }

  // Private implementation methods

  private initializeEventMaps(): void {
    const events: (keyof ThemingEvents)[] = [
      'css-injected',
      'css-removed'
    ];

    events.forEach(event => {
      this.eventListeners.set(event, []);
    });
  }

  private initializeValidators(): void {
    // Copy built-in validators
    this.builtInValidators.forEach((validator, category) => {
      this.validators.set(category, validator);
    });
  }

  private loadDefaultProperties(): void {
    Object.values(this.defaultProperties).forEach(property => {
      this.properties.set(property.name, property);
    });
  }

  private loadProperties(properties: CSSCustomProperties): void {
    Object.values(properties).forEach(property => {
      this.properties.set(property.name, property);
    });
  }

  private normalizePropertyName(name: string): string {
    if (name.startsWith('--')) {
      return name;
    }
    return `--${this.config.prefix}-${name}`;
  }

  private createStyleElement(): void {
    this.styleElement = document.createElement('style');
    this.styleElement.id = `${this.config.prefix}-css-custom-properties`;
    this.styleElement.setAttribute('data-source', 'css-custom-property-manager');
    
    const target = this.config.injectionTarget === 'head' ? document.head : document.body;
    target.appendChild(this.styleElement);
  }

  private generateAndInjectCSS(): void {
    if (!this.styleElement) return;
    
    const css = this.generateCSS();
    this.styleElement.textContent = css;
    
    this.emit('css-injected', this.styleElement.id, css);
  }

  private updateCSSProperty(property: CSSCustomProperty): void {
    if (this.config.autoGenerateCSS) {
      this.generateAndInjectCSS();
    } else {
      // Update individual property in DOM
      document.documentElement.style.setProperty(property.name, property.value);
    }
  }

  private generateFallbackCSS(): string {
    const fallbackRules: string[] = [];
    
    // Generate fallback rules for older browsers
    const fallbackSelector = `.${this.config.prefix}-fallback`;
    const fallbackProperties: string[] = [];
    
    this.properties.forEach((property) => {
      if (property.fallback) {
        const cssProperty = property.name.replace(/^--\w+-/, '').replace(/-/g, '_');
        fallbackProperties.push(`  --${cssProperty}: ${property.fallback};`);
      }
    });
    
    if (fallbackProperties.length > 0) {
      fallbackRules.push(`${fallbackSelector} {\n${fallbackProperties.join('\n')}\n}`);
    }
    
    return fallbackRules.join('\n');
  }

  private generateSCSS(): string {
    const scssVariables: string[] = [];
    
    this.properties.forEach((property) => {
      const scssName = property.name.replace(/^--/, '$').replace(/-/g, '_');
      scssVariables.push(`${scssName}: ${property.value};`);
      
      if (property.description) {
        scssVariables.push(`// ${property.description}`);
      }
    });
    
    return scssVariables.join('\n');
  }

  private generateJS(): string {
    const jsObject = {
      cssCustomProperties: this.getAllProperties()
    };
    
    return `export const themeProperties = ${JSON.stringify(jsObject, null, 2)};`;
  }

  private parseCSSAndLoad(css: string): void {
    // Simple CSS parser to extract custom properties
    const matches = css.match(/--[\w-]+:\s*[^;]+/g);
    if (matches) {
      matches.forEach(match => {
        const [name, value] = match.split(':').map(s => s.trim());
        if (name && value) {
          this.setProperty(name, value);
        }
      });
    }
  }

  // Validation helper methods

  private isValidColor(value: string): boolean {
    // Test various color formats
    const colorPatterns = [
      /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, // Hex colors
      /^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/, // RGB
      /^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*(0|1|0?\.\d+)\s*\)$/, // RGBA
      /^hsl\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*\)$/, // HSL
      /^hsla\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*,\s*(0|1|0?\.\d+)\s*\)$/ // HSLA
    ];
    
    // Named colors
    const namedColors = [
      'transparent', 'currentColor', 'inherit', 'initial', 'unset',
      'black', 'white', 'red', 'green', 'blue', 'yellow', 'orange', 'purple', 'pink', 'gray', 'grey'
    ];
    
    return colorPatterns.some(pattern => pattern.test(value)) || 
           namedColors.includes(value.toLowerCase());
  }

  private isValidLength(value: string): boolean {
    const lengthPattern = /^-?\d*\.?\d+(px|em|rem|%|vh|vw|vmin|vmax|ch|ex|cm|mm|in|pt|pc)$/;
    return lengthPattern.test(value) || value === '0' || value === 'auto';
  }

  private isValidNumber(value: string): boolean {
    return !isNaN(Number(value)) && isFinite(Number(value));
  }

  private isValidPercentage(value: string): boolean {
    const percentagePattern = /^-?\d*\.?\d+%$/;
    return percentagePattern.test(value);
  }

  private isValidShadow(value: string): boolean {
    // Basic shadow validation - can be enhanced
    const shadowPattern = /^(\d+px\s+){2,4}(rgba?\([^)]+\)|#[A-Fa-f0-9]+|\w+)$/;
    return shadowPattern.test(value.replace(/\s+/g, ' ').trim()) || value === 'none';
  }

  private isValidFontFamily(value: string): boolean {
    // Allow quoted font names, unquoted names, and common CSS font values
    return value.length > 0 && !value.includes(';') && !value.includes('{') && !value.includes('}');
  }

  private isValidTimingFunction(value: string): boolean {
    const timingFunctions = ['ease', 'linear', 'ease-in', 'ease-out', 'ease-in-out'];
    const cubicBezierPattern = /^cubic-bezier\(\s*[\d.-]+\s*,\s*[\d.-]+\s*,\s*[\d.-]+\s*,\s*[\d.-]+\s*\)$/;
    
    return timingFunctions.includes(value) || cubicBezierPattern.test(value);
  }

  private emit<K extends keyof ThemingEvents>(event: K, ...args: Parameters<ThemingEvents[K]>): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          (listener as any)(...args);
        } catch (error) {
          console.error(`Error in CSS property manager ${event} listener:`, error);
        }
      });
    }
  }
}