/**
 * CSS Custom Property Manager
 * Comprehensive system for managing CSS custom properties with validation and fallbacks
 */
import type { CSSCustomProperty, CSSCustomProperties, CSSValidationResult, ThemingEvents } from '../types/Theming';
/**
 * CSS custom property configuration
 */
export interface CSSCustomPropertyConfig {
    /** CSS prefix for custom properties */
    prefix: string;
    /** Enable validation */
    enableValidation: boolean;
    /** Include fallback values */
    includeFallbacks: boolean;
    /** Auto-generate CSS */
    autoGenerateCSS: boolean;
    /** CSS injection target */
    injectionTarget: 'head' | 'document' | HTMLElement;
    /** Enable debugging */
    debug: boolean;
}
/**
 * Comprehensive CSS custom property management with validation and fallbacks
 */
export declare class CSSCustomPropertyManager {
    private config;
    private properties;
    private validators;
    private eventListeners;
    private isInitialized;
    private styleElement;
    private readonly builtInValidators;
    private readonly defaultProperties;
    constructor(config?: Partial<CSSCustomPropertyConfig>);
    /**
     * Initialize CSS custom property manager
     */
    init(): Promise<void>;
    /**
     * Destroy CSS custom property manager
     */
    destroy(): void;
    /**
     * Set a CSS custom property
     */
    setProperty(name: string, value: string, options?: Partial<CSSCustomProperty>): void;
    /**
     * Get a CSS custom property
     */
    getProperty(name: string): CSSCustomProperty | null;
    /**
     * Get all CSS custom properties
     */
    getAllProperties(): CSSCustomProperties;
    /**
     * Get properties by category
     */
    getPropertiesByCategory(category: string): CSSCustomProperties;
    /**
     * Remove a CSS custom property
     */
    removeProperty(name: string): boolean;
    /**
     * Validate a CSS custom property
     */
    validateProperty(property: CSSCustomProperty): CSSValidationResult;
    /**
     * Validate all CSS custom properties
     */
    validateAllProperties(): CSSValidationResult;
    /**
     * Generate CSS from custom properties
     */
    generateCSS(): string;
    /**
     * Export properties in various formats
     */
    exportProperties(format?: 'json' | 'css' | 'scss' | 'js'): string;
    /**
     * Import properties from various formats
     */
    importProperties(data: string, format?: 'json' | 'css'): void;
    /**
     * Add event listener
     */
    on<K extends keyof ThemingEvents>(event: K, handler: ThemingEvents[K]): void;
    /**
     * Remove event listener
     */
    off<K extends keyof ThemingEvents>(event: K, handler: ThemingEvents[K]): void;
    private initializeEventMaps;
    private initializeValidators;
    private loadDefaultProperties;
    private loadProperties;
    private normalizePropertyName;
    private createStyleElement;
    private generateAndInjectCSS;
    private updateCSSProperty;
    private generateFallbackCSS;
    private generateSCSS;
    private generateJS;
    private parseCSSAndLoad;
    private isValidColor;
    private isValidLength;
    private isValidNumber;
    private isValidPercentage;
    private isValidShadow;
    private isValidFontFamily;
    private isValidTimingFunction;
    private emit;
}
//# sourceMappingURL=CSSCustomPropertyManager.d.ts.map