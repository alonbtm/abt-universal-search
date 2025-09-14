export interface BrandLogo {
    url: string;
    alt?: string;
    width?: number;
    height?: number;
    position?: 'left' | 'center' | 'right';
    darkModeUrl?: string;
    highContrastUrl?: string;
}
export interface BrandColors {
    primary: string;
    secondary: string;
    accent: string;
    neutral: string;
    gradient?: {
        start: string;
        end: string;
        direction?: string;
    };
}
export interface BrandTypography {
    primaryFont: string;
    secondaryFont: string;
    displayFont?: string;
    monoFont?: string;
    fontWeights: {
        light: number;
        normal: number;
        medium: number;
        semibold: number;
        bold: number;
    };
    letterSpacing?: {
        tight: string;
        normal: string;
        wide: string;
    };
}
export interface BrandSpacing {
    baseUnit: number;
    scale: number;
    customUnits?: {
        [key: string]: string;
    };
}
export interface BrandAssets {
    [key: string]: {
        url: string;
        alt?: string;
        type: 'image' | 'icon' | 'video' | 'font';
        variants?: {
            [variant: string]: string;
        };
    };
}
export interface BrandConfig {
    name: string;
    version?: string;
    logo: BrandLogo;
    colors: BrandColors;
    typography: BrandTypography;
    spacing: BrandSpacing;
    assets: BrandAssets;
    customProperties?: Record<string, string>;
}
export interface BrandValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
    accessibility: {
        contrastIssues: string[];
        readabilityIssues: string[];
        recommendations: string[];
    };
}
export interface BrandAssetLoadResult {
    url: string;
    loaded: boolean;
    error?: string;
    dimensions?: {
        width: number;
        height: number;
    };
    format?: string;
}
export declare class BrandIntegrationManager {
    private namespace;
    private currentBrand;
    private loadedAssets;
    private fontLoadPromises;
    private eventListeners;
    constructor(namespace?: string);
    setBrand(brand: BrandConfig): Promise<void>;
    getBrand(): BrandConfig | null;
    loadLogo(themeVariant?: 'light' | 'dark' | 'high-contrast'): Promise<BrandAssetLoadResult>;
    loadAsset(url: string, key: string): Promise<BrandAssetLoadResult>;
    loadBrandFonts(): Promise<void>;
    generateBrandCSS(): string;
    getBrandColors(): BrandColors | null;
    getBrandTypography(): BrandTypography | null;
    updateBrandColors(colors: Partial<BrandColors>): void;
    updateBrandTypography(typography: Partial<BrandTypography>): void;
    clearBrand(): void;
    exportBrand(format?: 'json' | 'css'): string;
    on(event: string, callback: Function): void;
    off(event: string, callback: Function): void;
    destroy(): void;
    private validateBrand;
    private validateColorAccessibility;
    private loadBrandAssets;
    private applyBrandStyling;
    private injectBrandCSS;
    private removeBrandCSS;
    private applyLogoStyling;
    private generateColorCSS;
    private generateTypographyCSS;
    private generateSpacingCSS;
    private generateCustomPropertiesCSS;
    private loadFont;
    private getImageDimensions;
    private isValidColor;
    private calculateContrastRatio;
    private hexToRgb;
    private emit;
}
//# sourceMappingURL=BrandIntegrationManager.d.ts.map