import { CSSCustomPropertyManager } from './CSSCustomPropertyManager';
import { ThemePresetManager } from './ThemePresetManager';
import { StyleInjectionManager } from './StyleInjectionManager';
import { BrandIntegrationManager } from './BrandIntegrationManager';
import { ResponsiveManager } from './ResponsiveManager';
import { AnimationControlManager } from './AnimationControlManager';
import { ValidationError } from '../errors/ThemingErrors';
export class ThemeManager {
    constructor(config, options = {}) {
        this.config = config;
        this.options = options;
        this.styleInjectionManager = null;
        this.brandManager = null;
        this.responsiveManager = null;
        this.animationManager = null;
        this.currentTheme = 'light';
        this.availableThemes = new Map();
        this.eventListeners = new Map();
        this.initialized = false;
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
    async initialize() {
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
    async setTheme(themeName) {
        if (!this.availableThemes.has(themeName)) {
            throw new ValidationError(`Theme not found: ${themeName}`);
        }
        const oldTheme = this.currentTheme;
        const theme = this.availableThemes.get(themeName);
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
                assets: {},
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
    getCurrentTheme() {
        return this.currentTheme;
    }
    getAvailableThemes() {
        return Array.from(this.availableThemes.keys());
    }
    getTheme(name) {
        const theme = this.availableThemes.get(name);
        return theme ? { ...theme } : undefined;
    }
    addTheme(theme) {
        this.availableThemes.set(theme.name, theme);
        this.emit('theme-added', theme);
    }
    removeTheme(name) {
        if (name === this.currentTheme) {
            throw new ValidationError('Cannot remove active theme');
        }
        const removed = this.availableThemes.delete(name);
        if (removed) {
            this.emit('theme-removed', name);
        }
        return removed;
    }
    getThemingContext() {
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
    injectCustomStyle(css, options = {}) {
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
    removeCustomStyle(styleId) {
        if (!this.styleInjectionManager) {
            return false;
        }
        return this.styleInjectionManager.removeStyle(styleId);
    }
    setBrand(brandConfig) {
        if (!this.brandManager) {
            throw new ValidationError('Brand integration is disabled');
        }
        return this.brandManager.setBrand(brandConfig);
    }
    setResponsiveBreakpoint(name, value, unit = 'px') {
        if (!this.responsiveManager) {
            throw new ValidationError('Responsive management is disabled');
        }
        this.responsiveManager.addBreakpoint(name, value, unit);
    }
    animate(element, preset, options = {}) {
        if (!this.animationManager) {
            throw new ValidationError('Animation control is disabled');
        }
        return this.animationManager.animate(element, preset, options);
    }
    setAnimationEnabled(enabled) {
        if (!this.animationManager) {
            throw new ValidationError('Animation control is disabled');
        }
        this.animationManager.setEnabled(enabled);
    }
    exportTheme(format = 'json') {
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
    generateThemeCSS() {
        const sections = [];
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
    validateCurrentTheme() {
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
    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }
    off(event, callback) {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }
    destroy() {
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
    loadAvailableThemes() {
        this.config.availableThemes.forEach(theme => {
            this.availableThemes.set(theme.name, theme);
        });
    }
    loadThemeProperties(theme) {
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
    loadColorProperties(colors) {
        Object.entries(colors.primary || {}).forEach(([shade, value]) => {
            this.cssPropertyManager.setProperty(`color-primary-${shade}`, value, {
                category: 'color'
            });
        });
        Object.entries(colors.secondary || {}).forEach(([shade, value]) => {
            this.cssPropertyManager.setProperty(`color-secondary-${shade}`, value, {
                category: 'color'
            });
        });
        Object.entries(colors.semantic || {}).forEach(([type, value]) => {
            this.cssPropertyManager.setProperty(`color-${type}`, value, {
                category: 'color'
            });
        });
    }
    loadSpacingProperties(spacing) {
        if (spacing.unit) {
            this.cssPropertyManager.setProperty('spacing-unit', `${spacing.unit}px`, {
                category: 'spacing'
            });
        }
        Object.entries(spacing.scale || {}).forEach(([size, value]) => {
            this.cssPropertyManager.setProperty(`spacing-${size}`, value, {
                category: 'spacing'
            });
        });
    }
    loadTypographyProperties(typography) {
        Object.entries(typography.families || {}).forEach(([type, value]) => {
            this.cssPropertyManager.setProperty(`font-${type}`, value, {
                category: 'typography'
            });
        });
        Object.entries(typography.sizes || {}).forEach(([size, value]) => {
            this.cssPropertyManager.setProperty(`font-size-${size}`, value, {
                category: 'typography'
            });
        });
        Object.entries(typography.weights || {}).forEach(([weight, value]) => {
            this.cssPropertyManager.setProperty(`font-weight-${weight}`, String(value), {
                category: 'typography'
            });
        });
    }
    loadShadowProperties(shadows) {
        Object.entries(shadows.drop || {}).forEach(([size, value]) => {
            this.cssPropertyManager.setProperty(`shadow-${size}`, value, {
                category: 'shadow'
            });
        });
    }
    loadBorderProperties(borders) {
        Object.entries(borders.radius || {}).forEach(([size, value]) => {
            this.cssPropertyManager.setProperty(`border-radius-${size}`, value, {
                category: 'border'
            });
        });
        Object.entries(borders.width || {}).forEach(([size, value]) => {
            this.cssPropertyManager.setProperty(`border-width-${size}`, value, {
                category: 'border'
            });
        });
    }
    loadAnimationProperties(animations) {
        Object.entries(animations.duration || {}).forEach(([speed, value]) => {
            this.cssPropertyManager.setProperty(`animation-duration-${speed}`, value, {
                category: 'animation'
            });
        });
        Object.entries(animations.timing || {}).forEach(([type, value]) => {
            this.cssPropertyManager.setProperty(`animation-timing-${type}`, value, {
                category: 'animation'
            });
        });
    }
    setupEventListeners() {
        this.presetManager.on('theme-changed', (newTheme, oldTheme) => {
            this.emit('preset-theme-changed', newTheme, oldTheme);
        });
        if (this.responsiveManager) {
            this.responsiveManager.on('breakpoint-changed', (breakpoint) => {
                this.emit('responsive-breakpoint-changed', breakpoint);
            });
        }
        if (this.animationManager) {
            this.animationManager.on('reduced-motion-changed', (reducedMotion) => {
                this.emit('animation-preference-changed', { reducedMotion });
            });
        }
    }
    emit(event, ...args) {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            listeners.forEach(callback => {
                try {
                    callback(...args);
                }
                catch (error) {
                    console.error(`Error in theme manager event listener for ${event}:`, error);
                }
            });
        }
    }
}
//# sourceMappingURL=ThemeManager.js.map