import { Theme, ThemeConfig, ThemePreset, ThemingContext } from '../types/Theming';
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
export declare class ThemeManager {
    private config;
    private options;
    private cssPropertyManager;
    private presetManager;
    private styleInjectionManager;
    private brandManager;
    private responsiveManager;
    private animationManager;
    private currentTheme;
    private availableThemes;
    private eventListeners;
    private initialized;
    constructor(config: ThemeConfig, options?: ThemeManagerOptions);
    initialize(): Promise<void>;
    setTheme(themeName: string): Promise<void>;
    getCurrentTheme(): string;
    getAvailableThemes(): string[];
    getTheme(name: string): Theme | undefined;
    addTheme(theme: Theme): void;
    removeTheme(name: string): boolean;
    getThemingContext(): ThemingContext;
    injectCustomStyle(css: string, options?: {
        priority?: number;
        scope?: 'global' | 'component' | 'element';
        namespace?: string;
        media?: string;
    }): string;
    removeCustomStyle(styleId: string): boolean;
    setBrand(brandConfig: any): Promise<void>;
    setResponsiveBreakpoint(name: string, value: number, unit?: 'px' | 'em' | 'rem'): void;
    animate(element: Element, preset: string, options?: any): Promise<void>;
    setAnimationEnabled(enabled: boolean): void;
    exportTheme(format?: 'json' | 'css'): string;
    generateThemeCSS(): string;
    validateCurrentTheme(): {
        valid: boolean;
        errors: string[];
        warnings: string[];
    };
    on(event: string, callback: Function): void;
    off(event: string, callback: Function): void;
    destroy(): void;
    private loadAvailableThemes;
    private loadThemeProperties;
    private loadColorProperties;
    private loadSpacingProperties;
    private loadTypographyProperties;
    private loadShadowProperties;
    private loadBorderProperties;
    private loadAnimationProperties;
    private setupEventListeners;
    private emit;
}
//# sourceMappingURL=ThemeManager.d.ts.map