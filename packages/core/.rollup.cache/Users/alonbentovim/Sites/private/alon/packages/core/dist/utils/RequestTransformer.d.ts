/**
 * Request Transformer - Handles API request transformation and parameter mapping
 * @description Transforms search queries and parameters for different API formats
 */
import type { APIDataSourceConfig, RequestTransformConfig } from '../types/Config';
import type { APIRequestConfig } from '../types/Results';
import type { ProcessedQuery } from '../types/Results';
/**
 * Request transformation utilities
 */
export declare class RequestTransformer {
    /**
     * Transform a processed query into an API request configuration
     */
    transformRequest(query: ProcessedQuery, config: APIDataSourceConfig, baseHeaders?: Record<string, string>): APIRequestConfig;
    /**
     * Transform request for GET method
     */
    private transformGetRequest;
    /**
     * Transform request for POST method
     */
    private transformPostRequest;
    /**
     * Transform the query value based on configuration
     */
    private transformQueryValue;
    /**
     * Generate dynamic headers based on configuration
     */
    private generateDynamicHeaders;
    /**
     * Build GraphQL request body
     */
    private buildGraphQLRequest;
    /**
     * Interpolate template strings with variables
     */
    private interpolateTemplate;
    /**
     * Generate a simple UUID for request tracking
     */
    private generateUUID;
    /**
     * Validate request transformation configuration
     */
    validateTransformConfig(config: RequestTransformConfig): void;
    /**
     * Extract search parameters from URL for GET requests
     */
    extractSearchParams(url: string): Record<string, string>;
    /**
     * Parse request body for POST requests
     */
    parseRequestBody(body: string | unknown): Record<string, unknown>;
    /**
     * Build URL with search parameters
     */
    buildUrlWithParams(baseUrl: string, params: Record<string, string | number | boolean>): string;
}
/**
 * Global request transformer instance
 */
export declare const requestTransformer: RequestTransformer;
//# sourceMappingURL=RequestTransformer.d.ts.map