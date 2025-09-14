export interface StyleScope {
    id: string;
    css: string;
    priority: number;
    scope: 'global' | 'component' | 'element';
    namespace?: string;
    dependencies?: string[];
    media?: string;
    container?: string;
}
export interface StyleConflictRule {
    property: string;
    selector: string;
    existingValue: string;
    newValue: string;
    source: string;
    resolution: 'override' | 'merge' | 'ignore' | 'warn';
}
export interface StyleInjectionOptions {
    enableScoping: boolean;
    namespace: string;
    allowOverrides: boolean;
    validateCSS: boolean;
    minifyCSS: boolean;
    conflictResolution: 'override' | 'merge' | 'ignore' | 'warn';
    generateSourceMap: boolean;
}
export interface StyleValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
    parsedRules: CSSRule[];
}
export declare class StyleInjectionManager {
    private options;
    private injectedStyles;
    private styleElements;
    private conflictRules;
    private observer?;
    constructor(options?: StyleInjectionOptions);
    injectStyle(scope: Omit<StyleScope, 'id'>): string;
    removeStyle(id: string): boolean;
    updateStyle(id: string, css: string): boolean;
    getStyle(id: string): StyleScope | undefined;
    getAllStyles(): StyleScope[];
    hasConflicts(): boolean;
    getConflicts(): StyleConflictRule[];
    resolveConflict(id: string, resolution: 'override' | 'merge' | 'ignore'): boolean;
    clearAllStyles(): void;
    exportStyles(format?: 'css' | 'json'): string;
    setOptions(newOptions: Partial<StyleInjectionOptions>): void;
    destroy(): void;
    private generateStyleId;
    private hashCSS;
    private processCSS;
    private minifyCSS;
    private applyScopingRules;
    private validateCSS;
    private detectAndResolveConflicts;
    private findStyleConflicts;
    private extractSelectors;
    private selectorsConflict;
    private findCommonProperties;
    private applyConflictOverride;
    private applyConflictMerge;
    private removeConflictStyle;
    private applyStyleScope;
    private injectToDOM;
    private insertStyleElement;
    private updateDOMElement;
    private initializeObserver;
}
//# sourceMappingURL=StyleInjectionManager.d.ts.map