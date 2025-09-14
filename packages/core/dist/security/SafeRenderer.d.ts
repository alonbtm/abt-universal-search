/**
 * SafeRenderer - Secure templating system without string interpolation
 * @description Provides safe template rendering with parameterized content insertion and injection prevention
 */
import { SafeTemplateConfig, TemplateRenderingContext, TemplateRenderingResult } from '../types/Rendering';
/**
 * Built-in safe templates for common use cases
 */
declare const BUILT_IN_TEMPLATES: {
    searchResult: string;
    errorMessage: string;
    loadingState: string;
    noResults: string;
};
/**
 * Default safe template configuration
 */
export declare const DEFAULT_SAFE_TEMPLATE_CONFIG: SafeTemplateConfig;
/**
 * SafeRenderer class for secure template rendering
 */
export declare class SafeRenderer {
    private config;
    private escaper;
    private sanitizer;
    private templateCache;
    constructor(config?: Partial<SafeTemplateConfig>);
    /**
     * Render template with context
     */
    renderTemplate(template: string, context: TemplateRenderingContext, customConfig?: Partial<SafeTemplateConfig>): TemplateRenderingResult;
    /**
     * Render built-in template
     */
    renderBuiltIn(templateName: keyof typeof BUILT_IN_TEMPLATES, context: TemplateRenderingContext, config?: Partial<SafeTemplateConfig>): TemplateRenderingResult;
    /**
     * Validate template security
     */
    private validateTemplateSecurity;
    /**
     * Compile template for efficient rendering
     */
    private compileTemplate;
    /**
     * Execute compiled template with context
     */
    private executeTemplate;
    /**
     * Resolve variable from context
     */
    private resolveVariable;
    /**
     * Convert value to safe string
     */
    private valueToString;
    /**
     * Validate variable path
     */
    private isValidVariablePath;
    /**
     * Calculate template nesting depth
     */
    private calculateTemplateDepth;
    /**
     * Generate cache key for template
     */
    private generateCacheKey;
    /**
     * Clear template cache
     */
    clearCache(): void;
    /**
     * Get cache statistics
     */
    getCacheStats(): {
        size: number;
        maxSize: number;
        hitRate: number;
    };
    /**
     * Update configuration
     */
    updateConfig(newConfig: Partial<SafeTemplateConfig>): void;
    /**
     * Get current configuration
     */
    getConfig(): SafeTemplateConfig;
}
/**
 * Default SafeRenderer instance
 */
export declare const defaultSafeRenderer: SafeRenderer;
/**
 * Convenience function for quick template rendering
 */
export declare function renderTemplate(template: string, variables: Record<string, any>, config?: Partial<SafeTemplateConfig>): string;
/**
 * Convenience function for rendering built-in templates
 */
export declare function renderBuiltIn(templateName: keyof typeof BUILT_IN_TEMPLATES, variables: Record<string, any>): string;
export {};
//# sourceMappingURL=SafeRenderer.d.ts.map