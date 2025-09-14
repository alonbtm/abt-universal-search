/**
 * Theme Preset Manager
 * Comprehensive theme preset system with auto-detection and smooth transitions
 */

import { ValidationError } from '../utils/validation';
import type {
  Theme,
  ThemePreset,
  ThemeDetectionConfig,
  ThemingEvents,
  ThemeValidationResult,
  AccessibilityThemeRequirements
} from '../types/Theming';

/**
 * Theme preset configuration
 */
export interface ThemePresetConfig {
  /** Available theme presets */
  presets: Map<string, Theme>;
  /** Default theme preset */
  defaultTheme: ThemePreset;
  /** Theme detection configuration */
  detection: ThemeDetectionConfig;
  /** Transition configuration */
  transition: {
    enabled: boolean;
    duration: number;
    easing: string;
  };
  /** Storage configuration */
  storage: {
    enabled: boolean;
    key: string;
    type: 'localStorage' | 'sessionStorage';
  };
  /** Accessibility requirements */
  accessibility: AccessibilityThemeRequirements;
}

/**
 * System theme detection result
 */
interface SystemThemeDetection {
  colorScheme: 'light' | 'dark' | 'no-preference';
  reducedMotion: boolean;
  highContrast: boolean;
  forcedColors: boolean;
}

/**
 * Theme preset manager with auto-detection and accessibility support
 */
export class ThemePresetManager {
  private config: ThemePresetConfig;
  private currentTheme: string = 'light';
  private isInitialized = false;
  private eventListeners: Map<keyof ThemingEvents, Function[]> = new Map();
  private mediaQueries: Map<string, MediaQueryList> = new Map();
  private themeObserver: MutationObserver | null = null;

  // Built-in theme presets
  private readonly builtInThemes: Map<string, Theme> = new Map([
    ['light', this.createLightTheme()],
    ['dark', this.createDarkTheme()],
    ['high-contrast', this.createHighContrastTheme()]
  ]);

  constructor(config: Partial<ThemePresetConfig> = {}) {
    this.config = {
      presets: new Map(this.builtInThemes),
      defaultTheme: 'light',
      detection: {
        detectSystemTheme: true,
        detectReducedMotion: true,
        detectHighContrast: true,
        detectColorScheme: true,
        storageKey: 'us-theme-preference',
        fallbackTheme: 'light'
      },
      transition: {
        enabled: true,
        duration: 200,
        easing: 'ease-out'
      },
      storage: {
        enabled: true,
        key: 'us-theme-preference',
        type: 'localStorage'
      },
      accessibility: {
        contrastRatios: {
          normal: 4.5,
          large: 3.0,
          interactive: 3.0
        },
        focus: {
          minWidth: 2,
          minContrast: 3.0,
          visible: true
        },
        highContrast: {
          enabled: true,
          ratioMultiplier: 1.5
        },
        reducedMotion: {
          respectPreference: true,
          fallbackDuration: 0
        }
      },
      ...config
    };

    // Merge custom presets with built-in themes
    if (config.presets) {
      config.presets.forEach((theme, name) => {
        this.config.presets.set(name, theme);
      });
    }

    this.initializeEventMaps();
  }

  /**
   * Initialize theme preset manager
   */
  public async init(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Setup media query listeners
      this.setupMediaQueryListeners();
      
      // Detect initial theme
      const detectedTheme = this.detectInitialTheme();
      
      // Apply detected theme
      await this.setTheme(detectedTheme);
      
      // Setup theme observation
      this.setupThemeObserver();
      
      this.isInitialized = true;
    } catch (error) {
      throw new ValidationError(`Failed to initialize ThemePresetManager: ${error}`);
    }
  }

  /**
   * Destroy theme preset manager
   */
  public destroy(): void {
    // Disconnect media query listeners
    this.mediaQueries.forEach(mq => {
      if (mq.removeEventListener) {
        mq.removeEventListener('change', this.handleMediaQueryChange.bind(this));
      }
    });
    this.mediaQueries.clear();

    // Disconnect theme observer
    if (this.themeObserver) {
      this.themeObserver.disconnect();
    }

    this.eventListeners.clear();
    this.isInitialized = false;
  }

  /**
   * Set theme preset
   */
  public async setTheme(themeName: string): Promise<void> {
    const theme = this.config.presets.get(themeName);
    if (!theme) {
      throw new ValidationError(`Theme not found: ${themeName}`);
    }

    // Validate theme before applying
    const validation = this.validateTheme(theme);
    if (!validation.valid) {
      throw new ValidationError(`Invalid theme: ${validation.errors.join(', ')}`);
    }

    const previousTheme = this.currentTheme;
    this.currentTheme = themeName;

    // Apply theme with transition
    if (this.config.transition.enabled) {
      await this.applyThemeWithTransition(theme, previousTheme);
    } else {
      this.applyThemeImmediate(theme);
    }

    // Store theme preference
    if (this.config.storage.enabled) {
      this.storeThemePreference(themeName);
    }

    this.emit('theme-changed', themeName, previousTheme);
    this.emit('theme-loaded', theme);
  }

  /**
   * Get current theme
   */
  public getCurrentTheme(): string {
    return this.currentTheme;
  }

  /**
   * Get available themes
   */
  public getAvailableThemes(): string[] {
    return Array.from(this.config.presets.keys());
  }

  /**
   * Get theme definition
   */
  public getTheme(themeName: string): Theme | null {
    return this.config.presets.get(themeName) || null;
  }

  /**
   * Add custom theme preset
   */
  public addTheme(name: string, theme: Theme): void {
    const validation = this.validateTheme(theme);
    if (!validation.valid) {
      throw new ValidationError(`Invalid theme: ${validation.errors.join(', ')}`);
    }

    this.config.presets.set(name, theme);
  }

  /**
   * Remove theme preset
   */
  public removeTheme(name: string): boolean {
    // Don't allow removal of built-in themes
    if (this.builtInThemes.has(name)) {
      throw new ValidationError(`Cannot remove built-in theme: ${name}`);
    }

    return this.config.presets.delete(name);
  }

  /**
   * Detect system theme preferences
   */
  public detectSystemTheme(): SystemThemeDetection {
    const detection: SystemThemeDetection = {
      colorScheme: 'no-preference',
      reducedMotion: false,
      highContrast: false,
      forcedColors: false
    };

    if (typeof window !== 'undefined' && window.matchMedia) {
      // Detect color scheme preference
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        detection.colorScheme = 'dark';
      } else if (window.matchMedia('(prefers-color-scheme: light)').matches) {
        detection.colorScheme = 'light';
      }

      // Detect reduced motion preference
      detection.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      // Detect high contrast preference
      detection.highContrast = window.matchMedia('(prefers-contrast: high)').matches;

      // Detect forced colors (Windows high contrast mode)
      detection.forcedColors = window.matchMedia('(forced-colors: active)').matches;
    }

    return detection;
  }

  /**
   * Auto-detect and apply appropriate theme
   */
  public async autoDetectTheme(): Promise<string> {
    const detection = this.detectSystemTheme();
    let selectedTheme = this.config.defaultTheme;

    // Prioritize high contrast if detected
    if (detection.highContrast || detection.forcedColors) {
      if (this.config.presets.has('high-contrast')) {
        selectedTheme = 'high-contrast';
      }
    } else {
      // Use color scheme preference
      switch (detection.colorScheme) {
        case 'dark':
          selectedTheme = this.config.presets.has('dark') ? 'dark' : this.config.defaultTheme;
          break;
        case 'light':
          selectedTheme = this.config.presets.has('light') ? 'light' : this.config.defaultTheme;
          break;
        default:
          selectedTheme = this.config.defaultTheme;
      }
    }

    await this.setTheme(selectedTheme);
    return selectedTheme;
  }

  /**
   * Toggle between light and dark themes
   */
  public async toggleTheme(): Promise<string> {
    const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
    await this.setTheme(newTheme);
    return newTheme;
  }

  /**
   * Check if reduced motion is preferred
   */
  public isReducedMotionPreferred(): boolean {
    return this.detectSystemTheme().reducedMotion;
  }

  /**
   * Check if high contrast is preferred
   */
  public isHighContrastPreferred(): boolean {
    const detection = this.detectSystemTheme();
    return detection.highContrast || detection.forcedColors;
  }

  /**
   * Validate theme against accessibility requirements
   */
  public validateTheme(theme: Theme): ThemeValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const missing: string[] = [];
    const accessibility = {
      contrastIssues: [] as string[],
      colorBlindnessIssues: [] as string[],
      otherIssues: [] as string[]
    };

    // Check required properties
    const requiredProperties = ['name', 'colors', 'typography', 'spacing'];
    requiredProperties.forEach(prop => {
      if (!(prop in theme) || !theme[prop as keyof Theme]) {
        missing.push(prop);
      }
    });

    // Validate color contrast ratios
    if (theme.colors) {
      const contrastIssues = this.validateColorContrast(theme.colors);
      accessibility.contrastIssues.push(...contrastIssues);
    }

    // Validate focus indicators
    if (theme.colors && theme.borders) {
      const focusIssues = this.validateFocusIndicators(theme);
      accessibility.otherIssues.push(...focusIssues);
    }

    // Check for color blindness considerations
    if (theme.colors) {
      const colorBlindnessIssues = this.checkColorBlindnessAccessibility(theme.colors);
      accessibility.colorBlindnessIssues.push(...colorBlindnessIssues);
    }

    return {
      valid: errors.length === 0 && missing.length === 0,
      errors,
      warnings,
      missing,
      accessibility
    };
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
      'theme-changed',
      'theme-loaded',
      'theme-error',
      'reduced-motion-changed'
    ];

    events.forEach(event => {
      this.eventListeners.set(event, []);
    });
  }

  private setupMediaQueryListeners(): void {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return;
    }

    const queries = [
      '(prefers-color-scheme: dark)',
      '(prefers-color-scheme: light)',
      '(prefers-reduced-motion: reduce)',
      '(prefers-contrast: high)',
      '(forced-colors: active)'
    ];

    queries.forEach(query => {
      const mq = window.matchMedia(query);
      mq.addListener(this.handleMediaQueryChange.bind(this));
      this.mediaQueries.set(query, mq);
    });
  }

  private handleMediaQueryChange(event: MediaQueryListEvent): void {
    if (!this.config.detection.detectSystemTheme) {
      return;
    }

    // Handle reduced motion changes immediately
    if (event.media.includes('prefers-reduced-motion')) {
      this.emit('reduced-motion-changed', event.matches);
      return;
    }

    // Debounce theme changes to avoid rapid switching
    setTimeout(() => {
      if (this.config.detection.detectSystemTheme) {
        this.autoDetectTheme().catch(error => {
          this.emit('theme-error', error, 'auto-detection');
        });
      }
    }, 100);
  }

  private detectInitialTheme(): string {
    // Check stored preference first
    if (this.config.storage.enabled) {
      const stored = this.getStoredThemePreference();
      if (stored && this.config.presets.has(stored)) {
        return stored;
      }
    }

    // Auto-detect if enabled
    if (this.config.detection.detectSystemTheme) {
      const detection = this.detectSystemTheme();
      
      if (detection.highContrast || detection.forcedColors) {
        return 'high-contrast';
      }
      
      switch (detection.colorScheme) {
        case 'dark':
          return 'dark';
        case 'light':
          return 'light';
        default:
          return this.config.defaultTheme;
      }
    }

    return this.config.defaultTheme;
  }

  private async applyThemeWithTransition(theme: Theme, _previousTheme: string): Promise<void> {
    // Check if reduced motion is preferred
    const reducedMotion = this.isReducedMotionPreferred();
    const duration = reducedMotion ? 0 : this.config.transition.duration;

    if (duration > 0) {
      // Add transition styles
      document.documentElement.style.transition = `all ${duration}ms ${this.config.transition.easing}`;
    }

    // Apply theme
    this.applyThemeImmediate(theme);

    // Wait for transition to complete
    if (duration > 0) {
      await new Promise(resolve => setTimeout(resolve, duration));
      document.documentElement.style.transition = '';
    }
  }

  private applyThemeImmediate(theme: Theme): void {
    // Apply CSS custom properties
    if (theme.cssProperties) {
      Object.values(theme.cssProperties).forEach(property => {
        document.documentElement.style.setProperty(property.name, property.value);
      });
    }

    // Apply theme class
    document.documentElement.className = document.documentElement.className
      .replace(/theme-\w+/g, '')
      .trim();
    document.documentElement.classList.add(`theme-${this.currentTheme}`);

    // Set data attribute for CSS targeting
    document.documentElement.setAttribute('data-theme', this.currentTheme);
  }

  private setupThemeObserver(): void {
    // Observe changes to theme-related attributes
    this.themeObserver = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (mutation.type === 'attributes' && 
            (mutation.attributeName === 'data-theme' || 
             mutation.attributeName === 'class')) {
          // Theme might have been changed externally
          this.validateCurrentTheme();
        }
      });
    });

    this.themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'class']
    });
  }

  private validateCurrentTheme(): void {
    const dataTheme = document.documentElement.getAttribute('data-theme');
    if (dataTheme && dataTheme !== this.currentTheme) {
      // Theme was changed externally
      if (this.config.presets.has(dataTheme)) {
        this.currentTheme = dataTheme;
        const theme = this.config.presets.get(dataTheme)!;
        this.emit('theme-changed', dataTheme, this.currentTheme);
        this.emit('theme-loaded', theme);
      }
    }
  }

  private storeThemePreference(themeName: string): void {
    try {
      const storage = this.config.storage.type === 'localStorage' ? 
        localStorage : sessionStorage;
      storage.setItem(this.config.storage.key, themeName);
    } catch (error) {
      console.warn('Failed to store theme preference:', error);
    }
  }

  private getStoredThemePreference(): string | null {
    try {
      const storage = this.config.storage.type === 'localStorage' ? 
        localStorage : sessionStorage;
      return storage.getItem(this.config.storage.key);
    } catch (error) {
      return null;
    }
  }

  private validateColorContrast(_colors: any): string[] {
    const issues: string[] = [];
    // Simplified contrast validation - would need actual contrast calculation
    // This is a placeholder for the actual implementation
    return issues;
  }

  private validateFocusIndicators(_theme: Theme): string[] {
    const issues: string[] = [];
    // Validate focus indicator visibility and contrast
    return issues;
  }

  private checkColorBlindnessAccessibility(_colors: any): string[] {
    const issues: string[] = [];
    // Check for color blindness accessibility issues
    return issues;
  }

  private emit<K extends keyof ThemingEvents>(event: K, ...args: Parameters<ThemingEvents[K]>): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          (listener as any)(...args);
        } catch (error) {
          console.error(`Error in theme preset manager ${event} listener:`, error);
        }
      });
    }
  }

  // Built-in theme definitions

  private createLightTheme(): Theme {
    return {
      name: 'Light',
      version: '1.0.0',
      description: 'Light theme with clean, modern styling',
      
      colors: {
        primary: {
          50: '#f0f9ff', 100: '#e0f2fe', 200: '#bae6fd', 300: '#7dd3fc',
          400: '#38bdf8', 500: '#0ea5e9', 600: '#0284c7', 700: '#0369a1',
          800: '#075985', 900: '#0c4a6e', 950: '#082f49'
        },
        secondary: {
          50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0', 300: '#cbd5e1',
          400: '#94a3b8', 500: '#64748b', 600: '#475569', 700: '#334155',
          800: '#1e293b', 900: '#0f172a', 950: '#020617'
        },
        neutral: {
          50: '#fafafa', 100: '#f4f4f5', 200: '#e4e4e7', 300: '#d4d4d8',
          400: '#a1a1aa', 500: '#71717a', 600: '#52525b', 700: '#3f3f46',
          800: '#27272a', 900: '#18181b', 950: '#09090b'
        },
        semantic: {
          success: '#10b981',
          warning: '#f59e0b',
          error: '#ef4444',
          info: '#3b82f6'
        },
        state: {
          hover: '#f3f4f6',
          active: '#e5e7eb',
          focus: '#dbeafe',
          disabled: '#f9fafb'
        },
        background: {
          primary: '#ffffff',
          secondary: '#f9fafb',
          tertiary: '#f3f4f6',
          overlay: 'rgba(0, 0, 0, 0.5)'
        },
        text: {
          primary: '#111827',
          secondary: '#6b7280',
          tertiary: '#9ca3af',
          inverse: '#ffffff'
        },
        border: {
          primary: '#d1d5db',
          secondary: '#e5e7eb',
          tertiary: '#f3f4f6',
          focus: '#3b82f6'
        }
      },
      
      spacing: {
        unit: 4,
        scale: {
          xs: '0.25rem', sm: '0.5rem', md: '1rem', lg: '1.5rem', xl: '2rem',
          '2xl': '2.5rem', '3xl': '3rem', '4xl': '4rem', '5xl': '5rem', '6xl': '6rem'
        },
        component: {
          padding: { xs: '0.25rem', sm: '0.5rem', md: '1rem', lg: '1.5rem', xl: '2rem' },
          margin: { xs: '0.25rem', sm: '0.5rem', md: '1rem', lg: '1.5rem', xl: '2rem' },
          gap: { xs: '0.25rem', sm: '0.5rem', md: '1rem', lg: '1.5rem', xl: '2rem' }
        }
      },
      
      typography: {
        families: {
          primary: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
          secondary: 'Georgia, "Times New Roman", Times, serif',
          monospace: '"SF Mono", Monaco, "Cascadia Code", monospace',
          display: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
        },
        weights: { light: 300, normal: 400, medium: 500, semibold: 600, bold: 700 },
        sizes: {
          xs: '0.75rem', sm: '0.875rem', base: '1rem', lg: '1.125rem', xl: '1.25rem',
          '2xl': '1.5rem', '3xl': '1.875rem', '4xl': '2.25rem', '5xl': '3rem', '6xl': '3.75rem'
        },
        lineHeights: { tight: 1.25, normal: 1.5, relaxed: 1.625, loose: 2 },
        letterSpacing: { tight: '-0.025em', normal: '0', wide: '0.025em' }
      },
      
      shadows: {
        drop: {
          xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
          sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
          md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
        },
        inner: {
          sm: 'inset 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
          md: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
          lg: 'inset 0 4px 6px 0 rgba(0, 0, 0, 0.07)'
        },
        focus: {
          primary: '0 0 0 3px rgba(59, 130, 246, 0.5)',
          secondary: '0 0 0 3px rgba(156, 163, 175, 0.5)',
          error: '0 0 0 3px rgba(239, 68, 68, 0.5)'
        }
      },
      
      borders: {
        width: { none: '0', thin: '1px', medium: '2px', thick: '4px' },
        radius: { none: '0', sm: '0.125rem', md: '0.375rem', lg: '0.5rem', xl: '0.75rem', full: '9999px' },
        style: { solid: 'solid', dashed: 'dashed', dotted: 'dotted' }
      },
      
      animations: {
        duration: { fast: '150ms', normal: '200ms', slow: '300ms' },
        timing: {
          linear: 'linear',
          ease: 'ease',
          easeIn: 'ease-in',
          easeOut: 'ease-out',
          easeInOut: 'ease-in-out',
          bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
        },
        delay: { none: '0ms', short: '75ms', medium: '150ms', long: '300ms' },
        transition: {
          all: 'all 200ms ease-out',
          colors: 'color 200ms ease-out, background-color 200ms ease-out, border-color 200ms ease-out',
          transform: 'transform 200ms ease-out',
          opacity: 'opacity 200ms ease-out'
        }
      },
      
      breakpoints: {
        screen: { xs: '475px', sm: '640px', md: '768px', lg: '1024px', xl: '1280px', '2xl': '1536px' },
        container: { xs: '400px', sm: '600px', md: '720px', lg: '960px', xl: '1200px' },
        behavior: { mobile: 'stack', tablet: 'wrap', desktop: 'grid' }
      },
      
      cssProperties: {}
    };
  }

  private createDarkTheme(): Theme {
    const lightTheme = this.createLightTheme();
    
    // Create dark theme by modifying light theme colors
    return {
      ...lightTheme,
      name: 'Dark',
      description: 'Dark theme with high contrast and reduced eye strain',
      
      colors: {
        ...lightTheme.colors,
        background: {
          primary: '#111827',
          secondary: '#1f2937',
          tertiary: '#374151',
          overlay: 'rgba(0, 0, 0, 0.75)'
        },
        text: {
          primary: '#f9fafb',
          secondary: '#d1d5db',
          tertiary: '#9ca3af',
          inverse: '#111827'
        },
        border: {
          primary: '#374151',
          secondary: '#4b5563',
          tertiary: '#6b7280',
          focus: '#60a5fa'
        },
        state: {
          hover: '#374151',
          active: '#4b5563',
          focus: '#1e40af',
          disabled: '#1f2937'
        }
      }
    };
  }

  private createHighContrastTheme(): Theme {
    const lightTheme = this.createLightTheme();
    
    return {
      ...lightTheme,
      name: 'High Contrast',
      description: 'High contrast theme for improved accessibility',
      
      colors: {
        ...lightTheme.colors,
        background: {
          primary: '#ffffff',
          secondary: '#ffffff',
          tertiary: '#f0f0f0',
          overlay: 'rgba(0, 0, 0, 0.9)'
        },
        text: {
          primary: '#000000',
          secondary: '#000000',
          tertiary: '#333333',
          inverse: '#ffffff'
        },
        border: {
          primary: '#000000',
          secondary: '#333333',
          tertiary: '#666666',
          focus: '#0000ff'
        },
        primary: {
          ...lightTheme.colors.primary,
          500: '#0000ff',
          600: '#000080',
          700: '#000066'
        }
      }
    };
  }
}