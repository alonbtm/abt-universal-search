/**
 * AttributeSanitizer - Data attribute cleaning and metadata field sanitization
 * @description Provides comprehensive attribute sanitization and whitelist validation
 */
import { AttributeSanitizationConfig, AttributeSanitizationResult } from '../types/Rendering';
/**
 * Default attribute sanitization configuration
 */
export declare const DEFAULT_ATTRIBUTE_SANITIZATION_CONFIG: AttributeSanitizationConfig;
/**
 * AttributeSanitizer class for cleaning and validating HTML attributes
 */
export declare class AttributeSanitizer {
    private config;
    constructor(config?: Partial<AttributeSanitizationConfig>);
    /**
     * Sanitize attributes object
     */
    sanitizeAttributes(attributes: Record<string, any>, customConfig?: Partial<AttributeSanitizationConfig>): AttributeSanitizationResult;
    /**
     * Sanitize metadata fields specifically for search results
     */
    sanitizeMetadata(metadata: Record<string, any>): AttributeSanitizationResult;
    /**
     * Clean CSS style attribute
     */
    sanitizeStyleAttribute(styleValue: string): string;
    /**
     * Validate data attributes
     */
    validateDataAttribute(attributeName: string, value: string): boolean;
    /**
     * Check if attribute is allowed
     */
    private isAttributeAllowed;
    /**
     * Sanitize attribute value
     */
    private sanitizeAttributeValue;
    /**
     * Sanitize URL attributes (href, src)
     */
    private sanitizeURLAttribute;
    /**
     * Sanitize class attribute
     */
    private sanitizeClassAttribute;
    /**
     * Sanitize ID attribute
     */
    private sanitizeIdAttribute;
    /**
     * Sanitize generic attribute value
     */
    private sanitizeGenericAttribute;
    /**
     * Check if CSS property is safe
     */
    private isCSSPropertySafe;
    /**
     * Check if attribute value is safe
     */
    private isValueSafe;
    /**
     * Batch sanitize multiple attribute sets
     */
    batchSanitize(attributeSets: Record<string, any>[], config?: Partial<AttributeSanitizationConfig>): AttributeSanitizationResult[];
    /**
     * Get sanitization statistics
     */
    getSanitizationStats(attributes: Record<string, any>): {
        totalAttributes: number;
        dangerousAttributes: number;
        dataAttributes: number;
        estimatedRisk: 'low' | 'medium' | 'high';
    };
    /**
     * Update configuration
     */
    updateConfig(newConfig: Partial<AttributeSanitizationConfig>): void;
    /**
     * Get current configuration
     */
    getConfig(): AttributeSanitizationConfig;
}
/**
 * Default AttributeSanitizer instance
 */
export declare const defaultAttributeSanitizer: AttributeSanitizer;
/**
 * Convenience function for quick attribute sanitization
 */
export declare function sanitizeAttributes(attributes: Record<string, any>, config?: Partial<AttributeSanitizationConfig>): Record<string, string>;
/**
 * Convenience function for metadata sanitization
 */
export declare function sanitizeMetadata(metadata: Record<string, any>): Record<string, string>;
//# sourceMappingURL=AttributeSanitizer.d.ts.map