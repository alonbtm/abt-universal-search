/**
 * Integration tests for the complete theming system
 * Tests all theming components working together
 */

import { ThemeManager } from '../ThemeManager';
import { CSSCustomPropertyManager } from '../CSSCustomPropertyManager';
import { ThemePresetManager } from '../ThemePresetManager';
import { StyleInjectionManager } from '../StyleInjectionManager';
import { BrandIntegrationManager } from '../BrandIntegrationManager';
import { ResponsiveManager } from '../ResponsiveManager';
import { AnimationControlManager } from '../AnimationControlManager';
import { Theme, ThemeConfig } from '../../types/Theming';

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
    remove: jest.fn(),
    style: {},
    animate: jest.fn().mockReturnValue({
      addEventListener: jest.fn(),
      play: jest.fn(),
      cancel: jest.fn()
    }),
    clientWidth: 300,
    clientHeight: 200,
    classList: {
      add: jest.fn(),
      remove: jest.fn()
    }
  })),
  getElementById: jest.fn(),
  querySelectorAll: jest.fn(() => [])
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
  })),
  getComputedStyle: jest.fn(() => ({})),
  setTimeout: global.setTimeout,
  clearTimeout: global.clearTimeout
};

// @ts-ignore
global.document = mockDocument;
// @ts-ignore
global.window = mockWindow;
// @ts-ignore
global.fetch = jest.fn();

describe('Theming System Integration', () => {
  let themeManager: ThemeManager;
  let lightTheme: Theme;
  let darkTheme: Theme;
  let themeConfig: ThemeConfig;

  beforeEach(() => {
    jest.clearAllMocks();
    
    lightTheme = {
      name: 'light',
      version: '1.0.0',
      description: 'Light theme',
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
        semantic: { success: '#10b981', warning: '#f59e0b', error: '#ef4444', info: '#3b82f6' },
        state: { hover: '#f1f5f9', active: '#e2e8f0', focus: '#0ea5e9', disabled: '#e4e4e7' },
        background: { primary: '#ffffff', secondary: '#f8fafc', tertiary: '#f1f5f9', overlay: 'rgba(0, 0, 0, 0.5)' },
        text: { primary: '#1e293b', secondary: '#475569', tertiary: '#64748b', inverse: '#ffffff' },
        border: { primary: '#e2e8f0', secondary: '#cbd5e1', tertiary: '#94a3b8', focus: '#0ea5e9' }
      },
      spacing: {
        unit: 4,
        scale: { xs: '0.25rem', sm: '0.5rem', md: '1rem', lg: '1.5rem', xl: '2rem', '2xl': '2.5rem', '3xl': '3rem', '4xl': '4rem', '5xl': '5rem', '6xl': '6rem' },
        component: {
          padding: { xs: '0.5rem', sm: '0.75rem', md: '1rem', lg: '1.25rem', xl: '1.5rem' },
          margin: { xs: '0.25rem', sm: '0.5rem', md: '1rem', lg: '1.5rem', xl: '2rem' },
          gap: { xs: '0.5rem', sm: '0.75rem', md: '1rem', lg: '1.25rem', xl: '1.5rem' }
        }
      },
      typography: {
        families: { primary: 'system-ui', secondary: 'serif', monospace: 'monospace', display: 'system-ui' },
        weights: { light: 300, normal: 400, medium: 500, semibold: 600, bold: 700 },
        sizes: { xs: '0.75rem', sm: '0.875rem', base: '1rem', lg: '1.125rem', xl: '1.25rem', '2xl': '1.5rem', '3xl': '1.875rem', '4xl': '2.25rem', '5xl': '3rem', '6xl': '3.75rem' },
        lineHeights: { tight: 1.2, normal: 1.5, relaxed: 1.75, loose: 2 },
        letterSpacing: { tight: '-0.025em', normal: '0', wide: '0.025em' }
      },
      shadows: {
        drop: { xs: '0 1px 2px rgba(0,0,0,0.05)', sm: '0 1px 3px rgba(0,0,0,0.1)', md: '0 4px 6px rgba(0,0,0,0.1)', lg: '0 10px 15px rgba(0,0,0,0.1)', xl: '0 20px 25px rgba(0,0,0,0.1)', '2xl': '0 25px 50px rgba(0,0,0,0.25)' },
        inner: { sm: 'inset 0 1px 2px rgba(0,0,0,0.05)', md: 'inset 0 2px 4px rgba(0,0,0,0.06)', lg: 'inset 0 4px 8px rgba(0,0,0,0.1)' },
        focus: { primary: '0 0 0 3px rgba(14,165,233,0.5)', secondary: '0 0 0 3px rgba(100,116,139,0.5)', error: '0 0 0 3px rgba(239,68,68,0.5)' }
      },
      borders: {
        width: { none: '0', thin: '1px', medium: '2px', thick: '4px' },
        radius: { none: '0', sm: '0.25rem', md: '0.375rem', lg: '0.5rem', xl: '0.75rem', full: '9999px' },
        style: { solid: 'solid', dashed: 'dashed', dotted: 'dotted' }
      },
      animations: {
        duration: { fast: '150ms', normal: '300ms', slow: '500ms' },
        timing: { linear: 'linear', ease: 'ease', easeIn: 'ease-in', easeOut: 'ease-out', easeInOut: 'ease-in-out', bounce: 'cubic-bezier(0.68,-0.55,0.265,1.55)' },
        delay: { none: '0ms', short: '75ms', medium: '150ms', long: '300ms' },
        transition: { all: 'all 300ms ease-in-out', colors: 'color 150ms ease-in-out', transform: 'transform 300ms ease-in-out', opacity: 'opacity 150ms ease-in-out' }
      },
      breakpoints: {
        screen: { xs: '0px', sm: '576px', md: '768px', lg: '992px', xl: '1200px', '2xl': '1400px' },
        container: { xs: '0px', sm: '320px', md: '480px', lg: '640px', xl: '800px' },
        behavior: { mobile: 'stack', tablet: 'grid', desktop: 'grid' }
      },
      cssProperties: {
        'primary-color': { name: '--alon-primary', value: '#0ea5e9', category: 'color' },
        'background-color': { name: '--alon-bg', value: '#ffffff', category: 'color' }
      }
    };

    darkTheme = {
      ...lightTheme,
      name: 'dark',
      description: 'Dark theme',
      colors: {
        ...lightTheme.colors,
        background: { primary: '#000000', secondary: '#18181b', tertiary: '#27272a', overlay: 'rgba(0, 0, 0, 0.8)' },
        text: { primary: '#f1f5f9', secondary: '#cbd5e1', tertiary: '#94a3b8', inverse: '#1e293b' }
      },
      cssProperties: {
        'primary-color': { name: '--alon-primary', value: '#4b6e9c', category: 'color' },
        'background-color': { name: '--alon-bg', value: '#000000', category: 'color' }
      }
    };

    themeConfig = {
      defaultTheme: 'light',
      availableThemes: [lightTheme, darkTheme],
      detection: {
        detectSystemTheme: true,
        detectReducedMotion: true,
        detectHighContrast: true,
        detectColorScheme: true,
        storageKey: 'alon-theme',
        fallbackTheme: 'light'
      },
      styleInjection: {
        enableScoping: true,
        namespace: 'alon',
        injectToHead: true,
        allowOverrides: false,
        validateCSS: true,
        minifyCSS: true
      },
      brand: {
        name: 'Test Brand',
        logo: { url: 'https://example.com/logo.png', alt: 'Test Logo' },
        colors: { primary: '#ff0000', secondary: '#00ff00', accent: '#0000ff', neutral: '#666666' },
        typography: { primaryFont: 'Arial', secondaryFont: 'Times', fontWeights: [300, 400, 500, 600, 700] },
        spacing: { baseUnit: 8, scale: 1.5 },
        assets: {}
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
      cssPrefix: 'alon',
      debug: false
    };
  });

  afterEach(() => {
    if (themeManager) {
      themeManager.destroy();
    }
  });

  describe('Complete Theme System Integration', () => {
    it('should initialize all theming components together', async () => {
      themeManager = new ThemeManager(themeConfig, {
        namespace: 'alon',
        enableAnimations: true,
        enableResponsive: true,
        enableBrandIntegration: true,
        enableStyleInjection: true
      });

      await themeManager.initialize();

      expect(themeManager.getCurrentTheme()).toBeDefined();
      expect(themeManager.getAvailableThemes()).toEqual(['light', 'dark']);
    });

    it('should switch themes and update all components', async () => {
      themeManager = new ThemeManager(themeConfig);
      await themeManager.initialize();

      // Start with light theme
      await themeManager.setTheme('light');
      expect(themeManager.getCurrentTheme()).toBe('light');

      // Switch to dark theme
      await themeManager.setTheme('dark');
      expect(themeManager.getCurrentTheme()).toBe('dark');

      // Verify CSS properties are updated
      const context = themeManager.getThemingContext();
      expect(context.currentTheme).toBe('dark');
    });

    it('should integrate brand settings with theme changes', async () => {
      themeManager = new ThemeManager(themeConfig);
      await themeManager.initialize();

      // Set brand configuration
      await themeManager.setBrand(themeConfig.brand!);

      // Switch themes and verify brand integration persists
      await themeManager.setTheme('light');
      await themeManager.setTheme('dark');

      // Brand should remain applied
      const css = themeManager.generateThemeCSS();
      expect(css).toContain('brand');
    });

    it('should handle responsive breakpoint changes across themes', async () => {
      themeManager = new ThemeManager(themeConfig);
      await themeManager.initialize();

      // Add custom breakpoint
      themeManager.setResponsiveBreakpoint('custom', 900, 'px');

      // Switch themes
      await themeManager.setTheme('dark');

      // Responsive functionality should persist
      expect(() => themeManager.setResponsiveBreakpoint('mobile', 400)).not.toThrow();
    });

    it('should coordinate animations with theme preferences', async () => {
      // Mock reduced motion preference
      (mockWindow.matchMedia as jest.Mock).mockImplementation((query) => ({
        matches: query.includes('prefers-reduced-motion'),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      }));

      themeManager = new ThemeManager(themeConfig);
      await themeManager.initialize();

      // Create mock element for animation
      const element = document.createElement('div');
      element.animate = jest.fn().mockReturnValue({
        addEventListener: jest.fn((event, callback) => {
          if (event === 'finish') setTimeout(callback, 0);
        }),
        play: jest.fn(),
        cancel: jest.fn()
      });

      // Animation should respect reduced motion when theme changes
      await themeManager.setTheme('dark');
      await expect(themeManager.animate(element, 'fade')).resolves.not.toThrow();
    });

    it('should export complete theming configuration', async () => {
      themeManager = new ThemeManager(themeConfig);
      await themeManager.initialize();
      await themeManager.setTheme('dark');

      // Inject custom styles
      themeManager.injectCustomStyle('.custom { color: red; }');

      // Set brand
      await themeManager.setBrand(themeConfig.brand!);

      // Export as JSON
      const jsonExport = themeManager.exportTheme('json');
      const parsed = JSON.parse(jsonExport);

      expect(parsed.currentTheme).toBe('dark');
      expect(parsed.theme).toBeDefined();
      expect(parsed.context).toBeDefined();
      expect(parsed.brand).toBeDefined();

      // Export as CSS
      const cssExport = themeManager.exportTheme('css');
      expect(cssExport).toContain('--alon');
      expect(cssExport).toContain('brand');
    });

    it('should validate complete theme configuration', async () => {
      themeManager = new ThemeManager(themeConfig);
      await themeManager.initialize();
      await themeManager.setTheme('light');

      const validation = themeManager.validateCurrentTheme();
      expect(validation.valid).toBe(true);
      expect(Array.isArray(validation.errors)).toBe(true);
      expect(Array.isArray(validation.warnings)).toBe(true);
    });

    it('should handle errors gracefully across all components', async () => {
      themeManager = new ThemeManager(themeConfig);
      await themeManager.initialize();

      // Test error handling in various components
      await expect(themeManager.setTheme('invalid-theme')).rejects.toThrow();

      // CSS injection should handle invalid CSS
      expect(() => {
        themeManager.injectCustomStyle('invalid css {');
      }).toThrow();

      // Animation should handle invalid preset
      const element = document.createElement('div');
      await expect(themeManager.animate(element, 'invalid-preset')).rejects.toThrow();
    });
  });

  describe('Performance Integration', () => {
    it('should perform theme switching efficiently', async () => {
      themeManager = new ThemeManager(themeConfig);
      await themeManager.initialize();

      const start = performance.now();
      
      // Perform multiple theme switches
      for (let i = 0; i < 10; i++) {
        await themeManager.setTheme(i % 2 === 0 ? 'light' : 'dark');
      }
      
      const end = performance.now();
      const duration = end - start;

      // Should complete within reasonable time (adjust threshold as needed)
      expect(duration).toBeLessThan(1000);
    });

    it('should handle large amounts of custom styles efficiently', async () => {
      themeManager = new ThemeManager(themeConfig);
      await themeManager.initialize();

      const start = performance.now();

      // Inject many custom styles
      for (let i = 0; i < 100; i++) {
        themeManager.injectCustomStyle(`.custom-${i} { color: hsl(${i * 3.6}, 50%, 50%); }`);
      }

      const end = performance.now();
      const duration = end - start;

      expect(duration).toBeLessThan(2000);
    });
  });

  describe('Accessibility Integration', () => {
    it('should respect accessibility preferences across all components', async () => {
      // Mock high contrast preference
      (mockWindow.matchMedia as jest.Mock).mockImplementation((query) => {
        if (query.includes('prefers-contrast: high')) return { matches: true, addEventListener: jest.fn(), removeEventListener: jest.fn() };
        if (query.includes('prefers-reduced-motion')) return { matches: true, addEventListener: jest.fn(), removeEventListener: jest.fn() };
        return { matches: false, addEventListener: jest.fn(), removeEventListener: jest.fn() };
      });

      themeManager = new ThemeManager(themeConfig);
      await themeManager.initialize();

      const context = themeManager.getThemingContext();
      expect(context.reducedMotion).toBe(true);
      expect(context.highContrast).toBe(true);
    });

    it('should validate color contrast across themes', async () => {
      themeManager = new ThemeManager(themeConfig);
      await themeManager.initialize();

      // Test both themes for accessibility
      await themeManager.setTheme('light');
      let validation = themeManager.validateCurrentTheme();
      expect(validation.valid).toBe(true);

      await themeManager.setTheme('dark');
      validation = themeManager.validateCurrentTheme();
      expect(validation.valid).toBe(true);
    });
  });

  describe('Event Coordination', () => {
    it('should coordinate events across all theming components', async () => {
      const themeChangeEvents: string[] = [];
      const responsiveEvents: string[] = [];
      const animationEvents: string[] = [];

      themeManager = new ThemeManager(themeConfig);
      
      themeManager.on('theme-changed', (newTheme: string) => {
        themeChangeEvents.push(newTheme);
      });

      themeManager.on('breakpoint-changed', (breakpoint: string) => {
        responsiveEvents.push(breakpoint);
      });

      themeManager.on('motion-preferences-changed', (prefs: any) => {
        animationEvents.push(JSON.stringify(prefs));
      });

      await themeManager.initialize();
      await themeManager.setTheme('dark');
      
      // Mock responsive change
      themeManager.setResponsiveBreakpoint('test', 800);

      expect(themeChangeEvents).toContain('dark');
    });

    it('should clean up all event listeners on destroy', async () => {
      themeManager = new ThemeManager(themeConfig);
      await themeManager.initialize();

      const callback = jest.fn();
      themeManager.on('test-event', callback);

      themeManager.destroy();

      // Should not crash when trying to emit after destroy
      expect(() => {
        (themeManager as any).emit('test-event', 'data');
      }).not.toThrow();
    });
  });

  describe('Memory Management', () => {
    it('should properly clean up all resources on destroy', async () => {
      themeManager = new ThemeManager(themeConfig);
      await themeManager.initialize();

      // Add various resources
      themeManager.injectCustomStyle('.test { color: red; }');
      await themeManager.setBrand(themeConfig.brand!);
      themeManager.setResponsiveBreakpoint('custom', 900);

      // Destroy should clean up everything
      expect(() => themeManager.destroy()).not.toThrow();
      
      // Subsequent operations should fail gracefully
      expect(themeManager.getCurrentTheme()).toBeDefined(); // Should still return last known state
    });

    it('should handle multiple destroy calls gracefully', async () => {
      themeManager = new ThemeManager(themeConfig);
      await themeManager.initialize();

      themeManager.destroy();
      expect(() => themeManager.destroy()).not.toThrow();
      expect(() => themeManager.destroy()).not.toThrow();
    });
  });

  describe('Edge Cases and Error Recovery', () => {
    it('should recover from corrupted theme data', async () => {
      const corruptedConfig = {
        ...themeConfig,
        availableThemes: [
          { ...lightTheme, colors: null as any }, // Corrupted theme
          darkTheme // Valid theme
        ]
      };

      themeManager = new ThemeManager(corruptedConfig);
      await themeManager.initialize();

      // Should still be able to use valid theme
      await expect(themeManager.setTheme('dark')).resolves.not.toThrow();
    });

    it('should handle missing DOM APIs gracefully', async () => {
      // Temporarily remove DOM APIs
      const originalMatchMedia = mockWindow.matchMedia;
      const originalResizeObserver = mockWindow.ResizeObserver;

      delete (mockWindow as any).matchMedia;
      delete (mockWindow as any).ResizeObserver;

      themeManager = new ThemeManager(themeConfig);
      await expect(themeManager.initialize()).resolves.not.toThrow();

      // Restore APIs
      mockWindow.matchMedia = originalMatchMedia;
      mockWindow.ResizeObserver = originalResizeObserver;
    });

    it('should handle concurrent theme changes', async () => {
      themeManager = new ThemeManager(themeConfig);
      await themeManager.initialize();

      // Simulate concurrent theme changes
      const promises = [
        themeManager.setTheme('light'),
        themeManager.setTheme('dark'),
        themeManager.setTheme('light'),
        themeManager.setTheme('dark')
      ];

      await expect(Promise.all(promises)).resolves.not.toThrow();
      
      // Final theme should be deterministic (last one wins)
      expect(['light', 'dark']).toContain(themeManager.getCurrentTheme());
    });
  });
});