/**
 * Theming and Customization Type Definitions
 * Comprehensive types for theming, styling, and visual customization
 */
/**
 * CSS custom property value with fallback
 */
export interface CSSCustomProperty {
    /** CSS custom property name */
    name: string;
    /** Property value */
    value: string;
    /** Fallback value for browsers without custom property support */
    fallback?: string;
    /** Property description */
    description?: string;
    /** Property category */
    category?: 'color' | 'spacing' | 'typography' | 'shadow' | 'border' | 'animation' | 'other';
}
/**
 * CSS custom properties collection
 */
export interface CSSCustomProperties {
    [propertyName: string]: CSSCustomProperty;
}
/**
 * Color system with variations
 */
export interface ColorSystem {
    /** Primary color palette */
    primary: {
        50: string;
        100: string;
        200: string;
        300: string;
        400: string;
        500: string;
        600: string;
        700: string;
        800: string;
        900: string;
        950: string;
    };
    /** Secondary color palette */
    secondary: {
        50: string;
        100: string;
        200: string;
        300: string;
        400: string;
        500: string;
        600: string;
        700: string;
        800: string;
        900: string;
        950: string;
    };
    /** Neutral color palette */
    neutral: {
        50: string;
        100: string;
        200: string;
        300: string;
        400: string;
        500: string;
        600: string;
        700: string;
        800: string;
        900: string;
        950: string;
    };
    /** Semantic colors */
    semantic: {
        success: string;
        warning: string;
        error: string;
        info: string;
    };
    /** State colors */
    state: {
        hover: string;
        active: string;
        focus: string;
        disabled: string;
    };
    /** Background colors */
    background: {
        primary: string;
        secondary: string;
        tertiary: string;
        overlay: string;
    };
    /** Text colors */
    text: {
        primary: string;
        secondary: string;
        tertiary: string;
        inverse: string;
    };
    /** Border colors */
    border: {
        primary: string;
        secondary: string;
        tertiary: string;
        focus: string;
    };
}
/**
 * Spacing system
 */
export interface SpacingSystem {
    /** Base spacing unit */
    unit: number;
    /** Spacing scale */
    scale: {
        xs: string;
        sm: string;
        md: string;
        lg: string;
        xl: string;
        '2xl': string;
        '3xl': string;
        '4xl': string;
        '5xl': string;
        '6xl': string;
    };
    /** Component-specific spacing */
    component: {
        padding: {
            xs: string;
            sm: string;
            md: string;
            lg: string;
            xl: string;
        };
        margin: {
            xs: string;
            sm: string;
            md: string;
            lg: string;
            xl: string;
        };
        gap: {
            xs: string;
            sm: string;
            md: string;
            lg: string;
            xl: string;
        };
    };
}
/**
 * Typography system
 */
export interface TypographySystem {
    /** Font families */
    families: {
        primary: string;
        secondary: string;
        monospace: string;
        display: string;
    };
    /** Font weights */
    weights: {
        light: number;
        normal: number;
        medium: number;
        semibold: number;
        bold: number;
    };
    /** Font sizes */
    sizes: {
        xs: string;
        sm: string;
        base: string;
        lg: string;
        xl: string;
        '2xl': string;
        '3xl': string;
        '4xl': string;
        '5xl': string;
        '6xl': string;
    };
    /** Line heights */
    lineHeights: {
        tight: number;
        normal: number;
        relaxed: number;
        loose: number;
    };
    /** Letter spacing */
    letterSpacing: {
        tight: string;
        normal: string;
        wide: string;
    };
}
/**
 * Shadow system
 */
export interface ShadowSystem {
    /** Drop shadows */
    drop: {
        xs: string;
        sm: string;
        md: string;
        lg: string;
        xl: string;
        '2xl': string;
    };
    /** Inner shadows */
    inner: {
        sm: string;
        md: string;
        lg: string;
    };
    /** Focus shadows */
    focus: {
        primary: string;
        secondary: string;
        error: string;
    };
}
/**
 * Border system
 */
export interface BorderSystem {
    /** Border widths */
    width: {
        none: string;
        thin: string;
        medium: string;
        thick: string;
    };
    /** Border radius */
    radius: {
        none: string;
        sm: string;
        md: string;
        lg: string;
        xl: string;
        full: string;
    };
    /** Border styles */
    style: {
        solid: string;
        dashed: string;
        dotted: string;
    };
}
/**
 * Animation system
 */
export interface AnimationSystem {
    /** Animation durations */
    duration: {
        fast: string;
        normal: string;
        slow: string;
    };
    /** Animation timing functions */
    timing: {
        linear: string;
        ease: string;
        easeIn: string;
        easeOut: string;
        easeInOut: string;
        bounce: string;
    };
    /** Animation delays */
    delay: {
        none: string;
        short: string;
        medium: string;
        long: string;
    };
    /** Transition properties */
    transition: {
        all: string;
        colors: string;
        transform: string;
        opacity: string;
    };
}
/**
 * Breakpoint configuration
 */
export interface BreakpointSystem {
    /** Screen size breakpoints */
    screen: {
        xs: string;
        sm: string;
        md: string;
        lg: string;
        xl: string;
        '2xl': string;
    };
    /** Container query breakpoints */
    container: {
        xs: string;
        sm: string;
        md: string;
        lg: string;
        xl: string;
    };
    /** Responsive behavior */
    behavior: {
        mobile: 'stack' | 'wrap' | 'scroll';
        tablet: 'stack' | 'wrap' | 'grid';
        desktop: 'grid' | 'flex' | 'auto';
    };
}
/**
 * Complete theme definition
 */
export interface Theme {
    /** Theme metadata */
    name: string;
    version: string;
    description?: string;
    author?: string;
    /** Design system */
    colors: ColorSystem;
    spacing: SpacingSystem;
    typography: TypographySystem;
    shadows: ShadowSystem;
    borders: BorderSystem;
    animations: AnimationSystem;
    breakpoints: BreakpointSystem;
    /** CSS custom properties */
    cssProperties: CSSCustomProperties;
    /** Theme variants */
    variants?: {
        compact?: Partial<Theme>;
        comfortable?: Partial<Theme>;
        dense?: Partial<Theme>;
    };
}
/**
 * Theme preset types
 */
export type ThemePreset = 'light' | 'dark' | 'high-contrast' | 'auto';
/**
 * Theme detection preferences
 */
export interface ThemeDetectionConfig {
    /** Detect system theme preference */
    detectSystemTheme: boolean;
    /** Detect reduced motion preference */
    detectReducedMotion: boolean;
    /** Detect high contrast preference */
    detectHighContrast: boolean;
    /** Detect color scheme preference */
    detectColorScheme: boolean;
    /** Storage key for theme preference */
    storageKey: string;
    /** Default theme when detection fails */
    fallbackTheme: ThemePreset;
}
/**
 * Style injection configuration
 */
export interface StyleInjectionConfig {
    /** Enable style scoping */
    enableScoping: boolean;
    /** CSS namespace prefix */
    namespace: string;
    /** Inject at document head */
    injectToHead: boolean;
    /** Override existing styles */
    allowOverrides: boolean;
    /** Validate CSS before injection */
    validateCSS: boolean;
    /** Minify injected CSS */
    minifyCSS: boolean;
}
/**
 * Custom style definition
 */
export interface CustomStyle {
    /** Style identifier */
    id: string;
    /** CSS content */
    css: string;
    /** Style priority */
    priority: number;
    /** Style scope */
    scope?: 'global' | 'component' | 'element';
    /** Media query conditions */
    media?: string;
    /** Style dependencies */
    dependencies?: string[];
}
/**
 * Brand integration configuration
 */
export interface BrandConfig {
    /** Brand name */
    name: string;
    /** Brand logo configuration */
    logo: {
        url?: string;
        alt?: string;
        width?: number;
        height?: number;
        position?: 'left' | 'center' | 'right';
    };
    /** Brand color palette */
    colors: {
        primary: string;
        secondary: string;
        accent: string;
        neutral: string;
    };
    /** Brand typography */
    typography: {
        primaryFont: string;
        secondaryFont: string;
        fontWeights: number[];
    };
    /** Brand spacing */
    spacing: {
        baseUnit: number;
        scale: number;
    };
    /** Brand assets */
    assets: {
        [key: string]: string;
    };
}
/**
 * Animation control configuration
 */
export interface AnimationControlConfig {
    /** Enable animations globally */
    enabled: boolean;
    /** Respect reduced motion preference */
    respectReducedMotion: boolean;
    /** Default animation duration */
    defaultDuration: number;
    /** Animation performance mode */
    performanceMode: 'smooth' | 'fast' | 'accessibility';
    /** Custom animation presets */
    presets: {
        [name: string]: {
            duration: string;
            timing: string;
            properties: string[];
        };
    };
}
/**
 * Responsive design configuration
 */
export interface ResponsiveConfig {
    /** Enable responsive design */
    enabled: boolean;
    /** Use container queries */
    useContainerQueries: boolean;
    /** Mobile-first approach */
    mobileFirst: boolean;
    /** Breakpoint detection strategy */
    strategy: 'window' | 'container' | 'both';
    /** Responsive behavior overrides */
    overrides: {
        [breakpoint: string]: Partial<Theme>;
    };
}
/**
 * Theme configuration
 */
export interface ThemeConfig {
    /** Default theme preset */
    defaultTheme: ThemePreset;
    /** Available themes */
    availableThemes: Theme[];
    /** Theme detection settings */
    detection: ThemeDetectionConfig;
    /** Style injection settings */
    styleInjection: StyleInjectionConfig;
    /** Brand integration settings */
    brand?: BrandConfig;
    /** Animation control settings */
    animations: AnimationControlConfig;
    /** Responsive design settings */
    responsive: ResponsiveConfig;
    /** CSS custom property prefix */
    cssPrefix: string;
    /** Enable debugging */
    debug: boolean;
}
/**
 * Theme manager events
 */
export interface ThemingEvents {
    'theme-changed': (newTheme: string, oldTheme: string) => void;
    'theme-loaded': (theme: Theme) => void;
    'theme-error': (error: Error, theme: string) => void;
    'css-injected': (styleId: string, css: string) => void;
    'css-removed': (styleId: string) => void;
    'brand-updated': (brand: BrandConfig) => void;
    'breakpoint-changed': (breakpoint: string, size: {
        width: number;
        height: number;
    }) => void;
    'animation-toggled': (enabled: boolean) => void;
    'reduced-motion-changed': (reducedMotion: boolean) => void;
}
/**
 * CSS validation result
 */
export interface CSSValidationResult {
    /** Validation passed */
    valid: boolean;
    /** Validation errors */
    errors: string[];
    /** Validation warnings */
    warnings: string[];
    /** Parsed CSS rules */
    rules?: CSSRule[];
}
/**
 * Theme validation result
 */
export interface ThemeValidationResult {
    /** Theme is valid */
    valid: boolean;
    /** Validation errors */
    errors: string[];
    /** Validation warnings */
    warnings: string[];
    /** Missing required properties */
    missing: string[];
    /** Accessibility issues */
    accessibility: {
        contrastIssues: string[];
        colorBlindnessIssues: string[];
        otherIssues: string[];
    };
}
/**
 * Style conflict resolution
 */
export interface StyleConflict {
    /** Conflicting property */
    property: string;
    /** Existing value */
    existingValue: string;
    /** New value */
    newValue: string;
    /** Conflict source */
    source: 'theme' | 'custom' | 'brand' | 'user';
    /** Resolution strategy */
    resolution: 'override' | 'merge' | 'ignore' | 'warn';
}
/**
 * Theme performance metrics
 */
export interface ThemePerformanceMetrics {
    /** Theme switch duration */
    switchDuration: number;
    /** CSS injection time */
    injectionTime: number;
    /** Style computation time */
    computationTime: number;
    /** Memory usage */
    memoryUsage: number;
    /** Number of style rules */
    ruleCount: number;
    /** CSS file sizes */
    cssSize: number;
}
/**
 * Theming context
 */
export interface ThemingContext {
    /** Current theme */
    currentTheme: string;
    /** Available themes */
    availableThemes: string[];
    /** Theme configuration */
    config: ThemeConfig;
    /** Performance metrics */
    performance: ThemePerformanceMetrics;
    /** Active breakpoint */
    activeBreakpoint: string;
    /** Reduced motion preference */
    reducedMotion: boolean;
    /** High contrast preference */
    highContrast: boolean;
    /** Color scheme preference */
    colorScheme: 'light' | 'dark' | 'auto';
}
/**
 * Theme export format
 */
export interface ThemeExport {
    /** Export format */
    format: 'json' | 'css' | 'scss' | 'js';
    /** Exported theme data */
    data: string;
    /** Export metadata */
    metadata: {
        name: string;
        version: string;
        timestamp: string;
        source: string;
    };
}
/**
 * Accessibility theme requirements
 */
export interface AccessibilityThemeRequirements {
    /** Minimum contrast ratios */
    contrastRatios: {
        normal: number;
        large: number;
        interactive: number;
    };
    /** Focus indicator requirements */
    focus: {
        minWidth: number;
        minContrast: number;
        visible: boolean;
    };
    /** High contrast support */
    highContrast: {
        enabled: boolean;
        ratioMultiplier: number;
    };
    /** Reduced motion support */
    reducedMotion: {
        respectPreference: boolean;
        fallbackDuration: number;
    };
}
/**
 * Theme builder configuration
 */
export interface ThemeBuilderConfig {
    /** Base theme to extend */
    baseTheme?: Theme;
    /** Color palette generator */
    colorGenerator: {
        algorithm: 'hsl' | 'oklch' | 'custom';
        baseColors: string[];
        steps: number;
    };
    /** Typography scale generator */
    typographyGenerator: {
        baseSize: number;
        scale: 'minor-second' | 'major-second' | 'minor-third' | 'major-third' | 'perfect-fourth' | 'custom';
        ratio?: number;
    };
    /** Spacing scale generator */
    spacingGenerator: {
        baseUnit: number;
        scale: 'linear' | 'geometric' | 'fibonacci' | 'custom';
        steps: number;
    };
    /** Validation rules */
    validation: AccessibilityThemeRequirements;
}
//# sourceMappingURL=Theming.d.ts.map