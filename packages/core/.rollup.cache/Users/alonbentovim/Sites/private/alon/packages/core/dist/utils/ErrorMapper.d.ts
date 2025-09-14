/**
 * Error Mapper - Standardized Error Handling and Transformation
 * @description Maps adapter-specific errors to consistent SearchError format
 */
import type { SearchError } from '../types/Results';
/**
 * Error mapping configuration
 */
interface ErrorMappingConfig {
    /** Error type classification */
    type: SearchError['type'];
    /** Standard error code */
    code: string;
    /** Whether the error is retryable */
    retryable: boolean;
    /** Default recovery suggestions */
    suggestions: string[];
    /** Fallback options */
    fallbackOptions?: string[];
}
/**
 * Error mapper class for standardizing errors across adapters
 */
export declare class ErrorMapper {
    private customMappings;
    /**
     * Map any error to standardized SearchError format
     */
    mapError(error: unknown, adapterType: string, context?: Partial<SearchError['context']>): SearchError;
    /**
     * Register custom error mapping
     */
    registerMapping(errorIdentifier: string, config: ErrorMappingConfig): void;
    /**
     * Check if an error is retryable
     */
    isRetryable(error: unknown): boolean;
    /**
     * Get recovery suggestions for an error
     */
    getRecoverySuggestions(error: unknown): string[];
    /**
     * Extract base error information from various error types
     */
    private extractBaseError;
    /**
     * Find the best matching error mapping
     */
    private findMapping;
    /**
     * Get all registered error types
     */
    getRegisteredErrorTypes(): string[];
    /**
     * Clear custom mappings
     */
    clearCustomMappings(): void;
}
/**
 * Global error mapper instance
 */
export declare const errorMapper: ErrorMapper;
export {};
//# sourceMappingURL=ErrorMapper.d.ts.map