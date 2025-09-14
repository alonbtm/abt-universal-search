/**
 * Response Validator - Handles API response parsing and validation
 * @description Parses JSON responses, validates schemas, and handles error mapping
 */
import type { APIResponseConfig } from '../types/Config';
import type { APIResponse } from '../types/Results';
import type { RawResult } from '../types/Results';
/**
 * Response validation and parsing utilities
 */
export declare class ResponseValidator {
    private responseCache;
    /**
     * Validate and parse API response
     */
    validateResponse(response: Response, config?: APIResponseConfig): Promise<APIResponse>;
    /**
     * Parse JSON response with validation
     */
    private parseJsonResponse;
    /**
     * Parse JSONP response
     */
    private parseJsonpResponse;
    /**
     * Parse XML response (basic implementation)
     */
    private parseXmlResponse;
    /**
     * Convert XML DOM element to JSON
     */
    private xmlToJson;
    /**
     * Transform API response data to search results
     */
    transformToResults(data: unknown, config?: APIResponseConfig): RawResult[];
    /**
     * Extract data from nested object path
     */
    private extractDataFromPath;
    /**
     * Extract ID from item
     */
    private extractId;
    /**
     * Apply field mappings to transform response structure
     */
    private applyFieldMappings;
    /**
     * Validate data against schema (basic implementation)
     */
    private validateSchema;
    /**
     * Extract rate limit information from response headers
     */
    private extractRateLimitInfo;
    /**
     * Cache response data
     */
    private cacheResponse;
    /**
     * Get cached response
     */
    getCachedResponse(url: string): unknown | null;
    /**
     * Clean up expired cache entries
     */
    private cleanupCache;
    /**
     * Clear response cache
     */
    clearCache(): void;
    /**
     * Check if response indicates an error condition
     */
    isErrorResponse(response: APIResponse): boolean;
    /**
     * Extract error message from response
     */
    extractErrorMessage(response: APIResponse): string;
}
/**
 * Global response validator instance
 */
export declare const responseValidator: ResponseValidator;
//# sourceMappingURL=ResponseValidator.d.ts.map