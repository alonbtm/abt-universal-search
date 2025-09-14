/**
 * Response Transformer - Basic Result Transformation
 * @description Transforms raw search results into standardized SearchResult format
 */
import type { SearchResult, RawSearchResult, ValidationResult } from '../types/Results';
import { AdvancedDataValidator } from '../utils/DataValidator';
import { AdvancedMetadataEnhancer } from '../utils/MetadataEnhancer';
/**
 * Enhancement rule builder for creating custom enhancement rules
 */
export declare function createEnhancementRule(): {
    name(name: string): /*elided*/ any;
    priority(priority: number): /*elided*/ any;
    when(field: string, operator: "equals" | "contains", value: any): /*elided*/ any;
    enhance(fn: (result: SearchResult, context: any) => Record<string, any>): {
        name: string;
        priority: number;
        when: (result: SearchResult) => boolean;
        enhance: (result: SearchResult, context: any) => Record<string, any>;
    };
};
/**
 * Basic field mapping configuration
 */
export interface ResponseMapping {
    labelField: string;
    valueField?: string;
    metadataFields?: {
        subtitle?: string;
        icon?: string;
        category?: string;
        [key: string]: string | undefined;
    };
}
/**
 * Basic transformation context
 */
export interface TransformationContext {
    query: string;
    timestamp: number;
    totalResults: number;
    sourceType: string;
}
/**
 * Basic response transformer for search results
 */
export declare class ResponseTransformer {
    private readonly config;
    constructor(mapping: ResponseMapping);
    /**
     * Transform raw search results to SearchResult format
     */
    transformResults(rawResults: RawSearchResult[], context: TransformationContext): SearchResult[];
    /**
     * Transform a single result
     */
    private transformSingleResult;
    /**
     * Generate description from item or metadata
     */
    private generateDescription;
    /**
     * Extract URL from item
     */
    private extractUrl;
    /**
     * Generate unique ID for search result
     */
    private generateResultId;
    /**
     * Get field value from object (supports dot notation)
     */
    private getFieldValue;
    /**
     * Validate transformer configuration
     */
    private validateConfiguration;
}
/**
 * Enhanced field mapping configuration with advanced features
 */
export interface EnhancedFieldMapping {
    labelField: string;
    valueField?: string;
    metadataFields?: {
        subtitle?: string;
        icon?: string;
        category?: string;
        [key: string]: string | undefined;
    };
    /** Custom transformation functions */
    transformers?: Record<string, (value: unknown) => unknown>;
    /** Template-based mapping with variable substitution */
    templates?: Record<string, string>;
}
/**
 * Enhanced transformation context with additional metadata
 */
export interface EnhancedTransformationContext {
    query: string;
    timestamp: number;
    totalResults: number;
    sourceType: string;
    additionalContext?: {
        userId?: string;
        sessionId?: string;
        [key: string]: unknown;
    };
}
/**
 * Complex field mapping configuration
 */
export interface ComplexFieldMapping {
    template?: string;
    fallbacks?: string[];
    defaultValue?: string;
}
/**
 * Enhanced field mapping configuration with complex field support
 */
export interface EnhancedFieldMappingWithComplex {
    labelField: string | ComplexFieldMapping;
    valueField?: string | ComplexFieldMapping;
    requiredFields?: string[];
    metadataFields?: {
        subtitle?: string | ComplexFieldMapping;
        icon?: string | ComplexFieldMapping;
        category?: string | ComplexFieldMapping;
        [key: string]: string | ComplexFieldMapping | undefined;
    };
    /** Custom transformation functions */
    transformers?: Record<string, (value: unknown) => unknown>;
    /** Template-based mapping with variable substitution */
    templates?: Record<string, string>;
    /** Validation rules */
    validationRules?: Record<string, Array<{
        validate: (value: unknown, context?: any) => ValidationResult | boolean | {
            valid: boolean;
            message?: string;
        };
        severity: 'error' | 'warning' | 'info';
        message?: string;
    }>>;
    /** Default values for fields */
    defaultValues?: Record<string, unknown>;
}
/**
 * Comprehensive transformation pipeline configuration
 */
export interface TransformationPipelineConfig {
    /** Field mapping configuration */
    mapping: EnhancedFieldMappingWithComplex;
    /** Enable data validation */
    enableValidation?: boolean;
    /** Enable metadata enhancement */
    enableMetadataEnhancement?: boolean;
    enableEnhancement?: boolean;
    /** Enable result filtering */
    enableResultFiltering?: boolean;
    enableFiltering?: boolean;
    /** Minimum quality score for results */
    minQualityScore?: number;
    /** Enable performance tracking */
    enablePerformanceTracking?: boolean;
    /** Enable error transformation */
    enableErrorTransformation?: boolean;
    /** Maximum results to process */
    maxResults?: number;
    /** Custom enhancement rules */
    customEnhancementRules?: Array<{
        name: string;
        priority: number;
        when: (result: SearchResult) => boolean;
        enhance: (result: SearchResult, context: any) => Record<string, any>;
    }>;
}
/**
 * Transformation result with metadata and performance info
 */
export interface TransformationResult {
    results: SearchResult[];
    metadata: {
        totalProcessed: number;
        totalFiltered: number;
        processingTime: number;
        validationErrors: number;
        enhancementsApplied: number;
        errorCount: number;
    };
    /** Statistics for test compatibility */
    stats: {
        originalCount: number;
        transformedCount: number;
        filteredCount: number;
        processingTime: number;
        validationErrors: number;
        enhancementsApplied: number;
        errorCount: number;
        averageProcessingTimePerResult: number;
    };
    /** Error list for test compatibility */
    errors: Array<{
        message: string;
        index?: number;
        field?: string;
    }>;
    /** Warning list for test compatibility */
    warnings: string[];
    /** Quality metrics for test compatibility */
    qualityMetrics: {
        averageScore: number;
        completenessRatio: number;
        qualityDistribution: Record<string, number>;
    };
}
/**
 * Advanced Response Transformer with comprehensive pipeline features
 */
export declare class AdvancedResponseTransformer {
    private config;
    private validator;
    private metadataEnhancer;
    private resultFilter;
    private performanceStats;
    private validationErrors;
    private validationWarnings;
    private filteredResultsCount;
    constructor(config: TransformationPipelineConfig);
    /**
     * Transform raw search results through the complete pipeline
     */
    transformResults(rawResults: RawSearchResult[], context: EnhancedTransformationContext): Promise<TransformationResult>;
    /**
     * Transform single result for testing purposes
     */
    transformSingleResult(rawResult: RawSearchResult, context: EnhancedTransformationContext): Promise<SearchResult | null>;
    /**
     * Update configuration dynamically
     */
    updateConfiguration(newConfig: Partial<TransformationPipelineConfig>): void;
    /**
     * Get transformation statistics
     */
    getStats(): typeof this.performanceStats & {
        validatorStats: ReturnType<AdvancedDataValidator['getStats']>;
        enhancerStats: ReturnType<AdvancedMetadataEnhancer['getStats']>;
        filterStats: any;
    };
    /**
     * Clear caches and reset statistics
     */
    clearCachesAndStats(): void;
    /**
     * Clear cache (alias for test compatibility)
     */
    clearCache(): void;
    /**
     * Get statistics (alias for test compatibility)
     */
    getStatistics(): typeof this.performanceStats;
    /**
     * Get optimization recommendations
     */
    getOptimizationRecommendations(): Array<{
        type: string;
        severity: 'low' | 'medium' | 'high';
        message: string;
        impact: string;
    }>;
    /**
     * Perform basic field mapping transformation
     */
    private performBasicTransformation;
    /**
     * Transform single raw result with enhanced mapping
     */
    private transformSingleRawResult;
    /**
     * Perform data validation with fallbacks
     */
    private performDataValidation;
    /**
     * Perform metadata enhancement
     */
    private performMetadataEnhancement;
    /**
     * Perform result filtering and quality assessment
     */
    private performResultFiltering;
    /**
     * Extract field value with support for dot notation and templates
     */
    private extractFieldValue;
    /**
     * Extract field value with support for complex field mapping
     */
    private extractComplexFieldValue;
    /**
     * Process template with variable substitution
     */
    private processTemplate;
    /**
     * Generate description from item or metadata
     */
    private generateDescription;
    /**
     * Extract URL from item
     */
    private extractUrl;
    /**
     * Generate unique ID for search result
     */
    private generateResultId;
    /**
     * Initialize pipeline components
     */
    private initializePipeline;
    /**
     * Validate and normalize configuration
     */
    private validateAndNormalizeConfig;
    /**
     * Transform error into user-friendly format
     */
    private transformError;
    /**
     * Update performance statistics
     */
    private updatePerformanceStats;
    /**
     * Get validation error count
     */
    private getValidationErrorCount;
    /**
     * Get enhancement count
     */
    private getEnhancementCount;
    /**
     * Collect transformation errors
     */
    private collectErrors;
    /**
     * Collect transformation warnings
     */
    private collectWarnings;
    /**
     * Calculate quality metrics for results
     */
    private calculateQualityMetrics;
    /**
     * Generate default icon based on result metadata
     */
    private generateDefaultIcon;
}
//# sourceMappingURL=ResponseTransformer.d.ts.map