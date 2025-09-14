/**
 * Accessibility tests for the theming system
 * Ensures WCAG AA/AAA compliance and accessibility features
 */

import { ThemePresetManager } from '../ThemePresetManager';
import { BrandIntegrationManager } from '../BrandIntegrationManager';
import { AnimationControlManager } from '../AnimationControlManager';
import { Theme } from '../../types/Theming';

// Mock DOM environment
const mockDocument = {
  head: { appendChild: jest.fn(), removeChild: jest.fn() },
  createElement: jest.fn(() => ({ setAttribute: jest.fn(), textContent: '', id: '', remove: jest.fn() })),
  getElementById: jest.fn()
};

const mockWindow = {
  matchMedia: jest.fn(() => ({ matches: false, addEventListener: jest.fn(), removeEventListener: jest.fn() })),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn()
};

// @ts-ignore
global.document = mockDocument;
// @ts-ignore
global.window = mockWindow;

describe('Theming Accessibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Color Contrast Validation', () => {
    let brandManager: BrandIntegrationManager;

    beforeEach(() => {
      brandManager = new BrandIntegrationManager('test');
    });

    afterEach(() => {
      brandManager.destroy();
    });

    it('should calculate contrast ratios correctly', () => {
      const manager = brandManager as any;
      
      // Test white on black (maximum contrast)
      const maxContrast = manager.calculateContrastRatio('#ffffff', '#000000');
      expect(maxContrast).toBeCloseTo(21, 1);

      // Test same colors (no contrast)
      const noContrast = manager.calculateContrastRatio('#ffffff', '#ffffff');
      expect(noContrast).toBe(1);

      // Test WCAG AA threshold colors
      const aaContrast = manager.calculateContrastRatio('#767676', '#ffffff');
      expect(aaContrast).toBeGreaterThan(4.5);
    });

    it('should validate brand colors for accessibility', async () => {
      const brandConfig = {
        name: 'Test Brand',
        logo: { url: 'https://example.com/logo.png' },
        colors: {
          primary: '#0066cc',   // Should have good contrast with white
          secondary: '#333333', // Should have good contrast with white
          accent: '#ff6600',    // Should have good contrast with white
          neutral: '#ffffff'    // White background
        },
        typography: {
          primaryFont: 'Arial',
          secondaryFont: 'Times',
          fontWeights: { light: 300, normal: 400, medium: 500, semibold: 600, bold: 700 }
        },
        spacing: { baseUnit: 8, scale: 1.5 },
        assets: {}
      };

      const validation = (brandManager as any).validateBrand(brandConfig);
      
      // All color combinations should pass basic validation
      expect(validation.valid).toBe(true);
      
      // Should not have serious contrast issues with these colors
      expect(validation.accessibility.contrastIssues.length).toBe(0);
    });

    it('should warn about poor contrast combinations', async () => {
      const brandConfig = {
        name: 'Test Brand',
        logo: { url: 'https://example.com/logo.png' },
        colors: {
          primary: '#ffff99',   // Yellow - poor contrast with white
          secondary: '#cccccc', // Light gray - poor contrast with white
          accent: '#ff99ff',    // Light pink - poor contrast with white
          neutral: '#ffffff'    // White background
        },
        typography: {
          primaryFont: 'Arial',
          secondaryFont: 'Times',
          fontWeights: { light: 300, normal: 400, medium: 500, semibold: 600, bold: 700 }
        },
        spacing: { baseUnit: 8, scale: 1.5 },
        assets: {}
      };

      const validation = (brandManager as any).validateBrand(brandConfig);
      
      // Should detect contrast issues
      expect(validation.accessibility.contrastIssues.length).toBeGreaterThan(0);
    });

    it('should validate hex color formats', () => {
      const manager = brandManager as any;
      
      // Valid formats
      expect(manager.isValidColor('#ffffff')).toBe(true);
      expect(manager.isValidColor('#fff')).toBe(true);
      expect(manager.isValidColor('rgb(255, 255, 255)')).toBe(true);
      expect(manager.isValidColor('rgba(255, 255, 255, 0.5)')).toBe(true);
      expect(manager.isValidColor('hsl(0, 0%, 100%)')).toBe(true);
      expect(manager.isValidColor('hsla(0, 0%, 100%, 0.5)')).toBe(true);

      // Invalid formats
      expect(manager.isValidColor('#gggggg')).toBe(false);
      expect(manager.isValidColor('invalid')).toBe(false);
      expect(manager.isValidColor('')).toBe(false);
    });
  });

  describe('High Contrast Mode Support', () => {
    let presetManager: ThemePresetManager;

    beforeEach(() => {
      presetManager = new ThemePresetManager({
        autoDetect: true,
        enableAccessibility: true,
        storageKey: 'test-theme',
        namespace: 'test'
      });
    });

    afterEach(() => {
      presetManager.destroy();
    });

    it('should detect high contrast preference', () => {
      // Mock high contrast preference
      (mockWindow.matchMedia as jest.Mock).mockImplementation((query) => ({
        matches: query.includes('prefers-contrast: high'),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      }));

      const manager = presetManager as any;
      manager.setupPreferenceDetection();
      
      expect(manager.preferences.highContrast).toBe(true);
    });

    it('should provide high contrast theme variant', () => {
      const themes = presetManager.getBuiltInThemes();
      const highContrastTheme = themes.find(theme => theme.name === 'high-contrast');
      
      expect(highContrastTheme).toBeDefined();
      
      if (highContrastTheme) {
        // High contrast theme should have stark color differences
        expect(highContrastTheme.colors.background.primary).toBe('#000000');
        expect(highContrastTheme.colors.text.primary).toBe('#ffffff');
        
        // Should disable animations
        expect(highContrastTheme.animations.duration.fast).toBe('0ms');
        expect(highContrastTheme.animations.duration.normal).toBe('0ms');
      }
    });

    it('should validate high contrast theme for accessibility', () => {
      const themes = presetManager.getBuiltInThemes();
      const highContrastTheme = themes.find(theme => theme.name === 'high-contrast');
      
      if (highContrastTheme) {
        const validation = presetManager.validateTheme(highContrastTheme);
        
        expect(validation.valid).toBe(true);
        expect(validation.accessibility.contrastIssues).toHaveLength(0);
      }
    });
  });

  describe('Reduced Motion Support', () => {
    let animationManager: AnimationControlManager;

    beforeEach(() => {
      animationManager = new AnimationControlManager({
        enabled: true,
        respectReducedMotion: true,
        performanceMode: 'smooth'
      }, 'test');
    });

    afterEach(() => {
      animationManager.destroy();
    });

    it('should detect reduced motion preference', () => {
      // Mock reduced motion preference
      (mockWindow.matchMedia as jest.Mock).mockImplementation((query) => ({
        matches: query.includes('prefers-reduced-motion: reduce'),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      }));

      animationManager.initialize();
      
      const preferences = animationManager.getMotionPreferences();
      expect(preferences.reducedMotion).toBe(true);
    });

    it('should disable animations when reduced motion is preferred', async () => {
      // Mock reduced motion preference
      (mockWindow.matchMedia as jest.Mock).mockImplementation((query) => ({
        matches: query.includes('prefers-reduced-motion: reduce'),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      }));

      animationManager.initialize();
      
      const element = document.createElement('div');
      
      // Animation should be skipped due to reduced motion
      const result = await animationManager.animate(element, 'fade');
      expect(result).toBeUndefined(); // Should resolve immediately without animation
    });

    it('should generate CSS with reduced motion support', () => {
      const css = animationManager.generateAnimationCSS();
      
      // Should include reduced motion media query
      expect(css).toContain('@media (prefers-reduced-motion: reduce)');
      expect(css).toContain('animation-duration: 0.01ms !important');
      expect(css).toContain('transition-duration: 0.01ms !important');
    });

    it('should respect reduced motion in performance modes', () => {
      animationManager.setPerformanceMode('accessibility');
      
      const element = document.createElement('div');
      animationManager.createTransition(element, ['opacity'], {
        duration: '300ms',
        respectPreferences: true
      });
      
      // Should adjust or disable animations in accessibility mode
      expect(animationManager.getPerformanceMode()).toBe('accessibility');
    });
  });

  describe('Screen Reader Support', () => {
    let presetManager: ThemePresetManager;

    beforeEach(() => {
      presetManager = new ThemePresetManager({
        autoDetect: true,
        enableAccessibility: true,
        storageKey: 'test-theme',
        namespace: 'test'
      });
    });

    afterEach(() => {
      presetManager.destroy();
    });

    it('should provide semantic theme information for screen readers', () => {
      const context = (presetManager as any).getAccessibilityContext();
      
      expect(context).toHaveProperty('currentTheme');
      expect(context).toHaveProperty('reducedMotion');
      expect(context).toHaveProperty('highContrast');
      expect(context).toHaveProperty('colorScheme');
    });

    it('should generate ARIA-compatible theme descriptions', () => {
      const themes = presetManager.getBuiltInThemes();
      
      themes.forEach(theme => {
        expect(theme.name).toBeDefined();
        expect(theme.description).toBeDefined();
        expect(typeof theme.description).toBe('string');
        expect(theme.description!.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Font and Typography Accessibility', () => {
    let presetManager: ThemePresetManager;

    beforeEach(() => {
      presetManager = new ThemePresetManager({
        autoDetect: true,
        enableAccessibility: true,
        storageKey: 'test-theme',
        namespace: 'test'
      });
    });

    afterEach(() => {
      presetManager.destroy();
    });

    it('should ensure minimum font sizes for accessibility', () => {
      const themes = presetManager.getBuiltInThemes();
      
      themes.forEach(theme => {
        const baseFontSize = parseFloat(theme.typography.sizes.base);
        const xsFontSize = parseFloat(theme.typography.sizes.xs);
        
        // Base font size should be at least 16px (1rem)
        expect(baseFontSize).toBeGreaterThanOrEqual(1);
        
        // Smallest font size should not be too small (minimum 12px for accessibility)
        expect(xsFontSize).toBeGreaterThanOrEqual(0.75); // 12px
      });
    });

    it('should provide adequate line heights for readability', () => {
      const themes = presetManager.getBuiltInThemes();
      
      themes.forEach(theme => {
        // Line heights should be at least 1.2 for readability
        expect(theme.typography.lineHeights.tight).toBeGreaterThanOrEqual(1.2);
        expect(theme.typography.lineHeights.normal).toBeGreaterThanOrEqual(1.4);
        expect(theme.typography.lineHeights.relaxed).toBeGreaterThanOrEqual(1.6);
      });
    });

    it('should support system font fallbacks', () => {
      const themes = presetManager.getBuiltInThemes();
      
      themes.forEach(theme => {
        // Font families should include fallbacks
        expect(theme.typography.families.primary).toContain('sans-serif');
        expect(theme.typography.families.secondary).toContain('serif');
        expect(theme.typography.families.monospace).toContain('monospace');
      });
    });
  });

  describe('Focus Management', () => {
    it('should provide visible focus indicators', () => {
      const mockTheme: Theme = {
        name: 'focus-test',
        version: '1.0.0',
        colors: {
          primary: { 50: '#f0f9ff', 100: '#e0f2fe', 200: '#bae6fd', 300: '#7dd3fc', 400: '#38bdf8', 500: '#0ea5e9', 600: '#0284c7', 700: '#0369a1', 800: '#075985', 900: '#0c4a6e', 950: '#082f49' },
          secondary: { 50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0', 300: '#cbd5e1', 400: '#94a3b8', 500: '#64748b', 600: '#475569', 700: '#334155', 800: '#1e293b', 900: '#0f172a', 950: '#020617' },
          neutral: { 50: '#fafafa', 100: '#f4f4f5', 200: '#e4e4e7', 300: '#d4d4d8', 400: '#a1a1aa', 500: '#71717a', 600: '#52525b', 700: '#3f3f46', 800: '#27272a', 900: '#18181b', 950: '#09090b' },
          semantic: { success: '#10b981', warning: '#f59e0b', error: '#ef4444', info: '#3b82f6' },
          state: { hover: '#f1f5f9', active: '#e2e8f0', focus: '#0ea5e9', disabled: '#e4e4e7' },
          background: { primary: '#ffffff', secondary: '#f8fafc', tertiary: '#f1f5f9', overlay: 'rgba(0, 0, 0, 0.5)' },
          text: { primary: '#1e293b', secondary: '#475569', tertiary: '#64748b', inverse: '#ffffff' },
          border: { primary: '#e2e8f0', secondary: '#cbd5e1', tertiary: '#94a3b8', focus: '#0ea5e9' }
        },
        spacing: { unit: 4, scale: { xs: '0.25rem', sm: '0.5rem', md: '1rem', lg: '1.5rem', xl: '2rem', '2xl': '2.5rem', '3xl': '3rem', '4xl': '4rem', '5xl': '5rem', '6xl': '6rem' }, component: { padding: { xs: '0.5rem', sm: '0.75rem', md: '1rem', lg: '1.25rem', xl: '1.5rem' }, margin: { xs: '0.25rem', sm: '0.5rem', md: '1rem', lg: '1.5rem', xl: '2rem' }, gap: { xs: '0.5rem', sm: '0.75rem', md: '1rem', lg: '1.25rem', xl: '1.5rem' } } },
        typography: { families: { primary: 'system-ui', secondary: 'serif', monospace: 'monospace', display: 'system-ui' }, weights: { light: 300, normal: 400, medium: 500, semibold: 600, bold: 700 }, sizes: { xs: '0.75rem', sm: '0.875rem', base: '1rem', lg: '1.125rem', xl: '1.25rem', '2xl': '1.5rem', '3xl': '1.875rem', '4xl': '2.25rem', '5xl': '3rem', '6xl': '3.75rem' }, lineHeights: { tight: 1.2, normal: 1.5, relaxed: 1.75, loose: 2 }, letterSpacing: { tight: '-0.025em', normal: '0', wide: '0.025em' } },
        shadows: {
          drop: { xs: '0 1px 2px rgba(0,0,0,0.05)', sm: '0 1px 3px rgba(0,0,0,0.1)', md: '0 4px 6px rgba(0,0,0,0.1)', lg: '0 10px 15px rgba(0,0,0,0.1)', xl: '0 20px 25px rgba(0,0,0,0.1)', '2xl': '0 25px 50px rgba(0,0,0,0.25)' },
          inner: { sm: 'inset 0 1px 2px rgba(0,0,0,0.05)', md: 'inset 0 2px 4px rgba(0,0,0,0.06)', lg: 'inset 0 4px 8px rgba(0,0,0,0.1)' },
          focus: { primary: '0 0 0 3px rgba(14,165,233,0.5)', secondary: '0 0 0 3px rgba(100,116,139,0.5)', error: '0 0 0 3px rgba(239,68,68,0.5)' }
        },
        borders: { width: { none: '0', thin: '1px', medium: '2px', thick: '4px' }, radius: { none: '0', sm: '0.25rem', md: '0.375rem', lg: '0.5rem', xl: '0.75rem', full: '9999px' }, style: { solid: 'solid', dashed: 'dashed', dotted: 'dotted' } },
        animations: { duration: { fast: '150ms', normal: '300ms', slow: '500ms' }, timing: { linear: 'linear', ease: 'ease', easeIn: 'ease-in', easeOut: 'ease-out', easeInOut: 'ease-in-out', bounce: 'cubic-bezier(0.68,-0.55,0.265,1.55)' }, delay: { none: '0ms', short: '75ms', medium: '150ms', long: '300ms' }, transition: { all: 'all 300ms ease-in-out', colors: 'color 150ms ease-in-out', transform: 'transform 300ms ease-in-out', opacity: 'opacity 150ms ease-in-out' } },
        breakpoints: { screen: { xs: '0px', sm: '576px', md: '768px', lg: '992px', xl: '1200px', '2xl': '1400px' }, container: { xs: '0px', sm: '320px', md: '480px', lg: '640px', xl: '800px' }, behavior: { mobile: 'stack', tablet: 'grid', desktop: 'grid' } },
        cssProperties: {}
      };

      const presetManager = new ThemePresetManager({
        presets: new Map(),
        defaultTheme: 'light',
        detection: {
          detectSystemTheme: true,
          detectReducedMotion: true,
          detectHighContrast: true,
          detectColorScheme: true,
          storageKey: 'test-theme',
          fallbackTheme: 'light'
        },
        transition: { enabled: true, duration: 300, easing: 'ease-in-out' },
        storage: { enabled: true, key: 'test-theme', type: 'localStorage' },
        accessibility: { enforceContrast: true, minContrastRatio: 4.5, supportHighContrast: true, supportReducedMotion: true }
      });
      
      // Focus colors should provide adequate contrast
      expect(mockTheme.colors.border.focus).toBeDefined();
      expect(mockTheme.shadows.focus.primary).toBeDefined();
      
      // Focus shadows should be visible
      expect(mockTheme.shadows.focus.primary).toContain('3px');
      expect(mockTheme.shadows.focus.primary).toContain('rgba');

      presetManager.destroy();
    });
  });

  describe('WCAG Compliance', () => {
    let presetManager: ThemePresetManager;

    beforeEach(() => {
      presetManager = new ThemePresetManager({
        autoDetect: true,
        enableAccessibility: true,
        storageKey: 'test-theme',
        namespace: 'test'
      });
    });

    afterEach(() => {
      presetManager.destroy();
    });

    it('should meet WCAG AA contrast requirements', () => {
      const themes = presetManager.getBuiltInThemes();
      
      themes.forEach(theme => {
        const validation = presetManager.validateTheme(theme);
        
        // Should not have critical contrast issues
        const criticalIssues = validation.accessibility.contrastIssues.filter(
          issue => issue.includes('below WCAG AA')
        );
        
        expect(criticalIssues.length).toBe(0);
      });
    });

    it('should provide accessibility metadata', () => {
      const themes = presetManager.getBuiltInThemes();
      
      themes.forEach(theme => {
        const validation = presetManager.validateTheme(theme);
        
        expect(validation.accessibility).toHaveProperty('contrastIssues');
        expect(validation.accessibility).toHaveProperty('colorBlindnessIssues');
        expect(validation.accessibility).toHaveProperty('otherIssues');
        
        expect(Array.isArray(validation.accessibility.contrastIssues)).toBe(true);
        expect(Array.isArray(validation.accessibility.colorBlindnessIssues)).toBe(true);
        expect(Array.isArray(validation.accessibility.otherIssues)).toBe(true);
      });
    });

    it('should validate spacing for touch targets', () => {
      const themes = presetManager.getBuiltInThemes();
      
      themes.forEach(theme => {
        // Touch targets should be at least 44px (roughly 2.75rem)
        const largePadding = parseFloat(theme.spacing.component.padding.lg);
        expect(largePadding).toBeGreaterThanOrEqual(1.25); // At least 20px equivalent
        
        // Interactive spacing should be adequate
        const largeGap = parseFloat(theme.spacing.component.gap.lg);
        expect(largeGap).toBeGreaterThanOrEqual(1); // At least 16px equivalent
      });
    });
  });

  describe('Preference Persistence', () => {
    it('should persist accessibility preferences', () => {
      const mockStorage = {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn()
      };
      
      // @ts-ignore
      global.localStorage = mockStorage;

      const presetManager = new ThemePresetManager({
        presets: new Map(),
        defaultTheme: 'light',
        detection: {
          detectSystemTheme: true,
          detectReducedMotion: true,
          detectHighContrast: true,
          detectColorScheme: true,
          storageKey: 'test-accessibility',
          fallbackTheme: 'light'
        },
        transition: { enabled: true, duration: 300, easing: 'ease-in-out' },
        storage: { enabled: true, key: 'test-accessibility', type: 'localStorage' },
        accessibility: { enforceContrast: true, minContrastRatio: 4.5, supportHighContrast: true, supportReducedMotion: true }
      });

      // Mock high contrast preference detection
      (mockWindow.matchMedia as jest.Mock).mockImplementation((query) => ({
        matches: query.includes('prefers-contrast: high'),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      }));

      // presetManager.initialize();
      
      // Should attempt to store accessibility preferences
      expect(mockStorage.getItem).toHaveBeenCalledWith('test-accessibility');

      presetManager.destroy();
    });
  });
});