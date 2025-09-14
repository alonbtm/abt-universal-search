import { ValidationError } from '../errors/ThemingErrors';

export interface BrandLogo {
  url: string;
  alt?: string;
  width?: number;
  height?: number;
  position?: 'left' | 'center' | 'right';
  darkModeUrl?: string;
  highContrastUrl?: string;
}

export interface BrandColors {
  primary: string;
  secondary: string;
  accent: string;
  neutral: string;
  gradient?: {
    start: string;
    end: string;
    direction?: string;
  };
}

export interface BrandTypography {
  primaryFont: string;
  secondaryFont: string;
  displayFont?: string;
  monoFont?: string;
  fontWeights: {
    light: number;
    normal: number;
    medium: number;
    semibold: number;
    bold: number;
  };
  letterSpacing?: {
    tight: string;
    normal: string;
    wide: string;
  };
}

export interface BrandSpacing {
  baseUnit: number;
  scale: number;
  customUnits?: {
    [key: string]: string;
  };
}

export interface BrandAssets {
  [key: string]: {
    url: string;
    alt?: string;
    type: 'image' | 'icon' | 'video' | 'font';
    variants?: {
      [variant: string]: string;
    };
  };
}

export interface BrandConfig {
  name: string;
  version?: string;
  logo: BrandLogo;
  colors: BrandColors;
  typography: BrandTypography;
  spacing: BrandSpacing;
  assets: BrandAssets;
  customProperties?: Record<string, string>;
}

export interface BrandValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  accessibility: {
    contrastIssues: string[];
    readabilityIssues: string[];
    recommendations: string[];
  };
}

export interface BrandAssetLoadResult {
  url: string;
  loaded: boolean;
  error?: string;
  dimensions?: { width: number; height: number };
  format?: string;
}

export class BrandIntegrationManager {
  private currentBrand: BrandConfig | null = null;
  private loadedAssets = new Map<string, BrandAssetLoadResult>();
  private fontLoadPromises = new Map<string, Promise<void>>();
  private eventListeners = new Map<string, Function[]>();

  constructor(private namespace: string = 'alon') {}

  public async setBrand(brand: BrandConfig): Promise<void> {
    const validation = this.validateBrand(brand);
    if (!validation.valid) {
      throw new ValidationError(`Invalid brand configuration: ${validation.errors.join(', ')}`);
    }

    const oldBrand = this.currentBrand;
    this.currentBrand = { ...brand };

    await this.loadBrandAssets();
    this.applyBrandStyling();
    this.injectBrandCSS();

    this.emit('brand-changed', this.currentBrand, oldBrand);
  }

  public getBrand(): BrandConfig | null {
    return this.currentBrand ? { ...this.currentBrand } : null;
  }

  public async loadLogo(themeVariant?: 'light' | 'dark' | 'high-contrast'): Promise<BrandAssetLoadResult> {
    if (!this.currentBrand?.logo) {
      throw new ValidationError('No brand logo configured');
    }

    const logo = this.currentBrand.logo;
    let logoUrl = logo.url;

    if (themeVariant === 'dark' && logo.darkModeUrl) {
      logoUrl = logo.darkModeUrl;
    } else if (themeVariant === 'high-contrast' && logo.highContrastUrl) {
      logoUrl = logo.highContrastUrl;
    }

    return this.loadAsset(logoUrl, 'logo');
  }

  public async loadAsset(url: string, key: string): Promise<BrandAssetLoadResult> {
    if (this.loadedAssets.has(key)) {
      return this.loadedAssets.get(key)!;
    }

    const result: BrandAssetLoadResult = {
      url,
      loaded: false
    };

    try {
      const response = await fetch(url, { method: 'HEAD' });
      if (!response.ok) {
        throw new Error(`Asset not found: ${response.status}`);
      }

      const contentType = response.headers.get('content-type') || '';
      result.format = contentType.split('/')[1];

      if (contentType.startsWith('image/')) {
        const dimensions = await this.getImageDimensions(url);
        result.dimensions = dimensions;
      }

      result.loaded = true;
      this.loadedAssets.set(key, result);

    } catch (error) {
      result.error = (error as Error).message;
    }

    return result;
  }

  public async loadBrandFonts(): Promise<void> {
    if (!this.currentBrand?.typography) {
      return;
    }

    const typography = this.currentBrand.typography;
    const fonts = [
      typography.primaryFont,
      typography.secondaryFont,
      typography.displayFont,
      typography.monoFont
    ].filter(Boolean) as string[];

    const loadPromises = fonts.map(font => this.loadFont(font));
    await Promise.allSettled(loadPromises);
  }

  public generateBrandCSS(): string {
    if (!this.currentBrand) {
      return '';
    }

    const css = [
      this.generateColorCSS(),
      this.generateTypographyCSS(),
      this.generateSpacingCSS(),
      this.generateCustomPropertiesCSS()
    ].filter(Boolean).join('\n\n');

    return `:root {\n${css}\n}`;
  }

  public getBrandColors(): BrandColors | null {
    return this.currentBrand?.colors || null;
  }

  public getBrandTypography(): BrandTypography | null {
    return this.currentBrand?.typography || null;
  }

  public updateBrandColors(colors: Partial<BrandColors>): void {
    if (!this.currentBrand) {
      throw new ValidationError('No brand configured');
    }

    this.currentBrand.colors = { ...this.currentBrand.colors, ...colors };
    this.validateColorAccessibility(this.currentBrand.colors);
    this.applyBrandStyling();
    this.emit('brand-colors-updated', this.currentBrand.colors);
  }

  public updateBrandTypography(typography: Partial<BrandTypography>): void {
    if (!this.currentBrand) {
      throw new ValidationError('No brand configured');
    }

    this.currentBrand.typography = { ...this.currentBrand.typography, ...typography };
    this.applyBrandStyling();
    this.emit('brand-typography-updated', this.currentBrand.typography);
  }

  public clearBrand(): void {
    const oldBrand = this.currentBrand;
    this.currentBrand = null;
    this.loadedAssets.clear();
    this.fontLoadPromises.clear();
    this.removeBrandCSS();
    this.emit('brand-cleared', oldBrand);
  }

  public exportBrand(format: 'json' | 'css' = 'json'): string {
    if (!this.currentBrand) {
      throw new ValidationError('No brand to export');
    }

    if (format === 'css') {
      return this.generateBrandCSS();
    }

    return JSON.stringify({
      brand: this.currentBrand,
      loadedAssets: Array.from(this.loadedAssets.entries()).reduce((acc, [key, value]) => {
        acc[key] = value;
        return acc;
      }, {} as Record<string, BrandAssetLoadResult>),
      timestamp: new Date().toISOString()
    }, null, 2);
  }

  public on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  public off(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  public destroy(): void {
    this.clearBrand();
    this.eventListeners.clear();
  }

  private validateBrand(brand: BrandConfig): BrandValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const accessibility = {
      contrastIssues: [] as string[],
      readabilityIssues: [] as string[],
      recommendations: [] as string[]
    };

    if (!brand.name || brand.name.trim().length === 0) {
      errors.push('Brand name is required');
    }

    if (!brand.logo?.url) {
      errors.push('Brand logo URL is required');
    } else {
      try {
        new URL(brand.logo.url);
      } catch {
        errors.push('Brand logo URL is invalid');
      }
    }

    if (!this.isValidColor(brand.colors.primary)) {
      errors.push('Primary color is invalid');
    }

    if (!this.isValidColor(brand.colors.secondary)) {
      errors.push('Secondary color is invalid');
    }

    if (!this.isValidColor(brand.colors.accent)) {
      errors.push('Accent color is invalid');
    }

    if (!this.isValidColor(brand.colors.neutral)) {
      errors.push('Neutral color is invalid');
    }

    const contrastRatio = this.calculateContrastRatio(brand.colors.primary, brand.colors.neutral);
    if (contrastRatio < 4.5) {
      accessibility.contrastIssues.push(`Primary/neutral contrast ratio ${contrastRatio.toFixed(2)} is below WCAG AA standard (4.5:1)`);
    }

    if (!brand.typography.primaryFont) {
      errors.push('Primary font is required');
    }

    if (brand.spacing.baseUnit <= 0) {
      errors.push('Base spacing unit must be positive');
    }

    if (brand.spacing.scale <= 0) {
      errors.push('Spacing scale must be positive');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      accessibility
    };
  }

  private validateColorAccessibility(colors: BrandColors): void {
    const contrastRatio = this.calculateContrastRatio(colors.primary, colors.neutral);
    if (contrastRatio < 4.5) {
      console.warn(`Brand color contrast ratio ${contrastRatio.toFixed(2)} may not meet accessibility standards`);
    }
  }

  private async loadBrandAssets(): Promise<void> {
    if (!this.currentBrand) return;

    const loadPromises: Promise<void>[] = [];

    if (this.currentBrand.logo.url) {
      loadPromises.push(this.loadAsset(this.currentBrand.logo.url, 'logo').then(() => {}));
    }

    for (const [key, asset] of Object.entries(this.currentBrand.assets)) {
      loadPromises.push(this.loadAsset(asset.url, key).then(() => {}));
    }

    await Promise.allSettled(loadPromises);
    await this.loadBrandFonts();
  }

  private applyBrandStyling(): void {
    if (!this.currentBrand) return;

    this.injectBrandCSS();
    this.applyLogoStyling();
  }

  private injectBrandCSS(): void {
    const existingStyle = document.getElementById(`${this.namespace}-brand-css`);
    if (existingStyle) {
      existingStyle.remove();
    }

    const style = document.createElement('style');
    style.id = `${this.namespace}-brand-css`;
    style.textContent = this.generateBrandCSS();
    document.head.appendChild(style);
  }

  private removeBrandCSS(): void {
    const existingStyle = document.getElementById(`${this.namespace}-brand-css`);
    if (existingStyle) {
      existingStyle.remove();
    }
  }

  private applyLogoStyling(): void {
    if (!this.currentBrand?.logo) return;

    const logoElements = document.querySelectorAll(`[data-${this.namespace}-logo]`);
    logoElements.forEach(element => {
      if (element instanceof HTMLImageElement) {
        element.src = this.currentBrand!.logo.url;
        element.alt = this.currentBrand!.logo.alt || this.currentBrand!.name;
        
        if (this.currentBrand!.logo.width) {
          element.style.width = `${this.currentBrand!.logo.width}px`;
        }
        
        if (this.currentBrand!.logo.height) {
          element.style.height = `${this.currentBrand!.logo.height}px`;
        }
      }
    });
  }

  private generateColorCSS(): string {
    if (!this.currentBrand?.colors) return '';

    const colors = this.currentBrand.colors;
    const properties = [
      `--${this.namespace}-brand-primary: ${colors.primary};`,
      `--${this.namespace}-brand-secondary: ${colors.secondary};`,
      `--${this.namespace}-brand-accent: ${colors.accent};`,
      `--${this.namespace}-brand-neutral: ${colors.neutral};`
    ];

    if (colors.gradient) {
      properties.push(
        `--${this.namespace}-brand-gradient: linear-gradient(${colors.gradient.direction || '90deg'}, ${colors.gradient.start}, ${colors.gradient.end});`
      );
    }

    return properties.map(prop => `  ${prop}`).join('\n');
  }

  private generateTypographyCSS(): string {
    if (!this.currentBrand?.typography) return '';

    const typography = this.currentBrand.typography;
    const properties = [
      `--${this.namespace}-brand-font-primary: ${typography.primaryFont};`,
      `--${this.namespace}-brand-font-secondary: ${typography.secondaryFont};`
    ];

    if (typography.displayFont) {
      properties.push(`--${this.namespace}-brand-font-display: ${typography.displayFont};`);
    }

    if (typography.monoFont) {
      properties.push(`--${this.namespace}-brand-font-mono: ${typography.monoFont};`);
    }

    Object.entries(typography.fontWeights).forEach(([weight, value]) => {
      properties.push(`--${this.namespace}-brand-font-weight-${weight}: ${value};`);
    });

    if (typography.letterSpacing) {
      Object.entries(typography.letterSpacing).forEach(([spacing, value]) => {
        properties.push(`--${this.namespace}-brand-letter-spacing-${spacing}: ${value};`);
      });
    }

    return properties.map(prop => `  ${prop}`).join('\n');
  }

  private generateSpacingCSS(): string {
    if (!this.currentBrand?.spacing) return '';

    const spacing = this.currentBrand.spacing;
    const properties = [
      `--${this.namespace}-brand-spacing-base: ${spacing.baseUnit}px;`,
      `--${this.namespace}-brand-spacing-scale: ${spacing.scale};`
    ];

    if (spacing.customUnits) {
      Object.entries(spacing.customUnits).forEach(([unit, value]) => {
        properties.push(`--${this.namespace}-brand-spacing-${unit}: ${value};`);
      });
    }

    return properties.map(prop => `  ${prop}`).join('\n');
  }

  private generateCustomPropertiesCSS(): string {
    if (!this.currentBrand?.customProperties) return '';

    return Object.entries(this.currentBrand.customProperties)
      .map(([key, value]) => `  --${this.namespace}-brand-${key}: ${value};`)
      .join('\n');
  }

  private async loadFont(fontFamily: string): Promise<void> {
    if (this.fontLoadPromises.has(fontFamily)) {
      return this.fontLoadPromises.get(fontFamily)!;
    }

    const loadPromise = new Promise<void>((resolve, reject) => {
      if (!('fonts' in document)) {
        resolve();
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error(`Font load timeout: ${fontFamily}`));
      }, 5000);

      document.fonts.load(`1em ${fontFamily}`).then(() => {
        clearTimeout(timeout);
        resolve();
      }).catch(() => {
        clearTimeout(timeout);
        resolve();
      });
    });

    this.fontLoadPromises.set(fontFamily, loadPromise);
    return loadPromise;
  }

  private async getImageDimensions(url: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
      img.src = url;
    });
  }

  private isValidColor(color: string): boolean {
    const colorRegex = /^#([A-Fa-f0-9]{3}){1,2}$|^rgb\((\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3})\)$|^rgba\((\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3}),\s*(0?\.\d+|1)\)$|^hsl\((\d{1,3}),\s*(\d{1,3})%,\s*(\d{1,3})%\)$|^hsla\((\d{1,3}),\s*(\d{1,3})%,\s*(\d{1,3})%,\s*(0?\.\d+|1)\)$/;
    return colorRegex.test(color);
  }

  private calculateContrastRatio(color1: string, color2: string): number {
    const getLuminance = (color: string): number => {
      const rgb = this.hexToRgb(color);
      if (!rgb) return 0;

      const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(c => {
        c = c / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      });

      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };

    const l1 = getLuminance(color1);
    const l2 = getLuminance(color2);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);

    return (lighter + 0.05) / (darker + 0.05);
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  private emit(event: string, ...args: any[]): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(...args));
    }
  }
}