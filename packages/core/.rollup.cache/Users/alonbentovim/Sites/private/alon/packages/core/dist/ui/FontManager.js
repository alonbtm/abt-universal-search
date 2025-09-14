/**
 * Font Manager
 * International font compatibility with automatic font selection and web font loading
 */
import { ValidationError } from '../utils/validation';
import { detectWritingSystem } from '../utils/internationalization';
/**
 * Comprehensive international font management with web font loading and optimization
 */
export class FontManager {
    constructor(config = {}) {
        this.isInitialized = false;
        this.loadedFonts = new Set();
        this.loadingFonts = new Map();
        this.fontStacks = new Map();
        this.eventListeners = new Map();
        // Font face observer for detection
        this.fontFaceObserver = null; // FontFaceObserver if available
        // Font loading timeout
        this.FONT_LOAD_TIMEOUT = 10000; // 10 seconds
        // Default font stacks by writing system
        this.defaultFontStacks = {
            latin: {
                primary: ['Inter', 'Roboto', 'system-ui'],
                fallback: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Helvetica Neue'],
                system: ['Arial', 'sans-serif']
            },
            arabic: {
                primary: ['Noto Sans Arabic', 'Tahoma'],
                fallback: ['Arial Unicode MS', 'Lucida Grande'],
                system: ['Tahoma', 'sans-serif']
            },
            hebrew: {
                primary: ['Noto Sans Hebrew', 'Arial Hebrew'],
                fallback: ['Tahoma', 'Arial Unicode MS'],
                system: ['Arial', 'sans-serif']
            },
            cjk: {
                primary: ['Noto Sans CJK SC', 'Source Han Sans'],
                fallback: ['Microsoft YaHei', 'SimSun', 'Hiragino Kaku Gothic Pro'],
                system: ['Arial Unicode MS', 'sans-serif']
            },
            cyrillic: {
                primary: ['Noto Sans', 'PT Sans'],
                fallback: ['Segoe UI', 'Tahoma'],
                system: ['Arial', 'sans-serif']
            },
            devanagari: {
                primary: ['Noto Sans Devanagari', 'Mangal'],
                fallback: ['Arial Unicode MS', 'Lucida Sans Unicode'],
                system: ['Arial', 'sans-serif']
            },
            thai: {
                primary: ['Noto Sans Thai', 'Leelawadee UI'],
                fallback: ['Tahoma', 'Arial Unicode MS'],
                system: ['Arial', 'sans-serif']
            },
            mixed: {
                primary: ['Noto Sans', 'Inter', 'Roboto'],
                fallback: ['system-ui', '-apple-system', 'Segoe UI'],
                system: ['Arial', 'sans-serif']
            }
        };
        // Web font URLs for automatic loading
        this.webFontUrls = {
            'Inter': 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
            'Noto Sans': 'https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;500;600;700&display=swap',
            'Noto Sans Arabic': 'https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;500;600;700&display=swap',
            'Noto Sans Hebrew': 'https://fonts.googleapis.com/css2?family=Noto+Sans+Hebrew:wght@400;500;600;700&display=swap',
            'Noto Sans CJK SC': 'https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;600;700&display=swap',
            'Noto Sans Devanagari': 'https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;500;600;700&display=swap',
            'Noto Sans Thai': 'https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;500;600;700&display=swap'
        };
        this.config = {
            primaryFont: 'system-ui',
            fallbackFonts: this.defaultFontStacks,
            loadingStrategy: 'swap',
            fontDisplay: 'swap',
            preloadFonts: [],
            weightMapping: {
                latin: 'normal',
                arabic: 'medium',
                hebrew: 'medium',
                cjk: 'normal',
                cyrillic: 'normal',
                devanagari: 'medium',
                thai: 'normal',
                mixed: 'normal'
            },
            enableOptimization: true,
            ...config
        };
        this.initializeFontStacks();
        this.initializeEventMaps();
    }
    /**
     * Initialize font manager
     */
    async init() {
        if (this.isInitialized) {
            return;
        }
        try {
            // Check for FontFace API support
            this.checkFontFaceSupport();
            // Preload critical fonts
            if (this.config.preloadFonts.length > 0) {
                await this.preloadFonts(this.config.preloadFonts);
            }
            // Setup font loading optimization
            if (this.config.enableOptimization) {
                this.setupFontOptimization();
            }
            this.isInitialized = true;
        }
        catch (error) {
            throw new ValidationError(`Failed to initialize FontManager: ${error}`);
        }
    }
    /**
     * Destroy font manager and cleanup resources
     */
    destroy() {
        this.loadedFonts.clear();
        this.loadingFonts.clear();
        this.eventListeners.clear();
        this.isInitialized = false;
    }
    /**
     * Get optimal font stack for text content
     */
    getFontStackForText(text) {
        const writingSystems = detectWritingSystem(text);
        if (writingSystems.length === 0) {
            return this.getFontStackForWritingSystem('latin');
        }
        if (writingSystems.length === 1) {
            return this.getFontStackForWritingSystem(writingSystems[0]);
        }
        // Mixed writing systems - use mixed stack
        return this.getFontStackForWritingSystem('mixed');
    }
    /**
     * Get font stack for specific writing system
     */
    getFontStackForWritingSystem(writingSystem) {
        const fontStack = this.fontStacks.get(writingSystem);
        if (!fontStack) {
            return this.fontStacks.get('latin')?.primary || ['system-ui', 'sans-serif'];
        }
        return [
            this.config.primaryFont,
            ...fontStack.primary,
            ...fontStack.fallback,
            ...fontStack.system
        ].filter((font, index, array) => array.indexOf(font) === index); // Remove duplicates
    }
    /**
     * Get font stack for locale
     */
    getFontStackForLocale(locale) {
        const language = locale.split('-')[0];
        // Map languages to writing systems
        const languageToScript = {
            'ar': 'arabic',
            'he': 'hebrew',
            'zh': 'cjk',
            'ja': 'cjk',
            'ko': 'cjk',
            'ru': 'cyrillic',
            'bg': 'cyrillic',
            'sr': 'cyrillic',
            'hi': 'devanagari',
            'ne': 'devanagari',
            'th': 'thai'
        };
        const writingSystem = languageToScript[language] || 'latin';
        return this.getFontStackForWritingSystem(writingSystem);
    }
    /**
     * Load web font
     */
    async loadFont(family, url, options = {}) {
        if (this.loadedFonts.has(family)) {
            return {
                family,
                status: 'loaded',
                loadTime: 0,
                supportedScripts: this.getSupportedScripts(family),
                weight: 'normal',
                style: 'normal'
            };
        }
        const loadingState = {
            family,
            status: 'loading',
            startTime: Date.now()
        };
        this.loadingFonts.set(family, loadingState);
        try {
            const fontUrl = url || this.webFontUrls[family];
            if (!fontUrl) {
                throw new Error(`No URL provided for font: ${family}`);
            }
            // Load font using CSS or FontFace API
            const result = await this.performFontLoad(family, fontUrl, options);
            loadingState.status = 'loaded';
            loadingState.loadTime = Date.now() - loadingState.startTime;
            this.loadedFonts.add(family);
            this.loadingFonts.delete(family);
            this.emit('font-loaded', result);
            return result;
        }
        catch (error) {
            loadingState.status = 'error';
            loadingState.error = error instanceof Error ? error.message : String(error);
            this.emit('font-error', family, error);
            return {
                family,
                status: 'error',
                error: loadingState.error,
                supportedScripts: [],
                weight: 'normal',
                style: 'normal'
            };
        }
    }
    /**
     * Check if font is loaded
     */
    isFontLoaded(family) {
        return this.loadedFonts.has(family);
    }
    /**
     * Check if font is loading
     */
    isFontLoading(family) {
        return this.loadingFonts.has(family);
    }
    /**
     * Get loading status for font
     */
    getFontLoadingStatus(family) {
        return this.loadingFonts.get(family) || null;
    }
    /**
     * Apply font stack to element
     */
    applyFontStack(element, text, writingSystem) {
        let fontStack;
        if (writingSystem) {
            fontStack = this.getFontStackForWritingSystem(writingSystem);
        }
        else if (text) {
            fontStack = this.getFontStackForText(text);
        }
        else {
            fontStack = this.getFontStackForWritingSystem('latin');
        }
        element.style.fontFamily = fontStack.join(', ');
        // Apply appropriate font weight for writing system
        if (writingSystem) {
            const weight = this.config.weightMapping[writingSystem];
            if (weight !== 'normal') {
                element.style.fontWeight = weight;
            }
        }
    }
    /**
     * Optimize fonts for performance
     */
    optimizeFonts() {
        if (!this.config.enableOptimization)
            return;
        // Add font-display CSS property
        this.addFontDisplayCSS();
        // Preconnect to font CDNs
        this.preconnectFontCDNs();
        // Remove unused font variations
        this.removeUnusedFontVariations();
    }
    /**
     * Get font metrics for text measurement
     */
    getFontMetrics(family, size = 16, weight = 'normal') {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) {
            return this.getDefaultFontMetrics(family, size);
        }
        context.font = `${weight} ${size}px ${family}`;
        const metrics = context.measureText('Ag');
        return {
            family,
            size,
            lineHeight: size * 1.2, // Approximate line height
            ascent: metrics.actualBoundingBoxAscent || size * 0.75,
            descent: metrics.actualBoundingBoxDescent || size * 0.25,
            capHeight: metrics.actualBoundingBoxAscent || size * 0.7,
            xHeight: metrics.actualBoundingBoxAscent * 0.5 || size * 0.5
        };
    }
    /**
     * Generate CSS font-face rules
     */
    generateFontFaceCSS() {
        const css = [];
        for (const [family, url] of Object.entries(this.webFontUrls)) {
            css.push(`
        @font-face {
          font-family: '${family}';
          src: url('${url}');
          font-display: ${this.config.fontDisplay};
          font-weight: 400 700;
        }
      `);
        }
        return css.join('\n');
    }
    /**
     * Get supported scripts for font
     */
    getSupportedScripts(family) {
        const scriptMap = {
            'Inter': ['latin'],
            'Noto Sans': ['latin'],
            'Noto Sans Arabic': ['arabic'],
            'Noto Sans Hebrew': ['hebrew'],
            'Noto Sans CJK SC': ['cjk'],
            'Noto Sans Devanagari': ['devanagari'],
            'Noto Sans Thai': ['thai'],
            'system-ui': ['latin', 'mixed'],
            'Arial': ['latin', 'mixed'],
            'Tahoma': ['latin', 'arabic', 'hebrew']
        };
        return scriptMap[family] || ['latin'];
    }
    /**
     * Add event listener
     */
    on(event, handler) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(handler);
    }
    /**
     * Remove event listener
     */
    off(event, handler) {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            const index = listeners.indexOf(handler);
            if (index >= 0) {
                listeners.splice(index, 1);
            }
        }
    }
    // Private implementation methods
    initializeFontStacks() {
        // Merge default font stacks with custom configuration
        Object.entries(this.defaultFontStacks).forEach(([script, stack]) => {
            const customStack = this.config.fallbackFonts[script];
            if (customStack) {
                this.fontStacks.set(script, {
                    primary: [...(Array.isArray(customStack) ? customStack : []), ...stack.primary],
                    fallback: stack.fallback,
                    system: stack.system
                });
            }
            else {
                this.fontStacks.set(script, stack);
            }
        });
    }
    checkFontFaceSupport() {
        if ('FontFace' in window) {
            this.fontFaceObserver = window.FontFace;
        }
        else {
            console.warn('FontFace API not supported, falling back to CSS loading');
        }
    }
    async preloadFonts(fonts) {
        const loadPromises = fonts.map(font => this.loadFont(font));
        await Promise.allSettled(loadPromises);
    }
    setupFontOptimization() {
        // Add resource hints for better loading performance
        this.addResourceHints();
        // Inject font optimization CSS
        this.injectOptimizationCSS();
    }
    async performFontLoad(family, url, options) {
        const startTime = Date.now();
        try {
            if (this.fontFaceObserver && url.startsWith('http')) {
                // Use FontFace API for web fonts
                const fontFace = new FontFace(family, `url(${url})`, {
                    display: this.config.fontDisplay,
                    ...options
                });
                await Promise.race([
                    fontFace.load(),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Font load timeout')), this.FONT_LOAD_TIMEOUT))
                ]);
                document.fonts.add(fontFace);
            }
            else {
                // Use CSS loading for system fonts or fallback
                await this.loadFontViaCSS(family, url);
            }
            const loadTime = Date.now() - startTime;
            return {
                family,
                status: 'loaded',
                loadTime,
                supportedScripts: this.getSupportedScripts(family),
                weight: 'normal',
                style: 'normal'
            };
        }
        catch (error) {
            throw new Error(`Failed to load font ${family}: ${error}`);
        }
    }
    async loadFontViaCSS(family, url) {
        return new Promise((resolve, reject) => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = url;
            link.onload = () => resolve();
            link.onerror = () => reject(new Error(`Failed to load CSS for ${family}`));
            document.head.appendChild(link);
            // Timeout
            setTimeout(() => reject(new Error('CSS load timeout')), this.FONT_LOAD_TIMEOUT);
        });
    }
    addResourceHints() {
        // Add preconnect for Google Fonts
        const preconnect = document.createElement('link');
        preconnect.rel = 'preconnect';
        preconnect.href = 'https://fonts.googleapis.com';
        preconnect.crossOrigin = 'anonymous';
        document.head.appendChild(preconnect);
        const preconnectStatic = document.createElement('link');
        preconnectStatic.rel = 'preconnect';
        preconnectStatic.href = 'https://fonts.gstatic.com';
        preconnectStatic.crossOrigin = 'anonymous';
        document.head.appendChild(preconnectStatic);
    }
    addFontDisplayCSS() {
        const style = document.createElement('style');
        style.textContent = `
      @font-face {
        font-display: ${this.config.fontDisplay};
      }
    `;
        document.head.appendChild(style);
    }
    injectOptimizationCSS() {
        const style = document.createElement('style');
        style.id = 'font-optimization-styles';
        style.textContent = `
      /* Font optimization */
      * {
        text-rendering: optimizeLegibility;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }

      /* Font loading performance */
      .font-loading {
        visibility: hidden;
      }

      .font-loaded {
        visibility: visible;
      }

      /* Script-specific optimizations */
      [lang^="ar"], [dir="rtl"] {
        font-weight: ${this.config.weightMapping.arabic};
      }

      [lang^="he"] {
        font-weight: ${this.config.weightMapping.hebrew};
      }

      [lang^="zh"], [lang^="ja"], [lang^="ko"] {
        font-weight: ${this.config.weightMapping.cjk};
      }

      [lang^="hi"], [lang^="ne"] {
        font-weight: ${this.config.weightMapping.devanagari};
      }

      [lang^="th"] {
        font-weight: ${this.config.weightMapping.thai};
      }
    `;
        if (!document.getElementById('font-optimization-styles')) {
            document.head.appendChild(style);
        }
    }
    preconnectFontCDNs() {
        const cdns = [
            'https://fonts.googleapis.com',
            'https://fonts.gstatic.com'
        ];
        cdns.forEach(cdn => {
            if (!document.querySelector(`link[rel="preconnect"][href="${cdn}"]`)) {
                const link = document.createElement('link');
                link.rel = 'preconnect';
                link.href = cdn;
                link.crossOrigin = 'anonymous';
                document.head.appendChild(link);
            }
        });
    }
    removeUnusedFontVariations() {
        // This would typically analyze usage and remove unused font weights/styles
        // For now, it's a placeholder for optimization logic
        console.log('Font optimization: Removing unused variations');
    }
    getDefaultFontMetrics(family, size) {
        return {
            family,
            size,
            lineHeight: size * 1.2,
            ascent: size * 0.75,
            descent: size * 0.25,
            capHeight: size * 0.7,
            xHeight: size * 0.5
        };
    }
    emit(event, ...args) {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            listeners.forEach(listener => {
                try {
                    listener(...args);
                }
                catch (error) {
                    console.error(`Error in FontManager ${event} listener:`, error);
                }
            });
        }
    }
    initializeEventMaps() {
        const events = [
            'font-loaded',
            'font-error'
        ];
        events.forEach(event => {
            this.eventListeners.set(event, []);
        });
    }
}
//# sourceMappingURL=FontManager.js.map