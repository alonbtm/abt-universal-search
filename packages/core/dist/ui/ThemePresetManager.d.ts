/**
 * Theme Preset Manager
 * Comprehensive theme preset system with auto-detection and smooth transitions
 */
import type { Theme, ThemePreset, ThemeDetectionConfig, ThemingEvents, ThemeValidationResult, AccessibilityThemeRequirements } from '../types/Theming';
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
export declare class ThemePresetManager {
    private config;
    private currentTheme;
    private isInitialized;
    private eventListeners;
    private mediaQueries;
    private themeObserver;
    private readonly builtInThemes;
    constructor(config?: Partial<ThemePresetConfig>);
    /**
     * Initialize theme preset manager
     */
    init(): Promise<void>;
    /**
     * Destroy theme preset manager
     */
    destroy(): void;
    /**
     * Set theme preset
     */
    setTheme(themeName: string): Promise<void>;
    /**
     * Get current theme
     */
    getCurrentTheme(): string;
    /**
     * Get available themes
     */
    getAvailableThemes(): string[];
    /**
     * Get theme definition
     */
    getTheme(themeName: string): Theme | null;
    /**
     * Add custom theme preset
     */
    addTheme(name: string, theme: Theme): void;
    /**
     * Remove theme preset
     */
    removeTheme(name: string): boolean;
    /**
     * Detect system theme preferences
     */
    detectSystemTheme(): SystemThemeDetection;
    /**
     * Auto-detect and apply appropriate theme
     */
    autoDetectTheme(): Promise<string>;
    /**
     * Toggle between light and dark themes
     */
    toggleTheme(): Promise<string>;
    /**
     * Check if reduced motion is preferred
     */
    isReducedMotionPreferred(): boolean;
    /**
     * Check if high contrast is preferred
     */
    isHighContrastPreferred(): boolean;
    /**
     * Validate theme against accessibility requirements
     */
    validateTheme(theme: Theme): ThemeValidationResult;
    /**
     * Add event listener
     */
    on<K extends keyof ThemingEvents>(event: K, handler: ThemingEvents[K]): void;
    /**
     * Remove event listener
     */
    off<K extends keyof ThemingEvents>(event: K, handler: ThemingEvents[K]): void;
    private initializeEventMaps;
    private setupMediaQueryListeners;
    private handleMediaQueryChange;
    private detectInitialTheme;
    private applyThemeWithTransition;
    private applyThemeImmediate;
    private setupThemeObserver;
    private validateCurrentTheme;
    private storeThemePreference;
    private getStoredThemePreference;
    private validateColorContrast;
    private validateFocusIndicators;
    private checkColorBlindnessAccessibility;
    private emit;
    private createLightTheme;
    private createDarkTheme;
    private createHighContrastTheme;
}
export {};
//# sourceMappingURL=ThemePresetManager.d.ts.map