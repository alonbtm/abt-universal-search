import { Theme, ThemeConfig, ThemePreset, ThemingContext } from '../types/Theming';
import { CSSCustomPropertyManager } from './CSSCustomPropertyManager';
import { ThemePresetManager } from './ThemePresetManager';
import { StyleInjectionManager } from './StyleInjectionManager';
import { BrandIntegrationManager } from './BrandIntegrationManager';
import { ResponsiveManager } from './ResponsiveManager';
import { AnimationControlManager } from './AnimationControlManager';
import { ValidationError } from '../errors/ThemingErrors';

export interface ThemeManagerOptions {
  namespace?: string;
  autoDetectTheme?: boolean;
  enableAnimations?: boolean;
  enableResponsive?: boolean;
  enableBrandIntegration?: boolean;
  enableStyleInjection?: boolean;
  defaultTheme?: ThemePreset;
  debug?: boolean;
}

export class ThemeManager {
  private cssPropertyManager: CSSCustomPropertyManager;
  private presetManager: ThemePresetManager;
  private styleInjectionManager: StyleInjectionManager | null = null;
  private brandManager: BrandIntegrationManager | null = null;
  private responsiveManager: ResponsiveManager | null = null;
  private animationManager: AnimationControlManager | null = null;

  private currentTheme: string = 'light';
  private availableThemes = new Map<string, Theme>();
  private eventListeners = new Map<string, Function[]>();
  private initialized = false;

  constructor(
    private config: ThemeConfig,
    private options: ThemeManagerOptions = {}
  ) {
    const namespace = this.options.namespace || 'alon';

    this.cssPropertyManager = new CSSCustomPropertyManager({
      prefix: namespace,
      enableValidation: true,
      includeFallbacks: true,
      autoGenerateCSS: true,
      injectionTarget: 'head',
      debug: this.options.debug || false
    });

    this.presetManager = new ThemePresetManager({
      presets: new Map(),
      defaultTheme: this.options.defaultTheme || 'light',
      detection: {
        detectSystemTheme: this.options.autoDetectTheme !== false,
        detectReducedMotion: true,
        detectHighContrast: true,
        detectColorScheme: true,
        storageKey: `${namespace}-theme`,
        fallbackTheme: 'light'
      },
      transition: { enabled: true, duration: 300, easing: 'ease-out' },
      storage: { enabled: true, key: `${namespace}-theme`, type: 'localStorage' },
      accessibility: {
        contrastRatios: { normal: 4.5, large: 3.0, interactive: 3.0 },
        focus: { minWidth: 2, minContrast: 3.0, visible: true },
        highContrast: { enabled: true, ratioMultiplier: 1.5 },
        reducedMotion: { respectPreference: true, fallbackDuration: 0 }
      }
    });

    if (this.options.enableStyleInjection !== false) {
      this.styleInjectionManager = new StyleInjectionManager({
        enableScoping: true,
        namespace,
        allowOverrides: this.config.styleInjection?.allowOverrides || false,
        validateCSS: this.config.styleInjection?.validateCSS !== false,
        minifyCSS: this.config.styleInjection?.minifyCSS !== false,
        conflictResolution: 'warn',
        generateSourceMap: false
      });
    }

    if (this.options.enableBrandIntegration !== false) {
      this.brandManager = new BrandIntegrationManager(namespace);
    }

    if (this.options.enableResponsive !== false) {
      this.responsiveManager = new ResponsiveManager({
        enabled: true,
        strategy: 'both',
        mobileFirst: true,
        useContainerQueries: true
      }, namespace);
    }

    if (this.options.enableAnimations !== false) {
      this.animationManager = new AnimationControlManager({
        enabled: true,
        respectReducedMotion: true,
        performanceMode: 'smooth'
      }, namespace);
    }

    this.loadAvailableThemes();
    this.setupEventListeners();
  }

  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    await this.presetManager.init();

    if (this.responsiveManager) {
      this.responsiveManager.initialize();
    }

    if (this.animationManager) {
      this.animationManager.initialize();
    }

    if (this.options.autoDetectTheme !== false) {
      const detectedTheme = await this.presetManager.autoDetectTheme();
      if (detectedTheme) {
        await this.setTheme(detectedTheme);
      }
    }

    if (this.options.defaultTheme && !this.currentTheme) {
      await this.setTheme(this.options.defaultTheme);
    }

    this.initialized = true;
    this.emit('theme-manager-initialized', this);
  }

  public async setTheme(themeName: string): Promise<void> {
    if (!this.availableThemes.has(themeName)) {
      throw new ValidationError(`Theme not found: ${themeName}`);
    }

    const oldTheme = this.currentTheme;
    const theme = this.availableThemes.get(themeName)!;

    await this.presetManager.setTheme(themeName);

    this.cssPropertyManager.destroy();
    await this.cssPropertyManager.init();
    this.loadThemeProperties(theme);

    if (this.brandManager && this.config.brand) {
      const brandConfig = {
        name: this.config.brand.name || 'Brand',
        colors: this.config.brand.colors || {
          primary: '#007bff',
          secondary: '#6c757d',
          accent: '#28a745',
          neutral: '#f8f9fa'
        },
        typography: {
          primaryFont: this.config.brand.typography?.primaryFont || 'system-ui',
          secondaryFont: this.config.brand.typography?.secondaryFont || 'serif',
          fontWeights: {
            light: 300,
            normal: 400,
            medium: 500,
            semibold: 600,
            bold: 700
          }
        },
        spacing: this.config.brand.spacing || {
          baseUnit: 8,
          scale: 1.5
        },
        assets: {} as any,
        logo: {
          url: this.config.brand.logo?.url || '',
          alt: this.config.brand.logo?.alt || ''
        }
      };
      await this.brandManager.setBrand(brandConfig);
    }

    this.currentTheme = themeName;
    this.emit('theme-changed', themeName, oldTheme);

    if (this.options.debug) {
      console.log(`Theme changed from ${oldTheme} to ${themeName}`, theme);
    }
  }

  public getCurrentTheme(): string {
    return this.currentTheme;
  }

  public getAvailableThemes(): string[] {
    return Array.from(this.availableThemes.keys());
  }

  public getTheme(name: string): Theme | undefined {
    const theme = this.availableThemes.get(name);
    return theme ? { ...theme } : undefined;
  }

  public addTheme(theme: Theme): void {
    this.availableThemes.set(theme.name, theme);
    this.emit('theme-added', theme);
  }

  public removeTheme(name: string): boolean {
    if (name === this.currentTheme) {
      throw new ValidationError('Cannot remove active theme');
    }

    const removed = this.availableThemes.delete(name);
    if (removed) {
      this.emit('theme-removed', name);
    }
    return removed;
  }

  public getThemingContext(): ThemingContext {
    const breakpointInfo = this.responsiveManager?.getViewportInfo();
    const motionPrefs = this.animationManager?.getMotionPreferences();
    // const metrics = this.animationManager?.getAnimationMetrics();

    return {
      currentTheme: this.currentTheme,
      availableThemes: this.getAvailableThemes(),
      config: this.config,
      performance: {
        switchDuration: 0,
        injectionTime: 0,
        computationTime: 0,
        memoryUsage: 0,
        ruleCount: 0,
        cssSize: 0
      },
      activeBreakpoint: breakpointInfo?.activeBreakpoint || 'unknown',
      reducedMotion: motionPrefs?.reducedMotion || false,
      highContrast: motionPrefs?.highContrast || false,
      colorScheme: 'light'
    };
  }

  public injectCustomStyle(css: string, options: {
    priority?: number;
    scope?: 'global' | 'component' | 'element';
    namespace?: string;
    media?: string;
  } = {}): string {
    if (!this.styleInjectionManager) {
      throw new ValidationError('Style injection is disabled');
    }

    return this.styleInjectionManager.injectStyle({
      css,
      priority: options.priority || 100,
      scope: options.scope || 'component',
      namespace: options.namespace || this.options.namespace || 'alon',
      ...(options.media && { media: options.media })
    });
  }

  public removeCustomStyle(styleId: string): boolean {
    if (!this.styleInjectionManager) {
      return false;
    }

    return this.styleInjectionManager.removeStyle(styleId);
  }

  public setBrand(brandConfig: any): Promise<void> {
    if (!this.brandManager) {
      throw new ValidationError('Brand integration is disabled');
    }

    return this.brandManager.setBrand(brandConfig);
  }

  public setResponsiveBreakpoint(name: string, value: number, unit: 'px' | 'em' | 'rem' = 'px'): void {
    if (!this.responsiveManager) {
      throw new ValidationError('Responsive management is disabled');
    }

    this.responsiveManager.addBreakpoint(name, value, unit);
  }

  public animate(element: Element, preset: string, options: any = {}): Promise<void> {
    if (!this.animationManager) {
      throw new ValidationError('Animation control is disabled');
    }

    return this.animationManager.animate(element, preset, options);
  }

  public setAnimationEnabled(enabled: boolean): void {
    if (!this.animationManager) {
      throw new ValidationError('Animation control is disabled');
    }

    this.animationManager.setEnabled(enabled);
  }

  public exportTheme(format: 'json' | 'css' = 'json'): string {
    if (format === 'css') {
      return this.generateThemeCSS();
    }

    return JSON.stringify({
      currentTheme: this.currentTheme,
      theme: this.availableThemes.get(this.currentTheme),
      context: this.getThemingContext(),
      cssProperties: this.cssPropertyManager.exportProperties('json'),
      brand: this.brandManager?.getBrand(),
      timestamp: new Date().toISOString()
    }, null, 2);
  }

  public generateThemeCSS(): string {
    const sections: string[] = [];

    sections.push(this.cssPropertyManager.generateCSS());

    if (this.brandManager) {
      sections.push(this.brandManager.generateBrandCSS());
    }

    if (this.responsiveManager) {
      sections.push(this.responsiveManager.generateResponsiveCSS());
    }

    if (this.animationManager) {
      sections.push(this.animationManager.generateAnimationCSS());
    }

    if (this.styleInjectionManager) {
      sections.push(this.styleInjectionManager.exportStyles('css'));
    }

    return sections.filter(Boolean).join('\n\n');
  }

  public validateCurrentTheme(): { valid: boolean; errors: string[]; warnings: string[] } {
    const theme = this.availableThemes.get(this.currentTheme);
    if (!theme) {
      return {
        valid: false,
        errors: ['No active theme found'],
        warnings: []
      };
    }

    return this.presetManager.validateTheme(theme);
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
    this.cssPropertyManager.destroy();
    this.presetManager.destroy();
    
    if (this.styleInjectionManager) {
      this.styleInjectionManager.destroy();
    }

    if (this.brandManager) {
      this.brandManager.destroy();
    }

    if (this.responsiveManager) {
      this.responsiveManager.destroy();
    }

    if (this.animationManager) {
      this.animationManager.destroy();
    }

    this.eventListeners.clear();
    this.initialized = false;
  }

  private loadAvailableThemes(): void {
    this.config.availableThemes.forEach(theme => {
      this.availableThemes.set(theme.name, theme);
    });
  }

  private loadThemeProperties(theme: Theme): void {
    Object.entries(theme.cssProperties).forEach(([name, property]) => {
      this.cssPropertyManager.setProperty(name, property.value, {
        fallback: property.fallback || '',
        description: property.description || '',
        category: property.category || 'other'
      });
    });

    this.loadColorProperties(theme.colors);
    this.loadSpacingProperties(theme.spacing);
    this.loadTypographyProperties(theme.typography);
    this.loadShadowProperties(theme.shadows);
    this.loadBorderProperties(theme.borders);
    this.loadAnimationProperties(theme.animations);
  }

  private loadColorProperties(colors: any): void {
    Object.entries(colors.primary || {}).forEach(([shade, value]) => {
      this.cssPropertyManager.setProperty(`color-primary-${shade}`, value as string, {
        category: 'color'
      });
    });

    Object.entries(colors.secondary || {}).forEach(([shade, value]) => {
      this.cssPropertyManager.setProperty(`color-secondary-${shade}`, value as string, {
        category: 'color'
      });
    });

    Object.entries(colors.semantic || {}).forEach(([type, value]) => {
      this.cssPropertyManager.setProperty(`color-${type}`, value as string, {
        category: 'color'
      });
    });
  }

  private loadSpacingProperties(spacing: any): void {
    if (spacing.unit) {
      this.cssPropertyManager.setProperty('spacing-unit', `${spacing.unit}px`, {
        category: 'spacing'
      });
    }

    Object.entries(spacing.scale || {}).forEach(([size, value]) => {
      this.cssPropertyManager.setProperty(`spacing-${size}`, value as string, {
        category: 'spacing'
      });
    });
  }

  private loadTypographyProperties(typography: any): void {
    Object.entries(typography.families || {}).forEach(([type, value]) => {
      this.cssPropertyManager.setProperty(`font-${type}`, value as string, {
        category: 'typography'
      });
    });

    Object.entries(typography.sizes || {}).forEach(([size, value]) => {
      this.cssPropertyManager.setProperty(`font-size-${size}`, value as string, {
        category: 'typography'
      });
    });

    Object.entries(typography.weights || {}).forEach(([weight, value]) => {
      this.cssPropertyManager.setProperty(`font-weight-${weight}`, String(value), {
        category: 'typography'
      });
    });
  }

  private loadShadowProperties(shadows: any): void {
    Object.entries(shadows.drop || {}).forEach(([size, value]) => {
      this.cssPropertyManager.setProperty(`shadow-${size}`, value as string, {
        category: 'shadow'
      });
    });
  }

  private loadBorderProperties(borders: any): void {
    Object.entries(borders.radius || {}).forEach(([size, value]) => {
      this.cssPropertyManager.setProperty(`border-radius-${size}`, value as string, {
        category: 'border'
      });
    });

    Object.entries(borders.width || {}).forEach(([size, value]) => {
      this.cssPropertyManager.setProperty(`border-width-${size}`, value as string, {
        category: 'border'
      });
    });
  }

  private loadAnimationProperties(animations: any): void {
    Object.entries(animations.duration || {}).forEach(([speed, value]) => {
      this.cssPropertyManager.setProperty(`animation-duration-${speed}`, value as string, {
        category: 'animation'
      });
    });

    Object.entries(animations.timing || {}).forEach(([type, value]) => {
      this.cssPropertyManager.setProperty(`animation-timing-${type}`, value as string, {
        category: 'animation'
      });
    });
  }

  private setupEventListeners(): void {
    this.presetManager.on('theme-changed', (newTheme: string, oldTheme: string) => {
      this.emit('preset-theme-changed', newTheme, oldTheme);
    });

    if (this.responsiveManager) {
      this.responsiveManager.on('breakpoint-changed', (breakpoint: string) => {
        this.emit('responsive-breakpoint-changed', breakpoint);
      });
    }

    if (this.animationManager) {
      this.animationManager.on('reduced-motion-changed', (reducedMotion: boolean) => {
        this.emit('animation-preference-changed', { reducedMotion });
      });
    }
  }

  private emit(event: string, ...args: any[]): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(...args);
        } catch (error) {
          console.error(`Error in theme manager event listener for ${event}:`, error);
        }
      });
    }
  }
}