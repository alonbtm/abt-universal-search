export interface Breakpoint {
    name: string;
    value: number;
    unit: 'px' | 'em' | 'rem';
    query: string;
}
export interface ContainerBreakpoint {
    name: string;
    value: number;
    unit: 'px' | 'em' | 'rem' | '%';
    query: string;
}
export interface ResponsiveConfig {
    enabled: boolean;
    strategy: 'window' | 'container' | 'both';
    mobileFirst: boolean;
    useContainerQueries: boolean;
    breakpoints: Map<string, Breakpoint>;
    containerBreakpoints: Map<string, ContainerBreakpoint>;
    debounceDelay: number;
    observeOptions: ResizeObserverOptions;
}
export interface ResponsiveThemeOverride {
    breakpoint: string;
    overrides: Record<string, any>;
    containerQuery?: string;
    mediaQuery?: string;
}
export interface ViewportInfo {
    width: number;
    height: number;
    ratio: number;
    orientation: 'portrait' | 'landscape';
    activeBreakpoint: string;
    activeBreakpoints: string[];
}
export interface ContainerInfo {
    element: Element;
    width: number;
    height: number;
    activeBreakpoint: string;
    activeBreakpoints: string[];
}
export declare class ResponsiveManager {
    private namespace;
    private config;
    private mediaQueries;
    private resizeObserver?;
    private observedContainers;
    private currentViewport;
    private themeOverrides;
    private eventListeners;
    private debounceTimer?;
    constructor(config?: Partial<ResponsiveConfig>, namespace?: string);
    initialize(): void;
    addBreakpoint(name: string, value: number, unit?: 'px' | 'em' | 'rem'): void;
    addContainerBreakpoint(name: string, value: number, unit?: 'px' | 'em' | 'rem' | '%'): void;
    removeBreakpoint(name: string): boolean;
    observeContainer(element: Element): void;
    unobserveContainer(element: Element): boolean;
    isBreakpointActive(name: string): boolean;
    getViewportInfo(): ViewportInfo;
    getContainerInfo(element: Element): ContainerInfo | undefined;
    addThemeOverride(breakpoint: string, overrides: Record<string, any>, options?: {
        containerQuery?: string;
        mediaQuery?: string;
    }): void;
    removeThemeOverride(breakpoint: string): boolean;
    getThemeOverrides(): ResponsiveThemeOverride[];
    generateResponsiveCSS(): string;
    setConfig(newConfig: Partial<ResponsiveConfig>): void;
    on(event: string, callback: Function): void;
    off(event: string, callback: Function): void;
    destroy(): void;
    private setupMediaQueries;
    private setupMediaQuery;
    private setupResizeObserver;
    private handleWindowResize;
    private handleOrientationChange;
    private handleMediaQueryChange;
    private handleContainerResize;
    private getCurrentViewport;
    private getActiveContainerBreakpoint;
    private getActiveContainerBreakpoints;
    private updateCurrentBreakpoint;
    private getBreakpointQuery;
    private applyContainerStyles;
    private applyThemeOverrides;
    private generateBreakpointCSS;
    private generateContainerQueryCSS;
    private emit;
}
//# sourceMappingURL=ResponsiveManager.d.ts.map