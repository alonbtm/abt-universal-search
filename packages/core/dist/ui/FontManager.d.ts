/**
 * Font Manager
 * International font compatibility with automatic font selection and web font loading
 */
import type { FontConfig, WritingSystem, FontWeight, LocaleCode, FontLoadingResult, InternationalizationEvents } from '../types/Internationalization';
/**
 * Font loading state
 */
interface FontLoadingState {
    family: string;
    status: 'loading' | 'loaded' | 'error' | 'timeout';
    startTime: number;
    loadTime?: number;
    error?: string;
}
/**
 * Font metrics for layout calculations
 */
interface FontMetrics {
    family: string;
    size: number;
    lineHeight: number;
    ascent: number;
    descent: number;
    capHeight: number;
    xHeight: number;
}
/**
 * Comprehensive international font management with web font loading and optimization
 */
export declare class FontManager {
    private config;
    private isInitialized;
    private loadedFonts;
    private loadingFonts;
    private fontStacks;
    private eventListeners;
    private fontFaceObserver;
    private readonly FONT_LOAD_TIMEOUT;
    private readonly defaultFontStacks;
    private readonly webFontUrls;
    constructor(config?: Partial<FontConfig>);
    /**
     * Initialize font manager
     */
    init(): Promise<void>;
    /**
     * Destroy font manager and cleanup resources
     */
    destroy(): void;
    /**
     * Get optimal font stack for text content
     */
    getFontStackForText(text: string): string[];
    /**
     * Get font stack for specific writing system
     */
    getFontStackForWritingSystem(writingSystem: WritingSystem): string[];
    /**
     * Get font stack for locale
     */
    getFontStackForLocale(locale: LocaleCode): string[];
    /**
     * Load web font
     */
    loadFont(family: string, url?: string, options?: FontFaceDescriptors): Promise<FontLoadingResult>;
    /**
     * Check if font is loaded
     */
    isFontLoaded(family: string): boolean;
    /**
     * Check if font is loading
     */
    isFontLoading(family: string): boolean;
    /**
     * Get loading status for font
     */
    getFontLoadingStatus(family: string): FontLoadingState | null;
    /**
     * Apply font stack to element
     */
    applyFontStack(element: HTMLElement, text?: string, writingSystem?: WritingSystem): void;
    /**
     * Optimize fonts for performance
     */
    optimizeFonts(): void;
    /**
     * Get font metrics for text measurement
     */
    getFontMetrics(family: string, size?: number, weight?: FontWeight): FontMetrics;
    /**
     * Generate CSS font-face rules
     */
    generateFontFaceCSS(): string;
    /**
     * Get supported scripts for font
     */
    getSupportedScripts(family: string): WritingSystem[];
    /**
     * Add event listener
     */
    on<K extends keyof InternationalizationEvents>(event: K, handler: InternationalizationEvents[K]): void;
    /**
     * Remove event listener
     */
    off<K extends keyof InternationalizationEvents>(event: K, handler: InternationalizationEvents[K]): void;
    private initializeFontStacks;
    private checkFontFaceSupport;
    private preloadFonts;
    private setupFontOptimization;
    private performFontLoad;
    private loadFontViaCSS;
    private addResourceHints;
    private addFontDisplayCSS;
    private injectOptimizationCSS;
    private preconnectFontCDNs;
    private removeUnusedFontVariations;
    private getDefaultFontMetrics;
    private emit;
    private initializeEventMaps;
}
export {};
//# sourceMappingURL=FontManager.d.ts.map