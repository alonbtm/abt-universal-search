/**
 * Metadata Enhancer - Pipeline for enhancing result metadata
 * @description Adds optional fields like subtitles, icons, categories, and custom metadata
 */
import type { SearchResult } from '../types/Results';
/**
 * Icon configuration options
 */
export interface IconConfig {
    /** Icon URL or data URI */
    url?: string;
    /** Icon type (font-icon, svg, image) */
    type?: 'font-icon' | 'svg' | 'image' | 'emoji';
    /** Icon class name for font icons */
    className?: string;
    /** Icon size hint */
    size?: 'small' | 'medium' | 'large' | number;
    /** Icon color hint */
    color?: string;
    /** Alt text for accessibility */
    alt?: string;
}
/**
 * Category configuration
 */
export interface CategoryConfig {
    /** Category name */
    name: string;
    /** Category color */
    color?: string;
    /** Category icon */
    icon?: IconConfig;
    /** Category description */
    description?: string;
    /** Category priority for sorting */
    priority?: number;
}
/**
 * Enhancement rule configuration
 */
export interface EnhancementRule {
    /** Rule name */
    name: string;
    /** Rule priority (higher runs first) */
    priority: number;
    /** Field conditions that must be met */
    conditions?: {
        field: string;
        operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'regex' | 'exists';
        value?: unknown;
        regex?: RegExp;
    }[];
    /** Enhancement function */
    enhance: (result: SearchResult, context: EnhancementContext) => Partial<SearchResult['metadata']>;
}
/**
 * Enhancement context
 */
export interface EnhancementContext {
    /** Original query */
    query?: string;
    /** Result index in batch */
    index: number;
    /** Total results in batch */
    totalResults: number;
    /** Source adapter type */
    sourceType: string;
    /** Additional context data */
    additionalContext?: Record<string, unknown>;
}
/**
 * Enhancement statistics
 */
interface EnhancementStats {
    totalEnhancements: number;
    successfulEnhancements: number;
    ruleExecutions: Record<string, number>;
    averageEnhancementTime: number;
    enhancementsPerSecond: number;
    lastResetTime: number;
}
/**
 * Advanced metadata enhancer with rule-based enhancements
 */
export declare class AdvancedMetadataEnhancer {
    private enhancementRules;
    private categoryMappings;
    private iconMappings;
    private customEnhancers;
    private stats;
    /**
     * Add enhancement rule
     */
    addRule(rule: EnhancementRule): void;
    /**
     * Add multiple enhancement rules
     */
    addRules(rules: EnhancementRule[]): void;
    /**
     * Add category mapping
     */
    addCategoryMapping(key: string, category: CategoryConfig): void;
    /**
     * Add icon mapping
     */
    addIconMapping(key: string, icon: IconConfig): void;
    /**
     * Add custom enhancer function
     */
    addCustomEnhancer(name: string, enhancer: (result: SearchResult) => Record<string, unknown>): void;
    /**
     * Enhance a single search result
     */
    enhanceResult(result: SearchResult, context: EnhancementContext): SearchResult;
    /**
     * Enhance multiple search results
     */
    enhanceResults(results: SearchResult[], context?: Partial<EnhancementContext>): SearchResult[];
    /**
     * Apply subtitle enhancement
     */
    private applySubtitleEnhancement;
    /**
     * Apply icon enhancement
     */
    private applyIconEnhancement;
    /**
     * Apply category enhancement
     */
    private applyCategoryEnhancement;
    /**
     * Apply custom enhancements
     */
    private applyCustomEnhancements;
    /**
     * Evaluate rule conditions
     */
    private evaluateRuleConditions;
    /**
     * Get field value from result (supports dot notation)
     */
    private getFieldValue;
    /**
     * Get default icon based on result content
     */
    private getDefaultIcon;
    /**
     * Get file type icon based on extension
     */
    private getFileTypeIcon;
    /**
     * Extract file extension from filename or URL
     */
    private extractFileExtension;
    /**
     * Sort enhancement rules by priority
     */
    private sortRulesByPriority;
    /**
     * Update performance statistics
     */
    private updateStats;
    /**
     * Initialize statistics
     */
    private initializeStats;
    /**
     * Get enhancement statistics
     */
    getStats(): EnhancementStats;
    /**
     * Reset statistics
     */
    resetStats(): void;
    /**
     * Clear all enhancement rules and mappings
     */
    clear(): void;
    /**
     * Get configured rules count
     */
    getRulesCount(): number;
    /**
     * Get configured mappings count
     */
    getMappingsCount(): {
        categories: number;
        icons: number;
        customEnhancers: number;
    };
}
/**
 * Fluent enhancement rule builder
 */
export declare class EnhancementRuleBuilder {
    private rule;
    name(name: string): EnhancementRuleBuilder;
    priority(priority: number): EnhancementRuleBuilder;
    when(field: string, operator: EnhancementRule['conditions'][0]['operator'], value?: unknown): EnhancementRuleBuilder;
    enhance(enhancer: EnhancementRule['enhance']): EnhancementRule;
}
/**
 * Utility function to create enhancement rule
 */
export declare function createEnhancementRule(): EnhancementRuleBuilder;
/**
 * Predefined category configurations
 */
export declare const PredefinedCategories: Record<string, CategoryConfig>;
/**
 * Global metadata enhancer instance
 */
export declare const metadataEnhancer: AdvancedMetadataEnhancer;
export {};
//# sourceMappingURL=MetadataEnhancer.d.ts.map