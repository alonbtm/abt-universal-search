/**
 * Field Mapper - Advanced field mapping utilities for response transformation
 * @description Provides configurable field mapping with dot notation, templates, and custom transformations
 */
import type { TransformFunction, TransformContext } from '../types/Results';
export type { TransformContext };
/**
 * Field mapping configuration options
 */
export interface FieldMappingOptions {
    /** Default value if field is not found */
    defaultValue?: unknown;
    /** Whether to throw error on missing field */
    required?: boolean;
    /** Custom transformation function */
    transform?: TransformFunction;
    /** Template string with variable substitution */
    template?: string;
    /** Data type conversion */
    type?: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object';
    /** Array of fallback field paths to try */
    fallbacks?: string[];
}
/**
 * Field mapping result with metadata
 */
export interface FieldMappingResult {
    /** Mapped value */
    value: unknown;
    /** Whether mapping was successful */
    success: boolean;
    /** Source field that provided the value */
    sourceField?: string;
    /** Error message if mapping failed */
    error?: string;
    /** Whether a fallback field was used */
    usedFallback?: boolean;
    /** Type conversion applied */
    typeConverted?: boolean;
}
/**
 * Template variable context
 */
export interface TemplateContext {
    /** Current item being processed */
    item: Record<string, unknown>;
    /** Current field mapping context */
    field: string;
    /** Index in results array */
    index: number;
    /** Additional context data */
    context: Record<string, unknown>;
}
/**
 * Advanced field mapper with multiple mapping strategies
 */
export declare class AdvancedFieldMapper {
    private templateCache;
    private transformCache;
    /**
     * Map a single field from source object
     */
    mapField(source: Record<string, unknown>, fieldPath: string, options?: FieldMappingOptions, context?: TransformContext): FieldMappingResult;
    /**
     * Map multiple fields from source object
     */
    mapFields(source: Record<string, unknown>, mappings: Record<string, string | FieldMappingOptions>, context?: TransformContext): Record<string, FieldMappingResult>;
    /**
     * Create standardized result object with mapped fields
     */
    createStandardResult(source: Record<string, unknown>, mappings: {
        label: string | FieldMappingOptions;
        value?: string | FieldMappingOptions;
        metadata?: Record<string, string | FieldMappingOptions>;
    }, context?: TransformContext): {
        label: unknown;
        value?: unknown;
        metadata: Record<string, unknown>;
        mappingErrors: string[];
    };
    /**
     * Extract nested value using dot notation
     */
    private getNestedValue;
    /**
     * Apply template transformation with variable substitution
     */
    private applyTemplate;
    /**
     * Compile template string into function
     */
    private compileTemplate;
    /**
     * Convert value to specified type
     */
    private convertType;
    /**
     * Clear internal caches
     */
    clearCache(): void;
    /**
     * Get cache statistics
     */
    getCacheStats(): {
        templateCacheSize: number;
        transformCacheSize: number;
    };
}
/**
 * Utility function to create field mapping options
 */
export declare function createFieldMapping(options?: Partial<FieldMappingOptions>): FieldMappingOptions;
/**
 * Utility function to create template-based mapping
 */
export declare function createTemplateMapping(template: string, options?: Partial<FieldMappingOptions>): FieldMappingOptions;
/**
 * Utility function to create transformation mapping
 */
export declare function createTransformMapping(transform: TransformFunction, options?: Partial<FieldMappingOptions>): FieldMappingOptions;
/**
 * Global field mapper instance
 */
export declare const fieldMapper: AdvancedFieldMapper;
//# sourceMappingURL=FieldMapper.d.ts.map