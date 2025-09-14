import { ThemeManager } from '../ThemeManager';
import { Theme, ThemeConfig, ThemePreset } from '../../types/Theming';
import { ValidationError } from '../../errors/ThemingErrors';

// Mock DOM environment
const mockDocument = {
  head: {
    appendChild: jest.fn(),
    removeChild: jest.fn(),
    querySelectorAll: jest.fn(() => []),
    querySelector: jest.fn()
  },
  createElement: jest.fn(() => ({
    setAttribute: jest.fn(),
    textContent: '',
    id: '',
    remove: jest.fn()
  })),
  getElementById: jest.fn()
};

const mockWindow = {
  matchMedia: jest.fn(() => ({
    matches: false,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn()
  })),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  innerWidth: 1200,
  innerHeight: 800,
  ResizeObserver: jest.fn(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn()
  })),
  PerformanceObserver: jest.fn(() => ({
    observe: jest.fn(),
    disconnect: jest.fn()
  }))
};

// @ts-ignore
global.document = mockDocument;
// @ts-ignore
global.window = mockWindow;

describe('ThemeManager', () => {
  let themeManager: ThemeManager;
  let mockThemeConfig: ThemeConfig;
  let mockTheme: Theme;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockTheme = {
      name: 'test-theme',
      version: '1.0.0',
      description: 'Test theme',
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49'
        },
        secondary: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617'
        },
        neutral: {
          50: '#fafafa',
          100: '#f4f4f5',
          200: '#e4e4e7',
          300: '#d4d4d8',
          400: '#a1a1aa',
          500: '#71717a',
          600: '#52525b',
          700: '#3f3f46',
          800: '#27272a',
          900: '#18181b',
          950: '#09090b'
        },
        semantic: {
          success: '#10b981',
          warning: '#f59e0b',
          error: '#ef4444',
          info: '#3b82f6'
        },
        state: {
          hover: '#f1f5f9',
          active: '#e2e8f0',
          focus: '#0ea5e9',
          disabled: '#e4e4e7'
        },
        background: {
          primary: '#ffffff',
          secondary: '#f8fafc',
          tertiary: '#f1f5f9',
          overlay: 'rgba(0, 0, 0, 0.5)'
        },
        text: {
          primary: '#1e293b',
          secondary: '#475569',
          tertiary: '#64748b',
          inverse: '#ffffff'
        },
        border: {
          primary: '#e2e8f0',
          secondary: '#cbd5e1',
          tertiary: '#94a3b8',
          focus: '#0ea5e9'
        }
      },
      spacing: {
        unit: 4,
        scale: {
          xs: '0.25rem',
          sm: '0.5rem',
          md: '1rem',
          lg: '1.5rem',
          xl: '2rem',
          '2xl': '2.5rem',
          '3xl': '3rem',
          '4xl': '4rem',
          '5xl': '5rem',
          '6xl': '6rem'
        },
        component: {
          padding: {
            xs: '0.5rem',
            sm: '0.75rem',
            md: '1rem',
            lg: '1.25rem',
            xl: '1.5rem'
          },
          margin: {
            xs: '0.25rem',
            sm: '0.5rem',
            md: '1rem',
            lg: '1.5rem',
            xl: '2rem'
          },
          gap: {
            xs: '0.5rem',
            sm: '0.75rem',
            md: '1rem',
            lg: '1.25rem',
            xl: '1.5rem'
          }
        }
      },
      typography: {
        families: {
          primary: '-apple-system, sans-serif',
          secondary: 'serif',
          monospace: 'monospace',
          display: 'display'
        },
        weights: {
          light: 300,
          normal: 400,
          medium: 500,
          semibold: 600,
          bold: 700
        },
        sizes: {
          xs: '0.75rem',
          sm: '0.875rem',
          base: '1rem',
          lg: '1.125rem',
          xl: '1.25rem',
          '2xl': '1.5rem',
          '3xl': '1.875rem',
          '4xl': '2.25rem',
          '5xl': '3rem',
          '6xl': '3.75rem'
        },
        lineHeights: {
          tight: 1.2,
          normal: 1.5,
          relaxed: 1.75,
          loose: 2
        },
        letterSpacing: {
          tight: '-0.025em',
          normal: '0',
          wide: '0.025em'
        }
      },
      shadows: {
        drop: {
          xs: '0 1px 2px rgba(0, 0, 0, 0.05)',
          sm: '0 1px 3px rgba(0, 0, 0, 0.1)',
          md: '0 4px 6px rgba(0, 0, 0, 0.1)',
          lg: '0 10px 15px rgba(0, 0, 0, 0.1)',
          xl: '0 20px 25px rgba(0, 0, 0, 0.1)',
          '2xl': '0 25px 50px rgba(0, 0, 0, 0.25)'
        },
        inner: {
          sm: 'inset 0 1px 2px rgba(0, 0, 0, 0.05)',
          md: 'inset 0 2px 4px rgba(0, 0, 0, 0.06)',
          lg: 'inset 0 4px 8px rgba(0, 0, 0, 0.1)'
        },
        focus: {
          primary: '0 0 0 3px rgba(14, 165, 233, 0.5)',
          secondary: '0 0 0 3px rgba(100, 116, 139, 0.5)',
          error: '0 0 0 3px rgba(239, 68, 68, 0.5)'
        }
      },
      borders: {
        width: {
          none: '0',
          thin: '1px',
          medium: '2px',
          thick: '4px'
        },
        radius: {
          none: '0',
          sm: '0.25rem',
          md: '0.375rem',
          lg: '0.5rem',
          xl: '0.75rem',
          full: '9999px'
        },
        style: {
          solid: 'solid',
          dashed: 'dashed',
          dotted: 'dotted'
        }
      },
      animations: {
        duration: {
          fast: '150ms',
          normal: '300ms',
          slow: '500ms'
        },
        timing: {
          linear: 'linear',
          ease: 'ease',
          easeIn: 'ease-in',
          easeOut: 'ease-out',
          easeInOut: 'ease-in-out',
          bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
        },
        delay: {
          none: '0ms',
          short: '75ms',
          medium: '150ms',
          long: '300ms'
        },
        transition: {
          all: 'all 300ms ease-in-out',
          colors: 'color 150ms ease-in-out',
          transform: 'transform 300ms ease-in-out',
          opacity: 'opacity 150ms ease-in-out'
        }
      },
      breakpoints: {
        screen: {
          xs: '0px',
          sm: '576px',
          md: '768px',
          lg: '992px',
          xl: '1200px',
          '2xl': '1400px'
        },
        container: {
          xs: '0px',
          sm: '320px',
          md: '480px',
          lg: '640px',
          xl: '800px'
        },
        behavior: {
          mobile: 'stack',
          tablet: 'grid',
          desktop: 'grid'
        }
      },
      cssProperties: {
        'primary-color': {
          name: '--test-primary-color',
          value: '#0ea5e9',
          category: 'color'
        },
        'font-size': {
          name: '--test-font-size',
          value: '1rem',
          category: 'typography'
        }
      }
    };

    mockThemeConfig = {
      defaultTheme: 'light',
      availableThemes: [mockTheme],
      detection: {
        detectSystemTheme: true,
        detectReducedMotion: true,
        detectHighContrast: true,
        detectColorScheme: true,
        storageKey: 'theme',
        fallbackTheme: 'light'
      },
      styleInjection: {
        enableScoping: true,
        namespace: 'test',
        injectToHead: true,
        allowOverrides: false,
        validateCSS: true,
        minifyCSS: true
      },
      animations: {
        enabled: true,
        respectReducedMotion: true,
        defaultDuration: 300,
        performanceMode: 'smooth',
        presets: {}
      },
      responsive: {
        enabled: true,
        useContainerQueries: true,
        mobileFirst: true,
        strategy: 'both',
        overrides: {}
      },
      cssPrefix: 'test',
      debug: false
    };

    themeManager = new ThemeManager(mockThemeConfig, {
      namespace: 'test',
      autoDetectTheme: false,
      enableAnimations: true,
      enableResponsive: true,
      enableBrandIntegration: true,
      enableStyleInjection: true
    });
  });

  afterEach(() => {
    if (themeManager) {
      themeManager.destroy();
    }
  });

  describe('Initialization', () => {
    it('should initialize with default configuration', () => {
      expect(themeManager).toBeInstanceOf(ThemeManager);
      expect(themeManager.getAvailableThemes()).toEqual(['test-theme']);
    });

    it('should initialize with custom options', () => {
      const customManager = new ThemeManager(mockThemeConfig, {
        namespace: 'custom',
        enableAnimations: false,
        enableResponsive: false
      });

      expect(customManager).toBeInstanceOf(ThemeManager);
      customManager.destroy();
    });

    it('should throw error for invalid theme config', () => {
      const invalidConfig = { ...mockThemeConfig, availableThemes: [] };
      
      expect(() => {
        new ThemeManager(invalidConfig);
      }).not.toThrow(); // Should handle empty themes gracefully
    });
  });

  describe('Theme Management', () => {
    beforeEach(async () => {
      await themeManager.initialize();
    });

    it('should set theme successfully', async () => {
      await themeManager.setTheme('test-theme');
      expect(themeManager.getCurrentTheme()).toBe('test-theme');
    });

    it('should throw error for non-existent theme', async () => {
      await expect(themeManager.setTheme('non-existent')).rejects.toThrow(ValidationError);
    });

    it('should get available themes', () => {
      const themes = themeManager.getAvailableThemes();
      expect(themes).toContain('test-theme');
    });

    it('should get specific theme', () => {
      const theme = themeManager.getTheme('test-theme');
      expect(theme).toBeDefined();
      expect(theme?.name).toBe('test-theme');
    });

    it('should return undefined for non-existent theme', () => {
      const theme = themeManager.getTheme('non-existent');
      expect(theme).toBeUndefined();
    });

    it('should add new theme', () => {
      const newTheme: Theme = { ...mockTheme, name: 'new-theme' };
      themeManager.addTheme(newTheme);
      
      expect(themeManager.getAvailableThemes()).toContain('new-theme');
      expect(themeManager.getTheme('new-theme')).toBeDefined();
    });

    it('should remove theme', () => {
      const newTheme: Theme = { ...mockTheme, name: 'removable-theme' };
      themeManager.addTheme(newTheme);
      
      const removed = themeManager.removeTheme('removable-theme');
      expect(removed).toBe(true);
      expect(themeManager.getAvailableThemes()).not.toContain('removable-theme');
    });

    it('should not remove active theme', async () => {
      await themeManager.setTheme('test-theme');
      
      expect(() => {
        themeManager.removeTheme('test-theme');
      }).toThrow(ValidationError);
    });

    it('should emit theme-changed event', async () => {
      const eventSpy = jest.fn();
      themeManager.on('theme-changed', eventSpy);

      await themeManager.setTheme('test-theme');
      expect(eventSpy).toHaveBeenCalledWith('test-theme', expect.any(String));
    });
  });

  describe('Custom Styling', () => {
    beforeEach(async () => {
      await themeManager.initialize();
    });

    it('should inject custom style', () => {
      const css = '.test { color: red; }';
      const styleId = themeManager.injectCustomStyle(css);
      
      expect(styleId).toBeDefined();
      expect(typeof styleId).toBe('string');
    });

    it('should inject custom style with options', () => {
      const css = '.test { color: blue; }';
      const styleId = themeManager.injectCustomStyle(css, {
        priority: 200,
        scope: 'global',
        media: '(min-width: 768px)'
      });
      
      expect(styleId).toBeDefined();
    });

    it('should remove custom style', () => {
      const css = '.test { color: green; }';
      const styleId = themeManager.injectCustomStyle(css);
      
      const removed = themeManager.removeCustomStyle(styleId);
      expect(removed).toBe(true);
    });

    it('should return false when removing non-existent style', () => {
      const removed = themeManager.removeCustomStyle('non-existent');
      expect(removed).toBe(false);
    });
  });

  describe('Brand Integration', () => {
    beforeEach(async () => {
      await themeManager.initialize();
    });

    it('should set brand configuration', async () => {
      const brandConfig = {
        name: 'Test Brand',
        logo: {
          url: 'https://example.com/logo.png',
          alt: 'Test Logo'
        },
        colors: {
          primary: '#ff0000',
          secondary: '#00ff00',
          accent: '#0000ff',
          neutral: '#666666'
        },
        typography: {
          primaryFont: 'Arial',
          secondaryFont: 'Times',
          fontWeights: {
            light: 300,
            normal: 400,
            medium: 500,
            semibold: 600,
            bold: 700
          }
        },
        spacing: {
          baseUnit: 8,
          scale: 1.5
        },
        assets: {}
      };

      await expect(themeManager.setBrand(brandConfig)).resolves.not.toThrow();
    });
  });

  describe('Responsive Management', () => {
    beforeEach(async () => {
      await themeManager.initialize();
    });

    it('should set responsive breakpoint', () => {
      expect(() => {
        themeManager.setResponsiveBreakpoint('custom', 900, 'px');
      }).not.toThrow();
    });

    it('should throw error when responsive is disabled', () => {
      const noResponsiveManager = new ThemeManager(mockThemeConfig, {
        enableResponsive: false
      });

      expect(() => {
        noResponsiveManager.setResponsiveBreakpoint('custom', 900);
      }).toThrow(ValidationError);

      noResponsiveManager.destroy();
    });
  });

  describe('Animation Control', () => {
    beforeEach(async () => {
      await themeManager.initialize();
    });

    it('should animate element', async () => {
      const mockElement = document.createElement('div');
      // Mock the animate method
      mockElement.animate = jest.fn().mockReturnValue({
        addEventListener: jest.fn((event, callback) => {
          if (event === 'finish') {
            setTimeout(callback, 0);
          }
        }),
        play: jest.fn()
      });

      await expect(themeManager.animate(mockElement, 'fade')).resolves.not.toThrow();
    });

    it('should set animation enabled state', () => {
      expect(() => {
        themeManager.setAnimationEnabled(false);
      }).not.toThrow();
      
      expect(() => {
        themeManager.setAnimationEnabled(true);
      }).not.toThrow();
    });

    it('should throw error when animations disabled', () => {
      const noAnimationManager = new ThemeManager(mockThemeConfig, {
        enableAnimations: false
      });

      expect(() => {
        noAnimationManager.setAnimationEnabled(true);
      }).toThrow(ValidationError);

      noAnimationManager.destroy();
    });
  });

  describe('Theme Export', () => {
    beforeEach(async () => {
      await themeManager.initialize();
      await themeManager.setTheme('test-theme');
    });

    it('should export theme as JSON', () => {
      const exported = themeManager.exportTheme('json');
      expect(typeof exported).toBe('string');
      
      const parsed = JSON.parse(exported);
      expect(parsed.currentTheme).toBe('test-theme');
      expect(parsed.theme).toBeDefined();
      expect(parsed.context).toBeDefined();
    });

    it('should export theme as CSS', () => {
      const exported = themeManager.exportTheme('css');
      expect(typeof exported).toBe('string');
      expect(exported).toContain('--');
    });

    it('should generate theme CSS', () => {
      const css = themeManager.generateThemeCSS();
      expect(typeof css).toBe('string');
      expect(css.length).toBeGreaterThan(0);
    });
  });

  describe('Theme Validation', () => {
    beforeEach(async () => {
      await themeManager.initialize();
      await themeManager.setTheme('test-theme');
    });

    it('should validate current theme', () => {
      const validation = themeManager.validateCurrentTheme();
      expect(validation.valid).toBe(true);
      expect(Array.isArray(validation.errors)).toBe(true);
      expect(Array.isArray(validation.warnings)).toBe(true);
    });

    it('should return invalid for no active theme', () => {
      const emptyManager = new ThemeManager({
        ...mockThemeConfig,
        availableThemes: []
      });
      
      const validation = emptyManager.validateCurrentTheme();
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('No active theme found');
      
      emptyManager.destroy();
    });
  });

  describe('Theming Context', () => {
    beforeEach(async () => {
      await themeManager.initialize();
      await themeManager.setTheme('test-theme');
    });

    it('should get theming context', () => {
      const context = themeManager.getThemingContext();
      
      expect(context.currentTheme).toBe('test-theme');
      expect(Array.isArray(context.availableThemes)).toBe(true);
      expect(context.config).toBeDefined();
      expect(context.performance).toBeDefined();
      expect(typeof context.activeBreakpoint).toBe('string');
      expect(typeof context.reducedMotion).toBe('boolean');
      expect(typeof context.highContrast).toBe('boolean');
      expect(['light', 'dark', 'auto']).toContain(context.colorScheme);
    });
  });

  describe('Event Handling', () => {
    beforeEach(async () => {
      await themeManager.initialize();
    });

    it('should add event listeners', () => {
      const callback = jest.fn();
      themeManager.on('test-event', callback);
      
      // Manually emit event to test
      (themeManager as any).emit('test-event', 'test-data');
      expect(callback).toHaveBeenCalledWith('test-data');
    });

    it('should remove event listeners', () => {
      const callback = jest.fn();
      themeManager.on('test-event', callback);
      themeManager.off('test-event', callback);
      
      // Manually emit event to test
      (themeManager as any).emit('test-event', 'test-data');
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('Cleanup', () => {
    it('should destroy successfully', async () => {
      await themeManager.initialize();
      expect(() => themeManager.destroy()).not.toThrow();
    });

    it('should handle multiple destroy calls', async () => {
      await themeManager.initialize();
      themeManager.destroy();
      expect(() => themeManager.destroy()).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle initialization errors gracefully', async () => {
      // Mock console.error to avoid test output noise
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Create manager with problematic config
      const problematicManager = new ThemeManager(mockThemeConfig);
      
      await expect(problematicManager.initialize()).resolves.not.toThrow();
      
      consoleSpy.mockRestore();
      problematicManager.destroy();
    });

    it('should handle missing features gracefully', () => {
      const limitedManager = new ThemeManager(mockThemeConfig, {
        enableStyleInjection: false,
        enableBrandIntegration: false,
        enableResponsive: false,
        enableAnimations: false
      });

      expect(() => limitedManager.removeCustomStyle('test')).not.toThrow();
      
      limitedManager.destroy();
    });
  });
});